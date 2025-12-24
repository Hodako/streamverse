import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp } from 'lucide-react';
import { Video } from '../types';
import { MOCK_VIDEOS } from '../constants';
import { getVideo, meGetLikes } from '../lib/api';
import { localGetLiked } from '../lib/localUserData';
import { useAuth } from '../context/AuthContext';

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function LikedVideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const ids = user ? (await meGetLikes()).videoIds : localGetLiked();
        const results = await Promise.all(
          (ids || []).map(async (vid) => {
            try {
              if (!isUuid(vid)) {
                return (MOCK_VIDEOS.find((m) => m.id === vid) as any) as Video;
              }
              const res = await getVideo(vid);
              return res.video as Video;
            } catch {
              return null;
            }
          })
        );
        const list = results.filter(Boolean) as Video[];
        if (!cancelled) setVideos(list);
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
    if (videos.length === 0) {
      return (
        <div className="p-6">
          <div className="text-lg font-bold mb-2">No liked videos</div>
          <div className="text-sm text-yt-textSec">Tap “Like” on a video and it will appear here.</div>
          <Link to="/" className="inline-block mt-4 text-blue-400 hover:underline">
            Go home
          </Link>
        </div>
      );
    }

    return (
      <div className="p-3 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((v) => (
            <Link key={v.id} to={`/watch/${v.id}`} className="group">
              <div className="bg-yt-gray/40 hover:bg-yt-gray/70 transition-colors rounded-xl p-3">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-yt-gray">
                  <img src={v.thumbnail} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1 text-[10px] font-medium rounded text-white">
                    {v.duration}
                  </div>
                </div>
                <div className="mt-2 font-semibold text-sm line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {v.title}
                </div>
                <div className="text-xs text-yt-textSec mt-1">{v.views} • {v.postedAt}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }, [loading, videos]);

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center gap-2">
        <ThumbsUp className="w-5 h-5" />
        <h1 className="text-lg font-bold">Liked videos</h1>
      </div>
      {content}
    </div>
  );
}
