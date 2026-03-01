import { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, Linking
} from 'react-native';
import { Ajax } from '@/constants/theme';

const MOCK_NEWS = [
  {
    id: '1',
    title: 'Ajax wint overtuigend van PSV in topper',
    summary: 'Een indrukwekkende prestatie van de Amsterdammers zorgde voor drie punten in de titelstrijd.',
    date: '27 feb 2026',
    category: 'Eredivisie',
    url: 'https://ajax.nl',
  },
  {
    id: '2',
    title: 'Henderson verlengt contract bij Ajax',
    summary: 'De middenvelder heeft zijn verbintenis met een jaar verlengd.',
    date: '26 feb 2026',
    category: 'Transfers',
    url: 'https://ajax.nl',
  },
  {
    id: '3',
    title: 'Berghuis fit voor komend duel',
    summary: 'Goed nieuws vanuit de Johan Cruijff ArenA: Steven Berghuis traint mee met de groep.',
    date: '25 feb 2026',
    category: 'Training',
    url: 'https://ajax.nl',
  },
  {
    id: '4',
    title: 'Ajax in Europa League kwartfinales',
    summary: 'Na een spannende return heeft Ajax zich geplaatst voor de kwartfinales.',
    date: '24 feb 2026',
    category: 'Europa League',
    url: 'https://ajax.nl',
  },
  {
    id: '5',
    title: 'Nieuw thuisshirt 2026/2027 onthuld',
    summary: 'Ajax presenteert het nieuwe thuistenue voor aankomend seizoen.',
    date: '23 feb 2026',
    category: 'Club',
    url: 'https://ajax.nl',
  },
];

const CATEGORIES = ['Alles', 'Eredivisie', 'Europa League', 'Transfers', 'Training', 'Club'];

export default function NewsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Alles');

  const filteredNews = activeCategory === 'Alles'
    ? MOCK_NEWS
    : MOCK_NEWS.filter(n => n.category === activeCategory);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroBanner}>
        <Text style={styles.heroTitle}>Ajax Nieuws</Text>
        <Text style={styles.heroSub}>Altijd op de hoogte van je club</Text>
      </View>

      <FlatList
        data={CATEGORIES}
        keyExtractor={i => i}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categories}
        contentContainerStyle={{ paddingHorizontal: 16 }}
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

      <FlatList
        data={filteredNews}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Ajax.red]}
            tintColor={Ajax.red}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => Linking.openURL(item.url)}>
            <View style={styles.cardImage}>
              <Text style={styles.cardImageText}>AJAX</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardMeta}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
                <Text style={styles.dateText}>{item.date}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSummary} numberOfLines={2}>{item.summary}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Ajax.background },
  heroBanner: {
    backgroundColor: Ajax.red,
    padding: 24,
    paddingTop: 16,
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  categories: { maxHeight: 48, marginVertical: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, backgroundColor: '#fff',
    marginRight: 8, borderWidth: 1.5, borderColor: Ajax.border,
  },
  chipActive: { backgroundColor: Ajax.red, borderColor: Ajax.red },
  chipText: { fontSize: 13, color: Ajax.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  cardImage: {
    height: 100, backgroundColor: Ajax.red,
    justifyContent: 'center', alignItems: 'center',
  },
  cardImageText: { fontSize: 32, fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: 4 },
  cardContent: { padding: 16 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  categoryBadge: { backgroundColor: Ajax.lightRed, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  categoryText: { fontSize: 11, color: Ajax.red, fontWeight: '700' },
  dateText: { fontSize: 11, color: Ajax.textLight },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Ajax.text, marginBottom: 4, lineHeight: 21 },
  cardSummary: { fontSize: 13, color: Ajax.textLight, lineHeight: 18 },
});