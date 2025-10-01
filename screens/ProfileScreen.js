import React from 'react';
import { View, Text, Image, StyleSheet, Button } from 'react-native';
import { useAuth } from '../authContext';

export default function ProfileScreen({ navigation }) {
  const { user, clearAuth } = useAuth();

  return (
    <View style={styles.container}>
      {user?.picture ? (
        <Image source={{ uri: user.picture }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={{ color: '#fff', fontSize: 24 }}>{(user?.name || 'U').slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.name}>{user?.name || '用户'}</Text>
      <Text style={styles.email}>{user?.id}</Text>

      <View style={{ marginTop: 24 }}>
        <Button title="登出" onPress={async () => { await clearAuth(); navigation.reset({ index: 0, routes: [{ name: 'Home' }] }); }} />
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
