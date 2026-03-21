export type AppManifestStatus = 'live' | 'building' | 'planned';

export type AppLine = 'core' | 'club' | 'finance';

export type AppVertical =
  | 'media'
  | 'sports'
  | 'finance'
  | 'home'
  | 'agenda'
  | 'teens'
  | 'kids';

export type AppManifest = {
  id: string;
  tenantSlug: string;
  line: AppLine;
  vertical: AppVertical;
  name: string;
  shortName: string;
  subtitle: string;
  status: AppManifestStatus;
  launchPriority: number;
  packageName: string;
  repoOwner: string;
  repoName: string;
  expoOwner: string;
  contactEmail: string;
  supabaseProjectRef?: string;
  sharedCore?: boolean;
  scheme?: string;
  deepLink?: string;
  storeUrl?: string;
  androidClosedTestUrl?: string;
  androidApkUrl?: string;
  iosUrl?: string;
  webUrl?: string;
  platformNote?: string;
  note?: string;
};

export const PRIMARY_APP_LINE = {
  githubOwner: 'Kuijs-Services',
  expoOwner: 'all-inn-media-ajax',
  supabaseProjectRef: 'yehfisrddqmsklrsqpzr',
  contactEmail: 'all.inn.media.contact@gmail.com',
  personalChatgptEmail: 'edwin3771@gmail.com',
} as const;

