import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Try to read BASE_API_URL from @env (Expo) or process.env as fallback
let BASE_API_URL: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BASE_API_URL = require('@env').BASE_API_URL;
} catch (_) {
  BASE_API_URL = (process.env.BASE_API_URL as string) || undefined;
}

const DEEP_LINK_PREFIX = 'miffler://';
const OAUTH_CALLBACK_PATH = 'oauth-callback';

export interface Actor {
  type: 'user' | 'guest';
  id: string;
}

export interface AuthUser {
  id: string;
  name?: string;
  picture?: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  actor: Actor | null;
  loadingAuth: boolean;
  signOut: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  apiFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [actor, setActor] = useState<Actor | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Helper to get or create a guest ID
  const getOrCreateGuestId = async (): Promise<string> => {
    let guestId = await AsyncStorage.getItem('guestId');
    if (!guestId) {
      // Assuming 'react-native-get-random-values' is installed for uuid
      const { v4: uuidv4 } = require('uuid');
      guestId = uuidv4();
      await AsyncStorage.setItem('guestId', guestId);
    }
    return guestId;
  };

  useEffect(() => {
    // 使用 useRef 来跟踪登录意图，避免在每次 auth 状态变化时都尝试合并数据
    const loginIntentRef = { isLoggingIn: false };

    const handleAuthChange = async (event: string, session: Session | null) => {
      setSession(session);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', session.user.id)
          .single();

        const authUser: AuthUser = {
          id: session.user.id,
          name: profile?.name || session.user.user_metadata?.full_name || session.user.email,
          picture: profile?.avatar_url || session.user.user_metadata?.avatar_url,
        };
        setUser(authUser);
        setActor({ type: 'user', id: session.user.id });

        // --- 可靠的数据合并逻辑 ---
        // 只有在用户刚刚登录 (SIGNED_IN) 并且我们记录了登录意图时才执行
        const guestId = await AsyncStorage.getItem('guestId');
        if (event === 'SIGNED_IN' && guestId && loginIntentRef.isLoggingIn) {
          console.log(`[Auth] 用户登录成功，开始为新用户 ${session.user.id} 合并访客 ${guestId} 的数据...`);
          loginIntentRef.isLoggingIn = false; // 重置意图
          try {
            await apiFetch('/users/claim-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ guestId }),
            });
            await AsyncStorage.removeItem('guestId'); // 合并成功后删除 guestId
            console.log('[Auth] 数据合并成功，访客ID已清除。');
          } catch (mergeError) {
            console.error('[Auth] 数据合并请求失败', mergeError);
          }
        }
      } else {
        setUser(null);
        const guestId = await getOrCreateGuestId();
        setActor({ type: 'guest', id: guestId });
      }
      setLoadingAuth(false);
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange('INITIAL_SESSION', session);
    });

    // Listen for changes in auth state (e.g., user signs in, signs out, or token is refreshed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange(event, session);
    });

    // Cleanup the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    setLoadingAuth(true);
    try {
      // 在启动 OAuth 流程前，记录下登录意图
      const loginIntentRef = { isLoggingIn: true };

      const redirectTo = Platform.OS === 'web'
        ? window.location.origin
        : `${DEEP_LINK_PREFIX}${OAUTH_CALLBACK_PATH}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (error) throw error;

      if (Platform.OS !== 'web') {
        const authorizationUrl = data?.url;
        if (!authorizationUrl) throw new Error('Supabase did not return an authorization URL.');

        const result = await new Promise<{ type: string }>((resolve) => {
          requestAnimationFrame(() => resolve(WebBrowser.openBrowserAsync(authorizationUrl)));
        });

        if (result.type === 'cancel') {
          throw new Error('User canceled the authentication.');
        }
      }
    } catch (e: any) {
      console.error('[Auth] Login failed:', e);
      throw e;
    } finally {
      setLoadingAuth(false);
    }
  };

  const signOut = async () => {
    setLoadingAuth(true);
    await supabase.auth.signOut();
    setLoadingAuth(false);
  };

  // Helper: build backend API URL
  function buildApi(path: string) {
    const root = (BASE_API_URL || '').replace(/\/$/, '');
    if (!root) throw new Error('BASE_API_URL not configured');
    if (/\/api$/.test(root)) return root + path;
    return root + '/api' + path;
  }

  // apiFetch wraps fetch to attach the Supabase Authorization header
  async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const requestUrl = typeof input === 'string' && !input.startsWith('http')
      ? buildApi(input)
      : input;

    // Supabase client automatically handles token refresh.
    // We just need to get the current session.
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const accessToken = currentSession?.access_token;

    const headers = new Headers(init?.headers as any || {});
    // Only add Authorization header for our own API requests
    const finalUrl = typeof requestUrl === 'string' ? requestUrl : requestUrl.url;
    if (accessToken && (BASE_API_URL && finalUrl.startsWith(BASE_API_URL))) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const cfg: RequestInit = { ...init, headers, credentials: 'include' };
    return fetch(requestUrl, cfg);
  }

  if (loadingAuth && !session) {
    return null; // Or a splash screen
  }

  return (
    <AuthContext.Provider value={{ session, user, actor, loadingAuth, signOut, loginWithGoogle, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
