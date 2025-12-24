import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, X, Volume2 } from 'lucide-react';
import SmartVideoPlayer from '../components/SmartVideoPlayer';
import { listShorts } from '../lib/api';
import { Video } from '../types';

type Direction = 'up' | 'down';

export default function ShortsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartAtRef = useRef<number>(0);

  const [shorts, setShorts] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => shorts[activeIndex] || null, [shorts, activeIndex]);

  const go = (dir: Direction) => {
    setActiveIndex((i) => {
      const next = dir === 'up' ? i + 1 : i - 1;
      return Math.min(Math.max(0, next), Math.max(0, shorts.length - 1));
    });
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listShorts({ limit: 10, offset: 0 });
        const vids = (res.videos || []) as Video[];
        setShorts(vids);
        setActiveIndex(0);
      } catch {
        setError('Failed to load shorts.');
        setShorts([]);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  useEffect(() => {
    if (activeIndex >= shorts.length - 3 && shorts.length > 0) {
      const loadMore = async () => {
        try {
          const res = await listShorts({ limit: 10, offset: shorts.length });
          const vids = (res.videos || []) as Video[];
          if (vids.length > 0) {
            setShorts(prev => [...prev, ...vids]);
          }
        } catch {
          // Silently fail
        }
      };
      void loadMore();
    }
  }, [activeIndex, shorts.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 20) return;
      if (e.deltaY > 0) go('up');
      else go('down');
    };

    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel as any);
  }, [shorts.length]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      go('up');
    }
    if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      go('down');
    }
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartYRef.current = t.clientY;
    touchStartXRef.current = t.clientX;
    touchStartAtRef.current = Date.now();
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const startY = touchStartYRef.current;
    const startX = touchStartXRef.current;
    touchStartYRef.current = null;
    touchStartXRef.current = null;

    const t = e.changedTouches[0];
    if (!t || startY === null || startX === null) return;

    const dy = t.clientY - startY;
    const dx = t.clientX - startX;
    const dt = Date.now() - touchStartAtRef.current;

    if (dt > 600) return;
    if (Math.abs(dy) < 50) return;
    if (Math.abs(dy) < Math.abs(dx)) return;

    if (dy < 0) go('up');
    else go('down');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-sm text-yt-textSec">Loading shorts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-sm text-red-300">{error}</div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-sm text-yt-textSec">No shorts yet. Mark a video as “Short” in Admin.</div>
      </div>
    );
  }

  const src = active.streamUrl || active.videoUrl || '';

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black flex items-center justify-center px-3"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative w-full max-w-[440px] h-[calc(100vh-56px)] py-3 flex items-center justify-center">
        <div className="absolute top-4 left-4 z-20">
          <Link to="/" className="inline-flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-full text-xs hover:bg-black/60">
            <X className="w-4 h-4" />
            Exit
          </Link>
        </div>

        <div className="absolute top-4 right-4 z-20 text-xs text-white/80 bg-black/40 border border-white/10 px-3 py-1.5 rounded-full">
          {activeIndex + 1} / {shorts.length}
        </div>

        <div className="w-full h-full rounded-2xl overflow-hidden bg-black border border-white/10">
          {src ? (
            <SmartVideoPlayer
              src={src}
              poster={active.thumbnail}
              className="w-full h-full bg-black overflow-hidden shadow-lg relative group outline-none"
              autoPlay
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-yt-textSec">No stream available.</div>
          )}
        </div>

        <div className="absolute bottom-6 left-6 right-20 z-20">
          <div className="text-sm font-semibold line-clamp-2">{active.title}</div>
          <div className="text-xs text-white/70 mt-1">{active.channelName}</div>
        </div>

        <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-3">
          <button className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-black/60">
            <Heart className="w-5 h-5" />
          </button>
          <button className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-black/60">
            <MessageCircle className="w-5 h-5" />
          </button>
          <button className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-black/60">
            <Share2 className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center">
            <Volume2 className="w-5 h-5" />
          </div>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 -left-2 z-20 hidden sm:flex flex-col gap-2">
          <button
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs hover:bg-black/60"
            onClick={() => go('down')}
            disabled={activeIndex === 0}
          >
            Prev
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs hover:bg-black/60"
            onClick={() => go('up')}
            disabled={activeIndex >= shorts.length - 1}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
