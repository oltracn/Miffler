// 导入 React 相关的钩子函数
import React, { useEffect, useState, useRef } from 'react';
// 导入 Expo 的 WebBrowser模块
import * as WebBrowser from 'expo-web-browser';
// 导入 React Native 提供的 UI 组件
import { Button, StyleSheet, Text, ScrollView, Platform, ActivityIndicator, View } from 'react-native';
// 导入自定义的认证上下文
import { useAuth } from '../src/contexts/authContext';
// 导入 Supabase 客户端
import { supabase } from '../src/lib/supabaseClient';
// 从 .env 文件中导入环境变量
import { BASE_API_URL } from '@env';
// 导入 AsyncStorage 用于本地持久化存储
import AsyncStorage from '@react-native-async-storage/async-storage';

// 深度链接前缀
const DEEP_LINK_PREFIX = 'miffler://';
// OAuth 认证回调路径
const OAUTH_CALLBACK_PATH = 'oauth-callback';
// AsyncStorage 中存储返回路径的键名
const RETURN_TO_STORAGE_KEY = 'auth:return-to';

// 定义并导出登录屏幕组件
export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // 从认证上下文中获取用户、登出函数
  const { user, signOut } = useAuth();
  // 使用 useRef 跟踪之前的用户状态，以检测登录状态的变化
  const prevUser = useRef(user);

  // 此 useEffect 处理登录成功后的导航逻辑
  useEffect(() => {
    const handleSuccessfulLogin = async () => {
      // 检测用户是否刚刚从“未登录”变为“已登录”
      const wasNull = prevUser.current === null;
      const isNowTruthy = user !== null;

      if (wasNull && isNowTruthy) {
        try {
          // 获取并清除存储的返回路径
          const returnToString = await AsyncStorage.getItem(RETURN_TO_STORAGE_KEY);
          await AsyncStorage.removeItem(RETURN_TO_STORAGE_KEY);

          let returnTo = { name: 'Home' }; // 默认返回路径
          if (returnToString) {
            try {
              returnTo = JSON.parse(returnToString);
            } catch (e) {
              console.warn("[Auth] 解析返回路由对象失败，将其视为字符串处理。", e);
              returnTo = { name: returnToString };
            }
          }
          
          console.log(`[Auth] 用户刚刚登录，导航到 ${returnTo.name}.`);
          
          // 重置导航栈到目标屏幕
          navigation.reset({ index: 0, routes: [returnTo] });

        } catch (e) {
          console.error("[Auth] 处理登录后导航失败", e);
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] }); // 出错时返回主屏幕
        }
      }
    };

    handleSuccessfulLogin();
    // 更新 prevUser 的值为当前 user，为下一次 render 做准备
    prevUser.current = user;
  }, [user, navigation]);

  // 开始认证流程
  const startAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[Auth] 开始 OAuth 流程，平台: ${Platform.OS}`);
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
        if (!authorizationUrl) throw new Error('Supabase 未返回授权 URL。');

        console.log('[Auth] 使用 URL 打开浏览器:', authorizationUrl);
        const result = await WebBrowser.openBrowserAsync(authorizationUrl);
        
        if (result.type === 'cancel') {
          setError('用户取消了认证。');
        }
      }
    } catch (e) {
      console.error('--- 认证错误 ---', e);
      setError(e.message || String(e));
    } finally {
      console.log('[Auth] 清理认证流程。');
      setLoading(false);
    }
  };

  // 根据用户登录状态渲染不同 UI
  if (user) {
    // 用户已登录
    return (
      <View style={styles.container}>
        <Text style={styles.title}>欢迎回来</Text>
        <Text style={styles.userInfo}>当前用户: {user.name || user.id}</Text>
        <View style={styles.buttonContainer}>
          <Button title="退出当前账号" onPress={signOut} color="#ff6347" />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="返回" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  // 用户未登录
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>使用 Supabase 登录</Text>
      <Text style={{ fontSize: 12, marginBottom: 8, color: '#666' }}>BASE_API_URL: {String(BASE_API_URL || '')}</Text>
      <Button title={loading ? '处理中...' : '使用 Google 登录'} disabled={loading} onPress={startAuth} />
      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
      {error && <Text style={{ color: 'red', marginTop: 16 }}>错误: {error}</Text>}
      <Text style={{ fontSize: 12, marginTop: 24, color: '#666' }}>
        在浏览器中完成认证后，您将自动被重定向回本应用。
      </Text>
    </ScrollView>
  );
}

// 定义组件的样式
const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  userInfo: { fontSize: 16, marginBottom: 24, textAlign: 'center' },
  buttonContainer: {
    width: '80%',
    marginVertical: 8,
  }
});


// 定义组件的样式
const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'flex-start', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
});
