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