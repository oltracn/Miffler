import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { getMyMusicHistory } from '../utils/musicStorage';

export default function HomeScreen({ navigation }) {
  const [history, setHistory] = React.useState([]);

  async function load() {
    try {
      const data = await getMyMusicHistory();
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
  }, [navigation]);

  // 将添加按钮移动到导航栏右侧（一个加号图标）
  useLayoutEffect(() => {
    navigation.setOptions({
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
    });
  }, [navigation]);
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
