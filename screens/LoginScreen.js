import React, { useCallback, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Button, View, StyleSheet, Text, ScrollView, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../authContext';
import { supabase } from '../src/lib/supabaseClient';
import { BASE_API_URL } from '@env';

// 统一使用 .env 中的 BASE_API_URL（与 musicStorage.js 一致）
// 支持两种写法：
//  1) BASE_API_URL = https://3000.oltra.cn         (不含 /api)
//  2) BASE_API_URL = https://3000.oltra.cn/api     (已含 /api)
function buildApi(path) {
  if (!BASE_API_URL) throw new Error('BASE_API_URL not configured');
  const root = BASE_API_URL.replace(/\/$/, '');
  if (/\/api$/.test(root)) return root + path; // 已包含 /api
  return root + '/api' + path; // 自动补 /api
}
const DEEP_LINK_PREFIX = 'miffler://'; // scheme 已在 app.json 中声明
const OAUTH_CALLBACK_PATH = 'oauth-callback';

export default function LoginScreen({ navigation }) {
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState(null);
  const [authUrl, setAuthUrl] = useState(null);
  const { setAuth } = useAuth();

  const handleDeepLink = useCallback(async (event) => {
    try {
      const url = event.url;
      if (!url.startsWith(DEEP_LINK_PREFIX)) return;
      // If the deep link is the OAuth callback, let supabase parse session from URL
      const parsed = Linking.parse(url);
      const path = parsed.path || '';
      if (path.endsWith(OAUTH_CALLBACK_PATH)) {
        setFinishing(true);
        setError(null);
        try {
          // supabase-js provides a helper to extract session from the URL (web flows).
          // On native deep link, we can try to call auth.getSessionFromUrl if available, or
          // fall back to parsing the access_token from query if supabase redirects that way.
          // Since @supabase/supabase-js may not support getSessionFromUrl in this RN environment,
          // we attempt to call auth.getUser via the current URL's fragment/query.
          // Try to let supabase handle the session restoration
          const { data, error } = await supabase.auth.getSessionFromUrl({ url });
          if (error) throw error;
          const session = data?.session;
          if (!session) throw new Error('no_session_returned');
          const user = session.user ? { id: session.user.id, name: session.user.user_metadata?.full_name || session.user.user_metadata?.name, picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture } : null;
          await setAuth({ accessToken: session.access_token, refreshToken: session.refresh_token, user });
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          console.log('[Auth] Supabase 登录完成');
        } catch (e) {
          setError(e.message || String(e));
        } finally {
          setFinishing(false);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
    }
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', handleDeepLink);
    // 处理冷启动（App 被 Deep Link 直接拉起）
    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) handleDeepLink({ url: initial });
    })();
    return () => { sub.remove(); };
  }, [handleDeepLink]);

  const startAuth = async () => {
    setStarting(true);
    setError(null);
    try {
      // Use supabase-js to start OAuth with Google provider.
      // Provide redirectTo so supabase redirects back to our deep link.
      const redirectTo = `${DEEP_LINK_PREFIX}${OAUTH_CALLBACK_PATH}`; // e.g. miffler://oauth-callback
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw error;
      const authorizationUrl = data?.url;
      if (!authorizationUrl) throw new Error('no_authorization_url');
      setAuthUrl(authorizationUrl);
      // 预热浏览器（Android 推荐）
      try { await WebBrowser.warmUpAsync(); } catch {}
      let result;
      try {
        result = await WebBrowser.openBrowserAsync(authorizationUrl);
      } catch (browserErr) {
        console.warn('[Auth] openBrowserAsync failed, fallback to Linking.openURL', browserErr);
        try {
          await Linking.openURL(authorizationUrl);
          result = { type: 'opened_via_linking' };
        } catch (fallbackErr) {
          throw new Error('无法打开授权页面: ' + (fallbackErr.message || 'unknown'));
        }
      } finally {
        try { await WebBrowser.coolDownAsync(); } catch {}
      }
      if (result.type === 'cancel') setError('用户取消');
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
  <Text style={styles.title}>登录 (模式2 后端全权兑换)</Text>
  <Text style={{ fontSize: 12, marginBottom: 8, color: '#666' }}>BASE_API_URL: {String(BASE_API_URL || '')}</Text>
      <Button title={starting ? '请求中...' : '开始登录'} disabled={starting || finishing} onPress={startAuth} />
      {(starting || finishing) && <ActivityIndicator style={{ marginTop: 16 }} />}
      {authUrl && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>已打开授权页面</Text>
          <Text selectable style={styles.mono}>{authUrl}</Text>
          <Text style={{ marginTop: 8, fontSize: 12 }}>完成浏览器授权后将自动跳回应用</Text>
        </View>
      )}
      {error && <Text style={{ color: 'red', marginTop: 16 }}>错误: {error}</Text>}
      <Text style={{ fontSize: 12, marginTop: 24, color: '#666' }}>授权成功后会自动返回首页并显示头像。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'flex-start', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  block: { width: '100%', marginTop: 24 },
  blockTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  mono: { fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
});
