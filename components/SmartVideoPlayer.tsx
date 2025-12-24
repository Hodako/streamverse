import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Minimize, Pause, PictureInPicture, Play, Settings, Volume2, VolumeX } from 'lucide-react';
import { getStoredSettings } from '../lib/settingsStorage';

type Props = {
  src: string;
  poster?: string;
  className?: string;
  videoId?: string;
  autoPlay?: boolean;
  initialTimeSeconds?: number;
  onTimeUpdate?: (timeSeconds: number) => void;
  onDuration?: (durationSeconds: number) => void;
};

export default function SmartVideoPlayer({ src, poster, className, videoId, autoPlay, initialTimeSeconds, onTimeUpdate, onDuration }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoPlayAttemptedRef = useRef(false);
  const initialSeekAppliedRef = useRef(false);
  const didApplySettingsRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const lastVolumeRef = useRef(1);

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isFullScreen, setIsFullScreen] = useState(false);

  const progressPercent = useMemo(() => (duration > 0 ? (currentTime / duration) * 100 : 0), [currentTime, duration]);

  useEffect(() => {
    setError(null);
    setIsBuffering(false);
    setIsPlaying(false);
    setIsStartingPlayback(false);
    setCurrentTime(0);
    setDuration(0);
    setShowSpeedMenu(false);
    setShowControls(true);
    autoPlayAttemptedRef.current = false;
    initialSeekAppliedRef.current = false;
    didApplySettingsRef.current = false;
  }, [src]);

  useEffect(() => {
    if (didApplySettingsRef.current) return;
    const s = getStoredSettings();
    setIsMuted(Boolean(s.muted));
    setVolume(typeof s.defaultVolume === 'number' ? s.defaultVolume : 1);
    setPlaybackSpeed(typeof s.playbackSpeed === 'number' ? s.playbackSpeed : 1);
    didApplySettingsRef.current = true;
  }, [src]);

  const applyInitialSeek = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (initialSeekAppliedRef.current) return;
    if (!initialTimeSeconds || !Number.isFinite(initialTimeSeconds) || initialTimeSeconds <= 0) return;

    const dur = el.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;

    const target = Math.max(0, Math.min(initialTimeSeconds, Math.max(0, dur - 0.25)));
    try {
      el.currentTime = target;
      setCurrentTime(target);
      onTimeUpdate?.(target);
      initialSeekAppliedRef.current = true;
    } catch {
      void 0;
    }
  }, [initialTimeSeconds, onTimeUpdate]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!autoPlay) return;
    if (autoPlayAttemptedRef.current) return;

    autoPlayAttemptedRef.current = true;
    const run = async () => {
      try {
        setIsStartingPlayback(true);
        await el.play();
      } catch {
        setIsStartingPlayback(false);
      }
    };

    void run();
  }, [autoPlay, src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  const syncFullscreenState = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setIsFullScreen(false);
      return;
    }
    setIsFullScreen(document.fullscreenElement === container);
  }, []);

  useEffect(() => {
    syncFullscreenState();
    const onFsChange = () => syncFullscreenState();
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [syncFullscreenState]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  };

  const togglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      try {
        setIsStartingPlayback(true);
        await el.play();
      } catch {
        setIsStartingPlayback(false);
        setError('Unable to play this video.');
      }
    } else {
      el.pause();
    }
  };

  const seekBy = (deltaSeconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    const next = Math.min(
      Math.max(0, el.currentTime + deltaSeconds),
      Number.isFinite(el.duration) ? el.duration : el.currentTime + deltaSeconds
    );
    el.currentTime = next;
    setCurrentTime(next);
    onTimeUpdate?.(next);
    showControlsTemporarily();
  };

  const onSeek = (time: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = time;
    setCurrentTime(time);
    onTimeUpdate?.(time);
    showControlsTemporarily();
  };

  const toggleMute = () => {
    const next = !isMuted;
    if (!next) {
      if (volume === 0) {
        const restored = Math.min(1, Math.max(0, lastVolumeRef.current || 1));
        setVolume(restored);
      }
    } else {
      lastVolumeRef.current = volume;
    }
    setIsMuted(next);
    showControlsTemporarily();
  };

  const onVolumeChange = (val: number) => {
    setVolume(val);
    setIsMuted(val === 0);
    if (val > 0) lastVolumeRef.current = val;
    showControlsTemporarily();
  };

  const toggleFullScreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch {
        void 0;
      }
    }

    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
    } else {
      await container.requestFullscreen();
    }

    syncFullscreenState();
    showControlsTemporarily();
  };

  const togglePiP = async () => {
    const el = videoRef.current;
    if (!el) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        if (videoId) {
          try {
            sessionStorage.setItem('streamtube_pip_video_id', videoId);
          } catch {
            void 0;
          }
        }
        await el.requestPictureInPicture();
      }
    } catch {
      void 0;
    }
    showControlsTemporarily();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || (e.target as any)?.isContentEditable) return;

    if (e.key === ' ' || e.key.toLowerCase() === 'k') {
      e.preventDefault();
      void togglePlay();
    }
    if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleMute();
    }
    if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      void toggleFullScreen();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekBy(-10);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekBy(10);
    }
  };

  return (
    <div
      ref={containerRef}
      className={
        className ||
        'w-full aspect-video bg-black sm:rounded-xl overflow-hidden shadow-lg relative group outline-none'
      }
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        preload="auto"
        onClick={() => void togglePlay()}
        onPlay={() => {
          setIsPlaying(true);
          setIsStartingPlayback(false);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onWaiting={() => {
          setIsBuffering(true);
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setIsStartingPlayback(false);
        }}
        onCanPlay={() => {
          setIsBuffering(false);
        }}
        onError={() => {
          setIsBuffering(false);
          setIsStartingPlayback(false);
          setError('This video failed to load.');
        }}
        onTimeUpdate={() => {
          const el = videoRef.current;
          if (!el) return;
          setCurrentTime(el.currentTime);
          onTimeUpdate?.(el.currentTime);
        }}
        onLoadedMetadata={() => {
          const el = videoRef.current;
          if (!el) return;
          setDuration(el.duration || 0);
          onDuration?.(el.duration || 0);
          applyInitialSeek();
        }}
      />

      {(isStartingPlayback || isBuffering) && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="px-3 py-2 rounded-lg bg-black/60 text-sm text-white border border-white/10 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Loading...
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="max-w-[90%] px-4 py-3 rounded-xl bg-black/70 text-sm text-white border border-white/10 text-center">
            {error}
          </div>
        </div>
      )}

      {(!isPlaying || showControls) && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end px-4 pb-4 transition-opacity duration-200 pointer-events-none"
        >
          <div className="w-full h-1.5 bg-gray-600 rounded-full mb-4 cursor-pointer relative group/slider pointer-events-auto">
            <div className="absolute left-0 top-0 bottom-0 bg-red-600 rounded-full" style={{ width: `${progressPercent}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-red-600 rounded-full scale-0 group-hover/slider:scale-100 transition-transform" />
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-4">
              <button onClick={() => void togglePlay()} className="hover:text-red-500 transition-colors">
                {isPlaying ? <Pause className="fill-white" /> : <Play className="fill-white" />}
              </button>

              <div className="flex items-center gap-2 group/vol">
                <button onClick={toggleMute}>{isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}</button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300 h-1 bg-white accent-white cursor-pointer"
                />
              </div>

              <div className="text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-4 relative">
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu((v) => !v)}
                  className={`hover:rotate-45 transition-transform ${showSpeedMenu ? 'rotate-45 text-red-500' : ''}`}
                >
                  <Settings />
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-10 right-0 bg-black/90 rounded-lg p-2 min-w-[110px] shadow-xl border border-white/10 flex flex-col gap-1 z-30">
                    {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          setShowSpeedMenu(false);
                          showControlsTemporarily();
                        }}
                        className={`text-sm text-left px-3 py-1.5 rounded hover:bg-white/10 ${playbackSpeed === speed ? 'text-red-500 font-bold' : 'text-white'}`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => void togglePiP()} className="hover:scale-110 transition-transform hidden sm:block">
                <PictureInPicture />
              </button>

              <button onClick={() => void toggleFullScreen()} className="hover:scale-110 transition-transform">
                {isFullScreen ? <Minimize /> : <Maximize />}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isPlaying && currentTime === 0 && !error && (
        <button
          type="button"
          className="absolute inset-0 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void togglePlay();
          }}
        >
          <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Play className="w-8 h-8 text-white ml-1 fill-white" />
          </div>
        </button>
      )}
    </div>
  );
}
