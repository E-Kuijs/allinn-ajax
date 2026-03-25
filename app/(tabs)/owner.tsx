import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Redirect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';
import { supabase } from '@/src/core/supabaseClient';

const FAN_POPUP_COOLDOWN_MS = 5 * 60 * 1000;
const DEFAULT_LEFT_NOTICE_TEXT =
  'Zaterdag wordt de QR scanner getest met de Ajax-intree-QR (tegen Sparta) om te kijken of je zo naar binnen kan komen. Dan heb je een backup wanneer de originele site bij de ingang niet laadt.';

type PopupTargetOption = {
  id: string;
  displayName: string;
  username: string;
  email?: string;
};

type MediaFolderKey = 'videos' | 'fotos' | 'afbeeldingen';

type MediaLibraryItem = {
  id: string;
  title: string;
  uri: string;
};

type SiteShortcut = {
  id: string;
  title: string;
  url: string;
};

type SupporterMediaSubmission = {
  id: string;
  display_name: string | null;
  username: string | null;
  contact_email: string | null;
  media_type: 'image' | 'video';
  caption: string | null;
  note: string | null;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string | null;
  file_size_bytes: number | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
};

export default function OwnerTabScreen() {
  const {
    user,
    profile,
    entitlements,
    content,
    saveWelcomeInfoLinkUrl,
    savePaymentPortalUrl,
    saveLotteryWinnerContent,
    blockedUsers,
    blockUser,
    unblockUser,
    findPopupTargets,
    sendPopupToUser,
    popupMuteUntil,
    setPopupMuteForMinutes,
  } = useAppContext();
  const [infoLinkInput, setInfoLinkInput] = useState('');
  const [paymentPortalInput, setPaymentPortalInput] = useState('');
  const [leftImageUri, setLeftImageUri] = useState<string | null>(null);
  const [rightImageUri, setRightImageUri] = useState<string | null>(null);
  const [leftNoticeText, setLeftNoticeText] = useState('');
  const [savingLeftNoticeText, setSavingLeftNoticeText] = useState(false);
  const [blockedInput, setBlockedInput] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [winnerInterview, setWinnerInterview] = useState('');
  const [winnerVideoUrl, setWinnerVideoUrl] = useState('');
  const [winnerPhotoUrl, setWinnerPhotoUrl] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [savingAdminNote, setSavingAdminNote] = useState(false);
  const [welcomeText, setWelcomeText] = useState('');
  const [savingWelcomeText, setSavingWelcomeText] = useState(false);
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
  const [leftLibraryOpen, setLeftLibraryOpen] = useState(false);
  const [leftLibraryFolder, setLeftLibraryFolder] = useState<MediaFolderKey>('fotos');
  const [leftLibrary, setLeftLibrary] = useState<Record<MediaFolderKey, MediaLibraryItem[]>>({
    videos: [],
    fotos: [],
    afbeeldingen: [],
  });
  const [mediaTitleInput, setMediaTitleInput] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [siteShortcuts, setSiteShortcuts] = useState<SiteShortcut[]>([]);
  const [siteTitleInput, setSiteTitleInput] = useState('');
  const [siteUrlInput, setSiteUrlInput] = useState('');
  const [messageDocument, setMessageDocument] = useState('');
  const [savingMessageDocument, setSavingMessageDocument] = useState(false);
  const [supporterSubmissions, setSupporterSubmissions] = useState<SupporterMediaSubmission[]>([]);
  const [supporterLoading, setSupporterLoading] = useState(false);
  const [supporterError, setSupporterError] = useState('');
  const [supporterPreviewOpen, setSupporterPreviewOpen] = useState(false);
  const [supporterPreviewUri, setSupporterPreviewUri] = useState('');
  const [supporterPreviewTitle, setSupporterPreviewTitle] = useState('');
  const [supporterPreviewIsVideo, setSupporterPreviewIsVideo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setInfoLinkInput(content.welcomeInfoLinkUrl ?? '');
    setPaymentPortalInput(content.paymentPortalUrl ?? '');
  }, [content.paymentPortalUrl, content.welcomeInfoLinkUrl]);

  useEffect(() => {
    const loadWelcomeImages = async () => {
      if (!user?.id) return;
      const [
        storedLeft,
        storedRight,
        storedLeftNoticeText,
        storedAdminNote,
        storedWelcomeText,
        storedLibraryRaw,
        storedLinksRaw,
        storedMessageDocument,
      ] = await Promise.all([
        AsyncStorage.getItem(`welcome-image-left:${user.id}`),
        AsyncStorage.getItem(`welcome-image:${user.id}`),
        AsyncStorage.getItem(`welcome-left-note:${user.id}`),
        AsyncStorage.getItem(`owner-admin-note:${user.id}`),
        AsyncStorage.getItem(`welcome-text:${user.id}`),
        AsyncStorage.getItem(`owner-left-library:${user.id}`),
        AsyncStorage.getItem(`owner-site-shortcuts:${user.id}`),
        AsyncStorage.getItem(`owner-message-document:${user.id}`),
      ]);
      setLeftImageUri(storedLeft?.trim() || null);
      setRightImageUri(storedRight?.trim() || null);
      setLeftNoticeText(storedLeftNoticeText ?? DEFAULT_LEFT_NOTICE_TEXT);
      setAdminNote(storedAdminNote ?? '');
      setWelcomeText(storedWelcomeText ?? '');
      setMessageDocument(storedMessageDocument ?? '');

      if (storedLibraryRaw) {
        try {
          const parsed = JSON.parse(storedLibraryRaw) as Partial<Record<MediaFolderKey, MediaLibraryItem[]>>;
          setLeftLibrary({
            videos: Array.isArray(parsed.videos) ? parsed.videos.filter((row) => !!row?.uri) : [],
            fotos: Array.isArray(parsed.fotos) ? parsed.fotos.filter((row) => !!row?.uri) : [],
            afbeeldingen: Array.isArray(parsed.afbeeldingen) ? parsed.afbeeldingen.filter((row) => !!row?.uri) : [],
          });
        } catch {
          setLeftLibrary({ videos: [], fotos: [], afbeeldingen: [] });
        }
      } else {
        setLeftLibrary({ videos: [], fotos: [], afbeeldingen: [] });
      }

      if (storedLinksRaw) {
        try {
          const parsed = JSON.parse(storedLinksRaw) as SiteShortcut[];
          setSiteShortcuts(
            Array.isArray(parsed)
              ? parsed.filter((row) => !!row?.title && !!row?.url).slice(0, 80)
              : []
          );
        } catch {
          setSiteShortcuts([]);
        }
      } else {
        setSiteShortcuts([]);
      }
    };
    void loadWelcomeImages();
  }, [user?.id]);

  useEffect(() => {
    setWinnerName(content.lotteryWinnerName ?? '');
    setWinnerInterview(content.lotteryWinnerInterview ?? '');
    setWinnerPhotoUrl(content.lotteryWinnerPhotoUrl ?? '');
    setWinnerVideoUrl(content.lotteryWinnerVideoUrl ?? '');
  }, [
    content.lotteryWinnerInterview,
    content.lotteryWinnerName,
    content.lotteryWinnerPhotoUrl,
    content.lotteryWinnerVideoUrl,
  ]);

  useEffect(() => {
    if (!fanPopupName.trim() && profile?.displayName?.trim()) {
      setFanPopupName(profile.displayName.trim());
    }
  }, [fanPopupName, profile?.displayName]);

  useEffect(() => {
    const loadPopupData = async () => {
      if (!user?.id) return;
      const [cooldownRaw, favoritesRaw, senderNameRaw] = await Promise.all([
        AsyncStorage.getItem(`fan-popup-cooldown:${user.id}`),
        AsyncStorage.getItem(`fan-popup-favorites:${user.id}`),
        AsyncStorage.getItem(`fan-popup-sender-name:${user.id}`),
      ]);
      const until = Number(cooldownRaw ?? 0);
      if (Number.isFinite(until) && until > Date.now()) {
        setFanPopupCooldownUntil(until);
      } else {
        setFanPopupCooldownUntil(0);
      }
      if (senderNameRaw?.trim()) {
        setFanPopupName(senderNameRaw.trim());
      }

      if (!favoritesRaw) {
        setFanPopupFavorites([]);
        return;
      }

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
        setFanPopupSelected((current) => current ?? next[0] ?? null);
      } catch {
        setFanPopupFavorites([]);
      }
    };
    void loadPopupData();
  }, [user?.id]);

  useEffect(() => {
    const loadSupporterSubmissions = async () => {
      if (!user?.id) return;
      setSupporterLoading(true);
      setSupporterError('');

      const result = await supabase
        .from('supporter_media_submissions')
        .select(
          'id,display_name,username,contact_email,media_type,caption,note,storage_bucket,storage_path,original_file_name,file_size_bytes,status,admin_note,created_at'
        )
        .order('created_at', { ascending: false })
        .limit(80);

      if (result.error) {
        setSupporterSubmissions([]);
        setSupporterError(result.error.message || 'Kon inzendingen niet laden.');
        setSupporterLoading(false);
        return;
      }

      setSupporterSubmissions((result.data ?? []) as SupporterMediaSubmission[]);
      setSupporterLoading(false);
    };

    void loadSupporterSubmissions();
  }, [user?.id]);

  const refreshSupporterSubmissions = async () => {
    if (!user?.id) return;
    setSupporterLoading(true);
    setSupporterError('');

    const result = await supabase
      .from('supporter_media_submissions')
      .select(
        'id,display_name,username,contact_email,media_type,caption,note,storage_bucket,storage_path,original_file_name,file_size_bytes,status,admin_note,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(80);

    if (result.error) {
      setSupporterSubmissions([]);
      setSupporterError(result.error.message || 'Kon inzendingen niet laden.');
      setSupporterLoading(false);
      return;
    }

    setSupporterSubmissions((result.data ?? []) as SupporterMediaSubmission[]);
    setSupporterError('');
    setSupporterLoading(false);
  };

  useEffect(() => {
    if (fanPopupCooldownUntil <= Date.now()) return;
    const timer = setInterval(() => setFanPopupNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [fanPopupCooldownUntil]);

  if (!entitlements.isDeveloper) {
    return <Redirect href="/(tabs)/welcome" />;
  }

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

  const normalizeExternalUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const formatSubmissionDate = (value: string) => {
    const ts = new Date(value).getTime();
    if (!Number.isFinite(ts)) return 'Onbekend moment';
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  };

  const getSubmissionSizeLabel = (bytes: number | null) => {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const loadSignedSubmissionUrl = async (submission: SupporterMediaSubmission) => {
    const result = await supabase.storage
      .from(submission.storage_bucket)
      .createSignedUrl(submission.storage_path, 60 * 60);

    if (result.error || !result.data?.signedUrl) {
      Alert.alert('Media niet beschikbaar', result.error?.message ?? 'Kon geen tijdelijke link maken.');
      return null;
    }

    return result.data.signedUrl;
  };

  const openSubmissionMedia = async (submission: SupporterMediaSubmission) => {
    const signedUrl = await loadSignedSubmissionUrl(submission);
    if (!signedUrl) return;

    if (submission.media_type === 'image') {
      setSupporterPreviewUri(signedUrl);
      setSupporterPreviewTitle(submission.caption?.trim() || submission.original_file_name?.trim() || 'Foto inzending');
      setSupporterPreviewIsVideo(false);
      setSupporterPreviewOpen(true);
      return;
    }

    setSupporterPreviewUri(signedUrl);
    setSupporterPreviewTitle(submission.caption?.trim() || submission.original_file_name?.trim() || 'Video inzending');
    setSupporterPreviewIsVideo(true);
    const supported = await Linking.canOpenURL(signedUrl);
    if (!supported) {
      Alert.alert('Video niet te openen', 'Kon de video-link niet openen.');
      return;
    }
    await Linking.openURL(signedUrl);
  };

  const updateSubmissionStatus = async (
    submissionId: string,
    status: SupporterMediaSubmission['status'],
    adminNote?: string | null
  ) => {
    const result = await supabase
      .from('supporter_media_submissions')
      .update({
        status,
        admin_note: adminNote ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      })
      .eq('id', submissionId);

    if (result.error) {
      Alert.alert('Status niet opgeslagen', result.error.message || 'Probeer later opnieuw.');
      return;
    }

    setSupporterSubmissions((prev) =>
      prev.map((item) =>
        item.id === submissionId
          ? {
              ...item,
              status,
              admin_note: adminNote ?? null,
            }
          : item
      )
    );
  };

  const onApproveSubmission = async (submission: SupporterMediaSubmission) => {
    await updateSubmissionStatus(submission.id, 'approved', 'Goedgekeurd in owner beheer');
  };

  const onRejectSubmission = async (submission: SupporterMediaSubmission) => {
    await updateSubmissionStatus(submission.id, 'rejected', 'Afgekeurd in owner beheer');
  };

  const onSaveInfoLink = async () => {
    const normalized = normalizeExternalUrl(infoLinkInput);
    if (normalized) {
      const supported = await Linking.canOpenURL(normalized);
      if (!supported) {
        Alert.alert('Link ongeldig', 'Controleer de URL voor INFO TIFO/SUP HOME.');
        return;
      }
    }
    setSaving(true);
    const result = await saveWelcomeInfoLinkUrl(normalized);
    setSaving(false);
    if (!result.ok) {
      Alert.alert('Opslaan mislukt', result.message ?? 'Kon URL niet opslaan.');
      return;
    }
    setInfoLinkInput(normalized);
    Alert.alert('Opgeslagen', normalized ? 'URL is nu zichtbaar voor alle gebruikers.' : 'URL is leeggemaakt.');
  };

  const onTestInfoLink = async () => {
    const normalized = normalizeExternalUrl(infoLinkInput);
    if (!normalized) {
      Alert.alert('Nog niets ingesteld', 'Voor INFO TIFO / SUP HOME staat nog geen URL ingevuld.');
      return;
    }
    const supported = await Linking.canOpenURL(normalized);
    if (!supported) {
      Alert.alert('Link ongeldig', 'Deze URL kan niet geopend worden.');
      return;
    }
    await Linking.openURL(normalized);
  };

  const onSavePaymentPortal = async () => {
    const normalized = normalizeExternalUrl(paymentPortalInput);
    if (normalized) {
      const supported = await Linking.canOpenURL(normalized);
      if (!supported) {
        Alert.alert('Link ongeldig', 'Controleer de URL voor de betaalpagina.');
        return;
      }
    }
    setSaving(true);
    const result = await savePaymentPortalUrl(normalized);
    setSaving(false);
    if (!result.ok) {
      Alert.alert('Opslaan mislukt', result.message ?? 'Kon betaallink niet opslaan.');
      return;
    }
    setPaymentPortalInput(normalized);
    Alert.alert('Opgeslagen', normalized ? 'Betaallink is bijgewerkt.' : 'Betaallink is leeggemaakt.');
  };

  const onTestPaymentPortal = async () => {
    const normalized = normalizeExternalUrl(paymentPortalInput);
    if (!normalized) {
      Alert.alert('Nog niets ingesteld', 'Voor de betaalpagina staat nog geen URL ingevuld.');
      return;
    }
    const supported = await Linking.canOpenURL(normalized);
    if (!supported) {
      Alert.alert('Link ongeldig', 'Deze URL kan niet geopend worden.');
      return;
    }
    await Linking.openURL(normalized);
  };

  const persistLeftLibrary = async (next: Record<MediaFolderKey, MediaLibraryItem[]>) => {
    if (!user?.id) return;
    setLeftLibrary(next);
    await AsyncStorage.setItem(`owner-left-library:${user.id}`, JSON.stringify(next));
  };

  const addMediaFromPicker = async (folder: MediaFolderKey) => {
    if (!user?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Toegang nodig', "Geef toegang tot foto's/video's om media toe te voegen.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: folder === 'videos' ? ['videos'] : ['images'],
      allowsEditing: folder !== 'videos',
      quality: 0.85,
    });
    if (result.canceled || !result.assets.length) return;

    const asset = result.assets[0];
    const titleFallback =
      folder === 'videos'
        ? `Video ${leftLibrary[folder].length + 1}`
        : `Afbeelding ${leftLibrary[folder].length + 1}`;
    const item: MediaLibraryItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: (asset.fileName ?? '').trim() || titleFallback,
      uri: asset.uri,
    };
    const next = {
      ...leftLibrary,
      [folder]: [item, ...leftLibrary[folder]].slice(0, 120),
    };
    await persistLeftLibrary(next);
    setLeftImageUri(item.uri);
    await AsyncStorage.setItem(`welcome-image-left:${user.id}`, item.uri);
    setLeftLibraryOpen(false);
    Alert.alert('Opgeslagen', `${item.title} is toegevoegd en direct links op Welkom geplaatst.`);
  };

  const addMediaUrlToLibrary = async () => {
    if (!user?.id) return;
    const title = mediaTitleInput.trim();
    const normalized = normalizeExternalUrl(mediaUrlInput);
    if (!title) {
      Alert.alert('Titel ontbreekt', 'Vul eerst een naam in.');
      return;
    }
    if (!normalized) {
      Alert.alert('URL ontbreekt', 'Vul eerst een URL in.');
      return;
    }
    const supported = await Linking.canOpenURL(normalized);
    if (!supported) {
      Alert.alert('Link ongeldig', 'Controleer de URL.');
      return;
    }
    const item: MediaLibraryItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      uri: normalized,
    };
    const next = {
      ...leftLibrary,
      [leftLibraryFolder]: [item, ...leftLibrary[leftLibraryFolder]].slice(0, 120),
    };
    await persistLeftLibrary(next);
    setLeftImageUri(normalized);
    await AsyncStorage.setItem(`welcome-image-left:${user.id}`, normalized);
    setLeftLibraryOpen(false);
    setMediaTitleInput('');
    setMediaUrlInput('');
    Alert.alert('Opgeslagen', `${title} is toegevoegd en direct links op Welkom geplaatst.`);
  };

  const removeMediaFromLibrary = async (folder: MediaFolderKey, id: string) => {
    const next = {
      ...leftLibrary,
      [folder]: leftLibrary[folder].filter((item) => item.id !== id),
    };
    await persistLeftLibrary(next);
  };

  const applyLeftImageFromLibrary = async (item: MediaLibraryItem) => {
    if (!user?.id) return;
    if (!item.uri.trim()) return;
    setLeftImageUri(item.uri);
    await AsyncStorage.setItem(`welcome-image-left:${user.id}`, item.uri);
    setLeftLibraryOpen(false);
    Alert.alert('Opgeslagen', 'Linker blok is bijgewerkt.');
  };

  const handleSaveLeftNoticeText = async () => {
    if (!user?.id) return;
    setSavingLeftNoticeText(true);
    await AsyncStorage.setItem(`welcome-left-note:${user.id}`, leftNoticeText.trim());
    setSavingLeftNoticeText(false);
    Alert.alert('Opgeslagen', 'Linkertekst voor Welkom is bijgewerkt.');
  };

  const clearLeftWelcomeImage = async () => {
    if (!user?.id) return;
    setLeftImageUri(null);
    await AsyncStorage.removeItem(`welcome-image-left:${user.id}`);
    Alert.alert('Opgeslagen', 'Linker afbeelding is verwijderd. De tekst wordt nu weer getoond.');
  };

  const saveSiteShortcuts = async (next: SiteShortcut[]) => {
    if (!user?.id) return;
    setSiteShortcuts(next);
    await AsyncStorage.setItem(`owner-site-shortcuts:${user.id}`, JSON.stringify(next));
  };

  const addSiteShortcut = async () => {
    const title = siteTitleInput.trim();
    const normalized = normalizeExternalUrl(siteUrlInput);
    if (!title) {
      Alert.alert('Naam ontbreekt', 'Vul eerst de naam van de site in.');
      return;
    }
    if (!normalized) {
      Alert.alert('URL ontbreekt', 'Vul eerst een URL in.');
      return;
    }
    const supported = await Linking.canOpenURL(normalized);
    if (!supported) {
      Alert.alert('URL ongeldig', 'Deze URL kan niet geopend worden.');
      return;
    }
    const item: SiteShortcut = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      url: normalized,
    };
    await saveSiteShortcuts([item, ...siteShortcuts].slice(0, 120));
    setSiteTitleInput('');
    setSiteUrlInput('');
  };

  const removeSiteShortcut = async (id: string) => {
    await saveSiteShortcuts(siteShortcuts.filter((row) => row.id !== id));
  };

  const pickWelcomeImage = async (side: 'left' | 'right') => {
    if (!user?.id) return;
    if (side === 'left') {
      setLeftLibraryOpen(true);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Toegang nodig', "Geef toegang tot foto's om een afbeelding te kiezen.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets.length) return;

    const uri = result.assets[0].uri;
    setRightImageUri(uri);
    await AsyncStorage.setItem(`welcome-image:${user.id}`, uri);
    Alert.alert('Opgeslagen', 'Rechter afbeelding is bijgewerkt.');
  };

  const onSaveWinner = async () => {
    const normalizedPhoto = normalizeExternalUrl(winnerPhotoUrl);
    const normalizedVideo = normalizeExternalUrl(winnerVideoUrl);

    if (normalizedPhoto) {
      const supportedPhoto = await Linking.canOpenURL(normalizedPhoto);
      if (!supportedPhoto) {
        Alert.alert('Link ongeldig', 'De foto-URL kan niet geopend worden.');
        return;
      }
    }

    if (normalizedVideo) {
      const supportedVideo = await Linking.canOpenURL(normalizedVideo);
      if (!supportedVideo) {
        Alert.alert('Link ongeldig', 'De video-URL kan niet geopend worden.');
        return;
      }
    }

    const result = await saveLotteryWinnerContent({
      winnerName,
      winnerInterview,
      winnerPhotoUrl: normalizedPhoto,
      winnerVideoUrl: normalizedVideo,
    });
    if (!result.ok) {
      Alert.alert('Opslaan mislukt', result.message ?? 'Kon winnaargegevens niet opslaan.');
      return;
    }

    setWinnerPhotoUrl(normalizedPhoto);
    setWinnerVideoUrl(normalizedVideo);
    Alert.alert('Opgeslagen', 'Winnaar-interview is bijgewerkt.');
  };

  const onOpenWinnerVideo = async () => {
    const normalized = normalizeExternalUrl(winnerVideoUrl);
    if (!normalized) {
      Alert.alert('Geen link', 'Vul eerst een video-link in.');
      return;
    }
    const supported = await Linking.canOpenURL(normalized);
    if (!supported) {
      Alert.alert('Link ongeldig', 'Deze video-link kan niet geopend worden.');
      return;
    }
    await Linking.openURL(normalized);
  };

  const handleBlock = async () => {
    const target = blockedInput.trim();
    if (!target) {
      Alert.alert('Leeg veld', 'Vul eerst een gebruiker ID of username in.');
      return;
    }
    const res = await blockUser(target);
    if (!res.ok) {
      Alert.alert('Kon niet blokkeren', res.message ?? 'Onbekende fout.');
      return;
    }
    setBlockedInput('');
    Alert.alert('Opgeslagen', 'Gebruiker is geblokkeerd.');
  };

  const handleSaveAdminNote = async () => {
    if (!user?.id) return;
    setSavingAdminNote(true);
    await AsyncStorage.setItem(`owner-admin-note:${user.id}`, adminNote);
    setSavingAdminNote(false);
    Alert.alert('Opgeslagen', 'Beheertekst is opgeslagen.');
  };

  const handleSaveWelcomeText = async () => {
    if (!user?.id) return;
    setSavingWelcomeText(true);
    const normalized = welcomeText.trim();
    if (normalized) {
      await AsyncStorage.setItem(`welcome-text:${user.id}`, normalized);
    } else {
      await AsyncStorage.removeItem(`welcome-text:${user.id}`);
    }
    setSavingWelcomeText(false);
    Alert.alert('Opgeslagen', 'Welkomtekst is bijgewerkt.');
  };

  const handleSaveMessageDocument = async () => {
    if (!user?.id) return;
    setSavingMessageDocument(true);
    const normalized = messageDocument.trim();
    if (normalized) {
      await AsyncStorage.setItem(`owner-message-document:${user.id}`, normalized);
    } else {
      await AsyncStorage.removeItem(`owner-message-document:${user.id}`);
    }
    setSavingMessageDocument(false);
    Alert.alert('Opgeslagen', 'Berichten document is bijgewerkt.');
  };

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

  const onSelectPopupTarget = (target: PopupTargetOption) => {
    setFanPopupSelected(target);
  };

  const isPopupFavorite = (targetId: string) => fanPopupFavorites.some((row) => row.id === targetId);

  const onRemovePopupFavorite = async (targetId: string) => {
    const next = fanPopupFavorites.filter((row) => row.id !== targetId);
    setFanPopupFavorites(next);
    if (fanPopupSelected?.id === targetId) {
      setFanPopupSelected(next[0] ?? null);
    }
    await persistPopupFavorites(next);
  };

  const onTogglePopupFavorite = async (target: PopupTargetOption) => {
    const exists = isPopupFavorite(target.id);
    if (exists) {
      await onRemovePopupFavorite(target.id);
      return;
    }
    const next = [target, ...fanPopupFavorites].slice(0, 40);
    setFanPopupFavorites(next);
    await persistPopupFavorites(next);
  };

  const onSendFanPopup = async () => {
    if (!user?.id) return;
    if (!fanPopupSelected?.id) {
      Alert.alert('Kies gebruiker', 'Selecteer eerst de ontvanger.');
      return;
    }
    if (fanPopupBlocked) {
      Alert.alert('Even wachten', `Je kunt over ${fanPopupRemainingLabel ?? '00:00'} weer een popup sturen.`);
      return;
    }

    const senderName =
      fanPopupName.trim() ||
      profile?.displayName?.trim() ||
      profile?.username?.trim() ||
      '';
    if (!senderName) {
      Alert.alert('Naam ontbreekt', 'Vul eerst een afzendernaam in.');
      return;
    }

    setFanPopupSending(true);
    const res = await sendPopupToUser({
      targetUserId: fanPopupSelected.id,
      title: senderName,
      body: fanPopupMessage,
    });
    setFanPopupSending(false);

    if (!res.ok) {
      Alert.alert('Niet verstuurd', res.message ?? 'Onbekende fout.');
      return;
    }

    setFanPopupName(senderName);
    await AsyncStorage.setItem(`fan-popup-sender-name:${user.id}`, senderName);
    const nextUntil = Date.now() + FAN_POPUP_COOLDOWN_MS;
    setFanPopupCooldownUntil(nextUntil);
    setFanPopupNow(Date.now());
    await AsyncStorage.setItem(`fan-popup-cooldown:${user.id}`, `${nextUntil}`);
    Alert.alert('Verstuurd', `Popup is verzonden naar ${getTargetLabel(fanPopupSelected)}.`);
  };

  const onSetPopupMute = async (minutes: 0 | 15 | 23 | 30 | 45 | 60) => {
    const res = await setPopupMuteForMinutes(minutes);
    if (!res.ok) {
      Alert.alert('Niet opgeslagen', res.message ?? 'Onbekende fout.');
      return;
    }
    Alert.alert('Popup instelling', res.message ?? 'Aangepast.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitleSmall}>Popup beheer</Text>
        <Text style={styles.emptyHint}>
          Maximaal 1 keer per 5 minuten. {fanPopupBlocked ? `Cooldown: ${fanPopupRemainingLabel}` : 'Klaar om te versturen.'}
        </Text>
        <Text style={styles.emptyHint}>Popup status: {popupMuted ? `uit (${popupMuteRemainingLabel})` : 'aan'}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => void onSetPopupMute(15)}>
            <Text style={styles.ghostBtnText}>15 min uit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => void onSetPopupMute(23)}>
            <Text style={styles.ghostBtnText}>23 min uit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => void onSetPopupMute(45)}>
            <Text style={styles.ghostBtnText}>45 min uit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => void onSetPopupMute(60)}>
            <Text style={styles.ghostBtnText}>1 uur uit</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void onSetPopupMute(0)}>
          <Text style={styles.primaryBtnText}>Popup weer aanzetten</Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Zoek gebruiker</Text>
        <View style={styles.actionsRow}>
          <TextInput
            style={[styles.input, styles.searchInput]}
            value={fanPopupQuery}
            onChangeText={setFanPopupQuery}
            placeholder="Naam of @username"
            placeholderTextColor="#8A8A8A"
            maxLength={64}
          />
          <TouchableOpacity style={[styles.primaryBtn, styles.searchButton]} onPress={() => void onSearchPopupTargets()}>
            <Text style={styles.primaryBtnText}>{fanPopupSearchBusy ? '...' : 'Zoek'}</Text>
          </TouchableOpacity>
        </View>

        {fanPopupResults.length ? (
          <View style={styles.resultList}>
            {fanPopupResults.map((target) => {
              const selected = fanPopupSelected?.id === target.id;
              const favorite = isPopupFavorite(target.id);
              return (
                <View key={`owner-res-${target.id}`} style={styles.resultRow}>
                  <TouchableOpacity
                    style={[styles.resultSelectBtn, selected ? styles.resultSelectBtnActive : null]}
                    onPress={() => onSelectPopupTarget(target)}
                  >
                    <Text style={[styles.resultSelectText, selected ? styles.resultSelectTextActive : null]}>
                      {getTargetLabel(target)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.resultStarBtn, favorite ? styles.resultStarBtnActive : null]}
                    onPress={() => void onTogglePopupFavorite(target)}
                  >
                    <Text style={styles.resultStarText}>★</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyHint}>Zoek op naam om iemand te kiezen.</Text>
        )}

        {fanPopupFavorites.length ? (
          <View style={styles.favoriteList}>
            {fanPopupFavorites.map((target) => (
              <View key={`owner-fav-${target.id}`} style={styles.favoriteRow}>
                <TouchableOpacity style={styles.favoriteSelectBtn} onPress={() => onSelectPopupTarget(target)}>
                  <Text style={styles.favoriteSelectText}>{target.displayName || target.username || 'Gebruiker'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.favoriteRemoveBtn} onPress={() => void onRemovePopupFavorite(target.id)}>
                  <Text style={styles.favoriteRemoveText}>x</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>
          Ontvanger: {fanPopupSelected ? getTargetLabel(fanPopupSelected) : 'nog niet gekozen'}
        </Text>
        <Text style={styles.fieldLabel}>Jouw naam (afzender)</Text>
        <TextInput
          style={styles.input}
          value={fanPopupName}
          onChangeText={setFanPopupName}
          placeholder="Jouw naam"
          placeholderTextColor="#8A8A8A"
          maxLength={60}
        />

        <Text style={styles.fieldLabel}>Bericht</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={fanPopupMessage}
          onChangeText={setFanPopupMessage}
          placeholder="Typ je bericht..."
          placeholderTextColor="#8A8A8A"
          multiline
          maxLength={240}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, (fanPopupBlocked || fanPopupSending) ? styles.disabledBtn : null]}
          onPress={() => void onSendFanPopup()}
          disabled={fanPopupBlocked || fanPopupSending}
        >
          <Text style={styles.primaryBtnText}>
            {fanPopupSending ? 'Versturen...' : fanPopupBlocked ? `Wacht ${fanPopupRemainingLabel}` : 'Verstuur popup'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleSmall}>Inzendingen Ajax Supporters</Text>
        <Text style={styles.emptyHint}>{"Bekijk hier ingestuurde foto's en video's uit de app en keur ze goed of af."}</Text>
        <TouchableOpacity
          style={[styles.ghostBtn, styles.singleActionBtn, supporterLoading ? styles.disabledBtn : null]}
          onPress={() => void refreshSupporterSubmissions()}
          disabled={supporterLoading}
        >
          <Text style={styles.ghostBtnText}>{supporterLoading ? 'Laden...' : 'Ververs inzendingen'}</Text>
        </TouchableOpacity>

        {supporterError ? <Text style={styles.errorHint}>{supporterError}</Text> : null}

        {supporterSubmissions.length ? (
          <View style={styles.submissionList}>
            {supporterSubmissions.map((submission) => (
              <View key={submission.id} style={styles.submissionCard}>
                <View style={styles.submissionHeaderRow}>
                  <Text style={styles.submissionTitle} numberOfLines={1}>
                    {submission.caption?.trim() || submission.original_file_name?.trim() || 'Inzending zonder titel'}
                  </Text>
                  <View
                    style={[
                      styles.submissionStatusBadge,
                      submission.status === 'approved'
                        ? styles.submissionStatusApproved
                        : submission.status === 'rejected'
                          ? styles.submissionStatusRejected
                          : styles.submissionStatusPending,
                    ]}>
                    <Text
                      style={[
                        styles.submissionStatusText,
                        submission.status === 'approved'
                          ? styles.submissionStatusTextApproved
                          : submission.status === 'rejected'
                            ? styles.submissionStatusTextRejected
                            : styles.submissionStatusTextPending,
                      ]}>
                      {submission.status === 'approved'
                        ? 'goedgekeurd'
                        : submission.status === 'rejected'
                          ? 'afgekeurd'
                          : 'wacht op review'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.submissionMeta}>
                  {submission.media_type === 'video' ? 'Video' : 'Foto'} · {formatSubmissionDate(submission.created_at)}
                  {getSubmissionSizeLabel(submission.file_size_bytes) ? ` · ${getSubmissionSizeLabel(submission.file_size_bytes)}` : ''}
                </Text>
                <Text style={styles.submissionMeta}>
                  Inzender: {submission.display_name?.trim() || 'Ajax Fan'}
                  {submission.username?.trim() ? ` (${submission.username.trim()})` : ''}
                </Text>
                {submission.contact_email?.trim() ? (
                  <Text style={styles.submissionMeta}>Contact: {submission.contact_email.trim()}</Text>
                ) : null}
                {submission.note?.trim() ? <Text style={styles.submissionNote}>{submission.note.trim()}</Text> : null}

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => void openSubmissionMedia(submission)}>
                    <Text style={styles.ghostBtnText}>
                      {submission.media_type === 'video' ? 'Open video' : 'Bekijk foto'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => void onApproveSubmission(submission)}>
                    <Text style={styles.primaryBtnText}>Goedkeuren</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.ghostBtn, styles.rejectBtn]}
                  onPress={() => void onRejectSubmission(submission)}>
                  <Text style={[styles.ghostBtnText, styles.rejectBtnText]}>Afkeuren</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : supporterLoading ? (
          <Text style={styles.emptyHint}>Inzendingen laden...</Text>
        ) : (
          <Text style={styles.emptyHint}>{"Nog geen ingestuurde foto's of video's gevonden."}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleSmall}>Welkomtekst (Welkom-tab)</Text>
        <Text style={styles.cardBody}>Alleen via Beheerder aanpasbaar. Op Welkom is dit read-only voor iedereen.</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={welcomeText}
          onChangeText={setWelcomeText}
          multiline
          maxLength={3000}
          placeholder="Typ hier de tekst voor de Welkom-tab..."
          placeholderTextColor="#8A8A8A"
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => void handleSaveWelcomeText()}
          disabled={savingWelcomeText}
        >
          <Text style={styles.primaryBtnText}>{savingWelcomeText ? 'Opslaan...' : 'Opslaan welkomtekst'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleSmall}>Eigen beheertekst</Text>
        <Text style={styles.cardBody}>Alleen zichtbaar in jouw beheerinstellingen.</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={adminNote}
          onChangeText={setAdminNote}
          multiline
          maxLength={3000}
          placeholder="Typ hier je eigen beheertekst..."
          placeholderTextColor="#8A8A8A"
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleSaveAdminNote()} disabled={savingAdminNote}>
          <Text style={styles.primaryBtnText}>{savingAdminNote ? 'Opslaan...' : 'Opslaan tekst'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Builder Beheer</Text>
        <Text style={styles.cardBody}>
          Dit tabblad is alleen zichtbaar voor jouw builder-account. De gebruikersknoppen blijven ongewijzigd.
        </Text>

        <Text style={styles.fieldLabel}>INFO TIFO / SUP HOME URL (gedeeld voor alle users)</Text>
        <TextInput
          style={styles.input}
          value={infoLinkInput}
          onChangeText={setInfoLinkInput}
          autoCapitalize="none"
          placeholder="https://..."
          placeholderTextColor="#8A8A8A"
        />
        {!infoLinkInput.trim() ? <Text style={styles.emptyHint}>Nog niets ingesteld.</Text> : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => void onTestInfoLink()}>
            <Text style={styles.ghostBtnText}>Test URL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void onSaveInfoLink()} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? 'Opslaan...' : 'Opslaan'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Betaalportal URL (kaartbeheer/meerdere passen)</Text>
        <TextInput
          style={styles.input}
          value={paymentPortalInput}
          onChangeText={setPaymentPortalInput}
          autoCapitalize="none"
          placeholder="https://..."
          placeholderTextColor="#8A8A8A"
        />
        {!paymentPortalInput.trim() ? <Text style={styles.emptyHint}>Nog niets ingesteld.</Text> : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => void onTestPaymentPortal()}>
            <Text style={styles.ghostBtnText}>Test betaallink</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void onSavePaymentPortal()} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? 'Opslaan...' : 'Opslaan betaallink'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleSmall}>Welkom afbeeldingen</Text>
        <Text style={styles.cardBody}>
          {"Linker blok opent nu je eigen bibliotheek met mappen (video's, foto's, afbeeldingen)."}
        </Text>

        <View style={styles.imagePreviewRow}>
          <View style={styles.imagePreviewWrap}>
            {leftImageUri ? (
              <Image source={{ uri: leftImageUri }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Links</Text>
              </View>
            )}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => void pickWelcomeImage('left')}>
                <Text style={styles.primaryBtnText}>Afbeelding links</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => void clearLeftWelcomeImage()}>
                <Text style={styles.ghostBtnText}>Leeg maken</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, styles.textareaSmall]}
              value={leftNoticeText}
              onChangeText={setLeftNoticeText}
              multiline
              maxLength={600}
              placeholder="Tekst voor linker blok op Welkom"
              placeholderTextColor="#8A8A8A"
            />
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => void handleSaveLeftNoticeText()}
              disabled={savingLeftNoticeText}
            >
              <Text style={styles.primaryBtnText}>{savingLeftNoticeText ? 'Opslaan...' : 'Tekst links opslaan'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.imagePreviewWrap}>
            {rightImageUri ? (
              <Image source={{ uri: rightImageUri }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Rechts</Text>
              </View>
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => void pickWelcomeImage('right')}>
              <Text style={styles.primaryBtnText}>Afbeelding rechts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleSmall}>URL lijst met sitenamen</Text>
        <Text style={styles.emptyHint}>Sla links op met eigen naam, zodat je ze niet steeds opnieuw hoeft te zoeken.</Text>

        <TextInput
          style={styles.input}
          value={siteTitleInput}
          onChangeText={setSiteTitleInput}
          placeholder="Naam van site"
          placeholderTextColor="#8A8A8A"
          maxLength={80}
        />
        <TextInput
          style={styles.input}
          value={siteUrlInput}
          onChangeText={setSiteUrlInput}
          autoCapitalize="none"
          placeholder="https://..."
          placeholderTextColor="#8A8A8A"
          maxLength={300}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void addSiteShortcut()}>
          <Text style={styles.primaryBtnText}>URL toevoegen</Text>
        </TouchableOpacity>

        {siteShortcuts.length ? (
          <View style={styles.siteList}>
            {siteShortcuts.map((row) => (
              <View key={row.id} style={styles.siteRow}>
                <View style={styles.siteInfo}>
                  <Text style={styles.siteTitle}>{row.title}</Text>
                  <Text style={styles.siteUrl} numberOfLines={1}>
                    {row.url}
                  </Text>
                </View>
                <TouchableOpacity style={styles.siteOpenBtn} onPress={() => void Linking.openURL(row.url)}>
                  <Text style={styles.siteOpenBtnText}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.siteRemoveBtn} onPress={() => void removeSiteShortcut(row.id)}>
                  <Text style={styles.siteRemoveBtnText}>x</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyHint}>{"Nog geen opgeslagen URL's."}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleSmall}>Berichten document</Text>
        <Text style={styles.emptyHint}>Plaats hier je eigen tekst/bericht en bewaar dit als notitie.</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={messageDocument}
          onChangeText={setMessageDocument}
          multiline
          maxLength={5000}
          placeholder="Typ je berichttekst..."
          placeholderTextColor="#8A8A8A"
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => void handleSaveMessageDocument()}
          disabled={savingMessageDocument}
        >
          <Text style={styles.primaryBtnText}>{savingMessageDocument ? 'Opslaan...' : 'Opslaan document'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleSmall}>Winnaar winactie</Text>
        <Text style={styles.fieldLabel}>Naam winnaar</Text>
        <TextInput
          style={styles.input}
          value={winnerName}
          onChangeText={setWinnerName}
          placeholder="Naam invullen"
          placeholderTextColor="#8A8A8A"
        />

        <Text style={styles.fieldLabel}>Interview</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={winnerInterview}
          onChangeText={setWinnerInterview}
          multiline
          maxLength={1500}
          placeholder="Plaats hier interview met de winnaar..."
          placeholderTextColor="#8A8A8A"
        />

        <Text style={styles.fieldLabel}>Video-link (optioneel)</Text>
        <TextInput
          style={styles.input}
          value={winnerVideoUrl}
          onChangeText={setWinnerVideoUrl}
          autoCapitalize="none"
          placeholder="https://..."
          placeholderTextColor="#8A8A8A"
        />

        <Text style={styles.fieldLabel}>Foto-link (optioneel)</Text>
        <TextInput
          style={styles.input}
          value={winnerPhotoUrl}
          onChangeText={setWinnerPhotoUrl}
          autoCapitalize="none"
          placeholder="https://..."
          placeholderTextColor="#8A8A8A"
        />

        {winnerPhotoUrl.trim() ? (
          <Image source={{ uri: normalizeExternalUrl(winnerPhotoUrl) }} style={styles.imagePreview} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Geen winnaarsfoto</Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => void onOpenWinnerVideo()}>
            <Text style={styles.ghostBtnText}>Open video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void onSaveWinner()}>
            <Text style={styles.primaryBtnText}>Opslaan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleSmall}>Gebruikers blokkeren</Text>
        <TextInput
          style={styles.input}
          value={blockedInput}
          onChangeText={setBlockedInput}
          placeholder="Gebruiker ID of username"
          placeholderTextColor="#8A8A8A"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleBlock()}>
          <Text style={styles.primaryBtnText}>Blokkeer gebruiker</Text>
        </TouchableOpacity>

        {blockedUsers.length ? (
          <View style={styles.blockedList}>
            {blockedUsers.map((id) => (
              <View key={id} style={styles.blockedItem}>
                <Text style={styles.blockedText}>{id}</Text>
                <TouchableOpacity onPress={() => void unblockUser(id)}>
                  <Text style={styles.unblockText}>Deblokkeer</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyHint}>Geen geblokkeerde gebruikers.</Text>
        )}
      </View>

      <Modal visible={leftLibraryOpen} transparent animationType="fade" onRequestClose={() => setLeftLibraryOpen(false)}>
        <View style={styles.libraryOverlay}>
          <View style={styles.libraryCard}>
            <Text style={styles.cardTitleSmall}>Bibliotheek links</Text>
            <View style={styles.libraryTabs}>
              <TouchableOpacity
                style={[styles.libraryTabBtn, leftLibraryFolder === 'videos' ? styles.libraryTabBtnActive : null]}
                onPress={() => setLeftLibraryFolder('videos')}
              >
                <Text style={[styles.libraryTabBtnText, leftLibraryFolder === 'videos' ? styles.libraryTabBtnTextActive : null]}>
                  {"Video's"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.libraryTabBtn, leftLibraryFolder === 'fotos' ? styles.libraryTabBtnActive : null]}
                onPress={() => setLeftLibraryFolder('fotos')}
              >
                <Text style={[styles.libraryTabBtnText, leftLibraryFolder === 'fotos' ? styles.libraryTabBtnTextActive : null]}>
                  {"Foto's"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.libraryTabBtn, leftLibraryFolder === 'afbeeldingen' ? styles.libraryTabBtnActive : null]}
                onPress={() => setLeftLibraryFolder('afbeeldingen')}
              >
                <Text
                  style={[
                    styles.libraryTabBtnText,
                    leftLibraryFolder === 'afbeeldingen' ? styles.libraryTabBtnTextActive : null,
                  ]}
                >
                  Afbeeldingen
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => void addMediaFromPicker(leftLibraryFolder)}>
                <Text style={styles.ghostBtnText}>Toevoegen uit telefoon</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={mediaTitleInput}
              onChangeText={setMediaTitleInput}
              placeholder="Naam in map"
              placeholderTextColor="#8A8A8A"
              maxLength={80}
            />
            <TextInput
              style={styles.input}
              value={mediaUrlInput}
              onChangeText={setMediaUrlInput}
              placeholder="URL (optioneel)"
              placeholderTextColor="#8A8A8A"
              autoCapitalize="none"
              maxLength={300}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => void addMediaUrlToLibrary()}>
              <Text style={styles.primaryBtnText}>URL toevoegen aan map</Text>
            </TouchableOpacity>

            <ScrollView style={styles.libraryList}>
              {leftLibrary[leftLibraryFolder].length ? (
                leftLibrary[leftLibraryFolder].map((item) => (
                  <View key={item.id} style={styles.libraryRow}>
                    <TouchableOpacity
                      style={styles.libraryApplyBtn}
                      onPress={() => void applyLeftImageFromLibrary(item)}
                    >
                      <Text style={styles.libraryApplyBtnText}>{item.title}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.libraryDeleteBtn} onPress={() => void removeMediaFromLibrary(leftLibraryFolder, item.id)}>
                      <Text style={styles.libraryDeleteBtnText}>x</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyHint}>Deze map is nog leeg.</Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setLeftLibraryOpen(false)}>
              <Text style={styles.primaryBtnText}>Sluiten</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={supporterPreviewOpen} transparent animationType="fade" onRequestClose={() => setSupporterPreviewOpen(false)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <Text style={styles.cardTitleSmall}>{supporterPreviewTitle || 'Media preview'}</Text>
            {supporterPreviewIsVideo ? (
              <View style={styles.previewVideoPlaceholder}>
                <Text style={styles.previewVideoPlaceholderText}>Video geopend via externe speler/browser</Text>
              </View>
            ) : (
              <Image source={{ uri: supporterPreviewUri }} style={styles.previewImage} resizeMode="contain" />
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setSupporterPreviewOpen(false)}>
              <Text style={styles.primaryBtnText}>Sluiten</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0E' },
  content: { padding: 16, paddingBottom: 28 },
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: '#111111',
    fontSize: 25,
    fontWeight: '900',
  },
  cardTitleSmall: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
  },
  cardBody: {
    color: '#333333',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  fieldLabel: {
    marginTop: 2,
    color: '#111111',
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#111111',
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyHint: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '700',
  },
  errorHint: {
    color: '#B00020',
    fontSize: 12,
    fontWeight: '800',
  },
  actionsRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
  },
  singleActionBtn: {
    flex: 0,
  },
  ghostBtn: {
    flex: 1,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  ghostBtnText: {
    color: Ajax.red,
    fontSize: 13,
    fontWeight: '900',
  },
  primaryBtn: {
    flex: 1,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  primaryBtnText: {
    color: '#FFD369',
    fontSize: 13,
    fontWeight: '900',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    maxWidth: 96,
  },
  resultList: {
    gap: 6,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultSelectBtn: {
    flex: 1,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  resultSelectBtnActive: {
    backgroundColor: Ajax.red,
  },
  resultSelectText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '800',
  },
  resultSelectTextActive: {
    color: '#FFFFFF',
  },
  resultStarBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultStarBtnActive: {
    backgroundColor: '#FFF3CE',
  },
  resultStarText: {
    color: '#C48C00',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  favoriteList: {
    gap: 6,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteSelectBtn: {
    flex: 1,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  favoriteSelectText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteRemoveText: {
    color: Ajax.red,
    fontSize: 14,
    fontWeight: '900',
  },
  imagePreviewRow: {
    flexDirection: 'row',
    gap: 10,
  },
  submissionList: {
    gap: 10,
  },
  submissionCard: {
    borderWidth: 1.1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    padding: 10,
    gap: 6,
  },
  submissionHeaderRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  submissionTitle: {
    flex: 1,
    color: '#111111',
    fontSize: 13,
    fontWeight: '900',
  },
  submissionStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  submissionStatusPending: {
    backgroundColor: '#FFF3CE',
  },
  submissionStatusApproved: {
    backgroundColor: '#D8F6DF',
  },
  submissionStatusRejected: {
    backgroundColor: '#FCE0E0',
  },
  submissionStatusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  submissionStatusTextPending: {
    color: '#9A6400',
  },
  submissionStatusTextApproved: {
    color: '#1E7B34',
  },
  submissionStatusTextRejected: {
    color: '#A52222',
  },
  submissionMeta: {
    color: '#666666',
    fontSize: 11,
    fontWeight: '700',
  },
  submissionNote: {
    color: '#333333',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  rejectBtn: {
    backgroundColor: '#FFF1F1',
    borderColor: '#D54A4A',
  },
  rejectBtnText: {
    color: '#B00020',
  },
  imagePreviewWrap: {
    flex: 1,
    gap: 8,
  },
  imagePreview: {
    width: '100%',
    height: 124,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
  },
  imagePlaceholder: {
    width: '100%',
    height: 124,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#101010',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#FFD369',
    fontSize: 13,
    fontWeight: '800',
  },
  siteList: {
    gap: 7,
  },
  siteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: '#FAFAFA',
  },
  siteInfo: {
    flex: 1,
    gap: 1,
  },
  siteTitle: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '900',
  },
  siteUrl: {
    color: '#666666',
    fontSize: 11,
    fontWeight: '600',
  },
  siteOpenBtn: {
    borderWidth: 1.1,
    borderColor: Ajax.red,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  siteOpenBtnText: {
    color: Ajax.red,
    fontSize: 11,
    fontWeight: '900',
  },
  siteRemoveBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  siteRemoveBtnText: {
    color: Ajax.red,
    fontSize: 12,
    fontWeight: '900',
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  textareaSmall: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  libraryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
    justifyContent: 'center',
  },
  libraryCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
    maxHeight: '90%',
  },
  libraryTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  libraryTabBtn: {
    flex: 1,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  libraryTabBtnActive: {
    backgroundColor: Ajax.red,
  },
  libraryTabBtnText: {
    color: Ajax.red,
    fontSize: 12,
    fontWeight: '900',
  },
  libraryTabBtnTextActive: {
    color: '#FFFFFF',
  },
  libraryList: {
    maxHeight: 220,
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  libraryApplyBtn: {
    flex: 1,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  libraryApplyBtnText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '800',
  },
  libraryDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryDeleteBtnText: {
    color: Ajax.red,
    fontSize: 13,
    fontWeight: '900',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 16,
  },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10,
    maxHeight: '86%',
  },
  previewImage: {
    width: '100%',
    height: 360,
    borderRadius: 10,
    backgroundColor: '#111111',
  },
  previewVideoPlaceholder: {
    height: 180,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  previewVideoPlaceholderText: {
    color: '#FFD369',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },
  blockedList: {
    gap: 6,
    marginTop: 4,
  },
  blockedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
  },
  blockedText: {
    color: '#111111',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
    fontWeight: '700',
  },
  unblockText: {
    color: Ajax.red,
    fontSize: 12,
    fontWeight: '900',
  },
});
