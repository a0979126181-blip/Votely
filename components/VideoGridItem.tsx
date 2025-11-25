import React from 'react';
import { Play, Heart, EyeOff, Trash2 } from 'lucide-react';
import { Video } from '../types';

interface VideoGridItemProps {
  video: Video;
  onClick: (video: Video) => void;
  isVoted?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  onToggleHide?: (video: Video) => void;
  onDelete?: (video: Video) => void;
}

export const VideoGridItem: React.FC<VideoGridItemProps> = ({
  video,
  onClick,
  isVoted,
  currentUserId,
  isAdmin = false,
  onToggleHide,
  onDelete
}) => {
  // Only admin can hide videos directly (users use delete which soft-deletes)
  const canHide = onToggleHide && isAdmin;
  const canDelete = onDelete && isAdmin;

  const handleToggleHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleHide) {
      onToggleHide(video);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(video);
    }
  };

  return (
    <div
      className="group relative break-inside-avoid cursor-pointer bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
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
        <div className="flex items-start justify-between w-full">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {isVoted && (
              <div className="bg-red-500 text-white p-2 rounded-full shadow-md">
                <Heart size={16} fill="white" />
              </div>
            )}
            {canHide && (
              <button
                onClick={handleToggleHide}
                className="bg-white/90 hover:bg-yellow-500 text-gray-700 hover:text-white p-2 rounded-full shadow-md transition-all duration-200 backdrop-blur-sm"
                title="隱藏影片"
              >
                <EyeOff size={16} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="bg-white/90 hover:bg-red-600 text-gray-700 hover:text-white p-2 rounded-full shadow-md transition-all duration-200 backdrop-blur-sm"
                title="刪除影片"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-white">
          <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
            <Play size={20} fill="currentColor" />
          </div>
          <span className="font-medium drop-shadow-md line-clamp-1">{video.title}</span>
        </div>
      </div>

      {/* Mobile: Buttons always visible if user has permission */}
      <div className="sm:hidden absolute top-2 right-2 flex gap-2 z-10">
        {canHide && (
          <button
            onClick={handleToggleHide}
            className="bg-white/90 hover:bg-yellow-500 text-gray-700 hover:text-white p-2 rounded-full shadow-md transition-all duration-200 backdrop-blur-sm"
            title="隱藏影片"
          >
            <EyeOff size={14} />
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            className="bg-white/90 hover:bg-red-600 text-gray-700 hover:text-white p-2 rounded-full shadow-md transition-all duration-200 backdrop-blur-sm"
            title="刪除影片"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Mobile Title (Always visible on mobile/tablet if hover is tricky) */}
      <div className="sm:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <p className="text-white text-xs font-medium truncate">{video.title}</p>
      </div>
    </div>
  );
};
