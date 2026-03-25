import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ajax } from '@/constants/theme';
import { StadiumFlashCard } from '@/components/stadium-flash-card';
import { useAppContext } from '@/src/core/app-context';
const FAN_POPUP_COOLDOWN_MS = 5 * 60 * 1000;
const POPUP_MUTE_OPTIONS = [15, 23, 45, 60] as const;
type PaymentMethodPreference = 'pin' | 'wallet' | 'both';
const PAYMENT_METHOD_LABEL: Record<PaymentMethodPreference, string> = {
  pin: 'Pin / kaart',
  wallet: 'Wallet',
  both: 'Wallet + pin',
};

type PopupTargetOption = {
  id: string;
  displayName: string;
  username: string;
  email?: string;
};

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function LuxeTabScreen() {
  const {
    user,
    content,
    entitlements,
    findPopupTargets,
    sendPopupToUser,
    popupMuteUntil,
    setPopupMuteForMinutes,
  } = useAppContext();
  const isDark = useColorScheme() === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const [fanPopupName, setFanPopupName] = useState('');
  const [fanPopupMessage, setFanPopupMessage] = useState('Haal gelijk BIER');
  const [fanPopupQuery, setFanPopupQuery] = useState('');
  const [fanPopupResults, setFanPopupResults] = useState<PopupTargetOption[]>([]);
  const [fanPopupFavorites, setFanPopupFavorites] = useState<PopupTargetOption[]>([]);
  const [fanPopupSelected, setFanPopupSelected] = useState<PopupTargetOption | null>(null);
  const [fanPopupSearchBusy, setFanPopupSearchBusy] = useState(false);
  const [fanPopupSending, setFanPopupSending] = useState(false);
  const [fanPopupCooldownUntil, setFanPopupCooldownUntil] = useState(0);
  const [fanPopupNow, setFanPopupNow] = useState(Date.now());
  const [paymentPreference, setPaymentPreference] = useState<PaymentMethodPreference>('pin');
  const [pinOnlyMode, setPinOnlyMode] = useState(false);

  useEffect(() => {
    if (fanPopupName.trim()) return;
    const guessedName =
      `${user?.user_metadata?.display_name ?? ''}`.trim() ||
      `${user?.user_metadata?.username ?? ''}`.trim() ||
      `${user?.email ?? ''}`.split('@')[0] ||
      'Supporter';
    setFanPopupName(guessedName);
  }, [fanPopupName, user?.email, user?.user_metadata?.display_name, user?.user_metadata?.username]);

  useEffect(() => {
    const loadPopupData = async () => {
      if (!user?.id) return;
      const [cooldownRaw, favoritesRaw, paymentPreferenceRaw, pinOnlyRaw] = await Promise.all([
        AsyncStorage.getItem(`fan-popup-cooldown:${user.id}`),
        AsyncStorage.getItem(`fan-popup-favorites:${user.id}`),
        AsyncStorage.getItem(`payment-preference:${user.id}`),
        AsyncStorage.getItem(`payment-pin-only:${user.id}`),
      ]);
      const until = Number(cooldownRaw ?? 0);
      if (Number.isFinite(until) && until > Date.now()) {
        setFanPopupCooldownUntil(until);
      } else {
        setFanPopupCooldownUntil(0);
      }

      if (!favoritesRaw) {
        setFanPopupFavorites([]);
      } else {
        try {
          const parsed = JSON.parse(favoritesRaw) as PopupTargetOption[];
          const next = Array.isArray(parsed)
            ? parsed
                .map((row) => ({
                  id: `${row?.id ?? ''}`.trim(),
                  displayName: `${row?.displayName ?? ''}`.trim(),
                  username: `${row?.username ?? ''}`.trim(),
                  email: `${row?.email ?? ''}`.trim(),
                }))
                .filter((row) => !!row.id)
                .slice(0, 40)
            : [];
          setFanPopupFavorites(next);
          if (!fanPopupSelected && next.length) {
            setFanPopupSelected(next[0]);
          }
        } catch {
          setFanPopupFavorites([]);
        }
      }

      const nextPreference = (paymentPreferenceRaw ?? '').trim();
      if (nextPreference === 'pin' || nextPreference === 'wallet' || nextPreference === 'both') {
        setPaymentPreference(nextPreference);
      } else {
        setPaymentPreference('pin');
      }

      const nextPinOnly =
        (pinOnlyRaw ?? '').trim().toLowerCase() === '1' ||
        (pinOnlyRaw ?? '').trim().toLowerCase() === 'true' ||
        (pinOnlyRaw ?? '').trim().toLowerCase() === 'yes';
      setPinOnlyMode(nextPinOnly);
      if (nextPinOnly) {
        setPaymentPreference('pin');
      }
    };
    void loadPopupData();
  }, [fanPopupSelected, user?.id]);

  useEffect(() => {
    if (fanPopupCooldownUntil <= Date.now()) return;
    const timer = setInterval(() => setFanPopupNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [fanPopupCooldownUntil]);

  const onOpenPayment = async () => {
    const normalized = normalizeExternalUrl(content.paymentPortalUrl ?? '');
    if (!normalized) {
      if (entitlements.isDeveloper) {
        Alert.alert('Nog niet actief', 'Betaallink is nog niet ingesteld. Stel deze in via de Beheer-tab.');
        return;
      }
      Alert.alert('Nog niet actief', 'Betaalfunctie staat nog niet open.');
      return;
    }
    const supported = await Linking.canOpenURL(normalized);
    if (!supported) {
      Alert.alert('Link ongeldig', 'De betaallink kan niet worden geopend.');
      return;
    }
    await Linking.openURL(normalized);
  };
  const savePaymentPreference = async (next: PaymentMethodPreference) => {
    setPaymentPreference(next);
    if (!user?.id) return;
    await AsyncStorage.setItem(`payment-preference:${user.id}`, next);
  };

  const savePinOnlyMode = async (next: boolean) => {
    setPinOnlyMode(next);
    if (user?.id) {
      await AsyncStorage.setItem(`payment-pin-only:${user.id}`, next ? '1' : '0');
    }
    if (next && paymentPreference !== 'pin') {
      setPaymentPreference('pin');
      if (user?.id) {
        await AsyncStorage.setItem(`payment-preference:${user.id}`, 'pin');
      }
    }
  };

  const onPressPaymentButton = async () => {
    if (pinOnlyMode) {
      await onOpenPayment();
      return;
    }
    if (paymentPreference === 'wallet') {
      Alert.alert(
        'Wallet keuze',
        'Je gaat naar de betaalpagina. Kies daar Apple Pay, Google Pay of kaartbetaling.'
      );
    }
    if (paymentPreference === 'both') {
      Alert.alert(
        'Wallet + pin',
        'Je gaat naar de betaalpagina. Daar kun je zelf Wallet of kaart/pin kiezen.'
      );
    }
    await onOpenPayment();
  };

  const fanPopupRemainingMs = Math.max(0, fanPopupCooldownUntil - fanPopupNow);
  const fanPopupBlocked = fanPopupRemainingMs > 0;
  const fanPopupRemainingLabel = fanPopupBlocked
    ? `${Math.floor(fanPopupRemainingMs / 60000)
        .toString()
        .padStart(2, '0')}:${Math.floor((fanPopupRemainingMs % 60000) / 1000)
        .toString()
        .padStart(2, '0')}`
    : null;
  const popupMuted = popupMuteUntil > fanPopupNow;
  const popupMuteRemainingMs = Math.max(0, popupMuteUntil - fanPopupNow);
  const popupMuteRemainingLabel = popupMuted
    ? `${Math.floor(popupMuteRemainingMs / 60000)
        .toString()
        .padStart(2, '0')}:${Math.floor((popupMuteRemainingMs % 60000) / 1000)
        .toString()
        .padStart(2, '0')}`
    : null;

  const getTargetLabel = (target: PopupTargetOption) => {
    const display = target.displayName.trim();
    const username = target.username.trim();
    if (display && username) return `${display} (${username})`;
    return display || username || target.id.slice(0, 8);
  };

  const persistPopupFavorites = async (items: PopupTargetOption[]) => {
    if (!user?.id) return;
    await AsyncStorage.setItem(`fan-popup-favorites:${user.id}`, JSON.stringify(items.slice(0, 40)));
  };

  const isPopupFavorite = (targetId: string) => fanPopupFavorites.some((row) => row.id === targetId);

  const onTogglePopupFavorite = async (target: PopupTargetOption) => {
    const exists = isPopupFavorite(target.id);
    if (exists) {
      const next = fanPopupFavorites.filter((row) => row.id !== target.id);
      setFanPopupFavorites(next);
      if (fanPopupSelected?.id === target.id) {
        setFanPopupSelected(next[0] ?? null);
      }
      await persistPopupFavorites(next);
      return;
    }

    const next = [target, ...fanPopupFavorites].slice(0, 40);
    setFanPopupFavorites(next);
    await persistPopupFavorites(next);
  };

  const onSearchPopupTargets = async () => {
    const query = fanPopupQuery.trim();
    if (!query) {
      setFanPopupResults([]);
      return;
    }
    setFanPopupSearchBusy(true);
    const res = await findPopupTargets(query);
    setFanPopupSearchBusy(false);
    if (!res.ok) {
      Alert.alert('Zoeken mislukt', res.message ?? 'Onbekende fout.');
      return;
    }
    const users = (res.users ?? []).map((row) => ({
      id: row.id,
      displayName: row.displayName,
      username: row.username,
      email: row.email,
    }));
    setFanPopupResults(users);
  };

  const onSendPopup = async () => {
    if (!user?.id) return;
    if (!fanPopupSelected?.id) {
      Alert.alert('Kies gebruiker', 'Selecteer eerst een vriend of vriendin.');
      return;
    }
    if (fanPopupBlocked) {
      Alert.alert('Even wachten', `Je kunt over ${fanPopupRemainingLabel ?? '00:00'} weer een popup sturen.`);
      return;
    }

    setFanPopupSending(true);
    const res = await sendPopupToUser({
      targetUserId: fanPopupSelected.id,
      title: fanPopupName.trim(),
      body: fanPopupMessage.trim(),
    });
    setFanPopupSending(false);

    if (!res.ok) {
      Alert.alert('Niet verstuurd', res.message ?? 'Onbekende fout.');
      return;
    }

    const nextUntil = Date.now() + FAN_POPUP_COOLDOWN_MS;
    setFanPopupCooldownUntil(nextUntil);
    setFanPopupNow(Date.now());
    await AsyncStorage.setItem(`fan-popup-cooldown:${user.id}`, `${nextUntil}`);
    Alert.alert('Verstuurd', `Popup is verzonden naar ${getTargetLabel(fanPopupSelected)}.`);
  };

  const onSetPopupMute = async (minutes: 0 | 15 | 23 | 45 | 60) => {
    const res = await setPopupMuteForMinutes(minutes);
    if (!res.ok) {
      Alert.alert('Niet opgeslagen', res.message ?? 'Onbekende fout.');
      return;
    }
    Alert.alert('Popup instelling', res.message ?? 'Aangepast.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => void onPressPaymentButton()}>
        <Text style={styles.primaryBtnText}>Betaal met de app</Text>
      </TouchableOpacity>

      <View style={styles.popupCard}>
        <Text style={styles.popupTitle}>Popup naar vriend(in)</Text>
        <Text style={styles.popupText}>Maximaal 1 keer per 5 minuten.</Text>
        <Text style={styles.popupText}>
          Popup status: {popupMuted ? `uit (${popupMuteRemainingLabel})` : 'aan'}
        </Text>
        <View style={styles.popupMuteRow}>
          {POPUP_MUTE_OPTIONS.map((minutes) => (
            <TouchableOpacity
              key={`luxe-popup-mute-${minutes}`}
              style={styles.popupMuteBtn}
              onPress={() => void onSetPopupMute(minutes)}
            >
              <Text style={styles.popupMuteBtnText}>{minutes} min</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.popupEnableBtn} onPress={() => void onSetPopupMute(0)}>
          <Text style={styles.popupEnableBtnText}>Popup weer aan</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.popupInput}
          value={fanPopupQuery}
          onChangeText={setFanPopupQuery}
          placeholder="Zoek naam of @username"
          placeholderTextColor="#8A8A8A"
          maxLength={64}
        />
        <TouchableOpacity style={styles.popupSearchBtn} onPress={() => void onSearchPopupTargets()}>
          <Text style={styles.popupSearchBtnText}>{fanPopupSearchBusy ? 'Zoeken...' : 'Zoek gebruiker'}</Text>
        </TouchableOpacity>

        {fanPopupResults.length ? (
          <View style={styles.popupResultList}>
            {fanPopupResults.map((target) => {
              const selected = fanPopupSelected?.id === target.id;
              const favorite = isPopupFavorite(target.id);
              return (
                <View key={`luxe-popup-result-${target.id}`} style={styles.popupResultRow}>
                  <TouchableOpacity
                    style={[styles.popupSelectBtn, selected ? styles.popupSelectBtnActive : null]}
                    onPress={() => setFanPopupSelected(target)}
                  >
                    <Text style={[styles.popupSelectText, selected ? styles.popupSelectTextActive : null]}>
                      {getTargetLabel(target)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.popupStarBtn, favorite ? styles.popupStarBtnActive : null]}
                    onPress={() => void onTogglePopupFavorite(target)}
                  >
                    <Text style={styles.popupStarText}>★</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.popupHint}>Zoek op naam om iemand te kiezen.</Text>
        )}

        {fanPopupFavorites.length ? (
          <View style={styles.popupFavoriteList}>
            {fanPopupFavorites.map((target) => (
              <TouchableOpacity
                key={`luxe-popup-favorite-${target.id}`}
                style={[
                  styles.popupFavoriteBtn,
                  fanPopupSelected?.id === target.id ? styles.popupFavoriteBtnActive : null,
                ]}
                onPress={() => setFanPopupSelected(target)}
              >
                <Text style={styles.popupFavoriteText}>{target.displayName || target.username || 'Gebruiker'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={styles.popupTargetLabel}>
          Ontvanger: {fanPopupSelected ? getTargetLabel(fanPopupSelected) : 'nog niet gekozen'}
        </Text>

        <TextInput
          style={styles.popupInput}
          value={fanPopupName}
          onChangeText={setFanPopupName}
          placeholder="Jouw naam"
          placeholderTextColor="#8A8A8A"
          maxLength={60}
        />
        <TextInput
          style={[styles.popupInput, styles.popupTextarea]}
          value={fanPopupMessage}
          onChangeText={setFanPopupMessage}
          placeholder="Typ je popup bericht..."
          placeholderTextColor="#8A8A8A"
          multiline
          maxLength={240}
        />

        <TouchableOpacity
          style={[styles.popupSendBtn, (fanPopupBlocked || fanPopupSending) ? styles.disabledBtn : null]}
          onPress={() => void onSendPopup()}
          disabled={fanPopupBlocked || fanPopupSending}
        >
          <Text style={styles.popupSendBtnText}>
            {fanPopupSending ? 'Versturen...' : fanPopupBlocked ? `Wacht ${fanPopupRemainingLabel}` : 'Verstuur popup'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.paymentCard}>
        <Text style={styles.paymentTitle}>Betaalmethode</Text>
        <Text style={styles.paymentHint}>
          Deze keuze wordt voor jouw account onthouden en hoort nu bij de PIN-tab.
        </Text>
        <TouchableOpacity
          style={[styles.pinOnlyToggleBtn, pinOnlyMode ? styles.pinOnlyToggleBtnActive : null]}
          onPress={() => void savePinOnlyMode(!pinOnlyMode)}
        >
          <Text style={[styles.pinOnlyToggleText, pinOnlyMode ? styles.pinOnlyToggleTextActive : null]}>
            Alleen pin tonen: {pinOnlyMode ? 'Aan' : 'Uit'}
          </Text>
        </TouchableOpacity>
        <View style={styles.paymentOptionRow}>
          <TouchableOpacity
            style={[styles.paymentOptionBtn, paymentPreference === 'pin' ? styles.paymentOptionBtnActive : null]}
            onPress={() => void savePaymentPreference('pin')}
          >
            <Text
              style={[
                styles.paymentOptionBtnText,
                paymentPreference === 'pin' ? styles.paymentOptionBtnTextActive : null,
              ]}
            >
              Pin / kaart
            </Text>
          </TouchableOpacity>
          {!pinOnlyMode ? (
            <>
              <TouchableOpacity
                style={[styles.paymentOptionBtn, paymentPreference === 'wallet' ? styles.paymentOptionBtnActive : null]}
                onPress={() => void savePaymentPreference('wallet')}
              >
                <Text
                  style={[
                    styles.paymentOptionBtnText,
                    paymentPreference === 'wallet' ? styles.paymentOptionBtnTextActive : null,
                  ]}
                >
                  Wallet
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentOptionBtn, paymentPreference === 'both' ? styles.paymentOptionBtnActive : null]}
                onPress={() => void savePaymentPreference('both')}
              >
                <Text
                  style={[
                    styles.paymentOptionBtnText,
                    paymentPreference === 'both' ? styles.paymentOptionBtnTextActive : null,
                  ]}
                >
                  Beide
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
        <Text style={styles.paymentCurrentLabel}>
          Actief: {pinOnlyMode ? 'Alleen pin / kaart' : PAYMENT_METHOD_LABEL[paymentPreference]}
        </Text>
      </View>

      <StadiumFlashCard />

    </ScrollView>
  );
}

function createStyles(isDark: boolean) {
  const bg = isDark ? '#050505' : '#0B0B0B';
  const card = '#FFFFFF';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    content: {
      padding: 14,
      paddingBottom: 34,
      gap: 10,
    },
    primaryBtn: {
      backgroundColor: Ajax.red,
      borderWidth: 1.4,
      borderColor: '#FFFFFF',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 12,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
    },
    paymentCard: {
      backgroundColor: card,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    paymentTitle: {
      color: '#111111',
      fontSize: 15,
      fontWeight: '900',
    },
    paymentHint: {
      color: '#555555',
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '700',
    },
    pinOnlyToggleBtn: {
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      paddingHorizontal: 10,
    },
    pinOnlyToggleBtnActive: {
      backgroundColor: Ajax.red,
    },
    pinOnlyToggleText: {
      color: Ajax.red,
      fontSize: 12,
      fontWeight: '900',
    },
    pinOnlyToggleTextActive: {
      color: '#FFFFFF',
    },
    paymentOptionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    paymentOptionBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 6,
    },
    paymentOptionBtnActive: {
      backgroundColor: Ajax.red,
    },
    paymentOptionBtnText: {
      color: Ajax.red,
      fontSize: 12,
      fontWeight: '900',
      textAlign: 'center',
    },
    paymentOptionBtnTextActive: {
      color: '#FFFFFF',
    },
    paymentCurrentLabel: {
      color: '#111111',
      fontSize: 12,
      fontWeight: '800',
    },
    winnerCard: {
      backgroundColor: card,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 3,
    },
    winnerTitle: {
      color: Ajax.red,
      fontSize: 14,
      fontWeight: '900',
    },
    winnerName: {
      color: '#111111',
      fontSize: 16,
      fontWeight: '900',
    },
    winnerInterview: {
      color: '#555555',
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
    },
    lotteryCard: {
      backgroundColor: card,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    lotteryTitle: {
      color: '#111111',
      fontSize: 15,
      fontWeight: '900',
    },
    lotteryList: { gap: 8, marginTop: 2 },
    lotteryMeter: {
      borderWidth: 1,
      borderColor: Ajax.red,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 9,
      gap: 4,
    },
    lotteryMeterTitle: { color: '#111111', fontSize: 13, fontWeight: '900' },
    lotteryMeterSub: { color: '#555555', fontSize: 11, fontWeight: '700' },
    lotteryProgressTrack: {
      height: 9,
      backgroundColor: '#ECECEC',
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#E0E0E0',
    },
    lotteryProgressFill: {
      height: '100%',
      backgroundColor: Ajax.red,
      borderRadius: 999,
      minWidth: 4,
    },
    lotteryItem: {
      borderWidth: 1,
      borderColor: Ajax.red,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 9,
      gap: 2,
    },
    lotteryLine: { color: '#111111', fontSize: 12, fontWeight: '700' },
    lotterySubLine: { color: '#555555', fontSize: 11, fontWeight: '600' },
    lotteryWinner: { color: Ajax.red, fontSize: 12, fontWeight: '900', marginTop: 3 },
    infoText: { color: '#555555', fontSize: 12, lineHeight: 18, fontWeight: '700' },
    popupCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 7,
    },
    popupTitle: {
      color: '#111111',
      fontSize: 15,
      fontWeight: '900',
    },
    popupText: {
      color: '#444444',
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 17,
    },
    popupMuteRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    popupMuteBtn: {
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 9,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    popupMuteBtnText: {
      color: Ajax.red,
      fontSize: 12,
      fontWeight: '900',
    },
    popupEnableBtn: {
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 9,
      backgroundColor: Ajax.red,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 36,
    },
    popupEnableBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    popupInput: {
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      color: '#111111',
      paddingHorizontal: 10,
      paddingVertical: 9,
      fontSize: 13,
      fontWeight: '600',
    },
    popupTextarea: {
      minHeight: 74,
      textAlignVertical: 'top',
    },
    popupSearchBtn: {
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 10,
      backgroundColor: Ajax.red,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 38,
    },
    popupSearchBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },
    popupResultList: {
      gap: 6,
    },
    popupResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    popupSelectBtn: {
      flex: 1,
      borderWidth: 1.1,
      borderColor: Ajax.red,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    popupSelectBtnActive: {
      backgroundColor: Ajax.red,
    },
    popupSelectText: {
      color: '#111111',
      fontSize: 12,
      fontWeight: '800',
    },
    popupSelectTextActive: {
      color: '#FFFFFF',
    },
    popupStarBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    popupStarBtnActive: {
      backgroundColor: '#FFF3CE',
    },
    popupStarText: {
      color: '#C48C00',
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 18,
    },
    popupHint: {
      color: '#666666',
      fontSize: 12,
      fontWeight: '700',
    },
    popupFavoriteList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
    popupFavoriteBtn: {
      borderWidth: 1.1,
      borderColor: Ajax.red,
      borderRadius: 999,
      backgroundColor: '#FAFAFA',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    popupFavoriteBtnActive: {
      backgroundColor: '#FFE9E9',
    },
    popupFavoriteText: {
      color: '#111111',
      fontSize: 11,
      fontWeight: '800',
    },
    popupTargetLabel: {
      color: '#111111',
      fontSize: 12,
      fontWeight: '800',
    },
    popupSendBtn: {
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 10,
      backgroundColor: Ajax.red,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
    },
    popupSendBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },
    disabledBtn: {
      opacity: 0.6,
    },
    secondaryWideBtn: {
      backgroundColor: '#101010',
      borderWidth: 1.3,
      borderColor: '#FFD369',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
      paddingHorizontal: 10,
    },
    secondaryWideBtnText: {
      color: '#FFD369',
      fontSize: 14,
      fontWeight: '900',
    },
    secondaryBtn: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
      paddingHorizontal: 10,
    },
    secondaryBtnText: {
      color: Ajax.red,
      fontSize: 14,
      fontWeight: '900',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      padding: 14,
      gap: 10,
    },
    modalTitle: {
      color: '#111111',
      fontSize: 16,
      fontWeight: '900',
    },
    modalText: {
      color: '#333333',
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '700',
    },
    modalCloseBtn: {
      alignSelf: 'flex-end',
      backgroundColor: Ajax.red,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    modalCloseBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },
  });
}
