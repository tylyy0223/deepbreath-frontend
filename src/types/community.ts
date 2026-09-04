// === Community Types ===

export interface CommunityAuthor {
  nickname: string;
  avatar_url?: string;
}

export interface CommunityReply {
  id: number;
  content: string;
  author?: CommunityAuthor;
  author_id: number;
  is_anonymous: boolean;
  is_mine?: boolean;
  images?: string[];
  created_at: string;
}

export interface CommunityPost {
  id: number;
  title?: string;
  content: string;
  category?: string;
  is_anonymous?: boolean;
  author?: CommunityAuthor;
  author_id?: number;
  is_mine?: boolean;
  like_count?: number;
  reply_count?: number;
  view_count?: number;
  is_liked?: boolean;
  images?: string[];
  created_at?: string;
  replies?: CommunityReply[];
}

export interface CreatePostData {
  title?: string;
  content: string;
  category?: string;
  is_anonymous?: boolean;
  images?: string[];
}

export interface ReplyData {
  content: string;
  is_anonymous?: boolean;
  images?: string[];
}
