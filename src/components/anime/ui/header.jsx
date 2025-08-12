import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bookmark } from 'lucide-react';
import { searchAnime } from '../search.jsx';

export default function AnimeHeader() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && 
          !dropdownRef.current.contains(event.target) && 
          !searchInputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearch = async (query, page = 1, resetResults = false) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setShowDropdown(true);

    try {
      const { results, totalPages: newTotalPages } = await searchAnime(query, page);
      
      setCurrentPage(page);
      setTotalPages(newTotalPages);
      setHasMoreResults(page < newTotalPages);

      if (resetResults) {
        setSearchResults(results);
      } else {
        setSearchResults(prev => [...prev, ...results]);
      }
    } catch (error) {
      console.error('Error performing search:', error);
      if (resetResults) {
        setSearchResults([]);
      }
      setHasMoreResults(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim()) {
      handleSearch(value, 1, true);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      handleSearch(searchQuery, 1, true);
    }
  };

  const handleAnimeClick = (animeId) => {
    navigate(`/anime/${animeId}`);
    setShowDropdown(false);
  };

  const loadMoreResults = () => {
    if (!isLoading && hasMoreResults && currentPage < totalPages) {
      handleSearch(searchQuery, currentPage + 1, false);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      loadMoreResults();
    }
  };

  return (
    <header className="h-16 fixed top-0 left-0 bg-anime-modal-bg border-b border-anime-border/10 transition-all duration-200 z-50 py-3 px-4 text-white items-center text-md flex-row justify-between hidden md:flex w-full">
      
      <div className="flex items-center">
        <div className="text-2xl" style={{ fontFamily: 'Instrument Serif' }}>
          <Link to="/" className="hover:text-blue-400 transition duration-200 active:scale-90">NepoFlix</Link>
          <Link to="/anime" className="hover:text-pink-400 transition duration-200 active:scale-90">{" "}Anime</Link>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center pl-6 pr-2">
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-blue-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search anime"
            value={searchQuery}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            className="block w-full bg-anime-card-bg border border-anime-border/10 rounded-md py-2 pl-10 pr-3 text-sm placeholder-anime-border/20 text-white focus:outline-none focus:border-blue-400 focus:placeholder-blue-400/40 transition duration-200 ease-in-out"
          />
          
          {showDropdown && (
            <div 
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-anime-modal-bg border border-anime-border/10 rounded-md shadow-xl overflow-hidden z-50 max-h-[80vh] overflow-y-auto"
              onScroll={handleScroll}
            >
              <div className="min-h-[100px]">
                {isLoading && searchResults.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <p className="text-white opacity-60">Loading...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="flex flex-col">
                    {searchResults.map((anime, index) => (
                      <div
                        key={`${anime.id}-${index}`}
                        onClick={() => handleAnimeClick(anime.id)}
                        className="anime-card flex items-center p-3 hover:bg-anime-card-hover cursor-pointer transition duration-200"
                        data-id={anime.id}
                      >
                        <img
                          src={anime.poster || 'https://placehold.co/60x80/141414/fff/?text=No+Image&font=poppins'}
                          alt={anime.title}
                          className="w-12 h-16 object-cover rounded mr-3"
                        />
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-sm line-clamp-1">
                            {anime.title}
                          </h4>
                          <p className="text-gray-400 text-xs line-clamp-2">
                            {anime.japanese_title || anime.description || 'No description available'}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex items-center justify-center p-4">
                        <p className="text-white opacity-60">Loading more...</p>
                      </div>
                    )}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="flex items-center justify-center p-8">
                    <p className="text-white opacity-60">No results found</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8">
                    <p className="text-white opacity-60">Enter your search query above</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center flex-row gap-2">
        <button 
          aria-label="Watchlist" 
          onClick={() => alert('not coded yet. coming soon')}
          className="p-2 w-10 h-10 bg-anime-card-bg border border-anime-border/10 rounded-md hover:bg-[#1f1f1f] cursor-pointer active:scale-90 focus:outline-none focus:border-blue-400 focus:text-blue-400 flex justify-center items-center"
        >
          <Bookmark className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
