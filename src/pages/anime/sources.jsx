// Anime Sources

export const animeSources = [
  {
    id: 'zenime-1',
    name: 'hd-1',
    subUrl: '/embed/zenime/{urlepisodeId}/hd-1/sub',
    dubUrl: '/embed/zenime/{urlepisodeId}/hd-1/dub'
  },
  {
    id: 'zenime-2',
    name: 'hd-2',
    subUrl: '/embed/zenime/{urlepisodeId}/hd-2/sub',
    dubUrl: '/embed/zenime/{urlepisodeId}/hd-2/dub'
  },
  {
    id: 'zenime-3',
    name: 'hd-3',
    subUrl: '/embed/zenime/{urlepisodeId}/hd-3/sub',
    dubUrl: '/embed/zenime/{urlepisodeId}/hd-3/dub'
  },
  {
    id: 'animepahe',
    name: 'pahe',
    subUrl: '/embed/animepahe/{urlepisodeId}/{name}/{season}/{episode}',
    dubUrl: '/embed/animepahe/{urlepisodeId}/{name}/{season}/{episode}'
  },
  {
    id: 'aniplay', // not working
    name: 'hika',
    subUrl: '/embed/aniplay/{urlepisodeId}/{episode}/sub',
    dubUrl: '/embed/aniplay/{urlepisodeId}/{episode}/dub'
  },
  {
    id: 'megaplaybz-1',
    name: 'vidplay',
    subUrl: 'https://megaplay.buzz/stream/s-2/{epid}/sub',
    dubUrl: 'https://megaplay.buzz/stream/s-2/{epid}/dub'
  },
];

export function getSourceUrl(sourceId, language, episodeData, animeData) {
  const source = animeSources.find(src => src.id === sourceId);
  if (!source) return 'about:blank';

  const template = language === 'dub' ? source.dubUrl : source.subUrl;

  if (animeData.tmdbId) {
    console.log('Using TMDB ID:', animeData.tmdbId);
  }

  return template
    .replace('{epid}',        episodeData.epid)
    .replace('{episodeId}',   episodeData.episodeid || '')
    .replace('{urlepisodeId}', encodeURIComponent(episodeData.episodeid || ''))
    .replace('{tmdbId}',      animeData.tmdbId || '')
    .replace('{season}',      animeData.season   || '1')
    .replace('{episode}',     episodeData.episode_no)
    .replace('{name}',     encodeURIComponent(animeData.name));
}

export function getDefaultSource() {
  return animeSources[0];
}
