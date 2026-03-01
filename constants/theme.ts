import { Platform } from 'react-native';

// ALL-INN AJAX kleuren — rood & wit
export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#F5F5F5',
    tint: '#D2001C',
    icon: '#D2001C',
    tabIconDefault: 'rgba(255,255,255,0.55)',
    tabIconSelected: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E0E0E0',
    primary: '#D2001C',
    secondary: '#FFFFFF',
    textLight: '#666666',
    badge: '#FFFFFF',
    badgeText: '#D2001C',
  },
  dark: {
    text: '#1A1A1A',
    background: '#F5F5F5',
    tint: '#D2001C',
    icon: '#D2001C',
    tabIconDefault: 'rgba(255,255,255,0.55)',
    tabIconSelected: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E0E0E0',
    primary: '#D2001C',
    secondary: '#FFFFFF',
    textLight: '#666666',
    badge: '#FFFFFF',
    badgeText: '#D2001C',
  },
};

export const Ajax = {
  red: '#D2001C',
  white: '#FFFFFF',
  lightRed: '#FFE8EA',
  background: '#F5F5F5',
  text: '#1A1A1A',
  textLight: '#666666',
  border: '#E0E0E0',
  card: '#FFFFFF',
  radius: { sm: 6, md: 12, lg: 20, full: 999 },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
  web: { sans: "system-ui, -apple-system, sans-serif", mono: "monospace" },
});