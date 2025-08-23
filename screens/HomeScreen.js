import React from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  // TODO: 用 state/AsyncStorage 存储历史
  const [history, setHistory] = React.useState([]);

  // 示例数据
  // const history = [
  //   { id: '1', url: 'https://example.com', summary: '音乐信息摘要' },
  // ];

  return (
    <View style={styles.container}>
      <Button title="添加链接" onPress={() => navigation.navigate('Add')} />
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('Detail', { id: item.id })}>
            <View style={styles.card}>
              <Text style={styles.url}>{item.url}</Text>
              <Text numberOfLines={2}>{item.summary}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>暂无历史</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', marginVertical: 8, padding: 12, borderRadius: 8, elevation: 2 },
  url: { fontWeight: 'bold', marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 32, color: '#888' },
});
