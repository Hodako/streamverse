import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, PlaySquare, Clock, ThumbsUp, User, Film, Flame, Gamepad2, Music2, Trophy, Settings, HelpCircle, Flag, ChevronRight } from 'lucide-react';
import { getCachedSiteSettings } from '../lib/siteSettings';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidebarRow = ({ Icon, title, active = false, to, compact = false, onClick }: { Icon: any, title: string, active?: boolean, to?: string, compact?: boolean, onClick?: () => void }) => {
  const content = (
    <div 
      className={`flex items-center gap-4 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group
      ${active ? 'bg-white/10' : 'hover:bg-white/5'}
      ${compact ? 'justify-center flex-col gap-1 px-0 py-4' : ''}
      `}
      onClick={onClick}
    >
      <Icon 
        className={`transition-colors duration-200
        ${compact ? 'w-6 h-6 mb-1' : 'w-5 h-5'} 
        ${active ? 'text-white fill-current' : 'text-yt-textSec group-hover:text-white'}`} 
        strokeWidth={active ? 2.5 : 1.5} 
        fill={active ? 'currentColor' : 'none'}
      />
      <span 
        className={`text-sm tracking-wide truncate transition-colors duration-200
        ${compact ? 'text-[10px] font-normal' : 'font-medium'}
        ${active ? 'text-white' : 'text-gray-300 group-hover:text-white'}
        `}
      >
        {title}
      </span>
    </div>
  );
  
  return to ? <Link to={to} className="w-full block">{content}</Link> : <div className="w-full">{content}</div>;
};

const SectionDivider = () => <div className="h-px bg-white/10 my-2 mx-3" />;

const SectionTitle = ({ title }: { title: string }) => (
  <h3 className="px-4 py-2 text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between group cursor-pointer hover:text-white transition-colors">
    {title}
    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
  </h3>
);

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const siteSettings = getCachedSiteSettings();

  // Mobile Overlay Drawer
  // Uses fixed positioning to slide over content
  const MobileDrawer = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 md:hidden
        ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 bottom-0 left-0 w-[280px] bg-[#0f0f0f] z-[70] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] md:hidden border-r border-white/5
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center h-14 pl-4 border-b border-white/5 mb-2">
           <div className="flex items-center gap-1">
            {siteSettings?.logoUrl ? (
              <img src={siteSettings.logoUrl} alt="Logo" className="w-8 h-6 object-contain rounded" />
            ) : (
              <div className="w-8 h-6 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
                <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[6px] border-l-white border-b-[3px] border-b-transparent ml-0.5"></div>
              </div>
            )}
            <span className="text-xl font-bold tracking-tighter text-white font-sans ml-1">
              {siteSettings?.siteName || 'StreamTube'}
            </span>
          </div>
        </div>
        
        <div className="overflow-y-auto h-[calc(100vh-56px)] pb-4 custom-scrollbar">
          <div className="px-2">
            <SidebarRow Icon={Home} title="Home" active={isHome} to="/" onClick={onClose} />
            <SidebarRow Icon={Film} title="Shorts" to="/shorts" onClick={onClose} />
            <SidebarRow Icon={Compass} title="Explore" to="/explore" onClick={onClose} />
          </div>
          <SectionDivider />
          <div className="px-2">
            <SectionTitle title="You" />
            <SidebarRow Icon={User} title="Your channel" to="/channel" onClick={onClose} />
            <SidebarRow Icon={Clock} title="History" to="/history" onClick={onClose} />
            <SidebarRow Icon={Clock} title="Watch later" to="/watch-later" onClick={onClose} />
            <SidebarRow Icon={ThumbsUp} title="Liked videos" to="/liked" onClick={onClose} />
          </div>
          <SectionDivider />
          <div className="px-2 pb-4">
            <SidebarRow Icon={Settings} title="Settings" to="/settings" onClick={onClose} />
            <SidebarRow Icon={HelpCircle} title="Help" to="/help" onClick={onClose} />
          </div>
          <div className="px-4 py-6 text-xs text-gray-500 font-medium">
             <p>StreamTube Lite © 2025</p>
          </div>
        </div>
      </div>
    </>
  );

  // Desktop Sidebar (Persistent)
  // Toggles between Slim (Icon only) and Expanded
  const DesktopSidebar = (
    <div 
      className={`hidden md:flex flex-col h-[calc(100vh-56px)] fixed left-0 top-14 bg-yt-black z-40 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] border-r border-white/5
      ${isOpen ? 'w-[220px]' : 'w-[72px]'}`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-2 hover:overflow-y-auto scrollbar-thin scrollbar-thumb-yt-gray">
        {isOpen ? (
          // Expanded Desktop
          <>
            <div className="px-2">
              <SidebarRow Icon={Home} title="Home" active={isHome} to="/" />
              <SidebarRow Icon={Film} title="Shorts" to="/shorts" />
              <SidebarRow Icon={Compass} title="Explore" to="/explore" />
            </div>
            <SectionDivider />
            <div className="px-2">
              <SectionTitle title="You" />
              <SidebarRow Icon={User} title="Your channel" to="/channel" />
              <SidebarRow Icon={Clock} title="History" to="/history" />
              <SidebarRow Icon={Clock} title="Watch later" to="/watch-later" />
              <SidebarRow Icon={ThumbsUp} title="Liked videos" to="/liked" />
            </div>
            <SectionDivider />
            <div className="px-2 pb-4">
              <SidebarRow Icon={Settings} title="Settings" to="/settings" />
              <SidebarRow Icon={HelpCircle} title="Help" to="/help" />
            </div>
          </>
        ) : (
          // Slim Desktop
          <div className="px-1">
             <SidebarRow Icon={Home} title="Home" active={isHome} to="/" compact />
             <SidebarRow Icon={Film} title="Shorts" to="/shorts" compact />
             <SidebarRow Icon={Compass} title="Explore" to="/explore" compact />
             <SidebarRow Icon={User} title="Profile" to="/profile" compact />
             <SidebarRow Icon={Clock} title="History" to="/history" compact />
             <SidebarRow Icon={Settings} title="Settings" to="/settings" compact />
             <SidebarRow Icon={HelpCircle} title="Help" to="/help" compact />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {MobileDrawer}
      {DesktopSidebar}
    </>
  );
};