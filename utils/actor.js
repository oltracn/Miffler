import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

// 获取当前身份（user优先，没有则用guest）
export async function getCurrentActor() {
  const userId = await AsyncStorage.getItem('userId');
  if (userId) {
    return { type: 'user', id: userId };
  }
  let guestId = await AsyncStorage.getItem('guestId');
  if (!guestId) {
    guestId = uuidv4();
    await AsyncStorage.setItem('guestId', guestId);
  }
  return { type: 'guest', id: guestId };
}
