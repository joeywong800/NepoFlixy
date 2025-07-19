import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';

const SettingsManager = ({ 
  showSettingsPopup, 
  setShowSettingsPopup, 
  availableQualities, 
  selectedQuality, 
  onSelectQuality,
  playbackSpeed,
  onSpeedChange,
  qualitiesLoading 
}) => {
  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const currentSpeedIndex = speedOptions.indexOf(playbackSpeed);

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleSpeedIncrease = () => {
    if (currentSpeedIndex < speedOptions.length - 1) {
      onSpeedChange(speedOptions[currentSpeedIndex + 1]);
    }
  };

  const handleSpeedDecrease = () => {
    if (currentSpeedIndex > 0) {
      onSpeedChange(speedOptions[currentSpeedIndex - 1]);
    }
  };

  const getSpeedLabel = (speed) => {
    return speed === 1 ? '1x' : `${speed}x`;
  };

  return (
    <div className="relative settings-popup-container">
      <DropdownMenu open={showSettingsPopup} onOpenChange={setShowSettingsPopup}>
        <DropdownMenuTrigger asChild>
          <button
            onKeyDown={handleKeyDown}
            className="border-none cursor-pointer p-2 rounded-lg flex items-center justify-center transition-all duration-200 ease-in-out w-[46px] h-[46px] relative overflow-hidden bg-transparent text-white hover:bg-white/10 hover:scale-110 active:bg-white/20 active:scale-95 focus:outline-none"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
            </svg>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          side="top" 
          align="end" 
          className={`w-80 bg-black/95 backdrop-blur-md border-white/20 text-white shadow-2xl transition-all duration-300 ease-out origin-bottom-right ${
            showSettingsPopup 
              ? 'animate-modal-scale-in opacity-100 scale-100' 
              : 'animate-modal-scale-out opacity-0 scale-85'
          }`}
          sideOffset={8}
          style={{
            transformOrigin: 'bottom right',
            willChange: 'transform, opacity'
          }}
        >
          <div className="p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-white/80 mb-3">Playback Speed</h4>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSpeedDecrease}
                  onKeyDown={handleKeyDown}
                  disabled={currentSpeedIndex <= 0}
                  className={`flex-1 py-2 px-2 rounded-lg border transition-all duration-200 focus:outline-none ${
                    currentSpeedIndex <= 0
                      ? 'border-gray-600 text-gray-500 cursor-not-allowed'
                      : 'border-white/30 text-white hover:bg-white/10 hover:border-white/50 active:bg-white/20'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15,18 9,12 15,6"/>
                    </svg>
                    <span className='ml-1'>Slower</span>
                  </div>
                </button>

                <div className="flex-shrink-0 py-1.5 px-4 bg-blue-600/20 border border-blue-500/50 rounded-lg text-center min-w-[40px]">
                  <span className="text-blue-300 font-medium text-lg">
                    {getSpeedLabel(playbackSpeed)}
                  </span>
                </div>

                <button
                  onClick={handleSpeedIncrease}
                  onKeyDown={handleKeyDown}
                  disabled={currentSpeedIndex >= speedOptions.length - 1}
                  className={`flex-1 py-2 px-2 rounded-lg border transition-all duration-200 focus:outline-none ${
                    currentSpeedIndex >= speedOptions.length - 1
                      ? 'border-gray-600 text-gray-500 cursor-not-allowed'
                      : 'border-white/30 text-white hover:bg-white/10 hover:border-white/50 active:bg-white/20'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <span className='mr-1'>Faster</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            <div className="w-full h-px bg-white/20 mb-6"></div>

            <div>
              <h4 className="text-sm font-medium text-white/80 mb-3">Quality</h4>
              
              {qualitiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2 text-sm text-white/60">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white/60"></div>
                    <span>Loading qualities...</span>
                  </div>
                </div>
              ) : availableQualities.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {availableQualities.map((quality, index) => (
                    <button
                      key={quality.url || index}
                      onClick={() => onSelectQuality(quality)}
                      onKeyDown={handleKeyDown}
                      className={`p-3 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none ${
                        selectedQuality?.url === quality.url
                          ? 'bg-blue-600/30 border-blue-500/70 text-blue-300'
                          : 'bg-gray-800/50 border-white/20 text-white/80 hover:bg-gray-700/50 hover:border-white/40'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs font-medium">
                          {quality.quality || `${quality.height}p` || 'Unknown'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-white/60">
                  No quality options available
                </div>
              )}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SettingsManager;
