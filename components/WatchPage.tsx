import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Video } from '../types';
import { MOCK_VIDEOS } from '../constants';
import { Bookmark, ChevronDown, Share2, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { analyticsPing, createComment, getComments, getRelatedVideos, getVideo, incrementVideoView, meGetLikes, meGetSaved, meLike, meSave, meUnlike, meUnsave, meUpsertHistory } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { localIsLiked, localIsSaved, localToggleLike, localToggleSaved, localUpsertHistory } from '../lib/localUserData';
import SmartVideoPlayer from './SmartVideoPlayer';
import { getStoredSettings } from '../lib/settingsStorage';

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export const WatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMobileComments, setShowMobileComments] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [autoPlayRequested, setAutoPlayRequested] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [initialSeekSeconds, setInitialSeekSeconds] = useState<number | undefined>(undefined);
  
  // Player State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const historyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchPingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTimeRef = useRef(0);
  const lastWatchProgressRef = useRef(0);

  // Gesture Refs
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setDescriptionExpanded(false);
      setShowMobileComments(false);
      setCommentText('');

      try {
        const res = await getVideo(id);
        if (cancelled) return;
        setVideo(res.video as Video);
      } catch {
        if (cancelled) return;
        const found = MOCK_VIDEOS.find(v => v.id === id) || null;
        setVideo(found);
      }

      try {
        const rel = await getRelatedVideos(id);
        if (!cancelled) setRelated((rel.videos || []) as Video[]);
      } catch {
        if (!cancelled) setRelated(MOCK_VIDEOS.slice(0, 15));
      }

      try {
        const c = await getComments(id);
        if (!cancelled) setComments(c.comments || []);
      } catch {
        if (!cancelled) setComments([]);
      }

      if (!cancelled) {
        setLoading(false);
        window.scrollTo(0, 0);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setAutoPlayEnabled(getStoredSettings().autoplay);

    if (!id) return;
    let pipId: string | null = null;
    try {
      pipId = sessionStorage.getItem('streamtube_autoplay_video_id');
    } catch {
      pipId = null;
    }

    if (pipId && pipId === id) {
      setAutoPlayRequested(true);
      try {
        sessionStorage.removeItem('streamtube_autoplay_video_id');
      } catch {
        void 0;
      }
    } else {
      setAutoPlayRequested(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(`streamtube_resume_time_${id}`);
    } catch {
      raw = null;
    }

    if (!raw) {
      setInitialSeekSeconds(undefined);
      return;
    }

    const t = Number(raw);
    if (Number.isFinite(t) && t > 0) {
      setInitialSeekSeconds(t);
    } else {
      setInitialSeekSeconds(undefined);
    }

    try {
      sessionStorage.removeItem(`streamtube_resume_time_${id}`);
    } catch {
      void 0;
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const run = async () => {
      if (!isUuid(id)) return;
      try {
        const res = await incrementVideoView(id);
        if (cancelled) return;
        setVideo((v) => {
          if (!v) return v;
          const views = Number(res.views || 0);
          return { ...v, views: `${views.toLocaleString()} views` };
        });
      } catch {
        void 0;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const run = async () => {
      if (user) {
        if (!isUuid(id)) {
          if (!cancelled) {
            setIsLiked(false);
            setIsSaved(false);
          }
          return;
        }
        try {
          const likes = await meGetLikes();
          if (!cancelled) setIsLiked((likes.videoIds || []).includes(id));
        } catch {
          if (!cancelled) setIsLiked(false);
        }

        try {
          const saved = await meGetSaved();
          if (!cancelled) setIsSaved((saved.videoIds || []).includes(id));
        } catch {
          if (!cancelled) setIsSaved(false);
        }
      } else {
        setIsLiked(localIsLiked(id));
        setIsSaved(localIsSaved(id));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  useEffect(() => {
    if (!id) return;
    if (historyTimerRef.current) clearInterval(historyTimerRef.current);

    historyTimerRef.current = setInterval(() => {
      const progressSeconds = Math.floor(currentTimeRef.current);
      if (progressSeconds <= 0) return;
      if (user) {
        if (!isUuid(id)) return;
        void meUpsertHistory(id, progressSeconds);
      } else {
        localUpsertHistory(id, progressSeconds);
      }
    }, 15000);

    return () => {
      if (historyTimerRef.current) clearInterval(historyTimerRef.current);
      historyTimerRef.current = null;
    };
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    if (watchPingTimerRef.current) clearInterval(watchPingTimerRef.current);
    lastWatchProgressRef.current = 0;

    watchPingTimerRef.current = setInterval(() => {
      const cur = Number(currentTimeRef.current || 0);
      if (!Number.isFinite(cur) || cur <= 0) return;

      const prev = Number(lastWatchProgressRef.current || 0);
      const delta = Math.floor(cur - prev);
      if (delta <= 0) return;
      if (delta > 40) {
        // Likely a seek/jump; don't count as watch time
        lastWatchProgressRef.current = cur;
        return;
      }
      lastWatchProgressRef.current = cur;

      // Avoid sending if the video isn't loaded
      if (!isUuid(id)) return;
      void analyticsPing({ eventType: 'ping', videoId: id, path: `/watch/${id}`, watchSeconds: Math.min(30, Math.max(1, delta)) });
    }, 15000);

    return () => {
      if (watchPingTimerRef.current) clearInterval(watchPingTimerRef.current);
      watchPingTimerRef.current = null;
    };
  }, [id]);

  // Video Event Handlers
  const toggleLike = async () => {
    if (!id) return;
    if (!user) {
      const next = localToggleLike(id);
      setIsLiked(next);
      return;
    }

    if (!isUuid(id)) return;

    try {
      if (isLiked) {
        await meUnlike(id);
        setIsLiked(false);
      } else {
        await meLike(id);
        setIsLiked(true);
      }
    } catch {
      void 0;
    }
  };

  const toggleSaved = async () => {
    if (!id) return;
    if (!user) {
      const next = localToggleSaved(id);
      setIsSaved(next);
      return;
    }

    if (!isUuid(id)) return;

    try {
      if (isSaved) {
        await meUnsave(id);
        setIsSaved(false);
      } else {
        await meSave(id);
        setIsSaved(true);
      }
    } catch {
      void 0;
    }
  };

  const submitComment = async () => {
    if (!id) return;
    if (!user) return;
    if (!isUuid(id)) return;
    const text = commentText.trim();
    if (!text) return;

    const optimisticId = `optimistic_${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      user: (user as any).name || 'You',
      avatar: `https://picsum.photos/seed/${(user as any).id || 'me'}/50`,
      text,
      likes: 0,
      timestamp: 'just now',
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [optimistic, ...prev]);
    setCommentText('');
    setSubmittingComment(true);
    try {
      const created = await createComment(id, text);
      setComments((prev) =>
        prev.map((c) => (c.id === optimisticId ? { ...c, id: created.id, createdAt: created.createdAt } : c))
      );
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      setCommentText(text);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
    const diff = touchCurrentY.current - touchStartY.current;
    if (sheetRef.current && diff > 0) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!sheetRef.current) return;
    const diff = touchCurrentY.current - touchStartY.current;
    const threshold = 100;
    if (diff > threshold) {
      sheetRef.current.style.transition = "transform 0.3s ease-out";
      sheetRef.current.style.transform = "translateY(100%)";
      setTimeout(() => {
        setShowMobileComments(false);
        if (sheetRef.current) {
           sheetRef.current.style.transform = "";
           sheetRef.current.style.transition = "";
        }
      }, 300);
    } else {
      sheetRef.current.style.transition = "transform 0.2s ease-out";
      sheetRef.current.style.transform = "translateY(0)";
      setTimeout(() => {
         if (sheetRef.current) sheetRef.current.style.transition = "";
      }, 200);
    }
    touchStartY.current = 0;
    touchCurrentY.current = 0;
  };

  if (loading)
    return (
      <div className="flex flex-col lg:flex-row gap-6 px-0 sm:px-4 py-0 sm:py-6 max-w-[1800px] mx-auto animate-pulse">
        <div className="w-full lg:flex-1 min-w-0">
          <div className="w-full aspect-video bg-yt-gray sm:rounded-xl" />
          <div className="px-3 sm:px-0 mt-4 space-y-3">
            <div className="h-5 w-3/4 bg-yt-gray rounded" />
            <div className="h-4 w-1/2 bg-yt-gray rounded" />
            <div className="flex gap-2 mt-3">
              <div className="h-9 w-40 bg-yt-gray rounded-full" />
              <div className="h-9 w-28 bg-yt-gray rounded-full" />
              <div className="h-9 w-28 bg-yt-gray rounded-full" />
            </div>
            <div className="h-20 w-full bg-yt-gray rounded-xl" />
          </div>
          <div className="hidden lg:block mt-6 px-3 sm:px-0">
            <div className="h-6 w-40 bg-yt-gray rounded mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-yt-gray" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-yt-gray rounded" />
                    <div className="h-4 w-full bg-yt-gray rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[400px] lg:flex-none flex flex-col gap-4 relative px-3 sm:px-0 pb-12">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-40 aspect-video rounded-lg bg-yt-gray flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full bg-yt-gray rounded" />
                  <div className="h-4 w-2/3 bg-yt-gray rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  if (!video) return <div className="p-10 text-center">Video not found</div>;

  const playerSrc = video.streamUrl || video.videoUrl || '';

  return (
    <div className="flex flex-col lg:flex-row gap-6 px-0 sm:px-4 py-0 sm:py-6 max-w-[1800px] mx-auto">
      {/* Primary Column */}
      <div className="w-full lg:flex-1 min-w-0">
        {playerSrc ? (
          <SmartVideoPlayer
            src={playerSrc}
            poster={video.thumbnail}
            videoId={id}
            autoPlay={autoPlayRequested || autoPlayEnabled}
            initialTimeSeconds={initialSeekSeconds}
            onTimeUpdate={(t) => {
              setCurrentTime(t);
              currentTimeRef.current = t;
            }}
            onDuration={(d) => setDuration(d)}
          />
        ) : (
          <div className="w-full aspect-video bg-black sm:rounded-xl overflow-hidden shadow-lg flex items-center justify-center">
            <div className="text-sm text-yt-textSec">No stream available for this video.</div>
          </div>
        )}

        {/* Info Area */}
        <div className="px-3 sm:px-0">
          <h1 className="text-lg sm:text-xl font-bold text-white mt-3 sm:mt-4 line-clamp-2">{video.title}</h1>
          <div className="text-xs text-gray-400 mt-1 sm:hidden">
            {video.views} • {video.postedAt}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-3 sm:mt-3">
            <div className="flex items-center bg-yt-gray rounded-full h-8 sm:h-9 shrink-0">
              <button className="flex items-center gap-2 px-3 sm:px-4 border-r border-[#3f3f3f] hover:bg-[#3f3f3f] rounded-l-full h-full text-xs sm:text-sm font-medium">
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void toggleLike();
                  }}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-white text-white' : ''}`} />
                  {isLiked ? 'Liked' : 'Like'}
                </span>
              </button>
              <button className="px-3 hover:bg-[#3f3f3f] rounded-r-full h-full">
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>

            <button
              className="flex items-center gap-2 bg-yt-gray hover:bg-[#3f3f3f] px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void toggleSaved();
              }}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white text-white' : ''}`} /> {isSaved ? 'Saved' : 'Watch later'}
            </button>

            <button className="flex items-center gap-2 bg-yt-gray hover:bg-[#3f3f3f] px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium shrink-0">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>

          <div
            className="mt-4 bg-yt-gray rounded-xl p-3 text-sm text-white cursor-pointer hover:bg-[#3f3f3f] transition-colors"
            onClick={() => setDescriptionExpanded(!descriptionExpanded)}
          >
            <div className="font-bold mb-1 hidden sm:block">
              {video.views} • {video.postedAt}
            </div>
            <p className={`whitespace-pre-line text-gray-200 text-xs sm:text-sm ${descriptionExpanded ? '' : 'line-clamp-2'}`}>
              {video.description}
            </p>
            {!descriptionExpanded && <span className="text-gray-400 font-bold text-xs mt-1 block">...more</span>}
          </div>

          <div className="lg:hidden mt-4 bg-yt-gray rounded-xl p-3 cursor-pointer active:bg-[#3f3f3f]" onClick={() => setShowMobileComments(true)}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">
                Comments <span className="text-gray-400 font-normal">124</span>
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            {comments.length > 0 && (
              <div className="flex gap-2 items-center">
                <img src={comments[0].avatar || 'https://picsum.photos/seed/user/100/100'} className="w-6 h-6 rounded-full" />
                <p className="text-xs text-gray-300 line-clamp-1">{comments[0].text}</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Comments Section */}
        <div className="hidden lg:block mt-6">
          <div className="flex items-center gap-8 mb-6">
            <h3 className="text-xl font-bold">Comments</h3>
            <span className="text-gray-400">Sort by</span>
          </div>
          <div className="flex gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-lg font-bold">Y</div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Add a comment..."
                className="w-full bg-transparent border-b border-gray-700 focus:border-white outline-none pb-1 transition-colors text-sm"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={!user}
              />
              <div className="flex justify-end gap-3 mt-2">
                <button className="text-sm font-medium hover:bg-yt-gray px-3 py-1.5 rounded-full">Cancel</button>
                <button
                  className="text-sm font-medium bg-blue-600 text-black px-3 py-1.5 rounded-full hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500"
                  disabled={!user || submittingComment || commentText.trim().length === 0}
                  onClick={(e) => {
                    e.preventDefault();
                    void submitComment();
                  }}
                >
                  {user ? (submittingComment ? 'Posting...' : 'Comment') : 'Login to comment'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-4">
                <img src={comment.avatar} className="w-10 h-10 rounded-full" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{comment.user}</span>
                    <span className="text-xs text-gray-400">{comment.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-200 mb-2">{comment.text}</p>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5" /> <span className="text-xs text-gray-400">{comment.likes}</span>
                    </button>
                    <button>
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button className="text-xs font-medium hover:bg-yt-gray px-2 py-1 rounded-full">Reply</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Column */}
      <div className="w-full lg:w-[400px] lg:flex-none flex flex-col gap-4 relative px-3 sm:px-0 pb-12">
        <div className="space-y-3">
          {(related.length > 0 ? related : MOCK_VIDEOS.slice(0, 15)).slice(0, 15).map((v) => (
            <Link to={`/watch/${v.id}`} key={v.id} className="flex gap-2 cursor-pointer group">
              <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-yt-gray flex-shrink-0">
                <img src={v.thumbnail} className="w-full h-full object-cover" />
                <div className="absolute bottom-1 right-1 bg-black/80 px-1 text-[10px] font-medium rounded text-white">{v.duration}</div>
              </div>
              <div className="flex flex-col">
                <h4 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-blue-400">{v.title}</h4>
                <div className="text-xs text-yt-textSec mt-1">
                  {v.views} • {v.postedAt}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile Comments Sheet */}
      {showMobileComments && (
        <div className="fixed inset-0 z-[70] lg:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileComments(false)} />
          <div ref={sheetRef} className="bg-[#1e1e1e] w-full h-[75vh] rounded-t-2xl z-10 flex flex-col animate-in slide-in-from-bottom duration-200">
            <div
              className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <h3 className="font-bold text-lg">Comments</h3>
              <button onClick={() => setShowMobileComments(false)} className="p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <img src={comment.avatar} className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-300">{comment.user}</span>
                      <span className="text-[10px] text-gray-500">{comment.timestamp}</span>
                    </div>
                    <p className="text-sm text-white mb-1.5">{comment.text}</p>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-gray-400" />{' '}
                        <span className="text-xs text-gray-400">{comment.likes}</span>
                      </button>
                      <button>
                        <ThumbsDown className="w-3 h-3 text-gray-400" />
                      </button>
                      <button className="text-xs font-medium text-gray-400">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-white/10 bg-[#1e1e1e] pb-safe">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold shrink-0">Y</div>
                <input
                  type="text"
                  placeholder={user ? 'Add a comment...' : 'Login to comment'}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={!user || submittingComment}
                  className="flex-1 bg-yt-gray rounded-full px-3 py-2 text-sm outline-none placeholder-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitComment();
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};