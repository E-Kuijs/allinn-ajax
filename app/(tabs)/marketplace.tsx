import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';
import { supabase } from '@/src/core/supabaseClient';

type Listing = {
  id: string;
  title: string;
  price: number;
  category: string;
  seller: string;
  sellerId: string;
  location: string;
  description: string;
  time: string;
  status: 'active' | 'reserved';
};

const CATEGORIES = ['Alles', 'Shirts', 'Sjaals', 'Tickets', 'Memorabilia', 'Overig'];

export default function MarketplaceScreen() {
  const {
    user,
    profile,
    entitlements,
    sendListingMessage,
    toggleListingFavorite,
    isListingFavorite,
  } = useAppContext();
  const isDark = useColorScheme() === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);

  const [activeCategory, setActiveCategory] = useState('Alles');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Shirts');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [posting, setPosting] = useState(false);

  const filtered = useMemo(() => {
    return activeCategory === 'Alles'
      ? listings
      : listings.filter((l) => l.category === activeCategory);
  }, [activeCategory, listings]);

  const loadListings = useCallback(async () => {
    setLoadingListings(true);
    const res = await supabase
      .from('listings')
      .select('id,title,price_eur,category,owner_id,location,description,created_at,status')
      .order('created_at', { ascending: false })
      .limit(120);

    if (res.error || !res.data) {
      setLoadingListings(false);
      return;
    }

    const rows = res.data as {
      id: string;
      title: string | null;
      price_eur: number | null;
      category: string | null;
      owner_id: string | null;
      location: string | null;
      description: string | null;
      created_at: string | null;
      status: string | null;
    }[];

    const ownerIds = Array.from(
      new Set(rows.map((row) => `${row.owner_id ?? ''}`.trim()).filter((id) => !!id))
    );
    let sellerMap: Record<string, string> = {};

    if (ownerIds.length) {
      const profilesRes = await supabase
        .from('profiles')
        .select('id,display_name,username')
        .in('id', ownerIds);

      if (!profilesRes.error && profilesRes.data) {
        sellerMap = Object.fromEntries(
          (profilesRes.data as { id: string; display_name?: string | null; username?: string | null }[]).map((row) => [
            row.id,
            row.display_name?.trim() || row.username?.trim() || 'Ajax Fan',
          ])
        );
      }
    }

    const mapped: Listing[] = rows.map((row) => {
      const ts = row.created_at ? new Date(row.created_at).getTime() : Date.now();
      const timeLabel = Number.isFinite(ts)
        ? new Intl.DateTimeFormat('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(ts))
        : 'zojuist';

      return {
        id: `${row.id}`,
        title: row.title?.trim() || 'Advertentie',
        price: Number.isFinite(Number(row.price_eur)) ? Number(row.price_eur) : 0,
        category: row.category?.trim() || 'Overig',
        seller: sellerMap[`${row.owner_id ?? ''}`] || 'Ajax Fan',
        sellerId: `${row.owner_id ?? 'unknown'}`,
        location: row.location?.trim() || 'Onbekend',
        description: row.description?.trim() || '',
        time: timeLabel,
        status: row.status === 'reserved' ? 'reserved' : 'active',
      };
    });

    setListings(mapped.filter((item) => item.status === 'active' || item.status === 'reserved'));
    setLoadingListings(false);
  }, []);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  useFocusEffect(
    useCallback(() => {
      void loadListings();
    }, [loadListings])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadListings();
    setRefreshing(false);
  };

  const handleSendMessage = async (item: Listing) => {
    if (!entitlements.canMessageListings) {
      Alert.alert('Alleen lezen', 'Na de proefperiode kunnen Free leden niet reageren op advertenties.');
      return;
    }

    const result = await sendListingMessage(
      item.id,
      `Hoi ${item.seller}, ik heb interesse in: ${item.title}`,
      item.sellerId
    );

    if (!result.ok) {
      Alert.alert('Niet verstuurd', result.message ?? 'Onbekende fout.');
      return;
    }

    Alert.alert('Verstuurd', 'Je bericht is naar de verkoper gestuurd.');
  };

  const handleToggleFavorite = async (item: Listing) => {
    const result = await toggleListingFavorite(item.id);
    if (!result.ok) {
      Alert.alert('Favoriet', result.message ?? 'Opslaan van favoriet mislukt.');
    }
  };

  const resetForm = () => {
    setEditingListingId(null);
    setNewTitle('');
    setNewPrice('');
    setNewCategory('Shirts');
    setNewLocation('');
    setNewDescription('');
  };

  const openCreateComposer = () => {
    resetForm();
    setComposerOpen(true);
  };

  const openEditComposer = (item: Listing) => {
    setEditingListingId(item.id);
    setNewTitle(item.title);
    setNewPrice(String(item.price).replace('.', ','));
    setNewCategory(item.category);
    setNewLocation(item.location);
    setNewDescription(item.description);
    setComposerOpen(true);
  };

  const handleDeleteListing = (item: Listing) => {
    Alert.alert('Advertentie verwijderen?', 'Deze advertentie wordt uit de marktplaats gehaald.', [
      { text: 'Annuleer', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: () => {
          const run = async () => {
            setListings((prev) => prev.filter((listing) => listing.id !== item.id));
            const result = await supabase.from('listings').delete().eq('id', item.id);
            if (result.error) {
              Alert.alert('Lokaal verwijderd', 'De advertentie is lokaal weggehaald. Backend sync volgt later.');
              await loadListings();
              return;
            }
            Alert.alert('Verwijderd', 'Je advertentie is verwijderd.');
          };
          void run();
        },
      },
    ]);
  };

  const handleToggleReserved = (item: Listing) => {
    const nextStatus: Listing['status'] = item.status === 'reserved' ? 'active' : 'reserved';
    const nextLabel = nextStatus === 'reserved' ? 'gereserveerd' : 'vrijgegeven';
    const confirmText =
      nextStatus === 'reserved'
        ? 'Deze advertentie wordt gemarkeerd als gereserveerd.'
        : 'Deze advertentie wordt weer beschikbaar gemaakt.';

    Alert.alert(`Advertentie ${nextLabel}?`, confirmText, [
      { text: 'Annuleer', style: 'cancel' },
      {
        text: nextStatus === 'reserved' ? 'Reserveren' : 'Vrijgeven',
        onPress: () => {
          const run = async () => {
            setListings((prev) =>
              prev.map((listing) => (listing.id === item.id ? { ...listing, status: nextStatus } : listing))
            );
            const result = await supabase.from('listings').update({ status: nextStatus }).eq('id', item.id);
            if (result.error) {
              Alert.alert('Lokaal aangepast', 'De status is lokaal gewijzigd. Backend sync volgt later.');
              await loadListings();
              return;
            }
            Alert.alert('Opgeslagen', `Advertentie is ${nextLabel}.`);
          };
          void run();
        },
      },
    ]);
  };

  const handleCreateListing = async () => {
    if (!entitlements.canCreateListings) {
      Alert.alert('Premium vereist', 'Alleen Premium/VIP kan advertenties plaatsen.');
      return;
    }

    const title = newTitle.trim();
    const location = newLocation.trim();
    const description = newDescription.trim();
    const price = Number(newPrice.replace(',', '.'));

    if (!title || !location || !description || !Number.isFinite(price) || price < 0) {
      Alert.alert('Controleer velden', 'Titel, locatie en omschrijving zijn verplicht. Prijs mag 0,00 of hoger zijn.');
      return;
    }

    const sellerName = profile?.displayName?.trim() || 'Ajax Fan';
    const sellerId = user?.id ?? 'local-seller';

    if (editingListingId) {
      const nextListing: Listing = {
        id: editingListingId,
        title,
        price,
        category: newCategory,
        seller: sellerName,
        sellerId,
        location,
        description,
        time: 'zojuist',
        status: listings.find((listing) => listing.id === editingListingId)?.status ?? 'active',
      };

      setPosting(true);
      setListings((prev) => prev.map((listing) => (listing.id === editingListingId ? nextListing : listing)));
      setPosting(false);
      setComposerOpen(false);
      resetForm();

      const dbUpdate = await supabase
        .from('listings')
        .update({
          title: nextListing.title,
          price_eur: nextListing.price,
          category: nextListing.category,
          location: nextListing.location,
          description: nextListing.description,
        })
        .eq('id', editingListingId);

      if (dbUpdate.error) {
        Alert.alert('Advertentie aangepast', 'Lokaal aangepast. Backend sync volgt zodra de tabel reageert.');
        return;
      }

      Alert.alert('Advertentie aangepast', 'Je advertentie is bijgewerkt.');
      return;
    }

    const listing: Listing = {
      id: `local-${Date.now()}`,
      title,
      price,
      category: newCategory,
      seller: sellerName,
      sellerId,
      location,
      description,
      time: 'zojuist',
      status: 'active',
    };

    setPosting(true);
    setListings((prev) => [listing, ...prev]);
    setPosting(false);
    setComposerOpen(false);
    resetForm();

    const dbInsert = await supabase.from('listings').insert({
      id: listing.id,
      owner_id: listing.sellerId,
      title: listing.title,
      price_eur: listing.price,
      category: listing.category,
      location: listing.location,
      description: listing.description,
    });

    if (dbInsert.error) {
      Alert.alert('Advertentie geplaatst', 'Lokaal geplaatst. Backend sync volgt zodra listings-tabel actief is.');
      return;
    }

    Alert.alert('Advertentie geplaatst', 'Je advertentie staat nu op de marktplaats.');
  };

  return (
    <View style={styles.container}>
      {entitlements.marketplaceReadOnly ? (
        <View style={styles.bannerWarn}>
          <Text style={styles.bannerWarnText}>
            Marktplaats staat op alleen-lezen. Upgrade naar Premium/VIP om te reageren of te plaatsen.
          </Text>
        </View>
      ) : null}

      <View style={styles.categoriesWrapper}>
        <View style={styles.refreshHelpRow}>
          <Text style={styles.refreshHelpText}>Swipe down of ververs &gt;</Text>
          <View style={styles.topActionRow}>
            <TouchableOpacity style={styles.favoritesBtn} onPress={() => router.push('/favorites')}>
              <Text style={styles.favoritesBtnText}>Favorieten</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.refreshBtn, (refreshing || loadingListings) && styles.refreshBtnDisabled]}
              onPress={() => void onRefresh()}
              disabled={refreshing || loadingListings}
            >
              <Text style={styles.refreshBtnText}>{refreshing || loadingListings ? 'Verversen...' : 'Ververs pagina'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={CATEGORIES}
          horizontal
          keyExtractor={(i) => i}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, activeCategory === item && styles.chipActive]}
              onPress={() => setActiveCategory(item)}
            >
              <Text
                style={[
                  styles.chipText,
                  item === 'Alles' && styles.chipTextAlles,
                  activeCategory === item && styles.chipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Ajax.red]} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/listing/[id]',
                params: {
                  id: item.id,
                  title: item.title,
                  price: String(item.price),
                  category: item.category,
                  seller: item.seller,
                    sellerId: item.sellerId,
                    location: item.location,
                    description: item.description,
                    date: item.time,
                    status: item.status,
                  },
                })
              }
              activeOpacity={0.9}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.cardTopRight}>
                  <TouchableOpacity style={styles.favoriteStarBtn} onPress={() => void handleToggleFavorite(item)}>
                    <Text style={styles.favoriteStarText}>{isListingFavorite(item.id) ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                  <View style={styles.priceWrap}>
                  {item.status === 'reserved' ? (
                    <View style={styles.reservedBadge}>
                      <Text style={styles.reservedBadgeText}>Gereserveerd</Text>
                    </View>
                  ) : null}
                  <Text style={styles.cardPrice}>EUR {item.price}</Text>
                  </View>
                </View>
              </View>
            <View style={styles.metaRow}>
              <Text style={[styles.meta, styles.metaLeft]} numberOfLines={1}>
                Locatie: {item.location}
              </Text>
              <Text style={[styles.meta, styles.metaRight]} numberOfLines={1}>
                {item.time}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.meta, styles.metaLeft]} numberOfLines={1}>
                Verkoper: {item.seller}
              </Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.contactBtn,
                (!entitlements.canMessageListings || item.status === 'reserved') && styles.contactBtnDisabled,
              ]}
              onPress={() => void handleSendMessage(item)}
              disabled={!entitlements.canMessageListings || item.status === 'reserved'}
            >
              <Text style={styles.contactBtnText}>
                {item.status === 'reserved'
                  ? 'Gereserveerd'
                  : entitlements.canMessageListings
                    ? 'Stuur bericht'
                    : 'Premium vereist'}
              </Text>
            </TouchableOpacity>
            {item.sellerId === user?.id ? (
              <View style={styles.ownerActionRow}>
                <TouchableOpacity style={styles.ownerGhostBtn} onPress={() => openEditComposer(item)}>
                  <Text style={styles.ownerGhostBtnText}>Aanpassen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ownerGhostBtn, styles.ownerReserveBtn]}
                  onPress={() => handleToggleReserved(item)}
                >
                  <Text style={[styles.ownerGhostBtnText, styles.ownerReserveBtnText]}>
                    {item.status === 'reserved' ? 'Vrijgeven' : 'Reserveren'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ownerGhostBtn, styles.ownerDeleteBtn]}
                  onPress={() => handleDeleteListing(item)}
                >
                  <Text style={[styles.ownerGhostBtnText, styles.ownerDeleteBtnText]}>Verwijderen</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Nog geen advertenties geplaatst.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.addBtn, !entitlements.canCreateListings && styles.addBtnDisabled]}
        onPress={() => {
          if (!entitlements.canCreateListings) {
            Alert.alert('Premium vereist', 'Alleen Premium/VIP kan advertenties plaatsen.');
            return;
          }
          openCreateComposer();
        }}
      >
        <Text style={styles.addBtnText}>
          {entitlements.canCreateListings ? '+ Nieuwe advertentie' : 'Plaatsen geblokkeerd voor Free'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={composerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setComposerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingListingId ? 'Advertentie aanpassen' : 'Nieuwe advertentie'}</Text>

            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Titel"
              placeholderTextColor={isDark ? '#8D98A5' : '#888'}
            />
            <TextInput
              style={styles.modalInput}
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="Prijs in EUR"
              keyboardType="decimal-pad"
              placeholderTextColor={isDark ? '#8D98A5' : '#888'}
            />
            <TextInput
              style={styles.modalInput}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="Categorie"
              placeholderTextColor={isDark ? '#8D98A5' : '#888'}
            />
            <TextInput
              style={styles.modalInput}
              value={newLocation}
              onChangeText={setNewLocation}
              placeholder="Locatie"
              placeholderTextColor={isDark ? '#8D98A5' : '#888'}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              maxLength={400}
              placeholder="Omschrijving"
              placeholderTextColor={isDark ? '#8D98A5' : '#888'}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalGhost} onPress={() => setComposerOpen(false)}>
                <Text style={styles.modalGhostText}>Annuleer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimary, posting && styles.addBtnDisabled]}
                onPress={() => void handleCreateListing()}
                disabled={posting}
              >
                  <Text style={styles.modalPrimaryText}>
                    {posting ? (editingListingId ? 'Opslaan...' : 'Plaatsen...') : editingListingId ? 'Opslaan' : 'Plaats advertentie'}
                  </Text>
                </TouchableOpacity>
              </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(isDark: boolean) {
  const bg = '#050505';
  const card = '#FFFFFF';
  const border = Ajax.red;
  const text = '#111111';
  const textLight = '#555555';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    bannerWarn: {
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderColor: border,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bannerWarnText: { fontSize: 12, color: Ajax.red, fontWeight: '700' },
    categoriesWrapper: {
      backgroundColor: Ajax.red,
      paddingTop: 4,
      paddingBottom: 3,
      borderBottomWidth: 1,
      borderColor: '#FFFFFF',
    },
    refreshHelpRow: {
      paddingHorizontal: 12,
      paddingBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    refreshHelpText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
      flex: 1,
    },
    topActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    favoritesBtn: {
      borderRadius: 8,
      borderWidth: 1.3,
      borderColor: '#FFFFFF',
      backgroundColor: '#111111',
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    favoritesBtnText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    refreshBtn: {
      alignSelf: 'flex-end',
      borderRadius: 8,
      borderWidth: 1.3,
      borderColor: '#FFFFFF',
      backgroundColor: Ajax.red,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    refreshBtnDisabled: {
      opacity: 0.6,
    },
    refreshBtnText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    categoriesContent: { paddingHorizontal: 12, alignItems: 'center', gap: 6 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: Ajax.red,
      borderWidth: 1.4,
      borderColor: '#FFFFFF',
    },
    chipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
    chipText: { fontSize: 12, color: '#FFFFFF', fontWeight: '800' },
    chipTextAlles: { fontWeight: '900' },
    chipTextActive: { color: '#111111', fontWeight: '900' },
    list: { padding: 12, gap: 8, paddingBottom: 88 },
    emptyWrap: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: '#FFFFFF',
      paddingVertical: 18,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: { color: textLight, fontSize: 13, fontWeight: '600' },
    card: {
      backgroundColor: card,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: border,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: text },
    cardTopRight: { alignItems: 'flex-end', gap: 4 },
    favoriteStarBtn: {
      minWidth: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    favoriteStarText: {
      color: Ajax.red,
      fontSize: 22,
      fontWeight: '900',
      lineHeight: 22,
    },
    priceWrap: { alignItems: 'flex-end', gap: 4 },
    cardPrice: { fontSize: 16, fontWeight: '900', color: Ajax.red },
    reservedBadge: {
      backgroundColor: '#111111',
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    reservedBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '900',
    },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 8 },
    meta: { fontSize: 11, color: textLight },
    metaLeft: { flex: 1, minWidth: 0, flexShrink: 1 },
    metaRight: { flexShrink: 0, textAlign: 'right' },
    categoryBadge: {
      backgroundColor: Ajax.lightRed,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    categoryText: { fontSize: 10, fontWeight: '700', color: Ajax.red },
    contactBtn: {
      marginTop: 7,
      borderRadius: 10,
      backgroundColor: Ajax.red,
      alignItems: 'center',
      paddingVertical: 4,
    },
    contactBtnDisabled: { backgroundColor: '#777' },
    contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    ownerActionRow: {
      marginTop: 7,
      flexDirection: 'row',
      gap: 6,
    },
    ownerGhostBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    ownerGhostBtnText: {
      color: Ajax.red,
      fontSize: 11,
      fontWeight: '800',
    },
    ownerReserveBtn: {
      backgroundColor: '#111111',
      borderColor: '#111111',
    },
    ownerReserveBtnText: {
      color: '#FFFFFF',
    },
    ownerDeleteBtn: {
      backgroundColor: '#FFFFFF',
      borderColor: Ajax.red,
    },
    ownerDeleteBtnText: {
      color: Ajax.red,
    },
    addBtn: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 17,
      borderRadius: 12,
      backgroundColor: Ajax.red,
      alignItems: 'center',
      minHeight: 30,
      paddingVertical: 3,
    },
    addBtnDisabled: { backgroundColor: '#666' },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
      padding: 16,
    },
    modalCard: {
      borderRadius: 16,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      padding: 14,
      gap: 8,
    },
    modalTitle: { color: text, fontWeight: '900', fontSize: 16, marginBottom: 4 },
    modalInput: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: text,
    },
    modalTextarea: { minHeight: 80, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
    modalGhost: {
      borderWidth: 1.4,
      borderColor: border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    modalGhostText: { color: text, fontWeight: '700' },
    modalPrimary: {
      borderRadius: 10,
      backgroundColor: Ajax.red,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    modalPrimaryText: { color: '#fff', fontWeight: '800' },
  });
}
