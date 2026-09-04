export const STORAGE_KEYS = {
  AUTH: 'deepbreath_auth',
} as const;

export const MOOD_EMOJIS: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😞', label: '很糟糕', color: '#ef4444' },
  2: { emoji: '😟', label: '不太好', color: '#f97316' },
  3: { emoji: '😐', label: '一般般', color: '#eab308' },
  4: { emoji: '🙂', label: '还不错', color: '#84cc16' },
  5: { emoji: '😊', label: '很开心', color: '#22c55e' },
};

export const BODY_SENSATIONS = [
  '放松', '紧张', '疲惫', '精力充沛',
  '头痛', '胸闷', '胃不适', '无特别感觉',
];

export const WEATHER_OPTIONS = [
  { value: 'sunny', emoji: '☀️', label: '晴天' },
  { value: 'cloudy', emoji: '☁️', label: '多云' },
  { value: 'rainy', emoji: '🌧️', label: '下雨' },
  { value: 'snowy', emoji: '❄️', label: '下雪' },
  { value: 'windy', emoji: '💨', label: '大风' },
];

export const DEFAULT_BREATH_CONFIG = {
  inhale: 4000,
  hold: 2000,
  exhale: 4000,
  rest: 1000,
};
