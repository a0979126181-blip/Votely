
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isAdmin: boolean;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string; // In a real app this would be generated or uploaded
  uploaderId: string;
  uploaderName: string;
  createdAt: number;
  isHidden?: boolean; // New property for soft delete/hiding
}

export type VoteMap = Record<string, string>; // UserId -> VideoId (One vote per user)

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'VIDEO_DETAIL' | 'UPLOAD' | 'ADMIN';
