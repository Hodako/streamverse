export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
};

const TOKEN_KEY = 'streamtube_token';
const USER_KEY = 'streamtube_user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setStoredToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
  } else {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthStorage() {
  setStoredToken(null);
  setStoredUser(null);
}
