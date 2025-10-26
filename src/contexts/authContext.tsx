import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

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

interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  signOut: () => Promise<void>;
  apiFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Immediately try to get the current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setHydrated(true);
    });

    // Listen for changes in auth state (e.g., user signs in, signs out, or token is refreshed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
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

  // Derive user object from session
  const user: AuthUser | null = session?.user ? {
    id: session.user.id,
    name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
    picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
  } : null;

  if (!hydrated) return null; // could render splash screen

  return (
    <AuthContext.Provider value={{ session, user, signOut, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
