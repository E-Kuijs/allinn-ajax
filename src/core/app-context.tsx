import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, Vibration } from 'react-native';

import { defaultContent, defaultProfanityWords, defaultSettings } from '@/src/core/defaults';
import { computeEntitlements, getLocalDateKey, toTier } from '@/src/core/entitlements';
import { getEmailVipRole } from '@/src/core/family-emails';
import {
  getExpoPushTokenForCurrentProject,
  getNotificationPermissionGranted,
  PUSH_ENABLED_KEY,
} from '@/src/core/push-notifications';
import { supabase } from '@/src/core/supabaseClient';
import {
  ActionResult,
  AppContent,
  AppSettings,
  ChatUsage,
  Entitlements,
  Membership,
  Profile,
  UserSocialLinks,
} from '@/src/core/types';

type AuthPayload = {
  email: string;
  password: string;
};

type RegisterPayload = AuthPayload & {
  displayName: string;
  username: string;
  acceptedTermsVersion: string;
};

type PopupTargetUser = {
  id: string;
  displayName: string;
  username: string;
  email: string;
};

type AppContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  membership: Membership;
  settings: AppSettings;
  content: AppContent;
  entitlements: Entitlements;
  blockedUsers: string[];
  profanityWords: string[];
  avatarUri: string | null;
  headerText: string;
  socialLinks: UserSocialLinks;
  favoriteNewsIds: string[];
  favoriteListingIds: string[];
  signIn: (payload: AuthPayload) => Promise<ActionResult>;
  signUp: (payload: RegisterPayload) => Promise<ActionResult>;
  resendSignupConfirmation: (email: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  saveProfile: (input: Partial<Pick<Profile, 'displayName' | 'username' | 'aboutMe'>>) => Promise<ActionResult>;
  saveAvatar: (uri: string | null) => Promise<ActionResult>;
  saveHeaderText: (text: string) => Promise<ActionResult>;
  saveSocialLinks: (input: Partial<UserSocialLinks>) => Promise<ActionResult>;
  saveWelcomeInfoLinkUrl: (url: string) => Promise<ActionResult>;
  savePaymentPortalUrl: (url: string) => Promise<ActionResult>;
  saveLotteryWinnerContent: (input: {
    winnerName: string;
    winnerInterview: string;
    winnerPhotoUrl: string;
    winnerVideoUrl: string;
  }) => Promise<ActionResult>;
  toggleNewsFavorite: (newsId: string) => Promise<ActionResult>;
  toggleListingFavorite: (listingId: string) => Promise<ActionResult>;
  isNewsFavorite: (newsId: string) => boolean;
  isListingFavorite: (listingId: string) => boolean;
  acceptTerms: (version: string) => Promise<ActionResult>;
  sendChatMessage: (message: string, groupId?: string) => Promise<ActionResult>;
  sendListingMessage: (listingId: string, message: string, recipientId?: string) => Promise<ActionResult>;
  blockUser: (userId: string) => Promise<ActionResult>;
  unblockUser: (userId: string) => Promise<ActionResult>;
  findPopupTargets: (query: string) => Promise<{ ok: boolean; users: PopupTargetUser[]; message?: string }>;
  sendPopupToUser: (input: { targetUserId: string; title: string; body: string }) => Promise<ActionResult>;
  sendFanPopup: (input: { name: string; message: string }) => Promise<ActionResult>;
  popupMuteUntil: number;
  setPopupMuteForMinutes: (minutes: 0 | 15 | 23 | 30 | 45 | 60) => Promise<ActionResult>;
};

const initialMembership: Membership = {
  tier: 'FREE',
  status: 'active',
  startedAt: null,
  expiresAt: null,
};

const defaultUserSocialLinks: UserSocialLinks = {
  ajaxYoutubeUrl: 'https://www.youtube.com/@AFCAjax',
  spotifyUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  threadsUrl: '',
  tiktokUrl: '',
  xUrl: '',
  youtubePersonalUrl: '',
};

const AppContext = createContext<AppContextValue | undefined>(undefined);
const PAID_MEMBERSHIP_TIERS: Membership['tier'][] = [
  'PREMIUM_MONTH',
  'PREMIUM_6M',
  'PREMIUM_12M',
  'PREMIUM_LIFETIME',
];

function containsProfanity(message: string, words: string[]): boolean {
  const leetMap: Record<string, string> = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '8': 'b',
    '@': 'a',
    '$': 's',
    '!': 'i',
    '|': 'i',
    '+': 't',
  };

  const toLeetNormalized = (input: string) =>
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split('')
      .map((char) => leetMap[char] ?? char)
      .join('');

  const toSpaced = (input: string) =>
    toLeetNormalized(input)
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const toCompact = (input: string) => toLeetNormalized(input).replace(/[^a-z0-9]+/g, '');
  const escapeRegExp = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const spacedMessage = toSpaced(message);
  const compactMessage = toCompact(message);

  return words.some((word) => {
    const spacedWord = toSpaced(word);
    const compactWord = toCompact(word);
    if (!compactWord) return false;

    if (compactMessage.includes(compactWord)) return true;
    if (!spacedWord) return false;

    const boundaryRegex = new RegExp(`(?:^|\\s)${escapeRegExp(spacedWord)}(?:\\s|$)`, 'i');
    return boundaryRegex.test(spacedMessage);
  });
}

function normalizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const uuidV1ToV5Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV1ToV5Regex.test(trimmed) ? trimmed : null;
}

function isInvalidRefreshTokenError(message?: string): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('refresh token') && (normalized.includes('not found') || normalized.includes('invalid'));
}

async function clearSupabaseAuthStorage(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const authKeys = keys.filter(
    (key) =>
      key.startsWith('supabase.auth.token') ||
      (key.startsWith('sb-') && key.endsWith('-auth-token'))
  );

  if (authKeys.length > 0) {
    await AsyncStorage.multiRemove(authKeys);
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [content, setContent] = useState<AppContent>(defaultContent);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership>(initialMembership);
  const [chatUsage, setChatUsage] = useState<ChatUsage>({
    dateKey: getLocalDateKey(),
    messagesSent: 0,
  });
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [profanityWords, setProfanityWords] = useState<string[]>(defaultProfanityWords);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [headerText, setHeaderText] = useState('VAK 428 stoel 214');
  const [socialLinks, setSocialLinks] = useState<UserSocialLinks>(defaultUserSocialLinks);
  const [favoriteNewsIds, setFavoriteNewsIds] = useState<string[]>([]);
  const [favoriteListingIds, setFavoriteListingIds] = useState<string[]>([]);
  const [isFoundingPremium, setIsFoundingPremium] = useState(false);
  const [popupMuteUntil, setPopupMuteUntil] = useState(0);

  const entitlements = useMemo(() => {
    const emailRole = getEmailVipRole(user?.email);
    const isEmailVip = emailRole === 'developer' || emailRole === 'special';

    return computeEntitlements({
      settings,
      tier: membership.tier,
      isVip: (profile?.isVip ?? false) || isEmailVip,
      isDeveloper: emailRole === 'developer',
      isFoundingPremium,
      dailyChatSent: chatUsage.messagesSent,
    });
  }, [settings, membership.tier, profile?.isVip, chatUsage.messagesSent, user?.email, isFoundingPremium]);

  async function syncPushToken(currentUser: User) {
    try {
      const enabledRaw = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
      const pushEnabled = enabledRaw !== '0';

      if (!pushEnabled) {
        await supabase
          .from('user_push_tokens')
          .update({ enabled: false })
          .eq('user_id', currentUser.id);
        return;
      }

      const hasPermission = await getNotificationPermissionGranted();
      if (!hasPermission) return;
      const expoPushToken = await getExpoPushTokenForCurrentProject();
      if (!expoPushToken) return;

      await supabase.rpc('upsert_push_token', {
        p_expo_push_token: expoPushToken,
        p_device_key: `${Platform.OS}:${expoPushToken.slice(-24)}`,
        p_platform: Platform.OS,
        p_enabled: true,
      });
    } catch {
      // Push-token sync is best effort.
    }
  }

  async function loadGlobalState() {
    const [settingsRes, contentRes, profanityRes] = await Promise.all([
      supabase.from('app_settings').select('*').limit(1).maybeSingle(),
      supabase.from('app_content').select('*').limit(1).maybeSingle(),
      supabase.from('profanity_words').select('word').eq('is_active', true).limit(500),
    ]);

    if (!settingsRes.error && settingsRes.data) {
      const row = settingsRes.data as any;
      setSettings({
        launchDate: row.launch_date ?? defaultSettings.launchDate,
        launchWindowDays: Number(row.launch_window_days ?? defaultSettings.launchWindowDays),
        monthlyPriceEur: Number(row.monthly_price_eur ?? defaultSettings.monthlyPriceEur),
        discount6mPct: Number(row.discount_6m_pct ?? defaultSettings.discount6mPct),
        discount12mPct: Number(row.discount_12m_pct ?? defaultSettings.discount12mPct),
        discountLifetimePct: Number(row.discount_lifetime_pct ?? defaultSettings.discountLifetimePct),
        firstPaidMemberLimit: Number(row.first_paid_member_limit ?? defaultSettings.firstPaidMemberLimit),
        freeDailyChatLimit: Number(row.free_daily_chat_limit ?? defaultSettings.freeDailyChatLimit),
        scorePopupPremiumOnly:
          row.score_popup_premium_only ?? defaultSettings.scorePopupPremiumOnly,
        marketplaceReadOnlyForFree:
          row.marketplace_read_only_for_free ?? defaultSettings.marketplaceReadOnlyForFree,
      });
    }

    if (!contentRes.error && contentRes.data) {
      const row = contentRes.data as any;
      setContent({
        welcomeTitle: row.welcome_title ?? defaultContent.welcomeTitle,
        welcomeText: row.welcome_text ?? defaultContent.welcomeText,
        welcomeBannerUrl: row.welcome_banner_url ?? defaultContent.welcomeBannerUrl,
        welcomeCornerImageUrl: row.welcome_corner_image_url ?? defaultContent.welcomeCornerImageUrl,
        welcomeInfoLinkUrl: row.welcome_info_link_url ?? defaultContent.welcomeInfoLinkUrl,
        paymentPortalUrl: row.payment_portal_url ?? defaultContent.paymentPortalUrl,
        lotteryWinnerName: row.lottery_winner_name ?? defaultContent.lotteryWinnerName,
        lotteryWinnerInterview: row.lottery_winner_interview ?? defaultContent.lotteryWinnerInterview,
        lotteryWinnerPhotoUrl: row.lottery_winner_photo_url ?? defaultContent.lotteryWinnerPhotoUrl,
        lotteryWinnerVideoUrl: row.lottery_winner_video_url ?? defaultContent.lotteryWinnerVideoUrl,
        termsVersion: row.terms_version ?? defaultContent.termsVersion,
        termsText: row.terms_text ?? defaultContent.termsText,
        webshopFsideUrl: row.webshop_fside_url ?? defaultContent.webshopFsideUrl,
        webshopAfcaUrl: row.webshop_afca_url ?? defaultContent.webshopAfcaUrl,
        webshopAjaxUrl: row.webshop_ajax_url ?? defaultContent.webshopAjaxUrl,
        tuneInUrl: row.tune_in_url ?? defaultContent.tuneInUrl,
        arenaMapUrl: row.arena_map_url ?? defaultContent.arenaMapUrl,
        cafesMapUrl: row.cafes_map_url ?? defaultContent.cafesMapUrl,
        restaurantsMapUrl: row.restaurants_map_url ?? defaultContent.restaurantsMapUrl,
        stadiumRouteUrl: row.stadium_route_url ?? defaultContent.stadiumRouteUrl,
      });
    }

    if (!profanityRes.error && profanityRes.data?.length) {
      const words = profanityRes.data
        .map((row: any) => row.word)
        .filter((w: string | null) => typeof w === 'string' && !!w.trim());
      if (words.length) {
        setProfanityWords(words);
      }
    }
  }

  const consumeUnreadPopupNotifications = useCallback(async (currentUserId: string, muteUntilOverride?: number) => {
    const popupRes = await supabase
      .from('notifications')
      .select('id,type,title,body,created_at')
      .eq('user_id', currentUserId)
      .in('type', ['admin_popup', 'fan_popup'])
      .eq('is_read', false)
      .order('created_at', { ascending: true })
      .limit(10);

    if (popupRes.error || !popupRes.data?.length) return;

    const rows = popupRes.data as {
      id: string;
      type: string | null;
      title: string | null;
      body: string | null;
      created_at: string | null;
    }[];

    const ids = rows.map((row) => row.id).filter((id) => typeof id === 'string' && !!id.trim());
    if (ids.length) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .in('id', ids);
    }

    const mutedUntil = typeof muteUntilOverride === 'number' ? muteUntilOverride : popupMuteUntil;
    if (mutedUntil > Date.now()) {
      return;
    }

    const latest = rows[rows.length - 1];
    const title = latest.title?.trim() || 'Nieuwe melding';
    const body = latest.body?.trim() || 'Je hebt een nieuwe update ontvangen.';
    const extra = rows.length > 1 ? `\n\n+ ${rows.length - 1} eerdere melding(en).` : '';
    Vibration.vibrate([0, 130, 80, 130, 80, 220]);
    Alert.alert(title, `${body}${extra}`);
  }, [popupMuteUntil]);

  const loadUserState = useCallback(async (currentUser: User) => {
    const today = getLocalDateKey();
    const [
      profileRes,
      membershipRes,
      usageRes,
      blockedRes,
      localAvatar,
      localHeaderText,
      localSocialLinksRaw,
      localFavoriteNewsRaw,
      localFavoriteListingsRaw,
      localPopupMuteUntilRaw,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
      supabase
        .from('memberships')
        .select('*')
        .eq('user_id', currentUser.id)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('chat_daily_usage')
        .select('messages_sent')
        .eq('user_id', currentUser.id)
        .eq('usage_date', today)
        .maybeSingle(),
      supabase.from('blocked_users').select('blocked_id').eq('blocker_id', currentUser.id),
      AsyncStorage.getItem(`profile-avatar:${currentUser.id}`),
      AsyncStorage.getItem(`header-text:${currentUser.id}`),
      AsyncStorage.getItem(`social-links:${currentUser.id}`),
      AsyncStorage.getItem(`favorites-news:${currentUser.id}`),
      AsyncStorage.getItem(`favorites-listings:${currentUser.id}`),
      AsyncStorage.getItem(`popup-mute-until:${currentUser.id}`),
    ]);

    const parsedPopupMuteUntil = Number(localPopupMuteUntilRaw ?? 0);
    const resolvedPopupMuteUntil =
      Number.isFinite(parsedPopupMuteUntil) && parsedPopupMuteUntil > Date.now() ? parsedPopupMuteUntil : 0;
    setPopupMuteUntil(resolvedPopupMuteUntil);

    setHeaderText(localHeaderText?.trim() || 'VAK 428 stoel 214');
    if (localSocialLinksRaw) {
      try {
        const parsed = JSON.parse(localSocialLinksRaw) as Partial<UserSocialLinks>;
        setSocialLinks({
          ajaxYoutubeUrl: parsed.ajaxYoutubeUrl?.trim() || defaultUserSocialLinks.ajaxYoutubeUrl,
          spotifyUrl: parsed.spotifyUrl?.trim() || '',
          facebookUrl: parsed.facebookUrl?.trim() || '',
          instagramUrl: parsed.instagramUrl?.trim() || '',
          threadsUrl: parsed.threadsUrl?.trim() || '',
          tiktokUrl: parsed.tiktokUrl?.trim() || '',
          xUrl: parsed.xUrl?.trim() || '',
          youtubePersonalUrl: parsed.youtubePersonalUrl?.trim() || '',
        });
      } catch {
        setSocialLinks(defaultUserSocialLinks);
      }
    } else {
      setSocialLinks(defaultUserSocialLinks);
    }

    if (localFavoriteNewsRaw) {
      try {
        const parsed = JSON.parse(localFavoriteNewsRaw) as string[];
        setFavoriteNewsIds(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []);
      } catch {
        setFavoriteNewsIds([]);
      }
    } else {
      setFavoriteNewsIds([]);
    }

    if (localFavoriteListingsRaw) {
      try {
        const parsed = JSON.parse(localFavoriteListingsRaw) as string[];
        setFavoriteListingIds(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []);
      } catch {
        setFavoriteListingIds([]);
      }
    } else {
      setFavoriteListingIds([]);
    }

    if (!profileRes.error && profileRes.data) {
      const row = profileRes.data as any;
      const resolvedAvatar =
        typeof row.avatar_url === 'string' && row.avatar_url.trim()
          ? row.avatar_url
          : localAvatar;
      setProfile({
        id: row.id,
        email: currentUser.email,
        displayName: row.display_name ?? 'Ajax Fan',
        username: row.username ?? '@ajaxfan',
        aboutMe: row.about_me ?? '',
        avatarUrl: resolvedAvatar ?? null,
        isAdmin: row.is_admin ?? false,
        isVip: row.is_vip ?? false,
      });
      setAvatarUri(resolvedAvatar ?? null);
    } else {
      const fallback: Profile = {
        id: currentUser.id,
        email: currentUser.email,
        displayName: currentUser.user_metadata?.display_name ?? 'Ajax Fan',
        username: currentUser.user_metadata?.username ?? '@ajaxfan',
        aboutMe: '',
        avatarUrl: localAvatar ?? null,
        isAdmin: false,
        isVip: false,
      };
      setProfile(fallback);
      setAvatarUri(localAvatar ?? null);
    }

    let resolvedTier: Membership['tier'] = 'FREE';
    if (!membershipRes.error && membershipRes.data) {
      const row = membershipRes.data as any;
      resolvedTier = toTier(row.tier);
      setMembership({
        tier: resolvedTier,
        status: row.status ?? 'active',
        startedAt: row.started_at ?? null,
        expiresAt: row.expires_at ?? null,
      });
    } else {
      setMembership(initialMembership);
    }

    let foundingPremium = false;
    if (PAID_MEMBERSHIP_TIERS.includes(resolvedTier)) {
      const founderLimit = Math.max(1, settings.firstPaidMemberLimit || 500);
      const foundersRes = await supabase
        .from('memberships')
        .select('user_id')
        .in('tier', PAID_MEMBERSHIP_TIERS)
        .order('created_at', { ascending: true })
        .limit(Math.max(founderLimit * 3, founderLimit + 250));

      if (!foundersRes.error && foundersRes.data?.length) {
        const seen = new Set<string>();
        let rank = 0;

        for (const row of foundersRes.data as any[]) {
          const candidateUserId =
            typeof row?.user_id === 'string' && row.user_id.trim() ? row.user_id.trim() : null;
          if (!candidateUserId || seen.has(candidateUserId)) continue;

          seen.add(candidateUserId);
          rank += 1;

          if (candidateUserId === currentUser.id) {
            foundingPremium = rank <= founderLimit;
            break;
          }
          if (rank > founderLimit) break;
        }
      }
    }
    setIsFoundingPremium(foundingPremium);

    if (!usageRes.error && usageRes.data) {
      setChatUsage({ dateKey: today, messagesSent: Number((usageRes.data as any).messages_sent ?? 0) });
    } else {
      setChatUsage({ dateKey: today, messagesSent: 0 });
    }

    if (!blockedRes.error && blockedRes.data) {
      setBlockedUsers(blockedRes.data.map((r: any) => r.blocked_id));
    } else {
      setBlockedUsers([]);
    }

    await consumeUnreadPopupNotifications(currentUser.id, resolvedPopupMuteUntil);
    await syncPushToken(currentUser);
  }, [consumeUnreadPopupNotifications, settings.firstPaidMemberLimit]);

  async function refresh() {
    await loadGlobalState();
    if (user) {
      await loadUserState(user);
    }
  }

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        await loadGlobalState();
        let data: { session: Session | null } = { session: null };
        let error: { message?: string } | null = null;

        try {
          const sessionRes = await supabase.auth.getSession();
          data = sessionRes.data;
          error = sessionRes.error;
        } catch (sessionError: any) {
          if (isInvalidRefreshTokenError(sessionError?.message)) {
            await clearSupabaseAuthStorage();
            await supabase.auth.signOut({ scope: 'local' });
          } else {
            throw sessionError;
          }
        }

        if (error && isInvalidRefreshTokenError(error.message)) {
          await clearSupabaseAuthStorage();
          await supabase.auth.signOut({ scope: 'local' });
          const retry = await supabase.auth.getSession();
          data = retry.data;
          error = retry.error;
        }

        if (!mounted) return;

        if (error) {
          setSession(null);
          setUser(null);
        } else {
          const currentSession = data.session;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            await loadUserState(currentSession.user);
          }
        }
      } catch {
        if (!mounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void boot();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        void loadUserState(nextSession.user);
      } else {
        setProfile(null);
        setMembership(initialMembership);
        setIsFoundingPremium(false);
        setChatUsage({ dateKey: getLocalDateKey(), messagesSent: 0 });
        setBlockedUsers([]);
        setAvatarUri(null);
        setHeaderText('VAK 428 stoel 214');
        setSocialLinks(defaultUserSocialLinks);
        setFavoriteNewsIds([]);
        setFavoriteListingIds([]);
        setPopupMuteUntil(0);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadUserState]);

  useEffect(() => {
    if (!user?.id) return;
    const timer = setInterval(() => {
      void consumeUnreadPopupNotifications(user.id);
    }, 15000);
    return () => clearInterval(timer);
  }, [consumeUnreadPopupNotifications, user?.id]);

  async function signIn(payload: AuthPayload): Promise<ActionResult> {
    const { error } = await supabase.auth.signInWithPassword({
      email: payload.email.trim(),
      password: payload.password,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  async function signUp(payload: RegisterPayload): Promise<ActionResult> {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
      options: {
        data: {
          display_name: payload.displayName,
          username: payload.username,
        },
      },
    });

    if (error) return { ok: false, message: error.message };

    const createdUserId = data.user?.id;
    if (createdUserId) {
      await supabase.from('profiles').upsert({
        id: createdUserId,
        display_name: payload.displayName,
        username: payload.username,
        about_me: '',
        is_admin: false,
        is_vip: false,
      });

      await supabase.from('memberships').upsert({
        user_id: createdUserId,
        tier: 'FREE',
        status: 'active',
      });

      await supabase.from('legal_acceptances').upsert({
        user_id: createdUserId,
        terms_version: payload.acceptedTermsVersion,
      });
    }

    return {
      ok: true,
      message:
        data.session == null
          ? 'Controleer je e-mail om je account te bevestigen.'
          : 'Account aangemaakt.',
    };
  }

  async function resendSignupConfirmation(email: string): Promise<ActionResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { ok: false, message: 'Vul eerst je e-mailadres in.' };
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      message: 'Bevestigingsmail opnieuw verstuurd. Controleer ook je spammap.',
    };
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  async function toggleNewsFavorite(newsId: string): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };
    const normalizedId = newsId.trim();
    if (!normalizedId) return { ok: false, message: 'Ongeldig nieuwsitem.' };

    const isAlreadyFavorite = favoriteNewsIds.includes(normalizedId);
    const next = isAlreadyFavorite
      ? favoriteNewsIds.filter((id) => id !== normalizedId)
      : [normalizedId, ...favoriteNewsIds];

    try {
      await AsyncStorage.setItem(`favorites-news:${user.id}`, JSON.stringify(next));
    } catch (storageError: any) {
      return { ok: false, message: storageError?.message ?? 'Opslaan van favoriet mislukt.' };
    }

    setFavoriteNewsIds(next);
    return { ok: true, message: isAlreadyFavorite ? 'Verwijderd uit favorieten.' : 'Toegevoegd aan favorieten.' };
  }

  async function toggleListingFavorite(listingId: string): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };
    const normalizedId = listingId.trim();
    if (!normalizedId) return { ok: false, message: 'Ongeldige advertentie.' };

    const isAlreadyFavorite = favoriteListingIds.includes(normalizedId);
    const next = isAlreadyFavorite
      ? favoriteListingIds.filter((id) => id !== normalizedId)
      : [normalizedId, ...favoriteListingIds];

    try {
      await AsyncStorage.setItem(`favorites-listings:${user.id}`, JSON.stringify(next));
    } catch (storageError: any) {
      return { ok: false, message: storageError?.message ?? 'Opslaan van favoriet mislukt.' };
    }

    setFavoriteListingIds(next);
    return { ok: true, message: isAlreadyFavorite ? 'Verwijderd uit favorieten.' : 'Toegevoegd aan favorieten.' };
  }

  function isNewsFavorite(newsId: string): boolean {
    return favoriteNewsIds.includes(newsId);
  }

  function isListingFavorite(listingId: string): boolean {
    return favoriteListingIds.includes(listingId);
  }

  async function saveProfile(
    input: Partial<Pick<Profile, 'displayName' | 'username' | 'aboutMe'>>
  ): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    const payload = {
      id: user.id,
      display_name: input.displayName,
      username: input.username,
      about_me: input.aboutMe,
    };

    const { error } = await supabase.from('profiles').upsert(payload);
    if (error) {
      return { ok: false, message: error.message };
    }

    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        displayName: input.displayName ?? prev.displayName,
        username: input.username ?? prev.username,
        aboutMe: input.aboutMe ?? prev.aboutMe,
      };
    });

    return { ok: true, message: 'Profiel opgeslagen.' };
  }

  async function saveAvatar(uri: string | null): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    const localStorageKey = `profile-avatar:${user.id}`;
    try {
      if (uri) {
        await AsyncStorage.setItem(localStorageKey, uri);
      } else {
        await AsyncStorage.removeItem(localStorageKey);
      }
    } catch (storageError: any) {
      return { ok: false, message: storageError?.message ?? 'Opslaan van profielfoto mislukt.' };
    }

    setAvatarUri(uri);
    setProfile((prev) => (prev ? { ...prev, avatarUrl: uri } : prev));

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, avatar_url: uri }, { onConflict: 'id' });

    if (error) {
      // Als avatar_url nog niet in het schema zit, laten we lokale opslag leidend zijn.
      if (error.message.toLowerCase().includes('avatar_url')) {
        return { ok: true, message: 'Foto lokaal opgeslagen.' };
      }
      return { ok: false, message: error.message };
    }

    return { ok: true, message: 'Profielfoto opgeslagen.' };
  }

  async function saveHeaderText(text: string): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    const normalized = text.trim().slice(0, 64);
    const nextValue = normalized || 'VAK 428 stoel 214';

    try {
      await AsyncStorage.setItem(`header-text:${user.id}`, nextValue);
    } catch (storageError: any) {
      return { ok: false, message: storageError?.message ?? 'Opslaan van headertekst mislukt.' };
    }

    setHeaderText(nextValue);
    return { ok: true, message: 'Headertekst opgeslagen.' };
  }

  async function saveSocialLinks(input: Partial<UserSocialLinks>): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    const normalized: Partial<UserSocialLinks> = {
      ajaxYoutubeUrl: input.ajaxYoutubeUrl?.trim(),
      spotifyUrl: input.spotifyUrl?.trim(),
      facebookUrl: input.facebookUrl?.trim(),
      instagramUrl: input.instagramUrl?.trim(),
      threadsUrl: input.threadsUrl?.trim(),
      tiktokUrl: input.tiktokUrl?.trim(),
      xUrl: input.xUrl?.trim(),
      youtubePersonalUrl: input.youtubePersonalUrl?.trim(),
    };

    const nextValue: UserSocialLinks = {
      ajaxYoutubeUrl: normalized.ajaxYoutubeUrl || socialLinks.ajaxYoutubeUrl || defaultUserSocialLinks.ajaxYoutubeUrl,
      spotifyUrl: normalized.spotifyUrl ?? socialLinks.spotifyUrl,
      facebookUrl: normalized.facebookUrl ?? socialLinks.facebookUrl,
      instagramUrl: normalized.instagramUrl ?? socialLinks.instagramUrl,
      threadsUrl: normalized.threadsUrl ?? socialLinks.threadsUrl,
      tiktokUrl: normalized.tiktokUrl ?? socialLinks.tiktokUrl,
      xUrl: normalized.xUrl ?? socialLinks.xUrl,
      youtubePersonalUrl: normalized.youtubePersonalUrl ?? socialLinks.youtubePersonalUrl,
    };

    try {
      await AsyncStorage.setItem(`social-links:${user.id}`, JSON.stringify(nextValue));
    } catch (storageError: any) {
      return { ok: false, message: storageError?.message ?? 'Opslaan van social links mislukt.' };
    }

    setSocialLinks(nextValue);
    return { ok: true, message: 'Social links opgeslagen.' };
  }

  async function saveWelcomeInfoLinkUrl(url: string): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };
    if (!entitlements.isDeveloper) return { ok: false, message: 'Alleen developer kan deze link aanpassen.' };

    const normalized = url.trim();
    const { error } = await supabase
      .from('app_content')
      .update({ welcome_info_link_url: normalized || null })
      .eq('id', 1);
    if (error) return { ok: false, message: error.message };

    setContent((prev) => ({ ...prev, welcomeInfoLinkUrl: normalized }));
    return { ok: true, message: normalized ? 'Link opgeslagen.' : 'Link verwijderd.' };
  }

  async function savePaymentPortalUrl(url: string): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };
    if (!entitlements.isDeveloper) return { ok: false, message: 'Alleen developer kan deze link aanpassen.' };

    const normalized = url.trim();
    const { error } = await supabase
      .from('app_content')
      .update({ payment_portal_url: normalized || null })
      .eq('id', 1);
    if (error) return { ok: false, message: error.message };

    setContent((prev) => ({ ...prev, paymentPortalUrl: normalized }));
    return { ok: true, message: normalized ? 'Betaallink opgeslagen.' : 'Betaallink verwijderd.' };
  }

  async function saveLotteryWinnerContent(input: {
    winnerName: string;
    winnerInterview: string;
    winnerPhotoUrl: string;
    winnerVideoUrl: string;
  }): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };
    if (!entitlements.isDeveloper) return { ok: false, message: 'Alleen developer kan winnaarcontent aanpassen.' };

    const winnerName = input.winnerName.trim();
    const winnerInterview = input.winnerInterview.trim();
    const winnerPhotoUrl = input.winnerPhotoUrl.trim();
    const winnerVideoUrl = input.winnerVideoUrl.trim();

    const { error } = await supabase
      .from('app_content')
      .update({
        lottery_winner_name: winnerName || null,
        lottery_winner_interview: winnerInterview || null,
        lottery_winner_photo_url: winnerPhotoUrl || null,
        lottery_winner_video_url: winnerVideoUrl || null,
      })
      .eq('id', 1);

    if (error) return { ok: false, message: error.message };

    setContent((prev) => ({
      ...prev,
      lotteryWinnerName: winnerName,
      lotteryWinnerInterview: winnerInterview,
      lotteryWinnerPhotoUrl: winnerPhotoUrl || null,
      lotteryWinnerVideoUrl: winnerVideoUrl || null,
    }));

    return { ok: true, message: 'Winnaarcontent opgeslagen.' };
  }

  async function acceptTerms(version: string): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    const { error } = await supabase.from('legal_acceptances').upsert({
      user_id: user.id,
      terms_version: version,
    });

    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  async function sendChatMessage(message: string, groupId = 'general'): Promise<ActionResult> {
    const text = message.trim();
    if (!text) return { ok: false, message: 'Typ een bericht.' };
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    if (!entitlements.canSendChat) {
      return {
        ok: false,
        message:
          'Je dagelijkse limiet is bereikt. Upgrade naar Premium om onbeperkt te chatten.',
      };
    }

    if (containsProfanity(text, profanityWords)) {
      return { ok: false, message: 'Bericht geblokkeerd door scheldwoordenfilter.' };
    }

    const rpc = await supabase.rpc('chat_send', {
      p_group_id: groupId,
      p_message: text,
    });

    if (rpc.error) {
      const fallbackInsert = await supabase.from('chat_messages').insert({
        user_id: user.id,
        group_id: groupId,
        message: text,
      });
      if (fallbackInsert.error) {
        return { ok: false, message: fallbackInsert.error.message };
      }
    }

    if (!entitlements.hasLaunchFullAccess && !entitlements.isPremium) {
      const today = getLocalDateKey();
      const nextCount = chatUsage.messagesSent + 1;
      await supabase.from('chat_daily_usage').upsert(
        {
          user_id: user.id,
          usage_date: today,
          messages_sent: nextCount,
        },
        { onConflict: 'user_id,usage_date' }
      );
      setChatUsage({ dateKey: today, messagesSent: nextCount });
    }

    return { ok: true };
  }

  async function sendListingMessage(
    listingId: string,
    message: string,
    recipientId?: string
  ): Promise<ActionResult> {
    const text = message.trim();
    const normalizedListingId = listingId.trim();
    const recipientUuid = normalizeUuid(recipientId);
    if (!text) return { ok: false, message: 'Typ eerst een bericht.' };
    if (!normalizedListingId) return { ok: false, message: 'Ongeldige advertentie.' };
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    if (!entitlements.canMessageListings) {
      return {
        ok: false,
        message: 'Deze functie is alleen beschikbaar voor Premium/VIP leden.',
      };
    }

    if (recipientUuid && blockedUsers.includes(recipientUuid)) {
      return { ok: false, message: 'Je hebt deze gebruiker geblokkeerd.' };
    }

    if (containsProfanity(text, profanityWords)) {
      return { ok: false, message: 'Bericht geblokkeerd door scheldwoordenfilter.' };
    }

    const isRecipientForeignKeyError = (error?: { message?: string; details?: string; hint?: string; code?: string } | null) => {
      if (!error) return false;
      const joined = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
      return joined.includes('listing_messages_recipient_id_fkey') || joined.includes('recipient_id');
    };

    const sendWithRecipient = async (recipient: string | null) => {
      const rpc = await supabase.rpc('listing_message_send', {
        p_listing_id: normalizedListingId,
        p_message: text,
        p_recipient_id: recipient,
      });

      if (!rpc.error) {
        return { ok: true as const, recipientFk: false };
      }

      const fallbackInsert = await supabase.from('listing_messages').insert({
        listing_id: normalizedListingId,
        sender_id: user.id,
        recipient_id: recipient,
        message: text,
      });

      if (!fallbackInsert.error) {
        return { ok: true as const, recipientFk: false };
      }

      return {
        ok: false as const,
        message: fallbackInsert.error.message || rpc.error.message,
        recipientFk: isRecipientForeignKeyError(rpc.error) || isRecipientForeignKeyError(fallbackInsert.error),
      };
    };

    const firstAttempt = await sendWithRecipient(recipientUuid);
    if (firstAttempt.ok) {
      return { ok: true, message: 'Bericht verstuurd.' };
    }

    if (recipientUuid && firstAttempt.recipientFk) {
      const retryWithoutRecipient = await sendWithRecipient(null);
      if (retryWithoutRecipient.ok) {
        return { ok: true, message: 'Bericht verstuurd.' };
      }
      return { ok: false, message: retryWithoutRecipient.message ?? 'Onbekende fout.' };
    }

    return { ok: false, message: firstAttempt.message ?? 'Onbekende fout.' };

  }

  async function blockUser(userId: string): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };
    if (!userId.trim()) return { ok: false, message: 'Ongeldige gebruiker.' };

    const { error } = await supabase.from('blocked_users').upsert({
      blocker_id: user.id,
      blocked_id: userId.trim(),
    });

    if (error) return { ok: false, message: error.message };

    setBlockedUsers((prev) => [...new Set([...prev, userId.trim()])]);
    return { ok: true, message: 'Gebruiker geblokkeerd.' };
  }

  async function unblockUser(userId: string): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);

    if (error) return { ok: false, message: error.message };

    setBlockedUsers((prev) => prev.filter((id) => id !== userId));
    return { ok: true, message: 'Blokkade verwijderd.' };
  }

  async function findPopupTargets(
    query: string
  ): Promise<{ ok: boolean; users: PopupTargetUser[]; message?: string }> {
    if (!user) return { ok: false, users: [], message: 'Niet ingelogd.' };

    const rpc = await supabase.rpc('search_popup_users', {
      p_query: query.trim(),
      p_limit: 20,
    });

    if (rpc.error) return { ok: false, users: [], message: rpc.error.message };

    const rows = (rpc.data ?? []) as {
      user_id?: string | null;
      display_name?: string | null;
      username?: string | null;
    }[];

    const users = rows
      .map((row) => ({
        id: row.user_id?.trim() || '',
        displayName: row.display_name?.trim() || '',
        username: row.username?.trim() || '',
        email: '',
      }))
      .filter((row) => !!row.id);

    return { ok: true, users };
  }

  async function sendPopupToUser(input: {
    targetUserId: string;
    title: string;
    body: string;
  }): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    const targetUserId = input.targetUserId.trim();
    const senderName = input.title.trim();
    const message = input.body.trim();

    if (!targetUserId) return { ok: false, message: 'Kies eerst een gebruiker.' };
    if (!senderName) return { ok: false, message: 'Naam is verplicht.' };
    if (!message) return { ok: false, message: 'Bericht is verplicht.' };
    if (containsProfanity(message, profanityWords)) {
      return { ok: false, message: 'Bericht geblokkeerd door scheldwoordenfilter.' };
    }

    const rpc = await supabase.rpc('send_direct_popup_message', {
      p_target_user: targetUserId,
      p_sender_name: senderName,
      p_message: message,
    });

    if (rpc.error) return { ok: false, message: rpc.error.message };
    return { ok: true, message: 'Popup is verstuurd.' };
  }

  async function sendFanPopup(input: { name: string; message: string }): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    const name = input.name.trim();
    const message = input.message.trim();
    if (!name) return { ok: false, message: 'Naam is verplicht.' };
    if (!message) return { ok: false, message: 'Bericht is verplicht.' };
    if (containsProfanity(message, profanityWords)) {
      return { ok: false, message: 'Bericht geblokkeerd door scheldwoordenfilter.' };
    }

    const rpc = await supabase.rpc('send_fan_popup_message', {
      p_sender_name: name,
      p_message: message,
    });

    if (rpc.error) return { ok: false, message: rpc.error.message };
    return { ok: true, message: 'Popup is verstuurd.' };
  }

  async function setPopupMuteForMinutes(minutes: 0 | 15 | 23 | 30 | 45 | 60): Promise<ActionResult> {
    if (!user) return { ok: false, message: 'Niet ingelogd.' };

    const nextUntil = minutes > 0 ? Date.now() + minutes * 60 * 1000 : 0;
    try {
      await AsyncStorage.setItem(`popup-mute-until:${user.id}`, `${nextUntil}`);
    } catch (storageError: any) {
      return { ok: false, message: storageError?.message ?? 'Instelling opslaan mislukt.' };
    }

    setPopupMuteUntil(nextUntil);
    return { ok: true, message: minutes > 0 ? `Popup uit voor ${minutes} minuten.` : 'Popup staat weer aan.' };
  }

  const value: AppContextValue = {
    loading,
    session,
    user,
    profile,
    membership,
    settings,
    content,
    entitlements,
    blockedUsers,
    profanityWords,
    avatarUri,
    headerText,
    socialLinks,
    favoriteNewsIds,
    favoriteListingIds,
    signIn,
    signUp,
    resendSignupConfirmation,
    signOut,
    refresh,
    saveProfile,
    saveAvatar,
    saveHeaderText,
    saveSocialLinks,
    saveWelcomeInfoLinkUrl,
    savePaymentPortalUrl,
    saveLotteryWinnerContent,
    toggleNewsFavorite,
    toggleListingFavorite,
    isNewsFavorite,
    isListingFavorite,
    acceptTerms,
    sendChatMessage,
    sendListingMessage,
    blockUser,
    unblockUser,
    findPopupTargets,
    sendPopupToUser,
    sendFanPopup,
    popupMuteUntil,
    setPopupMuteForMinutes,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}
