import React, { useEffect } from 'react';
// ActivityIndicator 用于在跳转前显示加载动画
import { View, Text, Image, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/contexts/authContext';
import { useRoute } from '@react-navigation/native';
import { navigateToLogin } from '../utils/auth'; // 1. 导入我们创建的新函数

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth(); // `signOut` 是 context 中提供的正确函数名
  const route = useRoute(); // 2. 获取当前页面的路由信息

  // 3. 使用 useEffect 钩子在页面加载时检查用户状态
  useEffect(() => {
    // `user` 在加载时可能是 undefined，加载完后是 null（未登录）或一个对象（已登录）
    if (user === null) {
      // 4. 如果用户明确为未登录状态，则调用辅助函数
      console.log('[Auth] ProfileScreen 需要登录, 跳转到登录页...');
      navigateToLogin(navigation, route);
    }
  }, [user, navigation, route]);

  // 如果 `user` 不存在 (正在加载或即将跳转), 显示加载指示器
  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 用户已登录，显示原始页面内容
  return (
    <View style={styles.container}>
      {user.picture ? (
        <Image source={{ uri: user.picture }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={{ color: '#fff', fontSize: 24 }}>{(user.name || 'U').slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.name}>{user.name || '用户'}</Text>
      <Text style={styles.email}>{user.id}</Text>

      <View style={{ marginTop: 24 }}>
        <Button title="登出" onPress={async () => { 
          await signOut(); 
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] }); 
        }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '600' },
  email: { color: '#666', marginTop: 4 }
});
