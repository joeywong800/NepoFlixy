import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Grid3X3, Bookmark, Home, Tv, Film, Cat } from 'lucide-react';
import { toast } from 'sonner';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileHeaderOpacity, setMobileHeaderOpacity] = useState(1);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setIsScrolled(currentScrollY > 10);
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) { setMobileHeaderOpacity(0);
      } else { setMobileHeaderOpacity(1); }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const isActive = (path) => {
    if (path === '/' || path === '/home') {
      return currentPath === '/' || currentPath === '/index.html' || currentPath === '/home';
    }
    return currentPath === path;
  };

  // check if iOS and not PWA
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || navigator.vendor || (window.opera && opera.toString() === `[object Opera]`));
  const isPWA = window.navigator.standalone;
  const showIOSInstall = isIOS && !isPWA;

  return (
    <>
      {/* Desktop Header */}
      <header 
        className={`fixed top-0 left-0 mx-16 bg-transparent transition-all duration-200 rounded-b-2xl z-50 py-3 px-4 pl-8 text-white items-center text-md flex-row justify-between hidden md:flex ${
          isScrolled ? 'bg-zinc-800/60 backdrop-blur-md' : ''
        }`}
        style={{ width: 'calc(100% - 8rem)' }}
      >
        <div className="flex items-center flex-row gap-2">
          <Link to="/" className="text-2xl mr-6 hover:text-blue-400 transition-colors font-instrument">
            quickwatch
          </Link>
          <Link to="/" className={`px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white hover:text-zinc-900 hover:shadow-[0_0_30px_#e7eaee50] ${
              isActive('/') ? 'bg-white/20 text-white' : 'text-gray-200'
            }`}
          >
            Home
          </Link>
          <Link to="/movies" className={`px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white hover:text-zinc-900 hover:shadow-[0_0_30px_#e7eaee50] ${
              isActive('/movies') ? 'bg-white/20 text-white' : 'text-gray-200'
            }`}
          >
            Movies
          </Link>
          <Link to="/tv" className={`px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white hover:text-zinc-900 hover:shadow-[0_0_30px_#e7eaee50] ${
              isActive('/tv') ? 'bg-white/20 text-white' : 'text-gray-200'
            }`}
          >
            TV Shows
          </Link>
          <Link onClick={() => toast('Anime mode is currently being rewritten to bring you a fast and seamless experience while using quickwatch. It will be back early-mid July.')} className={`px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white hover:text-zinc-900 hover:shadow-[0_0_30px_#e7eaee50 flex flex-col relative line-through ${
              isActive('/anime') ? 'bg-white/20 text-white' : 'text-gray-200'
            }`}
          >
            Anime
          </Link>
        </div>
        
        <div className="flex items-center flex-row gap-2">
          <Link to="/search" className={`p-2 rounded-full transition-all duration-200 hover:bg-white hover:text-zinc-900 hover:shadow-[0_0_30px_#e7eaee50] ${
              isActive('/search') ? 'bg-white/20 text-white' : 'text-gray-200'
            }`}
          >
            <Search className="w-5 h-5" />
          </Link>
          <Link to="/watchlist" className={`p-2 rounded-full transition-all duration-200 hover:bg-white hover:text-zinc-900 hover:shadow-[0_0_30px_#e7eaee50] ${
              isActive('/watchlist') ? 'bg-white/20 text-white' : 'text-gray-200'
            }`}
          >
            <Bookmark className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Mobile Bar */}
      <div 
        className="fixed bottom-[-1px] left-0 w-full flex justify-around items-center py-4 pb-8 z-50 md:hidden bg-[#232323ab] backdrop-blur-lg transition-opacity duration-300"
        style={{ opacity: mobileHeaderOpacity }}
      >
        <Link to="/" className={`flex flex-col items-center transition-colors ${
            isActive('/') ? 'text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        <Link to="/movies" className={`flex flex-col items-center transition-colors ${
            isActive('/movies') ? 'text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Film className="w-6 h-6" />
          <span className="text-xs mt-1">Movies</span>
        </Link>
        
        <Link to="/tv" className={`flex flex-col items-center transition-colors ${
            isActive('/tv') ? 'text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Tv className="w-6 h-6" />
          <span className="text-xs mt-1">TV</span>
        </Link>
        
        <Link to="/search" className={`flex flex-col items-center transition-colors ${
            isActive('/search') ? 'text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Search className="w-6 h-6" />
          <span className="text-xs mt-1">Search</span>
        </Link>
        
        <Link to="/watchlist" className={`flex flex-col items-center transition-colors ${
            isActive('/watchlist') ? 'text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Bookmark className="w-6 h-6" />
          <span className="text-xs mt-1">Watchlist</span>
        </Link>
        
        {showIOSInstall && (
          <a href="/ios" className="text-zinc-400 hover:text-white flex flex-col items-center transition-colors">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <span className="text-xs mt-1">Install</span>
          </a>
        )}
      </div>
    </>
  );
};

export default Header;
