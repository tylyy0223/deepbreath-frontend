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
  },
};
