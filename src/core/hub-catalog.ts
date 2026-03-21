import {
  CURRENT_APP_MANIFEST,
  getFinanceRolloutManifests,
  getSportsRolloutManifests,
  type AppLine,
  type AppManifest,
} from '@/src/core/app-manifests';

export type HubAppLink = {
  id: string;
  name: string;
  subtitle: string;
  status: AppManifest['status'];
  line: AppLine;
  repoOwner: string;
  repoName: string;
  expoOwner: string;
  contactEmail: string;
  sharedCore?: boolean;
  deepLink?: string;
  storeUrl?: string;
  androidClosedTestUrl?: string;
  androidApkUrl?: string;
  iosUrl?: string;
  webUrl?: string;
  platformNote?: string;
};

export type HubCategory = {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  background: string;
  apps: HubAppLink[];
};

function toHubAppLink(app: AppManifest): HubAppLink {
  return {
    id: app.id,
    name: app.name,
    subtitle: app.subtitle,
    status: app.status,
    line: app.line,
    repoOwner: app.repoOwner,
    repoName: app.repoName,
    expoOwner: app.expoOwner,
    contactEmail: app.contactEmail,
    sharedCore: app.sharedCore,
    deepLink: app.deepLink,
    storeUrl: app.storeUrl,
    androidClosedTestUrl: app.androidClosedTestUrl,
    androidApkUrl: app.androidApkUrl,
    iosUrl: app.iosUrl,
    webUrl: app.webUrl,
    platformNote: app.platformNote,
  };
}

export const CURRENT_HUB_APP: HubAppLink = toHubAppLink(CURRENT_APP_MANIFEST);

const SPORTS_HUB_APPS: HubAppLink[] = getSportsRolloutManifests().map(toHubAppLink);
const FINANCE_HUB_APPS: HubAppLink[] = getFinanceRolloutManifests().map(toHubAppLink);

export function createHubCategories(currentApp: HubAppLink = CURRENT_HUB_APP): HubCategory[] {
  return [
    {
      id: 'media',
      title: 'ALL-INN MEDIA',
      subtitle: 'Branding, creators en community',
      accent: '#E60000',
      background: '#8B0000',
      apps: [currentApp],
    },
    {
      id: 'finance',
      title: 'ALL-INN FINANCE',
      subtitle: 'Betalen, budget en transacties',
      accent: '#4FA3FF',
      background: '#102A52',
      apps: FINANCE_HUB_APPS,
    },
    {
      id: 'home',
      title: 'ALL-INN HOME',
      subtitle: 'Gezin, overzicht en routines',
      accent: '#2BB673',
      background: '#1E6F5C',
      apps: [],
    },
    {
      id: 'agenda',
      title: 'ALL-INN AGENDA',
      subtitle: 'Planning, afspraken en reminders',
      accent: '#536DFE',
      background: '#283593',
      apps: [],
    },
    {
      id: 'teens',
      title: 'ALL-INN TEENS',
      subtitle: 'Jeugd, tech en moderne tools',
      accent: '#00B0FF',
      background: '#5E35B1',
      apps: [],
    },
    {
      id: 'kids',
      title: 'ALL-INN KIDS',
      subtitle: 'Veilig, leerzaam en speels',
      accent: '#4FC3F7',
      background: '#1565C0',
      apps: [],
    },
    {
      id: 'sports',
      title: 'ALL-INN SPORTS',
      subtitle: 'Wedstrijden, scores en teams',
      accent: '#FF8F00',
      background: '#C62828',
      apps: SPORTS_HUB_APPS,
    },
  ];
}

export const HUB_CATEGORIES: HubCategory[] = createHubCategories();

export function getHubCategory(categoryId: string | null | undefined) {
  if (!categoryId) return null;
  return HUB_CATEGORIES.find((item) => item.id === categoryId) ?? null;
}
