import React, { useState, useEffect, useCallback } from 'react';
import { VideoCard } from '../components/VideoCard';
import { GridSkeleton } from '../components/Skeletons';
import { getTrendingCategories, getTrendingCategoryVideos, listVideos } from '../lib/api';
import { Video } from '../types';
import { MOCK_VIDEOS } from '../constants';
import { localGetHistory, localGetLiked } from '../lib/localUserData';
import { TrendingUp } from 'lucide-react';


type TrendingCategory = { id: string; name: string };

function parseViews(v: Video) {
  const raw = String((v as any).views || '0');
  const m = raw.match(/[0-9][0-9,]*/);
  if (!m) return 0;
  const n = Number(m[0].replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseAgeHours(v: Video) {
  const raw = (v as any).createdAt;
  if (!raw) return 24 * 365;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return 24 * 365;
  const diff = Date.now() - t;
  return Math.max(0, diff / (1000 * 60 * 60));
}

function rankVideos(videos: Video[]) {
  if (videos.length <= 1) return videos;

  const liked = new Set(localGetLiked());
  const history = localGetHistory();
  const preferredCategoryScore = new Map<string, number>();

  // Preference weights derived from IDs seen in current list (fast + no extra data fetching)
  for (const v of videos) {
    const cat = (v as any).category || 'All';
    if (liked.has(v.id)) preferredCategoryScore.set(cat, (preferredCategoryScore.get(cat) || 0) + 2);
  }
  for (const h of history.slice(0, 50)) {
    const found = videos.find((v) => v.id === h.videoId);
    if (!found) continue;
    const cat = (found as any).category || 'All';
    preferredCategoryScore.set(cat, (preferredCategoryScore.get(cat) || 0) + 1);
  }

  const scored = videos.map((v) => {
    const views = parseViews(v);
    const ageH = parseAgeHours(v);
    const pop = Math.log10(views + 1);
    const freshness = Math.exp(-ageH / 72); // 3-day decay
    const cat = (v as any).category || 'All';
    const pref = Math.min(3, preferredCategoryScore.get(cat) || 0);

    const score = pop * 1.2 + freshness * 2.0 + pref * 0.3;
    return { v, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Lightweight diversity: avoid repeating the same channel too often in top results
  const channelCount = new Map<string, number>();
  const result: Video[] = [];
  for (const item of scored) {
    const ch = String((item.v as any).channelName || '');
    const used = channelCount.get(ch) || 0;
    if (result.length < 20 && used >= 2) continue;
    result.push(item.v);
    channelCount.set(ch, used + 1);
  }

  if (result.length < videos.length) {
    const usedIds = new Set(result.map((v) => v.id));
    for (const item of scored) {
      if (!usedIds.has(item.v.id)) result.push(item.v);
    }
  }

  return result;
}



export default function ExplorePage() {
  const [trendingCategories, setTrendingCategories] = useState<TrendingCategory[]>([]);
  const [activeTrendingCategoryId, setActiveTrendingCategoryId] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTrendingCategoryId) {
        const res = await getTrendingCategoryVideos(activeTrendingCategoryId);
        const items = (res.videos || []) as Video[];
        setVideos(items);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [activeTrendingCategoryId]);

  useEffect(() => {
    loadVideos();
  }, [activeTrendingCategoryId, loadVideos]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await getTrendingCategories();
        if (cancelled) return;
        const cats = res.categories || [];
        setTrendingCategories(cats);
        setActiveTrendingCategoryId(cats[0]?.id || null);
      } catch {
        if (cancelled) return;
        setTrendingCategories([]);
        setActiveTrendingCategoryId(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`;
    }
    return `${views} views`;
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-yt-black">
      {/* Minimalistic Header */}
      <div className="sticky top-14 z-30 bg-yt-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-red-500" />
              Explore
            </h1>
          </div>

          {/* Trending Category Pills */}
          {trendingCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {trendingCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveTrendingCategoryId(c.id)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeTrendingCategoryId === c.id
                      ? 'bg-white text-black font-semibold'
                      : 'bg-[#272727] hover:bg-[#3f3f3f] text-white'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {loading ? (
          <GridSkeleton count={20} />
        ) : videos.length > 0 ? (
          <>
            <div className="mb-4">
              <p className="text-yt-textSec">
                Showing {videos.length} videos
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 gap-y-6 sm:gap-y-8 sm:gap-x-4">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-yt-textSec">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <p className="text-xl font-semibold mb-2">No videos found</p>
            <p className="text-sm mb-4">
              Admin has not added videos to this trending category yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
