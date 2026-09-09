// axios baseURL is '/api/v1', so endpoints are relative paths only
export const ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_ME: '/auth/me',
  AUTH_PROFILE: '/auth/profile',
  AUTH_PASSWORD: '/auth/password',
  AUTH_PASSWORD_RESET: '/auth/password/reset',
  AUTH_SMS_SEND: '/auth/sms/send',
  AUTH_BIND_PHONE: '/auth/bind-phone',
  AUTH_LOGOUT: '/auth/logout',

  // Chat
  CHAT_SEND: '/chat/send',
  CHAT_SESSIONS: '/chat/sessions',
  CHAT_MESSAGES: (sessionId: number) => `/chat/messages/${sessionId}`,
  CHAT_SESSION_DELETE: (sessionId: number) => `/chat/sessions/${sessionId}`,
  CHAT_MODES: '/chat/modes',

  // Breath exercises
  BREATH_EXERCISES: '/breath/exercises',
  BREATH_EXERCISE: (id: number) => `/breath/exercises/${id}`,
  BREATH_COMPLETE: '/breath/complete',
  BREATH_HISTORY: '/breath/history',
  BREATH_STATS: '/breath/stats',

  // Mood diary
  DIARY_CREATE: '/diary/create',
  DIARY_LIST: '/diary/list',
  DIARY_STATS: '/diary/stats',
  DIARY_ENTRY: (id: number) => `/diary/${id}`,
  DIARY_UPDATE: (id: number) => `/diary/${id}`,
  DIARY_DELETE: (id: number) => `/diary/${id}`,

  // Checkin (签到 — independent from diary)
  CHECKIN: '/checkin',
  CHECKIN_STATUS: '/checkin/status',
  CHECKIN_CALENDAR: '/checkin/calendar',
  CHECKIN_HISTORY: '/checkin/history',
  CHECKIN_STATS: '/checkin/stats',

  // Scales (心理量表)
  SCALES: '/scales',
  SCALE: (id: string) => `/scales/${id}`,
  SCALE_SUBMIT: (id: string) => `/scales/${id}/submit`,
  SCALES_HISTORY: '/scales/history/list',

  // Content
  CONTENT_CATEGORIES: '/content/categories',
  CONTENT_ARTICLES: '/content/articles',
  CONTENT_RECOMMENDATIONS: '/content/recommendations',

  // Community
  COMMUNITY_POSTS: '/community/posts',
  COMMUNITY_POST: (id: number) => `/community/posts/${id}`,

  // TTS
  TTS_SYNTHESIZE: '/tts/synthesize',
  TTS_EXISTS: '/tts/exists',
  TTS_BOUND: '/tts/bound',

  // Email
  EMAIL_SEND: '/email/send',

  // References (参考文献)
  REFERENCES: '/references',

  // Credits
  CREDITS_BALANCE: '/credits/balance',
  CREDITS_PRICING: '/credits/pricing',
  CREDITS_TRANSACTIONS: '/credits/transactions',
  CREDITS_ORDERS: '/credits/orders',
  CREDITS_ORDER_PROOF: (orderNo: string) => `/credits/orders/${orderNo}/proof`,
  CREDITS_REDEEM: '/credits/redeem',
  CREDITS_ADMIN_ORDERS: '/credits/admin/orders',
  CREDITS_ADMIN_ORDER_CONFIRM: (orderNo: string) => `/credits/admin/orders/${orderNo}/confirm`,
  CREDITS_ADMIN_ADJUST: '/credits/admin/adjust',
  CREDITS_ADMIN_CODES: '/credits/admin/redeem-codes',
  CREDITS_ADMIN_SUMMARY: '/credits/admin/summary',

  // Admin
  ADMIN_STATS: '/admin/stats',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_ROLE: (id: number) => `/admin/users/${id}/role`,
  ADMIN_USER_STATUS: (id: number) => `/admin/users/${id}/status`,
  ADMIN_LOGIN_LOGS: '/admin/login-logs',
  ADMIN_AI_USAGE: '/admin/ai-usage',
  ADMIN_ONLINE: '/admin/online',

  // Book Listen (AI 听书)
  BOOK_LISTEN_BOOKS: '/book-listen/books',
  BOOK_LISTEN_SERIAL: (serial: string) => `/book-listen/serial/${serial}`,
  BOOK_LISTEN_CHAPTER: (serial: string, idx: number) => `/book-listen/serial/${serial}/${idx}`,
  BOOK_LISTEN_PROGRESS: (serial: string, idx: number) => `/book-listen/serial/${serial}/${idx}/progress`,
  BOOK_LISTEN_LIMIT: '/book-listen/limit',
} as const;
