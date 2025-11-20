import React from 'react';
import { Play, Heart } from 'lucide-react';
import { Video } from '../types';

interface VideoGridItemProps {
  video: Video;
  onClick: (video: Video) => void;
  isVoted?: boolean;
}

export const VideoGridItem: React.FC<VideoGridItemProps> = ({ video, onClick, isVoted }) => {
  return (
    <div 
      className="relative mb-4 break-inside-avoid rounded-xl overflow-hidden cursor-zoom-in group bg-gray-100"
      onClick={() => onClick(video)}
    >
      {/* Image/Thumbnail */}
      <img 
        src={video.thumbnailUrl} 
        alt={video.title} 
        className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />

      {/* Hover Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="self-end">
          {isVoted && (
             <div className="bg-red-500 text-white p-2 rounded-full shadow-md">
               <Heart size={16} fill="white" />
             </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-white">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                <Play size={20} fill="currentColor" />
            </div>
            <span className="font-medium drop-shadow-md line-clamp-1">{video.title}</span>
        </div>
      </div>
      
      {/* Mobile Title (Always visible on mobile/tablet if hover is tricky) */}
      <div className="sm:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
         <p className="text-white text-xs font-medium truncate">{video.title}</p>
      </div>
    </div>
  );
};
