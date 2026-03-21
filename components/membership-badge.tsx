import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Ajax } from '@/constants/theme';

type Props = {
  label?: 'VIP DEVELOPER' | 'VIP FAMILY' | 'VIP SPECIAL MEMBER' | 'VIP PREMIUM MEMBER' | 'AJAX MEMBER';
  starsColor?: 'gold' | 'red';
  showMotto?: boolean;
  personalText?: string;
  inBanner?: boolean;
  brandMark?: string;
};

function normalizeLabel(label?: Props['label']) {
  switch (label) {
    case 'VIP DEVELOPER':
      return 'VIP DEVELOPER';
    case 'VIP FAMILY':
      return 'VIP FAMILY';
    case 'VIP SPECIAL MEMBER':
      return 'VIP SPECIAL MEMBER';
    case 'VIP PREMIUM MEMBER':
      return 'VIP PREMIUM MEMBER';
    case 'AJAX MEMBER':
    default:
      return 'AJAX MEMBER';
  }
}

function getRoleLine(label: Props['label']) {
  switch (label) {
    case 'VIP DEVELOPER':
      return 'DEVELOPER';
    case 'VIP FAMILY':
      return 'SPECIAL MEMBER';
    case 'VIP SPECIAL MEMBER':
      return 'SPECIAL MEMBER';
    case 'VIP PREMIUM MEMBER':
      return 'PREMIUM MEMBER';
    case 'AJAX MEMBER':
    default:
      return 'AJAX MEMBER';
  }
}

export function MembershipBadge({
  label = 'AJAX MEMBER',
  starsColor = 'red',
  showMotto = true,
  personalText,
  inBanner = false,
  brandMark,
}: Props) {
  const normalizedLabel = normalizeLabel(label);
  const roleLine = getRoleLine(normalizedLabel);
  const starColor = starsColor === 'gold' ? '#C9A84C' : Ajax.red;
  const textColor = normalizedLabel === 'AJAX MEMBER' ? Ajax.red : starColor;
  const borderColor = starsColor === 'gold' ? '#C9A84C' : Ajax.red;
  const starPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (starsColor !== 'gold') {
      starPulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(starPulse, {
          toValue: 1.08,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(starPulse, {
          toValue: 0.96,
          duration: 460,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(starPulse, {
          toValue: 1.04,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(starPulse, {
          toValue: 1,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [starPulse, starsColor]);

  const animatedStarStyle = {
    transform: [{ scale: starsColor === 'gold' ? starPulse : 1 }],
    opacity:
      starsColor === 'gold'
        ? starPulse.interpolate({
            inputRange: [0.96, 1.08],
            outputRange: [0.86, 1],
            extrapolate: 'clamp',
          })
        : 1,
  };

  if (inBanner) {
    return (
      <View style={[styles.wrapBanner, { borderColor }]}>
        <View style={styles.bannerGrid}>
          <Text style={[styles.bannerVip, { color: textColor }]} numberOfLines={1}>
            VIP
          </Text>
          <View style={styles.bannerRightBlock}>
            <Text style={[styles.bannerRole, { color: textColor }]} numberOfLines={1}>
              {roleLine}
            </Text>
            <Animated.Text
              style={[
                styles.bannerStarsCompact,
                { color: starColor },
                starsColor === 'gold' && styles.bannerStarsGold,
                animatedStarStyle,
              ]}
            >
              ★★★
            </Animated.Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, styles.wrapCard, { borderColor }]}>
      <Animated.Text
        style={[
          styles.stars,
          styles.starsCard,
          { color: starColor },
          starsColor === 'gold' && styles.starsCardGold,
          animatedStarStyle,
        ]}
      >
        ★★★
      </Animated.Text>
      <Text style={[styles.label, styles.labelCard, { color: textColor }]} numberOfLines={1}>
        {normalizedLabel}
      </Text>
      {personalText ? (
        <Text style={styles.personal} numberOfLines={1}>
          {personalText}
        </Text>
      ) : null}
      {showMotto ? (
        <Text style={styles.motto} numberOfLines={1}>
          WZAWZDB
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 8,
  },
  wrapCard: {
    maxWidth: 190,
    minWidth: 150,
    backgroundColor: '#0E0E0E',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  wrapBanner: {
    maxWidth: 268,
    minWidth: 214,
    backgroundColor: '#0E0E0E',
    borderWidth: 1.8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  stars: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
  },
  starsCard: {},
  starsCardGold: {
    fontSize: 22,
    textShadowColor: '#FFE49A',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  starsBanner: {
    fontSize: 24,
    letterSpacing: 1.2,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
    textAlign: 'right',
  },
  labelCard: {},
  labelBanner: {
    fontSize: 11,
    marginTop: 1,
  },
  personal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D2D2D2',
    marginTop: 2,
    textAlign: 'right',
  },
  personalBanner: {
    fontSize: 9,
    marginTop: 1,
  },
  motto: {
    fontSize: 11,
    fontWeight: '900',
    color: Ajax.red,
    marginTop: 2,
    textAlign: 'right',
  },
  mottoBanner: {
    fontSize: 10,
    marginTop: 1,
  },
  bannerGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 42,
  },
  bannerVip: {
    minWidth: 56,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
    letterSpacing: 0.4,
    textAlign: 'left',
  },
  bannerRightBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRole: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 19,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 1,
  },
  bannerStarsCompact: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.4,
    lineHeight: 26,
    minWidth: 74,
    textAlign: 'center',
    flexShrink: 0,
  },
  bannerStarsGold: {
    fontSize: 29,
    lineHeight: 31,
    textShadowColor: '#FFE49A',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  bannerBrand: {},
  bannerMotto: {},
});
