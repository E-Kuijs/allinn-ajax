import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ScrollView, Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ajax } from '@/constants/theme';

const { width: W } = Dimensions.get('window');

export default function WelcomeScreen() {
  const [agreed, setAgreed] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Gouden gloed achtergrond */}
      <View style={styles.heroBg}>
        <View style={styles.glowCircle} />
        <Image
          source={require('@/assets/images/logo-media.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.heroTagline}>Het ultieme platform voor Ajax supporters</Text>
      </View>

      {/* Welkomst tekst */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>Welkom bij ALL-INN AJAX</Text>
        <Text style={styles.welcomeText}>
          Dé plek voor echte Ajax fans. Blijf op de hoogte van het laatste nieuws,
          handel op de marktplaats, chat met medesupporters en mis geen enkele wedstrijd.
        </Text>
      </View>

      {/* Features */}
      {[
        { icon: '📰', title: 'Ajax Nieuws', sub: 'Altijd als eerste op de hoogte' },
        { icon: '🏷️', title: 'Marktplaats', sub: 'Koop en verkoop Ajax merchandise' },
        { icon: '💬', title: 'Fan Chat', sub: 'Praat met duizenden supporters' },
        { icon: '⚽', title: 'Wedstrijden', sub: 'Uitslagen, standen en stats' },
      ].map((f, i) => (
        <View key={i} style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>{f.icon}</Text>
          </View>
          <View style={styles.featureInfo}>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureSub}>{f.sub}</Text>
          </View>
        </View>
      ))}

      {/* Akkoord checkbox */}
      <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(!agreed)}>
        <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
          {agreed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.agreeText}>
          Ik ga akkoord met de <Text style={styles.agreeLink}>gebruiksvoorwaarden</Text> van ALL-INN MEDIA
        </Text>
      </TouchableOpacity>

      {/* Aan de slag knop */}
      <TouchableOpacity
        style={[styles.startBtn, !agreed && styles.startBtnDisabled]}
        onPress={() => agreed && router.replace('/(tabs)/' as any)}
        disabled={!agreed}
      >
        <Text style={styles.startBtnText}>🚀 Aan de slag!</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Image
          source={require('@/assets/images/logo-media.png')}
          style={styles.footerLogo}
          resizeMode="contain"
        />
        <Text style={styles.footerText}>ALL-INN MEDIA © 2026 · E. Kuijs</Text>
        <Text style={styles.footerSub}>EST. 2026 ⭐⭐⭐</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { alignItems: 'center', paddingBottom: 40 },
  heroBg: {
    width: '100%', alignItems: 'center',
    paddingVertical: 40, backgroundColor: '#0a0a0a',
    overflow: 'hidden',
  },
  glowCircle: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, backgroundColor: 'rgba(210,0,28,0.15)',
    top: 20,
  },
  logo: { width: W * 0.65, height: W * 0.65, marginBottom: 16 },
  heroTagline: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', paddingHorizontal: 32,
  },
  welcomeCard: {
    backgroundColor: '#1a1a1a', margin: 16, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: '#C9A84C',
    width: W - 32,
  },
  welcomeTitle: {
    fontSize: 20, fontWeight: '900', color: '#C9A84C',
    marginBottom: 8, textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14, color: 'rgba(255,255,255,0.75)',
    lineHeight: 22, textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 14, marginHorizontal: 16, marginBottom: 8,
    width: W - 32, borderLeftWidth: 3, borderLeftColor: Ajax.red,
  },
  featureIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#2a2a2a', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  featureIconText: { fontSize: 22 },
  featureInfo: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  featureSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  agreeRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 20, marginBottom: 12,
    width: W - 32,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#C9A84C',
    marginRight: 10, justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: '#C9A84C' },
  checkmark: { fontSize: 14, fontWeight: '900', color: '#000' },
  agreeText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 18 },
  agreeLink: { color: '#C9A84C', fontWeight: '700' },
  startBtn: {
    backgroundColor: Ajax.red, width: W - 32,
    padding: 16, borderRadius: 16, alignItems: 'center',
    marginBottom: 24,
  },
  startBtnDisabled: { backgroundColor: '#333' },
  startBtnText: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  footer: { alignItems: 'center', gap: 6 },
  footerLogo: { width: 60, height: 60 },
  footerText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  footerSub: { fontSize: 11, color: '#C9A84C' },
});