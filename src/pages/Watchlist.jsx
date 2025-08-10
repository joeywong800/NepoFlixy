import React, { useState, useEffect } from 'react';
import { fetchTmdb, getWatchlist, removeFromWatchlist } from '../utils.jsx';
import CarouselItem from '../components/carouselItem.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { SpotlightSkeleton } from '../components/Skeletons.jsx';
import { X } from 'lucide-react';

const Watchlist = () => {
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [detailedItems, setDetailedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        setIsLoading(true);
        const watchlist = getWatchlist();
        setWatchlistItems(watchlist);

        // Fetch details for each watchlist item
        if (watchlist.length > 0) {
          const detailedPromises = watchlist.map(async (item) => {
            try {
              const detailRoute = `/${item.mediaType}/${item.id}?language=en-US&append_to_response=images,content_ratings${
                item.mediaType === 'movie' ? ',release_dates' : ''
              }`;
              const detailedItem = await fetchTmdb(detailRoute);
              return { ...detailedItem, media_type: item.mediaType };
            } catch (err) {
              console.error(`Error fetching details for ${item.title}:`, err);
              // Fallback to basic data if details fail
              return {
                id: item.id,
                title: item.title,
                name: item.title,
                poster_path: item.posterPath,
                backdrop_path: item.backdropPath,
                media_type: item.mediaType,
              };
            }
          });

          const detailed = await Promise.all(detailedPromises);
          setDetailedItems(detailed);
        }
      } catch (err) {
        console.error('Error loading watchlist:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadWatchlist();

    // Update when localStorage watchlist changes
    const handleStorageChange = (e) => {
      if (e.key === 'watchlist') {
        loadWatchlist();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRemoveFromWatchlist = (itemId) => {
    removeFromWatchlist(itemId);
    const updatedWatchlist = getWatchlist();
    setWatchlistItems(updatedWatchlist);

    setDetailedItems((prev) =>
      prev.filter((item) => item.id.toString() !== itemId.toString())
    );
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
        <h1 className="text-4xl font-bold text-white mb-8">My Watchlist</h1>

        {isLoading ? (
          <SpotlightSkeleton />
        ) : detailedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-white text-xl mb-4">Your watchlist is empty</div>
            <p className="text-gray-400 text-center max-w-md">
              Add movies and TV shows to your watchlist by clicking the + button when browsing
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {detailedItems.map((item) => (
              <div key={item.id} className="animate-scale-in relative group">
                <CarouselItem item={item} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromWatchlist(item.id);
                  }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                  title="Remove from watchlist"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Watchlist;
