import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';
import { supabaseRuntimeDebug } from '@/src/core/supabaseClient';

type Mode = 'landing' | 'login' | 'register';

export default function WelcomeScreen() {
  const { loading, session, signIn, signUp, resendSignupConfirmation, content } = useAppContext();

  const [mode, setMode] = useState<Mode>('landing');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegPass2, setShowRegPass2] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)/welcome' as any);
    }
  }, [session]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Ajax.red} />
      </View>
    );
  }

  const onLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('Vul alles in', 'E-mail en wachtwoord zijn verplicht.');
      return;
    }

    setBusy(true);
    const result = await signIn({ email: loginEmail, password: loginPassword });
    setBusy(false);

    if (!result.ok) {
      Alert.alert('Inloggen mislukt', result.message ?? 'Controleer je gegevens.');
      return;
    }

    router.replace('/(tabs)/welcome' as any);
  };

  const onRegister = async () => {
    if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      Alert.alert('Vul alles in', 'Alle velden zijn verplicht.');
      return;
    }

    if (regPassword !== regPassword2) {
      Alert.alert('Controle', 'Wachtwoorden komen niet overeen.');
      return;
    }

    if (!agreed) {
      Alert.alert('Akkoord vereist', 'Je moet akkoord gaan met de gebruiksvoorwaarden.');
      return;
    }

    setBusy(true);
    const result = await signUp({
      email: regEmail,
      password: regPassword,
      displayName: regName,
      username: regUsername.startsWith('@') ? regUsername : `@${regUsername}`,
      acceptedTermsVersion: content.termsVersion,
    });
    setBusy(false);

    if (!result.ok) {
      Alert.alert('Registratie mislukt', result.message ?? 'Probeer opnieuw.');
      return;
    }

    Alert.alert('Gelukt', result.message ?? 'Account aangemaakt.', [
      {
        text: 'OK',
        onPress: () => setMode('login'),
      },
    ]);
  };

  const onResendConfirmation = async () => {
    const email = mode === 'login' ? loginEmail : regEmail;
    if (!email.trim()) {
      Alert.alert('E-mail nodig', 'Vul eerst het e-mailadres in waarvoor je de bevestigingsmail opnieuw wilt sturen.');
      return;
    }

    setBusy(true);
    const result = await resendSignupConfirmation(email);
    setBusy(false);

    if (!result.ok) {
      Alert.alert('Opnieuw versturen mislukt', result.message ?? 'Probeer opnieuw.');
      return;
    }

    Alert.alert('Bevestigingsmail verstuurd', result.message ?? 'Controleer ook je spammap.');
  };

  const bannerSource = content.welcomeBannerUrl
    ? { uri: content.welcomeBannerUrl }
    : require('@/assets/images/logo-media.png');

  const cornerSource = content.welcomeCornerImageUrl
    ? { uri: content.welcomeCornerImageUrl }
    : require('@/assets/images/logo-ajax.png');

  if (mode === 'landing') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image source={bannerSource} style={styles.banner} resizeMode="contain" />
          <Text style={styles.title}>{content.welcomeTitle}</Text>
          <Text style={styles.subtitle}>{content.welcomeText}</Text>
          <Image source={cornerSource} style={styles.cornerImage} resizeMode="cover" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Wat je krijgt</Text>
          <Text style={styles.item}>📰 Ajax nieuws en updates</Text>
          <Text style={styles.item}>💬 Fan chat met moderatie</Text>
          <Text style={styles.item}>🏷️ Marktplaats voor Ajax merchandise</Text>
          <Text style={styles.item}>⚽ Wedstrijden + agenda + route</Text>
        </View>

        <TouchableOpacity style={styles.primary} onPress={() => router.push('/login' as any)}>
          <Text style={styles.primaryText}>Inloggen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => setMode('register')}>
          <Text style={styles.secondaryText}>Registreren</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formHeader}>
          <Image source={require('@/assets/images/logo-ajax.png')} style={styles.authLogo} resizeMode="contain" />
          <Text style={styles.formTitle}>{mode === 'login' ? 'Inloggen' : 'Registreren'}</Text>
          <Text style={styles.formSub}>Welkom terug Ajax fan</Text>
        </View>

        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Runtime Debug</Text>
          <Text style={styles.debugLine}>URL ref: {supabaseRuntimeDebug.urlProjectRef ?? 'onbekend'}</Text>
          <Text style={styles.debugLine}>KEY ref: {supabaseRuntimeDebug.keyProjectRef ?? 'onbekend'}</Text>
          <Text style={styles.debugLine}>Host: {supabaseRuntimeDebug.host ?? 'onbekend'}</Text>
        </View>

        <View style={styles.card}>
          {mode === 'register' ? (
            <>
              <Text style={styles.label}>Echte naam</Text>
              <TextInput
                style={styles.input}
                value={regName}
                onChangeText={setRegName}
                placeholder="Jouw echte naam"
                placeholderTextColor="#888"
              />

              <Text style={styles.label}>Gebruikersnaam</Text>
              <TextInput
                style={styles.input}
                value={regUsername}
                onChangeText={setRegUsername}
                placeholder="@ajaxfan"
                placeholderTextColor="#888"
                autoCapitalize="none"
              />
            </>
          ) : null}

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={mode === 'login' ? loginEmail : regEmail}
            onChangeText={mode === 'login' ? setLoginEmail : setRegEmail}
            placeholder="naam@email.nl"
            placeholderTextColor="#888"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Wachtwoord</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              value={mode === 'login' ? loginPassword : regPassword}
              onChangeText={mode === 'login' ? setLoginPassword : setRegPassword}
              placeholder="••••••••"
              placeholderTextColor="#888"
              secureTextEntry={mode === 'login' ? !showLoginPass : !showRegPass}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => (mode === 'login' ? setShowLoginPass((v) => !v) : setShowRegPass((v) => !v))}
            >
              <Text style={styles.eyeText}>👁</Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' ? (
            <>
              <Text style={styles.label}>Herhaal wachtwoord</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={regPassword2}
                  onChangeText={setRegPassword2}
                  placeholder="••••••••"
                  placeholderTextColor="#888"
                  secureTextEntry={!showRegPass2}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowRegPass2((v) => !v)}>
                  <Text style={styles.eyeText}>👁</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed((v) => !v)}>
                <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                  {agreed ? <Text style={styles.checkText}>✓</Text> : null}
                </View>
                <Text style={styles.termsText}>
                  Ik ga akkoord met de{' '}
                  <Text style={styles.linkText} onPress={() => router.push('/legal')}>
                    gebruiksvoorwaarden
                  </Text>
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <TouchableOpacity style={[styles.primary, busy && styles.disabled]} onPress={mode === 'login' ? onLogin : onRegister}>
          <Text style={styles.primaryText}>
            {busy ? 'Even geduld...' : mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.helperBtn} onPress={onResendConfirmation}>
          <Text style={styles.helperBtnText}>Bevestigingsmail opnieuw sturen</Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          Geen bevestigingsmail ontvangen? Gebruik dezelfde e-mail als waarmee het account is aangemaakt en controleer ook je spammap.
        </Text>

        <TouchableOpacity style={styles.switchBtn} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'Nog geen account? Registreren' : 'Heb je al een account? Inloggen'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => setMode('landing')}>
          <Text style={styles.backBtnText}>← Terug naar welkom</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { paddingBottom: 30 },
  hero: {
    margin: 16,
    marginTop: 30,
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2d2d2d',
    overflow: 'hidden',
  },
  banner: { width: '100%', height: 130, marginBottom: 10 },
  title: { fontSize: 27, color: '#C9A84C', fontWeight: '900', marginBottom: 6 },
  subtitle: { color: 'rgba(255,255,255,0.76)', fontSize: 14, lineHeight: 22, paddingRight: 78 },
  cornerImage: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 62,
    height: 62,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9A84C',
  },
  card: {
    backgroundColor: '#151515',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
    marginBottom: 12,
  },
  cardHeading: { color: '#C9A84C', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  item: { color: 'rgba(255,255,255,0.78)', fontSize: 14, marginBottom: 8 },
  primary: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Ajax.red,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondary: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C9A84C',
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryText: { color: '#C9A84C', fontSize: 16, fontWeight: '900' },
  formContent: { paddingBottom: 30, paddingTop: 20 },
  formHeader: { alignItems: 'center', marginBottom: 10 },
  authLogo: { width: 94, height: 94, marginBottom: 6 },
  formTitle: { color: '#C9A84C', fontSize: 25, fontWeight: '900' },
  formSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  debugCard: {
    backgroundColor: '#101010',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    padding: 12,
    marginBottom: 12,
  },
  debugTitle: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  debugLine: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginBottom: 2,
  },
  label: { color: '#C9A84C', fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  passwordInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  eyeText: { fontSize: 16 },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C9A84C',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: { backgroundColor: '#C9A84C' },
  checkText: { color: '#000', fontSize: 13, fontWeight: '900' },
  termsText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, flex: 1 },
  linkText: { color: '#C9A84C', fontWeight: '700' },
  disabled: { opacity: 0.7 },
  helperBtn: {
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    backgroundColor: '#171717',
    paddingVertical: 13,
    alignItems: 'center',
  },
  helperBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  helperText: {
    marginHorizontal: 20,
    marginBottom: 10,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  switchBtn: { marginTop: 4, alignItems: 'center' },
  switchText: { color: '#C9A84C', fontSize: 13, fontWeight: '700' },
  backBtn: { marginTop: 10, alignItems: 'center' },
  backBtnText: { color: 'rgba(255,255,255,0.56)', fontSize: 12 },
});
