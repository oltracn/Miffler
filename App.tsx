import React, { useEffect } from 'react';
import 'react-native-get-random-values';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/authContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import AddScreen from './screens/AddScreen';
import DetailScreen from './screens/DetailScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import { getCurrentActor } from './utils/actor';
import * as Linking from 'expo-linking';
import { supabase } from './src/lib/supabaseClient';

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix],
  config: {
    screens: {
      Home: 'home',
      Add: 'add',
      Detail: 'detail/:id',
      Login: 'login',
      Profile: 'profile',
    },
  },
};

export type RootStackParamList = {
  Home: undefined;
  Add: undefined;
  Detail: { id: string };
  Login: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  React.useEffect(() => {
    getCurrentActor().catch(console.error);
  }, []);

  // This effect handles the OAuth deep link from the browser
  useEffect(() => {
    const handleUrl = (url: string) => {
      if (!url) return;

      let targetUrl = url;
      // In Expo Go, the redirect URL might be wrapped. We need to extract the actual URL.
      if (targetUrl.startsWith('miffler://expo-development-client')) {
        const decoded = decodeURIComponent(targetUrl);
        const urlParams = new URLSearchParams(new URL(decoded).search);
        const extractedUrl = urlParams.get('url');
        if (extractedUrl) {
          targetUrl = extractedUrl;
        }
      }

      const params = new URLSearchParams(targetUrl.split('#')[1]);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).catch(err => {
          console.error('[App] Error setting session from URL', err);
        });
      }
    };

    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleUrl(initialUrl);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    handleInitialUrl();

    return () => {
      subscription.remove();
    };
  }, []);

    return (
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
            <Stack.Screen name="Add" component={AddScreen} options={{ title: '添加链接' }} />
            <Stack.Screen name="Detail" component={DetailScreen} options={{ title: '详情' }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Google登录' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '个人资料' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    );
}