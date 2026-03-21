import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';
import { supabase } from '@/src/core/supabaseClient';

type ListingDetailItem = {
  title: string;
  price: number;
  category: string;
  seller: string;
  sellerId: string;
  description: string;
  date: string;
  views: number;
  location: string;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatListingDate(iso?: string | null): string {
  if (!iso) return 'Onbekend';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'Onbekend';
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export default function ListingDetail() {
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    price?: string;
    category?: string;
    seller?: string;
    sellerId?: string;
    description?: string;
    date?: string;
    location?: string;
    status?: string;
  }>();

  const id = firstParam(params.id)?.trim() ?? '';
  const hasValidId = id.length > 0;
  const isDark = useColorScheme() === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const parsedPrice = Number(firstParam(params.price));
  const [remoteItem, setRemoteItem] = useState<ListingDetailItem | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<'active' | 'reserved' | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);

  const routeItem = useMemo<ListingDetailItem>(
    () => ({
      title: firstParam(params.title)?.trim() || 'Advertentie',
      price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0,
      category: firstParam(params.category)?.trim() || 'Onbekend',
      seller: firstParam(params.seller)?.trim() || 'Onbekend',
      sellerId: firstParam(params.sellerId)?.trim() || '',
      description: firstParam(params.description)?.trim() || 'Geen omschrijving beschikbaar.',
      date: firstParam(params.date)?.trim() || 'Onbekend',
      location: firstParam(params.location)?.trim() || 'Onbekend',
      views: 0,
    }),
    [params.category, params.date, params.description, params.location, params.seller, params.sellerId, params.title, parsedPrice]
  );
  const routeStatus = firstParam(params.status)?.trim() === 'reserved' ? 'reserved' : 'active';
  const hasPrefilledRouteDetails = Boolean(
    firstParam(params.title)?.trim() &&
      firstParam(params.seller)?.trim() &&
      firstParam(params.description)?.trim()
  );

  const {
    user,
    entitlements,
    sendListingMessage,
    blockedUsers,
    blockUser,
    unblockUser,
    toggleListingFavorite,
    isListingFavorite,
  } = useAppContext();
  const [message, setMessage] = useState('');
  const item = remoteItem ?? routeItem;
  const listingStatus = remoteStatus ?? routeStatus;
  const isSellerBlocked = blockedUsers.includes(item.sellerId);

  useEffect(() => {
    if (!hasValidId) {
      setRemoteItem(null);
      setRemoteStatus(null);
      return;
    }

    let active = true;
    const loadListing = async () => {
      setLoadingRemote(true);
      const listingRes = await supabase
        .from('listings')
        .select('id,title,price_eur,category,owner_id,location,description,created_at,status')
        .eq('id', id)
        .maybeSingle();

      if (!active) return;

      if (listingRes.error || !listingRes.data) {
        setRemoteItem(null);
        setRemoteStatus(null);
        setLoadingRemote(false);
        return;
      }

      const row = listingRes.data as {
        id: string;
        title: string | null;
        price_eur: number | null;
        category: string | null;
        owner_id: string | null;
        location: string | null;
        description: string | null;
        created_at: string | null;
        status: string | null;
      };

      let seller = 'Ajax Fan';
      const ownerId = `${row.owner_id ?? ''}`.trim();
      if (ownerId) {
        const profileRes = await supabase
          .from('profiles')
          .select('display_name,username')
          .eq('id', ownerId)
          .maybeSingle();

        if (!active) return;
        if (!profileRes.error && profileRes.data) {
          const profile = profileRes.data as { display_name?: string | null; username?: string | null };
          seller = profile.display_name?.trim() || profile.username?.trim() || seller;
        }
      }

      setRemoteItem({
        title: row.title?.trim() || routeItem.title,
        price: Number.isFinite(Number(row.price_eur)) ? Number(row.price_eur) : routeItem.price,
        category: row.category?.trim() || routeItem.category,
        seller,
        sellerId: ownerId || routeItem.sellerId,
        description: row.description?.trim() || routeItem.description,
        date: formatListingDate(row.created_at) || routeItem.date,
        location: row.location?.trim() || routeItem.location,
        views: 0,
      });
      setRemoteStatus(row.status === 'reserved' ? 'reserved' : 'active');
      setLoadingRemote(false);
    };

    void loadListing();
    return () => {
      active = false;
    };
  }, [hasValidId, id, routeItem]);

  const onContact = async () => {
    if (!hasValidId) {
      Alert.alert('Niet verstuurd', 'Advertentie-ID ontbreekt.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Typ een bericht', 'Voeg eerst een bericht toe.');
      return;
    }

    const result = await sendListingMessage(id, message, item.sellerId);
    if (!result.ok) {
      Alert.alert('Niet verstuurd', result.message ?? 'Onbekende fout.');
      return;
    }

    setMessage('');
    Alert.alert('Verstuurd', 'Je bericht is naar de verkoper gestuurd.');
  };

  const onToggleSellerBlock = () => {
    if (!user || !item.sellerId || item.sellerId === user.id) return;

    Alert.alert(
      isSellerBlocked ? 'Verkoper deblokkeren?' : 'Verkoper blokkeren?',
      isSellerBlocked
        ? 'Je kunt weer reageren op deze verkoper.'
        : 'Je kunt deze verkoper daarna niet meer benaderen.',
      [
        { text: 'Annuleer', style: 'cancel' },
        {
          text: isSellerBlocked ? 'Deblokkeren' : 'Blokkeren',
          style: isSellerBlocked ? 'default' : 'destructive',
          onPress: () => {
            const run = async () => {
              const result = isSellerBlocked
                ? await unblockUser(item.sellerId)
                : await blockUser(item.sellerId);
              if (!result.ok) {
                Alert.alert('Actie mislukt', result.message ?? 'Probeer later opnieuw.');
                return;
              }
              Alert.alert(
                'Opgeslagen',
                isSellerBlocked ? 'Verkoper is gedeblokkeerd.' : 'Verkoper is geblokkeerd.'
              );
            };
            void run();
          },
        },
      ]
    );
  };

  const onReportSeller = async () => {
    const subject = encodeURIComponent('Melding verkoper - Marktplaats');
    const body = encodeURIComponent(
      `Advertentie ID: ${id}\nVerkoper: ${item.seller}\nVerkoper ID: ${item.sellerId}\nMelder: ${user?.email ?? 'onbekend'}`
    );
    const mailto = `mailto:all.inn.media.contact@gmail.com?subject=${subject}&body=${body}`;
    const supported = await Linking.canOpenURL(mailto);
    if (!supported) {
      Alert.alert(
        'Melding',
        `Stuur melding naar all.inn.media.contact@gmail.com\nVerkoper: ${item.seller} (${item.sellerId})`
      );
      return;
    }
    await Linking.openURL(mailto);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.image}>
        <Text style={styles.imagePlaceholder}>AJAX</Text>
      </View>

      <View style={styles.body}>
        {loadingRemote && !hasPrefilledRouteDetails ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={Ajax.red} />
            <Text style={styles.loadingText}>Advertentie laden...</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{item.category}</Text>
          </View>
          <View style={styles.priceWrap}>
            <TouchableOpacity style={styles.favoriteBtn} onPress={() => void toggleListingFavorite(id)}>
              <Text style={styles.favoriteBtnText}>{isListingFavorite(id) ? '★' : '☆'}</Text>
            </TouchableOpacity>
            {listingStatus === 'reserved' ? (
              <View style={styles.reservedBadge}>
                <Text style={styles.reservedBadgeText}>Gereserveerd</Text>
              </View>
            ) : null}
            <Text style={styles.price}>EUR {item.price}</Text>
          </View>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        <View style={styles.metaBlock}>
          <Text style={styles.metaText}>Locatie: {item.location}</Text>
          <Text style={styles.metaText}>Verkoper: {item.seller}</Text>
          <Text style={styles.metaText}>Datum: {item.date}</Text>
          <Text style={styles.metaText}>Bekeken: {item.views}</Text>
        </View>

        <Text style={styles.sectionLabel}>Beschrijving</Text>
        <Text style={styles.desc}>{item.description}</Text>

        {entitlements.canMessageListings && listingStatus !== 'reserved' ? (
          <>
            <TextInput
              style={styles.messageInput}
              placeholder="Bericht aan verkoper..."
              placeholderTextColor={isDark ? '#8D98A5' : '#777'}
              multiline
              value={message}
              onChangeText={setMessage}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => void onContact()}>
              <Text style={styles.primaryBtnText}>Stuur bericht</Text>
            </TouchableOpacity>
            {user && !!item.sellerId && item.sellerId !== user.id ? (
              <View style={styles.moderationRow}>
                <TouchableOpacity style={styles.reportBtn} onPress={() => void onReportSeller()}>
                  <Text style={styles.reportBtnText}>Meld verkoper</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reportBtn, styles.blockSellerBtn]}
                  onPress={onToggleSellerBlock}
                >
                  <Text style={[styles.reportBtnText, styles.blockSellerBtnText]}>
                    {isSellerBlocked ? 'Deblokkeer verkoper' : 'Blokkeer verkoper'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.lockBox}>
            <Text style={styles.lockText}>
              {listingStatus === 'reserved'
                ? 'Deze advertentie is gereserveerd.'
                : 'Free account: alleen lezen. Upgrade naar Premium/VIP om contact op te nemen.'}
            </Text>
          </View>
        )}

      </View>
    </ScrollView>
  );
}

