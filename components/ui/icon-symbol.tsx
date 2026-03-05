// Fallback for using MaterialIcons on Android and web.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Standaard
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // ALL-INN AJAX tabs
  'newspaper.fill': 'article',
  'tag.fill': 'local-offer',
  'bubble.left.and.bubble.right.fill': 'forum',
  'sportscourt.fill': 'sports-soccer',
  'person.fill': 'person',
  // Extra
  'magnifyingglass': 'search',
  'plus.circle.fill': 'add-circle',
  'heart.fill': 'favorite',
  'bell.fill': 'notifications',
  'gear': 'settings',
  'arrow.left': 'arrow-back',
  'eye.fill': 'visibility',
  'location.fill': 'location-on',
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name] ?? 'help'} style={style} />;
}