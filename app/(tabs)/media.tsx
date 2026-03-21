import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { useIsFocused } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';
import { getLocalDateKey } from '@/src/core/entitlements';
import { supabase } from '@/src/core/supabaseClient';

const SUPPORTERS_YOUTUBE_URL = 'https://www.youtube.com/@ajax-supporters';
const SUPPORTERS_YOUTUBE_SUBSCRIBE_URL = 'https://www.youtube.com/@ajax-supporters?sub_confirmation=1';
const SUPPORTER_MEDIA_BUCKET = 'supporter-media-submissions';
const GENERIC_RADIO_URL = 'https://www.nederland.fm/';
const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/u/0/r';
const TOTO_SPORT_URL = 'https://sport.toto.nl/';
const ARENA_PARKING_URL = 'https://www.google.com/maps/search/?api=1&query=Johan+Cruijff+ArenA+parking';
const EASYPARK_URL = 'https://www.easypark.com/nl-nl';
const QPARK_URL = 'https://www.q-park.nl/nl-nl/';
const MEDIA_DAILY_LIMIT_MS = 10 * 60 * 1000;
const SUPPORTER_MEDIA_MAX_BYTES = 50 * 1024 * 1024;
const LEGEND_AUTO_STOP_OPTIONS = [4, 6, 8, 12] as const;
type LegendAutoStopSeconds = (typeof LEGEND_AUTO_STOP_OPTIONS)[number];

type SpeechRecognitionPermission = { granted?: boolean };
type SpeechRecognitionResultEvent = { isFinal?: boolean; results?: { transcript?: string }[] };
type SpeechRecognitionErrorEvent = { error?: string; message?: string };
type SpeechRecognitionModule = {
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<SpeechRecognitionPermission>;
  isRecognitionAvailable: () => boolean;
  addListener?: (
    eventName: 'result' | 'error' | 'end',
    listener: ((event: SpeechRecognitionResultEvent) => void) | ((event: SpeechRecognitionErrorEvent) => void) | (() => void)
  ) => { remove?: () => void } | void;
};

type SupporterSubmissionAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
  size: number | null;
  kind: 'image' | 'video';
};

function getSpeechRecognitionModule(): SpeechRecognitionModule | null {
  try {
    // Dynamic require prevents crashes in environments where the native module is unavailable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('expo-speech-recognition');
    return (pkg?.ExpoSpeechRecognitionModule as SpeechRecognitionModule | undefined) ?? null;
  } catch {
    return null;
  }
}

function hasUsableSpeechRecognitionModule() {
  try {
    const speechModule = getSpeechRecognitionModule();
    return Boolean(
      speechModule &&
        typeof speechModule.start === 'function' &&
        typeof speechModule.stop === 'function' &&
        typeof speechModule.requestPermissionsAsync === 'function'
    );
  } catch {
    return false;
  }
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function sanitizeFileName(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
  return cleaned || `upload-${Date.now()}`;
}

function extensionFromMimeType(mimeType: string, kind: 'image' | 'video'): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType === 'video/quicktime') return 'mov';
  if (mimeType === 'video/webm') return 'webm';
  return kind === 'video' ? 'mp4' : 'jpg';
}

