import { create } from 'zustand';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';
import type { CommunityPost } from '../types/community';

interface CommunityState {
  posts: CommunityPost[];
  loading: boolean;

  fetchPosts: (category?: string, mine?: boolean, page?: number) => Promise<void>;
  fetchPost: (id: number) => Promise<CommunityPost | null>;
  createPost: (data: { title?: string; content: string; category?: string; is_anonymous?: boolean; images?: string[] }) => Promise<void>;
  updatePost: (id: number, data: { title?: string; content: string }) => Promise<void>;
  likePost: (id: number) => Promise<void>;
  replyPost: (id: number, content: string, is_anonymous?: boolean, images?: string[]) => Promise<void>;
  updateReply: (postId: number, replyId: number, content: string) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
  deleteReply: (postId: number, replyId: number) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>()((set, get) => ({
  posts: [],
  loading: false,

  fetchPosts: async (category = 'general', mine = false, page = 1) => {
    set({ loading: true });
    try {
      const res = await api.get(ENDPOINTS.COMMUNITY_POSTS, { params: { category, mine, page, page_size: 20 } });
      const posts: CommunityPost[] = Array.isArray(res.data) ? res.data : res.data.data || res.data.posts || res.data.items || [];
      set({ posts });
    } catch {
      set({ posts: [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchPost: async (id: number) => {
    try {
      const res = await api.get(ENDPOINTS.COMMUNITY_POST(id));
      return (res.data.data || res.data) as CommunityPost;
    } catch {
      return null;
    }
  },

  createPost: async (data) => {
    await api.post(ENDPOINTS.COMMUNITY_POSTS, data);
    get().fetchPosts();
  },

  likePost: async (id) => {
    await api.post(ENDPOINTS.COMMUNITY_POSTS + `/${id}/like`);
    get().fetchPosts();
  },

  replyPost: async (id, content, is_anonymous = false, images?: string[]) => {
    await api.post(ENDPOINTS.COMMUNITY_POSTS + `/${id}/reply`, { content, is_anonymous, images: images && images.length > 0 ? images : undefined });
    get().fetchPosts();
  },

  updatePost: async (id, data) => {
    await api.put(ENDPOINTS.COMMUNITY_POST(id), data);
    get().fetchPosts();
  },

  deletePost: async (id: number) => {
    await api.delete(ENDPOINTS.COMMUNITY_POST(id));
    get().fetchPosts();
  },

  updateReply: async (postId, replyId, content) => {
    await api.put(`${ENDPOINTS.COMMUNITY_POST(postId)}/replies/${replyId}`, { content });
    get().fetchPosts();
  },

  deleteReply: async (postId, replyId) => {
    await api.delete(`${ENDPOINTS.COMMUNITY_POST(postId)}/replies/${replyId}`);
    get().fetchPosts();
  },
}));
