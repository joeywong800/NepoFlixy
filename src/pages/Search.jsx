import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchTmdb } from '../utils.jsx';
import CarouselItem from '../components/carouselItem.jsx';
import Header from '../components/Header.jsx';
import { SearchSkeleton } from '../components/Skeletons.jsx';
import { Search as SearchIcon } from 'lucide-react';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const queryFromUrl = searchParams.get('query');
    if (queryFromUrl) { setSearchQuery(queryFromUrl); performSearch(queryFromUrl); }
    if (inputRef.current) { inputRef.current.focus(); }
    
    const checkMobile = () => { setIsMobile(window.innerWidth < 768); };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const performSearch = async (query) => {
    if (!query.trim()) return;

    try {
      setIsLoading(true);
      setHasSearched(true);
      setError(null);

      const searchRoute = `/search/multi?query=${encodeURIComponent(query)}&language=en-US&page=1`;
      const data = await fetchTmdb(searchRoute);
      
      // Filter out people and only keep movies and TV shows
      const filteredResults = data.results.filter(item => 
        item.media_type === 'movie' || item.media_type === 'tv'
      );
      
      setSearchResults(filteredResults);
    } catch (err) {
      setError(err.message);
      console.error('Error searching:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchParams({ query: searchQuery });
    await performSearch(searchQuery);
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0a] pb-12 md:pb-0">
      <Header />
      
      <div className="pt-8 md:pt-24 px-8 pb-8">
        <h1 className="text-4xl font-bold text-white mb-4">What do you feel like watching?</h1>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative w-full">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder="Search for movies or TV shows..."
              className="w-full bg-white/10 text-white text-lg px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <button 
              type="submit" 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors"
            >
              <SearchIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
        
        {isLoading ? (
          <SearchSkeleton />
        ) : hasSearched && searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-white text-xl mb-4">No results found</div>
            <p className="text-gray-400 text-center max-w-md">
              Try searching for a different movie or TV show
            </p>
          </div>
        ) : hasSearched ? (
          <>
            <h2 className="text-2xl text-white mb-5">Search Results</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {searchResults
                .filter(item => item.backdrop_path || item.poster_path)
                .map((item) => (
                  <CarouselItem key={item.id} item={item} usePoster={isMobile} />
                ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-white text-xl mb-4">Search for movies and TV shows</div>
            <p className="text-gray-400 text-center max-w-md">
              Enter a title in the search box above to find what you're looking for
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
