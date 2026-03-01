import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { Ajax } from '@/constants/theme';

const MOCK_GROUPS = [
  { id: 'g1', name: '🔴 Nabespreking Wedstrijd', members: 2847, lastMsg: 'Die 2e goal was geweldig!', time: '18:42', unread: 23, active: true },
  { id: 'g2', name: '⚽ Matchday Live', members: 5120, lastMsg: 'Wie kijkt er mee vanavond?', time: '17:30', unread: 156, active: true },
  { id: 'g3', name: '🏆 Transfermarkt Talk', members: 1203, lastMsg: 'Henderson verlengt!', time: '15:10', unread: 0, active: false },
  { id: 'g4', name: '🏟️ Supporters Vak 410', members: 88, lastMsg: 'Wie heeft er nog kaarten?', time: '12:00', unread: 0, active: false },
  { id: 'g5', name: '🧡 Jeugd & Toekomst', members: 634, lastMsg: 'Geweldig talent dit jaar!', time: 'gisteren', unread: 5, active: false },
];

export default function ChatScreen() {
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

  return (
    <View style={styles.container}>
      {lastRefresh ? (
        <View style={styles.refreshBar}>
          <Text style={styles.refreshText}>🔄 {lastRefresh}</Text>
        </View>
      ) : null}

      <FlatList
        data={MOCK_GROUPS}
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
            style={styles.groupCard}
            onPress={() => Alert.alert(item.name, 'Live chat komt binnenkort!')}
          >
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, item.active && styles.avatarActive]}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>
              {item.active && <View style={styles.activeDot} />}
            </View>
            <View style={styles.groupInfo}>
              <View style={styles.groupTop}>
                <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.groupTime}>{item.time}</Text>
              </View>
              <View style={styles.groupBottom}>
                <Text style={styles.groupLastMsg} numberOfLines={1}>{item.lastMsg}</Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {item.unread > 99 ? '99+' : item.unread}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.memberCount}>👥 {item.members.toLocaleString('nl-NL')} leden</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Ajax.background },
  refreshBar: {
    backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 16,
    borderBottomWidth: 1, borderColor: Ajax.border,
  },
  refreshText: { fontSize: 12, color: Ajax.textLight, textAlign: 'center' },
  list: { padding: 16, gap: 10 },
  groupCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: Ajax.lightRed, justifyContent: 'center', alignItems: 'center',
  },
  avatarActive: { backgroundColor: Ajax.red },
  avatarText: { fontSize: 22 },
  activeDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#fff',
  },
  groupInfo: { flex: 1 },
  groupTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  groupName: { fontSize: 15, fontWeight: '700', color: Ajax.text, flex: 1, marginRight: 8 },
  groupTime: { fontSize: 11, color: Ajax.textLight },
  groupBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  groupLastMsg: { fontSize: 13, color: Ajax.textLight, flex: 1, marginRight: 8 },
  unreadBadge: {
    backgroundColor: Ajax.red, minWidth: 22, height: 22,
    borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  memberCount: { fontSize: 11, color: Ajax.textLight },
});