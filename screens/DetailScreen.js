import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Linking, Button, TouchableOpacity } from 'react-native';

export default function DetailScreen({ route, navigation }) {
  const { musicInfo, url, title: paramTitle } = route.params;
  const results = Array.isArray(musicInfo.results) ? musicInfo.results : [];
  // 优先从 musicInfo.title 获取页面标题
  const pageTitle = (musicInfo && musicInfo.title) || paramTitle || url;

  // 控制台打印API返回的结果
  console.log('API返回的musicInfo:', musicInfo);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 优化后的原始链接展示，带背景区块 */}
      <View style={styles.linkBlock}>
        <TouchableOpacity onPress={() => Linking.openURL(url)}>
          <Text style={styles.linkTitle} numberOfLines={2}>
            {pageTitle}
          </Text>
        </TouchableOpacity>
      </View>

      {results.length === 0 && (
        <Text style={{ marginTop: 20 }}>未识别到音乐信息</Text>
      )}

      {results.map((item, idx) => {
        const { song, artist, album, spotify } = item;
        const coverUrl = spotify && spotify.coverUrl ? spotify.coverUrl : '';
        const spotifyUrl = spotify && spotify.spotifyUrl ? spotify.spotifyUrl : '';
        const albumName = album || (spotify && spotify.album) || '';

        return (
          <View key={idx} style={styles.musicCard}>
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
      })}

      {/* 原始数据展示，便于调试 */}
      <View style={styles.rawBlock}>
        <Text style={styles.rawLabel}>API返回原始数据：</Text>
        <Text style={styles.rawText}>{JSON.stringify(musicInfo, null, 2)}</Text>
      </View>

      <View style={{ marginTop: 32 }}>
        <Button title="返回首页" onPress={() => navigation.popToTop()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, alignItems: 'center', backgroundColor: '#fff' },
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
  rawBlock: { width: '100%', marginTop: 24, backgroundColor: '#f7f7f7', borderRadius: 8, padding: 12 },
  rawLabel: { fontWeight: 'bold', marginBottom: 4 },
  rawText: { fontSize: 13, color: '#333', fontFamily: 'monospace' },
});
