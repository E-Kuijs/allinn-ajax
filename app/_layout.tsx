import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

import { AppProvider } from '@/src/core/app-context';
import {
  ensureNotificationInfrastructure,
  getNotificationsModuleIfAvailable,
  getPushEnabledPreference,
  LINEUP_ACTION_OPEN,
  requestNotificationPermissionFromUser,
  shouldSetupPushNotifications,
} from '@/src/core/push-notifications';

LogBox.ignoreLogs([
  'AuthApiError: Invalid Refresh Token',
  'Invalid Refresh Token: Refresh Token Not Found',
]);

export const unstable_settings = {
  initialRouteName: 'welcome',
};

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    let sub: { remove: () => void } | null = null;

    const setup = async () => {
      if (!shouldSetupPushNotifications() || disposed) return;

      let Notifications = null;
      try {
        Notifications = await getNotificationsModuleIfAvailable();
      } catch {
        return;
      }
      if (!Notifications || disposed) return;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      try {
        await ensureNotificationInfrastructure();
        const enabled = await getPushEnabledPreference();
        if (enabled) {
          await requestNotificationPermissionFromUser();
        }

        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const actionId = response.actionIdentifier;
          const data = (response.notification.request.content.data ?? {}) as {
            intent?: string;
            newsId?: string;
          };

          if (actionId === LINEUP_ACTION_OPEN || data.intent === 'open-events-lineup') {
            router.push('/(tabs)/events?view=lineup');
            return;
          }
          if (data.intent === 'open-events-live') {
            router.push('/(tabs)/events?view=live');
            return;
          }
          if (data.intent === 'open-chat') {
            router.push('/(tabs)/chat');
            return;
          }
          if (data.intent === 'open-news-item' && data.newsId) {
            router.push({ pathname: '/news/[id]', params: { id: data.newsId } });
          }
        });
      } catch {
        sub?.remove();
        sub = null;
      }
    };
    void setup();

    return () => {
      disposed = true;
      sub?.remove();
    };
  }, [router]);

  return (
    <AppProvider>
      <StatusBar style="light" backgroundColor="#D2001C" />
      <Stack>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="legal"
          options={{
            title: 'Gebruiksvoorwaarden',
            headerStyle: { backgroundColor: '#D2001C' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="listing/[id]"
          options={{
            title: 'Advertentie',
            headerStyle: { backgroundColor: '#D2001C' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="news/[id]"
          options={{
            title: 'Nieuws',
            headerStyle: { backgroundColor: '#D2001C' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="favorites"
          options={{
            title: 'Mijn favorieten',
            headerStyle: { backgroundColor: '#D2001C' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="premium-pricing"
          options={{
            title: 'Premium uitleg',
            headerStyle: { backgroundColor: '#D2001C' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="hub/index"
          options={{
            title: 'All-Inn HUB',
            headerStyle: { backgroundColor: '#0A0A0A' },
            headerTintColor: '#FFD700',
            headerTitleStyle: { fontWeight: '900' },
          }}
        />
        <Stack.Screen
          name="hub/[category]"
          options={{
            title: 'Categorie',
            headerStyle: { backgroundColor: '#0A0A0A' },
            headerTintColor: '#FFD700',
            headerTitleStyle: { fontWeight: '900' },
          }}
        />
        <Stack.Screen
          name="hub/admin"
          options={{
            title: 'Beheerder',
            headerStyle: { backgroundColor: '#0A0A0A' },
            headerTintColor: '#FFD700',
            headerTitleStyle: { fontWeight: '900' },
          }}
        />
      </Stack>
    </AppProvider>
  );
}
