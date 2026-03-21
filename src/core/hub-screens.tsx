import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Ajax } from '@/constants/theme';
import type { HubAppLink, HubCategory } from '@/src/core/hub-catalog';

export type HubQuickAction = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  href: '/(tabs)/index' | '/(tabs)/media' | '/(tabs)/profile' | '/(tabs)/owner' | '/hub/media' | '/hub/admin';
  tone?: 'red' | 'gold' | 'dark';
};

export type HubStatusCard = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  tone?: 'red' | 'gold' | 'dark';
};

export type HubUpdateCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  actionLabel?: string;
  href?: '/(tabs)/index' | '/(tabs)/media' | '/(tabs)/profile' | '/(tabs)/owner' | '/hub/media' | '/hub/admin';
};

export type HubBusinessCard = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  tone?: 'red' | 'gold' | 'dark';
};

type HubHomeScreenContentProps = {
  categories: HubCategory[];
  isDeveloper: boolean;
  quickActions?: HubQuickAction[];
  statusCards?: HubStatusCard[];
  businessCards?: HubBusinessCard[];
  updateCards?: HubUpdateCard[];
  heroTitle?: string;
  heroBody?: string;
  statusEyebrow?: string;
  statusTitle?: string;
};

type HubCategoryScreenContentProps = {
  category: HubCategory | null;
};

type HubAdminScreenContentProps = {
  categories: HubCategory[];
  canManage: boolean;
};

type ManagedHubApp = HubAppLink & {
  categoryTitle: string;
};

export async function openHubAppLink(
  app?: HubAppLink,
  deepLink?: string,
  storeUrl?: string,
  missingMessage = 'Voor deze app is nog geen werkende link ingesteld.'
) {
  if (deepLink) {
    const canOpenDeepLink = await Linking.canOpenURL(deepLink);
    if (canOpenDeepLink) {
      await Linking.openURL(deepLink);
      return;
    }
  }

  const platformUrl =
    Platform.OS === 'android'
      ? app?.androidClosedTestUrl || app?.androidApkUrl || storeUrl
      : Platform.OS === 'ios'
        ? app?.iosUrl || app?.webUrl
        : app?.webUrl || storeUrl;

  if (platformUrl) {
    const canOpenStore = await Linking.canOpenURL(platformUrl);
    if (canOpenStore) {
      await Linking.openURL(platformUrl);
      return;
    }
  }

  const platformSpecificMessage =
    Platform.OS === 'ios' && app?.platformNote
      ? app.platformNote
      : missingMessage;

  Alert.alert('Nog niet beschikbaar', platformSpecificMessage);
}

function getHubDownloadActionLabel(app: HubAppLink) {
  if (Platform.OS === 'android') {
    if (app.androidClosedTestUrl) return 'Android test';
    if (app.androidApkUrl) return 'APK';
  }

  if (Platform.OS === 'ios') {
    if (app.iosUrl) return 'Open iPhone';
    if (app.webUrl) return 'Open web';
    return 'iPhone later';
  }

  if (app.webUrl) return 'Open web';
  return 'Download';
}

