import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Switch, Image, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ajax } from '@/constants/theme';
import { router } from 'expo-router';

const ALL_INN_APPS = [
  { id: 'sports', icon: '⚽', label: 'ALL-INN SPORTS', sub: 'Ajax, voetbal & meer' },
  { id: 'finance', icon: '💰', label: 'ALL-INN FINANCE', sub: 'Beleggen & sparen' },
  { id: 'kids', icon: '🧒', label: 'ALL-INN KIDS', sub: 'Voor de kleintjes' },
  { id: 'home', icon: '🏠', label: 'ALL-INN HOME', sub: 'Wonen & lifestyle' },
  { id: 'teens', icon: '🎮', label: 'ALL-INN TEENS', sub: 'Voor tieners' },
];

const CATEGORIES = ['Shirts', 'Sjaals', 'Tickets', 'Memorabilia', 'Overig'];

const MOCK_FAVORITES = [
  { id: '1', title: 'Gesigneerde foto Johan Cruijff', price: 75, seller: 'VintageAjax' },
  { id: '2', title: '2x Seizoenkaart Ajax 2025/2026', price: 380, seller: 'AjaxSeason' },
];

const MOCK_GROUPS = [
  { id: 'g1', name: '🔴 Nabespreking Wedstrijd', members: 2847, unread: 23 },
  { id: 'g2', name: '⚽ Matchday Live', members: 5120, unread: 156 },
  { id: 'g4', name: '🏟️ Supporters Vak 410', members: 88, unread: 0 },
];

// Wedstrijd datum instellen — verander dit voor testen
const MATCH_DATE = new Date();
MATCH_DATE.setDate(MATCH_DATE.getDate() + 1); // morgen, verander naar 0 = vandaag, 3 = over 3 dagen

const MATCH_NEWS = [
  { time: "90'", text: '⚽ GOAL! Brobbey maakt de 2-0! Ajax wint!' },
  { time: "67'", text: '⚽ GOAL! Henderson scoort na geweldige aanval!' },
  { time: "45'", text: '🔴 Rust: Ajax - Feyenoord 1-0' },
  { time: "23'", text: '⚽ GOAL! Taylor opent de score voor Ajax!' },
  { time: "1'", text: '🏁 Aftrap! Ajax - Feyenoord is begonnen!' },
];

