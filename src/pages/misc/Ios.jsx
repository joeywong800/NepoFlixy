import React from 'react';
import Header from '../../components/Header.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple } from '@fortawesome/free-brands-svg-icons';

const Ios = () => {
  return (
    <>
      <Header />
      
      <div className="md:ml-16 p-4 md:p-12 pb-20 md:pb-12 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <FontAwesomeIcon icon={faApple} className="text-6xl mb-6 mt-6" />
          <h1 className="text-3xl md:text-4xl font-bold mb-6">Installing NepoFlix on your iPhone/iPad</h1>
          
          <div className="space-y-8 text-left">
            <div className="bg-zinc-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Step 1: Open NepoFlix in Safari</h2>
              <p className="text-zinc-300">Make sure you're using Safari browser. Most other browsers don't support adding apps to the home screen.</p>
            </div>
            
            <div className="bg-zinc-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Step 2: Tap the Share button</h2>
              <p className="text-zinc-300">Tap the Share button (the square with an arrow pointing upward) at the bottom of the browser.</p>
            </div>
            
            <div className="bg-zinc-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Step 3: Add to the Home Screen</h2>
              <p className="text-zinc-300">Scroll down and tap \"Add to Home Screen\" (it might be a square with a plus sign in it). When clicked, click the blue Add button in the top right.</p>
            </div>
            
            
            <div className="bg-zinc-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Step 4: Launch as an App</h2>
              <p className="text-zinc-300">Now you can launch NepoFlix from your home screen like it's an actual app!</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Ios;
