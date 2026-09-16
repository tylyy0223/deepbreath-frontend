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

  // === 乐观更新: 每个 mutation 局部修改 posts 数组, 不再触发全量 fetchPosts ===
  // 修复: 7 个 mutation 之前都 fetchPosts() 全屏 loading + 重新加载 20 个 post
  // 现在: 点赞/回复/编辑/删除 都是局部状态变化, 响应瞬时, 失败回滚

  createPost: async (data) => {
    const res = await api.post(ENDPOINTS.COMMUNITY_POSTS, data);
    const newPost = (res.data?.data || res.data) as CommunityPost;
    if (newPost?.id) {
      // 乐观插入到列表头部 (假设按时间倒序, 最新在前)
      set((s) => ({ posts: [newPost, ...s.posts] }));
    } else {
      // 后端没返回新 post (旧版), 回退到全量刷新
      get().fetchPosts();
    }
  },

  likePost: async (id) => {
    // 1. 乐观更新 UI (瞬间响应)
    set((s) => ({
      posts: s.posts.map(p => p.id !== id ? p : {
        ...p,
        is_liked: !p.is_liked,
        like_count: (p.like_count || 0) + (p.is_liked ? -1 : 1),
      }),
    }));
    try {
      // 2. 调接口, 用服务端返回的 action 校正
      const res = await api.post(ENDPOINTS.COMMUNITY_POSTS + `/${id}/like`);
      const action = res.data?.data?.action;
      if (action === 'liked' || action === 'unliked') {
        set((s) => ({
          posts: s.posts.map(p => p.id !== id ? p : { ...p, is_liked: action === 'liked' }),
        }));
      }
    } catch {
      // 3. 失败回滚 (再 toggle 一次回到原状态)
      set((s) => ({
        posts: s.posts.map(p => p.id !== id ? p : {
          ...p,
          is_liked: !p.is_liked,
          like_count: (p.like_count || 0) + (p.is_liked ? -1 : 1),
        }),
      }));
    }
  },

  replyPost: async (id, content, is_anonymous = false, images?: string[]) => {
    // 乐观更新 reply_count +1
    set((s) => ({
      posts: s.posts.map(p => p.id !== id ? p : {
        ...p,
        reply_count: (p.reply_count || 0) + 1,
      }),
    }));
    try {
      await api.post(ENDPOINTS.COMMUNITY_POSTS + `/${id}/reply`, {
        content, is_anonymous,
        images: images && images.length > 0 ? images : undefined,
      });
    } catch (err) {
      // 失败回滚
      set((s) => ({
        posts: s.posts.map(p => p.id !== id ? p : {
          ...p,
          reply_count: Math.max(0, (p.reply_count || 1) - 1),
        }),
      }));
      throw err;  // 让上层知道失败
    }
  },

  updatePost: async (id, data) => {
    // 乐观更新内容
    set((s) => ({
      posts: s.posts.map(p => p.id !== id ? p : { ...p, ...data }),
    }));
    try {
      await api.put(ENDPOINTS.COMMUNITY_POST(id), data);
    } catch {
      // 失败回滚: 重新拉单个 post 详情
      const fresh = await get().fetchPost(id);
      if (fresh) {
        set((s) => ({
          posts: s.posts.map(p => p.id !== id ? p : fresh),
        }));
      }
    }
  },

  deletePost: async (id) => {
    // 乐观移除
    const backup = get().posts;
    set((s) => ({ posts: s.posts.filter(p => p.id !== id) }));
    try {
      await api.delete(ENDPOINTS.COMMUNITY_POST(id));
    } catch {
      // 失败回滚
      set({ posts: backup });
    }
  },

  updateReply: async (postId, replyId, content) => {
    // reply 更新不影响列表 summary (reply_count 不变, 内容不在列表展示)
    // 但需要在用户进入详情页时看到最新内容 — fetchPost 重新加载
    await api.put(`${ENDPOINTS.COMMUNITY_POST(postId)}/replies/${replyId}`, { content });
    // 不刷新列表 (列表里 reply 是 summary 形式, 不显示内容)
  },

  deleteReply: async (postId, replyId) => {
    // 乐观更新 reply_count -1
    set((s) => ({
      posts: s.posts.map(p => p.id !== postId ? p : {
        ...p,
        reply_count: Math.max(0, (p.reply_count || 1) - 1),
      }),
    }));
    try {
      await api.delete(`${ENDPOINTS.COMMUNITY_POST(postId)}/replies/${replyId}`);
    } catch {
      // 失败回滚
      set((s) => ({
        posts: s.posts.map(p => p.id !== postId ? p : {
          ...p,
          reply_count: (p.reply_count || 0) + 1,
        }),
      }));
    }
  },
}));