export const APP_MANIFESTS: AppManifest[] = [
  {
    id: 'ajax',
    tenantSlug: 'all-inn-ajax',
    line: 'core',
    vertical: 'media',
    name: 'ALL-INN AJAX',
    shortName: 'Ajax',
    subtitle: 'Fan community app',
    status: 'live',
    launchPriority: 0,
    packageName: 'com.allinmedia.allinajax',
    repoOwner: PRIMARY_APP_LINE.githubOwner,
    repoName: 'ALL-INN-AJAX',
    expoOwner: PRIMARY_APP_LINE.expoOwner,
    contactEmail: PRIMARY_APP_LINE.contactEmail,
    supabaseProjectRef: PRIMARY_APP_LINE.supabaseProjectRef,
    sharedCore: true,
    scheme: 'ajaxnieuws',
    deepLink: 'ajaxnieuws://welcome',
    storeUrl: 'https://play.google.com/store/apps/details?id=com.allinmedia.allinajax',
    androidClosedTestUrl: 'https://play.google.com/apps/test/com.allinmedia.allinajax/14',
    androidApkUrl: 'https://expo.dev/artifacts/eas/8s1oX5fWwMtYVBmHXZrb8Y.apk',
    platformNote: 'Android via gesloten test of APK. iPhone-route volgt later via TestFlight of web.',
    note: 'Huidige hoofdapp en technische basis voor de volgende clubs.',
  },
  {
    id: 'az',
    tenantSlug: 'all-inn-az',
    line: 'club',
    vertical: 'sports',
    name: 'ALL-INN AZ',
    shortName: 'AZ',
    subtitle: 'Volgende club-app in de rij',
    status: 'building',
    launchPriority: 1,
    packageName: 'com.allinmedia.allinnaz',
    repoOwner: PRIMARY_APP_LINE.githubOwner,
    repoName: 'ALL-INN-AZ',
    expoOwner: PRIMARY_APP_LINE.expoOwner,
    contactEmail: PRIMARY_APP_LINE.contactEmail,
    scheme: 'allinnaz',
    note: 'Eerste club na Ajax in de rolloutvolgorde.',
  },
  {
    id: 'heerenveen',
    tenantSlug: 'all-inn-heerenveen',
    line: 'club',
    vertical: 'sports',
    name: 'ALL-INN HEERENVEEN',
    shortName: 'Heerenveen',
    subtitle: 'Sc Heerenveen community app',
    status: 'planned',
    launchPriority: 2,
    packageName: 'com.allinmedia.allinnheerenveen',
    repoOwner: PRIMARY_APP_LINE.githubOwner,
    repoName: 'ALL-INN-HEERENVEEN',
    expoOwner: PRIMARY_APP_LINE.expoOwner,
    contactEmail: PRIMARY_APP_LINE.contactEmail,
    scheme: 'allinnheerenveen',
  },
  {
    id: 'sparta',
    tenantSlug: 'all-inn-sparta',
    line: 'club',
    vertical: 'sports',
    name: 'ALL-INN SPARTA',
    shortName: 'Sparta',
    subtitle: 'Rotterdam community app',
    status: 'planned',
    launchPriority: 3,
    packageName: 'com.allinmedia.allinnsparta',
    repoOwner: PRIMARY_APP_LINE.githubOwner,
    repoName: 'ALL-INN-SPARTA',
    expoOwner: PRIMARY_APP_LINE.expoOwner,
    contactEmail: PRIMARY_APP_LINE.contactEmail,
    scheme: 'allinnsparta',
  },
  {
    id: 'excelsior',
    tenantSlug: 'all-inn-excelsior',
    line: 'club',
    vertical: 'sports',
    name: 'ALL-INN EXCELSIOR',
    shortName: 'Excelsior',
    subtitle: 'Compacte club-app op dezelfde core',
    status: 'planned',
    launchPriority: 4,
    packageName: 'com.allinmedia.allinnexcelsior',
    repoOwner: PRIMARY_APP_LINE.githubOwner,
    repoName: 'ALL-INN-EXCELSIOR',
    expoOwner: PRIMARY_APP_LINE.expoOwner,
    contactEmail: PRIMARY_APP_LINE.contactEmail,
    scheme: 'allinnexcelsior',
  },
  {
    id: 'telstar',
    tenantSlug: 'all-inn-telstar',
    line: 'club',
    vertical: 'sports',
    name: 'ALL-INN TELSTAR',
    shortName: 'Telstar',
    subtitle: 'Snelle white-label uitbreiding',
    status: 'planned',
    launchPriority: 5,
    packageName: 'com.allinmedia.allinntelstar',
    repoOwner: PRIMARY_APP_LINE.githubOwner,
    repoName: 'ALL-INN-TELSTAR',
    expoOwner: PRIMARY_APP_LINE.expoOwner,
    contactEmail: PRIMARY_APP_LINE.contactEmail,
    scheme: 'allinntelstar',
  },
  {
    id: 'boekhouding',
    tenantSlug: 'all-inn-boekhouding',
    line: 'finance',
    vertical: 'finance',
    name: 'ALL-INN BOEKHOUDING',
    shortName: 'Boekhouding',
    subtitle: 'Eenvoudige administratie voor zzp en kleine teams',
    status: 'building',
    launchPriority: 6,
    packageName: 'com.allinmedia.allinnboekhouding',
    repoOwner: PRIMARY_APP_LINE.githubOwner,
    repoName: 'ALL-INN-BOEKHOUDING',
    expoOwner: PRIMARY_APP_LINE.expoOwner,
    contactEmail: PRIMARY_APP_LINE.contactEmail,
    scheme: 'allinnboekhouding',
    note: 'Belangrijke finance-lijn voor administratie, omzet en overzicht.',
  },
];

export const CURRENT_APP_MANIFEST = APP_MANIFESTS.find((app) => app.id === 'ajax')!;

export function getAppManifest(appId: string) {
  return APP_MANIFESTS.find((app) => app.id === appId) ?? null;
}

export function getAppManifestsByVertical(vertical: AppVertical) {
  return APP_MANIFESTS.filter((app) => app.vertical === vertical).sort(
    (left, right) => left.launchPriority - right.launchPriority
  );
}

export function getSportsRolloutManifests() {
  return getAppManifestsByVertical('sports');
}

export function getFinanceRolloutManifests() {
  return getAppManifestsByVertical('finance');
}
