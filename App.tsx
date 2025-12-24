import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { VideoCard } from './components/VideoCard';
import { WatchPage } from './components/WatchPage';
import { Video } from './types';
import { GridSkeleton } from './components/Skeletons';
import { adminGetSettings, analyticsPing, getCategories, listVideos } from './lib/api';
import { setCachedSiteSettings } from './lib/siteSettings';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage'));
const WatchLaterPage = React.lazy(() => import('./pages/WatchLaterPage'));
const LikedVideosPage = React.lazy(() => import('./pages/LikedVideosPage'));
const ShortsPage = React.lazy(() => import('./pages/ShortsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const HelpPage = React.lazy(() => import('./pages/HelpPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const ExplorePage = React.lazy(() => import('./pages/ExplorePage'));
const ChannelPage = React.lazy(() => import('./pages/ChannelPage'));
const BlogsPage = React.lazy(() => import('./pages/BlogsPage'));
const BlogPage = React.lazy(() => import('./pages/BlogPage'));

// ScrollToTop Helper
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  // Desktop: true = expanded, false = slim
  // Mobile: true = open (overlay), false = closed
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const VIDEOS_PER_PAGE = 20;
  const location = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(location.pathname);
  const pipWasActiveRef = useRef<boolean>(false);
  const pipVideoElRef = useRef<HTMLVideoElement | null>(null);

  const isWatchPage = location.pathname.startsWith('/watch');
  const isShortsPage = location.pathname.startsWith('/shorts');
  const isAdminPage = location.pathname.startsWith('/adminpageofthesiteforthesite');
  const isAuthPage = location.pathname.startsWith('/login') || location.pathname.startsWith('/signup');
  const hideChrome = isWatchPage || isAdminPage || isShortsPage;

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    // Load site settings on app init
    const loadSettings = async () => {
      try {
        const settings = await adminGetSettings();
        setCachedSiteSettings({
          siteName: settings.siteName,
          logoUrl: settings.logoUrl,
          siteDescription: settings.siteDescription,
          contactEmail: settings.contactEmail,
          faviconUrl: settings.faviconUrl || '',
          pageTitle: settings.pageTitle || 'StreamTube',
          metaTitle: settings.metaTitle || 'StreamTube',
          metaDescription: settings.metaDescription || 'Watch videos online',
        });
        window.dispatchEvent(new CustomEvent('siteSettingsUpdated'));
      } catch {
        // Settings not available (not logged in as admin or error)
      }
    };
    void loadSettings();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await analyticsPing({ eventType: 'pageview', path: location.pathname });
      } catch {
        void 0;
      }
    })();
  }, [location.pathname]);

  useEffect(() => {
    const t = setInterval(() => {
      void (async () => {
        try {
          await analyticsPing({ eventType: 'ping', path: pathnameRef.current });
        } catch {
          void 0;
        }
      })();
    }, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    pipWasActiveRef.current = Boolean((document as any).pictureInPictureElement);
    const t = setInterval(() => {
      const pipEl = (document as any).pictureInPictureElement as HTMLVideoElement | null;
      const isActive = Boolean(pipEl);
      const wasActive = pipWasActiveRef.current;
      pipWasActiveRef.current = isActive;

      if (isActive && pipEl) pipVideoElRef.current = pipEl;

      if (wasActive && !isActive) {
        const el = pipVideoElRef.current;
        if (el) {
          try {
            const ct = Number(el.currentTime || 0);
            if (Number.isFinite(ct) && ct > 0) {
              let pipId: string | null = null;
              try {
                pipId = sessionStorage.getItem('streamtube_pip_video_id');
              } catch {
                pipId = null;
              }
              if (pipId) {
                try {
                  sessionStorage.setItem(`streamtube_resume_time_${pipId}`, String(ct));
                } catch {
                  void 0;
                }
              }
            }
            el.pause();
          } catch {
            void 0;
          }
        }
        pipVideoElRef.current = null;
      }

      if (wasActive && !isActive) {
        let pipId: string | null = null;
        try {
          pipId = sessionStorage.getItem('streamtube_pip_video_id');
        } catch {
          pipId = null;
        }

        if (pipId) {
          const onSameWatch = pathnameRef.current.startsWith(`/watch/${pipId}`);
          if (!onSameWatch) {
            try {
              sessionStorage.setItem('streamtube_autoplay_video_id', pipId);
            } catch {
              void 0;
            }
            navigate(`/watch/${pipId}`);
            return;
          }

          try {
            sessionStorage.removeItem('streamtube_pip_video_id');
          } catch {
            void 0;
          }
        }
      }

      if (!isActive) {
        let pipId: string | null = null;
        try {
          pipId = sessionStorage.getItem('streamtube_pip_video_id');
        } catch {
          pipId = null;
        }
        if (pipId && pathnameRef.current.startsWith(`/watch/${pipId}`)) {
          try {
            sessionStorage.removeItem('streamtube_pip_video_id');
          } catch {
            void 0;
          }
        }
      }
    }, 500);

    return () => clearInterval(t);
  }, [navigate]);

  // Initial Responsive State
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false); // Closed on Mobile initially
      } else if (window.innerWidth < 1280) {
        setIsSidebarOpen(false); // Slim on Tablet/Small Desktop
      } else {
        setIsSidebarOpen(true); // Expanded on Large Desktop
      }
    };
    
    // Set initial state
    handleResize();
    
    // Add listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-collapse logic for specific pages on Desktop
  useEffect(() => {
    if (window.innerWidth >= 768) {
      if (isWatchPage) {
        setIsSidebarOpen(false); // Always slim on watch page
      } 
    }
  }, [isWatchPage]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebarMobile = () => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cats = await getCategories();
        if (cancelled) return;
        setCategoryOptions(cats.categories);
      } catch {
        if (cancelled) return;
        setCategoryOptions([]);
      }

      setLoadingVideos(true);
      try {
        const res = await listVideos({ limit: VIDEOS_PER_PAGE, offset: 0 });
        if (cancelled) return;
        const items = (res.videos || []) as Video[];
        setVideos(items);
        setCurrentOffset(VIDEOS_PER_PAGE);
        setHasMore(items.length === VIDEOS_PER_PAGE);
      } catch {
        if (cancelled) return;
        setVideos([]);
        setHasMore(false);
      } finally {
        if (!cancelled) setLoadingVideos(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMoreVideos = async () => {
    if (loadingVideos || !hasMore) return;

    setLoadingVideos(true);
    try {
      const res = await listVideos({
        limit: VIDEOS_PER_PAGE,
        offset: currentOffset,
        categoryId: activeCategoryId || undefined,
      });
      const items = (res.videos || []) as Video[];
      setVideos(prev => [...prev, ...items]);
      setCurrentOffset(prev => prev + VIDEOS_PER_PAGE);
      setHasMore(items.length === VIDEOS_PER_PAGE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (location.pathname !== '/') return;
      
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !loadingVideos) {
        void loadMoreVideos();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentOffset, hasMore, loadingVideos, location.pathname, activeCategoryId]);

  const handleSearch = (term: string) => {
    const run = async () => {
      setActiveCategory('All');
      setActiveCategoryId(null);
      setCurrentOffset(0);
      if (!term) {
        try {
          setLoadingVideos(true);
          const res = await listVideos({ limit: VIDEOS_PER_PAGE, offset: 0 });
          const items = (res.videos || []) as Video[];
          setVideos(items);
          setCurrentOffset(VIDEOS_PER_PAGE);
          setHasMore(items.length === VIDEOS_PER_PAGE);
        } catch {
          setVideos([]);
          setHasMore(false);
        } finally {
          setLoadingVideos(false);
        }
        navigate('/');
        return;
      }

      try {
        setLoadingVideos(true);
        const res = await listVideos({ q: term, limit: VIDEOS_PER_PAGE, offset: 0 });
        const items = (res.videos || []) as Video[];
        setVideos(items);
        setCurrentOffset(VIDEOS_PER_PAGE);
        setHasMore(items.length === VIDEOS_PER_PAGE);
      } catch {
        setVideos([]);
        setHasMore(false);
      } finally {
        setLoadingVideos(false);
      }
      navigate('/');
    };

    void run();
  };

  const handleCategoryClick = (cat: string, catId: string | null) => {
    setActiveCategory(cat);
    setActiveCategoryId(catId);
    setCurrentOffset(0);

    const run = async () => {
      setLoadingVideos(true);
      try {
        const res = await listVideos({
          categoryId: catId || undefined,
          limit: VIDEOS_PER_PAGE,
          offset: 0
        });
        const items = (res.videos || []) as Video[];
        setVideos(items);
        setCurrentOffset(VIDEOS_PER_PAGE);
        setHasMore(items.length === VIDEOS_PER_PAGE);
      } catch {
        setVideos([]);
        setHasMore(false);
      } finally {
        setLoadingVideos(false);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    void run();
  };

  // Calculate main margin based on sidebar state (Desktop Only)
  // Mobile uses overlay so margin is always 0
  const getMainMargin = () => {
    if (isWatchPage) return 'ml-0'; // Watch page takes full width usually, or handled internally
    
    // Using tailwind classes logic here for dynamic calculation
    // Mobile (< md): ml-0
    // Desktop (>= md): if Open 220px, else 72px
    return isSidebarOpen ? 'md:ml-[220px]' : 'md:ml-[72px]';
  };

  return (
    <div className="min-h-screen bg-yt-black text-white font-sans pb-12 md:pb-0 selection:bg-red-600/30">
      <ScrollToTop />
      <Navbar 
        toggleSidebar={toggleSidebar} 
        onSearch={handleSearch}
      />
      
      {/* Sidebar handles both Desktop (Persistent) and Mobile (Overlay) */}
      {!hideChrome && (
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebarMobile} />
      )}
      
      <div className="flex pt-14">
        {/* Main Content Area */}
        <main 
          className={`flex-1 min-h-[calc(100vh-56px)] transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] w-full ml-0 ${!isWatchPage && !isShortsPage ? getMainMargin() : ''}`}
        >
          <Routes>
            <Route path="/" element={
               <div className="p-0 sm:p-4 md:p-6">
                  {/* Categories - Sticky */}
                  <div className="sticky top-14 z-30 bg-yt-black/95 backdrop-blur-sm -mt-0 pt-3 pb-3 px-3 sm:px-0 border-b border-white/5 sm:border-none mb-4">
                    <div className="flex gap-3 overflow-x-auto no-scrollbar">
                      {(['All', ...categoryOptions.map((c) => c.name)] as string[]).map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            if (cat === 'All') return handleCategoryClick('All', null);
                            const found = categoryOptions.find((c) => c.name === cat);
                            return handleCategoryClick(cat, found ? found.id : null);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                            activeCategory === cat 
                              ? 'bg-white text-black' 
                              : 'bg-[#272727] text-white hover:bg-[#3f3f3f]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid */}
                  {loadingVideos ? (
                    <GridSkeleton count={15} />
                  ) : videos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 gap-y-6 sm:gap-y-8 sm:gap-x-4 px-2 sm:px-0">
                      {videos.map(video => (
                         <VideoCard key={video.id} video={video} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                      <p className="text-xl">No videos found</p>
                      <p className="text-sm">Try searching for something else</p>
                      <button onClick={() => handleCategoryClick('All', null)} className="mt-4 text-blue-400 hover:underline">Clear filters</button>
                    </div>
                  )}
               </div>
            } />

            <Route
              path="/explore"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <ExplorePage />
                </Suspense>
              }
            />


            <Route
              path="/channel"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <ChannelPage />
                </Suspense>
              }
            />
            <Route
              path="/shorts"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <ShortsPage />
                </Suspense>
              }
            />
            
            <Route path="/watch/:id" element={<WatchPage />} />

            <Route
              path="/history"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <HistoryPage />
                </Suspense>
              }
            />
            <Route
              path="/watch-later"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <WatchLaterPage />
                </Suspense>
              }
            />
            <Route
              path="/liked"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <LikedVideosPage />
                </Suspense>
              }
            />

            <Route
              path="/login"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <LoginPage />
                </Suspense>
              }
            />
            <Route
              path="/signup"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <SignupPage />
                </Suspense>
              }
            />
            <Route
              path="/profile"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <ProfilePage />
                </Suspense>
              }
            />
            <Route
              path="/adminpageofthesiteforthesite"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <AdminPage />
                </Suspense>
              }
            />

            <Route
              path="/settings"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <SettingsPage />
                </Suspense>
              }
            />

            <Route
              path="/help"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <HelpPage />
                </Suspense>
              }
            />

            <Route
              path="/blogs"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <BlogsPage />
                </Suspense>
              }
            />

            <Route
              path="/blog/:slug"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <BlogPage />
                </Suspense>
              }
            />

            <Route
              path="*"
              element={
                <Suspense fallback={<div className="p-6 text-yt-textSec">Loading...</div>}>
                  <NotFoundPage />
                </Suspense>
              }
            />
          </Routes>
        </main>
      </div>

      {/* Bottom Nav for Mobile - Only show on Home */}
      {!hideChrome && !isAuthPage && <BottomNav />}
    </div>
  );
}

export default App;