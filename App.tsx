
import React, { useState, useEffect, useCallback } from 'react';
import { ConfirmationModal } from './components/ConfirmationModal';
import { User, Video, VoteMap, ViewState } from './types';
import {
  getStoredVideos,
  saveVideo,
  getStoredVotes,
  castVote,
  getStoredUser,
  saveStoredUser,
  clearStoredUser,
  removeVote,
  deleteVideo,
  toggleVideoVisibility
} from './services/storage';
import { Navbar } from './components/Navbar';
import { VideoGridItem } from './components/VideoGridItem';
import { Button } from './components/Button';
import { Heart, Upload as UploadIcon, Video as VideoIcon, Lock, BarChart3, ArrowLeft, Users, Trash2, AlertTriangle, Eye, EyeOff, Archive } from 'lucide-react';

// --- Sub-Components ---

// 1. Login Component
const LoginScreen: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    // Admin logic: strict check for specific email
    const isAdmin = email.toLowerCase() === 'admin@votely.com';

    const newUser: User = {
      id: email.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name,
      email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      isAdmin
    };
    onLogin(newUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-red-200 shadow-lg">
            V
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Votely</h1>
          <p className="text-gray-500 mt-2">Video Contest & Voting Platform</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button fullWidth type="submit" className="py-3 text-lg shadow-lg shadow-red-100">
            Enter Platform
          </Button>
        </form>
      </div>
    </div>
  );
};

