import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Ajax } from '@/constants/theme';
import { MembershipBadge } from '@/components/membership-badge';
import { useAppContext } from '@/src/core/app-context';

export default function AccountScreen() {
  const { profile, avatarUri, entitlements, headerText, saveHeaderText } = useAppContext();
  const [text, setText] = useState(headerText);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(headerText);
  }, [headerText]);

  const initials = useMemo(() => {
    const source = profile?.displayName?.trim() || 'Ajax Fan';
    return source.slice(0, 2).toUpperCase();
  }, [profile?.displayName]);

  const onSaveHeader = async () => {
    setSaving(true);
    const result = await saveHeaderText(text);
    setSaving(false);
    if (!result.ok) {
      Alert.alert('Opslaan mislukt', result.message ?? 'Onbekende fout.');
      return;
    }
    Alert.alert('Opgeslagen', 'Headertekst is bijgewerkt.');
  };

  const openSafetySettings = async () => {
    const ok = await Linking.canOpenURL('app-settings:');
    if (!ok) {
      Alert.alert('Niet beschikbaar', 'Veiligheidsinstellingen konden niet worden geopend.');
      return;
    }
    await Linking.openSettings();
  };

  const openTerms = async () => {
    await Linking.openURL('https://e-kuijs.github.io/all-inn-legal/terms.html');
  };

  const openPrivacy = async () => {
    await Linking.openURL('https://e-kuijs.github.io/all-inn-legal/privacy.html');
  };

  const openCommunityRules = () => {
    Alert.alert(
      'Community regels',
      '• Behandel andere supporters met respect\n• Geen spam of advertenties\n• Geen haatdragende berichten\n• Geen illegale verkoop'
    );
  };

  const requestDeleteAccount = async () => {
    await Linking.openURL('https://e-kuijs.github.io/all-inn-legal/delete.html');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIdentityRow}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.name}>{profile?.displayName ?? 'Ajax Fan'}</Text>
            <Text style={styles.user}>{profile?.username ?? '@ajaxfan'}</Text>
          </View>
        </View>
        <View style={styles.heroBadgeWrap}>
          <MembershipBadge
            label={entitlements.badgeLabel}
            starsColor={entitlements.starsColor}
            inBanner
            showMotto={false}
            brandMark="ALL-INN MEDIA"
          />
        </View>
      </View>

      <View style={[styles.card, styles.headerCard]}>
        <Text style={styles.cardTitle}>Headertekst bovenin</Text>
        <Text style={styles.helper}>Deze tekst zie je linksboven in het zwarte blok.</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Bijv. WELKOM BIJ ALL-INN AJAX"
          placeholderTextColor="#888"
          maxLength={64}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void onSaveHeader()} disabled={saving}>
          <Text style={styles.primaryBtnText}>{saving ? 'Opslaan...' : 'Header opslaan'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.legalCard]}>
        <Text style={styles.cardTitle}>Veiligheid & Juridisch</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => void openSafetySettings()}>
          <Text style={styles.secondaryBtnText}>Veiligheidsinstellingen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => void openTerms()}>
          <Text style={styles.secondaryBtnText}>Licentie & Terms</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => void openPrivacy()}>
          <Text style={styles.secondaryBtnText}>Privacy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={openCommunityRules}>
          <Text style={styles.secondaryBtnText}>Community regels</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => void requestDeleteAccount()}>
          <Text style={styles.secondaryBtnText}>Delete account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => void requestDeleteAccount()}>
          <Text style={styles.deleteBtnText}>Verzoek gebruiker te verwijderen</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  content: { padding: 16, gap: 12, paddingBottom: 18 },
  hero: {
    borderRadius: 16,
    backgroundColor: Ajax.red,
    alignItems: 'stretch',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 3,
  },
  heroIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBadgeWrap: {
    marginTop: -4,
    marginBottom: -2,
    alignSelf: 'flex-end',
  },
  heroTextWrap: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: Ajax.red, fontSize: 20, fontWeight: '900' },
  name: { color: '#fff', fontSize: 18, fontWeight: '900' },
  user: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Ajax.red,
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
  },
  headerCard: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  legalCard: {
    paddingTop: 14,
    paddingBottom: 24,
  },
  cardTitle: { color: Ajax.text, fontSize: 16, fontWeight: '800' },
  helper: { color: Ajax.textLight, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: Ajax.red,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: Ajax.text,
  },
  primaryBtn: {
    borderRadius: 10,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    paddingVertical: 11,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Ajax.red,
    alignItems: 'center',
    paddingVertical: 11,
  },
  secondaryBtnText: { color: Ajax.red, fontWeight: '700' },
  deleteBtn: {
    borderRadius: 10,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    paddingVertical: 11,
  },
  deleteBtnText: { color: '#fff', fontWeight: '800' },
});

