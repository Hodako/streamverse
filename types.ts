export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  channelAvatar: string;
  views: string;
  postedAt: string;
  duration: string;
  description: string;
  category: string;
  streamUrl?: string;
  videoUrl?: string;
  isTrending?: boolean;
  isShort?: boolean;
  createdAt?: string;
}

export interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  likes: number;
  timestamp: string;
}