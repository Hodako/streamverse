import React from 'react';
import { Link } from 'react-router-dom';
import { Video } from '../types';
import { MoreVertical } from 'lucide-react';

interface VideoCardProps {
  video: Video;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  return (
    <Link 
      to={`/watch/${video.id}`}
      className="flex flex-col gap-2 cursor-pointer group"
    >
      <div className="relative w-full aspect-video rounded-lg sm:rounded-xl overflow-hidden bg-yt-gray">
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
        <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-black/80 px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded text-white">
          {video.duration}
        </div>
      </div>
      <div className="flex gap-2 pr-0 sm:pr-4">
        {/* No Avatar or Channel Name as requested */}
        <div className="flex flex-col overflow-hidden flex-1">
          <div className="flex justify-between items-start">
             <h3 className="font-semibold text-white text-[13px] sm:text-base leading-tight line-clamp-2 group-hover:text-blue-400 transition-colors">
               {video.title}
             </h3>
             <button className="sm:hidden p-0 text-white flex-shrink-0 ml-1" onClick={(e) => e.preventDefault()}>
               <MoreVertical className="w-4 h-4 text-white" />
             </button>
          </div>
          <div className="text-yt-textSec text-[11px] sm:text-sm mt-1">
             {video.views} • {video.postedAt}
          </div>
        </div>
        <div className="ml-auto hidden sm:block">
          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-yt-gray rounded-full transition-all" onClick={(e) => e.preventDefault()}>
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </Link>
  );
};