const getMatchLabel = () => {
  const today = new Date();
  const diff = Math.round((MATCH_DATE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '⚽ Ajax speelt VANDAAG!';
  if (diff === 1) return '⚽ Ajax speelt MORGEN';
  if (diff > 1) return `⚽ Ajax speelt over ${diff} dagen`;
  return '⚽ Wedstrijd voorbij';
};

type Notification = {
  id: string;
  icon: string;
  title: string;
  time: string;
  read: boolean;
  route: string;
  type?: string;
  sender?: string;
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n1', icon: '💬', title: 'Nieuw bericht in Nabespreking', time: '18:42', read: false, route: '/(tabs)/chat', type: 'chat', sender: 'AjaxFan_Maarten' },
  { id: 'n2', icon: '🏷️', title: 'Iemand reageert op je advertentie', time: '17:30', read: false, route: '/(tabs)/marketplace', type: 'listing', sender: 'VintageAjax' },
  { id: 'n3', icon: '⚽', title: getMatchLabel(), time: 'gisteren', read: true, route: '/(tabs)/events', type: 'match' },
  { id: 'n4', icon: '🔴', title: 'Welkom bij ALL-INN AJAX!', time: '27 feb', read: true, route: '/(tabs)/index', type: 'welcome' },
];

type Screen = 'main' | 'listings' | 'favorites' | 'groups' | 'notifications' | 'settings' | 'hub' | 'newlisting' | 'editlisting' | 'matchnews';

type Listing = {
  id: string;
  title: string;
  price: number;
  category: string;
  status: string;
  location?: string;
  description?: string;
};

export default function ProfileScreen() {
  const [screen, setScreen] = useState<Screen>('main');
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('Edwin Kuijs');
  const [username, setUsername] = useState('@edwin_ajax_fan');
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [replyText, setReplyText] = useState('');
  const [activeNotifId, setActiveNotifId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([
    { id: '1', title: 'Ajax Thuisshirt 2024/2025 - Maat L', price: 45, category: 'Shirts', status: 'Actief', location: 'Amsterdam' },
    { id: '2', title: 'Ajax Sjaal Champions League 2019', price: 20, category: 'Sjaals', status: 'Actief', location: 'Utrecht' },
    { id: '3', title: 'Ajax baby pakje maat 68', price: 12, category: 'Overig', status: 'Verkocht', location: 'Almere' },
  ]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Geen toegang', 'Geef toestemming om je fotogalerij te gebruiken.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setProfileImage(result.assets[0].uri);
  };

  const pickListingImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Geen toegang', 'Geef toestemming om je fotogalerij te gebruiken.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setNewImage(result.assets[0].uri);
  };

  const submitListing = () => {
    if (!newTitle.trim() || !newPrice.trim() || !newCategory || !newLocation.trim()) {
      Alert.alert('Vul alle velden in', 'Titel, prijs, categorie en locatie zijn verplicht.'); return;
    }
    const newListing: Listing = { id: `l${Date.now()}`, title: newTitle.trim(), price: parseFloat(newPrice), category: newCategory, status: 'Actief', location: newLocation.trim(), description: newDescription.trim() };
    setListings(prev => [newListing, ...prev]);
    setNewTitle(''); setNewPrice(''); setNewCategory(''); setNewLocation(''); setNewDescription(''); setNewImage(null);
    Alert.alert('✅ Geplaatst!', 'Je advertentie is succesvol geplaatst!', [{ text: 'OK', onPress: () => setScreen('listings') }]);
  };

  const saveEditListing = () => {
    if (!editingListing) return;
    if (!editingListing.title.trim() || !editingListing.price) { Alert.alert('Vul alle velden in', 'Titel en prijs zijn verplicht.'); return; }
    setListings(prev => prev.map(l => l.id === editingListing.id ? editingListing : l));
    Alert.alert('✅ Opgeslagen!', 'Je advertentie is bijgewerkt.', [{ text: 'OK', onPress: () => setScreen('listings') }]);
  };

  const changeStatus = (id: string, status: string) => setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));

  const deleteListing = (id: string) => {
    Alert.alert('Verwijderen', 'Weet je zeker dat je deze advertentie wilt verwijderen?', [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Verwijderen', style: 'destructive', onPress: () => setListings(prev => prev.filter(l => l.id !== id)) },
    ]);
  };

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const deleteNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const blockUser = (sender: string) => {
    Alert.alert('Blokkeren', `Weet je zeker dat je ${sender} wilt blokkeren?`, [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Blokkeren', style: 'destructive', onPress: () => { setBlockedUsers(prev => [...prev, sender]); Alert.alert('Geblokkeerd', `${sender} is geblokkeerd.`); } },
    ]);
  };

  const sendReply = (notif: Notification) => {
    if (!replyText.trim()) return;
    Alert.alert('Bericht verstuurd!', `Je reactie is verstuurd naar ${notif.sender}.`);
    setReplyText('');
    setActiveNotifId(null);
  };

  // === WEDSTRIJD NIEUWS ===
  if (screen === 'matchnews') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setScreen('notifications')}>
            <Text style={styles.backBtn}>← Terug</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Ajax - Feyenoord</Text>
        </View>
        <ScrollView contentContainerStyle={styles.subContent}>
          <View style={styles.matchCard}>
            <View style={styles.matchHeaderBlock}>
              <View style={styles.matchTeam}>
                <View style={styles.matchBadgeAjax}><Text style={styles.matchBadgeText}>AJX</Text></View>
                <Text style={styles.matchTeamName}>Ajax</Text>
              </View>
              <View style={styles.matchScoreBlock}>
                <Text style={styles.matchScore}>2 - 0</Text>
                <Text style={styles.matchStatus}>Afgelopen</Text>
              </View>
              <View style={styles.matchTeam}>
                <View style={styles.matchBadgeAway}><Text style={styles.matchBadgeText}>FEY</Text></View>
                <Text style={styles.matchTeamName}>Feyenoord</Text>
              </View>
            </View>
            <View style={styles.matchInfo}>
              <Text style={styles.matchInfoText}>📅 Zondag 2 maart 2026 · 16:45</Text>
              <Text style={styles.matchInfoText}>📍 Johan Cruijff ArenA</Text>
              <Text style={styles.matchInfoText}>🏆 Eredivisie</Text>
            </View>
          </View>

          <Text style={styles.matchNewsTitle}>📰 Wedstrijd verslag</Text>
          {MATCH_NEWS.map((item, i) => (
            <View key={i} style={styles.matchNewsItem}>
              <View style={styles.matchNewsTime}>
                <Text style={styles.matchNewsTimeText}>{item.time}</Text>
              </View>
              <Text style={styles.matchNewsText}>{item.text}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.submitBtn} onPress={() => router.push('/(tabs)/events' as any)}>
            <Text style={styles.submitBtnText}>🏟️ Naar alle wedstrijden</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // === ADVERTENTIE BEWERKEN ===
  if (screen === 'editlisting' && editingListing) {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setScreen('listings')}>
            <Text style={styles.backBtn}>← Terug</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Advertentie Bewerken</Text>
        </View>
        <ScrollView contentContainerStyle={styles.subContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.formLabel}>Titel *</Text>
          <TextInput style={styles.formInput} value={editingListing.title} onChangeText={t => setEditingListing({ ...editingListing, title: t })} maxLength={60} />
          <Text style={styles.formLabel}>Prijs (€) *</Text>
          <TextInput style={styles.formInput} value={String(editingListing.price)} onChangeText={t => setEditingListing({ ...editingListing, price: parseFloat(t) || 0 })} keyboardType="numeric" />
          <Text style={styles.formLabel}>Categorie *</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[styles.catChip, editingListing.category === cat && styles.catChipActive]} onPress={() => setEditingListing({ ...editingListing, category: cat })}>
                <Text style={[styles.catChipText, editingListing.category === cat && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.formLabel}>Locatie *</Text>
          <TextInput style={styles.formInput} value={editingListing.location ?? ''} onChangeText={t => setEditingListing({ ...editingListing, location: t })} placeholder="Bijv. Amsterdam" />
          <Text style={styles.formLabel}>Beschrijving</Text>
          <TextInput style={[styles.formInput, styles.formTextarea]} value={editingListing.description ?? ''} onChangeText={t => setEditingListing({ ...editingListing, description: t })} multiline numberOfLines={4} maxLength={300} />
          <TouchableOpacity style={styles.submitBtn} onPress={saveEditListing}>
            <Text style={styles.submitBtnText}>💾 Wijzigingen opslaan</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // === NIEUWE ADVERTENTIE ===
  if (screen === 'newlisting') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setScreen('listings')}>
            <Text style={styles.backBtn}>← Terug</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Nieuwe Advertentie</Text>
        </View>
        <ScrollView contentContainerStyle={styles.subContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.photoBtn} onPress={pickListingImage}>
            {newImage ? <Image source={{ uri: newImage }} style={styles.photoPreview} /> : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoText}>Foto toevoegen</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.formLabel}>Titel *</Text>
          <TextInput style={styles.formInput} placeholder="Bijv. Ajax thuisshirt maat L" value={newTitle} onChangeText={setNewTitle} maxLength={60} />
          <Text style={styles.formLabel}>Prijs (€) *</Text>
          <TextInput style={styles.formInput} placeholder="0.00" value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" />
          <Text style={styles.formLabel}>Categorie *</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[styles.catChip, newCategory === cat && styles.catChipActive]} onPress={() => setNewCategory(cat)}>
                <Text style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.formLabel}>Locatie *</Text>
          <TextInput style={styles.formInput} placeholder="Bijv. Amsterdam" value={newLocation} onChangeText={setNewLocation} />
          <Text style={styles.formLabel}>Beschrijving</Text>
          <TextInput style={[styles.formInput, styles.formTextarea]} placeholder="Beschrijf je artikel..." value={newDescription} onChangeText={setNewDescription} multiline numberOfLines={4} maxLength={300} />
          <Text style={styles.charCount}>{newDescription.length}/300</Text>
          <TouchableOpacity style={styles.submitBtn} onPress={submitListing}>
            <Text style={styles.submitBtnText}>🏷️ Advertentie plaatsen</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // === MIJN ADVERTENTIES ===
  if (screen === 'listings') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setScreen('main')}><Text style={styles.backBtn}>← Terug</Text></TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Mijn Advertenties</Text>
        </View>
        <ScrollView contentContainerStyle={styles.subContent}>
          {listings.map(item => (
            <View key={item.id} style={styles.listingCardFull}>
              <View style={styles.listingTop}>
                <Text style={styles.listingIcon}>🏷️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.listingMeta}>{item.category} · € {item.price} · {item.location}</Text>
                </View>
              </View>
              <View style={styles.statusRow}>
                {['Actief', 'Gereserveerd', 'Verkocht'].map(s => (
                  <TouchableOpacity key={s} style={[styles.statusBtn, item.status === s && styles.statusBtnActive]} onPress={() => changeStatus(item.id, s)}>
                    <Text style={[styles.statusBtnText, item.status === s && styles.statusBtnTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => { setEditingListing(item); setScreen('editlisting'); }}>
                  <Text style={styles.editBtnText}>✏️ Bewerken</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteListing(item.id)}>
                  <Text style={styles.deleteBtnText}>🗑️ Verwijderen</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addBtn} onPress={() => setScreen('newlisting')}>
            <Text style={styles.addBtnText}>+ Nieuwe advertentie</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // === OPGESLAGEN ITEMS ===
  if (screen === 'favorites') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setScreen('main')}><Text style={styles.backBtn}>← Terug</Text></TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Opgeslagen Items</Text>
        </View>
        <ScrollView contentContainerStyle={styles.subContent}>
          {MOCK_FAVORITES.map(item => (
            <View key={item.id} style={styles.listingCard}>
              <View style={styles.listingLeft}>
                <Text style={styles.listingIcon}>❤️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.listingMeta}>€ {item.price} · {item.seller}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => Alert.alert('Verwijderd', 'Item verwijderd uit favorieten.')}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // === MIJN GROEPEN ===
  if (screen === 'groups') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setScreen('main')}><Text style={styles.backBtn}>← Terug</Text></TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Mijn Groepen</Text>
        </View>
        <ScrollView contentContainerStyle={styles.subContent}>
          {MOCK_GROUPS.map(group => (
            <View key={group.id} style={styles.listingCard}>
              <View style={styles.listingLeft}>
                <Text style={styles.listingIcon}>{group.name.charAt(0)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listingTitle} numberOfLines={1}>{group.name}</Text>
                  <Text style={styles.listingMeta}>{group.members.toLocaleString('nl-NL')} leden</Text>
                </View>
              </View>
              {group.unread > 0 && (
                <View style={styles.unreadBadge}><Text style={styles.unreadText}>{group.unread}</Text></View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // === NOTIFICATIES ===
  if (screen === 'notifications') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setScreen('main')}><Text style={styles.backBtn}>← Terug</Text></TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Notificaties</Text>
          <TouchableOpacity onPress={markAllRead}><Text style={styles.markRead}>Alles gelezen</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.subContent}>
          {notifications.map(n => (
            <View key={n.id}>
              <TouchableOpacity
                style={[styles.notifCard, !n.read && styles.notifUnread]}
                onPress={() => {
                  setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                  if (n.type === 'match') { setScreen('matchnews'); return; }
                  router.push(n.route as any);
                }}
              >
                <Text style={styles.notifIcon}>{n.icon}</Text>
                <View style={styles.notifInfo}>
                  <Text style={styles.notifTitle}>{n.id === 'n3' ? getMatchLabel() : n.title}</Text>
                  <Text style={styles.notifTime}>{n.time}</Text>
                </View>
                {!n.read && <View style={styles.notifDot} />}
              </TouchableOpacity>

              {/* Actie knoppen */}
              <View style={styles.notifActions}>
                {/* Reageren knop voor chat/listing */}
                {(n.type === 'chat' || n.type === 'listing') && n.sender && !blockedUsers.includes(n.sender) && (
                  <TouchableOpacity
                    style={styles.notifActionBtn}
                    onPress={() => setActiveNotifId(activeNotifId === n.id ? null : n.id)}
                  >
                    <Text style={styles.notifActionText}>💬 Reageren</Text>
                  </TouchableOpacity>
                )}
                {/* Blokkeren knop */}
                {n.sender && !blockedUsers.includes(n.sender) && (
                  <TouchableOpacity style={[styles.notifActionBtn, styles.notifActionBlock]} onPress={() => blockUser(n.sender!)}>
                    <Text style={styles.notifActionBlockText}>🚫 Blokkeren</Text>
                  </TouchableOpacity>
                )}
                {n.sender && blockedUsers.includes(n.sender) && (
                  <Text style={styles.blockedLabel}>🚫 Geblokkeerd</Text>
                )}
                {/* Verwijderen */}
                <TouchableOpacity style={[styles.notifActionBtn, styles.notifActionDelete]} onPress={() => deleteNotification(n.id)}>
                  <Text style={styles.notifActionDeleteText}>🗑️ Verwijderen</Text>
                </TouchableOpacity>
              </View>

              {/* Reageer input */}
              {activeNotifId === n.id && (
                <View style={styles.replyBox}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder={`Reageer op ${n.sender}...`}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                  />
                  <TouchableOpacity style={styles.replyBtn} onPress={() => sendReply(n)}>
                    <Text style={styles.replyBtnText}>Verstuur</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // === INSTELLINGEN ===
  if (screen === 'settings') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setScreen('main')}><Text style={styles.backBtn}>← Terug</Text></TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Instellingen</Text>
        </View>
        <ScrollView contentContainerStyle={styles.subContent}>
          <Text style={styles.settingsLabel}>Weergavenaam</Text>
          <TextInput style={styles.settingsInput} value={displayName} onChangeText={setDisplayName} placeholder="Jouw naam" />
          <Text style={styles.settingsLabel}>Gebruikersnaam</Text>
          <TextInput style={styles.settingsInput} value={username} onChangeText={setUsername} placeholder="@gebruikersnaam" />
          <View style={styles.settingsToggle}>
            <Text style={styles.settingsToggleLabel}>🔔 Push notificaties</Text>
            <Switch value={notificationsOn} onValueChange={setNotificationsOn} trackColor={{ false: Ajax.border, true: Ajax.red }} thumbColor="#fff" />
          </View>
          <View style={styles.settingsToggle}>
            <Text style={styles.settingsToggleLabel}>🌙 Donkere modus</Text>
            <Switch value={false} onValueChange={() => Alert.alert('Donkere modus', 'Coming soon!')} trackColor={{ false: Ajax.border, true: Ajax.red }} thumbColor="#fff" />
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={() => Alert.alert('Opgeslagen!', 'Je instellingen zijn opgeslagen.')}>
            <Text style={styles.saveBtnText}>Opslaan</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // === ALL-INN HUB ===
  if (screen === 'hub') {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setScreen('main')}><Text style={styles.backBtn}>← Terug</Text></TouchableOpacity>
          <Text style={styles.subHeaderTitle}>ALL-INN MEDIA HUB</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.subContent, { alignItems: 'center' }]}>
          <View style={styles.hubLogo}><Text style={styles.hubLogoText}>AIM</Text></View>
          <Text style={styles.hubTitle}>ALL-INN MEDIA</Text>
          <Text style={styles.hubSub}>Kies een categorie</Text>
          {ALL_INN_APPS.map(app => (
            <TouchableOpacity key={app.id} style={styles.hubCard} onPress={() => Alert.alert(app.label, 'Deze app komt binnenkort beschikbaar!')}>
              <Text style={styles.hubCardIcon}>{app.icon}</Text>
              <View style={styles.hubCardInfo}>
                <Text style={styles.hubCardTitle}>{app.label}</Text>
                <Text style={styles.hubCardSub}>{app.sub}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // === HOOFD PROFIEL ===
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarWrap}>
          {profileImage ? <Image source={{ uri: profileImage }} style={styles.avatarImage} /> : (
            <View style={styles.avatar}><Text style={styles.avatarText}>EK</Text></View>
          )}
          <View style={styles.avatarEdit}><Text style={styles.avatarEditText}>📷</Text></View>
        </TouchableOpacity>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.username}>{username}</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>🔴 Ajax Supporter</Text></View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Berichten', value: '47' },
          { label: 'Advertenties', value: String(listings.length) },
          { label: 'Lid sinds', value: '2024' },
        ].map((s, i) => (
          <View key={i} style={[styles.statItem, i < 2 && styles.statBorder]}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.menuSection}>
        {[
          { id: 'listings', icon: '🏷️', label: 'Mijn advertenties', badge: String(listings.length) },
          { id: 'favorites', icon: '❤️', label: 'Opgeslagen items', badge: null },
          { id: 'groups', icon: '💬', label: 'Mijn groepen', badge: '2' },
          { id: 'notifications', icon: '🔔', label: 'Notificaties', badge: String(notifications.filter(n => !n.read).length) },
          { id: 'settings', icon: '⚙️', label: 'Instellingen', badge: null },
        ].map(item => (
          <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => setScreen(item.id as Screen)}>
            <View style={styles.menuIconWrap}><Text style={styles.menuIcon}>{item.icon}</Text></View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={styles.menuRight}>
              {item.badge && item.badge !== '0' && (
                <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{item.badge}</Text></View>
              )}
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={styles.menuItem}>
          <View style={styles.menuIconWrap}><Text style={styles.menuIcon}>🔔</Text></View>
          <Text style={styles.menuLabel}>Push notificaties</Text>
          <Switch value={notificationsOn} onValueChange={setNotificationsOn} trackColor={{ false: Ajax.border, true: Ajax.red }} thumbColor="#fff" />
        </View>
      </View>

      <View style={styles.brandSection}>
        <View style={styles.brandLogo}><Text style={styles.brandLogoText}>AIM</Text></View>
        <Text style={styles.brandTitle}>ALL-INN MEDIA</Text>
        <Text style={styles.brandSub}>ALL-INN AJAX maakt deel uit van het ALL-INN MEDIA platform</Text>
        <TouchableOpacity style={styles.hubBtn} onPress={() => setScreen('hub')}>
          <Text style={styles.hubBtnText}>Naar ALL-INN HUB →</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Uitloggen', style: 'destructive', onPress: () => {} },
      ])}>
        <Text style={styles.logoutText}>Uitloggen</Text>
      </TouchableOpacity>
      <Text style={styles.version}>ALL-INN AJAX v1.0.0 — ALL-INN MEDIA © 2026</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Ajax.background },
  subHeader: { backgroundColor: Ajax.red, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { color: '#fff', fontSize: 15, fontWeight: '600' },
  subHeaderTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  markRead: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  subContent: { padding: 16, gap: 10 },
  listingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  listingCardFull: { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  listingTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  listingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  listingIcon: { fontSize: 24 },
  listingTitle: { fontSize: 14, fontWeight: '700', color: Ajax.text },
  listingMeta: { fontSize: 12, color: Ajax.textLight, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statusBtn: { flex: 1, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: Ajax.border, alignItems: 'center' },
  statusBtnActive: { backgroundColor: Ajax.red, borderColor: Ajax.red },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: Ajax.textLight },
  statusBtnTextActive: { color: '#fff' },
  actionRow: { flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, padding: 9, borderRadius: 10, backgroundColor: Ajax.lightRed, alignItems: 'center' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: Ajax.red },
  deleteBtn: { flex: 1, padding: 9, borderRadius: 10, backgroundColor: '#FFF0F0', alignItems: 'center' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#D32F2F' },
  statusBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusSold: { backgroundColor: Ajax.lightRed },
  statusText: { fontSize: 11, fontWeight: '700', color: Ajax.text },
  addBtn: { backgroundColor: Ajax.red, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  removeBtn: { fontSize: 20, color: Ajax.red, fontWeight: '700' },
  unreadBadge: { backgroundColor: Ajax.red, minWidth: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  notifCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  notifUnread: { backgroundColor: '#FFF5F5', borderLeftWidth: 3, borderLeftColor: Ajax.red },
  notifIcon: { fontSize: 24 },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: Ajax.text },
  notifTime: { fontSize: 11, color: Ajax.textLight, marginTop: 2 },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Ajax.red },
  notifActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 6, flexWrap: 'wrap' },
  notifActionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: Ajax.lightRed },
  notifActionText: { fontSize: 12, fontWeight: '600', color: Ajax.red },
  notifActionBlock: { backgroundColor: '#FFF0F0' },
  notifActionBlockText: { fontSize: 12, fontWeight: '600', color: '#D32F2F' },
  notifActionDelete: { backgroundColor: '#F5F5F5' },
  notifActionDeleteText: { fontSize: 12, fontWeight: '600', color: Ajax.textLight },
  blockedLabel: { fontSize: 12, color: Ajax.textLight, paddingVertical: 6 },
  replyBox: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 4, borderWidth: 1.5, borderColor: Ajax.border },
  replyInput: { fontSize: 14, color: Ajax.text, minHeight: 60, textAlignVertical: 'top', marginBottom: 8 },
  replyBtn: { backgroundColor: Ajax.red, padding: 10, borderRadius: 10, alignItems: 'center' },
  replyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Wedstrijd nieuws
  matchCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  matchHeaderBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  matchTeam: { alignItems: 'center', width: 80 },
  matchBadgeAjax: { width: 48, height: 48, borderRadius: 24, backgroundColor: Ajax.red, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  matchBadgeAway: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  matchBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  matchTeamName: { fontSize: 12, fontWeight: '600', color: Ajax.text },
  matchScoreBlock: { alignItems: 'center' },
  matchScore: { fontSize: 32, fontWeight: '900', color: Ajax.text },
  matchStatus: { fontSize: 12, color: Ajax.textLight, marginTop: 2 },
  matchInfo: { borderTopWidth: 1, borderColor: Ajax.border, paddingTop: 10, gap: 4 },
  matchInfoText: { fontSize: 12, color: Ajax.textLight },
  matchNewsTitle: { fontSize: 16, fontWeight: '800', color: Ajax.text, marginTop: 8 },
  matchNewsItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  matchNewsTime: { backgroundColor: Ajax.red, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 44, alignItems: 'center' },
  matchNewsTimeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  matchNewsText: { flex: 1, fontSize: 14, color: Ajax.text, fontWeight: '500' },
  settingsLabel: { fontSize: 13, fontWeight: '700', color: Ajax.textLight, marginBottom: 6, marginTop: 12 },
  settingsInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 15, color: Ajax.text, borderWidth: 1.5, borderColor: Ajax.border },
  settingsToggle: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderWidth: 1.5, borderColor: Ajax.border },
  settingsToggleLabel: { fontSize: 15, color: Ajax.text, fontWeight: '500' },
  saveBtn: { backgroundColor: Ajax.red, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  photoBtn: { marginBottom: 8 },
  photoPlaceholder: { height: 160, backgroundColor: Ajax.lightRed, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Ajax.red, borderStyle: 'dashed' },
  photoPreview: { height: 160, borderRadius: 12, width: '100%' },
  photoIcon: { fontSize: 36, marginBottom: 8 },
  photoText: { fontSize: 14, color: Ajax.red, fontWeight: '600' },
  formLabel: { fontSize: 13, fontWeight: '700', color: Ajax.textLight, marginBottom: 6, marginTop: 12 },
  formInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 15, color: Ajax.text, borderWidth: 1.5, borderColor: Ajax.border },
  formTextarea: { height: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: Ajax.textLight, textAlign: 'right', marginTop: 4 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1.5, borderColor: Ajax.border },
  catChipActive: { backgroundColor: Ajax.red, borderColor: Ajax.red },
  catChipText: { fontSize: 13, color: Ajax.text, fontWeight: '600' },
  catChipTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: Ajax.red, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 24, marginBottom: 16 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  header: { backgroundColor: Ajax.red, alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontSize: 28, fontWeight: '800', color: Ajax.red },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Ajax.red },
  avatarEditText: { fontSize: 14 },
  name: { fontSize: 22, fontWeight: '800', color: '#fff' },
  username: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginTop: 10 },
  badgeText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -1, borderRadius: 12, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorder: { borderRightWidth: 1, borderColor: Ajax.border },
  statValue: { fontSize: 22, fontWeight: '900', color: Ajax.red },
  statLabel: { fontSize: 11, color: Ajax.textLight, marginTop: 2 },
  menuSection: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: Ajax.border },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: Ajax.lightRed, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Ajax.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBadge: { backgroundColor: Ajax.red, minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  menuBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 22, color: Ajax.textLight },
  brandSection: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  brandLogo: { width: 56, height: 56, borderRadius: 16, backgroundColor: Ajax.red, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  brandLogoText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  brandTitle: { fontSize: 16, fontWeight: '800', color: Ajax.text, marginBottom: 4 },
  brandSub: { fontSize: 12, color: Ajax.textLight, textAlign: 'center', marginBottom: 12, lineHeight: 18 },
  hubBtn: { backgroundColor: Ajax.red, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  hubBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  logoutBtn: { marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Ajax.red, alignItems: 'center' },
  logoutText: { color: Ajax.red, fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 11, color: Ajax.textLight, marginBottom: 32 },
  hubLogo: { width: 72, height: 72, borderRadius: 20, backgroundColor: Ajax.red, justifyContent: 'center', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  hubLogoText: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  hubTitle: { fontSize: 22, fontWeight: '900', color: Ajax.text, marginBottom: 4 },
  hubSub: { fontSize: 13, color: Ajax.textLight, marginBottom: 24 },
  hubCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, width: '100%', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  hubCardIcon: { fontSize: 28, marginRight: 12 },
  hubCardInfo: { flex: 1 },
  hubCardTitle: { fontSize: 15, fontWeight: '700', color: Ajax.text },
  hubCardSub: { fontSize: 12, color: Ajax.textLight, marginTop: 2 },
});