export default function MediaScreen() {
  const { content, socialLinks, entitlements, user, profile } = useAppContext();
  const styles = useMemo(() => createStyles(), []);
  const [usageMs, setUsageMs] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [qrScanned, setQrScanned] = useState(false);
  const isFocused = useIsFocused();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [legendModalOpen, setLegendModalOpen] = useState(false);
  const [legendQuestion, setLegendQuestion] = useState('');
  const [legendReply, setLegendReply] = useState('');
  const [legendSending, setLegendSending] = useState(false);
  const [legendVoiceOn, setLegendVoiceOn] = useState(true);
  const [legendMicOn, setLegendMicOn] = useState(false);
  const [legendMicBusy, setLegendMicBusy] = useState(false);
  const [legendMicStatus, setLegendMicStatus] = useState('Microfoon staat uit.');
  const [legendAutoStopSeconds, setLegendAutoStopSeconds] = useState<LegendAutoStopSeconds>(6);
  const [legendRemainingSeconds, setLegendRemainingSeconds] = useState(0);
  const [supporterModalOpen, setSupporterModalOpen] = useState(false);
  const [supporterCaption, setSupporterCaption] = useState('');
  const [supporterNote, setSupporterNote] = useState('');
  const [supporterAsset, setSupporterAsset] = useState<SupporterSubmissionAsset | null>(null);
  const [supporterSubmitting, setSupporterSubmitting] = useState(false);
  const legendStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const legendTickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const legendTranscriptRef = useRef('');
  const legendStopReasonRef = useRef<'manual' | 'auto'>('manual');
  const legendShouldListenRef = useRef(false);
  const legendRestartAttemptsRef = useRef(0);
  const legendRemainingRef = useRef(0);
  const legendEnvWarningShownRef = useRef(false);
  const [speechFeatureAvailable, setSpeechFeatureAvailable] = useState(false);

  const hasUnlimitedAccess = entitlements.hasLaunchFullAccess || entitlements.isPremium;
  const remainingMs = Math.max(0, MEDIA_DAILY_LIMIT_MS - usageMs);
  const canUseMediaLinks = hasUnlimitedAccess || remainingMs > 0;
  const actionsDisabled = !usageLoaded || !canUseMediaLinks;

  const usageStorageKey = user?.id ? `media-links-usage:${user.id}:${getLocalDateKey()}` : null;

  useEffect(() => {
    const loadUsage = async () => {
      if (!usageStorageKey || hasUnlimitedAccess) {
        setUsageMs(0);
        setUsageLoaded(true);
        return;
      }

      const raw = await AsyncStorage.getItem(usageStorageKey);
      const parsed = Number(raw ?? '0');
      setUsageMs(Number.isFinite(parsed) ? parsed : 0);
      setUsageLoaded(true);
    };

    setUsageLoaded(false);
    void loadUsage();
  }, [usageStorageKey, hasUnlimitedAccess]);

  useEffect(() => {
    if (!legendModalOpen) return;
    setSpeechFeatureAvailable(hasUsableSpeechRecognitionModule());
  }, [legendModalOpen]);

  useEffect(() => {
    if (!isFocused || hasUnlimitedAccess || !usageLoaded || !usageStorageKey) return;
    if (remainingMs <= 0) return;

    const timer = setInterval(() => {
      setUsageMs((prev) => {
        const next = Math.min(MEDIA_DAILY_LIMIT_MS, prev + 1000);
        void AsyncStorage.setItem(usageStorageKey, String(next));
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFocused, hasUnlimitedAccess, usageLoaded, usageStorageKey, remainingMs]);

  const withProtocol = (url: string) => {
    const value = url.trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  };

  const isValidHttpUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const openLink = async (url: string) => {
    if (actionsDisabled) {
      Alert.alert(
        'Daglimiet bereikt',
        'Voor Free accounts is social links maximaal 10 minuten per dag buiten de launchperiode.'
      );
      return;
    }

    const normalized = withProtocol(url);
    if (!normalized) {
      Alert.alert('Link ontbreekt', 'Voeg eerst een link toe.');
      return;
    }
    if (!isValidHttpUrl(normalized)) {
      Alert.alert('Ongeldige link', 'Gebruik een geldige URL, bijvoorbeeld https://...');
      return;
    }
    await WebBrowser.openBrowserAsync(normalized);
  };
  const openQrScanner = async () => {
    if (actionsDisabled) {
      Alert.alert(
        'Daglimiet bereikt',
        'Voor Free accounts is social links maximaal 10 minuten per dag buiten de launchperiode.'
      );
      return;
    }

    setQrScanned(false);
    setQrValue('');
    setQrModalOpen(true);
  };
  const onQrScanned = ({ data }: { data: string }) => {
    if (qrScanned) return;
    const nextValue = data.trim();
    setQrScanned(true);
    setQrValue(nextValue);
  };
  const pasteQrValue = async () => {
    const value = (await Clipboard.getStringAsync()).trim();
    if (!value) {
      Alert.alert('Klembord leeg', 'Geen QR-inhoud op klembord gevonden.');
      return;
    }
    setQrValue(value);
  };
  const copyQrValue = async () => {
    if (!qrValue.trim()) {
      Alert.alert('Geen QR data', 'Scan eerst een QR-code.');
      return;
    }
    await Clipboard.setStringAsync(qrValue.trim());
    Alert.alert('Gekopieerd', 'QR-inhoud is gekopieerd.');
  };
  const openQrValue = async () => {
    if (!qrValue.trim()) {
      Alert.alert('Geen QR data', 'Scan eerst een QR-code.');
      return;
    }
    await openLink(qrValue.trim());
  };

  const resetSupporterSubmission = useCallback(() => {
    setSupporterCaption('');
    setSupporterNote('');
    setSupporterAsset(null);
    setSupporterSubmitting(false);
  }, []);

  const closeSupporterModal = useCallback(() => {
    if (supporterSubmitting) return;
    setSupporterModalOpen(false);
  }, [supporterSubmitting]);

  const openSupporterModal = useCallback(() => {
    resetSupporterSubmission();
    setSupporterModalOpen(true);
  }, [resetSupporterSubmission]);

  const pickSupporterMedia = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Toegang nodig', "Geef toegang tot foto's en video's om een inzending te kiezen.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.85,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const kind = asset.type === 'video' ? 'video' : 'image';
    const size = typeof asset.fileSize === 'number' ? asset.fileSize : null;
    if (size != null && size > SUPPORTER_MEDIA_MAX_BYTES) {
      Alert.alert('Bestand te groot', 'Kies een foto of video tot maximaal 50 MB.');
      return;
    }

    const mimeType =
      asset.mimeType?.trim() || (kind === 'video' ? 'video/mp4' : 'image/jpeg');
    const fileName =
      asset.fileName?.trim() ||
      `supporter-${Date.now()}.${extensionFromMimeType(mimeType, kind)}`;

    setSupporterAsset({
      uri: asset.uri,
      fileName,
      mimeType,
      size,
      kind,
    });
  }, []);

  const submitSupporterMedia = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Niet ingelogd', 'Log eerst in om een foto of video in te sturen.');
      return;
    }
    if (!supporterAsset) {
      Alert.alert('Kies media', 'Kies eerst een foto of video om in te sturen.');
      return;
    }

    setSupporterSubmitting(true);

    const fallbackDisplayName =
      profile?.displayName?.trim() ||
      `${user.user_metadata?.display_name ?? ''}`.trim() ||
      'Ajax Fan';
    const fallbackUsername =
      profile?.username?.trim() ||
      `${user.user_metadata?.username ?? ''}`.trim();
    const contentType = supporterAsset.mimeType || (supporterAsset.kind === 'video' ? 'video/mp4' : 'image/jpeg');
    const objectPath = `${user.id}/${Date.now()}-${sanitizeFileName(supporterAsset.fileName)}`;

    try {
      const response = await fetch(supporterAsset.uri);
      const blob = await response.blob();

      const uploadResult = await supabase.storage.from(SUPPORTER_MEDIA_BUCKET).upload(objectPath, blob, {
        contentType,
        upsert: false,
      });

      if (uploadResult.error) {
        Alert.alert('Upload mislukt', uploadResult.error.message || 'Probeer het later opnieuw.');
        setSupporterSubmitting(false);
        return;
      }

      const insertResult = await supabase.from('supporter_media_submissions').insert({
        user_id: user.id,
        display_name: fallbackDisplayName,
        username: fallbackUsername,
        contact_email: user.email ?? null,
        media_type: supporterAsset.kind,
        caption: supporterCaption.trim() || null,
        note: supporterNote.trim() || null,
        storage_bucket: SUPPORTER_MEDIA_BUCKET,
        storage_path: objectPath,
        mime_type: contentType,
        original_file_name: supporterAsset.fileName,
        file_size_bytes: supporterAsset.size,
      });

      if (insertResult.error) {
        await supabase.storage.from(SUPPORTER_MEDIA_BUCKET).remove([objectPath]);
        Alert.alert('Inzenden mislukt', insertResult.error.message || 'Probeer het later opnieuw.');
        setSupporterSubmitting(false);
        return;
      }

      setSupporterSubmitting(false);
      setSupporterModalOpen(false);
      resetSupporterSubmission();
      Alert.alert(
        'Inzending ontvangen',
        'Je foto of video is ingestuurd en komt eerst in beoordeling voordat die op het kanaal wordt geplaatst.'
      );
    } catch (error: any) {
      setSupporterSubmitting(false);
      Alert.alert('Inzenden mislukt', error?.message ?? 'Probeer het later opnieuw.');
    }
  }, [profile?.displayName, profile?.username, resetSupporterSubmission, supporterAsset, supporterCaption, supporterNote, user?.email, user?.id, user?.user_metadata]);

  useEffect(() => {
    if (!qrModalOpen) return;
    if (cameraPermission?.granted) return;
    if (cameraPermission?.canAskAgain === false) return;
    void requestCameraPermission();
  }, [qrModalOpen, cameraPermission?.granted, cameraPermission?.canAskAgain, requestCameraPermission]);

  const clearLegendTimers = useCallback(() => {
    if (legendStopTimerRef.current) {
      clearTimeout(legendStopTimerRef.current);
      legendStopTimerRef.current = null;
    }
    if (legendTickTimerRef.current) {
      clearInterval(legendTickTimerRef.current);
      legendTickTimerRef.current = null;
    }
  }, []);

  const buildLegendReply = useCallback((questionRaw: string) => {
    const question = questionRaw.trim();
    if (!question) {
      return 'Stuur eerst een vraag in tekst. Je kunt de microfoon gebruiken en daarna je vraag typen.';
    }
    const q = question.toLowerCase();
    const variant = (options: string[]) => {
      let hash = 0;
      for (let i = 0; i < q.length; i += 1) {
        hash = (hash * 31 + q.charCodeAt(i)) >>> 0;
      }
      return options[hash % options.length] ?? options[0];
    };

    if (q.includes('opstelling')) {
      return variant([
        'Opstelling komt binnen via de Wedstrijden-tab bij Opstelling. Daar staat direct de basiself en bank.',
        'Voor opstelling: open Wedstrijden en kies Opstelling. Die wordt automatisch geupdate zodra bekend.',
        'Opstelling check je in de Wedstrijden-tab. Zodra Ajax hem publiceert, staat hij daar meteen live.',
      ]);
    }
    if (q.includes('stand') || q.includes('live score')) {
      return variant([
        'Voor live stand: gebruik Standen en Live in de Wedstrijden-tab. Zet live updates aan voor pushmeldingen.',
        'Live score vind je onder Wedstrijden > Live. Standen-tab laat direct de actuele ranglijst zien.',
        'Check Wedstrijden-tab voor live score en stand. Met live meldingen krijg je updates tijdens de match.',
      ]);
    }
    if (q.includes('transfer') || q.includes('nieuws')) {
      return variant([
        'Transfer en breaking nieuws staan in de Nieuws-tab. Daar verschijnen de laatste updates automatisch.',
        'Voor nieuwsupdates: open Nieuws-tab. Belangrijke transfer- of clubmeldingen komen daar als eerste binnen.',
        'Nieuws en transfers vind je centraal in de Nieuws-tab, inclusief recente Ajax-updates.',
      ]);
    }
    if (q.includes('kaart') || q.includes('stadion') || q.includes('route')) {
      return variant([
        'Route, stadionkaart en extra links staan in Media. Daarmee navigeer je snel naar de juiste plek.',
        'Voor stadion en route: ga naar Media-tab. Daar heb je kaart, route en aanvullende links bij elkaar.',
        'Gebruik de Media-tab voor stadioninformatie: kaart, route en handige links staan daar direct klaar.',
      ]);
    }
    return variant([
      `Goede vraag over "${question}". Check Nieuws voor updates, Wedstrijden voor live info en Fan Chat om mee te praten.`,
      `Over "${question}": kijk eerst in Wedstrijden en Nieuws. In Fan Chat kun je ook direct supporters vragen.`,
      `Mooie vraag: "${question}". Gebruik Nieuws, Wedstrijden en Media voor de snelste route naar je antwoord. WZAWZDB.`,
    ]);
  }, []);

  const askLegendAi = useCallback(async (questionOverride?: string) => {
    const question = (questionOverride ?? legendQuestion).trim();
    if (!question) {
      Alert.alert('Vraag ontbreekt', 'Typ eerst je vraag voor de Legend AI.');
      return;
    }
    if (questionOverride) {
      setLegendQuestion(question);
    }
    setLegendSending(true);
    const reply = buildLegendReply(question);
    setLegendReply(reply);
    if (legendVoiceOn) {
      try {
        Speech.stop();
        Speech.speak(reply, {
          language: 'nl-NL',
          pitch: 1,
          rate: 0.96,
        });
      } catch {
        setLegendMicStatus('Stem afspelen is nu niet beschikbaar. Je kunt wel typen en lezen.');
      }
    }
    setLegendQuestion('');
    legendTranscriptRef.current = '';
    setLegendMicStatus('Antwoord klaar. Stel gerust je volgende vraag.');
    setLegendSending(false);
  }, [buildLegendReply, legendQuestion, legendVoiceOn]);

  const resetLegendConversation = () => {
    setLegendQuestion('');
    setLegendReply('');
    legendTranscriptRef.current = '';
    setLegendMicStatus('Nieuwe vraag gestart.');
  };

  const stopLegendMic = useCallback(async (reason: 'manual' | 'auto' = 'manual') => {
    clearLegendTimers();
    legendShouldListenRef.current = false;
    if (!legendMicOn) {
      legendStopReasonRef.current = 'manual';
      setLegendMicOn(false);
      setLegendRemainingSeconds(0);
      legendRemainingRef.current = 0;
      setLegendMicStatus('Microfoon staat uit.');
      return;
    }
    legendStopReasonRef.current = reason;
    setLegendMicStatus('Microfoon stoppen...');
    try {
      getSpeechRecognitionModule()?.stop();
    } catch {
      // negeren
    }
    setLegendMicOn(false);
    setLegendRemainingSeconds(0);
    legendRemainingRef.current = 0;
  }, [clearLegendTimers, legendMicOn]);

  const startLegendMic = async () => {
    if (legendMicBusy) return;
    setLegendMicBusy(true);
    setLegendMicStatus('Microfoon opstarten...');
    try {
      const speechModule = getSpeechRecognitionModule();
      if (!speechModule) {
        setLegendMicStatus('Spraakherkenning niet beschikbaar (Expo Go). Gebruik typen.');
        if (!legendEnvWarningShownRef.current) {
          legendEnvWarningShownRef.current = true;
          Alert.alert(
            'Microfoon niet beschikbaar',
            'Spraakherkenning werkt niet in deze omgeving. Gebruik een development build of typ je vraag.'
          );
        }
        setLegendMicOn(false);
        return;
      }

      let permissionGranted = false;
      try {
        const permission = await speechModule.requestPermissionsAsync();
        permissionGranted = Boolean(permission.granted);
      } catch {
        setLegendMicStatus('Spraakherkenning is niet beschikbaar in deze build.');
        setLegendMicOn(false);
        return;
      }

      if (!permissionGranted) {
        setLegendMicStatus('Microfoon-toegang geweigerd.');
        Alert.alert('Toegang nodig', 'Geef microfoon-toegang om te praten met de legend AI.');
        setLegendMicOn(false);
        return;
      }

      if (!speechModule.isRecognitionAvailable()) {
        setLegendMicStatus('Spraakherkenning is niet beschikbaar op dit toestel.');
        setLegendMicOn(false);
        return;
      }

      if (legendMicOn) {
        await stopLegendMic('manual');
      }
      legendTranscriptRef.current = '';
      legendStopReasonRef.current = 'manual';
      legendShouldListenRef.current = true;
      legendRestartAttemptsRef.current = 0;
      setLegendReply('');

      speechModule.start({
        lang: 'nl-NL',
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
      });

      setLegendMicOn(true);
      setLegendRemainingSeconds(legendAutoStopSeconds);
      legendRemainingRef.current = legendAutoStopSeconds;
      setLegendMicStatus('Luistert...');

      legendTickTimerRef.current = setInterval(() => {
        setLegendRemainingSeconds((prev) => {
          const next = Math.max(0, prev - 1);
          legendRemainingRef.current = next;
          return next;
        });
      }, 1000);
      legendStopTimerRef.current = setTimeout(() => {
        void stopLegendMic('auto');
      }, legendAutoStopSeconds * 1000);
    } catch {
      setLegendMicStatus('Spraakherkenning kon niet starten.');
      setLegendMicOn(false);
      clearLegendTimers();
    } finally {
      setLegendMicBusy(false);
    }
  };

  const toggleLegendMic = async () => {
    if (legendMicOn) {
      await stopLegendMic('manual');
      return;
    }
    await startLegendMic();
  };

  useEffect(() => {
    if (!legendModalOpen || !legendMicOn || !speechFeatureAvailable) return;
    const speechModule = getSpeechRecognitionModule();
    const addListener = speechModule?.addListener;
    if (!addListener) return;

    const resultSub = addListener('result', (event: SpeechRecognitionResultEvent) => {
      const transcript = event.results?.[0]?.transcript?.trim() ?? '';
      if (!transcript) return;
      legendTranscriptRef.current = transcript;
      setLegendQuestion(transcript);
      if (event.isFinal) {
        setLegendMicStatus('Spraak herkend. Vraag klaar om te versturen.');
      }
    });

    const errorSub = addListener('error', (event: SpeechRecognitionErrorEvent) => {
      clearLegendTimers();
      legendShouldListenRef.current = false;
      setLegendMicOn(false);
      setLegendRemainingSeconds(0);
      legendRemainingRef.current = 0;
      setLegendMicStatus(`Fout: ${event.message || event.error || 'onbekend'}`);
    });

    const endSub = addListener('end', () => {
      const reason = legendStopReasonRef.current;
      const transcript = legendTranscriptRef.current.trim();

      if (reason === 'manual' && legendShouldListenRef.current && legendRemainingRef.current > 0) {
        if (legendRestartAttemptsRef.current < 2) {
          legendRestartAttemptsRef.current += 1;
          try {
            speechModule?.start({
              lang: 'nl-NL',
              interimResults: true,
              continuous: true,
              addsPunctuation: true,
            });
            setLegendMicOn(true);
            setLegendMicStatus('Luistert...');
            return;
          } catch {
            // verder naar fallback-afhandeling
          }
        }
      }

      clearLegendTimers();
      setLegendMicOn(false);
      setLegendRemainingSeconds(0);
      legendRemainingRef.current = 0;
      legendStopReasonRef.current = 'manual';
      legendShouldListenRef.current = false;
      if (reason === 'auto') {
        if (transcript) {
          setLegendMicStatus('Microfoon automatisch gestopt. Vraag versturen...');
          void askLegendAi(transcript);
        } else {
          setLegendMicStatus('Geen spraak herkend. Probeer opnieuw of typ je vraag.');
        }
        return;
      }
      setLegendMicStatus(transcript ? 'Spraak herkend. Je kunt nu versturen.' : 'Microfoon staat uit.');
    });

    return () => {
      resultSub?.remove?.();
      errorSub?.remove?.();
      endSub?.remove?.();
    };
  }, [askLegendAi, clearLegendTimers, legendModalOpen, legendMicOn, speechFeatureAvailable]);

  const openLegendModal = () => {
    if (actionsDisabled) {
      Alert.alert(
        'Daglimiet bereikt',
        'Voor Free accounts is social links maximaal 10 minuten per dag buiten de launchperiode.'
      );
      return;
    }
    setSpeechFeatureAvailable(hasUsableSpeechRecognitionModule());
    setLegendMicStatus('Typ je vraag of gebruik de microfoon.');
    setLegendModalOpen(true);
  };

  const closeLegendModal = () => {
    setLegendModalOpen(false);
  };

  useEffect(() => {
    if (!legendModalOpen) {
      try {
        Speech.stop();
      } catch {
        // negeren
      }
      void stopLegendMic('manual');
    }
  }, [legendModalOpen, stopLegendMic]);

  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch {
        // negeren
      }
      void stopLegendMic('manual');
    };
  }, [stopLegendMic]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!hasUnlimitedAccess ? (
        <View style={[styles.limitCard, !canUseMediaLinks && styles.limitCardLocked]}>
          <Text style={styles.limitTitle}>Free social links limiet</Text>
          <Text style={styles.limitText}>
            {canUseMediaLinks
              ? `Nog beschikbaar vandaag: ${formatRemaining(remainingMs)} (max 10 minuten per dag)`
              : 'Daglimiet bereikt. Morgen opnieuw beschikbaar of upgrade naar Premium/VIP.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionHead}>Webshops links</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={[styles.linkBtn, styles.quickGridBtn, actionsDisabled && styles.disabledBtn]}
            onPress={() => void openLink(content.webshopFsideUrl)}
            disabled={actionsDisabled}
          >
            <Text style={[styles.linkBtnText, styles.quickGridBtnText]}>F-Side Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.linkBtn, styles.quickGridBtn, actionsDisabled && styles.disabledBtn]}
            onPress={() => void openLink(content.webshopAfcaUrl)}
            disabled={actionsDisabled}
          >
            <Text style={[styles.linkBtnText, styles.quickGridBtnText]}>AFCA Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.linkBtn, styles.quickGridBtn, actionsDisabled && styles.disabledBtn]}
            onPress={() => void openLink(content.webshopAjaxUrl)}
            disabled={actionsDisabled}
          >
            <Text style={[styles.linkBtnText, styles.quickGridBtnText]}>Ajax Official Shop</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.linkColumnsRow}>
          <View style={styles.linkColumnCard}>
            <Text style={styles.linkColumnTitle}>Internet links</Text>
            <View style={styles.linkColumnList}>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.tuneInBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink(GENERIC_RADIO_URL)}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.tuneInIconBadge]}>
                      <MaterialCommunityIcons name="radio" size={15} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextLight]}>RADIO</Text>
                  </View>
                  <Text style={[styles.brandLinkText, styles.brandLinkTextLight, styles.brandLinkTag]}>NL</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.googleBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink('https://www.google.com')}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.googleIconBadge]}>
                      <MaterialCommunityIcons name="google" size={16} color="#4285F4" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextDark]}>Open Google</Text>
                  </View>
                  <View style={styles.googleTag}>
                    <Text style={styles.googleTagBlue}>G</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.googleCalendarBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink(GOOGLE_CALENDAR_URL)}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.googleCalendarIconBadge]}>
                      <MaterialCommunityIcons name="calendar-month" size={16} color="#34A853" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextDark]}>Google Agenda</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.totoBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink(TOTO_SPORT_URL)}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <Text style={[styles.brandLinkText, styles.brandLinkTextLight]}>Sport</Text>
                  <View style={styles.totoBadge}>
                    <View style={styles.totoAccentDot} />
                    <Text style={styles.totoBadgeText}>TOTO</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.parkingBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink(ARENA_PARKING_URL)}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.parkingIconBadge]}>
                      <MaterialCommunityIcons name="parking" size={15} color="#1565C0" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextDark]}>Parkeren</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.easyParkBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink(EASYPARK_URL)}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.easyParkIconBadge]}>
                      <MaterialCommunityIcons name="car-connected" size={15} color="#0057FF" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextDark]}>EasyPark</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.qParkBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink(QPARK_URL)}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.qParkIconBadge]}>
                      <MaterialCommunityIcons name="alpha-q-circle" size={15} color="#111111" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextDark]}>Q-Park</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.legendBtn, actionsDisabled && styles.disabledBtn]}
                onPress={openLegendModal}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.legendIconBadge]}>
                      <MaterialCommunityIcons name="microphone-message" size={15} color="#FFD700" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextLight]}>Praat met een Ajax legend</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.qrBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openQrScanner()}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.qrIconBadge]}>
                      <MaterialCommunityIcons name="qrcode-scan" size={15} color="#111111" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextDark]}>QR Scanner</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.linkColumnCard}>
            <Text style={styles.linkColumnTitle}>Plattegrond links</Text>
            <View style={styles.linkColumnList}>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.mapsBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink(content.stadiumRouteUrl)}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.mapsIconBadge]}>
                      <MaterialCommunityIcons name="map-marker-path" size={15} color="#34A853" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextDark]}>Route stadion</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.arenaBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink(content.arenaMapUrl)}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.arenaIconBadge]}>
                      <MaterialCommunityIcons name="stadium" size={15} color="#B71C1C" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextDark]}>ArenA kaart</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.cafeBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink(content.cafesMapUrl)}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.cafeIconBadge]}>
                      <MaterialCommunityIcons name="coffee" size={15} color="#6D4C41" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextDark]}>Cafes stadion</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brandLinkBtn, styles.restaurantBtn, actionsDisabled && styles.disabledBtn]}
                onPress={() => void openLink(content.restaurantsMapUrl)}
                disabled={actionsDisabled}
              >
                <View style={styles.brandLinkRow}>
                  <View style={styles.brandLinkLeft}>
                    <View style={[styles.brandIconBadge, styles.restaurantIconBadge]}>
                      <MaterialCommunityIcons name="silverware-fork-knife" size={15} color="#F57C00" />
                    </View>
                    <Text style={[styles.brandLinkText, styles.brandLinkTextDark]}>Restaurants stadion</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ajax kanaal & social accounts</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, actionsDisabled && styles.disabledBtn]}
          onPress={() => void openLink(socialLinks.ajaxYoutubeUrl)}
          disabled={actionsDisabled}
        >
          <Text style={styles.primaryBtnText}>Ajax YouTube kanaal</Text>
        </TouchableOpacity>
        <View style={styles.supportersInfoCard}>
          <Text style={styles.supportersInfoTitle}>{"Stuur je eigen foto's en filmpjes in"}</Text>
          <Text style={styles.supportersInfoText}>
            {
              "Stuur je eigen Ajax foto's en video's in voor het Ajax Supporters kanaal. Als jouw inzending wordt geplaatst, komt die onder jouw gebruikersnaam op het kanaal te staan. Zo kun je jouw filmpjes en momenten later altijd makkelijk terugvinden."
            }
          </Text>
          <View style={styles.supportersRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.supportersPrimaryBtn, styles.supportersYoutubePrimaryBtn, actionsDisabled && styles.disabledBtn]}
              onPress={() => void openLink(SUPPORTERS_YOUTUBE_SUBSCRIBE_URL)}
              disabled={actionsDisabled}
            >
              <View style={styles.supportersPrimaryContent}>
                <View style={styles.supportersYoutubeTitleRow}>
                  <MaterialCommunityIcons name="youtube" size={18} color="#FFFFFF" />
                  <Text style={[styles.primaryBtnText, styles.supportersPrimaryBtnText]}>
                    Open abonneerpagina
                  </Text>
                </View>
                <Text style={styles.supportersPrimaryBrand}>AJAX SUPPORTERS</Text>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.supportersSubmitBtn, supporterSubmitting ? styles.disabledBtn : null]}
            onPress={openSupporterModal}
            disabled={supporterSubmitting}
          >
            <View style={styles.supportersSubmitBtnRow}>
              <MaterialCommunityIcons name="upload" size={17} color="#B00000" />
              <Text style={styles.supportersSubmitBtnText}>Foto of video insturen</Text>
            </View>
            <Text style={styles.supportersSubmitBtnSubtext}>Kies een bestand en stuur het direct vanuit de app in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportersHubBtn} onPress={() => router.push('/hub/media')}>
            <View style={styles.supportersHubBtnRow}>
              <MaterialCommunityIcons name="view-grid-plus-outline" size={17} color="#B00000" />
              <Text style={styles.supportersHubBtnText}>Open ALL-INN Media HUB</Text>
            </View>
            <Text style={styles.supportersHubBtnSubtext}>
              Media HUB is nog in opbouw, maar hier bundelen we straks alle media-apps en inzendingen.
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionHead}>Mijn socials</Text>
        <View style={styles.openSocialList}>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.socialOpenPrimaryBtn, styles.spotifyOpenBtn, actionsDisabled && styles.disabledBtn]}
            onPress={() => void openLink(socialLinks.spotifyUrl)}
            disabled={actionsDisabled}
          >
            <View style={styles.primaryBtnRow}>
              <MaterialCommunityIcons name="spotify" size={17} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Spotify</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.socialOpenPrimaryBtn, styles.facebookOpenBtn, actionsDisabled && styles.disabledBtn]}
            onPress={() => void openLink(socialLinks.facebookUrl)}
            disabled={actionsDisabled}
          >
            <View style={styles.primaryBtnRow}>
              <MaterialCommunityIcons name="facebook" size={17} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Facebook</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.socialOpenPrimaryBtn, styles.instagramOpenBtn, actionsDisabled && styles.disabledBtn]}
            onPress={() => void openLink(socialLinks.instagramUrl)}
            disabled={actionsDisabled}
          >
            <View style={styles.primaryBtnRow}>
              <MaterialCommunityIcons name="instagram" size={17} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Instagram</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.socialOpenPrimaryBtn, styles.threadsOpenBtn, actionsDisabled && styles.disabledBtn]}
            onPress={() => void openLink(socialLinks.threadsUrl)}
            disabled={actionsDisabled}
          >
            <View style={styles.primaryBtnRow}>
              <MaterialCommunityIcons name="at" size={17} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Threads</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.socialOpenPrimaryBtn, styles.tiktokOpenBtn, actionsDisabled && styles.disabledBtn]}
            onPress={() => void openLink(socialLinks.tiktokUrl)}
            disabled={actionsDisabled}
          >
            <View style={styles.primaryBtnRow}>
              <MaterialCommunityIcons name="music-note" size={17} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>TikTok</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.socialOpenPrimaryBtn, styles.xOpenBtn, actionsDisabled && styles.disabledBtn]}
            onPress={() => void openLink(socialLinks.xUrl)}
            disabled={actionsDisabled}
          >
            <View style={styles.primaryBtnRow}>
              <MaterialCommunityIcons name="alpha-x-circle-outline" size={17} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>X</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.socialOpenPrimaryBtn, styles.youtubeOpenBtn, actionsDisabled && styles.disabledBtn]}
            onPress={() => void openLink(SUPPORTERS_YOUTUBE_URL)}
            disabled={actionsDisabled}
          >
            <View style={styles.primaryBtnRow}>
              <MaterialCommunityIcons name="youtube" size={17} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>YouTube</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={supporterModalOpen} transparent animationType="fade" onRequestClose={closeSupporterModal}>
        <View style={styles.supporterOverlay}>
          <Pressable style={styles.supporterBackdrop} onPress={closeSupporterModal} />
          <View style={styles.supporterCard}>
            <Text style={styles.supporterTitle}>Foto of video insturen</Text>
            <Text style={styles.supporterSubtitle}>
              {
                "Je inzending komt eerst in beoordeling. Bij plaatsing op het Ajax Supporters kanaal blijft jouw gebruikersnaam aan de inzending gekoppeld."
              }
            </Text>

            <TouchableOpacity style={styles.supporterPickBtn} onPress={() => void pickSupporterMedia()}>
              <Text style={styles.supporterPickBtnText}>
                {supporterAsset ? 'Kies ander bestand' : 'Kies foto of video'}
              </Text>
            </TouchableOpacity>

            {supporterAsset ? (
              <View style={styles.supporterSelectedCard}>
                <Text style={styles.supporterSelectedTitle}>
                  {supporterAsset.kind === 'video' ? 'Geselecteerde video' : 'Geselecteerde foto'}
                </Text>
                <Text style={styles.supporterSelectedText}>{supporterAsset.fileName}</Text>
                <Text style={styles.supporterSelectedMeta}>
                  {supporterAsset.size != null
                    ? `${(supporterAsset.size / (1024 * 1024)).toFixed(1)} MB`
                    : 'Bestand gekozen'}
                </Text>
              </View>
            ) : null}

            <Text style={styles.supporterLabel}>Korte titel of omschrijving</Text>
            <TextInput
              style={styles.supporterInput}
              value={supporterCaption}
              onChangeText={setSupporterCaption}
              placeholder="Bijv. Sfeeractie in vak 428"
              placeholderTextColor="#8A8A8A"
              maxLength={80}
            />

            <Text style={styles.supporterLabel}>Extra toelichting</Text>
            <TextInput
              style={[styles.supporterInput, styles.supporterTextarea]}
              value={supporterNote}
              onChangeText={setSupporterNote}
              placeholder="Vertel kort wat er te zien is of waarom dit moment bijzonder is"
              placeholderTextColor="#8A8A8A"
              multiline
              maxLength={400}
            />

            <Text style={styles.supporterHint}>
              Inzender: {profile?.displayName?.trim() || 'Ajax Fan'}
              {profile?.username?.trim() ? ` (${profile.username.trim()})` : ''}
            </Text>

            <View style={styles.supporterActions}>
              <TouchableOpacity
                style={[styles.supporterCancelBtn, supporterSubmitting ? styles.disabledBtn : null]}
                onPress={closeSupporterModal}
                disabled={supporterSubmitting}
              >
                <Text style={styles.supporterCancelBtnText}>Annuleer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.supporterSendBtn, supporterSubmitting ? styles.disabledBtn : null]}
                onPress={() => void submitSupporterMedia()}
                disabled={supporterSubmitting}
              >
                <Text style={styles.supporterSendBtnText}>{supporterSubmitting ? 'Insturen...' : 'Insturen'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={legendModalOpen} transparent animationType="fade" onRequestClose={closeLegendModal}>
        <View style={styles.legendOverlay}>
          <Pressable style={styles.legendBackdrop} onPress={closeLegendModal} />
          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>Praat met een Ajax legend AI</Text>
            <Text style={styles.legendSubtitle}>
              Dit is een AI-supportersstem (geen echte persoon). Microfoon werkt zonder vasthouden en stopt automatisch.
            </Text>

            <View style={styles.legendMicRow}>
              <TouchableOpacity
                style={[styles.legendMicBtn, legendMicOn ? styles.legendMicBtnOn : null]}
                onPress={() => void toggleLegendMic()}
                disabled={legendMicBusy || !speechFeatureAvailable}
              >
                <Text style={styles.legendMicBtnText}>
                  {legendMicBusy
                    ? 'Bezig...'
                    : !speechFeatureAvailable
                      ? 'Alleen dev build'
                      : legendMicOn
                        ? 'Microfoon UIT'
                        : 'Microfoon AAN'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.legendVoiceBtn, legendVoiceOn ? styles.legendVoiceBtnOn : null]}
                onPress={() => setLegendVoiceOn((prev) => !prev)}
              >
                <Text style={[styles.legendVoiceBtnText, legendVoiceOn ? styles.legendVoiceBtnTextOn : null]}>
                  Stem {legendVoiceOn ? 'AAN' : 'UIT'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.legendSectionLabel}>Auto stop microfoon</Text>
            <View style={styles.legendAutoRow}>
              {LEGEND_AUTO_STOP_OPTIONS.map((seconds) => (
                <TouchableOpacity
                  key={`legend-auto-${seconds}`}
                  style={[
                    styles.legendAutoBtn,
                    legendAutoStopSeconds === seconds ? styles.legendAutoBtnActive : null,
                  ]}
                  onPress={() => setLegendAutoStopSeconds(seconds)}
                  disabled={legendMicOn}
                >
                  <Text
                    style={[
                      styles.legendAutoBtnText,
                      legendAutoStopSeconds === seconds ? styles.legendAutoBtnTextActive : null,
                    ]}
                  >
                    {seconds}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.legendStatusText}>
              {legendMicStatus}
              {legendMicOn ? ` (${legendRemainingSeconds}s)` : ''}
            </Text>

            <TextInput
              style={styles.legendInput}
              value={legendQuestion}
              onChangeText={(value) => {
                setLegendQuestion(value);
                if (legendReply) setLegendReply('');
              }}
              placeholder="Typ je vraag voor de legend AI..."
              placeholderTextColor="#7A7A7A"
              multiline
              maxLength={320}
              textAlignVertical="top"
            />

            {legendReply ? (
              <View style={styles.legendReplyBox}>
                <Text style={styles.legendReplyLabel}>Legend AI antwoord</Text>
                <Text style={styles.legendReplyText}>{legendReply}</Text>
              </View>
            ) : null}

            <View style={styles.legendActions}>
              <TouchableOpacity style={styles.legendGhostBtn} onPress={resetLegendConversation}>
                <Text style={styles.legendGhostBtnText}>Nieuwe vraag</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.legendGhostBtn} onPress={closeLegendModal}>
                <Text style={styles.legendGhostBtnText}>Sluit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.legendPrimaryBtn, legendSending && styles.disabledBtn]}
                onPress={() => void askLegendAi()}
                disabled={legendSending}
              >
                <Text style={styles.legendPrimaryBtnText}>{legendSending ? 'Verwerken...' : 'Verstuur vraag'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={qrModalOpen} transparent animationType="fade" onRequestClose={() => setQrModalOpen(false)}>
        <View style={styles.qrOverlay}>
          <Pressable style={styles.qrBackdrop} onPress={() => setQrModalOpen(false)} />
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>QR scanner</Text>
            <View style={styles.qrCameraWrap}>
              {cameraPermission?.granted ? (
                <CameraView
                  style={styles.qrCamera}
                  facing="back"
                  active={qrModalOpen && isFocused}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={qrScanned ? undefined : onQrScanned}
                />
              ) : (
                <View style={styles.qrCameraFallback}>
                  <Text style={styles.qrCameraFallbackText}>
                    Camera staat uit. Geef toegang of plak QR inhoud via klembord.
                  </Text>
                  <TouchableOpacity style={styles.qrGhostBtn} onPress={() => void requestCameraPermission()}>
                    <Text style={styles.qrGhostBtnText}>Geef cameratoegang</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.qrGhostBtn} onPress={() => void pasteQrValue()}>
                    <Text style={styles.qrGhostBtnText}>Plak uit klembord</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.qrResultBox}>
              <Text style={styles.qrResultLabel}>Gescande inhoud</Text>
              <TextInput
                style={styles.qrInput}
                value={qrValue}
                onChangeText={setQrValue}
                placeholder="Plak of typ QR inhoud..."
                placeholderTextColor="#7A7A7A"
                multiline
              />
            </View>
            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.qrGhostBtn} onPress={() => setQrScanned(false)}>
                <Text style={styles.qrGhostBtnText}>Scan opnieuw</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrGhostBtn} onPress={() => setQrValue('')}>
                <Text style={styles.qrGhostBtnText}>Wis</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrGhostBtn} onPress={() => void copyQrValue()}>
                <Text style={styles.qrGhostBtnText}>Kopieer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrPrimaryBtn} onPress={() => void openQrValue()}>
                <Text style={styles.qrPrimaryBtnText}>Open</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    content: { padding: 16, paddingBottom: 26, gap: 12 },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: Ajax.red,
      gap: 8,
    },
    limitCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1.4,
      borderColor: Ajax.red,
      padding: 12,
      gap: 3,
    },
    limitCardLocked: {
      backgroundColor: '#FFF2F2',
    },
    limitTitle: { color: Ajax.red, fontSize: 13, fontWeight: '900' },
    limitText: { color: '#333333', fontSize: 12, fontWeight: '600' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#111111', marginBottom: 2 },
    sectionHead: { fontSize: 12, color: '#555555', fontWeight: '800', marginTop: 6 },
    linkColumnsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 4,
    },
    linkColumnCard: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E4E4E4',
      backgroundColor: '#F8F8F8',
      padding: 8,
      gap: 7,
      alignSelf: 'stretch',
    },
    linkColumnTitle: {
      fontSize: 12,
      color: '#242424',
      fontWeight: '900',
      marginBottom: 1,
    },
    linkColumnList: {
      gap: 7,
    },
    linkBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Ajax.red,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: Ajax.red,
    },
    linkBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quickGridBtn: {
      width: '48.7%',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 32,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    quickGridBtnText: {
      fontSize: 13,
      fontWeight: '900',
      textAlign: 'center',
    },
    brandLinkBtn: {
      borderRadius: 10,
      borderWidth: 1.2,
      paddingVertical: 9,
      paddingHorizontal: 9,
    },
    brandLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    brandLinkLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    brandIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandLinkText: {
      fontSize: 12,
      fontWeight: '900',
      flexShrink: 1,
    },
    brandLinkTextLight: {
      color: '#FFFFFF',
    },
    brandLinkTextDark: {
      color: '#111111',
    },
    brandLinkTag: {
      fontSize: 10,
      opacity: 0.92,
    },
    tuneInBtn: {
      backgroundColor: '#6F2CFF',
      borderColor: '#6F2CFF',
    },
    tuneInIconBadge: {
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    googleBtn: {
      backgroundColor: '#FFFFFF',
      borderColor: '#DADCE0',
    },
    googleIconBadge: {
      backgroundColor: '#F5F5F5',
    },
    googleTag: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#DADCE0',
    },
    googleTagBlue: {
      color: '#4285F4',
      fontSize: 16,
      fontWeight: '900',
    },
    googleCalendarBtn: {
      backgroundColor: '#FFFFFF',
      borderColor: '#34A853',
    },
    googleCalendarIconBadge: {
      backgroundColor: '#EAF6EE',
    },
    totoBtn: {
      backgroundColor: '#00A651',
      borderColor: '#00A651',
    },
    totoBadge: {
      minWidth: 48,
      borderRadius: 7,
      backgroundColor: '#111111',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 5,
      position: 'relative',
    },
    totoBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    totoAccentDot: {
      position: 'absolute',
      top: 3,
      right: 9,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#FF8C00',
    },
    parkingBtn: {
      backgroundColor: '#EAF2FF',
      borderColor: '#1565C0',
    },
    parkingIconBadge: {
      backgroundColor: '#FFFFFF',
    },
    easyParkBtn: {
      backgroundColor: '#EDF3FF',
      borderColor: '#0057FF',
    },
    easyParkIconBadge: {
      backgroundColor: '#FFFFFF',
    },
    qParkBtn: {
      backgroundColor: '#FFF5CC',
      borderColor: '#F0C400',
    },
    qParkIconBadge: {
      backgroundColor: '#FFFFFF',
    },
    legendBtn: {
      backgroundColor: '#101010',
      borderColor: '#D2001C',
    },
    legendIconBadge: {
      backgroundColor: '#232323',
    },
    qrBtn: {
      backgroundColor: '#FFFFFF',
      borderColor: '#111111',
    },
    qrIconBadge: {
      backgroundColor: '#F1F1F1',
    },
    mapsBtn: {
      backgroundColor: '#EAF6EE',
      borderColor: '#34A853',
    },
    mapsIconBadge: {
      backgroundColor: '#FFFFFF',
    },
    arenaBtn: {
      backgroundColor: '#FFF5F5',
      borderColor: '#B71C1C',
    },
    arenaIconBadge: {
      backgroundColor: '#FFFFFF',
    },
    cafeBtn: {
      backgroundColor: '#F7F0EA',
      borderColor: '#8D6E63',
    },
    cafeIconBadge: {
      backgroundColor: '#FFFFFF',
    },
    restaurantBtn: {
      backgroundColor: '#FFF5E9',
      borderColor: '#F57C00',
    },
    restaurantIconBadge: {
      backgroundColor: '#FFFFFF',
    },
    inputRow: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Ajax.red,
      paddingHorizontal: 12,
      backgroundColor: Ajax.red,
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inputRowCompact: {
      minHeight: 24,
      borderRadius: 8,
      paddingHorizontal: 8,
      gap: 5,
    },
    inputFieldCompact: {
      fontSize: 12,
      paddingVertical: 2,
    },
    inputField: {
      flex: 1,
      color: '#FFFFFF',
      fontSize: 13,
      paddingVertical: 5,
    },
    primaryBtn: {
      borderRadius: 10,
      backgroundColor: Ajax.red,
      alignItems: 'center',
      paddingVertical: 11,
      marginTop: 2,
    },
    primaryBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    supportersRow: {
      flexDirection: 'row',
      marginTop: 2,
    },
    supportersPrimaryBtn: {
      flex: 1,
      marginTop: 0,
      justifyContent: 'center',
      paddingVertical: 6,
    },
    supportersYoutubePrimaryBtn: {
      backgroundColor: '#FF0000',
      borderWidth: 1.2,
      borderColor: '#B00000',
    },
    supportersPrimaryContent: {
      alignItems: 'center',
      transform: [{ translateY: -4 }],
    },
    supportersYoutubeTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    supportersPrimaryBtnText: {
      fontSize: 13,
      lineHeight: 15,
    },
    supportersPrimaryBrand: {
      marginTop: 2,
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
      lineHeight: 22,
      letterSpacing: 0.4,
    },
    supportersInfoCard: {
      marginTop: 8,
      marginBottom: 10,
      borderRadius: 14,
      borderWidth: 1.2,
      borderColor: '#FFB3B3',
      backgroundColor: '#FFF6F6',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 6,
    },
    supportersInfoTitle: {
      color: '#B00000',
      fontSize: 14,
      fontWeight: '900',
    },
    supportersInfoText: {
      color: '#5A1A1A',
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '700',
      marginBottom: 4,
    },
    supportersSubmitBtn: {
      marginTop: 6,
      borderRadius: 12,
      borderWidth: 1.2,
      borderColor: '#FFB3B3',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    supportersSubmitBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    supportersSubmitBtnText: {
      color: '#B00000',
      fontSize: 14,
      fontWeight: '900',
    },
    supportersSubmitBtnSubtext: {
      color: '#7A3030',
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '700',
      textAlign: 'center',
    },
    supportersHubBtn: {
      marginTop: 4,
      borderRadius: 12,
      borderWidth: 1.2,
      borderColor: '#F1C96B',
      backgroundColor: '#FFF9E8',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    supportersHubBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    supportersHubBtnText: {
      color: '#B00000',
      fontSize: 14,
      fontWeight: '900',
    },
    supportersHubBtnSubtext: {
      color: '#7A5A1A',
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '700',
      textAlign: 'center',
    },
    openSocialList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    socialOpenPrimaryBtn: {
      width: '48.7%',
      paddingVertical: 10,
      marginTop: 0,
    },
    spotifyOpenBtn: {
      backgroundColor: '#1DB954',
    },
    facebookOpenBtn: {
      backgroundColor: '#1877F2',
    },
    instagramOpenBtn: {
      backgroundColor: '#C13584',
      borderWidth: 1,
      borderColor: '#833AB4',
    },
    threadsOpenBtn: {
      backgroundColor: '#101010',
      borderWidth: 1,
      borderColor: '#000000',
    },
    tiktokOpenBtn: {
      backgroundColor: '#111111',
      borderWidth: 1,
      borderColor: '#25F4EE',
    },
    xOpenBtn: {
      backgroundColor: '#111111',
      borderWidth: 1,
      borderColor: '#FFFFFF',
    },
    youtubeOpenBtn: {
      backgroundColor: '#FF0000',
    },
    disabledBtn: { opacity: 0.45 },
    supporterOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    supporterBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    supporterCard: {
      width: '100%',
      borderRadius: 16,
      borderWidth: 1.4,
      borderColor: '#FFB3B3',
      backgroundColor: '#FFFDFD',
      padding: 14,
      gap: 10,
    },
    supporterTitle: {
      color: '#111111',
      fontSize: 18,
      fontWeight: '900',
    },
    supporterSubtitle: {
      color: '#5A1A1A',
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
    },
    supporterPickBtn: {
      borderRadius: 12,
      backgroundColor: '#B00000',
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    supporterPickBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
    supporterSelectedCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#FFD3D3',
      backgroundColor: '#FFF3F3',
      padding: 12,
      gap: 4,
    },
    supporterSelectedTitle: {
      color: '#B00000',
      fontSize: 13,
      fontWeight: '900',
    },
    supporterSelectedText: {
      color: '#3A0C0C',
      fontSize: 13,
      fontWeight: '700',
    },
    supporterSelectedMeta: {
      color: '#7A3030',
      fontSize: 12,
      fontWeight: '700',
    },
    supporterLabel: {
      color: '#111111',
      fontSize: 13,
      fontWeight: '800',
    },
    supporterInput: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2B5B5',
      backgroundColor: '#FFFFFF',
      color: '#111111',
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    supporterTextarea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    supporterHint: {
      color: '#6A4747',
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '700',
    },
    supporterActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    supporterCancelBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1.2,
      borderColor: '#C9A4A4',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    supporterCancelBtnText: {
      color: '#7A3030',
      fontSize: 13,
      fontWeight: '900',
    },
    supporterSendBtn: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: '#B00000',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    supporterSendBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },
    legendOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    legendBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    legendCard: {
      width: '100%',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      padding: 12,
      gap: 8,
      maxHeight: '90%',
    },
    legendTitle: {
      color: '#111111',
      fontSize: 18,
      fontWeight: '900',
    },
    legendSubtitle: {
      color: '#444444',
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '700',
    },
    legendMicRow: {
      flexDirection: 'row',
      gap: 8,
    },
    legendMicBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: Ajax.red,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    legendMicBtnOn: {
      backgroundColor: '#111111',
      borderColor: '#111111',
    },
    legendMicBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    legendVoiceBtn: {
      width: 116,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    legendVoiceBtnOn: {
      backgroundColor: Ajax.red,
    },
    legendVoiceBtnText: {
      color: Ajax.red,
      fontSize: 12,
      fontWeight: '900',
    },
    legendVoiceBtnTextOn: {
      color: '#FFFFFF',
    },
    legendSectionLabel: {
      color: '#555555',
      fontSize: 12,
      fontWeight: '800',
      marginTop: 2,
    },
    legendAutoRow: {
      flexDirection: 'row',
      gap: 6,
    },
    legendAutoBtn: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    legendAutoBtnActive: {
      backgroundColor: Ajax.red,
    },
    legendAutoBtnText: {
      color: Ajax.red,
      fontSize: 12,
      fontWeight: '900',
    },
    legendAutoBtnTextActive: {
      color: '#FFFFFF',
    },
    legendStatusText: {
      color: '#333333',
      fontSize: 12,
      fontWeight: '700',
      marginTop: -2,
    },
    legendInput: {
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      color: '#111111',
      minHeight: 90,
      paddingHorizontal: 10,
      paddingVertical: 10,
      fontSize: 14,
    },
    legendReplyBox: {
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: '#FFF5F5',
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 4,
    },
    legendReplyLabel: {
      color: Ajax.red,
      fontSize: 11,
      fontWeight: '900',
    },
    legendReplyText: {
      color: '#111111',
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    legendActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 2,
    },
    legendGhostBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    legendGhostBtnText: {
      color: Ajax.red,
      fontSize: 12,
      fontWeight: '900',
    },
    legendPrimaryBtn: {
      flex: 1.4,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: Ajax.red,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    legendPrimaryBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    qrOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    qrBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    qrCard: {
      width: '100%',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      padding: 12,
      gap: 9,
    },
    qrTitle: {
      color: '#111111',
      fontSize: 18,
      fontWeight: '900',
    },
    qrCameraWrap: {
      borderRadius: 12,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      overflow: 'hidden',
      backgroundColor: '#111111',
      height: 130,
    },
    qrCamera: {
      flex: 1,
    },
    qrCameraFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 12,
    },
    qrCameraFallbackText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 17,
    },
    qrResultBox: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 8,
      minHeight: 90,
    },
    qrResultLabel: {
      color: '#666666',
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },
    qrResultValue: {
      color: '#111111',
      fontSize: 13,
      fontWeight: '600',
    },
    qrInput: {
      minHeight: 56,
      color: '#111111',
      fontSize: 13,
      fontWeight: '600',
      textAlignVertical: 'top',
      paddingVertical: 2,
    },
    qrActions: {
      flexDirection: 'row',
      gap: 8,
    },
    qrGhostBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      backgroundColor: '#FFFFFF',
    },
    qrGhostBtnText: {
      color: Ajax.red,
      fontSize: 12,
      fontWeight: '800',
    },
    qrPrimaryBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      backgroundColor: Ajax.red,
    },
    qrPrimaryBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
  });
}
