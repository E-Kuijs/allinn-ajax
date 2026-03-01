import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ScrollView, Dimensions, TextInput,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { router } from 'expo-router';
import { Ajax } from '@/constants/theme';

const { width: W } = Dimensions.get('window');

type Screen = 'landing' | 'login' | 'register';

export default function WelcomeScreen() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [agreed, setAgreed] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('12m');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const handleLogin = () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('Vul alle velden in', 'E-mail en wachtwoord zijn verplicht.');
      return;
    }
    setLoginLoading(true);
    setTimeout(() => {
      setLoginLoading(false);
      router.replace('/(tabs)' as any);
    }, 1200);
  };

  const handleRegister = () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regUsername.trim()) {
      Alert.alert('Vul alle velden in', 'Alle velden zijn verplicht.');
      return;
    }
    if (regPassword !== regPassword2) {
      Alert.alert('Wachtwoorden komen niet overeen');
      return;
    }
    if (!agreed) {
      Alert.alert('Akkoord vereist', 'Ga akkoord met de gebruiksvoorwaarden.');
      return;
    }
    setRegLoading(true);
    setTimeout(() => {
      setRegLoading(false);
      Alert.alert(
        isPremium ? '🏆 Premium account aangemaakt!' : '✅ Account aangemaakt!',
        isPremium
          ? 'Welkom bij ALL-INN AJAX Premium! Je hebt toegang tot alle functies.'
          : 'Welkom! Je hebt een gratis account. Upgrade naar Premium voor alle functies.',
        [{ text: 'Aan de slag!', onPress: () => router.replace('/(tabs)' as any) }]
      );
    }, 1400);
  };

  // === LANDING ===
  if (screen === 'landing') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBg}>
          <View style={styles.glowRed} />
          <View style={styles.glowGold} />
          <Image
            source={require('@/assets/images/logo-ajax.png')}
            style={styles.ajaxLogoTop}
            resizeMode="contain"
          />
          <Image source={require('@/assets/images/logo-media.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.heroTagline}>Het ultieme platform voor Ajax supporters</Text>
        </View>

        <View style={styles.welcomeCard}>
          <Image source={require('@/assets/images/logo-ajax.png')} style={styles.ajaxLogo} resizeMode="contain" />
          <Text style={styles.welcomeTitle}>Welkom bij ALL-INN AJAX</Text>
          <Text style={styles.welcomeText}>
            Dé plek voor echte Ajax fans. Blijf op de hoogte van het laatste nieuws,
            handel op de marktplaats, chat met medesupporters en mis geen enkele wedstrijd.
          </Text>
        </View>

        {[
          { icon: '📰', title: 'Ajax Nieuws', sub: 'Altijd als eerste op de hoogte' },
          { icon: '🏷️', title: 'Marktplaats', sub: 'Koop en verkoop Ajax merchandise' },
          { icon: '💬', title: 'Fan Chat', sub: 'Praat met duizenden supporters' },
          { icon: '⚽', title: 'Wedstrijden', sub: 'Live scores, stats en uitslagen' },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={styles.featureIcon}><Text style={styles.featureIconText}>{f.icon}</Text></View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureSub}>{f.sub}</Text>
            </View>
            <Text style={styles.featureChevron}>›</Text>
          </View>
        ))}

        {/* Early bird banner */}
        <View style={styles.earlyBird}>
          <Text style={styles.earlyBirdEmoji}>🔥</Text>
          <View style={styles.earlyBirdInfo}>
            <Text style={styles.earlyBirdTitle}>Early Bird — Eerste 500 leden!</Text>
            <Text style={styles.earlyBirdSub}>Registreer nu en krijg 50% korting op Premium</Text>
          </View>
          <View style={styles.earlyBirdBadge}>
            <Text style={styles.earlyBirdCount}>347</Text>
            <Text style={styles.earlyBirdLeft}>/ 500</Text>
          </View>
        </View>

        {/* Premium banner */}
        <View style={styles.premiumBanner}>
          <Text style={styles.premiumIcon}>🏆</Text>
          <View style={styles.premiumInfo}>
            <Text style={styles.premiumTitle}>ALL-INN AJAX Premium</Text>
            <Text style={styles.premiumSub}>Onbeperkt berichten · Live stats · Geen advertenties</Text>
          </View>
          <View>
            <Text style={styles.premiumOldPrice}>€2,99/mnd</Text>
            <Text style={styles.premiumPrice}>€1,49/mnd</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={() => setScreen('login')}>
          <Text style={styles.loginBtnText}>🔑 Inloggen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerBtn} onPress={() => setScreen('register')}>
          <Text style={styles.registerBtnText}>✨ Registreren</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ALL-INN MEDIA © 2026 · E. Kuijs</Text>
          <Text style={styles.footerStar}>⭐⭐⭐ EST. 2026</Text>
        </View>
      </ScrollView>
    );
  }

  // === LOGIN ===
  if (screen === 'login') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.authContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.authHeader}>
            <Image source={require('@/assets/images/logo-ajax.png')} style={styles.authLogo} resizeMode="contain" />
            <Text style={styles.authTitle}>Inloggen</Text>
            <Text style={styles.authSub}>Welkom terug Ajax fan!</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formLabel}>E-mailadres</Text>
            <TextInput
              style={styles.formInput}
              placeholder="jouw@email.nl"
              placeholderTextColor="#666"
              value={loginEmail}
              onChangeText={setLoginEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.formLabel}>Wachtwoord</Text>
            <TextInput
              style={styles.formInput}
              placeholder="••••••••"
              placeholderTextColor="#666"
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Wachtwoord vergeten?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loginLoading && styles.btnLoading]}
            onPress={handleLogin}
            disabled={loginLoading}
          >
            <Text style={styles.loginBtnText}>{loginLoading ? '⏳ Inloggen...' : '🔑 Inloggen'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchBtn} onPress={() => setScreen('register')}>
            <Text style={styles.switchText}>Nog geen account? <Text style={styles.switchLink}>Registreer hier</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('landing')}>
            <Text style={styles.backBtnText}>← Terug</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // === REGISTREREN ===
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.authContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.authHeader}>
          <Image source={require('@/assets/images/logo-ajax.png')} style={styles.authLogo} resizeMode="contain" />
          <Text style={styles.authTitle}>Registreren</Text>
          <Text style={styles.authSub}>Maak je ALL-INN AJAX account aan</Text>
        </View>

        {/* Early bird banner */}
        <View style={styles.earlyBird}>
          <Text style={styles.earlyBirdEmoji}>🔥</Text>
          <View style={styles.earlyBirdInfo}>
            <Text style={styles.earlyBirdTitle}>Early Bird — Eerste 500 leden!</Text>
            <Text style={styles.earlyBirdSub}>Registreer nu en krijg 50% korting op Premium</Text>
          </View>
          <View style={styles.earlyBirdBadge}>
            <Text style={styles.earlyBirdCount}>347</Text>
            <Text style={styles.earlyBirdLeft}>/ 500</Text>
          </View>
        </View>

        {/* Gratis vs Premium keuze */}
        <View style={styles.planRow}>
          <TouchableOpacity
            style={[styles.planCard, !isPremium && styles.planCardActive]}
            onPress={() => setIsPremium(false)}
          >
            <Text style={styles.planIcon}>🆓</Text>
            <Text style={styles.planTitle}>Gratis</Text>
            <Text style={styles.planSub}>3 berichten/dag{'\n'}Basis functies</Text>
            <Text style={styles.planPrice}>€0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.planCard, isPremium && styles.planCardPremium]}
            onPress={() => setIsPremium(true)}
          >
            <View style={styles.planBestBadge}>
              <Text style={styles.planBestText}>BEST DEAL</Text>
            </View>
            <Text style={styles.planIcon}>🏆</Text>
            <Text style={[styles.planTitle, isPremium && styles.planTitlePremium]}>Premium</Text>
            <Text style={[styles.planSub, isPremium && styles.planSubPremium]}>Onbeperkt alles{'\n'}Live stats · No ads</Text>
            <Text style={styles.planOldPrice}>€2,99/mnd</Text>
            <Text style={[styles.planPrice, isPremium && styles.planPricePremium]}>€1,49/mnd</Text>
          </TouchableOpacity>
        </View>

        {/* Abonnement duur */}
        {isPremium && (
          <View style={styles.durationBox}>
            <Text style={styles.durationTitle}>Kies je abonnement</Text>
            {[
              { id: '3m', label: '3 maanden', priceOld: '€8,97', price: '€4,49', saving: 'Bespaar €4,48' },
              { id: '6m', label: '6 maanden', priceOld: '€17,94', price: '€7,99', saving: 'Bespaar €9,95' },
              { id: '12m', label: '1 jaar', priceOld: '€35,88', price: '€13,99', saving: 'Bespaar €21,89 🔥' },
            ].map(d => (
              <TouchableOpacity
                key={d.id}
                style={[styles.durationCard, selectedDuration === d.id && styles.durationCardActive]}
                onPress={() => setSelectedDuration(d.id)}
              >
                <View style={styles.durationLeft}>
                  <View style={[styles.durationRadio, selectedDuration === d.id && styles.durationRadioActive]}>
                    {selectedDuration === d.id && <View style={styles.durationRadioDot} />}
                  </View>
                  <View>
                    <Text style={styles.durationLabel}>{d.label}</Text>
                    <Text style={styles.durationSaving}>{d.saving}</Text>
                  </View>
                </View>
                <View style={styles.durationRight}>
                  <Text style={styles.durationOldPrice}>{d.priceOld}</Text>
                  <Text style={[styles.durationPrice, selectedDuration === d.id && styles.durationPriceActive]}>{d.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Volledige naam</Text>
          <TextInput style={styles.formInput} placeholder="Edwin Kuijs" placeholderTextColor="#666" value={regName} onChangeText={setRegName} />
          <Text style={styles.formLabel}>Gebruikersnaam</Text>
          <TextInput style={styles.formInput} placeholder="@ajax_fan" placeholderTextColor="#666" value={regUsername} onChangeText={setRegUsername} autoCapitalize="none" />
          <Text style={styles.formLabel}>E-mailadres</Text>
          <TextInput style={styles.formInput} placeholder="jouw@email.nl" placeholderTextColor="#666" value={regEmail} onChangeText={setRegEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.formLabel}>Wachtwoord</Text>
          <TextInput style={styles.formInput} placeholder="Min. 8 tekens" placeholderTextColor="#666" value={regPassword} onChangeText={setRegPassword} secureTextEntry />
          <Text style={styles.formLabel}>Wachtwoord herhalen</Text>
          <TextInput style={styles.formInput} placeholder="••••••••" placeholderTextColor="#666" value={regPassword2} onChangeText={setRegPassword2} secureTextEntry />
        </View>

        <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(!agreed)}>
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.agreeText}>
            Ik ga akkoord met de <Text style={styles.agreeLink}>gebruiksvoorwaarden</Text> van ALL-INN MEDIA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[isPremium ? styles.premiumRegBtn : styles.loginBtn, regLoading && styles.btnLoading]}
          onPress={handleRegister}
          disabled={regLoading}
        >
          <Text style={styles.loginBtnText}>
            {regLoading ? '⏳ Account aanmaken...' : isPremium ? '🏆 Premium account aanmaken' : '✨ Gratis registreren'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchBtn} onPress={() => setScreen('login')}>
          <Text style={styles.switchText}>Al een account? <Text style={styles.switchLink}>Log hier in</Text></Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('landing')}>
          <Text style={styles.backBtnText}>← Terug</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { alignItems: 'center', paddingBottom: 48 },
  authContent: { alignItems: 'center', paddingBottom: 48, paddingTop: 20 },
  heroBg: {
    width: '100%', alignItems: 'center',
    paddingTop: 60, paddingBottom: 32,
    backgroundColor: '#0a0a0a', overflow: 'hidden',
  },
  glowRed: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(210,0,28,0.18)', top: 0,
  },
  glowGold: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(201,168,76,0.10)', top: 40,
  },
  ajaxLogoTop: { width: 80, height: 80, marginBottom: 8 },
  logo: { width: W * 0.68, height: W * 0.68 },
  heroTagline: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', paddingHorizontal: 40, marginTop: 8 },
  welcomeCard: {
    backgroundColor: '#1a1a1a', marginHorizontal: 16, borderRadius: 20,
    padding: 24, borderWidth: 1.5, borderColor: '#C9A84C',
    width: W - 32, alignItems: 'center', marginBottom: 16,
  },
  ajaxLogo: { width: 90, height: 90, marginBottom: 12 },
  welcomeTitle: { fontSize: 20, fontWeight: '900', color: '#C9A84C', marginBottom: 10, textAlign: 'center', letterSpacing: 0.5 },
  welcomeText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22, textAlign: 'center' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 14,
    padding: 14, marginHorizontal: 16, marginBottom: 8,
    width: W - 32, borderLeftWidth: 3, borderLeftColor: Ajax.red,
  },
  featureIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  featureIconText: { fontSize: 22 },
  featureInfo: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  featureSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  featureChevron: { fontSize: 22, color: '#C9A84C' },
  earlyBird: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1f1200', borderRadius: 14,
    padding: 14, marginHorizontal: 16, marginBottom: 12,
    width: W - 32, borderWidth: 1.5, borderColor: '#C9A84C', marginTop: 8,
  },
  earlyBirdEmoji: { fontSize: 28, marginRight: 10 },
  earlyBirdInfo: { flex: 1 },
  earlyBirdTitle: { fontSize: 13, fontWeight: '800', color: '#C9A84C' },
  earlyBirdSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  earlyBirdBadge: { alignItems: 'center' },
  earlyBirdCount: { fontSize: 20, fontWeight: '900', color: '#C9A84C' },
  earlyBirdLeft: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 14,
    padding: 14, marginHorizontal: 16, marginBottom: 20,
    width: W - 32, borderWidth: 1.5, borderColor: '#C9A84C', marginTop: 8,
  },
  premiumIcon: { fontSize: 28, marginRight: 12 },
  premiumInfo: { flex: 1 },
  premiumTitle: { fontSize: 14, fontWeight: '800', color: '#C9A84C' },
  premiumSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  premiumOldPrice: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecorationLine: 'line-through', textAlign: 'right' },
  premiumPrice: { fontSize: 15, fontWeight: '900', color: '#C9A84C' },
  loginBtn: {
    backgroundColor: Ajax.red, width: W - 32,
    padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12,
    elevation: 6, shadowColor: Ajax.red, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10,
  },
  loginBtnText: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  registerBtn: {
    backgroundColor: '#1a1a1a', width: W - 32,
    padding: 16, borderRadius: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#C9A84C', marginBottom: 24,
  },
  registerBtnText: { fontSize: 17, fontWeight: '900', color: '#C9A84C', letterSpacing: 0.5 },
  premiumRegBtn: {
    backgroundColor: '#C9A84C', width: W - 32,
    padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12, elevation: 6,
  },
  btnLoading: { opacity: 0.7 },
  authHeader: { alignItems: 'center', marginBottom: 24, paddingTop: 20 },
  authLogo: { width: 100, height: 100, marginBottom: 12 },
  authTitle: { fontSize: 26, fontWeight: '900', color: '#C9A84C', marginBottom: 4 },
  authSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  formCard: {
    backgroundColor: '#1a1a1a', borderRadius: 16,
    padding: 20, width: W - 32, marginBottom: 16,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#C9A84C', marginBottom: 6, marginTop: 12 },
  formInput: {
    backgroundColor: '#2a2a2a', borderRadius: 12, padding: 12,
    fontSize: 15, color: '#fff', borderWidth: 1, borderColor: '#3a3a3a',
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { fontSize: 13, color: '#C9A84C', fontWeight: '600' },
  planRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 16, width: W - 32 },
  planCard: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#2a2a2a',
  },
  planCardActive: { borderColor: Ajax.red },
  planCardPremium: { borderColor: '#C9A84C', backgroundColor: '#1f1a0a' },
  planBestBadge: {
    position: 'absolute', top: -10, alignSelf: 'center',
    backgroundColor: '#C9A84C', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
  },
  planBestText: { fontSize: 10, fontWeight: '900', color: '#000' },
  planIcon: { fontSize: 28, marginBottom: 6 },
  planTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
  planTitlePremium: { color: '#C9A84C' },
  planSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 16, marginBottom: 8 },
  planSubPremium: { color: 'rgba(201,168,76,0.7)' },
  planOldPrice: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecorationLine: 'line-through', marginBottom: 2 },
  planPrice: { fontSize: 16, fontWeight: '900', color: '#fff' },
  planPricePremium: { color: '#C9A84C' },
  durationBox: {
    backgroundColor: '#1a1a1a', borderRadius: 16,
    padding: 16, width: W - 32, marginBottom: 16,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  durationTitle: { fontSize: 15, fontWeight: '800', color: '#C9A84C', marginBottom: 12 },
  durationCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1.5, borderColor: '#3a3a3a',
  },
  durationCardActive: { borderColor: '#C9A84C', backgroundColor: '#1f1a0a' },
  durationLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  durationRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#555',
    justifyContent: 'center', alignItems: 'center',
  },
  durationRadioActive: { borderColor: '#C9A84C' },
  durationRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C9A84C' },
  durationLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  durationSaving: { fontSize: 11, color: '#C9A84C', marginTop: 2 },
  durationRight: { alignItems: 'flex-end' },
  durationOldPrice: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecorationLine: 'line-through' },
  durationPrice: { fontSize: 16, fontWeight: '900', color: '#fff' },
  durationPriceActive: { color: '#C9A84C' },
  agreeRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 16, width: W - 32,
  },
  checkbox: {
    width: 26, height: 26, borderRadius: 8,
    borderWidth: 2, borderColor: '#C9A84C',
    marginRight: 12, justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: '#C9A84C' },
  checkmark: { fontSize: 15, fontWeight: '900', color: '#000' },
  agreeText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', flex: 1, lineHeight: 19 },
  agreeLink: { color: '#C9A84C', fontWeight: '700' },
  switchBtn: { marginBottom: 12 },
  switchText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  switchLink: { color: '#C9A84C', fontWeight: '700' },
  backBtn: { marginBottom: 24 },
  backBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  footer: { alignItems: 'center', gap: 4, marginTop: 8 },
  footerText: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  footerStar: { fontSize: 13, color: '#C9A84C' },
});