// 2. Upload Component
const UploadScreen: React.FC<{
  user: User,
  onCancel: () => void,
  onSuccess: (video: Video, file: File) => void
}> = ({ user, onCancel, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const generateThumbnail = (videoFile: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        if (video.src) URL.revokeObjectURL(video.src);
        video.remove();
      };

      video.onloadedmetadata = () => {
        if (video.duration && Number.isFinite(video.duration)) {
          video.currentTime = video.duration / 2;
        } else {
          video.currentTime = 1;
        }
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 480;
          const scale = Math.min(1, MAX_WIDTH / video.videoWidth);

          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
          } else {
            resolve(`https://picsum.photos/seed/${Date.now()}/400/600`);
          }
        } catch (e) {
          console.error("Error generating thumbnail:", e);
          resolve(`https://picsum.photos/seed/${Date.now()}/400/600`);
        } finally {
          cleanup();
        }
      };

      video.onerror = () => {
        console.error("Video load error");
        cleanup();
        resolve(`https://picsum.photos/seed/${Date.now()}/400/600`);
      };

      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) return;

    setIsSubmitting(true);

    try {
      const thumb = await generateThumbnail(file);

      const newVideo: Video = {
        id: `v-${Date.now()}`,
        title,
        description,
        videoUrl: URL.createObjectURL(file), // Temporary URL for immediate display
        thumbnailUrl: thumb,
        uploaderId: user.id,
        uploaderName: user.name,
        createdAt: Date.now(),
        isHidden: false
      };

      onSuccess(newVideo, file);
    } catch (error) {
      console.error("Upload failed", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upload Your Video</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">Cancel</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Video File</label>
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${previewUrl ? 'border-red-200 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}>
              {previewUrl ? (
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                  <video src={previewUrl} controls className="w-full h-full" />
                  <button
                    type="button"
                    onClick={() => { setFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 bg-white/80 p-1 rounded-full hover:bg-white text-red-600"
                  >
                    <UploadIcon size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center pointer-events-none">
                    <div className="p-3 bg-gray-100 rounded-full mb-3">
                      <VideoIcon className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">Select video file</p>
                    <p className="text-xs text-gray-500 mt-1">MP4, WebM</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Name your masterpiece"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none resize-none"
              placeholder="Tell us a bit about this video..."
            />
          </div>

          <div className="pt-4">
            <Button type="submit" fullWidth disabled={!file || !title || isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Upload Video'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. Video Detail Component
const VideoDetail: React.FC<{
  video: Video;
  currentUser: User;
  hasVotedForThis: boolean;
  onVote: () => void;
  onDelete: (video: Video) => void;
  onToggleHide: (video: Video) => void;
  onBack: () => void;
}> = ({ video, currentUser, hasVotedForThis, onVote, onDelete, onToggleHide, onBack }) => {

  const canAdmin = currentUser.isAdmin;
  const canDelete = canAdmin || currentUser.id === video.uploaderId;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
      >
        <ArrowLeft size={20} />
        Back to Feed
      </button>

      {video.isHidden && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3 text-yellow-800">
          <Archive size={20} />
          <span className="font-medium">This video is currently hidden from the public feed.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Player */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video relative group">
            <video
              src={video.videoUrl}
              controls
              autoPlay
              className="w-full h-full"
              poster={video.thumbnailUrl}
            />
          </div>
        </div>

        {/* Right: Info & Vote */}
        <div className="bg-white rounded-2xl p-6 shadow-sm h-fit border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4 gap-2">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight flex-1 pr-2">{video.title}</h1>

              {/* Show hide button only for admin */}
              {canAdmin && (
                <button
                  onClick={() => onToggleHide(video)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                  title={video.isHidden ? "Unhide Video" : "Hide Video from Feed"}
                >
                  {video.isHidden ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // Direct call, parent handles modal
                    onDelete(video);
                  }}
                  className="relative z-20 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                  title="Delete Video"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center text-gray-600 text-sm font-bold">
                {video.uploaderName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{video.uploaderName}</p>
                <p className="text-xs text-gray-500">Creator</p>
              </div>
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed min-h-[80px]">
              {video.description || "No description provided for this video."}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
            <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">Public Voting</p>
            <button
              onClick={onVote}
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 shadow-sm ${hasVotedForThis
                ? 'bg-red-600 text-white shadow-red-200 shadow-md'
                : 'bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200'
                }`}
            >
              <Heart
                className={`transition-all ${hasVotedForThis ? 'fill-current' : ''}`}
                size={24}
              />
              {hasVotedForThis ? 'Vote Cast' : 'Vote for this Video'}
            </button>
            <p className="text-xs text-gray-400 mt-3">
              {hasVotedForThis ? "You have voted for this submission." : "One vote per person. Anonymous."}
            </p>
          </div>
        </div>
      </div>
    </div >
  );
};

// 4. Admin Panel
const AdminPanel: React.FC<{
  videos: Video[],
  votes: VoteMap,
  onResetVotes: () => void,
  onDeleteVideo: (video: Video) => void,
  onToggleHide: (video: Video) => void
}> = ({ videos, votes, onResetVotes, onDeleteVideo, onToggleHide }) => {

  // Calculate votes
  const voteCounts: Record<string, number> = {};
  const votersByVideo: Record<string, string[]> = {};

  videos.forEach(v => {
    voteCounts[v.id] = 0;
    votersByVideo[v.id] = [];
  });

  Object.entries(votes).forEach(([userId, videoId]) => {
    if (voteCounts[videoId] !== undefined) {
      voteCounts[videoId]++;
      votersByVideo[videoId].push(userId);
    }
  });

  // Sort by votes
  const sortedVideos = [...videos].sort((a, b) => voteCounts[b.id] - voteCounts[a.id]);

  // Split active and hidden
  const activeVideos = sortedVideos.filter(v => !v.isHidden);
  const hiddenVideos = sortedVideos.filter(v => v.isHidden);
  const totalVotes = Object.keys(votes).length;

  const VideoTable = ({ list, title, emptyMsg }: { list: Video[], title: string, emptyMsg: string }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700">{title} <span className="text-gray-400 text-sm font-normal ml-2">({list.length})</span></h3>
        {title === 'Live Public Videos' && (
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all votes? This cannot be undone.")) {
                onResetVotes();
              }
            }}
            className="text-xs text-red-600 hover:text-red-800 hover:underline flex items-center gap-1"
          >
            <Trash2 size={12} /> Reset All Votes
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Rank</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Video Submission</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Total Votes</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((video, index) => (
              <tr key={video.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`
                    inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                    ${index === 0 ? 'bg-yellow-100 text-yellow-700 ring-4 ring-yellow-50' :
                      index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-800' : 'text-gray-400 bg-gray-50'}
                  `}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-16 rounded overflow-hidden bg-black shrink-0 group">
                      <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      {video.isHidden && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <EyeOff className="text-white" size={16} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{video.title}</p>
                      <p className="text-xs text-gray-500">By: {video.uploaderName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${voteCounts[video.id] > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                    {voteCounts[video.id]}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onToggleHide(video)}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title={video.isHidden ? "Unhide" : "Hide"}
                    >
                      {video.isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{emptyMsg}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="text-gray-600">Manage videos and monitor voting progress.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <VideoIcon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Videos</p>
              <p className="text-2xl font-bold text-gray-900">{videos.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Votes</p>
              <p className="text-2xl font-bold text-gray-900">{totalVotes}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hidden Videos</p>
              <p className="text-2xl font-bold text-gray-900">{hiddenVideos.length}</p>
            </div>
          </div>
        </div>
      </div>

      <VideoTable
        list={activeVideos}
        title="Live Public Videos"
        emptyMsg="No active videos found."
      />

      <VideoTable
        list={hiddenVideos}
        title="Hidden / Removed Videos"
        emptyMsg="No hidden videos."
      />
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('LOGIN');
  const [videos, setVideos] = useState<Video[]>([]);
  const [votes, setVotes] = useState<VoteMap>({});
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);

  // Load initial data asynchronously
  useEffect(() => {
    const init = async () => {
      try {
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          setView('DASHBOARD');
        }

        const loadedVideos = await getStoredVideos();
        setVideos(loadedVideos);

        const loadedVotes = await getStoredVotes();
        setVotes(loadedVotes);
      } catch (err) {
        console.error("Failed to load data:", err);
        alert("Failed to load data from server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Helper to refresh data
  const refreshData = async () => {
    try {
      const loadedVideos = await getStoredVideos();
      setVideos(loadedVideos);
      const loadedVotes = await getStoredVotes();
      setVotes(loadedVotes);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    saveStoredUser(loggedInUser);
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    setUser(null);
    clearStoredUser();
    setView('LOGIN');
  };

  const handleVideoClick = (video: Video) => {
    setSelectedVideoId(video.id);
    setView('VIDEO_DETAIL');
  };

  const handleUploadSuccess = async (newVideo: Video, file: File) => {
    try {
      await saveVideo(newVideo, file);
      await refreshData();
      setView('DASHBOARD');
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload video. Please try again.");
    }
  };

  const handleToggleHide = async (video: Video) => {
    try {
      const newStatus = !video.isHidden;
      await toggleVideoVisibility(video.id, newStatus);
      await refreshData();
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
      alert("Failed to update video status.");
    }
  };

  // This function is passed to children to trigger the confirmation modal
  const handleDeleteVideo = (video: Video) => {
    setVideoToDelete(video);
  };

  // Actual deletion logic
  const executeDeleteVideo = async () => {
    if (!videoToDelete) return;
    
    try {
      await deleteVideo(videoToDelete.id);
      await refreshData();
      setVideoToDelete(null);
      
      // If we're viewing the deleted video, go back to dashboard
      if (selectedVideoId === videoToDelete.id) {
        setView('DASHBOARD');
        setSelectedVideoId(null);
      }
    } catch (error) {
      console.error("Failed to delete video:", error);
      alert("Failed to delete video. Please try again.");
    }
  };

  const handleVote = useCallback(async () => {
  if (!user || !selectedVideoId) return;

  const currentVote = votes[user.id];

  try {
    if (currentVote === selectedVideoId) {
      // Toggle off if clicking the same one
      const updatedVotes = await removeVote(user.id);
      setVotes(updatedVotes);
    } else {
      // Vote for this one (replaces old vote)
      const updatedVotes = await castVote(user.id, selectedVideoId);
      setVotes(updatedVotes);
    }
  } catch (error) {
    console.error("Vote failed:", error);
    alert("Failed to cast vote. Please try again.");
  }
}, [user, selectedVideoId, votes]);

const handleResetVotes = () => {
  localStorage.removeItem('votely_votes');
  setVotes({});
};

if (loading) {
  return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading Platform...</div>;
}

// Views Rendering Logic
if (!user || view === 'LOGIN') {
  return <LoginScreen onLogin={handleLogin} />;
}

const selectedVideo = videos.find(v => v.id === selectedVideoId);

// Filter visible videos for dashboard
const visibleVideos = videos.filter(v => !v.isHidden);

return (
  <div className="min-h-screen bg-gray-50 pb-12">
    <Navbar
      user={user}
      onLogout={handleLogout}
      onUploadClick={() => setView('UPLOAD')}
      onDashboardClick={() => setView('DASHBOARD')}
      onAdminClick={() => setView('ADMIN')}
    />

    {view === 'DASHBOARD' && (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Community Submissions</h2>
          <p className="text-gray-600">Browse, watch, and vote for your favorite clips.</p>
        </div>

        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {visibleVideos.map(video => (
            <VideoGridItem
              key={video.id}
              video={video}
              onClick={handleVideoClick}
              isVoted={votes[user.id] === video.id}
              currentUserId={user.id}
              isAdmin={user.isAdmin}
              onToggleHide={handleToggleHide}
              onDelete={handleDeleteVideo}
            />
          ))}
          {visibleVideos.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
              <VideoIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-900">No videos found</p>
              <p className="text-sm text-gray-500">Be the first to upload or check back later!</p>
            </div>
          )}
        </div>
      </main>
    )}

    {view === 'UPLOAD' && (
      <UploadScreen
        user={user}
        onCancel={() => setView('DASHBOARD')}
        onSuccess={handleUploadSuccess}
      />
    )}

    {view === 'VIDEO_DETAIL' && selectedVideo && (
      <VideoDetail
        video={selectedVideo}
        currentUser={user}
        hasVotedForThis={votes[user.id] === selectedVideo.id}
        onVote={handleVote}
        onDelete={handleDeleteVideo}
        onToggleHide={handleToggleHide}
        onBack={() => setView('DASHBOARD')}
      />
    )}

    {view === 'ADMIN' && (
      user.isAdmin ? (
        <AdminPanel
          videos={videos}
          votes={votes}
          onResetVotes={handleResetVotes}
          onDeleteVideo={handleDeleteVideo}
          onToggleHide={handleToggleHide}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="bg-red-50 p-6 rounded-full mb-6">
            <Lock size={48} className="text-red-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Access Denied</h3>
          <p className="text-gray-500 mt-2 max-w-md">
            You do not have permission to view the admin panel. This area is restricted to event organizers.
          </p>
          <Button variant="outline" className="mt-8" onClick={() => setView('DASHBOARD')}>Return to Feed</Button>
        </div>
      )
    )}
    {/* Global Confirmation Modal */}
    <ConfirmationModal
      isOpen={!!videoToDelete}
      title={videoToDelete?.isHidden ? "Permanently Delete Video?" : "Remove Video?"}
      message={
        videoToDelete?.isHidden
          ? `Are you sure you want to permanently delete "${videoToDelete?.title}"? This action cannot be undone.`
          : `Are you sure you want to remove "${videoToDelete?.title}" from the public feed? You can restore it later from the admin panel.`
      }
      confirmLabel={videoToDelete?.isHidden ? "Delete Permanently" : "Remove Video"}
      cancelLabel="Cancel"
      isDangerous={true}
      onConfirm={executeDeleteVideo}
      onCancel={() => setVideoToDelete(null)}
    />
  </div>
);
};

export default App;
