import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';

const DEFAULT_WELCOME_TEXT = `Hallo trouwe supporter van de mooiste club van Europa.

Mijn naam is Edwin Kuijs. Samen met mijn vrouw Patricia hebben wij al meer dan 12 jaar een seizoenkaart. Wij staan op Zuid 2, vak 428.

Door mijn passie voor de club en omdat ik graag mijn steentje wil bijdragen, heb ik de afgelopen 8 weken gewerkt aan deze app. Vaak 10 tot 12 uur per dag programmeren, maar nu is het zover: de app All-Inn Ajax is een feit.

De app zit vol met functies voor supporters. Neem gerust een kijkje en ontdek wat er allemaal mogelijk is.

Heb je een goed idee of mis je nog een functie? Laat het mij weten via e-mail. De beste ideeen worden, indien mogelijk, toegevoegd aan de app.

Misschien zien we elkaar bij een volgende wedstrijd.

WZAWZDB.

Edwin en Patricia Kuijs`;
const DEFAULT_LEFT_NOTICE_TEXT = '';
const LEGACY_FSIDE_LINE =
  "Met de premium accounts wil ik een bijdrage doneren aan de F-Side, zodat we kunnen blijven genieten van de geweldige sfeeracties en tifo's.";

function sanitizeWelcomeText(value: string) {
  return value
    .replaceAll(`\n\n${LEGACY_FSIDE_LINE}`, '')
    .replaceAll(`${LEGACY_FSIDE_LINE}\n\n`, '')
    .replaceAll(LEGACY_FSIDE_LINE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function WelcomeTabScreen() {
  const { user, content } = useAppContext();
  const scrollRef = useRef<ScrollView>(null);
  const [welcomeText, setWelcomeText] = useState(DEFAULT_WELCOME_TEXT);
  const [leftNoticeText, setLeftNoticeText] = useState(DEFAULT_LEFT_NOTICE_TEXT);
  const [leftImageUri, setLeftImageUri] = useState<string | null>(null);
  const [leftImageLinkUrl, setLeftImageLinkUrl] = useState('');
  const [rightImageUri, setRightImageUri] = useState<string | null>(null);
  const [welcomeSelection, setWelcomeSelection] = useState({ start: 0, end: 0 });
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [leftNoticeModalOpen, setLeftNoticeModalOpen] = useState(false);
  const loadWelcomeContent = useCallback(async () => {
    if (!user?.id) return;
    const [storedText, storedRightImage, storedLeftImage, storedLeftNoticeText] = await Promise.all([
      AsyncStorage.getItem(`welcome-text:${user.id}`),
      AsyncStorage.getItem(`welcome-image:${user.id}`),
      AsyncStorage.getItem(`welcome-image-left:${user.id}`),
      AsyncStorage.getItem(`welcome-left-note:${user.id}`),
    ]);

    if (storedText?.trim()) {
      setWelcomeText(sanitizeWelcomeText(storedText));
    } else {
      setWelcomeText(DEFAULT_WELCOME_TEXT);
    }

    setWelcomeSelection({ start: 0, end: 0 });
    setRightImageUri(storedRightImage?.trim() || null);
    setLeftImageUri(storedLeftImage?.trim() || null);

    if (storedLeftNoticeText?.trim()) {
      setLeftNoticeText(storedLeftNoticeText);
    } else {
      setLeftNoticeText(DEFAULT_LEFT_NOTICE_TEXT);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        setWelcomeSelection({ start: 0, end: 0 });
      });
      void loadWelcomeContent();
      return () => cancelAnimationFrame(frame);
    }, [loadWelcomeContent])
  );

  useEffect(() => {
    void loadWelcomeContent();
  }, [loadWelcomeContent]);

  useEffect(() => {
    setLeftImageLinkUrl(content.welcomeInfoLinkUrl?.trim() || '');
  }, [content.welcomeInfoLinkUrl]);

  const normalizeExternalUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };
  const openLeftImageLink = async () => {
    const normalized = normalizeExternalUrl(leftImageLinkUrl);
    if (!normalized) return false;
    const supported = await Linking.canOpenURL(normalized);
    if (!supported) {
      Alert.alert('Link ongeldig', 'Deze URL kan niet worden geopend.');
      return false;
    }
    await Linking.openURL(normalized);
    return true;
  };
  const onOpenLeftSlot = async () => {
    const opened = await openLeftImageLink();
    if (opened) return;
    if (leftImageUri) {
      setPreviewUri(leftImageUri);
      return;
    }
        if (leftNoticeText.trim()) {
          setLeftNoticeModalOpen(true);
          return;
        }
    Alert.alert('Nog niets ingesteld', 'Voor dit vak is nog geen URL, foto, video of tekst ingesteld.');
  };
  const onOpenRightSlot = () => {
    if (rightImageUri) {
      setPreviewUri(rightImageUri);
      return;
    }
    Alert.alert('Nog niets ingesteld', 'Voor dit vak is nog geen afbeelding ingesteld.');
  };
  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
        <View style={styles.imageRow}>
          <View style={styles.imageSlot}>
            <TouchableOpacity
              style={leftImageUri ? null : styles.leftNoticeCard}
              onPress={() => void onOpenLeftSlot()}
              activeOpacity={0.9}
            >
              {leftImageUri ? (
                <Image source={{ uri: leftImageUri }} style={styles.cornerImage} resizeMode="cover" />
              ) : (
                <Text style={styles.leftNoticeText}>{leftNoticeText || DEFAULT_LEFT_NOTICE_TEXT}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.imageSlot}>
            <TouchableOpacity onPress={onOpenRightSlot} activeOpacity={0.9}>
              {rightImageUri ? (
                <Image source={{ uri: rightImageUri }} style={styles.cornerImage} resizeMode="cover" />
              ) : (
                <View style={styles.cornerImagePlaceholder}>
                  <Text style={styles.cornerImagePlaceholderText}>+</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.fixedHeader}>
          <Text style={styles.fixedHeaderLine}>
            Welkom bij <Text style={styles.fixedHeaderAllInn}>ALL-INN</Text>
          </Text>
          <Text style={styles.fixedHeaderAjax}>AJAX</Text>
        </View>
          <TextInput
            style={styles.bigInput}
            value={welcomeText}
            onChangeText={setWelcomeText}
            selection={welcomeSelection}
            onSelectionChange={(event) => setWelcomeSelection(event.nativeEvent.selection)}
            editable={false}
            multiline
            maxLength={1200}
            placeholder="Welkomtekst"
            placeholderTextColor="#9A9A9A"
          />
      </View>

      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.previewOverlay}>
          <Pressable style={styles.previewBackdrop} onPress={() => setPreviewUri(null)} />
          <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewUri(null)}>
            <Text style={styles.previewCloseText}>x</Text>
          </TouchableOpacity>
          {previewUri ? <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" /> : null}
        </View>
      </Modal>

      <Modal
        visible={leftNoticeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLeftNoticeModalOpen(false)}
      >
        <View style={styles.textModalOverlay}>
          <Pressable style={styles.previewBackdrop} onPress={() => setLeftNoticeModalOpen(false)} />
          <View style={styles.textModalCard}>
            <Text style={styles.textModalTitle}>QR Scanner test</Text>
            <ScrollView style={styles.textModalScroll} contentContainerStyle={styles.textModalScrollContent}>
              <Text style={styles.textModalBody}>{leftNoticeText || DEFAULT_LEFT_NOTICE_TEXT}</Text>
            </ScrollView>
          </View>
          <TouchableOpacity style={styles.textModalCloseBtn} onPress={() => setLeftNoticeModalOpen(false)}>
            <Text style={styles.textModalCloseText}>x</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0E' },
  content: { padding: 16, paddingBottom: 30 },
  hero: {
    backgroundColor: '#121212',
    borderWidth: 1.5,
    borderColor: Ajax.red,
    borderRadius: 16,
    padding: 16,
  },
  fixedHeader: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    backgroundColor: '#0A0A0A',
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  fixedHeaderLine: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  fixedHeaderAllInn: {
    color: '#FFD369',
  },
  fixedHeaderAjax: {
    color: Ajax.red,
    fontSize: 29,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 31,
  },
  bigInput: {
    minHeight: 252,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    padding: 12,
    textAlignVertical: 'top',
  },
  paymentBtn: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  paymentBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  fanPopupBtn: {
    marginTop: 8,
    flex: 1,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanPopupBtnDisabled: {
    opacity: 0.6,
  },
  fanPopupBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  popupMuteBtn: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  popupMuteBtnActive: {
    backgroundColor: Ajax.red,
  },
  popupMuteBtnText: {
    color: Ajax.red,
    fontSize: 12,
    fontWeight: '900',
  },
  popupMuteBtnTextActive: {
    color: '#FFFFFF',
  },
  saveBtn: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    paddingVertical: 11,
  },
  saveBtnText: { color: '#FFD369', fontWeight: '800', fontSize: 12 },
  imageRow: {
    marginBottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  imageSlot: {
    flex: 1,
    alignItems: 'center',
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 8,
  },
  infoMiniBlock: {
    width: 92,
    borderRadius: 10,
    borderWidth: 1.4,
    borderColor: Ajax.red,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  infoMiniText: {
    color: '#FFD369',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 14,
  },
  topImageSaveBtn: {
    minWidth: 92,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topImageSaveBtnText: { color: '#FFD369', fontWeight: '700', fontSize: 11 },
  topImageSaveBtnGhost: {
    minWidth: 92,
  },
  winnerOpenBtn: {
    flex: 1,
    marginTop: 8,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  winnerOpenBtnText: {
    color: '#FFD369',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  winnerPreviewCard: {
    borderRadius: 12,
    borderWidth: 1.4,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginTop: 2,
    marginBottom: 10,
  },
  winnerHeaderStrip: {
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 10,
    paddingVertical: 1,
  },
  winnerHeaderStripText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  winnerHeaderStripSub: {
    color: '#FFD369',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
  },
  winnerPreviewImage: {
    width: '100%',
    height: 52,
  },
  winnerPoster: {
    width: '100%',
    height: 52,
    backgroundColor: '#111111',
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  winnerPosterTitle: {
    color: '#FFD369',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 2,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  winnerPosterText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
    textAlign: 'center',
  },
  winnerPreviewInterview: {
    color: '#FFD369',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    backgroundColor: Ajax.red,
    borderTopWidth: 1.2,
    borderTopColor: '#A10017',
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cornerImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    marginBottom: 8,
  },
  cornerImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cornerImagePlaceholderText: {
    color: Ajax.red,
    fontSize: 44,
    fontWeight: '700',
  },
  leftNoticeCard: {
    width: 120,
    height: 120,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  leftNoticeText: {
    color: '#111111',
    fontSize: 8.6,
    lineHeight: 10.8,
    fontWeight: '800',
    textAlign: 'left',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewImage: {
    width: '100%',
    height: '85%',
    borderRadius: 12,
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  previewCloseText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 29,
  },
  textModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  textModalCard: {
    width: '100%',
    maxHeight: '82%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    padding: 14,
    paddingBottom: 22,
  },
  fanPopupModalCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    padding: 14,
    paddingBottom: 14,
    gap: 6,
  },
  popupMuteModalCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
  },
  popupMuteHint: {
    color: '#444444',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  popupMuteOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  popupMuteOptionBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  popupMuteOptionText: {
    color: Ajax.red,
    fontSize: 13,
    fontWeight: '900',
  },
  popupMuteEnableBtn: {
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  popupMuteEnableText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  fanPopupHint: {
    color: '#444444',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  fanPopupPickRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
    minHeight: 168,
  },
  fanPopupFavoritesCol: {
    width: 128,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: '#F8F8F8',
    padding: 6,
    gap: 5,
  },
  fanPopupSearchCol: {
    flex: 1,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: '#F8F8F8',
    padding: 6,
    gap: 5,
  },
  fanPopupColTitle: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '900',
  },
  fanPopupFavoritesScroll: {
    flex: 1,
  },
  fanPopupFavoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  fanPopupFavoriteBtn: {
    flex: 1,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  fanPopupFavoriteBtnActive: {
    backgroundColor: Ajax.red,
  },
  fanPopupFavoriteText: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '800',
  },
  fanPopupFavoriteTextActive: {
    color: '#FFFFFF',
  },
  fanPopupRemoveFavBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanPopupRemoveFavText: {
    color: Ajax.red,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  fanPopupSearchRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  fanPopupSearchInput: {
    flex: 1,
  },
  fanPopupSearchBtn: {
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 8,
    backgroundColor: Ajax.red,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fanPopupSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  fanPopupResultsScroll: {
    flex: 1,
  },
  fanPopupResultBtn: {
    borderWidth: 1.1,
    borderColor: Ajax.red,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  fanPopupResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  fanPopupResultSelectBtn: {
    flex: 1,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  fanPopupResultBtnActive: {
    backgroundColor: Ajax.red,
  },
  fanPopupResultText: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '800',
  },
  fanPopupResultTextActive: {
    color: '#FFFFFF',
  },
  fanPopupResultStarBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanPopupResultStarBtnActive: {
    backgroundColor: '#FFF3CE',
  },
  fanPopupResultStarText: {
    color: Ajax.red,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 15,
  },
  fanPopupResultStarTextActive: {
    color: '#C48C00',
  },
  fanPopupEmpty: {
    color: '#777777',
    fontSize: 11,
    fontWeight: '700',
  },
  fanPopupLabel: {
    marginTop: 4,
    color: '#111111',
    fontSize: 12,
    fontWeight: '800',
  },
  fanPopupInput: {
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#111111',
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '700',
  },
  fanPopupTextarea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  fanPopupFavAddBtn: {
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 2,
  },
  fanPopupFavAddText: {
    color: Ajax.red,
    fontSize: 12,
    fontWeight: '900',
  },
  fanPopupActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  fanPopupCancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  fanPopupCancelText: {
    color: Ajax.red,
    fontSize: 13,
    fontWeight: '900',
  },
  fanPopupSendBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  fanPopupSendText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  winnerModalCard: {
    width: '100%',
    maxHeight: '86%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  winnerModalLabel: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '800',
  },
  drawBoard: {
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#111111',
    padding: 10,
    gap: 4,
    marginBottom: 2,
  },
  drawBoardLabel: {
    color: '#FFD369',
    fontSize: 11,
    fontWeight: '800',
  },
  drawBoardNumber: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
  drawBoardMeta: {
    color: '#CCCCCC',
    fontSize: 11,
    fontWeight: '700',
  },
  drawBoardBtn: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  drawBoardBtnDisabled: {
    opacity: 0.6,
  },
  drawBoardBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  winnerModalInput: {
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#111111',
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  winnerModalTextarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  winnerModalImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
  },
  winnerModalActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  winnerActionGhost: {
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  winnerActionGhostText: {
    color: Ajax.red,
    fontSize: 12,
    fontWeight: '800',
  },
  winnerActionPrimary: {
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 10,
    backgroundColor: Ajax.red,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  winnerActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  textModalTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  textModalScroll: {
    width: '100%',
  },
  textModalScrollContent: {
    paddingBottom: 8,
  },
  textModalBody: {
    color: '#111111',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  textModalCloseBtn: {
    position: 'absolute',
    right: 18,
    bottom: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  textModalCloseText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '900',
  },
});
