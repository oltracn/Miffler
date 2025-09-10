import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Linking, Button, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { BASE_API_URL } from '@env';

export default function DetailScreen({ route, navigation }) {
  const { musicInfo: initialMusicInfo, url: paramUrl, title: paramTitle, id } = route.params || {};
  // keep musicInfo null initially so we can normalize any incoming initialMusicInfo shape
  const [musicInfo, setMusicInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEventById = async () => {
    if (!id) return;
    setError(null);
    try {
      setLoading(true);
      if (!BASE_API_URL) {
        const msg = 'BASE_API_URL not configured in .env';
        console.warn(msg);
        setError(msg);
        return;
      }
  // 新 RESTful 路径，直接用 /api/sniffs/:id
  const res = await fetch(`${BASE_API_URL}/api/sniffs/${encodeURIComponent(id)}`);
      if (!res.ok) {
        const msg = `fetch event failed: ${res.status}`;
        console.warn(msg);
        setError(msg);
        setMusicInfo(null);
        return;
      }
      const body = await res.json();
      const ev = body; // 后端返回单个 sniff 对象
      if (ev) {
        const results = (ev.musics || []).map((it) => ({
          song: it.song || null,
          artist: it.artist || null,
          album: it.album || null,
          coverUrl: it.cover_url || it.coverUrl || (it.spotify && (it.spotify.coverUrl || it.spotify.cover_url)) || null,
          spotifyUrl: it.spotify_url || it.spotifyUrl || (it.spotify && (it.spotify.url || it.spotifyUrl)) || null,
          meta: it.meta || null,
        }));
        setMusicInfo({ results, title: ev.title || ev.urls?.title || paramTitle, url: ev.urls?.url || paramUrl, raw: ev });
      } else {
        setError('未找到该抓取记录');
      }
    } catch (e) {
      console.error('failed to load event by id', e);
      setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // Detail now always loads the canonical event from backend by id
  useEffect(() => {
    // whenever id changes, reload from backend
    setMusicInfo(null);
    if (id) fetchEventById();
  }, [id]);

  useEffect(() => {
    if (!musicInfo && id) fetchEventById();
  }, [id, musicInfo]);

  const results = Array.isArray(musicInfo?.results) ? musicInfo.results : [];
  const pageTitle = (musicInfo && musicInfo.title) || paramTitle || paramUrl;
  const pageUrl = (musicInfo && musicInfo.url) || paramUrl || '';

  return (
    <View style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={(item, idx) => idx.toString()}
        ListHeaderComponent={() => (
          <>
            <View style={styles.linkBlock}>
              <TouchableOpacity onPress={() => pageUrl && Linking.openURL(pageUrl)}>
                <Text style={styles.linkTitle} numberOfLines={2}>
                  {pageTitle}
                </Text>
              </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
            {!loading && results.length === 0 && !error && (
              <Text style={{ marginTop: 20 }}>未识别到音乐信息</Text>
            )}

            {error && (
              <View style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text>
                <Button title="重试" onPress={() => fetchEventById()} />
              </View>
            )}
          </>
        )}
        ListFooterComponent={() => (
          <View style={{ marginTop: 32, marginBottom: 20 }}>
            <Button title="返回首页" onPress={() => navigation.popToTop()} />
          </View>
        )}
        renderItem={({ item }) => {
          const { song, artist, album, coverUrl, spotifyUrl } = item;
          const albumName = album || '';

          return (
            <View style={styles.musicCard}>
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.musicCoverLarge}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.musicCoverLarge, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#aaa', fontSize: 14 }}>无封面</Text>
                </View>
              )}
              <View style={styles.musicInfo}>
                <Text style={styles.songName} numberOfLines={1}>{song || '未知歌曲'}</Text>
                <Text style={styles.artistName} numberOfLines={1}>{artist || '未知艺人'}</Text>
                <Text style={styles.albumName} numberOfLines={1}>{albumName ? albumName : '未知专辑'}</Text>
                {spotifyUrl ? (
                  <TouchableOpacity
                    style={styles.spotifyBtn}
                    onPress={() => Linking.openURL(spotifyUrl)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.spotifyBtnText}>去 Spotify 收听</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        }}
        initialNumToRender={10}  // 初始渲染项数
        maxToRenderPerBatch={10} // 每批渲染项数
        windowSize={5}           // 视窗大小
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  linkBlock: {
    width: '100%',
    backgroundColor: '#f0f4fa',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    alignItems: 'center',
  },
  linkTitle: { fontSize: 18, color: '#007AFF', fontWeight: 'bold', textAlign: 'left' },
  musicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  musicCoverLarge: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#eee',
    marginRight: 18,
  },
  musicInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  songName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 15,
    color: '#444',
    marginBottom: 2,
  },
  albumName: {
    fontSize: 14,
    color: '#888',
    marginBottom: 6,
  },
  spotifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DB954',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  spotifyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
