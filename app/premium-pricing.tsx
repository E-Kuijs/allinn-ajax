import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';
import { supabase } from '@/src/core/supabaseClient';

function toEur(amount: number): string {
  return `EUR ${amount.toFixed(2).replace('.', ',')}`;
}

export default function PremiumPricingScreen() {
  const { settings } = useAppContext();

  const fallbackMonthlyPrice = useMemo(() => settings.monthlyPriceEur, [settings.monthlyPriceEur]);
  const [monthlyPrice, setMonthlyPrice] = useState(fallbackMonthlyPrice);

  useEffect(() => {
    setMonthlyPrice(fallbackMonthlyPrice);
  }, [fallbackMonthlyPrice]);

  useEffect(() => {
    let active = true;
    const loadPlanPrices = async () => {
      const res = await supabase
        .from('subscription_plans')
        .select('code,price_eur')
        .eq('code', 'PREMIUM_MONTH')
        .maybeSingle();

      if (!active || res.error || !res.data) return;

      const price = Number((res.data as { price_eur: number | null }).price_eur ?? 0);
      if (!Number.isFinite(price) || price <= 0) return;
      setMonthlyPrice(price);
    };

    void loadPlanPrices();
    return () => {
      active = false;
    };
  }, [fallbackMonthlyPrice]);

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
        <Text style={styles.line}>- Extra winactie-updates en community-acties in de app</Text>
        <Text style={styles.line}>- Doorlopende verbeteringen en nieuwe fan functies</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transparantie</Text>
        <Text style={styles.subText}>
          Prijzen kunnen later worden aangepast. De actuele maandprijs in dit scherm wordt uit de app-instellingen en
          plannen gehaald.
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
