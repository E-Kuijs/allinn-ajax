import { useEffect, useMemo, useState } from 'react';

import { useAppContext } from '@/src/core/app-context';
import { HUB_CATEGORIES } from '@/src/core/hub-catalog';
import { HubHomeScreenContent } from '@/src/core/hub-screens';
import type { HubBusinessCard, HubQuickAction, HubStatusCard, HubUpdateCard } from '@/src/core/hub-screens';
import { supabase } from '@/src/core/supabaseClient';

export default function HubHomeScreen() {
  const { entitlements, user } = useAppContext();
  const [mySubmissionCount, setMySubmissionCount] = useState<number | null>(null);
  const [pendingSubmissionCount, setPendingSubmissionCount] = useState<number | null>(null);
  const [profileCount, setProfileCount] = useState<number | null>(null);
  const [paidMemberCount, setPaidMemberCount] = useState<number | null>(null);
  const [activeListingCount, setActiveListingCount] = useState<number | null>(null);
  const [chatTodayCount, setChatTodayCount] = useState<number | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [purchaseCountThisMonth, setPurchaseCountThisMonth] = useState<number | null>(null);
  const [revenueThisMonth, setRevenueThisMonth] = useState<number | null>(null);
  const [donationsTotal, setDonationsTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHubStatus = async () => {
      if (!user) {
        if (!cancelled) {
          setMySubmissionCount(0);
          setPendingSubmissionCount(0);
          setProfileCount(0);
          setPaidMemberCount(0);
          setActiveListingCount(0);
          setChatTodayCount(0);
          setMonthlyPrice(null);
          setPurchaseCountThisMonth(0);
          setRevenueThisMonth(0);
          setDonationsTotal(0);
        }
        return;
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const mySubmissionsRequest = supabase
        .from('supporter_media_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const pendingRequest = entitlements.isDeveloper
        ? supabase
            .from('supporter_media_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
        : supabase
            .from('supporter_media_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'pending');

      const requests = [
        mySubmissionsRequest,
        pendingRequest,
        entitlements.isDeveloper
          ? supabase.from('profiles').select('*', { count: 'exact', head: true })
          : Promise.resolve({ count: null, error: null }),
        entitlements.isDeveloper
          ? supabase
              .from('memberships')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'active')
              .neq('tier', 'FREE')
          : Promise.resolve({ count: null, error: null }),
        entitlements.isDeveloper
          ? supabase
              .from('listings')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'active')
          : Promise.resolve({ count: null, error: null }),
        entitlements.isDeveloper
          ? supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', startOfToday.toISOString())
          : Promise.resolve({ count: null, error: null }),
        entitlements.isDeveloper
          ? supabase.from('app_settings').select('monthly_price_eur').limit(1).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        entitlements.isDeveloper
          ? supabase
              .from('purchases')
              .select('amount_eur')
              .gte('purchased_at', startOfMonth.toISOString())
          : Promise.resolve({ data: null, error: null }),
        entitlements.isDeveloper
          ? supabase.from('donation_ledger').select('amount_eur')
          : Promise.resolve({ data: null, error: null }),
      ] as const;

      const [
        mySubmissionsResult,
        pendingResult,
        profilesResult,
        membershipsResult,
        listingsResult,
        chatResult,
        appSettingsResult,
        purchasesResult,
        donationsResult,
      ] = await Promise.all(requests);

      if (cancelled) return;

      setMySubmissionCount(mySubmissionsResult.count ?? 0);
      setPendingSubmissionCount(pendingResult.count ?? 0);
      setProfileCount('count' in profilesResult ? (profilesResult.count ?? null) : null);
      setPaidMemberCount('count' in membershipsResult ? (membershipsResult.count ?? null) : null);
      setActiveListingCount('count' in listingsResult ? (listingsResult.count ?? null) : null);
      setChatTodayCount('count' in chatResult ? (chatResult.count ?? null) : null);
      setMonthlyPrice(
        'data' in appSettingsResult && appSettingsResult.data?.monthly_price_eur != null
          ? Number(appSettingsResult.data.monthly_price_eur)
          : null
      );
      const purchaseRows = 'data' in purchasesResult && Array.isArray(purchasesResult.data) ? purchasesResult.data : [];
      const donationRows = 'data' in donationsResult && Array.isArray(donationsResult.data) ? donationsResult.data : [];

      setPurchaseCountThisMonth(purchaseRows.length);
      setRevenueThisMonth(
        purchaseRows.reduce((sum, row) => sum + Number(row.amount_eur ?? 0), 0)
      );
      setDonationsTotal(
        donationRows.reduce((sum, row) => sum + Number(row.amount_eur ?? 0), 0)
      );
    };

    void loadHubStatus();

    return () => {
      cancelled = true;
    };
  }, [entitlements.isDeveloper, user]);

  const totalApps = useMemo(
    () => HUB_CATEGORIES.reduce((count, category) => count + category.apps.length, 0),
    []
  );

  const heroTitle = entitlements.isDeveloper
    ? 'Promotie voor fans, overzicht voor beheer'
    : 'Jouw centrale HUB voor alle All-Inn apps';

  const heroBody = entitlements.isDeveloper
    ? 'Gebruik deze HUB als etalage voor je apps en tegelijk als snelle controlekamer om gebruik, groei, content en acties te volgen.'
    : 'Vanuit de app die je al gebruikt ontdek je hier makkelijk andere All-Inn apps, zodat de stap naar een tweede of derde app veel kleiner wordt.';

  const statusCards = useMemo<HubStatusCard[]>(
    () =>
      entitlements.isDeveloper
        ? [
            {
              id: 'profiles-live',
              title: 'Gebruikers',
              value: profileCount == null ? '...' : String(profileCount),
              subtitle: 'Aantal profielen dat nu aan deze app hangt.',
              tone: 'gold',
            },
            {
              id: 'paid-live',
              title: 'Premium actief',
              value: paidMemberCount == null ? '...' : String(paidMemberCount),
              subtitle: 'Actieve betaalde memberships die omzet kunnen dragen.',
              tone: 'red',
            },
            {
              id: 'market-live',
              title: 'Listings live',
              value: activeListingCount == null ? '...' : String(activeListingCount),
              subtitle: 'Actieve marktplaats-items als snelle graadmeter voor gebruik.',
              tone: 'dark',
            },
            {
              id: 'chat-today',
              title: 'Chat vandaag',
              value: chatTodayCount == null ? '...' : String(chatTodayCount),
              subtitle: 'Aantal chatberichten sinds vannacht als teken van activiteit.',
              tone: 'red',
            },
            {
              id: 'pending-review',
              title: 'Open beoordeling',
              value: pendingSubmissionCount == null ? '...' : String(pendingSubmissionCount),
              subtitle: 'Inzendingen die nog op goedkeuring wachten in owner-beheer.',
              tone: 'red',
            },
            {
              id: 'base-price',
              title: 'Basisprijs p/m',
              value: monthlyPrice == null ? '...' : `EUR ${monthlyPrice.toFixed(2)}`,
              subtitle: 'Huidige instapprijs, handig voor prijsbeslissingen en acties.',
              tone: 'gold',
            },
          ]
        : [
            {
              id: 'apps-live',
              title: 'Apps gekoppeld',
              value: String(totalApps),
              subtitle: 'Aantal apps dat nu al in deze HUB-structuur hangt.',
              tone: 'gold',
            },
            {
              id: 'categories-live',
              title: 'Categorieen',
              value: String(HUB_CATEGORIES.length),
              subtitle: 'Vaste HUB-vakken die we later verder kunnen vullen.',
              tone: 'dark',
            },
            {
              id: 'my-submissions',
              title: 'Mijn inzendingen',
              value: mySubmissionCount == null ? '...' : String(mySubmissionCount),
              subtitle: 'Jouw ingestuurde foto\'s en video\'s in deze app.',
              tone: 'red',
            },
            {
              id: 'pending-review',
              title: 'Nog in behandeling',
              value: pendingSubmissionCount == null ? '...' : String(pendingSubmissionCount),
              subtitle: 'Jouw inzendingen die nog wachten op controle.',
              tone: 'red',
            },
          ],
    [
      entitlements.isDeveloper,
      mySubmissionCount,
      pendingSubmissionCount,
      totalApps,
      profileCount,
      paidMemberCount,
      activeListingCount,
      chatTodayCount,
      monthlyPrice,
    ]
  );

  const businessCards = useMemo<HubBusinessCard[]>(
    () =>
      entitlements.isDeveloper
        ? [
            {
              id: 'business-fixed-monthly',
              title: 'Vaste maandinkomsten',
              value:
                monthlyPrice != null && paidMemberCount != null
                  ? `EUR ${(monthlyPrice * paidMemberCount).toFixed(2)}`
                  : '...',
              subtitle: 'Maandprijs keer actieve premiumleden als vaste terugkerende basis.',
              tone: 'gold',
            },
            {
              id: 'business-purchases',
              title: 'Aankopen deze maand',
              value: purchaseCountThisMonth == null ? '...' : String(purchaseCountThisMonth),
              subtitle: 'Aantal betaalmomenten in de huidige maand.',
              tone: 'red',
            },
            {
              id: 'business-donations',
              title: 'Donaties totaal',
              value: donationsTotal == null ? '...' : `EUR ${donationsTotal.toFixed(2)}`,
              subtitle: 'Totaal in de donatie-ledger, handig voor impact en verhaal.',
              tone: 'gold',
            },
            {
              id: 'business-premium',
              title: 'Premium ratio',
              value:
                profileCount != null && profileCount > 0 && paidMemberCount != null
                  ? `${Math.round((paidMemberCount / profileCount) * 100)}%`
                  : '...',
              subtitle: 'Hoeveel van je gebruikers nu betaald actief zijn.',
              tone: 'dark',
            },
            {
              id: 'business-arpu',
              title: 'Omzet per premium',
              value:
                revenueThisMonth != null && paidMemberCount != null && paidMemberCount > 0
                  ? `EUR ${(revenueThisMonth / paidMemberCount).toFixed(2)}`
                  : '...',
              subtitle: 'Eenvoudige stuurwaarde voor prijs en aanbod.',
              tone: 'red',
            },
            {
              id: 'business-activity',
              title: 'Community drukte',
              value:
                chatTodayCount != null && activeListingCount != null
                  ? `${chatTodayCount + activeListingCount}`
                  : '...',
              subtitle: 'Chat vandaag plus actieve listings als snelle activiteitsscore.',
              tone: 'dark',
            },
          ]
        : [],
    [
      entitlements.isDeveloper,
      revenueThisMonth,
      purchaseCountThisMonth,
      donationsTotal,
      monthlyPrice,
      profileCount,
      paidMemberCount,
      chatTodayCount,
      activeListingCount,
    ]
  );

  const quickActions = useMemo<HubQuickAction[]>(
    () => {
      const actions: HubQuickAction[] = [
        {
          id: 'media-submissions',
          title: 'Media inzendingen',
          subtitle: 'Open supporterscontent, YouTube en insturen in een keer.',
          icon: 'upload-circle-outline',
          href: '/(tabs)/media',
          tone: 'red',
        },
        {
          id: 'news-feed',
          title: 'Nieuws & community',
          subtitle: 'Ga snel naar nieuws, updates en fanmomenten.',
          icon: 'newspaper-variant-outline',
          href: '/(tabs)/index',
          tone: 'dark',
        },
        {
          id: 'settings',
          title: 'Updates & acties',
          subtitle: 'Open instellingen, acties en vaste app-onderdelen.',
          icon: 'lightning-bolt-circle',
          href: '/(tabs)/profile',
          tone: 'gold',
        },
      ];

      if (entitlements.isDeveloper) {
        actions.push({
          id: 'owner',
          title: 'Beheer',
          subtitle: 'Open direct je owner-tab voor controle en updates.',
          icon: 'shield-crown-outline',
          href: '/(tabs)/owner',
          tone: 'red',
        });
      }

      return actions;
    },
    [entitlements.isDeveloper]
  );

  const updateCards = useMemo<HubUpdateCard[]>(
    () => {
      const cards: HubUpdateCard[] = [
        {
          id: 'media-update',
          eyebrow: 'NIEUW IN DE APP',
          title: 'Supporters kunnen nu media insturen',
          body:
            'Vanuit de Media-tab kunnen gebruikers nu hun eigen foto\'s en video\'s insturen voor het Ajax Supporters kanaal. Die inzendingen zijn daarna ook terug te zien in beheer.',
          actionLabel: 'Open Media',
          href: '/(tabs)/media',
        },
        {
          id: 'hub-growth',
          eyebrow: entitlements.isDeveloper ? 'BEHEER RICHTING' : 'CENTRALE HUB',
          title: entitlements.isDeveloper ? 'Je kijkt nu naar je mini-beheercentrum' : 'De HUB groeit door als centraal dashboard',
          body: entitlements.isDeveloper
            ? 'Hier kun je straks in een paar klikken zien welke app extra aandacht nodig heeft op gebruik, promotie, prijs of content.'
            : 'Het doel is dat gebruikers hier vanuit hun eerste app vanzelf in aanraking komen met je andere apps, zodat downloaden en doorstromen makkelijker wordt.',
          actionLabel: 'Open Media HUB',
          href: '/hub/media',
        },
      ];

      if (entitlements.isDeveloper) {
        cards.push({
          id: 'owner-update',
          eyebrow: 'BEHEER',
          title: 'Owner-tab blijft je controlekamer',
          body:
            'Nieuwe inzendingen kun je nu direct bekijken, goedkeuren of afkeuren vanuit beheer. Daardoor wordt de route naar YouTube of de Media HUB veel sneller.',
          actionLabel: 'Open Beheer',
          href: '/(tabs)/owner',
        });
      }

      return cards;
    },
    [entitlements.isDeveloper]
  );

  return (
    <HubHomeScreenContent
      categories={HUB_CATEGORIES}
      isDeveloper={entitlements.isDeveloper}
      quickActions={quickActions}
      statusCards={statusCards}
      businessCards={businessCards}
      updateCards={updateCards}
      heroTitle={heroTitle}
      heroBody={heroBody}
      statusEyebrow={entitlements.isDeveloper ? 'BEHEER OVERZICHT' : 'STATUS'}
      statusTitle={entitlements.isDeveloper ? 'Snel zien hoe de app draait' : 'Wat speelt er nu'}
    />
  );
}
