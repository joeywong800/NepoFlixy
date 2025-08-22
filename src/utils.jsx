// src/utils.jsx

import { toast } from 'sonner';
import MobileDetect from 'mobile-detect';
import config from './config.json';
import { supabase } from './supabaseClient';

const { tmdbApiKey, tmdbBaseUrl, tmdbImageBaseUrl } = config;

/* =========================================================================
   AUTH AWARENESS (no app-wide context required)
   -------------------------------------------------------------------------
   - We lazily query Supabase for the current session when needed.
   - Everything keeps working for anonymous visitors via localStorage.
   ========================================================================= */

let _cachedUser = null;
let _checkedOnce = false;

async function getCurrentUser() {
  try {
    if (_checkedOnce && _cachedUser) return _cachedUser;
    const { data } = await supabase.auth.getSession();
    _cachedUser = data?.session?.user ?? null;
    _checkedOnce = true;
    return _cachedUser;
  } catch {
    return null;
  }
}

// Optional helper if you manage auth state elsewhere and want to set it
export function setAuthUser(user) {
  _cachedUser = user ?? null;
  _checkedOnce = true;
}

/* =========================================================================
   LOCALSTORAGE MIGRATIONS (existing behaviour)
   ========================================================================= */

export const migrateLocalStorageData = () => {
  try {
    // Migrate quickwatch-continue -> continue
    const oldContinueData = localStorage.getItem('quickwatch-continue');
    if (oldContinueData) {
      const currentContinueData = localStorage.getItem('continue');
      if (!currentContinueData) { localStorage.setItem('continue', oldContinueData); }
      localStorage.removeItem('quickwatch-continue');
    }

    // Migrate quickwatch-watchlist -> watchlist
    const oldWatchlistData = localStorage.getItem('quickwatch-watchlist');
    if (oldWatchlistData) {
      const currentWatchlistData = localStorage.getItem('watchlist');
      if (!currentWatchlistData) { localStorage.setItem('watchlist', oldWatchlistData); }
      localStorage.removeItem('quickwatch-watchlist');
    }
  } catch (error) {
    console.error('Error migrating localStorage data:', error);
  }
};

// Call migration on module load
migrateLocalStorageData();

/* =========================================================================
   TMDB HELPERS (unchanged)
   ========================================================================= */

