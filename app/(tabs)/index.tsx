import { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { Ajax } from '@/constants/theme';
import { MATCHES, NEWS_ITEMS, NewsItem } from '@/src/core/mock-content';
import { getNewsItems } from '@/src/core/live-news';
import { notifyBreakingAjaxNews } from '@/src/core/push-notifications';

const CATEGORIES = ['Alles', 'Eredivisie', 'Europa League', 'Transfers', 'Training', 'Club'];
const CATEGORY_CHIPS = CATEGORIES.map((category) => ({
  id: `cat-${category}`,
  label: category,
  kind: 'category' as const,
}));
const NEWS_BLOCK_LINES = [
  'WZAWZDB',
  '1 CLUB 1 STAD',
  'AJAX NIET TE STOPPEN',
  'AJAX AMSTERDAM',
  'AJAX WIT ROOD WIT',
  '90 MINUTEN LANG',
];

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return 'LIVE';
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `Nog ${hours}u ${minutes}m`;
}

function normalizeNewsKey(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupeNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];

  for (const item of items) {
    const titleKey = normalizeNewsKey(item.title);
    const summaryKey = normalizeNewsKey(item.summary).slice(0, 48);
    const key = `${titleKey}|${summaryKey}`;
    if (!key.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

export default function NewsScreen() {
  const isDark = useColorScheme() === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Alles');
  const [now, setNow] = useState(Date.now());
  const [newsItems, setNewsItems] = useState<NewsItem[]>(NEWS_ITEMS);

  useEffect(() => {
    const loadNews = async () => {
      const items = await getNewsItems();
      setNewsItems(items);
      await notifyBreakingAjaxNews(items);
    };
    void loadNews();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const run = async () => {
        const items = await getNewsItems({ forceRefresh: true });
        setNewsItems(items);
        await notifyBreakingAjaxNews(items);
      };
      void run();
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredNews = useMemo(() => {
    const deduped = dedupeNews(newsItems);
    if (activeCategory === 'Alles') return deduped;

    const direct = deduped.filter((n) => n.category === activeCategory);
    if (direct.length) return direct;

    const keywordMap: Record<string, string[]> = {
      Eredivisie: ['eredivisie', 'competitie', 'speelronde', 'psv', 'feyenoord', 'az', 'twente', 'sparta', 'utrecht'],
      'Europa League': ['europa league', 'europacup', 'uefa', 'champions league', 'conference league'],
      Transfers: ['transfer', 'contract', 'huur', 'aankoop', 'vertrek', 'technisch directeur', 'trainer', 'coach'],
      Training: ['training', 'trainings', 'open training', 'oefensessie', 'trainen'],
      Club: ['club', 'arena', 'bestuur', 'bava', 'leden', 'supporters'],
    };

    const keywords = keywordMap[activeCategory] ?? [];
    const byKeyword = deduped.filter((item) => {
      const hay = `${item.title} ${item.summary} ${item.body}`.toLowerCase();
      return keywords.some((word) => hay.includes(word));
    });
    if (byKeyword.length) return byKeyword;

    return deduped.slice(0, 8);
  }, [activeCategory, newsItems]);

  const nextMatch = useMemo(() => {
    return MATCHES.filter((m) => m.startIso)
      .filter((m) => new Date(m.startIso ?? 0).getTime() >= now - 2 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.startIso ?? 0).getTime() - new Date(b.startIso ?? 0).getTime())[0];
  }, [now]);

  const countdown = useMemo(() => {
    if (!nextMatch?.startIso) return null;
    const diff = new Date(nextMatch.startIso).getTime() - now;
    return formatCountdown(diff);
  }, [nextMatch?.startIso, now]);

  const countdownWithScore = useMemo(() => {
    if (!nextMatch) return null;
    const hasScore =
      typeof nextMatch.homeScore === 'number' && typeof nextMatch.awayScore === 'number';
    const score = hasScore ? `${nextMatch.homeScore}-${nextMatch.awayScore}` : '';
    const status = countdown ?? 'Onbekend';
    return score ? `${status} • ${score}` : status;
  }, [nextMatch, countdown]);

  const onRefresh = () => {
    setRefreshing(true);
    const run = async () => {
      const items = await getNewsItems({ forceRefresh: true });
      setNewsItems(items);
      await notifyBreakingAjaxNews(items);
      setRefreshing(false);
    };
    void run();
  };

  const openArticle = async (item: NewsItem) => {
    if (item.sourceUrl?.trim()) {
      await WebBrowser.openBrowserAsync(item.sourceUrl);
      return;
    }
    router.push({
      pathname: '/news/[id]',
      params: { id: item.id },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroBanner}>
        <Text style={styles.heroTitle} numberOfLines={1}>
          AJAX NIEUWS blijf op de hoogte.
        </Text>
      </View>

      {nextMatch ? (
        <View style={styles.countdownCard}>
          <Text style={styles.countdownFixture}>
            Volgende wedstrijd {'>'} {nextMatch.home.toUpperCase()} vs {nextMatch.away.toUpperCase()}
          </Text>
          <Text style={styles.countdownTime}>
            {nextMatch.dateLabel} · {nextMatch.time}
          </Text>
          <Text style={styles.countdownStatus}>{countdownWithScore}</Text>
        </View>
      ) : null}

      <View style={styles.categoriesWrapper}>
        <FlatList
          data={CATEGORY_CHIPS}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, activeCategory === item.label && styles.chipActive]}
              onPress={() => setActiveCategory(item.label)}
            >
              <Text
                style={[
                  styles.chipText,
                  activeCategory === item.label && styles.chipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredNews}
        keyExtractor={(i) => i.id}
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
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              const run = async () => {
                try {
                  await openArticle(item);
                } catch {
                  Alert.alert('Nieuws openen mislukt', 'Kon dit artikel niet openen.');
                }
              };
              void run();
            }}
          >
            <View style={styles.cardImage}>
              <Text style={styles.cardImageText}>
                {NEWS_BLOCK_LINES[index % NEWS_BLOCK_LINES.length]}
              </Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function createStyles(isDark: boolean) {
  const bg = '#050505';
  const card = '#FFFFFF';
  const border = Ajax.red;
  const text = '#111111';
  const textSoft = '#555555';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    heroBanner: {
      backgroundColor: Ajax.red,
      paddingHorizontal: 24,
      paddingVertical: 2,
      minHeight: 28,
      justifyContent: 'center',
    },
    heroTitle: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.4 },
    countdownCard: {
      marginHorizontal: 12,
      marginTop: 8,
      marginBottom: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: card,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    countdownFixture: { color: text, fontSize: 14, fontWeight: '900' },
    countdownTime: { color: textSoft, fontSize: 11, marginTop: 2, fontWeight: '700' },
    countdownStatus: { color: Ajax.red, fontSize: 12, marginTop: 2, fontWeight: '900' },
    categoriesWrapper: {
      backgroundColor: card,
      marginHorizontal: 24,
      marginTop: 0,
      marginBottom: 0,
      paddingVertical: 1,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
    },
    categoriesContent: {
      paddingHorizontal: 10,
      alignItems: 'center',
      gap: 6,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: '#FFFFFF',
      borderWidth: 1.3,
      borderColor: border,
    },
    chipActive: { backgroundColor: Ajax.red, borderColor: Ajax.red },
    chipText: { fontSize: 11, color: text, fontWeight: '700' },
    chipTextActive: { color: '#fff' },
    list: { padding: 16, gap: 12 },
    card: {
      backgroundColor: card,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
      borderWidth: 1,
      borderColor: border,
    },
    cardImage: {
      minHeight: 16,
      backgroundColor: Ajax.red,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 0,
      paddingHorizontal: 12,
    },
    cardImageText: {
      fontSize: 11,
      fontWeight: '900',
      color: 'rgba(255,255,255,0.72)',
      letterSpacing: 0.4,
      textAlign: 'center',
    },
    cardContent: { paddingHorizontal: 12, paddingVertical: 4 },
    cardTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: text,
      lineHeight: 16,
    },
  });
}
