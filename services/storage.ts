
import { Video, VoteMap, User } from '../types';
import { MOCK_VIDEOS, MOCK_VOTES } from '../constants';

const DB_NAME = 'VotelyDB';
const DB_VERSION = 3; // Bumped to v3 for Hidden feature support
const STORE_VIDEOS = 'videos';
const KEY_VOTES = 'votely_votes';
const KEY_USER = 'votely_user';
const KEY_SEEDED = 'votely_seeded_v3'; // New seed key for v3

// --- IndexedDB Helpers ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Clean slate for v3 to ensure schema is perfect
      if (db.objectStoreNames.contains(STORE_VIDEOS)) {
        db.deleteObjectStore(STORE_VIDEOS);
      }

      // Create fresh store with correct keyPath
      db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- Video Operations (Async with IndexedDB) ---

export const getStoredVideos = async (): Promise<Video[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_VIDEOS, 'readwrite');
    const store = transaction.objectStore(STORE_VIDEOS);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      const hasSeeded = localStorage.getItem(KEY_SEEDED);

      if (countRequest.result === 0 && !hasSeeded) {
        // Seed with MOCK_VIDEOS
        MOCK_VIDEOS.forEach(video => store.add(video));
        localStorage.setItem(KEY_SEEDED, 'true');
        resolve(MOCK_VIDEOS);
      } else {
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          const records = getAllRequest.result;
          const videos: Video[] = records.map((record: any) => {
            if (record.fileBlob instanceof Blob) {
              const newUrl = URL.createObjectURL(record.fileBlob);
              return { ...record, videoUrl: newUrl };
            }
            return record;
          });
          resolve(videos);
        };
        getAllRequest.onerror = () => reject(getAllRequest.error);
      }
    };
    countRequest.onerror = () => reject(countRequest.error);
  });
};

export const saveVideo = async (video: Video, file?: File): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_VIDEOS, 'readwrite');
    const store = transaction.objectStore(STORE_VIDEOS);

    const record = file ? { ...video, fileBlob: file } : video;
    store.put(record); // Use put instead of add to allow updates

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const toggleVideoVisibility = async (videoId: string, isHidden: boolean): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_VIDEOS, 'readwrite');
    const store = transaction.objectStore(STORE_VIDEOS);
    const getRequest = store.get(videoId);

    getRequest.onsuccess = () => {
      const video = getRequest.result;
      if (video) {
        video.isHidden = isHidden;
        store.put(video);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const deleteVideo = async (videoId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_VIDEOS, 'readwrite');
    const store = transaction.objectStore(STORE_VIDEOS);

    store.delete(videoId);

    transaction.oncomplete = () => {
      // Cleanup votes
      const votes = getStoredVotes();
      let votesChanged = false;
      const newVotes = { ...votes };

      Object.keys(newVotes).forEach(userId => {
        if (newVotes[userId] === videoId) {
          delete newVotes[userId];
          votesChanged = true;
        }
      });

      if (votesChanged) {
        localStorage.setItem(KEY_VOTES, JSON.stringify(newVotes));
      }
      resolve();
    };

    transaction.onerror = () => reject(transaction.error);
  });
};

// --- User & Vote Operations ---

export const getStoredVotes = (): VoteMap => {
  const stored = localStorage.getItem(KEY_VOTES);
  if (!stored) {
    localStorage.setItem(KEY_VOTES, JSON.stringify(MOCK_VOTES));
    return MOCK_VOTES;
  }
  return JSON.parse(stored);
};

export const castVote = (userId: string, videoId: string): VoteMap => {
  const votes = getStoredVotes();
  const newVotes = { ...votes, [userId]: videoId };
  localStorage.setItem(KEY_VOTES, JSON.stringify(newVotes));
  return newVotes;
};

export const removeVote = (userId: string): VoteMap => {
  const votes = getStoredVotes();
  const newVotes = { ...votes };
  delete newVotes[userId];
  localStorage.setItem(KEY_VOTES, JSON.stringify(newVotes));
  return newVotes;
}

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
