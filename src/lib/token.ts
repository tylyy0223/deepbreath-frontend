/**
 * Token 存储 — 只管 access_token 和 user profile
 *
 * refresh_token 现在由后端通过 httpOnly cookie 管理, JS 完全读不到.
 * 这是 XSS 防御的根治方案: 即使有运行时 XSS, 攻击者也拿不到 refresh_token,
 * 无法跨会话维持登录.
 *
 * Cookie 自动随每个 axios 请求带 (withCredentials: true + 后端 Set-Cookie),
 * 401 续签流程由 axios 拦截器处理, 前端不需要也不应该直接读 cookie.
 *
 * localStorage 只剩:
 * - access_token (短期, 1 天过期, 泄露影响有限, 配合 refresh cookie 自动续签)
 * - user profile (公开信息, 无安全敏感)
 */
const ACCESS_KEY = 'deepbreath_access';
const USER_KEY = 'deepbreath_user';

export const token = {
  getAccess: (): string | null => localStorage.getItem(ACCESS_KEY),

  setAccess: (t: string) => localStorage.setItem(ACCESS_KEY, t),

  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(user)),

  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(USER_KEY);
    // === 注意: 不再需要清 refresh_token, 它在 httpOnly cookie 里,
    // 由后端 /logout 接口通过 Set-Cookie Max-Age=0 清除 ===
  },

  // === 旧 API 保留为 no-op, 避免前端其他地方调用报错 ===
  // 后续可清理, 但保留 stub 防止破坏第三方调用
  getRefresh: (): string | null => null,
  setRefresh: (_t: string) => { /* no-op: refresh_token 在 cookie 里, JS 不管 */ },
};