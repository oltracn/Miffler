import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import AddScreen from './screens/AddScreen';
import DetailScreen from './screens/DetailScreen';

export type RootStackParamList = {
  Home: undefined;
  Add: undefined;
  Detail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
        <Stack.Screen name="Add" component={AddScreen} options={{ title: '添加链接' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: '详情' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
