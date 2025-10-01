import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
// Try to read BASE_API_URL from @env (Expo) or process.env as fallback
let BASE_API_URL: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BASE_API_URL = require('@env').BASE_API_URL;
} catch (_) {
  BASE_API_URL = (process.env.BASE_API_URL as string) || undefined;
}

export interface AuthUser {
  id: string;
  name?: string;
  picture?: string | null;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  setAuth: (data: AuthState) => Promise<void>;
  clearAuth: () => Promise<void>;
  apiFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Tokens stored in SecureStore (native encrypted storage)
const ACCESS_KEY = 'auth_access_token_v1';
const REFRESH_KEY = 'auth_refresh_token_v1';
// User profile (non-sensitive) stored in AsyncStorage
const USER_KEY = 'auth_user_v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ accessToken: null, refreshToken: null, user: null });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a, r, u] = await Promise.all([
          // SecureStore for tokens (native encrypted storage)
          SecureStore.getItemAsync(ACCESS_KEY),
          SecureStore.getItemAsync(REFRESH_KEY),
          AsyncStorage.getItem(USER_KEY)
        ]);
        setState({
          accessToken: a,
          refreshToken: r,
          user: u ? JSON.parse(u) : null
        });
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setAuth = async (data: AuthState) => {
    setState(data);
    // store tokens in SecureStore, user profile in AsyncStorage
    await Promise.all([
      data.accessToken ? SecureStore.setItemAsync(ACCESS_KEY, data.accessToken) : SecureStore.deleteItemAsync(ACCESS_KEY),
      data.refreshToken ? SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken) : SecureStore.deleteItemAsync(REFRESH_KEY),
      data.user ? AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user)) : AsyncStorage.removeItem(USER_KEY)
    ]);
  };

  const clearAuth = async () => {
    setState({ accessToken: null, refreshToken: null, user: null });
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      AsyncStorage.removeItem(USER_KEY)
    ]);
  };

  // Helper: build backend API URL
  function buildApi(path: string) {
    const root = (BASE_API_URL || '').replace(/\/$/, '');
    if (!root) throw new Error('BASE_API_URL not configured');
    if (/\/api$/.test(root)) return root + path;
    return root + '/api' + path;
  }

  // Refresh tokens using backend endpoint. Returns true if refreshed.
  async function refreshTokens(): Promise<boolean> {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
      const res = await fetch(buildApi('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!res.ok) {
        // clear auth on failure
        await clearAuth();
        return false;
      }
      const json = await res.json();
      // update access token (and maybe refresh not returned)
      const newAccess = json.accessToken;
      const newRefresh = json.refreshToken || refreshToken;
      const user = json.user || state.user;
      await setAuth({ accessToken: newAccess, refreshToken: newRefresh, user });
      return true;
    } catch (e) {
      console.warn('refreshTokens error', e);
      await clearAuth();
      return false;
    }
  }

  // apiFetch wraps fetch to attach Authorization and auto-refresh on 401 once
  async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    // 决定请求的最终 URL。如果 input 是相对路径，则与 BASE_API_URL 拼接。
    const requestUrl = typeof input === 'string' && !input.startsWith('http')
      ? buildApi(input)
      : input;

    const doRequest = async (token: string | null) => {
      const headers = new Headers(init?.headers as any || {});
      // 只为我们自己的 API 请求添加 Authorization 头
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const cfg: RequestInit = { ...init, headers, credentials: 'include' };
      return fetch(requestUrl, cfg);
    };

    // first attempt with current access token
    const access = state.accessToken;
    let res = await doRequest(access);
    if (res.status !== 401) return res;

    // 如果不是我们自己的 API 返回的 401，则不尝试刷新令牌，直接返回结果。
    // 这可以防止向第三方 API 发送刷新逻辑。
    const finalUrl = typeof requestUrl === 'string' ? requestUrl : requestUrl.url;
    if (!finalUrl.startsWith(BASE_API_URL || '')) return res;

    // try refresh once
    const ok = await refreshTokens();
    if (!ok) return res;
    const newAccess = (await SecureStore.getItemAsync(ACCESS_KEY)) || null;
    res = await doRequest(newAccess);
    return res;
  }

  if (!hydrated) return null; // could render splash

  return (
    <AuthContext.Provider value={{ ...state, setAuth, clearAuth, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
