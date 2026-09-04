// === Auth Types ===

export interface LoginRequest {
  email?: string;
  password?: string;
  phone?: string;
  sms_code?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
  phone?: string;
  sms_code?: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  email: string;
  nickname: string;
  avatar_url: string;
  role: string;
  phone?: string | null;     // 脱敏（138****1234）
  phone_bound?: boolean;     // false 时前端强制补绑
  // 个人资料（来自 user_profiles 表，/auth/me 返回）
  bio?: string;
  gender?: string;
  birth_year?: number | null;
  province?: string;
}

export interface UserProfileUpdate {
  nickname?: string | null;
  bio?: string | null;
  gender?: string | null;
  birth_year?: number | null;
  province?: string | null;
}
