import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';
import { NEWS_ITEMS } from '@/src/core/mock-content';
import { getNewsItemWithBody } from '@/src/core/live-news';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewsDetailScreen() {
  const { isNewsFavorite, toggleNewsFavorite } = useAppContext();
  const isDark = useColorScheme() === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const itemId = firstParam(id) ?? '1';
  const [article, setArticle] = useState(() => NEWS_ITEMS.find((n) => n.id === itemId) ?? NEWS_ITEMS[0]);
  const [loadingBody, setLoadingBody] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingBody(true);
      const live = await getNewsItemWithBody(itemId);
      if (!active) return;
      if (live) {
        setArticle(live);
      } else {
        setArticle(NEWS_ITEMS.find((n) => n.id === itemId) ?? NEWS_ITEMS[0]);
      }
      setLoadingBody(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [itemId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{article.category}</Text>
      </View>
      <Text style={styles.title}>{article.title}</Text>
      <Text style={styles.date}>{article.date}</Text>
      <Text style={styles.summary}>{article.summary}</Text>
      <TouchableOpacity
        style={[styles.favoriteBtn, isNewsFavorite(article.id) && styles.favoriteBtnActive]}
        onPress={() => {
          const run = async () => {
            const result = await toggleNewsFavorite(article.id);
            if (!result.ok) {
              Alert.alert('Favoriet mislukt', result.message ?? 'Probeer later opnieuw.');
            }
          };
          void run();
        }}
      >
        <Text style={[styles.favoriteBtnText, isNewsFavorite(article.id) && styles.favoriteBtnTextActive]}>
          {isNewsFavorite(article.id) ? 'In favorieten' : 'Toevoegen aan favorieten'}
        </Text>
      </TouchableOpacity>
      {article.sourceUrl ? (
        <TouchableOpacity
          style={styles.sourceBtn}
          onPress={() => {
            const open = async () => {
              const supported = await Linking.canOpenURL(article.sourceUrl ?? '');
              if (!supported) {
                Alert.alert('Link ongeldig', 'Kon originele artikel-link niet openen.');
                return;
              }
              await Linking.openURL(article.sourceUrl ?? '');
            };
            void open();
          }}
        >
          <Text style={styles.sourceBtnText}>Open origineel artikel</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.body}>{loadingBody ? 'Artikel laden...' : article.body}</Text>
    </ScrollView>
  );
}

function createStyles(isDark: boolean) {
  const bg = isDark ? '#101214' : Ajax.background;
  const text = isDark ? '#F1F3F4' : Ajax.text;
  const textSoft = isDark ? '#B2BBC3' : Ajax.textLight;
  const card = isDark ? '#1A1E22' : '#fff';
  const border = isDark ? '#2A3138' : Ajax.border;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    content: { padding: 16, gap: 10 },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: isDark ? '#3A2428' : Ajax.lightRed,
    },
    badgeText: { color: Ajax.red, fontWeight: '700', fontSize: 12 },
    title: { color: text, fontSize: 24, fontWeight: '900', lineHeight: 30 },
    date: { color: textSoft, fontSize: 12, marginTop: 2 },
    summary: {
      color: text,
      fontSize: 15,
      lineHeight: 22,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      padding: 12,
    },
    favoriteBtn: {
      alignSelf: 'flex-start',
      borderWidth: 1.4,
      borderColor: Ajax.red,
      borderRadius: 10,
      backgroundColor: '#fff',
      paddingHorizontal: 10,
      paddingVertical: 7,
      marginTop: 2,
      marginBottom: 2,
    },
    favoriteBtnActive: { backgroundColor: Ajax.red },
    favoriteBtnText: { color: Ajax.red, fontWeight: '700', fontSize: 12 },
    favoriteBtnTextActive: { color: '#fff' },
    sourceBtn: {
      alignSelf: 'flex-start',
      borderWidth: 1.4,
      borderColor: Ajax.red,
      borderRadius: 10,
      backgroundColor: Ajax.red,
      paddingHorizontal: 10,
      paddingVertical: 7,
      marginTop: 2,
      marginBottom: 2,
    },
    sourceBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    body: { color: textSoft, fontSize: 15, lineHeight: 24, marginBottom: 20 },
  });
}
