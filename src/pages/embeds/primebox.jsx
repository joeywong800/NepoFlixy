import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import config from '../../config.json';
import { searchSubtitles } from 'wyzie-lib';
import { fetchTmdb, formatReleaseDate } from '../../utils.jsx';
import VideoPlayer from '../../components/player/main';

const PrimeBox = () => {
  const { tmdbid, season, episode } = useParams();
  const [videoUrl, setVideoUrl] = useState('');
  const [originalVideoUrl, setOriginalVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableQualities, setAvailableQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('1080P');
  const [primeboxData, setPrimeboxData] = useState(null);
  
  // Subtitle states
  const [showCaptionsPopup, setShowCaptionsPopup] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [availableSubtitles, setAvailableSubtitles] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [subtitlesLoading, setSubtitlesLoading] = useState(false);
  const [subtitleError, setSubtitleError] = useState('');
  const [subtitleCues, setSubtitleCues] = useState([]);

  const mediaType = season && episode ? 'tv' : 'movie';

  useEffect(() => {
    const fetchVideoUrl = async () => {
      try {
        setLoading(true);
        setError('');
        
        // First, fetch TMDB data to get name and year
        const tmdbData = await fetchTmdb(`/${mediaType}/${tmdbid}`);
        if (!tmdbData) {
          throw new Error('Failed to fetch movie/TV show details');
        }
        
        const name = tmdbData.title || tmdbData.name;
        const releaseDate = tmdbData.release_date || tmdbData.first_air_date;
        const year = releaseDate ? formatReleaseDate(releaseDate) : '';
        
        if (!name || !year) {
          throw new Error('Missing required movie/TV show information');
        }
        
        // Build primebox API parameters
        const params = new URLSearchParams({
          name: name,
          year: year,
          fallback_year: year
        });
        
        // Add season and episode for TV shows
        if (season && episode) {
          params.append('season', season);
          params.append('episode', episode);
        }
        
        // Call primebox API
        const primeboxUrl = `https://backend.xprime.tv/primebox?${params.toString()}`;
        const response = await fetch(primeboxUrl);
        
        if (!response.ok) {
          throw new Error(`Primebox API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status !== 'ok' || !data.streams) {
          throw new Error('No streams found for this content');
        }
        
        setPrimeboxData(data);
        
        // Set available qualities
        const qualityNames = data.available_qualities || Object.keys(data.streams);
        const formattedQualities = qualityNames.map((qualityName, index) => {
          const heightMatch = qualityName.match(/(\d+)[pP]/);
          const height = heightMatch ? parseInt(heightMatch[1]) : 0;
          
          return { index, quality: qualityName, url: data.streams[qualityName], height: height, width: 0, bitrate: 0 };
        });
        
        // Sort by quality (highest first)
        formattedQualities.sort((a, b) => b.height - a.height);
        setAvailableQualities(formattedQualities);
        
        const bestQuality = formattedQualities[0];
        setSelectedQuality(bestQuality);
        
        // Get the stream URL for the selected quality
        const streamUrl = bestQuality.url;
        if (!streamUrl) {
          throw new Error('No stream URL found for selected quality');
        }
        
        setOriginalVideoUrl(streamUrl);
        
        const proxiedUrl = `${config.proxy}/api/video-proxy?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent('https://pstream.mov')}&cache=true`;
        setVideoUrl(proxiedUrl);
        
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    if (tmdbid) {
      fetchVideoUrl();
    }
  }, [tmdbid, season, episode, mediaType]);

  const changeQuality = async (qualityObject) => {
    if (!primeboxData || !qualityObject || !qualityObject.url) { return; }
    
    try {
      setLoading(true);
      setSelectedQuality(qualityObject);
      
      const streamUrl = qualityObject.url;
      setOriginalVideoUrl(streamUrl);
      
      const proxiedUrl = `${config.proxy}/api/video-proxy?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent('https://pstream.mov')}&cache=true`;
      setVideoUrl(proxiedUrl);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to change quality');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSubtitles = async () => {
      if (!tmdbid) return;
      
      setSubtitlesLoading(true);
      try {
        const searchParams = {
          tmdb_id: parseInt(tmdbid),
          format: 'srt'
        };
        
        if (season && episode) {
          searchParams.season = parseInt(season);
          searchParams.episode = parseInt(episode);
        }
        
        const subtitles = await searchSubtitles(searchParams);
        
        setAvailableSubtitles(subtitles || []);
      } catch (err) {
        console.error(err);
        setAvailableSubtitles([]);
        setSubtitleError(`Failed to fetch subtitles: ${err.message}`);
        setTimeout(() => setSubtitleError(''), 3000);
      } finally {
        setSubtitlesLoading(false);
      }
    };

    fetchSubtitles();
  }, [tmdbid, season, episode]);

  const selectSubtitle = async (subtitle, videoRef) => {
    console.log(subtitle);
    setSelectedSubtitle(subtitle);
    
    if (subtitle === null) {
      setSubtitlesEnabled(false);
      setSubtitleCues([]);
    } else {
      setSubtitlesEnabled(true);
      await loadSubtitleCues(subtitle);
    }
  };

  const parseSRT = (srtText) => {
    const blocks = srtText.trim().split(/\n\s*\n/);
    const cues = [];
    
    blocks.forEach(block => {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        const index = lines[0];
        const timeString = lines[1];
        const text = lines.slice(2).join('\n');
        
        const timeMatch = timeString.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
        if (timeMatch) {
          cues.push({
            index: parseInt(index),
            startTime: timeMatch[1],
            endTime: timeMatch[2],
            text: text
          });
        }
      }
    });
    
    return cues;
  };

  const loadSubtitleCues = async (subtitle) => {
    if (!subtitle) return;

    try {
      let subtitleText = '';
      
      if (subtitle.url && subtitle.url.startsWith('http')) {
        const response = await fetch(subtitle.url, {
          mode: 'cors',
          headers: {'Accept': 'text/plain, text/vtt, application/x-subrip'}
        });
        
        if (!response.ok) { throw new Error(`Failed to fetch subtitle: ${response.status}`); }
        
        subtitleText = await response.text();
      } else if (subtitle.content) {
        subtitleText = subtitle.content;
      } else if (subtitle.url) {
        subtitleText = subtitle.url;
      } else {
        throw new Error('No subtitle content or URL available');
      }
      
      // Parse SRT and set cues
      const parsedSrt = parseSRT(subtitleText);
      setSubtitleCues(parsedSrt);
      
    } catch (err) {
      console.error(err);
      setSubtitleError(`Failed to load subtitles: ${err.message}`);
      setTimeout(() => setSubtitleError(''), 3000);
      setSubtitleCues([]);
    }
  };

  if (error) {
    return (
      <div className="fixed top-0 left-0 w-screen h-screen bg-black flex items-center justify-center text-red-500 text-lg text-center p-5">
        <div>
          <div>Error: {error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-5 px-5 py-2.5 bg-gray-800 text-white border-none rounded cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <VideoPlayer
      videoUrl={videoUrl}
      originalVideoUrl={originalVideoUrl}
      onError={setError}
      showCaptionsPopup={showCaptionsPopup}
      setShowCaptionsPopup={setShowCaptionsPopup}
      subtitlesEnabled={subtitlesEnabled}
      subtitleError={subtitleError}
      subtitlesLoading={subtitlesLoading}
      availableSubtitles={availableSubtitles}
      selectedSubtitle={selectedSubtitle}
      onSelectSubtitle={selectSubtitle}
      subtitleCues={subtitleCues}
      // Quality selection props
      availableQualities={availableQualities}
      selectedQuality={selectedQuality}
      onQualityChange={changeQuality}
      // Progress tracking props
      mediaId={tmdbid}
      mediaType={mediaType}
      season={season ? parseInt(season) : 0}
      episode={episode ? parseInt(episode) : 0}
      sourceIndex={0} // PrimeBox source index
    />
  );
};

export default PrimeBox;
