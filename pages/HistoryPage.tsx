import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Video } from '../types';
import { MOCK_VIDEOS } from '../constants';
import { getVideo, meGetHistory, MeHistoryEntry } from '../lib/api';
import { localGetHistory } from '../lib/localUserData';
import { useAuth } from '../context/AuthContext';

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type HistoryItem = {
  video: Video;
  progressSeconds: number;
  lastWatchedAt: number;
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const entries: { videoId: string; progressSeconds: number; lastWatchedAt: number }[] = user
          ? (await meGetHistory()).history.map((h: MeHistoryEntry) => ({
              videoId: h.video_id,
              progressSeconds: Number(h.progress_seconds || 0),
              lastWatchedAt: new Date(h.last_watched_at).getTime(),
            }))
          : localGetHistory().map((h) => ({
              videoId: h.videoId,
              progressSeconds: Number(h.progressSeconds || 0),
              lastWatchedAt: Number(h.lastWatchedAt || 0),
            }));

        const videos = await Promise.all(
          entries.map(async (e) => {
            try {
              if (!isUuid(e.videoId)) {
                return (MOCK_VIDEOS.find((m) => m.id === e.videoId) as any) as Video;
              }
              const res = await getVideo(e.videoId);
              return res.video as Video;
            } catch {
              return null;
            }
          })
        );

        const merged: HistoryItem[] = entries
          .map((e, i) => {
            const v = videos[i];
            if (!v) return null;
            return { video: v, progressSeconds: e.progressSeconds, lastWatchedAt: e.lastWatchedAt };
          })
          .filter(Boolean) as HistoryItem[];

        if (!cancelled) setItems(merged);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const content = useMemo(() => {
    if (loading) return <div className="p-6 text-yt-textSec">Loading...</div>;
    if (items.length === 0) {
      return (
        <div className="p-6">
          <div className="text-lg font-bold mb-2">No history yet</div>
          <div className="text-sm text-yt-textSec">Watch a video and it will appear here.</div>
          <Link to="/" className="inline-block mt-4 text-blue-400 hover:underline">
            Go home
          </Link>
        </div>
      );
    }

    return (
      <div className="p-3 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((it) => (
            <Link key={it.video.id} to={`/watch/${it.video.id}`} className="group">
              <div className="bg-yt-gray/40 hover:bg-yt-gray/70 transition-colors rounded-xl p-3">
                <div className="flex gap-3">
                  <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-yt-gray flex-shrink-0">
                    <img src={it.video.thumbnail} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 text-[10px] font-medium rounded text-white">
                      {it.video.duration}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm line-clamp-2 group-hover:text-blue-400 transition-colors">
                      {it.video.title}
                    </div>
                    <div className="text-xs text-yt-textSec mt-1">{it.video.views}</div>
                    <div className="text-xs text-yt-textSec mt-1">
                      Watched {Math.max(0, Math.floor(it.progressSeconds))}s
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }, [items, loading]);

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        <h1 className="text-lg font-bold">History</h1>
      </div>
      {content}
    </div>
  );
}
