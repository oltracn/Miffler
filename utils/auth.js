// 导入 AsyncStorage，它是一个简单的、非加密的、异步的、持久化的 Key-Value 存储系统，是 React Native 的内置模块。
import AsyncStorage from '@react-native-async-storage/async-storage';

// 定义一个常量，用作在 AsyncStorage 中存储重定向路由的键名。
// 这个键用于保存在需要认证之前用户所在的页面，以便认证成功后能返回该页面。
const RETURN_TO_STORAGE_KEY = 'auth:return-to';

/**
 * 保存当前路由信息，然后导航到登录屏幕。
 * 这样用户在成功认证后可以被重定向回他们之前的页面。
 * @param {object} navigation - 从 React Navigation 获取的导航对象，用于页面跳转。
 * @param {object} route - 从 React Navigation 获取的路由对象，包含了当前路由的信息（名称、参数等）。
 */
export const navigateToLogin = async (navigation, route) => {
  try {
    // 创建一个对象来保存当前路由的名称和参数。
    const returnTo = {
      name: route.name,
      params: route.params,
    };
    // 使用 AsyncStorage 将路由对象（转换为 JSON 字符串）持久化存储。
    // 'await' 关键字确保了setItem操作完成后再继续执行。
    await AsyncStorage.setItem(RETURN_TO_STORAGE_KEY, JSON.stringify(returnTo));
    console.log(`[Auth] 已存储返回路由: ${route.name}`);
    // 导航到 'Login' 屏幕。
    navigation.navigate('Login');
  } catch (error) {
    // 如果在保存路由或导航到登录页面的过程中发生错误，则打印错误信息。
    console.error("无法保存返回路由或导航到登录页面", error);
    // 作为备用方案，即使保存失败，也直接导航到登录页面。
    navigation.navigate('Login');
  }
};