export const fetchTmdb = async (route) => {
  try {
    const url = `${tmdbBaseUrl}${route}`;
    const response = await fetch(url, {
      headers: { 'Authorization': tmdbApiKey, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching TMDB data:', error);
    throw error;
  }
};

export const getTmdbImage = (path, size = 'original') => {
  if (!path) return null;
  return `${tmdbImageBaseUrl}${size}${path}`;
};

export const formatRuntime = (minutes) => {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export const formatReleaseDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.getFullYear();
};

export const getContentRating = (item) => {
  if (item.content_ratings?.results) {
    const usRating = item.content_ratings.results.find(r => r.iso_3166_1 === 'US');
    return usRating?.rating || 'NR';
  }
  if (item.release_dates?.results) {
    const usReleases = item.release_dates.results.find(r => r.iso_3166_1 === 'US');
    if (usReleases?.release_dates) {
      const valid = usReleases.release_dates.find(r => r.certification?.trim());
      return valid?.certification || 'NR';
    }
  }
  return 'NR';
};

/* =========================================================================
   WATCHLIST (Supabase + anonymous fallback)
   Shape example:
   { id:"46928", mediaType:"tv", title:"...", posterPath:"/..jpg", backdropPath:"/..jpg" }
   - Supabase table: watchlist_items
   - Columns: item_id, media_type, title, poster_path, backdrop_path
   ========================================================================= */

// Parse localStorage JSON safely
function readLocalJson(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const getWatchlist = async () => {
  const user = await getCurrentUser();
  if (!user) {
    return readLocalJson('watchlist', []);
  }
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('item_id, media_type, title, poster_path, backdrop_path')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching watchlist from Supabase:', error);
    return readLocalJson('watchlist', []); // fallback
  }

  // Map DB -> local shape
  return (data ?? []).map(d => ({
    id: d.item_id,
    mediaType: d.media_type,
    title: d.title,
    posterPath: d.poster_path,
    backdropPath: d.backdrop_path
  }));
};

export const isInWatchlist = async (itemId) => {
  const idStr = String(itemId ?? '');
  const user = await getCurrentUser();
  if (!user) {
    const wl = readLocalJson('watchlist', []);
    return wl.some(i => i.id === idStr);
  }
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_id', idStr)
    .limit(1);
  if (error) {
    console.error('Error checking watchlist in Supabase:', error);
    const wl = readLocalJson('watchlist', []);
    return wl.some(i => i.id === idStr);
  }
  return (data?.length ?? 0) > 0;
};

export const addToWatchlist = async (item) => {
  try {
    const user = await getCurrentUser();
    const idStr = String(item?.id ?? '');
    const mediaType = item?.media_type || item?.mediaType || (item?.first_air_date ? 'tv' : 'movie');
    const title = item?.title || item?.name || item?.original_title || item?.original_name || 'Unknown';
    const posterPath = item?.poster_path ?? item?.posterPath ?? null;
    const backdropPath = item?.backdrop_path ?? item?.backdropPath ?? null;

    if (!user) {
      // anonymous: localStorage
      const wl = readLocalJson('watchlist', []);
      if (!wl.some(w => w.id === idStr)) {
        wl.push({ id: idStr, mediaType, title, posterPath, backdropPath });
        writeLocalJson('watchlist', wl);
        toast(`Added "${title}" to watchlist`);
      }
      return true;
    }

    // logged-in: Supabase
    const { error, status } = await supabase.from('watchlist_items').upsert({
      user_id: user.id,
      item_id: idStr,
      media_type: mediaType,
      title,
      poster_path: posterPath,
      backdrop_path: backdropPath
    }, { onConflict: 'user_id,item_id,media_type' });

    if (error) throw error;
    if (status === 201 || status === 200 || status === 204) {
      toast(`Added "${title}" to watchlist`);
    }
    return true;
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    toast('Failed to add to watchlist');
    return false;
  }
};

export const removeFromWatchlist = async (itemId) => {
  try {
    const user = await getCurrentUser();
    const idStr = String(itemId ?? '');

    if (!user) {
      const wl = readLocalJson('watchlist', []);
      const target = wl.find(i => i.id === idStr);
      const updated = wl.filter(i => i.id !== idStr);
      writeLocalJson('watchlist', updated);
      if (target) toast(`Removed "${target.title}" from watchlist`);
      return true;
    }

    // For Supabase we need media_type to fully match the unique key;
    // if unknown, delete by item_id + user_id (covers both movie/tv/anime for that id).
    const { data, error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('user_id', user.id)
      .eq('item_id', idStr);

    if (error) throw error;

    // Best-effort toast (show the first title, if any)
    const removedTitle = Array.isArray(data) && data[0]?.title ? data[0].title : 'item';
    toast(`Removed "${removedTitle}" from watchlist`);
    return true;
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    toast('Failed to remove from watchlist');
    return false;
  }
};

export const toggleWatchlist = async (item) => {
  const idStr = String(item?.id ?? '');
  if (await isInWatchlist(idStr)) {
    await removeFromWatchlist(idStr);
    return false; // removed
    } else {
    await addToWatchlist(item);
    return true; // added
  }
};

/* =========================================================================
   CONTINUE WATCHING (Supabase + anonymous fallback)
   Example entry in localStorage "continue":
   { id:46928, mediaType:'tv', season:1, episode:1, sourceIndex:0, fullDuration:1405, watchedDuration:1340, timestamp:1755281968453 }
   - Supabase table: playback_progress
   ========================================================================= */

export const calculateProgressPercent = (watchedDuration, fullDuration) => {
  if (!fullDuration) return 0;
  return Math.round((watchedDuration / fullDuration) * 100);
};

export const getRemainingTime = (watchedDuration, fullDuration) => {
  if (!fullDuration || watchedDuration == null) return 0;
  const remainingSeconds = Math.max(0, fullDuration - watchedDuration);
  const remainingMinutes = Math.round(remainingSeconds / 60);
  if (remainingMinutes >= 60) {
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    return `${hours}h${mins}m`;
  }
  return `${remainingMinutes}m`;
};

// Save or update progress
export const saveProgress = async ({
  id,                // number | string | null
  mediaType,         // 'movie' | 'tv' | 'anime'
  season = 0,
  episode = 0,
  sourceIndex = 0,
  fullDuration = 0,
  watchedDuration = 0,
  timestamp = Date.now()
}) => {
  try {
    const user = await getCurrentUser();
    const itemId = id == null ? '' : String(id); // Option A mapping

    if (!user) {
      // anonymous: localStorage array under "continue"
      const list = readLocalJson('continue', []);
      // Upsert by (itemId, mediaType, season, episode, sourceIndex)
      const idx = list.findIndex(e =>
        String(e.id ?? '') === itemId &&
        e.mediaType === mediaType &&
        (e.season ?? 0) === season &&
        (e.episode ?? 0) === episode &&
        (e.sourceIndex ?? 0) === sourceIndex
      );
      const entry = { id: itemId ? Number(itemId) : null, mediaType, season, episode, sourceIndex, fullDuration, watchedDuration, timestamp };
      if (idx >= 0) list[idx] = entry; else list.push(entry);
      writeLocalJson('continue', list);
      return true;
    }

    // logged in: UPSERT in Supabase
    const { error } = await supabase
      .from('playback_progress')
      .upsert({
        user_id: user.id,
        item_id: itemId,                 // never null ('' if unknown)
        media_type: mediaType,
        season,
        episode,
        source_index: sourceIndex,
        full_duration: fullDuration,
        watched_duration: watchedDuration,
        last_watched_ms: Number(timestamp) || Date.now(),
        last_watched_at: new Date().toISOString()
      }, { onConflict: 'user_id,item_id,media_type,season,episode,source_index' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error saving progress:', err);
    return false;
  }
};

// Get all progress entries (sorted recent first)
export const getProgressList = async () => {
  const user = await getCurrentUser();
  if (!user) {
    const list = readLocalJson('continue', []);
    // sort by timestamp desc
    return list.slice().sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }
  const { data, error } = await supabase
    .from('playback_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('last_watched_at', { ascending: false });

  if (error) {
    console.error('Error fetching progress from Supabase:', error);
    const list = readLocalJson('continue', []);
    return list.slice().sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }

  // Map DB -> local shape for UI reuse
  return (data ?? []).map(d => ({
    id: d.item_id ? Number(d.item_id) : null,
    mediaType: d.media_type,
    season: d.season ?? 0,
    episode: d.episode ?? 0,
    sourceIndex: d.source_index ?? 0,
    fullDuration: d.full_duration ?? 0,
    watchedDuration: d.watched_duration ?? 0,
    timestamp: d.last_watched_ms ?? new Date(d.last_watched_at).getTime()
  }));
};

// Get progress for a specific item/episode
export const getProgressForItem = async ({ id, mediaType, season = 0, episode = 0, sourceIndex = 0 }) => {
  const user = await getCurrentUser();
  const itemId = id == null ? '' : String(id);

  if (!user) {
    const list = readLocalJson('continue', []);
    return list.find(e =>
      String(e.id ?? '') === itemId &&
      e.mediaType === mediaType &&
      (e.season ?? 0) === season &&
      (e.episode ?? 0) === episode &&
      (e.sourceIndex ?? 0) === sourceIndex
    ) || null;
  }

  const { data, error } = await supabase
    .from('playback_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('item_id', itemId)
    .eq('media_type', mediaType)
    .eq('season', season)
    .eq('episode', episode)
    .eq('source_index', sourceIndex)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching item progress from Supabase:', error);
    return null;
  }

  if (!data) return null;
  return {
    id: data.item_id ? Number(data.item_id) : null,
    mediaType: data.media_type,
    season: data.season ?? 0,
    episode: data.episode ?? 0,
    sourceIndex: data.source_index ?? 0,
    fullDuration: data.full_duration ?? 0,
    watchedDuration: data.watched_duration ?? 0,
    timestamp: data.last_watched_ms ?? new Date(data.last_watched_at).getTime()
  };
};

/* =========================================================================
   FIRST-LOGIN MIGRATION (localStorage -> Supabase)
   - Call this once after a user signs in successfully.
   ========================================================================= */

export const migrateLocalToSupabaseOnLogin = async () => {
  const user = await getCurrentUser();
  if (!user) return;

  // WATCHLIST
  try {
    const localWatchlist = readLocalJson('watchlist', []);
    if (localWatchlist.length) {
      const rows = localWatchlist.map(w => ({
        user_id: user.id,
        item_id: String(w.id ?? ''),
        media_type: w.mediaType ?? (w.first_air_date ? 'tv' : 'movie'),
        title: w.title ?? 'Unknown',
        poster_path: w.posterPath ?? null,
        backdrop_path: w.backdropPath ?? null
      }));
      const { error } = await supabase.from('watchlist_items')
        .upsert(rows, { onConflict: 'user_id,item_id,media_type' });
      if (!error) localStorage.removeItem('watchlist');
    }
  } catch (e) {
    console.error('Watchlist migration failed:', e);
  }

  // CONTINUE / PROGRESS
  try {
    const localContinue = readLocalJson('continue', []);
    if (localContinue.length) {
      const rows = localContinue.map(e => ({
        user_id: user.id,
        item_id: e.id == null ? '' : String(e.id),
        media_type: e.mediaType ?? 'movie',
        season: e.season ?? 0,
        episode: e.episode ?? 0,
        source_index: e.sourceIndex ?? 0,
        full_duration: e.fullDuration ?? 0,
        watched_duration: e.watchedDuration ?? 0,
        last_watched_ms: Number(e.timestamp) || Date.now(),
        last_watched_at: new Date().toISOString()
      }));
      const { error } = await supabase.from('playback_progress')
        .upsert(rows, { onConflict: 'user_id,item_id,media_type,season,episode,source_index' });
      if (!error) localStorage.removeItem('continue');
    }
  } catch (e) {
    console.error('Progress migration failed:', e);
  }
};

/* =========================================================================
   IMAGE / DEVICE HELPERS (unchanged)
   ========================================================================= */

export const getImagePath = (detailedItem, item) => {
  if (detailedItem.images?.backdrops) {
    const englishBackdrop = detailedItem.images.backdrops.find(b => b.iso_639_1 === 'en' || b.iso_639_1 === null);
    if (englishBackdrop) return englishBackdrop.file_path;
  }
  if (detailedItem.backdrop_path || item.backdrop_path) {
    return detailedItem.backdrop_path || item.backdrop_path;
  }
  return detailedItem.poster_path || item.poster_path;
};

export const hasEnglishBackdrop = (detailedItem) => {
  if (detailedItem.images?.backdrops) {
    return detailedItem.images.backdrops.some(b => b.iso_639_1 === 'en' || b.iso_639_1 === null);
  }
  return true;
};

export const getLogoPath = (detailedItem) => {
  if (detailedItem.images?.logos) {
    const englishLogo = detailedItem.images.logos.find(l => l.iso_639_1 === 'en' || l.iso_639_1 === null);
    if (englishLogo) return englishLogo.file_path;
    if (detailedItem.images.logos.length > 0) return detailedItem.images.logos[0].file_path;
  }
  return null;
};

export const isMobileDevice = () => {
  const md = new MobileDetect(window.navigator.userAgent);
  return md.mobile() !== null || md.phone() !== null;
};

export const isPhone = () => {
  const md = new MobileDetect(window.navigator.userAgent);
  return md.phone() !== null;
};
