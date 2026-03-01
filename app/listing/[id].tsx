import { useLocalSearchParams } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert
} from 'react-native';
import { Ajax } from '@/constants/theme';

const LISTING_DATA: Record<string, {
  title: string; price: number; category: string;
  seller: string; description: string; date: string;
  views: number; location: string;
}> = {
  '1': {
    title: 'Ajax Thuisshirt 2024/2025 - Maat L', price: 45,
    category: 'Shirts', seller: 'AjaxFan_Maarten',
    description: 'Origineel Ajax shirt, gedragen 2x. Zeer goede staat. Geen vlekken, scheuren of andere gebreken. Inclusief originele tag.',
    date: '27 feb', views: 34, location: 'Amsterdam',
  },
  '2': {
    title: 'Ajax Sjaal Champions League 2019', price: 20,
    category: 'Sjaals', seller: 'RedWhite_Supporter',
    description: 'Zeldzame CL sjaal uit 2019. Collector item in perfecte staat.',
    date: '26 feb', views: 87, location: 'Utrecht',
  },
  '3': {
    title: '2x Seizoenkaart Ajax 2025/2026', price: 380,
    category: 'Tickets', seller: 'AjaxSeason',
    description: 'Twee aaneengesloten stoelen vak 312. Verkoop wegens verhuizing.',
    date: '26 feb', views: 212, location: 'Amsterdam',
  },
};

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = LISTING_DATA[id ?? '1'] ?? LISTING_DATA['1'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.image}>
        <Text style={styles.imagePlaceholder}>🏷️</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{item.category}</Text>
          </View>
          <Text style={styles.price}>€ {item.price}</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        <View style={styles.metaBlock}>
          <Text style={styles.metaText}>📍 {item.location}</Text>
          <Text style={styles.metaText}>👤 {item.seller}</Text>
          <Text style={styles.metaText}>📅 {item.date}</Text>
          <Text style={styles.metaText}>👁 {item.views} bekeken</Text>
        </View>

        <Text style={styles.sectionLabel}>Beschrijving</Text>
        <Text style={styles.desc}>{item.description}</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => Alert.alert('Bericht sturen', `Wil je een bericht sturen naar ${item.seller}?`)}
        >
          <Text style={styles.primaryBtnText}>💬 Stuur bericht aan verkoper</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => Alert.alert('Opgeslagen!', 'Advertentie toegevoegd aan je favorieten.')}
        >
          <Text style={styles.secondaryBtnText}>❤️ Opslaan</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Ajax.background },
  image: {
    height: 200, backgroundColor: Ajax.lightRed,
    justifyContent: 'center', alignItems: 'center',
  },
  imagePlaceholder: { fontSize: 64 },
  body: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { backgroundColor: Ajax.lightRed, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  catText: { fontSize: 12, fontWeight: '700', color: Ajax.red },
  price: { fontSize: 30, fontWeight: '900', color: Ajax.red },
  title: { fontSize: 18, fontWeight: '700', color: Ajax.text, marginBottom: 14, lineHeight: 25 },
  metaBlock: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 16,
  },
  metaText: { fontSize: 13, color: Ajax.textLight },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Ajax.text, marginBottom: 6 },
  desc: { fontSize: 15, color: Ajax.text, lineHeight: 23, marginBottom: 24 },
  primaryBtn: {
    backgroundColor: Ajax.red, padding: 15, borderRadius: 12,
    alignItems: 'center', marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1.5, borderColor: Ajax.red, padding: 13,
    borderRadius: 12, alignItems: 'center', marginBottom: 32,
  },
  secondaryBtnText: { color: Ajax.red, fontSize: 16, fontWeight: '700' },
});