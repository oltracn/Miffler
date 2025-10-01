import React, { useEffect } from 'react';
import 'react-native-get-random-values';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './authContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import AddScreen from './screens/AddScreen';
import DetailScreen from './screens/DetailScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import { getCurrentActor } from './utils/actor';

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
    return (
      <AuthProvider>
        <NavigationContainer>
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
