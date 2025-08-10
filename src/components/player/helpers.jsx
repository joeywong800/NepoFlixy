export const formatTime = (time) => {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};

export const fetchM3U8Data = async (proxiedUrl) => {
  try {
    const response = await fetch(proxiedUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, text/plain' }
    });
    
    if (!response.ok) { throw new Error(`Failed fetching M3U8 data: ${response.status} ${response.statusText}`); }
    
    const m3u8Data = await response.text();
    return m3u8Data;
  } catch (error) { throw error }
};

export const initializeVideo = async (videoUrl, videoRef, hlsRef, setError, setAvailableQualities) => {
  if (!videoUrl || !videoRef.current) return;

  try {
    if (videoUrl.includes('.m3u8') || videoUrl.includes('m3u8')) {
      // Use HLS.js for m3u8 streams
      const Hls = (await import('hls.js')).default;
      
      if (Hls.isSupported()) {
        if (hlsRef.current) { hlsRef.current.destroy(); }

        const hls = new Hls({ 
          enableWorker: true, 
          lowLatencyMode: false, 
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLookUpTolerance: 0.25,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: Infinity,
          liveDurationInfinity: false,
          enableSoftwareAES: true,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 1,
          manifestLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 4,
          levelLoadingRetryDelay: 1000,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
          startFragPrefetch: true,
          testBandwidth: true
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setError('Fatal error occurred during video playback');
                hls.destroy();
                break;
            }
          }
        });

        // Extract quality levels
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          if (setAvailableQualities && data.levels) {
            const qualities = data.levels.map((level, index) => ({
              index,
              height: level.height,
              width: level.width,
              bitrate: level.bitrate,
              quality: level.height ? `${level.height}p` : 'Unknown',
              name: level.height ? `${level.height}p` : 'Unknown',
              url: level.url || videoUrl
            }));
            
            qualities.sort((a, b) => b.height - a.height);
            
            setAvailableQualities(qualities);
          }
        });

        if (videoUrl.includes('m3u8-proxy')) {
          try {
            const m3u8Data = await fetchM3U8Data(videoUrl);
            
            const blob = new Blob([m3u8Data], { type: 'application/vnd.apple.mpegurl' });
            const blobUrl = URL.createObjectURL(blob);
            
            hls.loadSource(blobUrl);
            hls.attachMedia(videoRef.current);
            
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 10000);
            
          } catch (error) {
            hls.loadSource(videoUrl);
            hls.attachMedia(videoRef.current);
          }
        } else {
          hls.loadSource(videoUrl);
          hls.attachMedia(videoRef.current);
        }
        
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        if (videoUrl.includes('m3u8-proxy')) {
          try {
            const m3u8Data = await fetchM3U8Data(videoUrl);
            const blob = new Blob([m3u8Data], { type: 'application/vnd.apple.mpegurl' });
            const blobUrl = URL.createObjectURL(blob);
            
            videoRef.current.src = blobUrl;
            
            const handleLoadedData = () => {
              setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
              }, 1000);
              videoRef.current.removeEventListener('loadeddata', handleLoadedData);
            };
            videoRef.current.addEventListener('loadeddata', handleLoadedData);
            
          } catch (error) {
            videoRef.current.src = videoUrl;
          }
        } else {
          videoRef.current.src = videoUrl;
        }
        
        // For native HLS, we can't extract quality levels easily
        if (setAvailableQualities) {
          setAvailableQualities([]);
        }
      } else {
        setError('HLS is not supported in this browser');
      }
    } else {
      // Regular video file - set src directly
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      const video = videoRef.current;
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      
      const handleLoadedMetadata = () => {
        video.preload = 'auto';
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      if (setAvailableQualities) {
        setAvailableQualities([]);
      }
    }
  } catch (err) {
    console.error('Error loading video:', err);
    setError('Failed to initialize video player');
  }
};

