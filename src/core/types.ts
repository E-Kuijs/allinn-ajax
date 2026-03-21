export type MembershipTier =
  | 'FREE'
  | 'PREMIUM_MONTH'
  | 'PREMIUM_6M'
  | 'PREMIUM_12M'
  | 'PREMIUM_LIFETIME'
  | 'VIP';

export type MembershipStatus = 'active' | 'expired' | 'canceled' | 'trial';

export type Membership = {
  tier: MembershipTier;
  status: MembershipStatus;
  startedAt?: string | null;
  expiresAt?: string | null;
};

export type Profile = {
  id: string;
  email?: string | null;
  displayName: string;
  username: string;
  aboutMe: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  isVip: boolean;
};

export type AppSettings = {
  launchDate: string;
  launchWindowDays: number;
  monthlyPriceEur: number;
  discount6mPct: number;
  discount12mPct: number;
  discountLifetimePct: number;
  firstPaidMemberLimit: number;
  freeDailyChatLimit: number;
  scorePopupPremiumOnly: boolean;
  marketplaceReadOnlyForFree: boolean;
};

export type AppContent = {
  welcomeTitle: string;
  welcomeText: string;
  welcomeBannerUrl: string | null;
  welcomeCornerImageUrl: string | null;
  welcomeInfoLinkUrl: string;
  paymentPortalUrl: string;
  lotteryWinnerName: string;
  lotteryWinnerInterview: string;
  lotteryWinnerPhotoUrl: string | null;
  lotteryWinnerVideoUrl: string | null;
  termsVersion: string;
  termsText: string;
  webshopFsideUrl: string;
  webshopAfcaUrl: string;
  webshopAjaxUrl: string;
  tuneInUrl: string;
  arenaMapUrl: string;
  cafesMapUrl: string;
  restaurantsMapUrl: string;
  stadiumRouteUrl: string;
};

export type UserSocialLinks = {
  ajaxYoutubeUrl: string;
  spotifyUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  threadsUrl: string;
  tiktokUrl: string;
  xUrl: string;
  youtubePersonalUrl: string;
};

export type ChatUsage = {
  dateKey: string;
  messagesSent: number;
};

export type Entitlements = {
  tier: MembershipTier;
  isVip: boolean;
  isDeveloper: boolean;
  isPremium: boolean;
  hasLaunchFullAccess: boolean;
  canSendChat: boolean;
  remainingFreeChat: number;
  canReceiveScorePopups: boolean;
  canMessageListings: boolean;
  canCreateListings: boolean;
  marketplaceReadOnly: boolean;
  badgeLabel:
    | 'VIP DEVELOPER'
    | 'VIP FAMILY'
    | 'VIP SPECIAL MEMBER'
    | 'VIP PREMIUM MEMBER'
    | 'AJAX MEMBER';
  starsColor: 'gold' | 'red';
  starsCount: 3;
};

export type ActionResult = {
  ok: boolean;
  message?: string;
};
