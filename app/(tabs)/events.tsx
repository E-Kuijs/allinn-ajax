import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { Ajax } from '@/constants/theme';

const MATCHES = [
  {
    id: 'e1', type: 'upcoming',
    home: 'Ajax', away: 'Feyenoord',
    date: 'Zondag 2 maart 2026', time: '16:45',
    competition: 'Eredivisie', venue: 'Johan Cruijff ArenA',
    homeScore: null, awayScore: null,
  },
  {
    id: 'e2', type: 'upcoming',
    home: 'Benfica', away: 'Ajax',
    date: 'Donderdag 6 maart 2026', time: '21:00',
    competition: 'Europa League', venue: 'Estádio da Luz',
    homeScore: null, awayScore: null,
  },
  {
    id: 'e3', type: 'upcoming',
    home: 'Ajax', away: 'FC Utrecht',
    date: 'Zaterdag 14 maart 2026', time: '18:00',
    competition: 'Eredivisie', venue: 'Johan Cruijff ArenA',
    homeScore: null, awayScore: null,
  },
  {
    id: 'e4', type: 'past',
    home: 'Ajax', away: 'PSV',
    date: 'Zondag 23 feb 2026', time: 'Afgelopen',
    competition: 'Eredivisie', venue: 'Johan Cruijff ArenA',
    homeScore: 3, awayScore: 1,
  },
  {
    id: 'e5', type: 'past',
    home: 'Lille', away: 'Ajax',
    date: 'Donderdag 20 feb 2026', time: 'Afgelopen',
    competition: 'Europa League', venue: 'Stade Pierre-Mauroy',
    homeScore: 0, awayScore: 2,
  },
];

export default function EventsScreen() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
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

  const filtered = MATCHES.filter(m => m.type === activeTab);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Aankomend
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Uitslagen
          </Text>
        </TouchableOpacity>
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
            title="Vernieuwen..."
            titleColor="#D2001C"
          />
        }
        renderItem={({ item }) => {
          const ajaxWon =
            item.homeScore !== null &&
            ((item.home === 'Ajax' && item.homeScore > item.awayScore!) ||
             (item.away === 'Ajax' && item.awayScore! > item.homeScore!));
          const ajaxLost =
            item.homeScore !== null &&
            ((item.home === 'Ajax' && item.homeScore < item.awayScore!) ||
             (item.away === 'Ajax' && item.awayScore! < item.homeScore!));

          return (
            <View style={styles.matchCard}>
              <View style={styles.matchTop}>
                <View style={[styles.compBadge, item.competition === 'Europa League' && styles.compBadgeEL]}>
                  <Text style={styles.compText}>{item.competition}</Text>
                </View>
                {item.type === 'past' && (
                  <View style={[
                    styles.resultBadge,
                    ajaxWon && styles.resultWin,
                    ajaxLost && styles.resultLoss,
                    !ajaxWon && !ajaxLost && styles.resultDraw,
                  ]}>
                    <Text style={styles.resultText}>{ajaxWon ? 'W' : ajaxLost ? 'V' : 'G'}</Text>
                  </View>
                )}
              </View>

              <View style={styles.matchCenter}>
                <View style={styles.teamBlock}>
                  <View style={[styles.teamBadge, item.home === 'Ajax' && styles.teamBadgeAjax]}>
                    <Text style={[styles.teamBadgeText, item.home === 'Ajax' && styles.teamBadgeTextAjax]}>
                      {item.home.substring(0, 3).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.teamName}>{item.home}</Text>
                </View>

                <View style={styles.scoreBlock}>
                  {item.homeScore !== null ? (
                    <Text style={styles.score}>{item.homeScore} - {item.awayScore}</Text>
                  ) : (
                    <View style={styles.vsBlock}>
                      <Text style={styles.vsTime}>{item.time}</Text>
                      <Text style={styles.vs}>VS</Text>
                    </View>
                  )}
                </View>

                <View style={styles.teamBlock}>
                  <View style={[styles.teamBadge, item.away === 'Ajax' && styles.teamBadgeAjax]}>
                    <Text style={[styles.teamBadgeText, item.away === 'Ajax' && styles.teamBadgeTextAjax]}>
                      {item.away.substring(0, 3).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.teamName}>{item.away}</Text>
                </View>
              </View>

              <View style={styles.matchBottom}>
                <Text style={styles.matchInfoText}>📅 {item.date}</Text>
                <Text style={styles.matchInfoText}>📍 {item.venue}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Ajax.background },
  tabs: {
    flexDirection: 'row', backgroundColor: Ajax.red,
    padding: 8, paddingHorizontal: 16, gap: 8,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { color: Ajax.red },
  refreshBar: {
    backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 16,
    borderBottomWidth: 1, borderColor: Ajax.border,
  },
  refreshText: { fontSize: 12, color: Ajax.textLight, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  matchCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  compBadge: { backgroundColor: Ajax.lightRed, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  compBadgeEL: { backgroundColor: '#E8F0FE' },
  compText: { fontSize: 11, fontWeight: '700', color: Ajax.red },
  resultBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  resultWin: { backgroundColor: '#2E7D32' },
  resultLoss: { backgroundColor: Ajax.red },
  resultDraw: { backgroundColor: '#888' },
  resultText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  matchCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  teamBlock: { alignItems: 'center', width: 80 },
  teamBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Ajax.border, justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  teamBadgeAjax: { backgroundColor: Ajax.red },
  teamBadgeText: { fontSize: 13, fontWeight: '700', color: Ajax.text },
  teamBadgeTextAjax: { color: '#fff' },
  teamName: { fontSize: 12, fontWeight: '600', color: Ajax.text, textAlign: 'center' },
  scoreBlock: { alignItems: 'center' },
  score: { fontSize: 28, fontWeight: '900', color: Ajax.text },
  vsBlock: { alignItems: 'center' },
  vsTime: { fontSize: 13, fontWeight: '700', color: Ajax.red },
  vs: { fontSize: 18, fontWeight: '900', color: Ajax.textLight },
  matchBottom: { gap: 4, borderTopWidth: 1, borderColor: Ajax.border, paddingTop: 10 },
  matchInfoText: { fontSize: 12, color: Ajax.textLight },
});