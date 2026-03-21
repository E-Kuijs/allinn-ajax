import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RecordingPresets,
  RecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

import { Ajax } from '@/constants/theme';

const STADIUM_FLASH_COLOR_KEY = 'events:stadium-flash-color';
const STADIUM_FLASH_INTERVAL_KEY = 'events:stadium-flash-interval-ms';
const MIN_FLASH_INTERVAL_MS = 220;
const MAX_FLASH_INTERVAL_MS = 1200;

type FlashSeatColor = 'red' | 'white';

export function StadiumFlashCard() {
  const isDark = useColorScheme() === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const [stadiumFlashColor, setStadiumFlashColor] = useState<FlashSeatColor>('red');
  const [stadiumFlashIntervalMs, setStadiumFlashIntervalMs] = useState(520);
  const [stadiumFlashOpen, setStadiumFlashOpen] = useState(false);
  const [stadiumFlashLit, setStadiumFlashLit] = useState(true);
  const [audioSyncEnabled, setAudioSyncEnabled] = useState(false);
  const [audioSyncBusy, setAudioSyncBusy] = useState(false);
  const [audioSyncError, setAudioSyncError] = useState<string | null>(null);
  const [audioMeterLevel, setAudioMeterLevel] = useState(0);
  const [tapBeatHint, setTapBeatHint] = useState<string | null>(null);
  const flashTapTimesRef = useRef<number[]>([]);
  const audioMeterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioLastBeatTsRef = useRef(0);
  const audioNoiseFloorRef = useRef(0.08);
  const flashIntervalRef = useRef(520);
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.LOW_QUALITY,
    isMeteringEnabled: true,
  });

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const [storedFlashColor, storedFlashInterval] = await Promise.all([
          AsyncStorage.getItem(STADIUM_FLASH_COLOR_KEY),
          AsyncStorage.getItem(STADIUM_FLASH_INTERVAL_KEY),
        ]);
        if (storedFlashColor === 'red' || storedFlashColor === 'white') {
          setStadiumFlashColor(storedFlashColor);
        }
        const parsedInterval = Number.parseInt(storedFlashInterval ?? '', 10);
        if (Number.isFinite(parsedInterval)) {
          const clamped = Math.max(MIN_FLASH_INTERVAL_MS, Math.min(MAX_FLASH_INTERVAL_MS, parsedInterval));
          setStadiumFlashIntervalMs(clamped);
        }
      } catch {
        // negeren
      }
    };
    void loadPreference();
  }, []);

  useEffect(() => {
    if (!stadiumFlashOpen) {
      setStadiumFlashLit(true);
      return;
    }
    setStadiumFlashLit(true);
    const interval = setInterval(() => {
      setStadiumFlashLit((prev) => !prev);
    }, stadiumFlashIntervalMs);
    return () => clearInterval(interval);
  }, [stadiumFlashOpen, stadiumFlashIntervalMs]);

  useEffect(() => {
    flashIntervalRef.current = stadiumFlashIntervalMs;
  }, [stadiumFlashIntervalMs]);

  const stopAudioSyncRecording = useCallback(async () => {
    if (audioMeterTimerRef.current) {
      clearInterval(audioMeterTimerRef.current);
      audioMeterTimerRef.current = null;
    }
    audioLastBeatTsRef.current = 0;
    audioNoiseFloorRef.current = 0.08;
    setAudioMeterLevel(0);
    try {
      await audioRecorder.stop();
    } catch {
      // negeren
    }
    try {
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      // negeren
    }
  }, [audioRecorder]);

  const onRecordingStatusUpdate = useCallback((status: RecorderState) => {
    if (!status.canRecord || !status.isRecording) return;
    if (typeof status.metering !== 'number') return;

    const normalized = Math.max(0, Math.min(1, (status.metering + 160) / 160));
    setAudioMeterLevel(normalized);

    const prevFloor = audioNoiseFloorRef.current;
    const nextFloor =
      normalized > prevFloor ? prevFloor * 0.94 + normalized * 0.06 : prevFloor * 0.9 + normalized * 0.1;
    audioNoiseFloorRef.current = nextFloor;

    const threshold = Math.max(0.17, Math.min(0.92, nextFloor + 0.18));
    const now = Date.now();
    const lastBeatTs = audioLastBeatTsRef.current;
    if (normalized >= threshold && now - lastBeatTs > 180) {
      if (lastBeatTs > 0) {
        const rawInterval = now - lastBeatTs;
        if (rawInterval >= 180 && rawInterval <= 1600) {
          const smoothed = flashIntervalRef.current * 0.65 + rawInterval * 0.35;
          const clamped = Math.max(MIN_FLASH_INTERVAL_MS, Math.min(MAX_FLASH_INTERVAL_MS, Math.round(smoothed)));
          setStadiumFlashIntervalMs(clamped);
        }
      }
      audioLastBeatTsRef.current = now;
    }
  }, []);

  const startAudioSyncRecording = useCallback(async () => {
    setAudioSyncBusy(true);
    setAudioSyncError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setAudioSyncEnabled(false);
        setAudioSyncError('Microfoon-toegang is nodig voor audio sync.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
      });

      await stopAudioSyncRecording();

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      audioMeterTimerRef.current = setInterval(() => {
        const status = audioRecorder.getStatus();
        onRecordingStatusUpdate(status);
      }, 100);
    } catch {
      setAudioSyncEnabled(false);
      setAudioSyncError('Audio sync kon niet starten. Probeer opnieuw.');
      await stopAudioSyncRecording();
    } finally {
      setAudioSyncBusy(false);
    }
  }, [audioRecorder, onRecordingStatusUpdate, stopAudioSyncRecording]);

  const persistStadiumFlashColor = async (next: FlashSeatColor) => {
    setStadiumFlashColor(next);
    try {
      await AsyncStorage.setItem(STADIUM_FLASH_COLOR_KEY, next);
    } catch {
      // negeren
    }
  };

  const persistStadiumFlashInterval = async (nextMs: number) => {
    const clamped = Math.max(MIN_FLASH_INTERVAL_MS, Math.min(MAX_FLASH_INTERVAL_MS, Math.round(nextMs)));
    setStadiumFlashIntervalMs(clamped);
    try {
      await AsyncStorage.setItem(STADIUM_FLASH_INTERVAL_KEY, `${clamped}`);
    } catch {
      // negeren
    }
  };

  const adjustFlashSpeed = (deltaMs: number) => {
    if (audioSyncEnabled) return;
    void persistStadiumFlashInterval(stadiumFlashIntervalMs + deltaMs);
  };

  const onToggleAudioSync = () => {
    setAudioSyncEnabled((prev) => !prev);
  };

  const onTapBeat = () => {
    if (audioSyncEnabled) {
      setTapBeatHint('Audio sync staat aan: handmatig tikken is uitgeschakeld.');
      return;
    }
    const now = Date.now();
    const nextTimes = [...flashTapTimesRef.current.filter((ts) => now - ts < 5000), now].slice(-6);
    flashTapTimesRef.current = nextTimes;
    if (nextTimes.length < 2) {
      setTapBeatHint('Nog 1 tik op de muziek om tempo te meten.');
      return;
    }
    let total = 0;
    for (let i = 1; i < nextTimes.length; i += 1) {
      total += nextTimes[i] - nextTimes[i - 1];
    }
    const avg = total / (nextTimes.length - 1);
    void persistStadiumFlashInterval(avg);
    const bpm = Math.round(60000 / avg);
    setTapBeatHint(`Tempo gezet op ${bpm} BPM.`);
  };

  const flashBpm = Math.round(60000 / stadiumFlashIntervalMs);
  const manualTempoLocked = audioSyncEnabled;
  const flashMainColor = stadiumFlashColor === 'white' ? '#FFFFFF' : Ajax.red;
  const flashScreenColor = stadiumFlashLit ? flashMainColor : '#000000';
  const flashTextDark = stadiumFlashLit && stadiumFlashColor === 'white';
  const flashTitleColor = flashTextDark ? '#111111' : '#FFD369';
  const flashSubColor = flashTextDark ? '#333333' : '#FFFFFF';

  useEffect(() => {
    if (!stadiumFlashOpen || !audioSyncEnabled) {
      void stopAudioSyncRecording();
      return;
    }
    void startAudioSyncRecording();
    return () => {
      void stopAudioSyncRecording();
    };
  }, [audioSyncEnabled, stadiumFlashOpen, startAudioSyncRecording, stopAudioSyncRecording]);

  useEffect(() => {
    return () => {
      void stopAudioSyncRecording();
    };
  }, [stopAudioSyncRecording]);

  useEffect(() => {
    if (!tapBeatHint) return;
    const timer = setTimeout(() => setTapBeatHint(null), 1800);
    return () => clearTimeout(timer);
  }, [tapBeatHint]);

  return (
    <>
      <View style={styles.flashCard}>
        <Text style={styles.flashCardTitle}>Stadion flits op muziek</Text>
        <Text style={styles.flashCardSubtitle}>
          Kies de kleur van je zitplaats en laat je scherm meedoen in het publiek. Deze stadionfunctie staat open voor alle supporters.
        </Text>
        <View style={styles.flashColorRow}>
          <TouchableOpacity
            style={[
              styles.flashColorBtn,
              styles.flashColorBtnRed,
              stadiumFlashColor === 'red' ? styles.flashColorBtnActive : null,
            ]}
            onPress={() => void persistStadiumFlashColor('red')}
            activeOpacity={0.9}
          >
            <Text style={styles.flashColorBtnText}>Rood</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.flashColorBtn,
              styles.flashColorBtnWhite,
              stadiumFlashColor === 'white' ? styles.flashColorBtnActive : null,
            ]}
            onPress={() => void persistStadiumFlashColor('white')}
            activeOpacity={0.9}
          >
            <Text style={[styles.flashColorBtnText, styles.flashColorBtnTextWhite]}>Wit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.flashTempoRow}>
          <TouchableOpacity
            style={[styles.flashTempoBtn, manualTempoLocked ? styles.flashControlDisabled : null]}
            onPress={() => adjustFlashSpeed(40)}
            activeOpacity={0.9}
            disabled={manualTempoLocked}
          >
            <Text style={styles.flashTempoBtnText}>Langzamer</Text>
          </TouchableOpacity>
          <Text style={styles.flashTempoLabel}>
            {flashBpm} BPM{manualTempoLocked ? ' AUTO' : ''}
          </Text>
          <TouchableOpacity
            style={[styles.flashTempoBtn, manualTempoLocked ? styles.flashControlDisabled : null]}
            onPress={() => adjustFlashSpeed(-40)}
            activeOpacity={0.9}
            disabled={manualTempoLocked}
          >
            <Text style={styles.flashTempoBtnText}>Sneller</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.audioSyncBtn,
            audioSyncEnabled ? styles.audioSyncBtnOn : styles.audioSyncBtnOff,
            audioSyncBusy ? styles.audioSyncBtnBusy : null,
          ]}
          onPress={onToggleAudioSync}
          activeOpacity={0.9}
          disabled={audioSyncBusy}
        >
          <Text style={[styles.audioSyncBtnText, audioSyncEnabled ? styles.audioSyncBtnTextOn : styles.audioSyncBtnTextOff]}>
            {audioSyncBusy ? 'Microfoon starten...' : `Audio sync: ${audioSyncEnabled ? 'AAN' : 'UIT'}`}
          </Text>
        </TouchableOpacity>
        {audioSyncEnabled ? (
          <Text style={styles.audioSyncMeterText}>
            Mic: {Math.round(audioMeterLevel * 100)}% {stadiumFlashOpen ? '• live sync actief' : '• start flits om te syncen'}
          </Text>
        ) : null}
        {audioSyncError ? <Text style={styles.audioSyncErrorText}>{audioSyncError}</Text> : null}
        {manualTempoLocked ? (
          <Text style={styles.audioSyncLockText}>Audio sync staat aan: snelheid wordt automatisch bepaald.</Text>
        ) : null}
        <View style={styles.flashActionRow}>
          <TouchableOpacity
            style={[styles.flashTapBtn, manualTempoLocked ? styles.flashControlDisabled : null]}
            onPress={onTapBeat}
            activeOpacity={0.9}
          >
            <Text style={styles.flashTapBtnText}>Tik op muziek</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.flashStartBtn, stadiumFlashOpen ? styles.flashStopBtn : null]}
            onPress={() => setStadiumFlashOpen((prev) => !prev)}
            activeOpacity={0.9}
          >
            <Text style={styles.flashStartBtnText}>{stadiumFlashOpen ? 'Stop flits' : 'Start flits'}</Text>
          </TouchableOpacity>
        </View>
        {tapBeatHint ? <Text style={styles.tapBeatHintText}>{tapBeatHint}</Text> : null}
      </View>

      <Modal visible={stadiumFlashOpen} transparent={false} animationType="fade" onRequestClose={() => setStadiumFlashOpen(false)}>
        <TouchableOpacity
          style={[styles.flashFullscreen, { backgroundColor: flashScreenColor }]}
          activeOpacity={1}
          onPress={() => setStadiumFlashOpen(false)}
        >
          <Text style={[styles.flashFullscreenTitle, { color: flashTitleColor }]}>ALL-INN AJAX LIGHTSHOW</Text>
          <Text style={[styles.flashFullscreenSubtitle, { color: flashSubColor }]}>
            {stadiumFlashColor === 'red' ? 'ROOD VAK' : 'WIT VAK'} • {flashBpm} BPM
          </Text>
          <View style={styles.flashFullscreenHintWrap}>
            <Text style={styles.flashFullscreenHint}>Tik op het scherm om te stoppen</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    flashCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.2,
      borderColor: Ajax.red,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    flashCardTitle: {
      color: '#111111',
      fontSize: 15,
      fontWeight: '900',
    },
    flashCardSubtitle: {
      color: '#555555',
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '700',
    },
    flashColorRow: {
      flexDirection: 'row',
      gap: 8,
    },
    flashColorBtn: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.2,
    },
    flashColorBtnRed: {
      backgroundColor: Ajax.red,
      borderColor: Ajax.red,
    },
    flashColorBtnWhite: {
      backgroundColor: '#FFFFFF',
      borderColor: '#111111',
    },
    flashColorBtnActive: {
      transform: [{ scale: 1.01 }],
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    flashColorBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },
    flashColorBtnTextWhite: {
      color: '#111111',
    },
    flashTempoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    flashTempoBtn: {
      flex: 1,
      backgroundColor: Ajax.red,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flashTempoBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    flashTempoLabel: {
      minWidth: 92,
      textAlign: 'center',
      color: '#111111',
      fontSize: 12,
      fontWeight: '900',
    },
    flashControlDisabled: {
      opacity: 0.45,
    },
    audioSyncBtn: {
      borderRadius: 10,
      borderWidth: 1.2,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    audioSyncBtnOn: {
      backgroundColor: '#101010',
      borderColor: '#101010',
    },
    audioSyncBtnOff: {
      backgroundColor: '#FFFFFF',
      borderColor: Ajax.red,
    },
    audioSyncBtnBusy: {
      opacity: 0.7,
    },
    audioSyncBtnText: {
      fontSize: 13,
      fontWeight: '900',
    },
    audioSyncBtnTextOn: {
      color: '#FFD369',
    },
    audioSyncBtnTextOff: {
      color: Ajax.red,
    },
    audioSyncMeterText: {
      color: '#111111',
      fontSize: 11,
      fontWeight: '700',
    },
    audioSyncErrorText: {
      color: Ajax.red,
      fontSize: 11,
      fontWeight: '800',
    },
    audioSyncLockText: {
      color: '#555555',
      fontSize: 11,
      fontWeight: '700',
    },
    flashActionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    flashTapBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      backgroundColor: '#FFFFFF',
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flashTapBtnText: {
      color: Ajax.red,
      fontSize: 12,
      fontWeight: '900',
    },
    flashStartBtn: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: Ajax.red,
      borderWidth: 1.2,
      borderColor: Ajax.red,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flashStopBtn: {
      backgroundColor: '#111111',
      borderColor: '#111111',
    },
    flashStartBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    tapBeatHintText: {
      color: '#555555',
      fontSize: 11,
      fontWeight: '700',
    },
    flashFullscreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    flashFullscreenTitle: {
      fontSize: 28,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 10,
    },
    flashFullscreenSubtitle: {
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    flashFullscreenHintWrap: {
      position: 'absolute',
      bottom: 48,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    flashFullscreenHint: {
      color: isDark ? '#FFFFFF' : '#FFF7D1',
      fontSize: 13,
      fontWeight: '800',
    },
  });
}