function createStyles(isDark: boolean) {
  const bg = isDark ? '#101214' : Ajax.background;
  const card = isDark ? '#1A1E22' : '#fff';
  const border = isDark ? '#2A3138' : Ajax.border;
  const text = isDark ? '#F2F5F8' : Ajax.text;
  const textSoft = isDark ? '#B2BBC3' : Ajax.textLight;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    image: {
      height: 200,
      backgroundColor: isDark ? '#3A2428' : Ajax.lightRed,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePlaceholder: { fontSize: 42, fontWeight: '900', color: Ajax.red, letterSpacing: 6 },
    body: { padding: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    catBadge: { backgroundColor: isDark ? '#3A2428' : Ajax.lightRed, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    catText: { fontSize: 12, fontWeight: '700', color: Ajax.red },
    priceWrap: { alignItems: 'flex-end', gap: 4 },
    favoriteBtn: {
      minWidth: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    favoriteBtnText: {
      color: Ajax.red,
      fontSize: 24,
      fontWeight: '900',
      lineHeight: 24,
    },
    reservedBadge: {
      backgroundColor: '#111111',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    reservedBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
    price: { fontSize: 28, fontWeight: '900', color: Ajax.red },
    title: { fontSize: 18, fontWeight: '700', color: text, marginBottom: 14, lineHeight: 25 },
    metaBlock: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    metaText: { fontSize: 13, color: textSoft, width: '100%', flexShrink: 1 },
    loadingCard: {
      marginBottom: 14,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    loadingText: { color: textSoft, fontSize: 13, fontWeight: '700' },
    sectionLabel: { fontSize: 14, fontWeight: '700', color: text, marginBottom: 6 },
    desc: { fontSize: 15, color: text, lineHeight: 23, marginBottom: 16 },
    messageInput: {
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      padding: 12,
      minHeight: 90,
      textAlignVertical: 'top',
      marginBottom: 10,
      color: text,
    },
    primaryBtn: {
      backgroundColor: Ajax.red,
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    moderationRow: {
      marginTop: -2,
      marginBottom: 10,
      flexDirection: 'row',
      gap: 8,
    },
    reportBtn: {
      flex: 1,
      borderWidth: 1.3,
      borderColor: Ajax.red,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      backgroundColor: '#fff',
    },
    reportBtnText: { color: Ajax.red, fontWeight: '800', fontSize: 13 },
    blockSellerBtn: {
      backgroundColor: Ajax.red,
    },
    blockSellerBtnText: {
      color: '#fff',
    },
    lockBox: {
      backgroundColor: isDark ? '#2A1A1D' : '#FFF0F0',
      borderWidth: 1,
      borderColor: border,
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
    },
    lockText: { color: Ajax.red, fontSize: 13, fontWeight: '600' },
  });
}