export const setupVideoEventListeners = (videoRef, setCurrentTime, setDuration, setIsPlaying, setVolume, setIsMuted, setIsPictureInPicture, setBufferedAmount) => {
  const video = videoRef.current;
  if (!video) return null;

  const handleTimeUpdate = () => setCurrentTime(video.currentTime);
  const handleDurationChange = () => setDuration(video.duration);
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleVolumeChange = () => { setVolume(video.volume); setIsMuted(video.muted); };
  const handleEnterpictureinpicture = () => setIsPictureInPicture(true);
  const handleLeavepictureinpicture = () => setIsPictureInPicture(false);
  const handleProgress = () => {
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.duration;
      if (duration > 0) { setBufferedAmount((bufferedEnd / duration) * 100); }
    }
  };

  video.addEventListener('timeupdate', handleTimeUpdate);
  video.addEventListener('durationchange', handleDurationChange);
  video.addEventListener('play', handlePlay);
  video.addEventListener('pause', handlePause);
  video.addEventListener('volumechange', handleVolumeChange);
  video.addEventListener('enterpictureinpicture', handleEnterpictureinpicture);
  video.addEventListener('leavepictureinpicture', handleLeavepictureinpicture);
  video.addEventListener('progress', handleProgress);

  return () => {
    video.removeEventListener('timeupdate', handleTimeUpdate);
    video.removeEventListener('durationchange', handleDurationChange);
    video.removeEventListener('play', handlePlay);
    video.removeEventListener('pause', handlePause);
    video.removeEventListener('volumechange', handleVolumeChange);
    video.removeEventListener('enterpictureinpicture', handleEnterpictureinpicture);
    video.removeEventListener('leavepictureinpicture', handleLeavepictureinpicture);
    video.removeEventListener('progress', handleProgress);
  };
};

export const handleSeek = (e, videoRef, duration, progressBarRef) => {
  if (videoRef.current && duration && progressBarRef.current) {
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * duration;
  }
};

export const skipTime = (seconds, videoRef) => {
  if (videoRef.current) {
    videoRef.current.currentTime += seconds;
  }
};

export const togglePlay = (isPlaying, videoRef) => {
  if (videoRef.current) {
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }
};

export const toggleMute = (videoRef) => {
  if (videoRef.current) {
    videoRef.current.muted = !videoRef.current.muted;
  }
};

export const handleVolumeChange = (e, videoRef) => {
  const newVolume = parseFloat(e.target.value);
  if (videoRef.current) {
    videoRef.current.volume = newVolume;
    videoRef.current.muted = newVolume === 0;
  }
};

export const toggleFullscreen = (playerRef, setIsFullscreen) => {
  if (!document.fullscreenElement) {
    playerRef.current?.requestFullscreen();
    setIsFullscreen(true);
  } else {
    document.exitFullscreen();
    setIsFullscreen(false);
  }
};

export const togglePictureInPicture = (videoRef, isPictureInPicture) => {
  if (videoRef.current && document.pictureInPictureEnabled) {
    if (isPictureInPicture) {
      document.exitPictureInPicture();
    } else {
      videoRef.current.requestPictureInPicture();
    }
  }
};

export const showControlsTemporarily = (
  setShowControls,
  controlsTimeoutRef,
  isPlaying
) => {
  setShowControls(true);
  if (controlsTimeoutRef.current) {
    clearTimeout(controlsTimeoutRef.current);
  }
  controlsTimeoutRef.current = setTimeout(() => {
    if (isPlaying) {
      setShowControls(false);
    }
  }, 3000);
};

export const parseTimeToSeconds = (timeString) => {
  const [hours, minutes, seconds] = timeString.split(':');
  const [secs, millisecs] = seconds.split(/[,.]/);
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(secs) + (parseInt(millisecs || 0) / 1000);
};

export const changePlaybackSpeed = (speed, videoRef) => {
  if (videoRef.current) {
    videoRef.current.playbackRate = speed;
  }
};

