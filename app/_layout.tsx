import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export const unstable_settings = {
  initialRouteName: 'welcome',
};

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#D2001C" />
      <Stack>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="listing/[id]"
          options={{
            title: 'Advertentie',
            headerStyle: { backgroundColor: '#D2001C' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
      </Stack>
    </>
  );
}