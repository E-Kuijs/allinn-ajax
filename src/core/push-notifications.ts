import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { NewsItem } from '@/src/core/mock-content';

export const PUSH_ENABLED_KEY = 'push:enabled';
const MATCH_SCHEDULE_IDS_KEY = 'push:match:schedule-ids';
const MATCH_SCHEDULE_KEY = 'push:match:schedule-key';
const LINEUP_LAST_EVENT_KEY = 'push:lineup:last-event-id';
const NEWS_BOOTSTRAP_KEY = 'push:news:bootstrapped';
const NEWS_SEEN_IDS_KEY = 'push:news:seen-ids';

export const LINEUP_NOTIFICATION_CATEGORY = 'lineup-action-category';
export const LINEUP_ACTION_OPEN = 'open-lineup';
const IS_EXPO_GO =
  Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

type NotificationsModule = typeof import('expo-notifications');
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

type MatchPushPayload = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTs: number;
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => !!value)));
}

export function isPushRuntimeSupported() {
  return !IS_EXPO_GO;
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (!isPushRuntimeSupported()) return null;
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((module) => module)
      .catch(() => null);
  }
  return notificationsModulePromise;
}

export async function getNotificationsModuleIfAvailable() {
  return getNotificationsModule();
}

export function shouldSetupPushNotifications() {
  return isPushRuntimeSupported();
}

export async function getNotificationPermissionGranted() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted;
}

async function hasNotificationPermission() {
  return getNotificationPermissionGranted();
}

async function canSendPushes() {
  const enabled = await getPushEnabledPreference();
  if (!enabled) return false;
  return hasNotificationPermission();
}

async function saveSeenNewsIds(ids: string[]) {
  const compact = uniqueStrings(ids).slice(0, 120);
  await AsyncStorage.setItem(NEWS_SEEN_IDS_KEY, JSON.stringify(compact));
}

async function getSeenNewsIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(NEWS_SEEN_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? uniqueStrings(parsed) : [];
  } catch {
    return [];
  }
}

function isBreakingNews(item: NewsItem) {
  const hay = `${item.title} ${item.summary} ${item.body}`.toLowerCase();
  return [
    'trainer',
    'coach',
    'technisch directeur',
    'bestuurslid',
    'raad van commissarissen',
    'aankoop',
    'tekent',
    'transfersom',
    'nieuw contract',
  ].some((word) => hay.includes(word));
}

export async function ensureNotificationInfrastructure() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#D2001C',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await Notifications.setNotificationCategoryAsync(LINEUP_NOTIFICATION_CATEGORY, [
    {
      identifier: LINEUP_ACTION_OPEN,
      buttonTitle: 'Naar opstelling',
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function getPushEnabledPreference() {
  const raw = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
  if (raw === null) return true;
  return raw === '1';
}

export async function setPushEnabledPreference(enabled: boolean) {
  await AsyncStorage.setItem(PUSH_ENABLED_KEY, enabled ? '1' : '0');
}

export async function requestNotificationPermissionFromUser() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function getExpoPushTokenForCurrentProject() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    '';
  if (!projectId) return null;

  const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenRes.data?.trim() || null;
}

export async function scheduleMatchPushes(match: MatchPushPayload | null) {
  if (!match) {
    await clearScheduledMatchPushes();
    return;
  }
  if (!(await canSendPushes())) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const matchKey = `${match.id}:${match.kickoffTs}`;
  const currentKey = (await AsyncStorage.getItem(MATCH_SCHEDULE_KEY)) ?? '';
  if (currentKey === matchKey) return;

  await clearScheduledMatchPushes();

  const ids: string[] = [];
  const now = Date.now();
  const twelveHoursBeforeTs = match.kickoffTs - 12 * 60 * 60 * 1000;
  const minFutureMs = 60 * 1000;

  if (twelveHoursBeforeTs > now + minFutureMs) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚽ Matchday!',
        body: `Nog 12 uur tot ${match.homeTeam} - ${match.awayTeam}. Praat mee met supporters in de fan chat.`,
        data: { intent: 'open-chat' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(twelveHoursBeforeTs),
      },
    });
    ids.push(id);
  }

  if (match.kickoffTs > now + minFutureMs) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏱️ Wedstrijd begint',
        body: `${match.homeTeam} - ${match.awayTeam} begint nu. Volg live standen in de app.`,
        data: { intent: 'open-events-live' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(match.kickoffTs),
      },
    });
    ids.push(id);
  }

  await AsyncStorage.multiSet([
    [MATCH_SCHEDULE_IDS_KEY, JSON.stringify(ids)],
    [MATCH_SCHEDULE_KEY, matchKey],
  ]);
}

export async function clearScheduledMatchPushes() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    await AsyncStorage.multiRemove([MATCH_SCHEDULE_IDS_KEY, MATCH_SCHEDULE_KEY]);
    return;
  }

  try {
    const raw = await AsyncStorage.getItem(MATCH_SCHEDULE_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      const ids = Array.isArray(parsed) ? parsed : [];
      for (const id of ids) {
        if (!id) continue;
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }
  } catch {
    // ignore invalid cache
  }
  await AsyncStorage.multiRemove([MATCH_SCHEDULE_IDS_KEY, MATCH_SCHEDULE_KEY]);
}

export async function notifyLineupPublished(input: {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
}) {
  if (!(await canSendPushes())) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  const eventId = input.eventId.trim();
  if (!eventId) return;

  const previous = (await AsyncStorage.getItem(LINEUP_LAST_EVENT_KEY)) ?? '';
  if (previous === eventId) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 Opstelling bekend!',
      body: `Bekijk nu de basisopstelling van Ajax (${input.homeTeam} - ${input.awayTeam}).`,
      data: { intent: 'open-events-lineup' },
      sound: true,
      categoryIdentifier: LINEUP_NOTIFICATION_CATEGORY,
    },
    trigger: null,
  });

  await AsyncStorage.setItem(LINEUP_LAST_EVENT_KEY, eventId);
}

export async function notifyBreakingAjaxNews(items: NewsItem[]) {
  if (!(await canSendPushes())) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  const ids = uniqueStrings(items.map((item) => item.id));
  if (!ids.length) return;

  const bootstrapped = (await AsyncStorage.getItem(NEWS_BOOTSTRAP_KEY)) === '1';
  const seen = await getSeenNewsIds();
  const seenSet = new Set(seen);

  if (!bootstrapped) {
    await saveSeenNewsIds(ids);
    await AsyncStorage.setItem(NEWS_BOOTSTRAP_KEY, '1');
    return;
  }

  const freshImportant = items
    .filter((item) => !seenSet.has(item.id) && isBreakingNews(item))
    .slice(0, 2);

  for (const item of freshImportant) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Breaking Ajax nieuws',
        body: item.title,
        data: { intent: 'open-news-item', newsId: item.id },
        sound: true,
      },
      trigger: null,
    });
  }

  await saveSeenNewsIds([...ids, ...seen]);
}
