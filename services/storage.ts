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

  try {
    // 1. Get Upload URL
    console.log('🔗 Requesting upload URL...');
    const uploadUrlRes = await fetch(`${API_URL}/api/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`);

    if (!uploadUrlRes.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { url: signedUrl, filename: uniqueFilename } = await uploadUrlRes.json();
    console.log('✅ Got signed URL for:', uniqueFilename);

    // 2. Upload to GCS
    console.log('☁️ Uploading directly to GCS...');
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload to GCS: ${uploadRes.status}`);
    }
    console.log('✅ GCS upload complete');

    // 3. Save metadata
    console.log('💾 Saving metadata to backend...');
    const response = await fetch(`${API_URL}/api/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: video.title,
        description: video.description || '',
        uploaderId: video.uploaderId,
        uploaderName: video.uploaderName,
        thumbnailUrl: video.thumbnailUrl,
        videoFilename: uniqueFilename
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save video metadata: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Video saved successfully:', result);

  } catch (error) {
    console.error('❌ Upload process failed:', error);
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
