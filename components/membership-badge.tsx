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
      return 'BUILDER';
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
    opacity:
      starsColor === 'gold'
        ? starPulse.interpolate({
            inputRange: [0.96, 1.08],
            outputRange: [0.9, 1],
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
    overflow: 'visible',
  },
  wrapBanner: {
    maxWidth: 250,
    minWidth: 196,
    backgroundColor: '#0E0E0E',
    borderWidth: 1.8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'stretch',
    justifyContent: 'center',
    overflow: 'visible',
  },
  stars: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.6,
    lineHeight: 19,
    includeFontPadding: false,
  },
  starsCard: {},
  starsCardGold: {
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 0.5,
    textShadowColor: '#FFE49A',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
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
    gap: 8,
    minHeight: 38,
  },
  bannerVip: {
    minWidth: 52,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
    letterSpacing: 0.4,
    textAlign: 'left',
  },
  bannerRightBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  bannerRole: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 17,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 1,
  },
  bannerStarsCompact: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 19,
    minWidth: 64,
    textAlign: 'center',
    flexShrink: 0,
    includeFontPadding: false,
  },
  bannerStarsGold: {
    fontSize: 19,
    lineHeight: 21,
    textShadowColor: '#FFE49A',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  bannerBrand: {},
  bannerMotto: {},
});
