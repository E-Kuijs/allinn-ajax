import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ajax } from '@/constants/theme';
import { useAppContext } from '@/src/core/app-context';
import { supabase } from '@/src/core/supabaseClient';

type Message = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
};

type ChatGroup = {
  id: string;
  label: string;
};

type ChatterProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  about_me: string | null;
  is_vip: boolean | null;
  avatar_url: string | null;
};

const FALLBACK_MESSAGES: Message[] = [];

const DEFAULT_GROUPS: ChatGroup[] = [
  { id: 'general', label: 'Algemeen' },
  { id: 'matchday-live', label: 'Matchday Live' },
  { id: 'nabespreking-wedstrijd', label: 'Nabespreking' },
  { id: 'transfermarkt-talk', label: 'Transfermarkt' },
  { id: 'supporters-vak-410', label: 'Vak 410' },
  { id: 'jeugd-toekomst', label: 'Jeugd' },
];
const QUICK_EMOJIS = ['😀', '😂', '😍', '🔥', '🙏', '👏', '💯', '⚽', '🥳', '😅', '😎', '❤️'];
const AJAX_EMOJI_PACK = [
  { label: '❌❌❌', value: '❌❌❌ ' },
  { label: '⚪🔴⚪', value: '⚪🔴⚪ ' },
  { label: '⭐ AJAX ⭐', value: '⭐ AJAX ⭐ ' },
  { label: '🏟️ ARENA', value: '🏟️ ' },
  { label: '⚽ GOAL', value: '⚽ ' },
  { label: '🇮🇱 ISRAEL', value: '🇮🇱 ' },
  { label: '🏆 SCHAAL', value: '🏆 ' },
  { label: '🏆 CL', value: '🏆 Champions League ' },
  { label: '🪳 KAKKERLAK', value: '🪳 ' },
  { label: '🥚🤕 EIERSCHAAL', value: '🥚🤕 ' },
  { label: 'WZAWZDB', value: 'WZAWZDB ' },
];

function formatClock(iso: string) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
}

