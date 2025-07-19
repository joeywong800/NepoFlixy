import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Timer, Plus } from 'lucide-react';
import { getTmdbImage, fetchTmdb, calculateProgressPercent, getRemainingTime, getImagePath, hasEnglishBackdrop, getLogoPath, isInWatchlist, toggleWatchlist } from '../utils.jsx';

const CarouselItem = ({ item, variant = 'default', episodeNumber, usePoster = false }) => {
  const navigate = useNavigate();
  const [detailedItem, setDetailedItem] = useState(item);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  
  const mediaType = variant === 'continue' ? item.mediaType : (item.media_type || (item.first_air_date ? 'tv' : 'movie'));
  const title = item.title || item.name;
  const releaseDate = item.release_date || item.first_air_date;
  const formattedDate = releaseDate ? new Date(releaseDate).getFullYear() : '';
  
  const progressPercent = variant === 'continue' ? calculateProgressPercent(item.watchedDuration, item.fullDuration) : 0;
  
  useEffect(() => {
    if (variant === 'episode') return;
    
    const fetchDetailedData = async () => {
      try {
        const detailRoute = `/${mediaType}/${item.id}?append_to_response=images,content_ratings,release_dates&language=en-US&include_image_language=en`;
        const detailed = await fetchTmdb(detailRoute);
        setDetailedItem(detailed);
      }
      catch (error) { console.error(error); setDetailedItem(item); }
      finally { setLoading(false); }
    };
    
    fetchDetailedData();
  }, [item.id, mediaType]);
  
  useEffect(() => {
    if (item && item.id) {
      setInWatchlist(isInWatchlist(item.id));
    }
  }, [item]);
  
  const imagePath = usePoster ? (detailedItem.poster_path || item.poster_path) : getImagePath(detailedItem, item);
  if (!imagePath) return null;
  
  const rating = detailedItem.vote_average?.toFixed(1) || item.vote_average?.toFixed(1) || 'N/A';
  const runtime = detailedItem.runtime ? `${Math.floor(detailedItem.runtime / 60)}h ${detailedItem.runtime % 60}m` : 
                  detailedItem.number_of_seasons ? `${detailedItem.number_of_seasons} seasons` : '';
  
  const handleClick = () => {
    if (variant === 'continue' && mediaType === 'tv' && item.season && item.episode) { navigate(`/tv/${item.id}?season=${item.season}&episode=${item.episode}`); }
    else { navigate(`/${mediaType}/${item.id}`); }
  };
  
  const handleWatchlistToggle = (e) => {
    e.stopPropagation();
    const isAdded = toggleWatchlist(item);
    setInWatchlist(isAdded);
  };
  
  if (variant === 'episode') {
    const logoPath = getLogoPath(detailedItem);
    const showOverlay = !hasEnglishBackdrop(detailedItem);
    
    return (
      <div className="cursor-pointer transition-all duration-300 hover:scale-105">
        <div className={`relative rounded-lg overflow-hidden bg-cover bg-center shadow-lg ${usePoster ? 'aspect-[2/3] w-40 md:w-auto' : 'aspect-video'}`}
             style={{ backgroundImage: `url(${getTmdbImage(imagePath, 'w500')})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          
          {showOverlay && (
            <div className="absolute inset-0 flex items-center justify-center">
              {logoPath ? (<img src={getTmdbImage(logoPath, 'w300')} alt={title} className="w-[70%] max-h-[60%] object-contain drop-shadow-[0_4px_8px_#000]" />
              ) : (<h2 className="text-white text-3xl font-medium text-center px-4 drop-shadow-[0_4px_8px_#000]">{title}</h2>)}
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center gap-2 text-white">
              <Play className="w-4 h-4" fill="currentColor" />
              <span className="text-sm font-medium">Play now</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-gray-400 text-sm mb-1">Episode {episodeNumber}</p>
          <h3 className="text-white text-lg font-medium mb-2 line-clamp-2">{title}</h3>
          <p className="text-white text-sm line-clamp-3 leading-relaxed">{item.overview || detailedItem.overview}</p>
        </div>
      </div>
    );
  }
  
  if (variant === 'continue') {
    if (loading || !detailedItem || !imagePath) {
      return (
        <div className="flex-shrink-0 w-96 h-56 bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-solid border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }
    
    const timeRemaining = getRemainingTime(item.watchedDuration, item.fullDuration);
    const logoPath = getLogoPath(detailedItem);
    const showOverlay = !hasEnglishBackdrop(detailedItem);
    
    return (
      <div className="flex-shrink-0 w-40 md:w-96 cursor-pointer animate-scale-in">
        <div 
          className={`relative rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:z-10 bg-cover bg-center ${usePoster ? 'aspect-[2/3] w-40 md:w-auto' : 'aspect-video'}`}
          style={{ backgroundImage: `url(${getTmdbImage(imagePath, 'w500')})` }}
          onClick={handleClick}
        > 
          {showOverlay && (
            <div className="absolute inset-0 flex items-center justify-center">
              {logoPath ? (<img src={getTmdbImage(logoPath, 'w300')} alt={detailedItem.title || detailedItem.name} className="w-[70%] max-h-[60%] object-contain drop-shadow-[0_4px_8px_#000]" />
              ) : (<h2 className="text-white text-3xl font-medium text-center px-4 drop-shadow-[0_4px_8px_#000]">{detailedItem.title || detailedItem.name}</h2>)}
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/70 opacity-0 hover:opacity-100 transition-opacity duration-300 p-4 pb-8 flex flex-col justify-end items-start">
            <h3 className="text-white font-normal text-sm line-clamp-2">
              {mediaType === 'tv' && item.season && item.episode ? `SEASON ${item.season} EPISODE ${item.episode}` : ''}
            </h3>
            <h3 className="text-white font-normal text-2xl mb-2 line-clamp-2">{detailedItem.title || detailedItem.name}</h3>
          </div>
          
          <div className="absolute bottom-2.5 left-2.5 text-white text-shadow-[0_1px_4px_rgba(0,0,0)] text-base px-2 py-1 rounded pointer-events-none">
            <span className='font-medium'>Continue watching</span> ({timeRemaining} left)
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-neutral-700/30 backdrop-blur-lg pointer-events-none">
            <div 
              className="h-full bg-white transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }
  
  const logoPath = getLogoPath(detailedItem);
  const showOverlay = !hasEnglishBackdrop(detailedItem);
  
  return (
    <div className={`relative rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:z-10 bg-cover bg-center cursor-pointer ${usePoster ? 'aspect-[2/3] w-40 md:w-auto' : 'aspect-video'}`}
         style={{ backgroundImage: `url(${getTmdbImage(imagePath, 'w500')})` }}
         onClick={handleClick}>
      
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          {logoPath ? (<img src={getTmdbImage(logoPath, 'w300')} alt={title} className="w-[70%] max-h-[60%] object-contain drop-shadow-[0_4px_8px_#000]" />
          ) : (<h2 className="text-white text-3xl font-medium text-center px-4 drop-shadow-[0_4px_8px_#000]">{title}</h2>)}
        </div>
      )}
      
      <div className="absolute inset-0 bg-black/70 opacity-0 hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end items-start">
        <h3 className="text-white font-normal text-2xl mb-2 line-clamp-2">{title}</h3>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-sm text-white font-normal">
            <div className="bg-gradient-to-r from-[#90cea1] to-[#01b4e4] text-black px-1 py-[1px] rounded font-black tracking-tighter text-xs">TMDB</div>
            <span>{rating}</span>
            <span>•</span>
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{runtime}</span>
          </div>
          <button 
            onClick={handleWatchlistToggle}
            className={`text-white p-1.5 rounded-full transition-all cursor-pointer ${inWatchlist ? 'bg-white/25' : 'bg-white/15 hover:bg-white/25'}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-solid border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default CarouselItem;
