import { Video, VoteMap, User } from '../types';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || '';

// === Video Operations ===

export const getStoredVideos = async (): Promise<Video[]> => {
  const response = await fetch(`${API_URL}/api/videos`);
  if (!response.ok) {
    throw new Error('Failed to fetch videos');
  }
  const videos = await response.json();
  return videos.map((v: any) => ({
    ...v,
    videoUrl: v.videoPath
  }));
};

export const saveVideo = async (video: Video, file: File): Promise<void> => {
  // Step 1: Get signed URL from backend
  const urlResponse = await fetch(
    `${API_URL}/api/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
  );

  if (!urlResponse.ok) {
    throw new Error('Failed to get upload URL');
  }

  const { url: signedUrl, filename: uniqueFilename } = await urlResponse.json();

  // Step 2: Upload directly to GCS using signed URL
  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload video to GCS');
  }

  // Step 3: Save video metadata to backend
  const metadataResponse = await fetch(`${API_URL}/api/videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: video.title,
      description: video.description,
      uploaderId: video.uploaderId,
      uploaderName: video.uploaderName,
      thumbnailUrl: video.thumbnailUrl,
      videoFilename: uniqueFilename,
    }),
  });

  if (!metadataResponse.ok) {
    throw new Error('Failed to save video metadata');
  }
};

export const toggleVideoVisibility = async (videoId: string, isHidden: boolean): Promise<void> => {
  const response = await fetch(`${API_URL}/api/videos/${videoId}/visibility`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ isHidden })
  });

  if (!response.ok) {
    throw new Error('Failed to toggle video visibility');
  }
};

export const deleteVideo = async (videoId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/videos/${videoId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Failed to delete video');
  }
};

// === Vote Operations ===

export const getStoredVotes = async (): Promise<VoteMap> => {
  const response = await fetch(`${API_URL}/api/votes`);
  if (!response.ok) {
    throw new Error('Failed to fetch votes');
  }
  return response.json();
};

export const castVote = async (userId: string, videoId: string, userEmail?: string): Promise<VoteMap> => {
  const response = await fetch(`${API_URL}/api/votes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, videoId, userEmail })
  });

  if (!response.ok) {
    throw new Error('Failed to cast vote');
  }

  return getStoredVotes();
};

export const removeVote = async (userId: string): Promise<VoteMap> => {
  const response = await fetch(`${API_URL}/api/votes/${userId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Failed to remove vote');
  }

  return getStoredVotes();
};

// === User Session ===

const KEY_USER = 'votely_user';

export const getStoredUser = (): User | null => {
  const stored = localStorage.getItem(KEY_USER);
  return stored ? JSON.parse(stored) : null;
};

export const saveStoredUser = (user: User): void => {
  localStorage.setItem(KEY_USER, JSON.stringify(user));
};

export const clearStoredUser = (): void => {
  localStorage.removeItem(KEY_USER);
};