export function HubHomeScreenContent({
  categories,
  isDeveloper,
  quickActions = [],
  statusCards = [],
  businessCards = [],
  updateCards = [],
  heroTitle = 'Welkom in jouw All-Inn ecosysteem',
  heroBody = 'Open een categorie en ga direct naar de apps die je gebouwd hebt. Alles centraal, strak en premium.',
  statusEyebrow = 'STATUS',
  statusTitle = 'Wat speelt er nu',
}: HubHomeScreenContentProps) {
  const allApps = categories.flatMap((category) =>
    category.apps.map((app) => ({
      ...app,
      categoryId: category.id,
      categoryTitle: category.title,
      categoryAccent: category.accent,
    }))
  );

  return (
    <ScrollView style={homeStyles.container} contentContainerStyle={homeStyles.content}>
      <View style={homeStyles.hero}>
        <Text style={homeStyles.heroEyebrow}>ALL-INN HUB</Text>
        <Text style={homeStyles.heroTitle}>{heroTitle}</Text>
        <Text style={homeStyles.heroBody}>{heroBody}</Text>
      </View>

      {!isDeveloper && allApps.length ? (
        <View style={homeStyles.storefrontSection}>
          <View style={homeStyles.storefrontHeader}>
            <Text style={homeStyles.storefrontEyebrow}>ONTDEK MEER APPS</Text>
            <Text style={homeStyles.storefrontTitle}>Alle apps op een plek</Text>
            <Text style={homeStyles.storefrontBody}>
              Gebruik je al een All-Inn app? Dan is dit je centrale plek om ook de andere apps te ontdekken en snel te openen of te downloaden.
            </Text>
          </View>

          <View style={homeStyles.storefrontList}>
            {allApps.map((app) => (
              <View key={`${app.categoryId}-${app.id}`} style={homeStyles.storefrontCard}>
                <View style={homeStyles.storefrontMetaRow}>
                  <View
                    style={[
                      homeStyles.storefrontBadge,
                      { backgroundColor: app.categoryAccent },
                    ]}
                  >
                    <Text style={homeStyles.storefrontBadgeText}>{app.categoryTitle}</Text>
                  </View>
                </View>
                <Text style={homeStyles.storefrontCardTitle}>{app.name}</Text>
                <Text style={homeStyles.storefrontCardSubtitle}>{app.subtitle}</Text>
                <View style={homeStyles.storefrontActions}>
                  <TouchableOpacity
                    style={homeStyles.storefrontPrimaryBtn}
                    onPress={() => void openHubAppLink(app, app.deepLink, app.storeUrl)}
                  >
                    <Text style={homeStyles.storefrontPrimaryBtnText}>Open app</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={homeStyles.storefrontSecondaryBtn}
                    onPress={() => void openHubAppLink(app, undefined, app.storeUrl)}
                  >
                    <Text style={homeStyles.storefrontSecondaryBtnText}>{getHubDownloadActionLabel(app)}</Text>
                  </TouchableOpacity>
                </View>
                {app.platformNote ? <Text style={homeStyles.storefrontCardNote}>{app.platformNote}</Text> : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {statusCards.length ? (
        <View style={homeStyles.statusSection}>
          <View style={homeStyles.statusHeader}>
            <Text style={homeStyles.statusEyebrow}>{statusEyebrow}</Text>
            <Text style={homeStyles.statusTitle}>{statusTitle}</Text>
          </View>

          <View style={homeStyles.statusGrid}>
            {statusCards.map((card) => {
              const toneStyle =
                card.tone === 'gold'
                  ? homeStyles.statusCardGold
                  : card.tone === 'dark'
                    ? homeStyles.statusCardDark
                    : homeStyles.statusCardRed;

              return (
                <View key={card.id} style={[homeStyles.statusCard, toneStyle]}>
                  <Text style={homeStyles.statusCardTitle}>{card.title}</Text>
                  <Text style={homeStyles.statusCardValue}>{card.value}</Text>
                  <Text style={homeStyles.statusCardSubtitle}>{card.subtitle}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {businessCards.length ? (
        <View style={homeStyles.businessSection}>
          <View style={homeStyles.businessHeader}>
            <Text style={homeStyles.businessEyebrow}>BUSINESS DASHBOARD</Text>
            <Text style={homeStyles.businessTitle}>Omzet en groei in 1 oogopslag</Text>
            <Text style={homeStyles.businessBody}>
              Hier zie je de belangrijkste zakelijke signalen van je app, zodat je sneller kunt sturen op promotie, prijs en activiteit.
            </Text>
          </View>

          <View style={homeStyles.businessGrid}>
            {businessCards.map((card) => {
              const toneStyle =
                card.tone === 'gold'
                  ? homeStyles.businessCardGold
                  : card.tone === 'dark'
                    ? homeStyles.businessCardDark
                    : homeStyles.businessCardRed;

              return (
                <View key={card.id} style={[homeStyles.businessCard, toneStyle]}>
                  <Text style={homeStyles.businessCardTitle}>{card.title}</Text>
                  <Text style={homeStyles.businessCardValue}>{card.value}</Text>
                  <Text style={homeStyles.businessCardSubtitle}>{card.subtitle}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {quickActions.length ? (
        <View style={homeStyles.quickSection}>
          <View style={homeStyles.quickHeader}>
            <Text style={homeStyles.quickEyebrow}>SNELLE ACTIES</Text>
            <Text style={homeStyles.quickTitle}>Cockpit voor dagelijks gebruik</Text>
            <Text style={homeStyles.quickBody}>
              Open direct de schermen die je het vaakst nodig hebt, zonder eerst door categorieen te bladeren.
            </Text>
          </View>

          <View style={homeStyles.quickGrid}>
            {quickActions.map((action) => {
              const toneStyle =
                action.tone === 'gold'
                  ? homeStyles.quickCardGold
                  : action.tone === 'dark'
                    ? homeStyles.quickCardDark
                    : homeStyles.quickCardRed;

              return (
                <TouchableOpacity
                  key={action.id}
                  style={[homeStyles.quickCard, toneStyle]}
                  onPress={() => router.push(action.href)}
                >
                  <View style={homeStyles.quickIconWrap}>
                    <MaterialCommunityIcons name={action.icon} size={18} color="#FFFFFF" />
                  </View>
                  <Text style={homeStyles.quickCardTitle}>{action.title}</Text>
                  <Text style={homeStyles.quickCardSubtitle}>{action.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {updateCards.length ? (
        <View style={homeStyles.updatesSection}>
          {updateCards.map((card) => (
            <View key={card.id} style={homeStyles.updateCard}>
              <Text style={homeStyles.updateEyebrow}>{card.eyebrow}</Text>
              <Text style={homeStyles.updateTitle}>{card.title}</Text>
              <Text style={homeStyles.updateBody}>{card.body}</Text>
              {card.actionLabel && card.href
                ? (() => {
                    const href = card.href;
                    return (
                      <TouchableOpacity style={homeStyles.updateActionBtn} onPress={() => router.push(href)}>
                        <Text style={homeStyles.updateActionBtnText}>{card.actionLabel}</Text>
                      </TouchableOpacity>
                    );
                  })()
                : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={homeStyles.grid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              homeStyles.tile,
              { backgroundColor: category.background, borderColor: category.accent },
            ]}
            onPress={() => router.push({ pathname: '/hub/[category]', params: { category: category.id } })}
          >
            <Text style={homeStyles.tileTitle}>{category.title}</Text>
            <Text style={homeStyles.tileSubtitle}>{category.subtitle}</Text>
            <Text style={homeStyles.tileCount}>{category.apps.length} app(s)</Text>
          </TouchableOpacity>
        ))}

        {isDeveloper ? (
          <TouchableOpacity style={[homeStyles.tile, homeStyles.adminTile]} onPress={() => router.push('/hub/admin')}>
            <Text style={homeStyles.tileTitle}>BEHEERDER</Text>
            <Text style={homeStyles.tileSubtitle}>Alle apps centraal aanpassen en updaten</Text>
            <Text style={homeStyles.tileCount}>Alleen voor jou</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

export function HubCategoryScreenContent({ category }: HubCategoryScreenContentProps) {
  if (!category) {
    return (
      <View style={categoryStyles.emptyWrap}>
        <Text style={categoryStyles.emptyTitle}>Categorie niet gevonden</Text>
        <TouchableOpacity style={categoryStyles.backBtn} onPress={() => router.replace('/hub')}>
          <Text style={categoryStyles.backBtnText}>Terug naar HUB</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={categoryStyles.container} contentContainerStyle={categoryStyles.content}>
      <View
        style={[
          categoryStyles.headerCard,
          { borderColor: category.accent, backgroundColor: category.background },
        ]}
      >
        <Text style={categoryStyles.headerTitle}>{category.title}</Text>
        <Text style={categoryStyles.headerSubtitle}>{category.subtitle}</Text>
      </View>

      {category.apps.length ? (
        <View style={categoryStyles.list}>
          {category.apps.map((app) => (
            <View key={app.id} style={categoryStyles.appCard}>
              <Text style={categoryStyles.appTitle}>{app.name}</Text>
              <Text style={categoryStyles.appSubtitle}>{app.subtitle}</Text>
              <View style={categoryStyles.actionsRow}>
                <TouchableOpacity
                  style={categoryStyles.primaryBtn}
                  onPress={() => void openHubAppLink(app, app.deepLink, app.storeUrl)}
                >
                  <Text style={categoryStyles.primaryBtnText}>Open app</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={categoryStyles.secondaryBtn}
                  onPress={() => void openHubAppLink(app, undefined, app.storeUrl)}
                >
                  <Text style={categoryStyles.secondaryBtnText}>{getHubDownloadActionLabel(app)}</Text>
                </TouchableOpacity>
              </View>
              {app.platformNote ? <Text style={categoryStyles.appNote}>{app.platformNote}</Text> : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={categoryStyles.emptyBlock}>
          <Text style={categoryStyles.emptyBlockText}>Nog geen apps gekoppeld aan deze categorie.</Text>
        </View>
      )}
    </ScrollView>
  );
}

export function HubAdminScreenContent({ categories, canManage }: HubAdminScreenContentProps) {
  if (!canManage) {
    return <Redirect href="/hub" />;
  }

  const managedApps: ManagedHubApp[] = categories.flatMap((category) =>
    category.apps.map((app) => ({
      ...app,
      categoryTitle: category.title,
    }))
  );

  return (
    <ScrollView style={adminStyles.container} contentContainerStyle={adminStyles.content}>
      <View style={adminStyles.hero}>
        <Text style={adminStyles.heroTitle}>Beheerder Center</Text>
        <Text style={adminStyles.heroBody}>
          Alleen jij ziet dit scherm. Vanuit hier open je snel je apps om updates en aanpassingen te doen.
        </Text>
      </View>

      <TouchableOpacity style={adminStyles.quickBtn} onPress={() => router.push('/(tabs)/owner')}>
        <Text style={adminStyles.quickBtnText}>Open Ajax Beheer-tab</Text>
      </TouchableOpacity>

      <View style={adminStyles.list}>
        {managedApps.length ? (
          managedApps.map((app) => (
            <View key={`${app.categoryTitle}-${app.id}`} style={adminStyles.appCard}>
              <Text style={adminStyles.appCategory}>{app.categoryTitle}</Text>
              <Text style={adminStyles.appTitle}>{app.name}</Text>
              <Text style={adminStyles.appSubtitle}>{app.subtitle}</Text>
              <View style={adminStyles.actionsRow}>
                <TouchableOpacity
                  style={adminStyles.primaryBtn}
                  onPress={() => void openHubAppLink(app, app.deepLink, app.storeUrl, 'Voor deze app is nog geen werkende link ingesteld.')}
                >
                  <Text style={adminStyles.primaryBtnText}>Open app</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={adminStyles.secondaryBtn}
                  onPress={() => void openHubAppLink(app, undefined, app.storeUrl, 'Voor deze app is nog geen werkende link ingesteld.')}
                >
                  <Text style={adminStyles.secondaryBtnText}>{getHubDownloadActionLabel(app)}</Text>
                </TouchableOpacity>
              </View>
              {app.platformNote ? <Text style={adminStyles.appNote}>{app.platformNote}</Text> : null}
            </View>
          ))
        ) : (
          <View style={adminStyles.emptyBlock}>
            <Text style={adminStyles.emptyText}>Nog geen apps gekoppeld. Voeg ze toe in `src/core/hub-catalog.ts`.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060606',
  },
  content: {
    padding: 16,
    paddingBottom: 26,
    gap: 14,
  },
  hero: {
    borderRadius: 16,
    backgroundColor: '#0B0B0B',
    borderWidth: 1.5,
    borderColor: '#FFD700',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
    shadowColor: '#FFD700',
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  heroEyebrow: {
    color: '#FFD700',
    fontWeight: '900',
    letterSpacing: 0.8,
    fontSize: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 24,
    lineHeight: 30,
  },
  heroBody: {
    color: '#F0F0F0',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 20,
  },
  grid: {
    gap: 10,
  },
  statusSection: {
    borderRadius: 16,
    borderWidth: 1.3,
    borderColor: '#7C1A1A',
    backgroundColor: '#0C0C0C',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  statusHeader: {
    gap: 4,
  },
  statusEyebrow: {
    color: '#FFD6D6',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusCard: {
    width: '48.7%',
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 5,
  },
  statusCardRed: {
    borderColor: '#D2001C',
    backgroundColor: '#2A0D0D',
  },
  statusCardGold: {
    borderColor: '#FFD700',
    backgroundColor: '#2F2400',
  },
  statusCardDark: {
    borderColor: '#5A5A5A',
    backgroundColor: '#121212',
  },
  statusCardTitle: {
    color: '#FFE6E6',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusCardValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  statusCardSubtitle: {
    color: '#F0D6D6',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  businessSection: {
    borderRadius: 16,
    borderWidth: 1.3,
    borderColor: '#B98A00',
    backgroundColor: '#141008',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  businessHeader: {
    gap: 4,
  },
  businessEyebrow: {
    color: '#FFD369',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  businessTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  businessBody: {
    color: '#F6E5B5',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  businessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  businessCard: {
    width: '48.7%',
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 5,
  },
  businessCardRed: {
    borderColor: '#D2001C',
    backgroundColor: '#321012',
  },
  businessCardGold: {
    borderColor: '#FFD700',
    backgroundColor: '#332700',
  },
  businessCardDark: {
    borderColor: '#6A6A6A',
    backgroundColor: '#171717',
  },
  businessCardTitle: {
    color: '#FFF0C7',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  businessCardValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  businessCardSubtitle: {
    color: '#F3DFA7',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  storefrontSection: {
    borderRadius: 16,
    borderWidth: 1.3,
    borderColor: '#FFD700',
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  storefrontHeader: {
    gap: 4,
  },
  storefrontEyebrow: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  storefrontTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  storefrontBody: {
    color: '#F0F0F0',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  storefrontList: {
    gap: 10,
  },
  storefrontCard: {
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#2D2D2D',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 7,
  },
  storefrontMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  storefrontBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  storefrontBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  storefrontCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  storefrontCardSubtitle: {
    color: '#DADADA',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  storefrontCardNote: {
    color: 'rgba(255,215,0,0.88)',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  storefrontActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  storefrontPrimaryBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storefrontPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  storefrontSecondaryBtn: {
    width: 110,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#FFD700',
    backgroundColor: '#272100',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storefrontSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  quickSection: {
    borderRadius: 16,
    borderWidth: 1.3,
    borderColor: '#9C1A1A',
    backgroundColor: '#120808',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  quickHeader: {
    gap: 4,
  },
  quickEyebrow: {
    color: '#FFB3B3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  quickTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  quickBody: {
    color: '#F0D6D6',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickCard: {
    width: '48.7%',
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  quickCardRed: {
    borderColor: '#D2001C',
    backgroundColor: '#B00000',
  },
  quickCardGold: {
    borderColor: '#FFD700',
    backgroundColor: '#6A4B00',
  },
  quickCardDark: {
    borderColor: '#5A5A5A',
    backgroundColor: '#111111',
  },
  quickIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  quickCardSubtitle: {
    color: '#FFF3F3',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  updatesSection: {
    gap: 10,
  },
  updateCard: {
    borderRadius: 16,
    borderWidth: 1.3,
    borderColor: '#FFD700',
    backgroundColor: '#121212',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  updateEyebrow: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  updateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  updateBody: {
    color: '#F0F0F0',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  updateActionBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#FFD700',
    backgroundColor: '#6A4B00',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  updateActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  tile: {
    borderRadius: 14,
    borderWidth: 1.3,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 3,
  },
  adminTile: {
    backgroundColor: '#0A0A0A',
    borderColor: Ajax.red,
  },
  tileTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '900',
  },
  tileSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  tileCount: {
    color: '#FFD6D6',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
});

const categoryStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  headerCard: {
    borderRadius: 14,
    borderWidth: 1.3,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 3,
  },
  headerTitle: { color: '#FFD700', fontSize: 21, fontWeight: '900' },
  headerSubtitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  list: { gap: 10 },
  appCard: {
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  appTitle: { color: '#111111', fontSize: 17, fontWeight: '900' },
  appSubtitle: { color: '#555555', fontSize: 12, fontWeight: '700' },
  appNote: { color: '#A35F00', fontSize: 11, fontWeight: '700', lineHeight: 16 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  secondaryBtn: {
    width: 86,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  secondaryBtnText: { color: Ajax.red, fontSize: 13, fontWeight: '900' },
  emptyWrap: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  backBtn: {
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '900' },
  emptyBlock: {
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#FFD700',
    backgroundColor: '#111111',
    padding: 12,
  },
  emptyBlockText: { color: '#FFE7A8', fontSize: 12, fontWeight: '700' },
});

const adminStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  content: { padding: 16, paddingBottom: 26, gap: 10 },
  hero: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  heroTitle: { color: '#FFD700', fontSize: 22, fontWeight: '900' },
  heroBody: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  quickBtn: {
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  quickBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  list: { gap: 9 },
  appCard: {
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#FFD700',
    backgroundColor: '#141414',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  appCategory: { color: '#FFCA7A', fontSize: 11, fontWeight: '800' },
  appTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  appSubtitle: { color: '#D4D4D4', fontSize: 12, fontWeight: '700' },
  appNote: { color: '#FFD980', fontSize: 11, fontWeight: '700', lineHeight: 16 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  secondaryBtn: {
    width: 78,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#FFD700',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  secondaryBtnText: { color: '#FFD700', fontSize: 12, fontWeight: '900' },
  emptyBlock: {
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#FFD700',
    backgroundColor: '#111111',
    padding: 12,
  },
  emptyText: { color: '#FFE7A8', fontSize: 12, fontWeight: '700' },
});
