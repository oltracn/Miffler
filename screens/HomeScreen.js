import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking, Image } from 'react-native';
import { useAuth } from '../src/contexts/authContext';
import { getMyMusicHistory } from '../utils/musicStorage';
import { useRoute } from '@react-navigation/native';
import { navigateToLogin } from '../utils/auth';

export default function HomeScreen({ navigation }) {
  const [history, setHistory] = React.useState([]);
  const { user, actor, signOut } = useAuth(); // 获取 actor
  const route = useRoute();

  async function load() {
    if (!actor) return; // 如果 actor 还没准备好，则不加载
    try {
      const data = await getMyMusicHistory(actor); // 传递 actor
      setHistory(data);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    // 首次加载
    load();
    // 每次页面获得焦点时刷新（例如从 Add 或 Detail 返回）
    const unsub = navigation.addListener('focus', () => {
      load();
    });
    return unsub;
  }, [navigation, actor]); // 将 actor 加入依赖项

  // 将添加按钮移动到导航栏右侧（一个加号图标）
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        user ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              {user.picture ? (
                <Image source={{ uri: user.picture }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }} />
              ) : (
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 14 }}>{(user.name||'U').slice(0,1).toUpperCase()}</Text>
                </View>
              )}
              <Text numberOfLines={1} style={{ maxWidth: 120, fontSize: 15 }}>{user.name || '用户'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut} style={{ marginLeft: 16, padding: 4 }}>
              <Text style={{ color: '#FF3B30' }}>退出</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => navigateToLogin(navigation, route)}
            style={{ marginLeft: 12, padding: 8 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="登录"
          >
            <Text style={{ fontSize: 16, color: '#007AFF' }}>Login</Text>
          </TouchableOpacity>
        )
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Add')}
          style={{ marginRight: 12, padding: 8 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="添加项目"
        >
          <Text style={{ fontSize: 22, color: '#007AFF' }}>+</Text>
        </TouchableOpacity>
      ),
      title: '',
    });
  }, [navigation, user, signOut, route]);
  console.log('HomeScreen render start');
  return (
    <View style={styles.container}>
      {/* 添加按钮已移动到顶部导航栏右侧 */}
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const title = item.title || item.urls?.title || item.url || '未知页面';
          const fetchedAt = item.fetched_at || item.created_at || null;
          const musicItems = Array.isArray(item.musics) ? item.musics : [];
          const total = musicItems.length;

          const formattedTime = fetchedAt ? new Date(fetchedAt).toLocaleString() : '';

          return (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Detail', { id: item.id })}
              activeOpacity={1}
            >
              <View style={styles.card}>
                <TouchableOpacity 
                  onPress={() => (item.urls?.url || item.url) && Linking.openURL(item.urls?.url || item.url)} 
                  activeOpacity={0.7}
                >
                  <Text style={styles.title}>{title}</Text>
                </TouchableOpacity>
                <Text style={styles.meta}>{formattedTime} · {total} 首</Text>
                {total > 0 && (
                  <View style={styles.list}>
                    {musicItems.slice(0, 10).map((mi, idx) => {
                      const song = mi.song || mi.title || '未知歌曲';
                      const artist = mi.artist || '';
                      return (
                        <Text key={mi.id || idx} style={styles.listItem} numberOfLines={1}>
                          {idx + 1}. {song}{artist ? ` by ${artist}` : ''}
                        </Text>
                      );
                    })}
                    {total > 10 && (
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('Detail', { id: item.id })}
                        activeOpacity={1}
                      >
                        <Text style={styles.more}>...还有 {total - 10} 首，查看详情</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>暂无历史</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', marginVertical: 8, padding: 12, borderRadius: 8, elevation: 2 },
  title: { fontWeight: 'bold', marginBottom: 6, fontSize: 16 },
  meta: { color: '#666', marginBottom: 8, fontSize: 12 },
  list: { marginTop: 4 },
  listItem: { color: '#333', fontSize: 14, marginBottom: 2 },
  more: { color: '#007AFF', fontSize: 13, marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 32, color: '#888' },
});
