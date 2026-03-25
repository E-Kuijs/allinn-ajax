import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ajax } from '@/constants/theme';
const FIXED_AJAX_MONTHLY_PRICE = 1.49;

function toEur(amount: number): string {
  return `EUR ${amount.toFixed(2).replace('.', ',')}`;
}

export default function PremiumPricingScreen() {
  const monthlyPrice = FIXED_AJAX_MONTHLY_PRICE;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.cardHero}>
        <Text style={styles.heroTitle}>Premium uitleg en prijzen</Text>
        <Text style={styles.heroBody}>
          ALL-INN AJAX is gebouwd door supporters. Met Premium help je de app door te ontwikkelen en steun je extra
          sfeer en community-acties. We houden het bewust simpel met een vast maandbedrag.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vaste maandprijs</Text>
        <Text style={styles.line}>- Premium per maand: {toEur(monthlyPrice)}</Text>
        <Text style={styles.subText}>
          We kiezen nu bewust voor een duidelijk maandmodel. Dat houdt het voor supporters overzichtelijk en geeft een
          stabieler inkomstenpatroon voor de verdere opbouw van de app.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wat krijg je met Premium</Text>
        <Text style={styles.line}>- Volledige toegang tot chat en marktplaats functies</Text>
        <Text style={styles.line}>- Volledige toegang tot media links en extra content</Text>
        <Text style={styles.line}>- Doorlopende verbeteringen en nieuwe fan functies</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transparantie</Text>
        <Text style={styles.subText}>
          Voor ALL-INN AJAX gebruiken we nu een vaste prijs van EUR 1,49 per maand.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
    gap: 12,
  },
  cardHero: {
    borderWidth: 1.5,
    borderColor: Ajax.red,
    borderRadius: 14,
    backgroundColor: '#111111',
    padding: 14,
    gap: 8,
  },
  heroTitle: {
    color: '#FFD369',
    fontSize: 20,
    fontWeight: '900',
  },
  heroBody: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1.2,
    borderColor: Ajax.red,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  line: {
    color: '#222222',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  subText: {
    marginTop: 4,
    color: '#555555',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