export const changeQuality = async (quality, hlsRef, videoRef, currentTime) => {
  if (!quality || !videoRef.current) return;

  const preserveTime = currentTime || 0;
  const preservePlayState = videoRef.current && !videoRef.current.paused;
  
  // If we have HLS and a valid quality index, try to change level
  if (hlsRef.current && quality.index !== -1 && quality.index !== undefined) {
    const hls = hlsRef.current;
    
    hls.currentLevel = quality.index;
    
    // Preserve playback position and state
    if (preserveTime > 0) {
      const handleLoadedData = () => {
        videoRef.current.currentTime = preserveTime;
        if (preservePlayState) {
          videoRef.current.play().catch(console.error);
        }
        videoRef.current.removeEventListener('loadeddata', handleLoadedData);
      };
      
      videoRef.current.addEventListener('loadeddata', handleLoadedData);
    }
  } 
  else if (quality.url && quality.url !== videoRef.current.src) {
    // For different quality URLs, we need to reload the source
    const handleLoadedData = () => {
      if (preserveTime > 0) {
        videoRef.current.currentTime = preserveTime;
      }
      if (preservePlayState) {
        videoRef.current.play().catch(console.error);
      }
      videoRef.current.removeEventListener('loadeddata', handleLoadedData);
    };
    
    videoRef.current.addEventListener('loadeddata', handleLoadedData);
    
    // If we have HLS, load the new source
    if (hlsRef.current) {
      if (quality.url.includes('m3u8-proxy')) {
        try {
          const m3u8Data = await fetchM3U8Data(quality.url);
          
          const blob = new Blob([m3u8Data], { type: 'application/vnd.apple.mpegurl' });
          const blobUrl = URL.createObjectURL(blob);
          
          hlsRef.current.loadSource(blobUrl);
          
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 10000);
          
        } catch (error) {
          hlsRef.current.loadSource(quality.url);
        }
      } else {
        hlsRef.current.loadSource(quality.url);
      }
    } else {
      // native HLS support
      if (quality.url.includes('m3u8-proxy')) {
        try {
          const m3u8Data = await fetchM3U8Data(quality.url);
          const blob = new Blob([m3u8Data], { type: 'application/vnd.apple.mpegurl' });
          const blobUrl = URL.createObjectURL(blob);
          
          videoRef.current.src = blobUrl;
          
          const handleLoadedDataCleanup = () => {
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 1000);
            videoRef.current.removeEventListener('loadeddata', handleLoadedDataCleanup);
          };
          videoRef.current.addEventListener('loadeddata', handleLoadedDataCleanup);
          
        } catch (error) {
          videoRef.current.src = quality.url;
        }
      } else {
        videoRef.current.src = quality.url;
      }
    }
  }
};

export const extractQualitiesFromM3U8 = async (m3u8Url, createProxyUrl, headers = {}) => {
  try {
    console.log('Fetching M3U8 from:', m3u8Url);
    const response = await fetch(m3u8Url);
    const m3u8Text = await response.text();
    console.log('M3U8 content preview:', m3u8Text.substring(0, 500));
    
    const qualities = [];
    const lines = m3u8Text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const resolutionMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
        const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
        const frameRateMatch = line.match(/FRAME-RATE=([\d.]+)/);
        
        // Look for the next non-empty, non-comment line
        let url = null;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.startsWith('#')) {
            url = nextLine;
            break;
          }
        }
        
        if (resolutionMatch && url) {
          const width = parseInt(resolutionMatch[1]);
          const height = parseInt(resolutionMatch[2]);
          const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1]) : 0;
          const frameRate = frameRateMatch ? parseFloat(frameRateMatch[1]) : null;
          
          let finalUrl = url;
          
          if (!url.startsWith('http')) {
            const baseUrl = m3u8Url.split('/').slice(0, -1).join('/');
            const fullUrl = `${baseUrl}/${url}`;
            finalUrl = createProxyUrl ? createProxyUrl(fullUrl, headers) : fullUrl;
          }
          else if (createProxyUrl) {
            finalUrl = createProxyUrl(url, headers);
          }
          
          qualities.push({ 
            index: qualities.length, 
            width, 
            height, 
            bitrate: bandwidth, 
            frameRate,
            quality: `${height}p`, 
            name: `${height}p`,
            url: finalUrl 
          });
          
          console.log(`Found quality: ${height}p (${width}x${height}) - ${finalUrl}`);
        }
      }
    }
    
    qualities.sort((a, b) => b.height - a.height);
    
    console.log('Final extracted qualities:', qualities);
    return qualities;
  } catch (error) {
    console.error('Error extracting qualities from M3U8:', error);
    return [];
  }
};
