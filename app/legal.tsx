import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';

export default function LegalScreen() {
  const { content } = useAppContext();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.version}>Versie: {content.termsVersion}</Text>
        <Text style={styles.title}>Gebruiksvoorwaarden</Text>
        <Text style={styles.text}>{content.termsText}</Text>
        <Text style={styles.text}>
          Door de app te gebruiken ga je akkoord met onze communityregels, moderatiebeleid en
          privacyverwerking voor account, chat en marktplaatsfunctionaliteit.
        </Text>
        <Text style={styles.subTitle}>Aansprakelijkheid</Text>
        <Text style={styles.text}>
          ALL-INN AJAX en ALL-INN MEDIA bieden deze app zonder garanties op continue beschikbaarheid
          of foutloze werking. Gebruik van functies en informatie is op eigen verantwoordelijkheid.
        </Text>
        <Text style={styles.subTitle}>Externe betalingen</Text>
        <Text style={styles.text}>
          Betalingen of transacties die via externe apps of wallets worden gedaan zijn volledig de
          verantwoordelijkheid van de betrokken gebruikers. All-Inn Media is geen partij in deze transacties.
        </Text>
        <Text style={styles.subTitle}>Copyright</Text>
        <Text style={styles.text}>
          Alle merkuitingen, teksten, beelden, logo&apos;s, ontwerpen en app-onderdelen zijn beschermd
          door auteursrecht en/of merkrecht. Hergebruik zonder schriftelijke toestemming is niet toegestaan.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Ajax.background },
  content: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Ajax.border,
    padding: 16,
    gap: 10,
  },
  version: { color: Ajax.textLight, fontSize: 12, fontWeight: '700' },
  title: { color: Ajax.text, fontSize: 20, fontWeight: '900' },
  subTitle: { color: Ajax.text, fontSize: 15, fontWeight: '800', marginTop: 6 },
  text: { color: Ajax.textLight, fontSize: 14, lineHeight: 22 },
});
