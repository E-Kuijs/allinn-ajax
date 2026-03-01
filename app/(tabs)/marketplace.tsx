import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { Ajax } from '@/constants/theme';
import { router } from 'expo-router';

const CATEGORIES = ['Alles', 'Shirts', 'Sjaals', 'Tickets', 'Memorabilia', 'Overig'];

const MOCK_LISTINGS = [
  { id: '1', title: 'Ajax Thuisshirt 2024/2025 - Maat L', price: 45, category: 'Shirts', seller: 'Edwin_K', location: 'Amsterdam', time: '2u geleden' },
  { id: '2', title: 'Ajax Sjaal Champions League 2019', price: 20, category: 'Sjaals', seller: 'AjaxFan88', location: 'Utrecht', time: '5u geleden' },
  { id: '3', title: '2x Ticket Ajax - Feyenoord 2 maart', price: 120, category: 'Tickets', seller: 'TicketKing', location: 'Amsterdam', time: '1d geleden' },
  { id: '4', title: 'Gesigneerde foto Johan Cruijff', price: 75, category: 'Memorabilia', seller: 'VintageAjax', location: 'Haarlem', time: '2d geleden' },
  { id: '5', title: 'Ajax baby pakje maat 68', price: 12, category: 'Overig', seller: 'BabyAjax', location: 'Almere', time: '3d geleden' },
  { id: '6', title: 'Ajax uitshirt 2023/2024 maat M', price: 35, category: 'Shirts', seller: 'AjaxShirts', location: 'Rotterdam', time: '4d geleden' },
];

export default function MarketplaceScreen() {
  const [activeCategory, setActiveCategory] = useState('Alles');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState('');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      setLastRefresh(`Bijgewerkt om ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
      setRefreshing(false);
    }, 1200);
  }, []);

  const filtered = activeCategory === 'Alles'
    ? MOCK_LISTINGS
    : MOCK_LISTINGS.filter(l => l.category === activeCategory);

  return (
    <View style={styles.container}>
      <View style={styles.categoriesWrapper}>
        <FlatList
          data={CATEGORIES}
          keyExtractor={i => i}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, activeCategory === item && styles.chipActive]}
              onPress={() => setActiveCategory(item)}
            >
              <Text style={[styles.chipText, activeCategory === item && styles.chipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {lastRefresh ? (
        <View style={styles.refreshBar}>
          <Text style={styles.refreshText}>🔄 {lastRefresh}</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#D2001C']}
            tintColor="#D2001C"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/listing/${item.id}` as any)}
          >
            <View style={styles.cardImage}>
              <Text style={styles.cardImageText}>🏷️</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardPrice}>€ {item.price}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>📍 {item.location}</Text>
                <Text style={styles.cardMetaText}>{item.time}</Text>
              </View>
              <View style={styles.sellerRow}>
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerAvatarText}>{item.seller.charAt(0)}</Text>
                </View>
                <Text style={styles.sellerName}>{item.seller}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Ajax.background },
  categoriesWrapper: {
    backgroundColor: '#fff', paddingVertical: 10,
    borderBottomWidth: 1, borderColor: Ajax.border,
  },
  categoriesContent: { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Ajax.background, borderWidth: 1.5, borderColor: Ajax.border,
  },
  chipActive: { backgroundColor: Ajax.red, borderColor: Ajax.red },
  chipText: { fontSize: 13, color: Ajax.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  refreshBar: {
    backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 16,
    borderBottomWidth: 1, borderColor: Ajax.border,
  },
  refreshText: { fontSize: 12, color: Ajax.textLight, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  cardImage: {
    height: 80, backgroundColor: Ajax.lightRed,
    justifyContent: 'center', alignItems: 'center',
  },
  cardImageText: { fontSize: 36 },
  cardContent: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Ajax.text, marginBottom: 4 },
  cardPrice: { fontSize: 18, fontWeight: '900', color: Ajax.red, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardMetaText: { fontSize: 12, color: Ajax.textLight },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Ajax.red, justifyContent: 'center', alignItems: 'center',
  },
  sellerAvatarText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  sellerName: { fontSize: 12, color: Ajax.textLight, flex: 1 },
  categoryBadge: { backgroundColor: Ajax.lightRed, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  categoryText: { fontSize: 11, color: Ajax.red, fontWeight: '700' },
});