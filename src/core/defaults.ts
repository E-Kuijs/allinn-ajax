import { AppContent, AppSettings } from '@/src/core/types';

export const defaultSettings: AppSettings = {
  launchDate: '2026-03-06',
  launchWindowDays: 14,
  monthlyPriceEur: 3.24,
  discount6mPct: 15,
  discount12mPct: 20,
  discountLifetimePct: 30,
  firstPaidMemberLimit: 500,
  freeDailyChatLimit: 5,
  scorePopupPremiumOnly: true,
  marketplaceReadOnlyForFree: true,
};

export const defaultContent: AppContent = {
  welcomeTitle: 'Welkom bij ALL-INN AJAX',
  welcomeText:
    'De plek voor echte Ajax fans. Nieuws, chat, marktplaats en wedstrijden op een plek.',
  welcomeBannerUrl: null,
  welcomeCornerImageUrl: null,
  welcomeInfoLinkUrl: '',
  paymentPortalUrl: '',
  lotteryWinnerName: '',
  lotteryWinnerInterview: '',
  lotteryWinnerPhotoUrl: null,
  lotteryWinnerVideoUrl: null,
  termsVersion: 'v1.0.0',
  termsText:
    'Door een account aan te maken ga je akkoord met de gebruiksvoorwaarden van ALL-INN AJAX en ALL-INN MEDIA. Gebruik van de app is op eigen risico; voor directe of indirecte schade wordt geen aansprakelijkheid aanvaard binnen de grenzen van de wet. Alle teksten, logo\'s en content blijven auteursrechtelijk beschermd en mogen niet zonder toestemming worden gekopieerd of verspreid. Winactievoorwaarden: deze winactie is gratis voor alle geregistreerde gebruikers; er is geen aankoop of betaling nodig om deel te nemen; de winnaar wordt willekeurig gekozen uit alle geregistreerde gebruikers; deze winactie wordt georganiseerd door All-Inn Media en staat los van Google Play; deelname aan een eventueel interview of foto met de winnaar is vrijwillig. Betalingen of transacties die via externe apps of wallets worden gedaan zijn volledig de verantwoordelijkheid van de betrokken gebruikers. All-Inn Media is geen partij in deze transacties.',
  webshopFsideUrl: 'https://www.f-side.nl',
  webshopAfcaUrl: 'https://www.afca.nl',
  webshopAjaxUrl: 'https://shop.ajax.nl',
  tuneInUrl: 'https://tunein.com',
  arenaMapUrl: 'https://maps.google.com/?q=Johan+Cruijff+ArenA',
  cafesMapUrl: 'https://maps.google.com/?q=cafes+near+Johan+Cruijff+ArenA',
  restaurantsMapUrl: 'https://maps.google.com/?q=restaurants+near+Johan+Cruijff+ArenA',
  stadiumRouteUrl: 'https://maps.google.com/?daddr=Johan+Cruijff+ArenA',
};

export const defaultProfanityWords = [
  'kanker',
  'tering',
  'tyfus',
  'hoer',
  'kut',
  'lul',
  'mongool',
];
