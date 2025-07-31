import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Home from './pages/browse/Home.jsx';
import Movies from './pages/browse/Movies.jsx';
import Tv from './pages/browse/Tv.jsx';
import Details from './pages/details/Details.jsx';
import Watchlist from './pages/Watchlist.jsx';
import Search from './pages/Search.jsx';
import Ios from './pages/misc/Ios.jsx';
import PrimeNet from './pages/embeds/primenet.jsx';
import Fox from './pages/embeds/fox.jsx';
import AnimeHome from './pages/anime/home.jsx';
import AnimeDetails from './pages/anime/details.jsx';
import AnimeSearch from './pages/anime/search.jsx';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/tv" element={<Tv />} />
        <Route path="/movie/:tmdbId" element={<Details />} />
        <Route path="/tv/:tmdbId" element={<Details />} />
        <Route path="/anime" element={<AnimeHome />} />
        <Route path="/anime/search" element={<AnimeSearch />} />
        <Route path="/anime/:id" element={<AnimeDetails />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/search" element={<Search />} />
        <Route path="/ios" element={<Ios />} />
        <Route path="/e/primenet/:tmdbid" element={<PrimeNet />} />
        <Route path="/e/primenet/:tmdbid/:season/:episode" element={<PrimeNet />} />
        <Route path="/e/fox/:tmdbid" element={<Fox />} />
        <Route path="/e/fox/:tmdbid/:season/:episode" element={<Fox />} />
      </Routes>
      <Toaster 
        position="bottom-center"
        theme="dark"
        duration={3000}
        unstyled
        closeButton
      />
    </Router>
  )
}
