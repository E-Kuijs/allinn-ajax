import { AppSettings, Entitlements, MembershipTier } from '@/src/core/types';

export function getLocalDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isWithinLaunchWindow(settings: AppSettings, now = new Date()): boolean {
  const launchAt = new Date(`${settings.launchDate}T00:00:00`);
  const endAt = new Date(launchAt);
  endAt.setDate(endAt.getDate() + settings.launchWindowDays);
  return now >= launchAt && now < endAt;
}

export function isPaidTier(tier: MembershipTier): boolean {
  return tier !== 'FREE';
}

export function computeEntitlements(params: {
  settings: AppSettings;
  tier: MembershipTier;
  isVip: boolean;
  isDeveloper?: boolean;
  isFoundingPremium?: boolean;
  dailyChatSent: number;
}): Entitlements {
  const {
    settings,
    tier,
    isVip,
    isDeveloper = false,
    isFoundingPremium = false,
    dailyChatSent,
  } = params;
  const hasLaunchFullAccess = isWithinLaunchWindow(settings);
  const premiumOrVip = isVip || isPaidTier(tier);
  const remainingFreeChat = Math.max(0, settings.freeDailyChatLimit - dailyChatSent);

  const canSendChat = hasLaunchFullAccess || premiumOrVip || remainingFreeChat > 0;
  const marketplaceReadOnly =
    !hasLaunchFullAccess && !premiumOrVip && settings.marketplaceReadOnlyForFree;

  const badgeLabel = isDeveloper
    ? 'VIP DEVELOPER'
    : isVip
      ? tier === 'PREMIUM_LIFETIME' || tier === 'PREMIUM_12M'
        ? 'VIP FAMILY'
        : 'VIP SPECIAL MEMBER'
      : isPaidTier(tier)
        ? 'VIP PREMIUM MEMBER'
        : 'AJAX MEMBER';

  return {
    tier: isVip ? 'VIP' : tier,
    isVip,
    isDeveloper,
    isPremium: premiumOrVip,
    hasLaunchFullAccess,
    canSendChat,
    remainingFreeChat,
    canReceiveScorePopups: hasLaunchFullAccess || premiumOrVip || !settings.scorePopupPremiumOnly,
    canMessageListings: !marketplaceReadOnly,
    canCreateListings: !marketplaceReadOnly,
    marketplaceReadOnly,
    badgeLabel,
    starsColor: isVip || isDeveloper || isFoundingPremium ? 'gold' : 'red',
    starsCount: 3,
  };
}

export function toTier(value: string | null | undefined): MembershipTier {
  const raw = (value || '').toUpperCase();
  if (
    raw === 'PREMIUM_MONTH' ||
    raw === 'PREMIUM_6M' ||
    raw === 'PREMIUM_12M' ||
    raw === 'PREMIUM_LIFETIME' ||
    raw === 'VIP'
  ) {
    return raw;
  }
  return 'FREE';
}
