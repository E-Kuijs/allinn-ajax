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

export default function LoginScreen() {
  const { loading, session, signIn } = useAppContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)/welcome' as any);
    }
  }, [session]);

  const onLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Vul alles in', 'E-mail en wachtwoord zijn verplicht.');
      return;
    }

    setBusy(true);
    const result = await signIn({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (!result.ok) {
      Alert.alert('Inloggen mislukt', result.message ?? 'Controleer je gegevens.');
      return;
    }

    router.replace('/(tabs)/welcome' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Ajax.red} />
      </View>
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
          <Image
            source={require('@/assets/images/logo-ajax.png')}
            style={styles.authLogo}
            resizeMode="contain"
          />
          <Text style={styles.formTitle}>Inloggen</Text>
          <Text style={styles.formSub}>Welkom terug Ajax fan</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="naam@email.nl"
            placeholderTextColor="#888"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Wachtwoord</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#888"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
            >
              <Text style={styles.eyeText}>👁</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primary, busy && styles.disabled]}
          onPress={() => void onLogin()}
          disabled={busy}
        >
          <Text style={styles.primaryText}>{busy ? 'Even geduld...' : 'Inloggen'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => router.push('/register' as any)}
        >
          <Text style={styles.switchText}>Nog geen account? Registreren</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/welcome' as any)}
        >
          <Text style={styles.backBtnText}>← Terug naar welkom</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  formContent: {
    paddingBottom: 30,
    paddingTop: 20,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  authLogo: {
    width: 94,
    height: 94,
    marginBottom: 6,
  },
  formTitle: {
    color: '#C9A84C',
    fontSize: 25,
    fontWeight: '900',
  },
  formSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
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
  label: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
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
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  eyeText: {
    fontSize: 16,
  },
  primary: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Ajax.red,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.7,
  },
  switchBtn: {
    marginTop: 4,
    alignItems: 'center',
  },
  switchText: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '700',
  },
  backBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
  backBtnText: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 12,
  },
});