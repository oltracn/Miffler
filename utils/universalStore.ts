import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Supabase 需要一个符合其 Storage 接口的对象
// 这个接口包含 setItem, getItem, removeItem 方法
interface StorageAdapter {
  setItem: (key: string, value: string) => Promise<void> | void;
  getItem: (key: string) => Promise<string | null> | string | null;
  removeItem: (key: string) => Promise<void> | void;
}

export const universalStore: StorageAdapter = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        // 在 Web 端，我们使用 localStorage
        localStorage.setItem(key, value);
      } catch (e) {
        console.error('localStorage: Failed to save item.', e);
      }
    } else {
      // 在原生端 (iOS/Android)，我们使用 expo-secure-store
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (e) {
        console.error('SecureStore: Failed to save item.', e);
      }
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error('localStorage: Failed to get item.', e);
        return null;
      }
    } else {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (e) {
        console.error('SecureStore: Failed to get item.', e);
        return null;
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('localStorage: Failed to remove item.', e);
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (e) {
        console.error('SecureStore: Failed to remove item.', e);
      }
    }
  },
};