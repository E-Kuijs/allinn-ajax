import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getTabLabel(
  options: BottomTabBarProps['descriptors'][string]['options'],
  routeName: string
): string {
  const label = options?.tabBarLabel;
  if (typeof label === 'string') return label;
  const title = options?.title;
  if (typeof title === 'string') return title;
  return routeName;
}

export function TwoRowTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const maxCols = Math.ceil(state.routes.length / 2);
  const firstRow = state.routes.slice(0, maxCols);
  const secondRow = state.routes.slice(maxCols);

  if (keyboardVisible) {
    return null;
  }

  const renderRow = (routes: typeof state.routes) => (
    <View style={styles.row}>
      {routes.map((route) => {
        const index = state.routes.findIndex((r) => r.key === route.key);
        const isFocused = state.index === index;
        const options = descriptors[route.key].options;
        const activeTintColor = typeof options.tabBarActiveTintColor === 'string' ? options.tabBarActiveTintColor : '#FFE4A8';
        const inactiveTintColor =
          typeof options.tabBarInactiveTintColor === 'string' ? options.tabBarInactiveTintColor : 'rgba(255,255,255,0.62)';
        const color = isFocused ? activeTintColor : inactiveTintColor;
        const label = getTabLabel(options, route.name);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            (navigation as any).navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
          >
            {options.tabBarIcon
              ? options.tabBarIcon({
                  focused: isFocused,
                  color,
                  size: 20,
                })
              : null}
            <Text numberOfLines={1} style={[styles.tabLabel, { color }, isFocused ? styles.tabLabelActive : null]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
      {Array.from({ length: Math.max(0, maxCols - routes.length) }).map((_, idx) => (
        <View key={`spacer-${idx}`} style={styles.tabButton} />
      ))}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8,
          transform: Platform.OS === 'android' ? [{ translateY: -19 }] : undefined,
        },
      ]}
    >
      {renderRow(firstRow)}
      {secondRow.length ? renderRow(secondRow) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#D2001C',
    borderTopWidth: 2,
    borderTopColor: '#000',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#000',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    paddingTop: 4,
    paddingHorizontal: 4,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 2,
  },
  tabButton: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  tabLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabelActive: {
    fontWeight: '900',
  },
});