function formatGroupLabel(groupId: string) {
  const predefined = DEFAULT_GROUPS.find((group) => group.id === groupId);
  if (predefined) return predefined.label;

  return groupId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mergeGroups(groupIds: string[]) {
  const seen = new Set<string>();
  const merged: ChatGroup[] = [];

  [DEFAULT_GROUPS.map((group) => group.id), groupIds].flat().forEach((groupId) => {
    const normalizedId = groupId?.trim();
    if (!normalizedId || seen.has(normalizedId)) return;
    seen.add(normalizedId);
    merged.push({ id: normalizedId, label: formatGroupLabel(normalizedId) });
  });

  return merged;
}

export default function ChatScreen() {
  const { user, profile, entitlements, sendChatMessage, blockedUsers, blockUser, unblockUser } = useAppContext();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState('');
  const [moderationTarget, setModerationTarget] = useState('');
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [groups, setGroups] = useState<ChatGroup[]>(() => mergeGroups(['general']));
  const [activeGroupId, setActiveGroupId] = useState('general');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [chatterProfiles, setChatterProfiles] = useState<Record<string, ChatterProfile>>({});
  const [selectedChatterId, setSelectedChatterId] = useState<string | null>(null);
  const draftInputRef = useRef<TextInput | null>(null);

  const loadGroups = useCallback(async () => {
    const result = await supabase
      .from('chat_messages')
      .select('group_id,created_at')
      .order('created_at', { ascending: false })
      .limit(250);

    if (result.error || !result.data) {
      setGroups((prev) => mergeGroups([activeGroupId, ...prev.map((group) => group.id)]));
      return;
    }

    const dynamicIds = (result.data as { group_id: string | null }[])
      .map((row) => row.group_id?.trim() || '')
      .filter(Boolean);

    setGroups((prev) => mergeGroups([activeGroupId, ...prev.map((group) => group.id), ...dynamicIds]));
  }, [activeGroupId]);

  const loadMessages = useCallback(async () => {
    const res = await supabase
      .from('chat_messages')
      .select('id,user_id,message,created_at')
      .eq('group_id', activeGroupId)
      .order('created_at', { ascending: false })
      .limit(80);

    if (res.error || !res.data) {
      setMessages(FALLBACK_MESSAGES);
      return;
    }

    setMessages(res.data as Message[]);
  }, [activeGroupId]);

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      await Promise.all([loadGroups(), loadMessages()]);
      setLoading(false);
    };
    void boot();
  }, [loadGroups, loadMessages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadGroups(), loadMessages()]);
    setRefreshing(false);
  }, [loadGroups, loadMessages]);

  const onSend = async () => {
    if (sending) return;
    const text = draft.trim();
    if (!text) return;

    setSending(true);
    const result = await sendChatMessage(text, activeGroupId);
    setSending(false);

    if (!result.ok) {
      Alert.alert('Bericht niet verstuurd', result.message ?? 'Onbekende fout.');
      return;
    }

    setDraft('');
    setEmojiOpen(false);
    draftInputRef.current?.clear();

    const optimistic: Message = {
      id: `local-${Date.now()}`,
      user_id: user?.id ?? 'me',
      message: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [optimistic, ...prev]);
    setGroups((prev) => mergeGroups([activeGroupId, ...prev.map((group) => group.id)]));
    void loadMessages();
  };

  const onInsertEmoji = (emojiText: string) => {
    setDraft((prev) => {
      if (!emojiText) return prev;
      const next = `${prev}${emojiText}`;
      if (next.length <= 400) return next;
      return prev;
    });
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingMessage(null);
    setEditDraft('');
    setEditSaving(false);
  };

  const openEditModal = (message: Message) => {
    setEditingMessage(message);
    setEditDraft(message.message);
    setEditModalOpen(true);
  };

  const onDeleteOwnMessage = async (message: Message) => {
    if (!user || message.user_id !== user.id) return;

    Alert.alert('Bericht verwijderen?', 'Dit bericht wordt verwijderd uit de chat.', [
      { text: 'Annuleer', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: () => {
          const run = async () => {
            const result = await supabase.from('chat_messages').delete().eq('id', message.id).eq('user_id', user.id);
            if (result.error) {
              Alert.alert('Verwijderen mislukt', result.error.message || 'Probeer later opnieuw.');
              return;
            }
            setMessages((prev) => prev.filter((item) => item.id !== message.id));
          };
          void run();
        },
      },
    ]);
  };

  const onSaveEditedMessage = async () => {
    if (!editingMessage || !user || editSaving) return;
    const nextMessage = editDraft.trim();
    if (!nextMessage) {
      Alert.alert('Tekst ontbreekt', 'Vul eerst een bericht in.');
      return;
    }

    setEditSaving(true);
    const result = await supabase
      .from('chat_messages')
      .update({ message: nextMessage })
      .eq('id', editingMessage.id)
      .eq('user_id', user.id);
    setEditSaving(false);

    if (result.error) {
      Alert.alert('Wijzigen mislukt', result.error.message || 'Probeer later opnieuw.');
      return;
    }

    setMessages((prev) =>
      prev.map((item) => (item.id === editingMessage.id ? { ...item, message: nextMessage } : item))
    );
    closeEditModal();
  };

  const onMessageLongPress = (message: Message, isMe: boolean) => {
    if (message.user_id === 'system') return;
    if (isMe) {
      Alert.alert('Mijn bericht', 'Wat wil je doen met dit bericht?', [
        { text: 'Annuleer', style: 'cancel' },
        { text: 'Wijzigen', onPress: () => openEditModal(message) },
        { text: 'Verwijderen', style: 'destructive', onPress: () => void onDeleteOwnMessage(message) },
      ]);
      return;
    }
    void onToggleBlockUser(message.user_id);
  };

  const createGroup = () => {
    const raw = newGroupName.trim();
    if (!raw) {
      Alert.alert('Naam ontbreekt', 'Vul een groepsnaam in.');
      return;
    }

    const id = slugify(raw);
    if (!id) {
      Alert.alert('Ongeldige naam', 'Gebruik letters of cijfers.');
      return;
    }

    if (groups.some((g) => g.id === id)) {
      setActiveGroupId(id);
      setGroupModalOpen(false);
      setNewGroupName('');
      return;
    }

    setGroups((prev) => mergeGroups([id, ...prev.map((group) => group.id)]));
    setActiveGroupId(id);
    setGroupModalOpen(false);
    setNewGroupName('');
    setMessages([]);
  };

  const usageText = useMemo(() => {
    if (entitlements.hasLaunchFullAccess || entitlements.isPremium) return null;
    return `Free chat: ${entitlements.remainingFreeChat} bericht(en) over vandaag`;
  }, [entitlements]);

  const visibleMessages = useMemo(
    () => messages.filter((item) => item.user_id === 'system' || !blockedUsers.includes(item.user_id)),
    [messages, blockedUsers]
  );
  const chatterIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const item of visibleMessages) {
      if (!item.user_id || item.user_id === 'system') continue;
      if (seen.has(item.user_id)) continue;
      seen.add(item.user_id);
      ids.push(item.user_id);
    }
    if (user?.id && !seen.has(user.id)) {
      ids.unshift(user.id);
    }
    return ids;
  }, [visibleMessages, user?.id]);
  const selectedChatter = selectedChatterId ? chatterProfiles[selectedChatterId] : null;

  useEffect(() => {
    const loadChatterProfiles = async () => {
      if (!chatterIds.length) {
        setChatterProfiles({});
        return;
      }

      const result = await supabase
        .from('profiles')
        .select('id,display_name,username,about_me,is_vip,avatar_url')
        .in('id', chatterIds);

      if (result.error || !result.data) {
        const fallback: Record<string, ChatterProfile> = {};
        chatterIds.forEach((id) => {
            fallback[id] = {
              id,
              display_name: null,
              username: null,
              about_me: null,
              is_vip: null,
              avatar_url: null,
            };
        });
        setChatterProfiles(fallback);
        return;
      }

      const map: Record<string, ChatterProfile> = {};
      (result.data as ChatterProfile[]).forEach((row) => {
        map[row.id] = row;
      });
      chatterIds.forEach((id) => {
        if (!map[id]) {
          map[id] = {
            id,
            display_name: null,
            username: null,
            about_me: null,
            is_vip: null,
            avatar_url: null,
          };
        }
      });
      if (user?.id) {
        const own = map[user.id] ?? {
          id: user.id,
          display_name: null,
          username: null,
          about_me: null,
          is_vip: null,
          avatar_url: null,
        };
        map[user.id] = {
          ...own,
          display_name: profile?.displayName?.trim() || own.display_name,
          username: profile?.username?.trim() || own.username,
          about_me: profile?.aboutMe?.trim() || own.about_me,
          avatar_url: profile?.avatarUrl?.trim() || own.avatar_url,
        };
      }
      setChatterProfiles(map);
    };

    void loadChatterProfiles();
  }, [chatterIds, profile?.aboutMe, profile?.avatarUrl, profile?.displayName, profile?.username, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const nextDisplay = profile?.displayName?.trim() || null;
    const nextUsername = profile?.username?.trim() || null;
    const nextAbout = profile?.aboutMe?.trim() || null;

    setChatterProfiles((prev) => {
      const current = prev[user.id];
      if (!current) return prev;

      const hasChanged =
        (nextDisplay && nextDisplay !== current.display_name) ||
        (nextUsername && nextUsername !== current.username) ||
        (nextAbout && nextAbout !== current.about_me);

      if (!hasChanged) return prev;
      return {
        ...prev,
        [user.id]: {
          ...current,
          display_name: nextDisplay ?? current.display_name,
          username: nextUsername ?? current.username,
          about_me: nextAbout ?? current.about_me,
        },
      };
    });
  }, [profile?.aboutMe, profile?.displayName, profile?.username, user?.id]);

  const onToggleBlockUser = async (targetUserId: string) => {
    if (!user || !targetUserId || targetUserId === 'system' || targetUserId === user.id) return;

    const isBlocked = blockedUsers.includes(targetUserId);
    const confirmTitle = isBlocked ? 'Gebruiker deblokkeren?' : 'Gebruiker blokkeren?';
    const confirmText = isBlocked
      ? 'Je ziet berichten van deze gebruiker weer in de chat.'
      : 'Je ziet berichten van deze gebruiker niet meer in de chat.';

    Alert.alert(confirmTitle, confirmText, [
      { text: 'Annuleer', style: 'cancel' },
      {
        text: isBlocked ? 'Deblokkeren' : 'Blokkeren',
        style: isBlocked ? 'default' : 'destructive',
        onPress: () => {
          const run = async () => {
            const result = isBlocked
              ? await unblockUser(targetUserId)
              : await blockUser(targetUserId);
            if (!result.ok) {
              Alert.alert('Actie mislukt', result.message ?? 'Probeer later opnieuw.');
              return;
            }
            if (!isBlocked) {
              setMessages((prev) => prev.filter((msg) => msg.user_id !== targetUserId));
            }
          };
          void run();
        },
      },
    ]);
  };

  const onQuickBlockToggle = async () => {
    const target = moderationTarget.trim();
    if (!target) {
      Alert.alert('Gebruiker ontbreekt', 'Vul een gebruiker-ID in.');
      return;
    }
    if (!user || target === user.id) {
      Alert.alert('Niet mogelijk', 'Je kunt jezelf niet blokkeren.');
      return;
    }

    const isBlocked = blockedUsers.includes(target);
    const result = isBlocked ? await unblockUser(target) : await blockUser(target);
    if (!result.ok) {
      Alert.alert('Actie mislukt', result.message ?? 'Onbekende fout.');
      return;
    }
    Alert.alert('Opgeslagen', isBlocked ? 'Gebruiker gedeblokkeerd.' : 'Gebruiker geblokkeerd.');
  };

  const onReportUser = async () => {
    const target = moderationTarget.trim();
    if (!target) {
      Alert.alert('Gebruiker ontbreekt', 'Vul een gebruiker-ID in om te melden.');
      return;
    }
    const subject = encodeURIComponent('Melding gebruiker - Fan Chat');
    const body = encodeURIComponent(
      `Gemelde gebruiker: ${target}\nGroep: ${activeGroupId}\nMelder: ${user?.email ?? 'onbekend'}`
    );
    const mailto = `mailto:all.inn.media.contact@gmail.com?subject=${subject}&body=${body}`;
    const supported = await Linking.canOpenURL(mailto);
    if (!supported) {
      Alert.alert('Melding', `Stuur melding naar all.inn.media.contact@gmail.com\nGebruiker: ${target}`);
      return;
    }
    await Linking.openURL(mailto);
  };

  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';
  const keyboardOffset = Platform.OS === 'ios' ? 96 : 0;
  const composerBottomPad = Platform.OS === 'android' ? Math.max(insets.bottom, 6) : Math.max(insets.bottom, 6);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardBehavior}
      keyboardVerticalOffset={keyboardOffset}
    >
      <View style={styles.inner}>
        {usageText ? (
          <View style={styles.noticeBar}>
            <Text style={styles.noticeText}>{usageText}</Text>
          </View>
        ) : null}
        {blockedUsers.length > 0 ? (
          <View style={styles.blockedBar}>
            <Text style={styles.blockedText}>
              {blockedUsers.length} geblokkeerde gebruiker(s) verborgen in chat.
            </Text>
          </View>
        ) : null}

        <View style={styles.groupsBar}>
          <FlatList
            horizontal
            data={groups}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupsContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.groupChip, item.id === activeGroupId && styles.groupChipActive]}
                onPress={() => setActiveGroupId(item.id)}
              >
                <Text style={[styles.groupChipText, item.id === activeGroupId && styles.groupChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
        <View style={styles.refreshHelpRow}>
          <View style={styles.refreshLeftWrap}>
            <TouchableOpacity style={styles.groupAddInlineBtn} onPress={() => setGroupModalOpen(true)}>
              <Text style={styles.groupAddInlineText}>+ GROEP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.favoritesShortcutBtn} onPress={() => router.push('/favorites')}>
              <Text style={styles.favoritesShortcutText}>Favorieten</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, (refreshing || loading) && styles.refreshBtnDisabled]}
            onPress={() => void onRefresh()}
            disabled={refreshing || loading}
          >
            <Text style={styles.refreshBtnText}>{refreshing || loading ? 'Verversen...' : 'Ververs pagina'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chatArea}>
          <View style={styles.chatterSidebar}>
            <Text style={styles.chatterSidebarTitle}>Chatters</Text>
            <FlatList
              data={chatterIds}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.chatterList}
              renderItem={({ item }) => {
                const chatter = chatterProfiles[item];
                const isCurrentUser = item === user?.id;
                const display =
                  (isCurrentUser ? profile?.displayName?.trim() : null) ||
                  (isCurrentUser ? profile?.username?.trim() : null) ||
                  chatter?.display_name?.trim() ||
                  chatter?.username?.trim() ||
                  item.slice(0, 8);
                const initial = display.charAt(0).toUpperCase() || '?';
                const avatarUri =
                  (isCurrentUser ? profile?.avatarUrl?.trim() : null) || chatter?.avatar_url?.trim() || null;

                return (
                  <TouchableOpacity
                    style={styles.chatterItem}
                    onPress={() => {
                      setSelectedChatterId(item);
                      setModerationTarget(item);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.chatterAvatar}>
                      {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.chatterAvatarImage} />
                      ) : (
                        <Text style={styles.chatterAvatarText}>{initial}</Text>
                      )}
                    </View>
                    <Text style={styles.chatterName} numberOfLines={1}>
                      {display}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.chatterEmpty}>Geen</Text>}
            />
          </View>

          <View style={styles.messagesPane}>
            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={Ajax.red} />
              </View>
            ) : (
              <FlatList
                data={visibleMessages}
                keyExtractor={(item) => item.id}
                inverted
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.list}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Ajax.red]} />
                }
                renderItem={({ item }) => {
                  const isMe = item.user_id === user?.id;
                  return (
                    <View style={[styles.bubbleRow, isMe ? styles.rowMe : styles.rowOther]}>
                      <TouchableOpacity
                        activeOpacity={0.92}
                        disabled={item.user_id === 'system'}
                        onLongPress={() => onMessageLongPress(item, isMe)}
                        style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
                      >
                        <View style={styles.messageLine}>
                          <Text style={[styles.messageText, isMe && styles.messageTextMe]} numberOfLines={2}>
                            {item.message}
                          </Text>
                          <Text style={[styles.timeText, isMe && styles.timeTextMe]}>{formatClock(item.created_at)}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>Nog geen berichten in deze groep.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>

        <View style={[styles.composerWrap, { paddingBottom: composerBottomPad }]}>
          <View style={styles.composerTopRow}>
            <TextInput
              ref={draftInputRef}
              style={styles.input}
              placeholder="Typ een bericht..."
              placeholderTextColor={isDark ? '#8D98A5' : '#777'}
              value={draft}
              onChangeText={setDraft}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={() => void onSend()}
              blurOnSubmit={false}
              maxLength={400}
            />
            <TouchableOpacity
              style={[styles.emojiBtn, emojiOpen && styles.emojiBtnActive]}
              onPress={() => setEmojiOpen((prev) => !prev)}
            >
              <Text style={[styles.emojiBtnText, emojiOpen && styles.emojiBtnTextActive]}>😊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, (!draft.trim() || sending || !entitlements.canSendChat) && styles.sendBtnDisabled]}
              onPress={onSend}
              disabled={!draft.trim() || sending || !entitlements.canSendChat}
            >
              <Text style={styles.sendBtnText}>{sending ? '...' : 'Verstuur'}</Text>
            </TouchableOpacity>
          </View>
          {emojiOpen ? (
            <View style={styles.emojiPanel}>
              <Text style={styles.emojiPanelTitle}>Emoji</Text>
              <View style={styles.emojiRow}>
                {QUICK_EMOJIS.map((emoji) => (
                  <TouchableOpacity key={emoji} style={styles.emojiChip} onPress={() => onInsertEmoji(emoji)}>
                    <Text style={styles.emojiChipText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.emojiPanelTitle}>Ajax pack</Text>
              <View style={styles.emojiRow}>
                {AJAX_EMOJI_PACK.map((item) => (
                  <TouchableOpacity key={item.label} style={styles.ajaxEmojiChip} onPress={() => onInsertEmoji(item.value)}>
                    <Text style={styles.ajaxEmojiChipText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
          {user ? (
            <View style={styles.moderationRow}>
              <TextInput
                style={styles.moderationInput}
                placeholder="Gebruiker-ID voor meld/blokkeer"
                placeholderTextColor={isDark ? '#8D98A5' : '#777'}
                value={moderationTarget}
                onChangeText={setModerationTarget}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.meldBtn} onPress={() => void onReportUser()}>
                <Text style={styles.meldBtnText}>Meld</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.blockBtn} onPress={() => void onQuickBlockToggle()}>
                <Text style={styles.blockBtnText}>
                  {blockedUsers.includes(moderationTarget.trim()) ? 'Deblokkeer' : 'Blokkeer'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      <Modal transparent visible={groupModalOpen} animationType="fade" onRequestClose={() => setGroupModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nieuwe chatgroep</Text>
            <TextInput
              style={styles.modalInput}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Bijv. Uitwedstrijd"
              placeholderTextColor={isDark ? '#8D98A5' : '#999'}
              autoFocus
              maxLength={40}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalGhost} onPress={() => setGroupModalOpen(false)}>
                <Text style={styles.modalGhostText}>Annuleer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimary} onPress={createGroup}>
                <Text style={styles.modalPrimaryText}>Aanmaken</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={!!selectedChatterId}
        animationType="fade"
        onRequestClose={() => setSelectedChatterId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Profiel</Text>
            <Text style={styles.profileName}>
              {selectedChatter?.display_name?.trim() ||
                selectedChatter?.username?.trim() ||
                selectedChatterId?.slice(0, 8) ||
                'Onbekend'}
            </Text>
            <Text style={styles.profileMeta}>
              {selectedChatter?.username?.trim() || selectedChatterId || 'Geen gebruikersnaam'}
            </Text>
            {selectedChatter?.is_vip ? <Text style={styles.profileVip}>VIP MEMBER</Text> : null}
            <Text style={styles.profileAboutLabel}>Over mij</Text>
            <Text style={styles.profileAboutText}>
              {selectedChatter?.about_me?.trim() || 'Nog geen beschrijving.'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalPrimary} onPress={() => setSelectedChatterId(null)}>
                <Text style={styles.modalPrimaryText}>Sluiten</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={editModalOpen} animationType="fade" onRequestClose={closeEditModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bericht wijzigen</Text>
            <TextInput
              style={[styles.modalInput, styles.editMessageInput]}
              value={editDraft}
              onChangeText={setEditDraft}
              placeholder="Pas je bericht aan"
              placeholderTextColor={isDark ? '#8D98A5' : '#999'}
              multiline
              autoFocus
              maxLength={400}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalGhost} onPress={closeEditModal}>
                <Text style={styles.modalGhostText}>Annuleer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimary, (!editDraft.trim() || editSaving) && styles.modalPrimaryDisabled]}
                onPress={() => void onSaveEditedMessage()}
                disabled={!editDraft.trim() || editSaving}
              >
                <Text style={styles.modalPrimaryText}>{editSaving ? 'Opslaan...' : 'Opslaan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function createStyles(isDark: boolean) {
  const bg = '#050505';
  const card = '#FFFFFF';
  const border = Ajax.red;
  const text = '#111111';
  const textSoft = '#555555';
  const composerControlHeight = 26;
  const moderationControlHeight = 26;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    inner: { flex: 1 },
    chatArea: {
      flex: 1,
      flexDirection: 'row',
    },
    chatterSidebar: {
      width: 84,
      borderRightWidth: 1,
      borderColor: border,
      backgroundColor: '#101010',
      paddingTop: 8,
      paddingBottom: 4,
      paddingHorizontal: 6,
    },
    chatterSidebarTitle: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 8,
    },
    chatterList: {
      gap: 8,
      paddingBottom: 12,
    },
    chatterItem: {
      alignItems: 'center',
      gap: 4,
    },
    chatterAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.3,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chatterAvatarText: { color: Ajax.red, fontSize: 14, fontWeight: '900' },
    chatterAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 17,
    },
    chatterName: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
      maxWidth: 78,
      textAlign: 'center',
    },
    chatterEmpty: { color: '#AAA', fontSize: 10, textAlign: 'center' },
    messagesPane: { flex: 1 },
    loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noticeBar: {
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderColor: border,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    noticeText: { textAlign: 'center', color: Ajax.red, fontSize: 12, fontWeight: '700' },
    blockedBar: {
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderColor: border,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    blockedText: { textAlign: 'center', color: textSoft, fontSize: 12, fontWeight: '600' },
    groupsBar: {
      borderBottomWidth: 1,
      borderColor: border,
      backgroundColor: Ajax.red,
      paddingVertical: 6,
    },
    refreshHelpRow: {
      borderBottomWidth: 1,
      borderColor: '#FFFFFF',
      backgroundColor: Ajax.red,
      paddingVertical: 5,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    refreshLeftWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    favoritesShortcutBtn: {
      borderRadius: 8,
      borderWidth: 1.3,
      borderColor: '#FFFFFF',
      backgroundColor: '#111111',
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    favoritesShortcutText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    refreshBtn: {
      borderRadius: 8,
      borderWidth: 1.3,
      borderColor: '#FFFFFF',
      backgroundColor: Ajax.red,
      paddingHorizontal: 9,
      paddingVertical: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    refreshBtnDisabled: {
      opacity: 0.6,
    },
    refreshBtnText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    groupsContent: {
      paddingHorizontal: 12,
      alignItems: 'center',
      gap: 8,
    },
    groupChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#FFFFFF',
      backgroundColor: 'transparent',
    },
    groupChipActive: {
      backgroundColor: '#FFFFFF',
      borderColor: '#FFFFFF',
    },
    groupChipText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    groupChipTextActive: { color: Ajax.red },
    groupAddBtn: {
      borderRadius: 999,
      borderWidth: 1.2,
      borderColor: '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 5,
      marginLeft: 4,
    },
    groupAddText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    groupAddInlineBtn: {
      borderRadius: 999,
      borderWidth: 1.2,
      borderColor: '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 3,
      backgroundColor: Ajax.red,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupAddInlineText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
    list: { padding: 10, gap: 6 },
    bubbleRow: { width: '100%' },
    rowMe: { alignItems: 'flex-end' },
    rowOther: { alignItems: 'flex-start' },
    bubble: {
      maxWidth: '78%',
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    bubbleMe: { backgroundColor: Ajax.red },
    bubbleOther: { backgroundColor: card },
    messageLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    messageText: { fontSize: 11, color: text, flexShrink: 1, minWidth: 0 },
    messageTextMe: { color: '#fff' },
    timeText: { fontSize: 8, color: textSoft, textAlign: 'right', flexShrink: 0 },
    timeTextMe: { color: 'rgba(255,255,255,0.7)' },
    emptyWrap: { paddingVertical: 24, alignItems: 'center' },
    emptyText: { color: textSoft, fontSize: 13 },
    composerWrap: {
      flexDirection: 'column',
      alignItems: 'stretch',
      backgroundColor: Ajax.red,
      borderTopWidth: 1,
      borderColor: '#FFFFFF',
      paddingTop: 2,
      paddingHorizontal: 8,
      gap: 2,
    },
    composerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    input: {
      flex: 1,
      minHeight: composerControlHeight,
      maxHeight: composerControlHeight,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 0,
      color: text,
      fontSize: 11,
      borderWidth: 1,
      borderColor: border,
    },
    emojiBtn: {
      height: composerControlHeight,
      width: composerControlHeight,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#FFFFFF',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiBtnActive: {
      backgroundColor: Ajax.red,
      borderColor: Ajax.red,
    },
    emojiBtnText: { fontSize: 18, lineHeight: 20 },
    emojiBtnTextActive: { color: '#FFFFFF' },
    sendBtn: {
      height: composerControlHeight,
      minWidth: 64,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Ajax.red,
      borderWidth: 1,
      borderColor: '#FFFFFF',
      paddingHorizontal: 9,
    },
    sendBtnDisabled: { backgroundColor: '#777' },
    sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    emojiPanel: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 6,
    },
    emojiPanelTitle: {
      color: Ajax.red,
      fontSize: 11,
      fontWeight: '900',
      marginTop: 1,
    },
    emojiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    emojiChip: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 999,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 8,
      paddingVertical: 5,
      minWidth: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiChipText: { fontSize: 18, lineHeight: 20 },
    ajaxEmojiChip: {
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 999,
      backgroundColor: Ajax.red,
      paddingHorizontal: 9,
      paddingVertical: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ajaxEmojiChipText: {
      color: '#FFD369',
      fontSize: 11,
      fontWeight: '900',
    },
    moderationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    moderationInput: {
      flex: 1,
      height: moderationControlHeight,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#FFFFFF',
      backgroundColor: '#FFFFFF',
      color: text,
      paddingHorizontal: 9,
      paddingVertical: 0,
      fontSize: 10,
      lineHeight: 12,
      textAlignVertical: 'center',
    },
    meldBtn: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#FFFFFF',
      paddingHorizontal: 9,
      height: moderationControlHeight,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
    meldBtnText: { color: Ajax.red, fontSize: 11, fontWeight: '800' },
    blockBtn: {
      borderRadius: 8,
      backgroundColor: Ajax.red,
      borderWidth: 1,
      borderColor: '#FFFFFF',
      paddingHorizontal: 9,
      height: moderationControlHeight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    blockBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      borderRadius: 14,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      padding: 14,
      gap: 10,
    },
    modalTitle: { color: text, fontSize: 16, fontWeight: '800' },
    modalInput: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: '#FFFFFF',
      color: text,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    modalGhost: {
      borderWidth: 1.2,
      borderColor: border,
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    modalGhostText: { color: text, fontSize: 13, fontWeight: '700' },
    modalPrimary: {
      borderRadius: 10,
      backgroundColor: Ajax.red,
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    modalPrimaryDisabled: {
      opacity: 0.55,
    },
    modalPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    editMessageInput: {
      minHeight: 110,
      textAlignVertical: 'top',
    },
    profileName: { color: text, fontSize: 16, fontWeight: '900' },
    profileMeta: { color: textSoft, fontSize: 12, marginTop: 2 },
    profileVip: { color: Ajax.red, fontSize: 12, fontWeight: '900', marginTop: 6 },
    profileAboutLabel: { color: text, fontSize: 12, fontWeight: '800', marginTop: 8 },
    profileAboutText: { color: textSoft, fontSize: 13, lineHeight: 18, marginTop: 2 },
  });
}
