import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';
import {
  getExpoPushTokenForCurrentProject,
  getPushEnabledPreference,
  isPushRuntimeSupported,
  requestNotificationPermissionFromUser,
  setPushEnabledPreference,
} from '@/src/core/push-notifications';
import { supabase } from '@/src/core/supabaseClient';

type Palette = {
  bg: string;
  card: string;
  border: string;
  text: string;
  textSoft: string;
  inputBg: string;
};

function getPalette(isDark: boolean): Palette {
  return {
    bg: '#050505',
    card: '#FFFFFF',
    border: Ajax.red,
    text: '#111111',
    textSoft: '#555555',
    inputBg: '#FFFFFF',
  };
}

function SocialHint({
  brand,
  text,
}: {
  brand: string;
  text: string;
}) {
  return (
    <View style={stylesGlobal.helperRow}>
      <View style={stylesGlobal.helperBadge}>
        <Text style={stylesGlobal.helperBadgeText}>{brand}</Text>
      </View>
      <Text style={stylesGlobal.helperText}>{text}</Text>
    </View>
  );
}

const stylesGlobal = StyleSheet.create({
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: -2,
    marginBottom: 2,
  },
  helperBadge: {
    backgroundColor: '#111111',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  helperText: {
    flex: 1,
    color: '#555555',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
});

function toEur(amount: number): string {
  return `EUR ${amount.toFixed(2).replace('.', ',')}`;
}

function normalizeExternalUrl(value: string) {
  const trimmed = value.replace(/\s+/g, '').trim();
  if (!trimmed) return '';
  if (trimmed === 'https://' || trimmed === 'http://') return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ProfileScreen() {
  const {
    user,
    profile,
    settings,
    saveProfile,
    signOut,
    avatarUri,
    saveAvatar,
    socialLinks,
    saveSocialLinks,
  } = useAppContext();

  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => getPalette(isDark), [isDark]);
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingSocials, setSavingSocials] = useState(false);
  const [socialDraft, setSocialDraft] = useState({
    ajaxYoutubeUrl: '',
    spotifyUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    threadsUrl: '',
    tiktokUrl: '',
    xUrl: '',
      youtubePersonalUrl: '',
  });
  const [monthlyPlanPrice, setMonthlyPlanPrice] = useState(() => settings.monthlyPriceEur);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? 'Ajax Fan');
    setUsername(profile?.username ?? '@ajaxfan');
    setAboutMe(profile?.aboutMe ?? '');
  }, [profile?.aboutMe, profile?.displayName, profile?.username]);

  useEffect(() => {
    const loadPushPreference = async () => {
      const enabled = await getPushEnabledPreference();
      setNotificationsOn(enabled);
    };
    void loadPushPreference();
  }, []);

  const fallbackMonthlyPlanPrice = useMemo(() => settings.monthlyPriceEur, [settings.monthlyPriceEur]);

  useEffect(() => {
    setMonthlyPlanPrice(fallbackMonthlyPlanPrice);
  }, [fallbackMonthlyPlanPrice]);

  useEffect(() => {
    setSocialDraft({
      ajaxYoutubeUrl: socialLinks.ajaxYoutubeUrl ?? '',
      spotifyUrl: socialLinks.spotifyUrl ?? '',
      facebookUrl: socialLinks.facebookUrl ?? '',
      instagramUrl: socialLinks.instagramUrl ?? '',
      threadsUrl: socialLinks.threadsUrl ?? '',
      tiktokUrl: socialLinks.tiktokUrl ?? '',
      xUrl: socialLinks.xUrl ?? '',
      youtubePersonalUrl: socialLinks.youtubePersonalUrl ?? '',
    });
  }, [
    socialLinks.ajaxYoutubeUrl,
    socialLinks.spotifyUrl,
    socialLinks.facebookUrl,
    socialLinks.instagramUrl,
    socialLinks.threadsUrl,
    socialLinks.tiktokUrl,
    socialLinks.xUrl,
    socialLinks.youtubePersonalUrl,
  ]);

  useEffect(() => {
    let active = true;
    const loadPlanPrices = async () => {
      const res = await supabase
        .from('subscription_plans')
        .select('code,price_eur')
        .eq('code', 'PREMIUM_MONTH')
        .maybeSingle();

      if (!active || res.error || !res.data) return;

      const price = Number((res.data as { price_eur: number | null }).price_eur ?? 0);
      if (!Number.isFinite(price) || price <= 0) return;
      setMonthlyPlanPrice(price);
    };
    void loadPlanPrices();
    return () => {
      active = false;
    };
  }, [fallbackMonthlyPlanPrice]);

  const updateSocialField = (
    key:
      | 'ajaxYoutubeUrl'
      | 'spotifyUrl'
      | 'facebookUrl'
      | 'instagramUrl'
      | 'threadsUrl'
      | 'tiktokUrl'
      | 'xUrl'
      | 'youtubePersonalUrl',
    value: string
  ) => {
    const compact = value.replace(/\s+/g, '');
    const nextValue =
      compact && !/^https?:\/\//i.test(compact) ? `https://${compact.replace(/^\/+/, '')}` : compact;
    setSocialDraft((prev) => ({ ...prev, [key]: nextValue }));
  };

  const ensureHttpsPrefix = (
    key:
      | 'ajaxYoutubeUrl'
      | 'spotifyUrl'
      | 'facebookUrl'
      | 'instagramUrl'
      | 'threadsUrl'
      | 'tiktokUrl'
      | 'xUrl'
      | 'youtubePersonalUrl'
  ) => {
    setSocialDraft((prev) => {
      if (prev[key]) return prev;
      return { ...prev, [key]: 'https://' };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await saveProfile({
      displayName: displayName.trim(),
      username: username.trim(),
      aboutMe: aboutMe.trim(),
    });
    setSaving(false);

    if (!res.ok) {
      Alert.alert('Opslaan mislukt', res.message ?? 'Onbekende fout.');
      return;
    }

    Alert.alert('Opgeslagen', 'Je accountgegevens zijn bijgewerkt.');
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/welcome');
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Toegang nodig', "Geef toegang tot foto's om je profielafbeelding te wijzigen.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets.length) return;

    setSavingAvatar(true);
    const res = await saveAvatar(result.assets[0].uri);
    setSavingAvatar(false);

    if (!res.ok) {
      Alert.alert('Opslaan mislukt', res.message ?? 'Kon afbeelding niet opslaan.');
    }
  };

  const handleRemoveAvatar = async () => {
    setSavingAvatar(true);
    const res = await saveAvatar(null);
    setSavingAvatar(false);

    if (!res.ok) {
      Alert.alert('Verwijderen mislukt', res.message ?? 'Kon afbeelding niet verwijderen.');
    }
  };

  const handleToggleNotifications = async (nextValue: boolean) => {
    if (nextValue && !isPushRuntimeSupported()) {
      setNotificationsOn(false);
      await setPushEnabledPreference(false);
      Alert.alert(
        'Niet beschikbaar in Expo Go',
        'Pushmeldingen werken in een development build of store-build. In Expo Go zijn remote pushmeldingen uitgeschakeld.'
      );
      return;
    }

    if (nextValue) {
      const granted = await requestNotificationPermissionFromUser();
      if (!granted) {
        setNotificationsOn(false);
        await setPushEnabledPreference(false);
        Alert.alert('Notificaties uit', 'Toestemming geweigerd. Zet meldingen aan in je systeeminstellingen.');
        return;
      }
    }

    setNotificationsOn(nextValue);
    await setPushEnabledPreference(nextValue);

    if (!user?.id) return;

    if (!nextValue) {
      await supabase.from('user_push_tokens').update({ enabled: false }).eq('user_id', user.id);
      return;
    }

    try {
      const expoPushToken = await getExpoPushTokenForCurrentProject();
      if (!expoPushToken) return;
      await supabase.rpc('upsert_push_token', {
        p_expo_push_token: expoPushToken,
        p_device_key: `${Platform.OS}:${expoPushToken.slice(-24)}`,
        p_platform: Platform.OS,
        p_enabled: true,
      });
    } catch {
      // best effort
    }
  };

  const handleSaveSocials = async () => {
    const normalized = {
      ajaxYoutubeUrl: normalizeExternalUrl(socialDraft.ajaxYoutubeUrl),
      spotifyUrl: normalizeExternalUrl(socialDraft.spotifyUrl),
      facebookUrl: normalizeExternalUrl(socialDraft.facebookUrl),
      instagramUrl: normalizeExternalUrl(socialDraft.instagramUrl),
      threadsUrl: normalizeExternalUrl(socialDraft.threadsUrl),
      tiktokUrl: normalizeExternalUrl(socialDraft.tiktokUrl),
      xUrl: normalizeExternalUrl(socialDraft.xUrl),
      youtubePersonalUrl: normalizeExternalUrl(socialDraft.youtubePersonalUrl),
    };

    const entries = Object.entries(normalized) as [keyof typeof normalized, string][];
    const invalid = entries.find(([, value]) => !!value && !isValidHttpUrl(value));
    if (invalid) {
      Alert.alert('Ongeldige link', 'Gebruik geldige links zoals https://...');
      return;
    }

    setSavingSocials(true);
    const res = await saveSocialLinks(normalized);
    setSavingSocials(false);

    if (!res.ok) {
      Alert.alert('Opslaan mislukt', res.message ?? 'Kon social links niet opslaan.');
      return;
    }
    Alert.alert('Opgeslagen', 'Je social links zijn bijgewerkt.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIdentityRow}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{(displayName || 'A').slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.name}>{displayName || 'Ajax Fan'}</Text>
            <Text style={styles.user}>{username || '@ajaxfan'}</Text>
            <Text style={styles.supportText}>
              Aanvulling of vragen? mail naar All.Inn.Media.contact@gmail.com
            </Text>
          </View>
        </View>

        <View style={styles.avatarActions}>
          <TouchableOpacity
            style={[styles.avatarBtn, (savingAvatar || saving) && styles.btnDisabled]}
            onPress={() => void handlePickAvatar()}
            disabled={savingAvatar || saving}
          >
            <Text style={styles.avatarBtnText}>{savingAvatar ? 'Bezig...' : 'Wijzig logo/foto'}</Text>
          </TouchableOpacity>
          {avatarUri ? (
            <TouchableOpacity
              style={[styles.avatarBtnGhost, (savingAvatar || saving) && styles.btnDisabled]}
              onPress={() => void handleRemoveAvatar()}
              disabled={savingAvatar || saving}
            >
              <Text style={styles.avatarBtnGhostText}>Verwijder</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mijn account</Text>

        <Text style={styles.label}>Weergavenaam</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholderTextColor={palette.textSoft}
        />

        <Text style={styles.label}>Gebruikersnaam</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholderTextColor={palette.textSoft}
        />

        <Text style={styles.label}>Over mij</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={aboutMe}
          onChangeText={setAboutMe}
          multiline
          maxLength={280}
          placeholder="Vertel iets over jezelf"
          placeholderTextColor={palette.textSoft}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Push notificaties</Text>
          <Switch
            value={notificationsOn}
            onValueChange={(next) => void handleToggleNotifications(next)}
            trackColor={{ false: palette.border, true: Ajax.red }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Taal</Text>
          <Text style={styles.langValue}>Nederlands</Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSave()} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Opslaan...' : 'Opslaan'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Premium & launch</Text>
        <Text style={styles.pricingSectionTitle}>Vaste maandprijs</Text>
        <Text style={styles.infoText}>Premium per maand: {toEur(monthlyPlanPrice)}</Text>
        <Text style={styles.infoText}>
          We houden Premium nu bewust bij een vast maandbedrag. Dat is duidelijker voor supporters en geeft een
          stabieler patroon aan terugkerende inkomsten.
        </Text>
        <TouchableOpacity style={styles.infoLinkBtn} onPress={() => router.push('/premium-pricing')}>
          <Text style={styles.infoLinkBtnText}>Bekijk uitleg over Premium</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Eigen social links instellen</Text>
        <Text style={styles.label}>Ajax YouTube kanaal</Text>
        <TextInput
          style={styles.input}
          value={socialDraft.ajaxYoutubeUrl}
          onChangeText={(value) => updateSocialField('ajaxYoutubeUrl', value)}
          onFocus={() => ensureHttpsPrefix('ajaxYoutubeUrl')}
          placeholder="Kanaallink"
          autoCapitalize="none"
          keyboardType="url"
          placeholderTextColor={palette.textSoft}
        />
        <SocialHint
          brand="YOUTUBE"
          text="Open YouTube, ga naar het kanaal, kies Delen en kopieer de kanaallink."
        />
        <Text style={styles.label}>Spotify</Text>
        <TextInput
          style={styles.input}
          value={socialDraft.spotifyUrl}
          onChangeText={(value) => updateSocialField('spotifyUrl', value)}
          onFocus={() => ensureHttpsPrefix('spotifyUrl')}
          placeholder="Spotify-link"
          autoCapitalize="none"
          keyboardType="url"
          placeholderTextColor={palette.textSoft}
        />
        <SocialHint
          brand="SPOTIFY"
          text="Open Spotify, ga naar je profiel of playlist, kies Delen en kopieer de link."
        />
        <Text style={styles.label}>Facebook</Text>
        <TextInput
          style={styles.input}
          value={socialDraft.facebookUrl}
          onChangeText={(value) => updateSocialField('facebookUrl', value)}
          onFocus={() => ensureHttpsPrefix('facebookUrl')}
          placeholder="Facebook-link"
          autoCapitalize="none"
          keyboardType="url"
          placeholderTextColor={palette.textSoft}
        />
        <SocialHint
          brand="FACEBOOK"
          text="Open Facebook, ga naar je pagina of profiel, kies Delen en kopieer de link."
        />
        <Text style={styles.label}>Instagram</Text>
        <TextInput
          style={styles.input}
          value={socialDraft.instagramUrl}
          onChangeText={(value) => updateSocialField('instagramUrl', value)}
          onFocus={() => ensureHttpsPrefix('instagramUrl')}
          placeholder="Instagram-link"
          autoCapitalize="none"
          keyboardType="url"
          placeholderTextColor={palette.textSoft}
        />
        <SocialHint
          brand="INSTAGRAM"
          text="Open Instagram, ga naar je profiel, tik op Delen profiel en kopieer de link."
        />
        <Text style={styles.label}>Threads</Text>
        <TextInput
          style={styles.input}
          value={socialDraft.threadsUrl}
          onChangeText={(value) => updateSocialField('threadsUrl', value)}
          onFocus={() => ensureHttpsPrefix('threadsUrl')}
          placeholder="Threads-link"
          autoCapitalize="none"
          keyboardType="url"
          placeholderTextColor={palette.textSoft}
        />
        <SocialHint
          brand="THREADS"
          text="Open Threads, ga naar je profiel, kies Delen of kopieer de profiel-link vanuit je browser."
        />
        <Text style={styles.label}>TikTok</Text>
        <TextInput
          style={styles.input}
          value={socialDraft.tiktokUrl}
          onChangeText={(value) => updateSocialField('tiktokUrl', value)}
          onFocus={() => ensureHttpsPrefix('tiktokUrl')}
          placeholder="TikTok-link"
          autoCapitalize="none"
          keyboardType="url"
          placeholderTextColor={palette.textSoft}
        />
        <SocialHint
          brand="TIKTOK"
          text="Open TikTok, ga naar je profiel, kies Delen profiel en kopieer de link."
        />
        <Text style={styles.label}>X / Twitter</Text>
        <TextInput
          style={styles.input}
          value={socialDraft.xUrl}
          onChangeText={(value) => updateSocialField('xUrl', value)}
          onFocus={() => ensureHttpsPrefix('xUrl')}
          placeholder="X-link"
          autoCapitalize="none"
          keyboardType="url"
          placeholderTextColor={palette.textSoft}
        />
        <SocialHint
          brand="X"
          text="Open X, ga naar je profiel, kies Delen en kopieer de profiel-link."
        />
        <Text style={styles.label}>YouTube eigen kanaal</Text>
        <TextInput
          style={styles.input}
          value={socialDraft.youtubePersonalUrl}
          onChangeText={(value) => updateSocialField('youtubePersonalUrl', value)}
          onFocus={() => ensureHttpsPrefix('youtubePersonalUrl')}
          placeholder="YouTube-link"
          autoCapitalize="none"
          keyboardType="url"
          placeholderTextColor={palette.textSoft}
        />
        <SocialHint
          brand="YOUTUBE"
          text="Open YouTube, ga naar je eigen kanaal, kies Delen en kopieer de kanaallink."
        />
        <TouchableOpacity
          style={[styles.saveBtn, savingSocials && styles.btnDisabled]}
          onPress={() => void handleSaveSocials()}
          disabled={savingSocials}
        >
          <Text style={styles.saveBtnText}>{savingSocials ? 'Opslaan...' : 'Social links opslaan'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => void handleLogout()}>
        <Text style={styles.logoutText}>Uitloggen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    hero: {
      backgroundColor: Ajax.red,
      borderRadius: 16,
      alignItems: 'stretch',
      padding: 12,
      gap: 6,
    },
    heroIdentityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    heroTextWrap: {
      flex: 1,
      gap: 2,
    },
    avatar: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 35,
    },
    avatarText: { color: Ajax.red, fontSize: 23, fontWeight: '900' },
    avatarActions: {
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
    },
    avatarBtn: {
      borderRadius: 999,
      backgroundColor: '#fff',
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    avatarBtnText: { color: Ajax.red, fontWeight: '800', fontSize: 12 },
    avatarBtnGhost: {
      borderRadius: 999,
      borderWidth: 1.3,
      borderColor: '#fff',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    avatarBtnGhostText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    btnDisabled: { opacity: 0.65 },
    name: { color: '#fff', fontSize: 19, fontWeight: '900' },
    user: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
    supportText: {
      color: '#FFE4A8',
      fontSize: 11,
      fontWeight: '800',
      lineHeight: 15,
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 8,
    },
    cardTitle: { fontSize: 16, fontWeight: '800', color: palette.text, marginBottom: 2 },
    label: { fontSize: 12, color: palette.textSoft, fontWeight: '700' },
    input: {
      backgroundColor: palette.inputBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: palette.text,
      fontSize: 14,
    },
    textarea: { minHeight: 88, textAlignVertical: 'top' },
    switchRow: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    switchLabel: { color: palette.text, fontSize: 14, fontWeight: '600' },
    langValue: { color: palette.textSoft, fontSize: 13, fontWeight: '700' },
    saveBtn: {
      marginTop: 6,
      backgroundColor: Ajax.red,
      borderRadius: 10,
      alignItems: 'center',
      paddingVertical: 12,
    },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    infoText: { color: palette.textSoft, fontSize: 13, lineHeight: 19 },
    pricingSectionTitle: {
      color: palette.text,
      fontSize: 13,
      fontWeight: '900',
      marginTop: 2,
    },
    infoLinkBtn: {
      marginTop: 6,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: Ajax.red,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    infoLinkBtnText: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 12,
    },
    blockBtn: {
      backgroundColor: Ajax.red,
      borderRadius: 10,
      alignItems: 'center',
      paddingVertical: 11,
    },
    blockBtnText: { color: '#FFD369', fontWeight: '700', fontSize: 13 },
    blockedList: { gap: 6, marginTop: 4 },
    blockedItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    blockedText: { color: palette.text, fontSize: 12, flex: 1, marginRight: 8 },
    unblockText: { color: '#FFD369', fontSize: 12, fontWeight: '700' },
    logoutBtn: {
      marginTop: 4,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: Ajax.red,
      alignItems: 'center',
      paddingVertical: 13,
      marginBottom: 8,
    },
    logoutText: { color: Ajax.red, fontWeight: '800', fontSize: 15 },
  });
}
