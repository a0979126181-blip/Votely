import { Video, VoteMap } from './types';

export const MOCK_VIDEOS: Video[] = [
  {
    id: 'v1',
    title: 'Morning Routine in Tokyo',
    description: 'A peaceful morning walk through the streets of Shibuya before the crowd arrives. The lighting was absolutely perfect today.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/tokyo/400/600',
    uploaderId: 'u2',
    uploaderName: 'Sarah Jenkins',
    createdAt: Date.now() - 1000000,
  },
  {
    id: 'v2',
    title: 'Homemade Pasta Tutorial',
    description: 'Learning to make Tagliatelle from scratch. Flour everywhere but worth it! Vote if you are hungry.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/pasta/400/500',
    uploaderId: 'u3',
    uploaderName: 'Chef Mike',
    createdAt: Date.now() - 2000000,
  },
  {
    id: 'v3',
    title: 'My Cat Playing Piano',
    description: 'Whiskers discovered the synthesizer today. Is this the next Mozart? Probably not, but it is cute.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/cat/400/400',
    uploaderId: 'u4',
    uploaderName: 'CatLover99',
    createdAt: Date.now() - 3000000,
  },
  {
    id: 'v4',
    title: 'Hiking the Swiss Alps',
    description: 'The view from the top of the ridge. You can see three different countries from here.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/hike/400/700',
    uploaderId: 'u5',
    uploaderName: 'Adventure Tom',
    createdAt: Date.now() - 4000000,
  },
  {
    id: 'v5',
    title: 'Abstract Art Timelapse',
    description: 'Acrylic pouring technique. Watch the colors blend.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/art/400/450',
    uploaderId: 'u6',
    uploaderName: 'ArtByAnna',
    createdAt: Date.now() - 5000000,
  },
];

export const MOCK_VOTES: VoteMap = {
  'u2': 'v2',
  'u3': 'v1',
  'u4': 'v1',
  'u5': 'v5'
};
