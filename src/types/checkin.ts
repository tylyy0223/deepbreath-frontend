/** 签到相关类型 — 独立于日记模块 */

export interface CheckInResult {
  checked: boolean;
  streak: number;
  reward_credits: number;
  is_milestone: boolean;
  message: string;
  longest_streak: number;
  total_checkins: number;
  total_credits: number;
}

export interface CheckInStatus {
  checked_today: boolean;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  total_credits_earned: number;
  today_reward: number;
}

export interface CalendarDay {
  date: string;   // YYYY-MM-DD
  checked: boolean;
  streak_count: number;
}

export interface CheckInCalendar {
  year: number;
  month: number;
  total_days: number;
  days: CalendarDay[];
}

export interface CheckInHistoryItem {
  id: number;
  check_date: string;
  streak_count: number;
  credits_earned: number;
  created_at: string;
}

export interface CheckInHistory {
  items: CheckInHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CheckInStats {
  total_checkins: number;
  current_streak: number;
  longest_streak: number;
  total_credits_earned: number;
  this_month: number;
  this_year: number;
  morning_count: number;
  afternoon_count: number;
  evening_count: number;
  night_count: number;
}
