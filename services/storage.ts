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
    videoUrl: v.videoPath // Use videoPath as videoUrl
  }));
};

export const saveVideo = async (video: Video, file: File): Promise<void> => {
  console.log('🚀 saveVideo called with file:', file.name, file.size, 'bytes');
  console.log('📝 API_URL:', API_URL);
  console.log('📦 Video data:', { title: video.title, uploaderId: video.uploaderId, uploaderName: video.uploaderName });

  const formData = new FormData();
  formData.append('video', file);
  formData.append('title', video.title);
  formData.append('description', video.description || '');
  formData.append('uploaderId', video.uploaderId);
  formData.append('uploaderName', video.uploaderName);
  formData.append('thumbnailUrl', video.thumbnailUrl);

  const url = `${API_URL}/api/videos`;
  console.log('📡 Sending POST to:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    console.log('📬 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', response.status, errorText);
      throw new Error(`Failed to upload video: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Upload successful:', result);
  } catch (error) {
    console.error('❌ Fetch error:', error);
    throw error;
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

  // Fetch updated votes
  return getStoredVotes();
};

export const removeVote = async (userId: string): Promise<VoteMap> => {
  const response = await fetch(`${API_URL}/api/votes/${userId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Failed to remove vote');
  }

  // Fetch updated votes
  return getStoredVotes();
};

// === User Session (still using localStorage) ===

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
