import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';
import { NEWS_ITEMS } from '@/src/core/mock-content';

export default function FavoritesScreen() {
  const { favoriteListingIds, favoriteNewsIds } = useAppContext();
  const styles = useMemo(() => createStyles(), []);

  const favoriteNews = useMemo(
    () => NEWS_ITEMS.filter((item) => favoriteNewsIds.includes(item.id)),
    [favoriteNewsIds]
  );
  const favoriteListings = useMemo(
    () =>
      favoriteListingIds.map((id) => ({
        id,
        title: `Advertentie ${id.slice(0, 8)}`,
      })),
    [favoriteListingIds]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Mijn favorieten</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nieuws</Text>
        {favoriteNews.length === 0 ? (
          <Text style={styles.emptyText}>Nog geen favoriete nieuwsberichten.</Text>
        ) : (
          favoriteNews.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {item.category} · {item.date}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marktplaats</Text>
        {favoriteListings.length === 0 ? (
          <Text style={styles.emptyText}>Nog geen favoriete advertenties.</Text>
        ) : (
          favoriteListings.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>ID: {item.id}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    content: { padding: 16, gap: 14, paddingBottom: 28 },
    screenTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
    section: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      padding: 12,
      gap: 8,
    },
    sectionTitle: { color: '#111111', fontSize: 16, fontWeight: '800' },
    emptyText: { color: '#666666', fontSize: 13, fontWeight: '600' },
    card: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      padding: 10,
      gap: 3,
    },
    cardTitle: { color: '#111111', fontSize: 14, fontWeight: '700' },
    cardMeta: { color: '#666666', fontSize: 12, fontWeight: '600' },
  });
}
