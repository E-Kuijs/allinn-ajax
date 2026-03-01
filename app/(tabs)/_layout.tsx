import { Tabs } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Platform, View, TouchableOpacity, Text, StyleSheet,
  Animated, Dimensions, TextInput, Image
} from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';

const { width: W, height: H } = Dimensions.get('window');

function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const pan = useRef(new Animated.ValueXY({ x: W - 80, y: H - 280 })).current;
  const dragging = useRef(false);
  const lastPos = useRef({ x: W - 80, y: H - 280 });

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessage('');
    setOpen(false);
  };

  return (
    <>
      {open && (
        <View style={fab.popup}>
          <View style={fab.popupHeader}>
            <Text style={fab.popupTitle}>💬 Snel bericht</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={fab.popupClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={fab.popupInput}
            placeholder="Typ een bericht..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            multiline
            autoFocus
          />
          <View style={fab.popupActions}>
            <TouchableOpacity
              style={fab.popupGoBtn}
              onPress={() => { setOpen(false); router.push('/(tabs)/chat' as any); }}
            >
              <Text style={fab.popupGoBtnText}>Naar Chat →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[fab.popupSendBtn, !message.trim() && fab.popupSendBtnDisabled]}
              onPress={sendMessage}
            >
              <Text style={fab.popupSendBtnText}>Verstuur</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Animated.View
        style={[fab.btn, { transform: pan.getTranslateTransform() }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={() => {
          dragging.current = false;
          pan.setOffset({ x: lastPos.current.x, y: lastPos.current.y });
          pan.setValue({ x: 0, y: 0 });
        }}
        onResponderMove={(e) => {
          dragging.current = true;
          pan.setValue({
            x: e.nativeEvent.pageX - lastPos.current.x - 30,
            y: e.nativeEvent.pageY - lastPos.current.y - 30,
          });
        }}
        onResponderRelease={() => {
          pan.flattenOffset();
          const x = (pan.x as any)._value;
          const y = (pan.y as any)._value;
          lastPos.current = { x, y };
          const snapX = x < W / 2 ? 16 : W - 80;
          const clampY = Math.max(80, Math.min(y, H - 220));
          Animated.spring(pan, {
            toValue: { x: snapX, y: clampY },
            useNativeDriver: false,
            tension: 100,
            friction: 8,
          }).start(() => { lastPos.current = { x: snapX, y: clampY }; });
          if (!dragging.current) setOpen(prev => !prev);
        }}
      >
        <View style={fab.inner}>
          <Text style={fab.icon}>💬</Text>
          {!open && <View style={fab.badge}><Text style={fab.badgeText}>3</Text></View>}
        </View>
      </Animated.View>
    </>
  );
}

// Ajax logo rechtsbovenin elke header
const AjaxLogo = () => (
  <Image
    source={require('@/assets/images/logo-ajax.png')}
    style={{ width: 36, height: 36, marginRight: 12, borderRadius: 18 }}
    resizeMode="contain"
  />
);

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.light.tabIconSelected,
          tabBarInactiveTintColor: Colors.light.tabIconDefault,
          tabBarStyle: {
            backgroundColor: '#D2001C',
            borderTopWidth: 0,
            elevation: 12,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -2 },
            height: Platform.OS === 'ios' ? 82 : 96,
            paddingBottom: Platform.OS === 'ios' ? 22 : 42,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          headerStyle: { backgroundColor: '#D2001C' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '800', fontSize: 18, letterSpacing: 0.5 },
          tabBarButton: HapticTab,
          headerShown: true,
          headerRight: () => <AjaxLogo />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Nieuws',
            headerTitle: 'ALL-INN AJAX',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="newspaper.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="marketplace"
          options={{
            title: 'Marktplaats',
            headerTitle: 'Marktplaats',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="tag.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Fan Chat',
            headerTitle: 'Fan Chat',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="bubble.left.and.bubble.right.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Wedstrijden',
            headerTitle: 'Wedstrijden',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="sportscourt.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profiel',
            headerTitle: 'Mijn Profiel',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
          }}
        />
      </Tabs>
      <FloatingChat />
    </View>
  );
}

const fab = StyleSheet.create({
  btn: { position: 'absolute', zIndex: 9999 },
  inner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#D2001C',
    justifyContent: 'center', alignItems: 'center',
    elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },
  icon: { fontSize: 26 },
  badge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#fff', width: 18, height: 18,
    borderRadius: 9, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#D2001C',
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#D2001C' },
  popup: {
    position: 'absolute', bottom: 160, right: 16,
    width: W - 32, backgroundColor: '#fff',
    borderRadius: 16, padding: 16, zIndex: 9998,
    elevation: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12,
  },
  popupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  popupTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  popupClose: { fontSize: 18, color: '#999', fontWeight: '700' },
  popupInput: {
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#1a1a1a', minHeight: 80,
    textAlignVertical: 'top', marginBottom: 10,
  },
  popupActions: { flexDirection: 'row', gap: 8 },
  popupGoBtn: {
    flex: 1, padding: 10, borderRadius: 10,
    backgroundColor: '#FFF0F0', alignItems: 'center',
  },
  popupGoBtnText: { fontSize: 13, fontWeight: '600', color: '#D2001C' },
  popupSendBtn: {
    flex: 1, padding: 10, borderRadius: 10,
    backgroundColor: '#D2001C', alignItems: 'center',
  },
  popupSendBtnDisabled: { backgroundColor: '#eee' },
  popupSendBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});