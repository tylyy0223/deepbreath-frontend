import { create } from 'zustand';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

interface Category {
  id?: number;
  name: string;
  slug: string;
  description?: string;
}

interface Article {
  id?: number;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  category?: string;
  cover_url?: string;
  created_at?: string;
}

export interface Recommendations {
  reason: string;
  mood_avg: number | null;
  articles: Article[];
}

// Backend returns {summary, published_at}; map to frontend shape
function mapArticle(a: Record<string, unknown>): Article {
  return {
    ...(a as unknown as Article),
    excerpt: (a.excerpt || a.summary) as string | undefined,
    created_at: (a.created_at || a.published_at) as string | undefined,
  };
}

interface ContentState {
  categories: Category[];
  articles: Article[];
  currentArticle: Article | null;
  recommendations: Recommendations | null;
  loading: boolean;
  pageLoading: boolean;       // 翻页时不全屏闪
  totalArticles: number;
  hasMore: boolean;

  fetchCategories: () => Promise<void>;
  fetchArticles: (category?: string, page?: number) => Promise<void>;
  fetchMoreArticles: (category?: string) => Promise<void>;
  fetchArticle: (slug: string) => Promise<void>;
  fetchRecommendations: () => Promise<void>;
}

const PAGE_SIZE = 20;

export const useContentStore = create<ContentState>()((set, get) => ({
  categories: [],
  articles: [],
  currentArticle: null,
  recommendations: null,
  loading: false,
  pageLoading: false,
  totalArticles: 0,
  hasMore: false,

  fetchCategories: async () => {
    try {
      const res = await api.get(ENDPOINTS.CONTENT_CATEGORIES);
      const cats: Category[] = Array.isArray(res.data) ? res.data : res.data.data || res.data.categories || [];
      set({ categories: cats });
    } catch { /* silent */ }
  },

  fetchArticles: async (category?, page = 1) => {
    if (page === 1) set({ loading: true });
    else set({ pageLoading: true });
    try {
      const res = await api.get(ENDPOINTS.CONTENT_ARTICLES, { params: { category, page, page_size: PAGE_SIZE } });
      const body = res.data;
      const raw: Record<string, unknown>[] = Array.isArray(body) ? body : body.data || body.articles || body.items || [];
      const total = body.total ?? raw.length;
      set({ articles: raw.map(mapArticle), totalArticles: total, hasMore: raw.length < total });
    } catch {
      set({ articles: [], totalArticles: 0, hasMore: false });
    } finally {
      set({ loading: false, pageLoading: false });
    }
  },

  fetchMoreArticles: async (category?) => {
    // 兼容旧调用: 等价于 fetchArticles(category, next_page)
    const { articles, pageLoading, hasMore } = get();
    if (pageLoading || !hasMore) return;
    set({ pageLoading: true });
    try {
      const next = Math.floor(articles.length / PAGE_SIZE) + 1;
      const res = await api.get(ENDPOINTS.CONTENT_ARTICLES, { params: { category, page: next, page_size: PAGE_SIZE } });
      const body = res.data;
      const raw: Record<string, unknown>[] = Array.isArray(body) ? body : body.data || body.articles || body.items || [];
      const total = body.total ?? articles.length;
      const merged = [...articles, ...raw.map(mapArticle)];
      set({ articles: merged, totalArticles: total, hasMore: merged.length < total });
    } catch {
      // keep existing articles
    } finally {
      set({ pageLoading: false });
    }
  },

  fetchArticle: async (slug: string) => {
    set({ loading: true });
    try {
      const res = await api.get(ENDPOINTS.CONTENT_ARTICLES.replace('/articles', `/articles/${slug}`));
      set({ currentArticle: mapArticle(res.data.data || res.data) });
    } catch {
      set({ currentArticle: null });
    } finally {
      set({ loading: false });
    }
  },

  fetchRecommendations: async () => {
    try {
      const res = await api.get(ENDPOINTS.CONTENT_RECOMMENDATIONS);
      const d = res.data.data;
      if (d) {
        set({ recommendations: { reason: d.reason, mood_avg: d.mood_avg, articles: (d.articles || []).map(mapArticle) } });
      }
    } catch { /* silent — e.g. not logged in */ }
  },
}));
