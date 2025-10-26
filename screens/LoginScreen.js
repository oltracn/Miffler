// 导入 React 相关的钩子函数
import React, { useEffect, useState, useRef } from 'react';
// 导入 React Native 提供的 UI 组件
import { Button, StyleSheet, Text, ScrollView, ActivityIndicator, View } from 'react-native';
// 导入自定义的认证上下文
import { useAuth } from '../src/contexts/authContext';
// 从 .env 文件中导入环境变量
import { BASE_API_URL } from '@env';
// 导入 AsyncStorage 用于本地持久化存储
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage 中存储返回路径的键名
const RETURN_TO_STORAGE_KEY = 'auth:return-to';

// 定义并导出登录屏幕组件
export default function LoginScreen({ navigation }) {
  const [error, setError] = useState(null);
  // 从认证上下文中获取用户、登出函数
  const { user, signOut, loginWithGoogle, loadingAuth } = useAuth();
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
  const handleLogin = async () => {
    setError(null);
    try {
      // 调用 context 中已经封装好的、更健壮的登录函数
      await loginWithGoogle();
    } catch (e) {
      console.error('--- 认证错误 ---', e);
      setError(e.message || String(e));
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
      <Button title={loadingAuth ? '处理中...' : '使用 Google 登录'} disabled={loadingAuth} onPress={handleLogin} />
      {loadingAuth && <ActivityIndicator style={{ marginTop: 16 }} />}
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