import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { saveMusicInfo } from '../utils/musicStorage';
import { BASE_API_URL } from '@env';

export default function AddScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url) {
      Alert.alert('请输入链接');
      return;
    }
    setLoading(true);
    try {
      if (!BASE_API_URL) throw new Error('BASE_API_URL not configured in .env');
      const response = await fetch(`${BASE_API_URL}/api/urls/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `解析失败: ${response.status}`);
      }
      const data = await response.json();

      // 保存到后端 guest 存储，成功后只使用后端返回的 event.id 导航到 Detail（Detail 将从 DB 读取数据）
      try {
        const saved = await saveMusicInfo(data);
        // saved 应该包含 { event, items }
        if (saved && saved.event && saved.event.id) {
          Alert.alert('已保存', '音乐信息已保存到历史');
          // 仅传入 id，让 Detail 从后端读取最新记录
          navigation.navigate('Detail', { id: saved.event.id });
        } else {
          // 未收到后端标准 event 时提示用户，不再使用本地 parsed data 打开 Detail
          console.error('saveMusicInfo returned unexpected shape', saved);
          Alert.alert('保存失败', '服务器未返回已保存的记录，无法打开详情');
        }
      } catch (saveErr) {
        console.error('保存失败', saveErr);
        Alert.alert('保存失败', saveErr.message || String(saveErr));
      }
    } catch (error) {
      Alert.alert('请求失败', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="请输入播客或音乐链接"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button title="提交" onPress={handleSubmit} disabled={loading} />
      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginBottom: 16 },
});
