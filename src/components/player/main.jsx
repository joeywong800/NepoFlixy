import React, { useEffect, useState, useRef } from 'react';
import PlayerTemplate from './template';
import { initializeVideo, setupVideoEventListeners, handleSeek, skipTime, togglePlay, toggleMute, handleVolumeChange, toggleFullscreen, togglePictureInPicture, showControlsTemporarily, parseTimeToSeconds, changePlaybackSpeed, changeQuality } from './helpers';
import { saveProgress, getProgress } from '../progress';
import { isMobileDevice } from '../../utils';

const VideoPlayer = ({ 
  videoUrl, 
  originalVideoUrl,
  onError, 
  showCaptionsPopup, 
  setShowCaptionsPopup, 
  subtitlesEnabled, 
  subtitleError, 
  subtitlesLoading, 
  availableSubtitles, 
  selectedSubtitle, 
  onSelectSubtitle, 
  subtitleCues, 
  availableQualities: externalQualities,
  selectedQuality: externalSelectedQuality,
  onQualityChange: externalOnQualityChange,
  mediaId, 
  mediaType, 
  season = 0, 
  episode = 0, 
  sourceIndex = 0 
}) => {
  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bufferedAmount, setBufferedAmount] = useState(0);
  const [isProgressHovered, setIsProgressHovered] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  
  // Volume slider state
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  
  // Subtitle state
  const [currentSubtitleText, setCurrentSubtitleText] = useState('');
  
  // Settings state
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [qualitiesLoading, setQualitiesLoading] = useState(false);
  
  // Progress tracking state
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const playerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const progressBarRef = useRef(null);
  const progressSaveTimeoutRef = useRef(null);
  const volumeTimeoutRef = useRef(null);
  const volumeSliderRef = useRef(null);

  useEffect(() => {
    if (mediaId && mediaType) {
      const existingProgress = getProgress(parseInt(mediaId), mediaType, parseInt(season), parseInt(episode));
      setSavedProgress(existingProgress);
      setProgressLoaded(false);
      console.log('Loaded saved progress:', existingProgress);
    }
  }, [mediaId, mediaType, season, episode]);

  useEffect(() => {
    if (!progressLoaded && savedProgress && savedProgress.watchedDuration > 0 && videoRef.current) {
      const restorePosition = () => {
        if (videoRef.current && videoRef.current.duration > 0 && videoRef.current.readyState >= 2) {
          const targetTime = savedProgress.watchedDuration;
          console.log(`Restoring video position to: ${targetTime} seconds`);
          videoRef.current.currentTime = targetTime;
          setProgressLoaded(true);
          
          // Remove all event listeners
          videoRef.current.removeEventListener('loadedmetadata', restorePosition);
          videoRef.current.removeEventListener('loadeddata', restorePosition);
          videoRef.current.removeEventListener('canplay', restorePosition);
          videoRef.current.removeEventListener('canplaythrough', restorePosition);
        }
      };

      // Try to restore immediately if video is already ready
      if (videoRef.current.duration > 0 && videoRef.current.readyState >= 2) {
        restorePosition();
      } else {
        // Add multiple event listeners to catch when video becomes ready
        videoRef.current.addEventListener('loadedmetadata', restorePosition);
        videoRef.current.addEventListener('loadeddata', restorePosition);
        videoRef.current.addEventListener('canplay', restorePosition);
        videoRef.current.addEventListener('canplaythrough', restorePosition);
      }

      // Cleanup function
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', restorePosition);
          videoRef.current.removeEventListener('loadeddata', restorePosition);
          videoRef.current.removeEventListener('canplay', restorePosition);
          videoRef.current.removeEventListener('canplaythrough', restorePosition);
        }
      };
    } else if (!savedProgress || savedProgress.watchedDuration <= 0) {
      setProgressLoaded(true);
    }
  }, [savedProgress, progressLoaded, videoUrl]);

  // Save progress every 2 seconds unconditionally
  useEffect(() => {
    if (mediaId && mediaType && duration > 0) {
      // Clear existing timeout
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
      
      // Save progress every 2 seconds regardless of conditions
      progressSaveTimeoutRef.current = setTimeout(() => {
        saveProgress({
          id: parseInt(mediaId),
          mediaType: mediaType,
          season: parseInt(season),
          episode: parseInt(episode),
          sourceIndex: parseInt(sourceIndex),
          fullDuration: Math.floor(duration),
          watchedDuration: Math.floor(currentTime),
          timestamp: Date.now()
        });
      }, 2000);
    }
    
    return () => {
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
    };
  }, [currentTime, duration, mediaId, mediaType, season, episode, sourceIndex]);

  // Helper function to save progress immediately
  const saveProgressNow = () => {
    if (mediaId && mediaType && duration > 0) {
      saveProgress({
        id: parseInt(mediaId),
        mediaType: mediaType,
        season: parseInt(season),
        episode: parseInt(episode),
        sourceIndex: parseInt(sourceIndex),
        fullDuration: Math.floor(duration),
        watchedDuration: Math.floor(currentTime),
        timestamp: Date.now()
      });
    }
  };

  // Save progress when component unmounts or video changes
  useEffect(() => {
    return () => {
      if (mediaId && mediaType && currentTime > 0 && duration > 0) {
        saveProgress({
          id: parseInt(mediaId),
          mediaType: mediaType,
          season: parseInt(season),
          episode: parseInt(episode),
          sourceIndex: parseInt(sourceIndex),
          fullDuration: Math.floor(duration),
          watchedDuration: Math.floor(currentTime),
          timestamp: Date.now()
        });
      }
    };
  }, [videoUrl, mediaId, mediaType, season, episode, sourceIndex]);

  // Initialize video when videoUrl changes
  useEffect(() => {
    if (videoUrl) {
      setIsVideoLoading(true);
      setQualitiesLoading(true);
      initializeVideo(videoUrl, videoRef, hlsRef, onError, setAvailableQualities);
      setQualitiesLoading(false);
      setProgressLoaded(false);
    } else {
      setIsVideoLoading(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl, onError]);

  useEffect(() => {
    const cleanup = setupVideoEventListeners(videoRef, setCurrentTime, setDuration, setIsPlaying, setVolume, setIsMuted, setIsPictureInPicture, setBufferedAmount);
    
    const handleCanPlay = () => { setIsVideoLoading(false); };
    const handleWaiting = () => { setIsVideoLoading(true); };
    const handleLoadStart = () => { setIsVideoLoading(true); };
    const handleSeeking = () => { setIsVideoLoading(true); };
    const handleSeeked = () => { setIsVideoLoading(false); };
    
    // Optimize buffering for partial content
    const handleProgress = () => {
      if (videoRef.current && videoRef.current.buffered.length > 0) {
        const buffered = videoRef.current.buffered;
        const currentTime = videoRef.current.currentTime;
        
        // Calculate buffered amount more accurately
        let bufferedEnd = 0;
        for (let i = 0; i < buffered.length; i++) {
          if (buffered.start(i) <= currentTime && buffered.end(i) > currentTime) {
            bufferedEnd = buffered.end(i);
            break;
          }
        }
        
        if (bufferedEnd === 0 && buffered.length > 0) {
          bufferedEnd = buffered.end(buffered.length - 1);
        }
        
        const duration = videoRef.current.duration;
        if (duration > 0) {
          setBufferedAmount((bufferedEnd / duration) * 100);
        }
      }
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('canplay', handleCanPlay);
      videoRef.current.addEventListener('waiting', handleWaiting);
      videoRef.current.addEventListener('loadstart', handleLoadStart);
      videoRef.current.addEventListener('seeking', handleSeeking);
      videoRef.current.addEventListener('seeked', handleSeeked);
      videoRef.current.addEventListener('progress', handleProgress);
    }

    return () => {
      cleanup();
      if (videoRef.current) {
        videoRef.current.removeEventListener('canplay', handleCanPlay);
        videoRef.current.removeEventListener('waiting', handleWaiting);
        videoRef.current.removeEventListener('loadstart', handleLoadStart);
        videoRef.current.removeEventListener('seeking', handleSeeking);
        videoRef.current.removeEventListener('seeked', handleSeeked);
        videoRef.current.removeEventListener('progress', handleProgress);
      }
    };
  }, [videoUrl]);

  // Use external qualities if provided, otherwise use internal ones
  const finalAvailableQualities = externalQualities || availableQualities;
  const finalSelectedQuality = externalSelectedQuality || selectedQuality;

  useEffect(() => {
    if (availableQualities.length > 0 && !selectedQuality && !externalQualities) {
      setSelectedQuality(availableQualities[0]);
    }
  }, [availableQualities, selectedQuality, externalQualities]);

  useEffect(() => {
    if (externalSelectedQuality && externalSelectedQuality !== selectedQuality) {
      setSelectedQuality(externalSelectedQuality);
    }
  }, [externalSelectedQuality, selectedQuality]);

  useEffect(() => {
    // Only show custom subtitles on non-mobile devices
    if (isMobileDevice()) {
      setCurrentSubtitleText('');
      return;
    }

    if (!subtitlesEnabled || !selectedSubtitle || !subtitleCues || subtitleCues.length === 0) {
      setCurrentSubtitleText('');
      return;
    }

    const currentCue = subtitleCues.find(cue => {
      const startTime = parseTimeToSeconds(cue.startTime);
      const endTime = parseTimeToSeconds(cue.endTime);
      return currentTime >= startTime && currentTime <= endTime;
    });

    setCurrentSubtitleText(currentCue ? currentCue.text : '');
  }, [currentTime, subtitlesEnabled, selectedSubtitle, subtitleCues]);

  useEffect(() => {
    if (!videoRef.current) return;

    // Only load native tracks on mobile devices
    if (!isMobileDevice()) { return; }

    const video = videoRef.current;
    
    // Remove existing subtitle tracks
    const existingTracks = video.querySelectorAll('track[kind="subtitles"]');
    existingTracks.forEach(track => track.remove());

    // Add new subtitle track if one is selected
    if (selectedSubtitle && selectedSubtitle.url) {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = selectedSubtitle.display || selectedSubtitle.language || 'Subtitles';
      track.srclang = selectedSubtitle.language || 'en';
      track.default = true;
      
      if (selectedSubtitle.url.includes('.srt') || selectedSubtitle.format === 'srt') {
        convertSRTToVTTBlob(selectedSubtitle.url).then(vttBlob => {
          if (vttBlob) {
            track.src = URL.createObjectURL(vttBlob);
            video.appendChild(track);
            
            track.addEventListener('load', () => {
              if (track.track) {
                track.track.mode = subtitlesEnabled ? 'showing' : 'hidden';
              }
            });
          }
        }).catch(err => {
          console.error('Failed to convert SRT to VTT:', err);
        });
      } else {
        track.src = selectedSubtitle.url;
        video.appendChild(track);
        
        // Enable the track
        track.addEventListener('load', () => {
          if (track.track) {
            track.track.mode = subtitlesEnabled ? 'showing' : 'hidden';
          }
        });
      }
    }

    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].kind === 'subtitles') {
        tracks[i].mode = subtitlesEnabled ? 'showing' : 'hidden';
      }
    }
  }, [selectedSubtitle, subtitlesEnabled]);

  // Helper function to convert SRT to VTT
  const convertSRTToVTTBlob = async (srtUrl) => {
    try {
      const response = await fetch(srtUrl, {
        mode: 'cors',
        headers: {'Accept': 'text/plain, text/vtt, application/x-subrip'}
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch SRT: ${response.status}`);
      }
      
      const srtText = await response.text();
      const vttText = convertSRTToVTT(srtText);
      
      return new Blob([vttText], { type: 'text/vtt' });
    } catch (err) {
      console.error('Error converting SRT to VTT:', err);
      return null;
    }
  };

  // Helper function to convert SRT format to VTT format
  const convertSRTToVTT = (srtText) => {
    let vttText = 'WEBVTT\n\n';
    
    const blocks = srtText.trim().split(/\n\s*\n/);
    
    blocks.forEach(block => {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        const timeString = lines[1];
        const text = lines.slice(2).join('\n');
        
        const vttTimeString = timeString.replace(/,/g, '.');
        
        vttText += `${vttTimeString}\n${text}\n\n`;
      }
    });
    
    return vttText;
  };

  // Handle progress bar dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e) => {
        if (isDragging) { handleSeek(e, videoRef, duration, progressBarRef) };
      };
      const handleGlobalMouseUp = () => setIsDragging(false);

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, duration]);

  // Handle volume slider dragging
  useEffect(() => {
    if (isVolumeDragging) {
      const handleGlobalMouseMove = (e) => {
        if (isVolumeDragging) { handleVolumeSliderSeek(e) };
      };
      const handleGlobalMouseUp = () => setIsVolumeDragging(false);

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isVolumeDragging]);

  // Volume slider timeout management
  const showVolumeSliderTemporarily = () => {
    setShowVolumeSlider(true);
    
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 5000);
  };

  const handleVolumeMouseEnter = () => {
    showVolumeSliderTemporarily();
  };

  const handleVolumeMouseLeave = () => {
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 300);
  };

  const handleVolumeSliderMouseEnter = () => {
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    setShowVolumeSlider(true);
    setIsVolumeHovered(true);
  };

  const handleVolumeSliderMouseLeave = () => {
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 300);
    setIsVolumeHovered(false);
  };

  // Event handlers
  const handleMouseMove = () => {
    showControlsTemporarily(setShowControls, controlsTimeoutRef, isPlaying);
  };

  const handleTogglePlay = () => {
    togglePlay(isPlaying, videoRef);
    saveProgressNow();
  };

  const handleProgressMouseDown = (e) => {
    setIsDragging(true);
    handleSeek(e, videoRef, duration, progressBarRef);
    saveProgressNow();
    e.preventDefault();
  };

  const handleProgressMouseEnter = () => {
    setIsProgressHovered(true);
  };

  const handleProgressMouseLeave = () => {
    setIsProgressHovered(false);
  };

  const handleSkipTime = (seconds) => {
    skipTime(seconds, videoRef);
    saveProgressNow();
  };

  const handleToggleMute = () => {
    toggleMute(videoRef);
    saveProgressNow();
  };

  const handleVolumeChangeEvent = (e) => {
    handleVolumeChange(e, videoRef);
    saveProgressNow();
  };

  const handleVolumeSliderMouseDown = (e) => {
    setIsVolumeDragging(true);
    handleVolumeSliderSeek(e);
    saveProgressNow();
    e.preventDefault();
  };

  const handleVolumeSliderSeek = (e) => {
    if (volumeSliderRef.current && videoRef.current) {
      const rect = volumeSliderRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      videoRef.current.volume = pos;
      videoRef.current.muted = pos === 0;
      saveProgressNow();
    }
  };

  const handleToggleFullscreen = () => {
    toggleFullscreen(playerRef, setIsFullscreen);
    saveProgressNow();
  };

  const handleTogglePictureInPicture = () => {
    togglePictureInPicture(videoRef, isPictureInPicture);
    saveProgressNow();
  };

  const handleSelectSubtitle = (subtitle) => {
    onSelectSubtitle(subtitle, videoRef);
    saveProgressNow();
  };

  const handleVideoError = (e) => {
    console.error('Video playback error:', e);
    onError('Video playback failed. Please try again.');
  };

  // Settings handlers
  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    changePlaybackSpeed(speed, videoRef);
    saveProgressNow();
  };

  const handleQualityChange = (quality) => {
    if (externalOnQualityChange) {
      externalOnQualityChange(quality);
    } else {
      setSelectedQuality(quality);
      changeQuality(quality, hlsRef, videoRef, currentTime);
    }
    saveProgressNow();
  };

  // Handle global keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const handledKeys = [' ', 'Spacebar', 'k', 'K', 'ArrowRight', 'l', 'L', 'ArrowLeft', 'j', 'J', 'ArrowUp', 'ArrowDown', 'm', 'M', 'f', 'F'];
      if (handledKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }

      switch (e.key) {
        // Play/pause: Spacebar or K
        case ' ':
        case 'Spacebar':
          if (document.activeElement.tagName !== 'BUTTON') {
            handleTogglePlay();
          }
          break;
        case 'k':
        case 'K':
          handleTogglePlay();
          break;
        
        // +10s: Right arrow or L
        case 'ArrowRight':
        case 'l':
        case 'L':
          handleSkipTime(10);
          break;
        
        // -10s: Left arrow or J
        case 'ArrowLeft':
        case 'j':
        case 'J':
          handleSkipTime(-10);
          break;
        
        // Volume controls
        case 'ArrowUp':
          if (videoRef.current) {
            const newVolume = Math.min(1, videoRef.current.volume + 0.1);
            videoRef.current.volume = newVolume;
            if (videoRef.current.muted && newVolume > 0) {
              videoRef.current.muted = false;
            }
            saveProgressNow();
          }
          break;

        case 'ArrowDown':
          if (videoRef.current) {
            const newVolume = Math.max(0, videoRef.current.volume - 0.1);
            videoRef.current.volume = newVolume;
            if (newVolume === 0) {
              videoRef.current.muted = true;
            }
            saveProgressNow();
          }
          break;
        
        // Mute: M
        case 'm':
        case 'M':
          handleToggleMute();
          break;
        
        // Fullscreen: F
        case 'f':
        case 'F':
          handleToggleFullscreen();
          break;
        
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, handleTogglePlay, handleSkipTime, handleToggleMute, handleToggleFullscreen]);

  return (
    <PlayerTemplate
      // Video refs
      videoRef={videoRef}
      playerRef={playerRef}
      progressBarRef={progressBarRef}
      
      // Video state
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      volume={volume}
      isMuted={isMuted}
      bufferedAmount={bufferedAmount}
      isProgressHovered={isProgressHovered}
      isDragging={isDragging}
      showControls={showControls}
      isFullscreen={isFullscreen}
      isPictureInPicture={isPictureInPicture}
      isVideoLoading={isVideoLoading}
      
      // Volume slider state
      showVolumeSlider={showVolumeSlider}
      isVolumeDragging={isVolumeDragging}
      isVolumeHovered={isVolumeHovered}
      volumeSliderRef={volumeSliderRef}
      
      // Subtitle state
      showCaptionsPopup={showCaptionsPopup}
      setShowCaptionsPopup={setShowCaptionsPopup}
      subtitlesEnabled={subtitlesEnabled}
      subtitleError={subtitleError}
      subtitlesLoading={subtitlesLoading}
      availableSubtitles={availableSubtitles}
      selectedSubtitle={selectedSubtitle}
      currentSubtitleText={currentSubtitleText}
      
      // Settings state
      showSettingsPopup={showSettingsPopup}
      setShowSettingsPopup={setShowSettingsPopup}
      playbackSpeed={playbackSpeed}
      availableQualities={finalAvailableQualities}
      selectedQuality={finalSelectedQuality}
      qualitiesLoading={qualitiesLoading}
      
      // Event handlers
      onMouseMove={handleMouseMove}
      onTogglePlay={handleTogglePlay}
      onProgressMouseDown={handleProgressMouseDown}
      onProgressMouseEnter={handleProgressMouseEnter}
      onProgressMouseLeave={handleProgressMouseLeave}
      onSkipTime={handleSkipTime}
      onToggleMute={handleToggleMute}
      onVolumeChange={handleVolumeChangeEvent}
      onToggleFullscreen={handleToggleFullscreen}
      onTogglePictureInPicture={handleTogglePictureInPicture}
      onSelectSubtitle={handleSelectSubtitle}
      onVideoError={handleVideoError}
      onSpeedChange={handleSpeedChange}
      onQualityChange={handleQualityChange}
      
      // Volume slider handlers
      onVolumeMouseEnter={handleVolumeMouseEnter}
      onVolumeMouseLeave={handleVolumeMouseLeave}
      onVolumeSliderMouseEnter={handleVolumeSliderMouseEnter}
      onVolumeSliderMouseLeave={handleVolumeSliderMouseLeave}
      onVolumeSliderMouseDown={handleVolumeSliderMouseDown}
      onVolumeSliderHoverEnter={handleVolumeSliderMouseEnter}
      onVolumeSliderHoverLeave={handleVolumeSliderMouseLeave}
    />
  );
};

export default VideoPlayer;
