// Vul hier je familie-e-mails in.
// 1) vipDeveloperEmails = e-mails met VIP DEVELOPER rol.
// 2) vipSpecialEmails = familie/vrienden mails met VIP SPECIAL MEMBER.

export const vipDeveloperEmails: string[] = [
  'all.inn.media.contact@gmail.com',
  'edwin3771@gmail.com',
];

// Backward compatible alias (eerste developer-mail)
export const vipDeveloperEmail = vipDeveloperEmails[0] ?? '';

export const vipSpecialEmails: string[] = [
  'all.inn.media.contact@gmail.com',
  '',
  'esmeekuijs@icloud.com',
  'aadje3@gmail.com',
  'arthur.vandertol@hotmail.nl',
  'annemarievdhaterd@hotmail.com',
  'dennisdevries5@gmail.com',
  'smitty1972.rs@gmail.com',
  '',
  'frankvannoort@hotmail.com',
  'haroldvanoss76@gmail.com',
  'sylvestervandijk99@hotmail.com',
  'djurre.manders@hotmail.com',
  'patries25-79@hotmail.com',
  'entaink187@gmail.com',
  'arnosmits1974@hotmail.com',
  'dorregeestralphenfiona@gmail.com',
  '',
  '',
  '',
  '',
];

// Ondersteunt specifieke accounts waarbij alleen het deel voor @ vastligt.
// Hiermee blijven speciale VIP/golden stars werken, ook bij variatie in domein.
const vipSpecialEmailPrefixPatterns: string[] = [
  'patries2611@',
  'ikhaatrood@',
  'ajaxvak428@',
];

// Vaste persoonlijke premium/testmail voor familie en vrienden.
// Houd deze inhoud gelijk aan scripts/premium-email.ps1.
export const premiumFamilyEmailSubject = 'ALL-INN AJAX premium update en testuitnodiging';

export const premiumFamilyEmailBody = `Hoi,

Dit is het cadeautje dat ik bedoelde: een gratis premium abonnement op ALL-INN AJAX.

Jullie horen bij de eerste mensen aan wie ik de app wil laten zien, juist omdat jullie mijn directe vrienden zijn. Daarom hebben jullie nu als eersten toegang en mogen jullie hem ook als eersten testen.

Ik bouw de app stap voor stap verder uit. Op dit moment zijn onder andere de HUB-richting, media-inzendingen en beheerverbeteringen doorgevoerd. Het zou mij echt helpen als jullie de app kort willen testen en laten weten of alles goed werkt.

Waar we vooral graag feedback op krijgen:
- inloggen en algemeen gebruik
- media en supporters-inzendingen
- snelheid en duidelijkheid van de app
- dingen die niet goed werken of beter kunnen

Reageren mag gewoon op deze mail met je bevindingen, fouten of ideeen. Ook als het maar iets kleins is.

Alvast bedankt dat jullie mij hiermee willen helpen.

Groet,
Edwin Kuijs
ALL-INN MEDIA`;

export const premiumFamilyEmailHtmlBody = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.6;font-size:15px;">
  <p>Hoi,</p>
  <p>Dit is het cadeautje dat ik bedoelde: een gratis premium abonnement op <strong>ALL-INN AJAX</strong>.</p>
  <p>Jullie horen bij de eerste mensen aan wie ik de app wil laten zien, juist omdat jullie mijn directe vrienden zijn. Daarom hebben jullie nu als eersten toegang en mogen jullie hem ook als eersten testen.</p>
  <p>Ik bouw de app stap voor stap verder uit. Op dit moment zijn onder andere de HUB-richting, media-inzendingen en beheerverbeteringen doorgevoerd. Het zou mij echt helpen als jullie de app kort willen testen en laten weten of alles goed werkt.</p>
  <p><strong>Waar we vooral graag feedback op krijgen:</strong></p>
  <ul>
    <li>inloggen en algemeen gebruik</li>
    <li>media en supporters-inzendingen</li>
    <li>snelheid en duidelijkheid van de app</li>
    <li>dingen die niet goed werken of beter kunnen</li>
  </ul>
  <p>Reageren mag gewoon op deze mail met je bevindingen, fouten of ideeen. Ook als het maar iets kleins is.</p>
  <p>Alvast bedankt dat jullie mij hiermee willen helpen.</p>
  <p>Groet,<br />Edwin Kuijs<br />ALL-INN MEDIA</p>
</div>`;

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function isUsableFamilyEmail(input: string) {
  const normalized = normalizeEmail(input);
  return (
    normalized.includes('@') &&
    normalized.includes('.') &&
    !normalized.endsWith('@getemailviprole.com')
  );
}

export function getFamilyEmailValues(): string[] {
  const all = [...vipDeveloperEmails, ...vipSpecialEmails];
  const unique = new Set(
    all
      .map((v) => normalizeEmail(v))
      .filter((v) => isUsableFamilyEmail(v))
  );
  return [...unique];
}

export function getEmailVipRole(email?: string | null): 'developer' | 'special' | 'none' {
  const normalized = normalizeEmail(email ?? '');
  if (!normalized) return 'none';

  const developerSet = new Set(
    vipDeveloperEmails
      .map((value) => normalizeEmail(value))
      .filter((value) => isUsableFamilyEmail(value))
  );
  if (developerSet.has(normalized)) return 'developer';

  const prefixMatch = vipSpecialEmailPrefixPatterns.some((prefix) => normalized.startsWith(prefix));
  if (prefixMatch) return 'special';

  const specials = vipSpecialEmails
    .map((value) => normalizeEmail(value))
    .filter((value) => isUsableFamilyEmail(value));
  return specials.includes(normalized) ? 'special' : 'none';
}
