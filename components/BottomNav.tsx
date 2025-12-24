import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Film, Compass, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isExplore = location.pathname === '/explore';
  const isYou = location.pathname === '/you';

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-yt-black border-t border-yt-gray flex justify-around items-center z-50 md:hidden pb-safe px-2">
      <Link to="/" className="flex flex-col items-center justify-center gap-0.5 cursor-pointer w-full h-full hover:bg-white/5 active:bg-white/10">
        <Home className={`w-6 h-6 ${isHome ? 'fill-white text-white' : 'text-white'}`} strokeWidth={1.5} />
        <span className="text-[10px] text-white">Home</span>
      </Link>
      <Link to="/shorts" className="flex flex-col items-center justify-center gap-0.5 cursor-pointer w-full h-full hover:bg-white/5 active:bg-white/10">
        <Film className="w-6 h-6 text-white" strokeWidth={1.5} />
        <span className="text-[10px] text-white">Shorts</span>
      </Link>
      <Link to="/explore" className="flex flex-col items-center justify-center gap-0.5 cursor-pointer w-full h-full hover:bg-white/5 active:bg-white/10">
        <Compass className={`w-6 h-6 ${isExplore ? 'fill-white text-white' : 'text-white'}`} strokeWidth={1.5} />
        <span className="text-[10px] text-white">Explore</span>
      </Link>
      <Link to="/you" className="flex flex-col items-center justify-center gap-0.5 cursor-pointer w-full h-full hover:bg-white/5 active:bg-white/10">
        <User className={`w-6 h-6 ${isYou ? 'fill-white text-white' : 'text-white'}`} strokeWidth={1.5} />
        <span className="text-[10px] text-white">You</span>
      </Link>
    </div>
  );
};