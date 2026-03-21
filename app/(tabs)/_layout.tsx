import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';

import { MembershipBadge } from '@/components/membership-badge';
import { TwoRowTabBar } from '@/components/two-row-tab-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppContext } from '@/src/core/app-context';

export const unstable_settings = {
  initialRouteName: 'welcome',
};

function HeaderIdentity() {
  const { entitlements } = useAppContext();
  const bannerLabel =
    entitlements.badgeLabel === 'VIP FAMILY' ? 'VIP SPECIAL MEMBER' : entitlements.badgeLabel;

  return (
    <View style={styles.headerIdentity}>
      <MembershipBadge
        label={bannerLabel}
        starsColor={entitlements.starsColor}
        inBanner
        showMotto={false}
        brandMark="ALL-INN MEDIA"
      />
    </View>
  );
}

function HeaderTitleBlock() {
  const { headerText } = useAppContext();
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.titleBlockText} numberOfLines={1}>
        {headerText}
      </Text>
    </View>
  );
}

function HeaderRight() {
  return <HeaderIdentity />;
}

function tabHeaderRight(_routeName: string) {
  return HeaderRight;
}

function tabHeaderRightStyle(routeName: string) {
  if (routeName === 'index') return { paddingRight: 2, maxWidth: 300 };
  return { paddingRight: 2, maxWidth: 290 };
}

function tabHeaderTitleStyle(routeName: string) {
  if (routeName === 'index') return { paddingLeft: 0 };
  return { paddingLeft: 3 };
}

export default function TabLayout() {
  const { loading, session, entitlements } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const startupRedirectWindowRef = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      startupRedirectWindowRef.current = false;
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!startupRedirectWindowRef.current) return;
    if (pathname === '/(tabs)' || pathname === '/(tabs)/index') {
      router.replace('/(tabs)/welcome');
    }
  }, [pathname, router]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#D2001C" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Tabs
      initialRouteName="welcome"
      screenOptions={{
        tabBarActiveTintColor: '#FFE4A8',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.62)',
        headerStyle: {
          backgroundColor: '#D2001C',
          borderBottomWidth: 2,
          borderBottomColor: '#000',
        },
        headerTintColor: '#FFFFFF',
        headerShown: true,
        headerTitleAlign: 'left',
      }}
      tabBar={(props) => <TwoRowTabBar {...props} />}
    >
      <Tabs.Screen
        name="welcome"
        options={{
          title: 'Welkom',
          headerTitle: () => <HeaderTitleBlock />,
          headerRight: tabHeaderRight('welcome'),
          headerRightContainerStyle: tabHeaderRightStyle('welcome'),
          headerTitleContainerStyle: tabHeaderTitleStyle('welcome'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Nieuws',
          headerTitle: () => <HeaderTitleBlock />,
          headerRight: HeaderRight,
          headerRightContainerStyle: tabHeaderRightStyle('index'),
          headerTitleContainerStyle: tabHeaderTitleStyle('index'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="newspaper.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marktplaats',
          headerTitle: () => <HeaderTitleBlock />,
          headerRight: tabHeaderRight('marketplace'),
          headerRightContainerStyle: tabHeaderRightStyle('marketplace'),
          headerTitleContainerStyle: tabHeaderTitleStyle('marketplace'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="tag.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Fan Chat',
          headerTitle: () => <HeaderTitleBlock />,
          headerRight: tabHeaderRight('chat'),
          headerRightContainerStyle: tabHeaderRightStyle('chat'),
          headerTitleContainerStyle: tabHeaderTitleStyle('chat'),
          tabBarIcon: ({ color }) =>
            <IconSymbol size={26} name="bubble.left.and.bubble.right.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Wedstrijden',
          headerTitle: () => <HeaderTitleBlock />,
          headerRight: tabHeaderRight('events'),
          headerRightContainerStyle: tabHeaderRightStyle('events'),
          headerTitleContainerStyle: tabHeaderTitleStyle('events'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="sportscourt.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: 'Media',
          headerTitle: () => <HeaderTitleBlock />,
          headerRight: tabHeaderRight('media'),
          headerRightContainerStyle: tabHeaderRightStyle('media'),
          headerTitleContainerStyle: tabHeaderTitleStyle('media'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="play.rectangle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="luxe"
        options={{
          title: 'Luxe',
          headerTitle: () => <HeaderTitleBlock />,
          headerRight: tabHeaderRight('luxe'),
          headerRightContainerStyle: tabHeaderRightStyle('luxe'),
          headerTitleContainerStyle: tabHeaderTitleStyle('luxe'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="creditcard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Profiel',
          headerTitle: () => <HeaderTitleBlock />,
          headerRight: tabHeaderRight('account'),
          headerRightContainerStyle: tabHeaderRightStyle('account'),
          headerTitleContainerStyle: tabHeaderTitleStyle('account'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Instellingen',
          headerTitle: () => <HeaderTitleBlock />,
          headerRight: tabHeaderRight('profile'),
          headerRightContainerStyle: tabHeaderRightStyle('profile'),
          headerTitleContainerStyle: tabHeaderTitleStyle('profile'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gear" color={color} />,
        }}
      />
      {entitlements.isDeveloper ? (
        <Tabs.Screen
          name="owner"
          options={{
            title: 'Beheer',
            headerTitle: () => <HeaderTitleBlock />,
            headerRight: tabHeaderRight('owner'),
            headerRightContainerStyle: tabHeaderRightStyle('owner'),
            headerTitleContainerStyle: tabHeaderTitleStyle('owner'),
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="plus.circle.fill" color={color} />,
          }}
        />
      ) : null}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
  },
  headerIdentity: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    marginTop: -14,
  },
  titleBlock: {
    backgroundColor: '#0E0E0E',
    borderWidth: 1.6,
    borderColor: '#FFD369',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 186,
    marginLeft: -7,
  },
  titleBlockText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
