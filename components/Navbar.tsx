import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ArrowLeft, Clock, ArrowUpLeft, X, Search as SearchIcon } from 'lucide-react';
import { TITLES, CHANNELS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getCachedSiteSettings } from '../lib/siteSettings';

interface NavbarProps {
  toggleSidebar: () => void;
  onSearch: (term: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ toggleSidebar, onSearch }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [siteSettings, setSiteSettings] = useState(getCachedSiteSettings());

  const avatarLetter = (user?.name?.trim()?.[0] || 'G').toUpperCase();

  // Mock search history
  const searchHistory = [
    "react 19 tutorial",
    "lofi hip hop radio",
    "mrbeast squid game",
    "nextjs 15 crash course",
    "elden ring dlc",
    "skibidi toilet"
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    const handleSettingsUpdate = () => {
      setSiteSettings(getCachedSiteSettings());
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('siteSettingsUpdated', handleSettingsUpdate);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('siteSettingsUpdated', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.length > 1) {
      const lowerTerm = searchTerm.toLowerCase();
      const matchedTitles = TITLES.filter(t => t.toLowerCase().includes(lowerTerm)).slice(0, 5);
      const matchedChannels = CHANNELS.filter(c => c.toLowerCase().includes(lowerTerm)).slice(0, 3);
      setSuggestions([...matchedChannels, ...matchedTitles]);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
    setShowMobileSearch(false);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (term: string) => {
    setSearchTerm(term);
    onSearch(term);
    setShowMobileSearch(false);
    setShowSuggestions(false);
  };

  const handleHistoryClick = (term: string) => {
    setSearchTerm(term);
    onSearch(term);
    setShowMobileSearch(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-14 bg-yt-black flex items-center justify-between px-4 z-50 border-b border-yt-gray/50 backdrop-blur-sm bg-yt-black/95">
        
        {/* Left Section */}
        <div className="flex items-center gap-4 w-1/4">
          <button 
            onClick={toggleSidebar}
            className="p-2 hover:bg-yt-gray rounded-full transition-colors active:scale-95 transform"
          >
            <Menu className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
          <Link to="/" className="flex items-center gap-1 cursor-pointer select-none" onClick={() => onSearch('')}>
            {siteSettings?.logoUrl ? (
              <img src={siteSettings.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" />
            ) : (
              <div className="w-8 h-6 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
                <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[6px] border-l-white border-b-[3px] border-b-transparent ml-0.5"></div>
              </div>
            )}
            <span className="text-xl font-bold tracking-tighter text-white font-sans hidden xs:block">
              {siteSettings?.siteName || 'StreamTube'}
            </span>
          </Link>
        </div>

        {/* Center Section: Search */}
        <div className="hidden md:flex flex-1 justify-center max-w-[600px]" ref={searchRef}>
          <form onSubmit={handleSubmit} className="w-full flex items-center relative z-20">
            
            <div className="flex flex-1 items-center relative">
               <div className={`flex flex-1 items-center bg-[#121212] border border-[#303030] ${showSuggestions ? 'rounded-tl-2xl rounded-tr-2xl border-b-0' : 'rounded-l-full'} border-r-0 h-10 px-1 ml-0 focus-within:border-blue-500 overflow-hidden shadow-inner w-full`}>
                 <div className="pl-3 hidden sm:block">
                   <Search className="w-4 h-4 text-gray-500" />
                 </div>
                 <input 
                   type="text" 
                   placeholder="Search" 
                   className="w-full bg-transparent text-white px-3 py-2 outline-none placeholder-gray-500 font-normal text-sm"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   onFocus={() => { if(searchTerm.length > 1) setShowSuggestions(true) }}
                 />
                 {searchTerm && (
                   <button type="button" onClick={() => { setSearchTerm(''); setShowSuggestions(false); }} className="p-2 hover:bg-gray-800 rounded-full">
                     <X className="w-4 h-4 text-gray-300" />
                   </button>
                 )}
               </div>

               {/* Suggestions Dropdown tied to input width */}
               {showSuggestions && suggestions.length > 0 && (
                 <div className="absolute top-10 left-0 right-0 bg-[#121212] border border-t-0 border-[#303030] rounded-bl-2xl rounded-br-2xl shadow-xl z-50 py-2">
                    {suggestions.map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[#303030] cursor-pointer"
                        onClick={() => handleSuggestionClick(item)}
                      >
                         <SearchIcon className="w-4 h-4 text-gray-400" />
                         <span className="text-sm font-medium text-white">{item}</span>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            <button 
              type="submit"
              className="bg-[#222] border border-[#303030] px-5 h-10 rounded-r-full hover:bg-[#303030] transition-colors flex items-center justify-center flex-shrink-0"
            >
              <Search className="w-5 h-5 text-gray-400" />
            </button>
            
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center justify-end gap-2 w-1/4">
           <button className="md:hidden p-2 hover:bg-yt-gray rounded-full" onClick={() => setShowMobileSearch(true)}>
             <Search className="w-6 h-6 text-white" strokeWidth={1.5} />
           </button>
           <button className="p-2 hover:bg-yt-gray rounded-full transition-colors relative hidden sm:block">
             <Bell className="w-6 h-6 text-white" strokeWidth={1.5} />
             <span className="absolute top-1.5 right-1.5 bg-red-600 w-2 h-2 rounded-full border border-yt-black"></span>
           </button>
           <Link to="/profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold cursor-pointer ml-1 select-none text-sm shadow-lg hover:scale-105 transition-transform">
             {avatarLetter}
           </Link>
        </div>
      </nav>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 bg-yt-black z-[60] flex flex-col md:hidden animate-in slide-in-from-right duration-200">
          <div className="flex items-center gap-2 p-2 border-b border-yt-gray/30 h-14">
             <button onClick={() => setShowMobileSearch(false)} className="p-2 active:bg-yt-gray rounded-full">
               <ArrowLeft className="w-6 h-6 text-white" />
             </button>
             <form onSubmit={handleSubmit} className="flex-1 flex items-center bg-[#222] rounded-full px-3 py-1.5 h-9">
               <input 
                 type="text" 
                 placeholder="Search..." 
                 className="flex-1 bg-transparent text-white outline-none text-sm placeholder-gray-500"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 autoFocus
               />
               {searchTerm && (
                 <button type="button" onClick={() => setSearchTerm('')} className="p-1">
                   <X className="w-4 h-4 text-gray-400" />
                 </button>
               )}
             </form>
          </div>
          <div className="flex-1 overflow-y-auto bg-yt-black">
             {suggestions.length > 0 && searchTerm.length > 1 ? (
               suggestions.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-4 px-4 py-3 active:bg-yt-gray/30 cursor-pointer border-b border-yt-gray/10"
                  onClick={() => handleSuggestionClick(item)}
                >
                   <SearchIcon className="text-gray-400 w-4 h-4 flex-shrink-0" />
                   <span className="flex-1 font-medium text-white text-sm truncate">{item}</span>
                   <ArrowUpLeft className="text-gray-500 w-4 h-4 -rotate-45 flex-shrink-0" /> 
                </div>
               ))
             ) : (
                searchHistory.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase())).map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-4 px-4 py-3 active:bg-yt-gray/30 cursor-pointer border-b border-yt-gray/10"
                    onClick={() => handleHistoryClick(item)}
                  >
                     <Clock className="text-gray-400 w-4 h-4 flex-shrink-0" />
                     <span className="flex-1 font-medium text-white text-sm truncate">{item}</span>
                     <ArrowUpLeft className="text-gray-500 w-4 h-4 -rotate-45 flex-shrink-0" /> 
                  </div>
                ))
             )}
          </div>
        </div>
      )}
    </>
  );
};