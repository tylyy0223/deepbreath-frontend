// === Diary Types ===

export interface MoodEntry {
  id: number;
  mood_score: number;
  mood_label?: string;
  body_sensation?: string;
  note?: string;
  weather?: string;
  images?: string[];
  created_at: string;
}

export interface DiaryCreateRequest {
  mood_score: number;
  mood_label?: string;
  body_sensation?: string;
  note?: string;
  weather?: string;
  images?: string[];
}

export interface DiaryUpdateRequest {
  mood_score?: number;
  mood_label?: string;
  body_sensation?: string;
  note?: string;
  weather?: string;
  images?: string[];
}

export interface DiaryStats {
  average_mood?: number;
  streak_days?: number;
  total_entries?: number;
  most_common_label?: string;
  mood_distribution?: Record<number, number>;
}

export interface DiaryListResult {
  items: MoodEntry[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  has_more: boolean;
}
