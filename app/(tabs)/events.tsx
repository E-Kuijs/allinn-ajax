import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StadiumFlashCard } from '@/components/stadium-flash-card';
import { Ajax } from '@/constants/theme';
import { notifyLineupPublished, scheduleMatchPushes } from '@/src/core/push-notifications';

type MatchStatus = 'upcoming' | 'finished';

type MatchItem = {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoffLabel: string;
  kickoffTs: number;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
};

type LeagueUpcomingItem = {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoffLabel: string;
  kickoffTs: number;
};

type LiveMatchItem = {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  statusLabel: string;
  kickoffTs: number;
};

type GoalSnapshot = {
  homeScore: number;
  awayScore: number;
  latestGoalKey: string | null;
};

type AjaxGoalAlertItem = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  scorerName: string | null;
  scoringTeam: string | null;
  goalKey: string | null;
};

type LineupData = {
  eventId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  homePlayers: string[];
  awayPlayers: string[];
  statusText: string;
};

type StandingRow = {
  rank: number;
  team: string;
  wins: number;
  goalDiff: number;
  points: number;
};

const AJAX_TEAM_ID = '139';
const FOLLOW_LIVE_SCORES_KEY = 'events:follow-live-scores';
const EREDIVISIE_STANDINGS_URLS = [
  'https://site.api.espn.com/apis/site/v2/sports/soccer/ned.1/standings',
  'https://site.api.espn.com/apis/v2/sports/soccer/ned.1/standings',
];
const EREDIVISIE_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/ned.1/scoreboard';

type ActiveView = 'upcoming' | 'results' | 'standings' | 'program' | 'live' | 'lineup';

export default function EventsScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [activeView, setActiveView] = useState<ActiveView>('upcoming');
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [leagueUpcoming, setLeagueUpcoming] = useState<LeagueUpcomingItem[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatchItem[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [lineupData, setLineupData] = useState<LineupData | null>(null);
  const [lineupLoading, setLineupLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [followLiveScores, setFollowLiveScores] = useState(true);
  const [nowTs, setNowTs] = useState(Date.now());
  const ajaxGoalSnapshotRef = useRef<Record<string, GoalSnapshot>>({});
  const hasBootstrappedGoalSnapshotsRef = useRef(false);

  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'upcoming')
        .sort((a, b) => a.kickoffTs - b.kickoffTs)
        .slice(0, 10),
    [matches]
  );
  const results = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'finished')
        .sort((a, b) => b.kickoffTs - a.kickoffTs)
        .slice(0, 10),
    [matches]
  );
  const nextAjaxMatch = useMemo(() => upcoming[0] ?? null, [upcoming]);
  const nextAjaxCountdown = useMemo(() => {
    if (!nextAjaxMatch) return 'Geen aankomende Ajax wedstrijd';
    return formatAjaxKickoffCountdown(nextAjaxMatch.kickoffTs, nowTs);
  }, [nextAjaxMatch, nowTs]);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setLoadError(null);

    try {
      const [standingsJson, matchesRes] = await Promise.all([fetchStandingsPayload(), fetch(buildScoreboardUrl())]);

      if (!matchesRes.ok) {
        throw new Error('Kon wedstrijddata niet ophalen.');
      }

      const matchesJson = await matchesRes.json();
      const parsedStandings = parseStandings(standingsJson);
      const parsedMatches = parseAjaxMatches(matchesJson);
      const parsedLeagueUpcoming = parseLeagueUpcomingMatches(matchesJson);
      const parsedLiveMatches = parseLiveMatches(matchesJson);
      const ajaxGoalAlerts = parseAjaxGoalAlerts(matchesJson);

      if (!hasBootstrappedGoalSnapshotsRef.current) {
        ajaxGoalSnapshotRef.current = buildAjaxGoalSnapshotMap(ajaxGoalAlerts);
        hasBootstrappedGoalSnapshotsRef.current = true;
      } else if (followLiveScores) {
        const nextSnapshot = buildAjaxGoalSnapshotMap(ajaxGoalAlerts);
        const previousSnapshot = ajaxGoalSnapshotRef.current;
        const triggeredAlerts: AjaxGoalAlertItem[] = [];

        ajaxGoalAlerts.forEach((item) => {
          const prev = previousSnapshot[item.matchId];
          if (!prev) return;
          const prevTotal = prev.homeScore + prev.awayScore;
          const nextTotal = item.homeScore + item.awayScore;
          const hasNewGoal = nextTotal > prevTotal;
          const changedGoalKey = !!item.goalKey && item.goalKey !== prev.latestGoalKey;
          if (hasNewGoal && (changedGoalKey || !prev.latestGoalKey)) {
            triggeredAlerts.push(item);
          }
        });

        ajaxGoalSnapshotRef.current = nextSnapshot;

        triggeredAlerts.forEach((item) => {
          const scorerLabel = item.scorerName?.trim() || 'Doelpuntenmaker onbekend';
          const teamLabel = item.scoringTeam?.trim() || 'Doelpunt';
          Alert.alert(
            'Doelpunt!',
            `${teamLabel}\n${scorerLabel}\nStand: ${item.homeTeam} ${item.homeScore} - ${item.awayScore} ${item.awayTeam}`
          );
        });
      } else {
        ajaxGoalSnapshotRef.current = buildAjaxGoalSnapshotMap(ajaxGoalAlerts);
      }

      setStandings(parsedStandings);
      setMatches(parsedMatches);
      setLeagueUpcoming(parsedLeagueUpcoming);
      setLiveMatches(parsedLiveMatches);

      const nextUpcomingMatch = parsedMatches
        .filter((match) => match.status === 'upcoming')
        .sort((a, b) => a.kickoffTs - b.kickoffTs)[0];
      await scheduleMatchPushes(
        nextUpcomingMatch
          ? {
              id: nextUpcomingMatch.id,
              homeTeam: nextUpcomingMatch.homeTeam,
              awayTeam: nextUpcomingMatch.awayTeam,
              kickoffTs: nextUpcomingMatch.kickoffTs,
            }
          : null
      );

      const lineupTarget = pickLineupTarget(parsedMatches);
      if (lineupTarget) {
        setLineupLoading(true);
        const lineup = await fetchLineupForEvent(
          lineupTarget.id,
          lineupTarget.homeTeam,
          lineupTarget.awayTeam,
          lineupTarget.kickoffLabel
        );
        setLineupData(lineup);
        if (lineup && (lineup.homePlayers.length || lineup.awayPlayers.length)) {
          await notifyLineupPublished({
            eventId: lineup.eventId,
            homeTeam: lineup.homeTeam,
            awayTeam: lineup.awayTeam,
          });
        }
        setLineupLoading(false);
      } else {
        setLineupData(null);
        setLineupLoading(false);
      }
      setLastUpdatedAt(
        new Intl.DateTimeFormat('nl-NL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date())
      );
    } catch {
      setLoadError('Live data kon niet worden geladen. Controleer internetverbinding.');
      setLineupLoading(false);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [followLiveScores]);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(FOLLOW_LIVE_SCORES_KEY);
        if (stored === '0') setFollowLiveScores(false);
        if (stored === '1') setFollowLiveScores(true);
      } catch {
        // negeren
      }
    };
    void loadPreference();
  }, []);

  const toggleFollowLiveScores = async () => {
    const next = !followLiveScores;
    setFollowLiveScores(next);
    try {
      await AsyncStorage.setItem(FOLLOW_LIVE_SCORES_KEY, next ? '1' : '0');
    } catch {
      // negeren
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (!followLiveScores) return;
    const interval = setInterval(() => {
      void loadData({ silent: true });
    }, 30000);
    return () => clearInterval(interval);
  }, [followLiveScores, loadData]);

  useEffect(() => {
    const requested = `${params.view ?? ''}`.toLowerCase();
    if (requested === 'program') {
      setActiveView('program');
      return;
    }
    if (requested === 'lineup') {
      setActiveView('lineup');
      return;
    }
    if (requested === 'live') {
      setActiveView('live');
      return;
    }
  }, [params.view]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Ajax.red]} />}
    >
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          {lastUpdatedAt ? `Live bijgewerkt: ${lastUpdatedAt}` : 'Wedstrijden en standen live laden...'}
        </Text>
      </View>
      <View style={styles.nextMatchBanner}>
        <Text style={styles.nextMatchCaption}>Volgende wedstrijd</Text>
        <Text style={styles.nextMatchTeams}>
          {nextAjaxMatch ? `${nextAjaxMatch.homeTeam} vs ${nextAjaxMatch.awayTeam}` : 'Nog niet beschikbaar'}
        </Text>
        <Text style={styles.nextMatchCountdown}>{nextAjaxCountdown}</Text>
      </View>
      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
      <View style={styles.topControlRow}>
        <TouchableOpacity
          style={[styles.followLiveBtn, followLiveScores ? styles.followLiveBtnOn : styles.followLiveBtnOff]}
          onPress={() => void toggleFollowLiveScores()}
          activeOpacity={0.9}
        >
          <Text style={[styles.followLiveBtnText, followLiveScores ? styles.followLiveBtnTextOn : styles.followLiveBtnTextOff]}>
            Live score meldingen: {followLiveScores ? 'AAN' : 'UIT'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.refreshBtn, (refreshing || loading) ? styles.refreshBtnDisabled : null]}
          onPress={() => void onRefresh()}
          disabled={refreshing || loading}
        >
          <Text style={styles.refreshBtnText}>{refreshing || loading ? 'Verversen...' : 'Ververs'}</Text>
        </TouchableOpacity>
      </View>

      <StadiumFlashCard />

      <View style={styles.segmentRow}>
        <View style={styles.segmentLine}>
          <SegmentButton
            label="Aankomend"
            active={activeView === 'upcoming'}
            onPress={() => setActiveView('upcoming')}
          />
          <SegmentButton
            label="Uitslagen"
            active={activeView === 'results'}
            onPress={() => setActiveView('results')}
          />
          <SegmentButton
            label="Standen"
            active={activeView === 'standings'}
            onPress={() => setActiveView('standings')}
          />
        </View>
        <View style={styles.segmentLine}>
          <SegmentButton
            label="Programma"
            active={activeView === 'program'}
            onPress={() => setActiveView('program')}
          />
          <SegmentButton
            label="Live"
            active={activeView === 'live'}
            onPress={() => setActiveView('live')}
          />
          <SegmentButton
            label="Opstelling"
            active={activeView === 'lineup'}
            onPress={() => setActiveView('lineup')}
          />
        </View>
      </View>

      {activeView === 'standings' ? (
        <View style={styles.standingsWrap}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colRank]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colTeam]}>Team</Text>
            <Text style={[styles.tableHeaderText, styles.colWins]}>W</Text>
            <Text style={[styles.tableHeaderText, styles.colGd]}>GD</Text>
            <Text style={[styles.tableHeaderText, styles.colPts]}>P</Text>
          </View>
          {loading ? (
            <Text style={styles.emptyText}>Standen laden...</Text>
          ) : standings.length ? (
            standings.map((row) => (
              <View key={`${row.rank}-${row.team}`} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colRank]}>{row.rank}</Text>
                <Text style={[styles.tableCell, styles.colTeam]}>{row.team}</Text>
                <Text style={[styles.tableCell, styles.colWins]}>{row.wins}</Text>
                <Text style={[styles.tableCell, styles.colGd]}>
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </Text>
                <Text style={[styles.tableCell, styles.colPts, styles.pointsText]}>{row.points}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Nog geen standgegevens gevonden.</Text>
          )}
        </View>
      ) : null}

      {activeView === 'upcoming' ? (
        <View style={styles.listWrap}>
          {loading ? (
            <Text style={styles.emptyText}>Wedstrijden laden...</Text>
          ) : upcoming.length ? (
            upcoming.map((match) => (
              <View key={match.id} style={styles.matchCard}>
                <Text style={styles.competitionPill}>{match.competition}</Text>
                <Text style={styles.matchTeams}>
                  {match.homeTeam} vs {match.awayTeam}
                </Text>
                <Text style={styles.kickoffText}>{match.kickoffLabel}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Geen aankomende Ajax wedstrijden gevonden.</Text>
          )}
        </View>
      ) : null}

      {activeView === 'results' ? (
        <View style={styles.listWrap}>
          {loading ? (
            <Text style={styles.emptyText}>Uitslagen laden...</Text>
          ) : results.length ? (
            results.map((match) => (
              <View key={match.id} style={styles.matchCard}>
                <Text style={styles.competitionPill}>{match.competition}</Text>
                <Text style={styles.matchTeams}>
                  {match.homeTeam} {match.homeScore ?? 0} - {match.awayScore ?? 0} {match.awayTeam}
                </Text>
                <Text style={styles.kickoffText}>{match.kickoffLabel}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Nog geen recente Ajax uitslagen gevonden.</Text>
          )}
        </View>
      ) : null}

      {activeView === 'program' ? (
        <View style={styles.listWrap}>
          {loading ? (
            <Text style={styles.emptyText}>Programma laden...</Text>
          ) : leagueUpcoming.length ? (
            leagueUpcoming.map((match) => (
              <View key={match.id} style={styles.matchCard}>
                <Text style={styles.competitionPill}>{match.competition}</Text>
                <Text style={styles.matchTeams}>
                  {match.homeTeam} vs {match.awayTeam}
                </Text>
                <Text style={styles.kickoffText}>{match.kickoffLabel}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Geen aankomend programma gevonden.</Text>
          )}
        </View>
      ) : null}

      {activeView === 'live' ? (
        <View style={styles.listWrap}>
          {!followLiveScores ? (
            <Text style={styles.emptyText}>Live volgen staat uit. Zet &quot;Volg live scores&quot; op AAN.</Text>
          ) : loading ? (
            <Text style={styles.emptyText}>Live wedstrijden laden...</Text>
          ) : liveMatches.length ? (
            liveMatches.map((match) => (
              <View key={match.id} style={styles.matchCard}>
                <View style={styles.liveHeaderRow}>
                  <Text style={styles.competitionPill}>{match.competition}</Text>
                  <Text style={styles.liveBadge}>{match.statusLabel}</Text>
                </View>
                <Text style={styles.matchTeams}>
                  {match.homeTeam} {match.homeScore} - {match.awayScore} {match.awayTeam}
                </Text>
                <Text style={styles.kickoffText}>
                  Aftrap: {new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' }).format(new Date(match.kickoffTs))}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Er zijn nu geen live Eredivisie-wedstrijden.</Text>
          )}
        </View>
      ) : null}

      {activeView === 'lineup' ? (
        <View style={styles.listWrap}>
          {lineupLoading ? (
            <Text style={styles.emptyText}>Opstelling laden...</Text>
          ) : lineupData ? (
            <View style={styles.lineupCard}>
              <Text style={styles.lineupTitle}>{lineupData.title}</Text>
              <Text style={styles.lineupStatus}>{lineupData.statusText}</Text>
              <View style={styles.lineupColumns}>
                <View style={styles.lineupColumn}>
                  <Text style={styles.lineupTeamTitle}>{lineupData.homeTeam}</Text>
                  {lineupData.homePlayers.length ? (
                    lineupData.homePlayers.map((name, idx) => (
                      <Text key={`${lineupData.eventId}-home-${idx}`} style={styles.lineupPlayer}>
                        {idx + 1}. {name}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.lineupEmpty}>Nog niet bekend.</Text>
                  )}
                </View>
                <View style={styles.lineupDivider} />
                <View style={styles.lineupColumn}>
                  <Text style={styles.lineupTeamTitle}>{lineupData.awayTeam}</Text>
                  {lineupData.awayPlayers.length ? (
                    lineupData.awayPlayers.map((name, idx) => (
                      <Text key={`${lineupData.eventId}-away-${idx}`} style={styles.lineupPlayer}>
                        {idx + 1}. {name}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.lineupEmpty}>Nog niet bekend.</Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Nog geen opstelling beschikbaar.</Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

function buildScoreboardUrl() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 45);
  const to = new Date(now);
  to.setDate(to.getDate() + 60);

  const format = (d: Date) => {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}${m}${day}`;
  };

  return `${EREDIVISIE_SCOREBOARD_URL}?limit=300&dates=${format(from)}-${format(to)}`;
}

function pickLineupTarget(matches: MatchItem[]): MatchItem | null {
  if (!matches.length) return null;
  const now = Date.now();
  const upcomingOrLive = matches
    .filter((m) => m.status !== 'finished')
    .sort((a, b) => a.kickoffTs - b.kickoffTs);

  const nearNow = upcomingOrLive.find((m) => m.kickoffTs >= now - 4 * 60 * 60 * 1000);
  if (nearNow) return nearNow;
  return upcomingOrLive[0] ?? null;
}

async function fetchLineupForEvent(
  eventId: string,
  homeTeam: string,
  awayTeam: string,
  kickoffLabel: string
): Promise<LineupData | null> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/ned.1/summary?event=${eventId}`;
    const res = await fetch(url);
    if (!res.ok) {
      return {
        eventId,
        title: `${homeTeam} vs ${awayTeam}`,
        homeTeam,
        awayTeam,
        homePlayers: [],
        awayPlayers: [],
        statusText: `Nog niet bekend. (${kickoffLabel})`,
      };
    }
    const payload = await res.json();
    const parsed = parseLineupFromSummary(payload, homeTeam, awayTeam);
    return {
      eventId,
      title: `${homeTeam} vs ${awayTeam}`,
      homeTeam,
      awayTeam,
      homePlayers: parsed.homePlayers,
      awayPlayers: parsed.awayPlayers,
      statusText: parsed.statusText || `Aftrap: ${kickoffLabel}`,
    };
  } catch {
    return {
      eventId,
      title: `${homeTeam} vs ${awayTeam}`,
      homeTeam,
      awayTeam,
      homePlayers: [],
      awayPlayers: [],
      statusText: `Nog niet bekend. (${kickoffLabel})`,
    };
  }
}

function parseLineupFromSummary(
  payload: unknown,
  fallbackHomeTeam: string,
  fallbackAwayTeam: string
): { homePlayers: string[]; awayPlayers: string[]; statusText: string } {
  const json = (payload ?? {}) as {
    header?: {
      competitions?: {
        status?: { type?: { shortDetail?: string | null; description?: string | null } | null } | null;
        competitors?: {
          homeAway?: 'home' | 'away' | string;
          team?: { displayName?: string | null } | null;
        }[] | null;
      }[] | null;
    } | null;
    lineups?: {
      team?: { displayName?: string | null } | null;
      formation?: string | null;
      startXI?: { athlete?: { displayName?: string | null; shortName?: string | null } | null }[] | null;
      starters?: { athlete?: { displayName?: string | null; shortName?: string | null } | null }[] | null;
      startingXI?: { athlete?: { displayName?: string | null; shortName?: string | null } | null }[] | null;
    }[] | null;
    boxscore?: {
      players?: {
        team?: { displayName?: string | null } | null;
        statistics?: {
          name?: string | null;
          label?: string | null;
          displayName?: string | null;
          athletes?: { athlete?: { displayName?: string | null; shortName?: string | null } | null }[] | null;
        }[] | null;
      }[] | null;
    } | null;
  };

  const comp = json.header?.competitions?.[0];
  const statusText =
    comp?.status?.type?.shortDetail?.trim() || comp?.status?.type?.description?.trim() || 'Opstelling';
  const compHome = comp?.competitors?.find((c) => c.homeAway === 'home')?.team?.displayName?.trim();
  const compAway = comp?.competitors?.find((c) => c.homeAway === 'away')?.team?.displayName?.trim();
  const homeTeam = compHome || fallbackHomeTeam;
  const awayTeam = compAway || fallbackAwayTeam;

  const lineups = Array.isArray(json.lineups) ? json.lineups : [];
  const findLineupByTeam = (teamName: string) =>
    lineups.find((row) => {
      const rowName = row.team?.displayName?.trim().toLowerCase() || '';
      return rowName && teamName.trim().toLowerCase() === rowName;
    });

  const homeLineup = findLineupByTeam(homeTeam);
  const awayLineup = findLineupByTeam(awayTeam);

  const toNamesFromLineup = (lineup: (typeof lineups)[number] | undefined): string[] => {
    if (!lineup) return [];
    const primary =
      lineup.startXI ?? lineup.startingXI ?? lineup.starters ?? [];
    return primary
      .map((row) => row.athlete?.displayName?.trim() || row.athlete?.shortName?.trim() || '')
      .filter((name): name is string => !!name);
  };

  let homePlayers = toNamesFromLineup(homeLineup);
  let awayPlayers = toNamesFromLineup(awayLineup);

  if (!homePlayers.length || !awayPlayers.length) {
    const boxPlayers = Array.isArray(json.boxscore?.players) ? json.boxscore?.players : [];
    const getFromBox = (teamName: string) => {
      const teamRow = boxPlayers.find((row) => {
        const rowName = row.team?.displayName?.trim().toLowerCase() || '';
        return rowName && rowName === teamName.trim().toLowerCase();
      });
      if (!teamRow || !Array.isArray(teamRow.statistics)) return [];
      const starterStat = teamRow.statistics.find((stat) => {
        const name = `${stat.name ?? ''}`.toLowerCase();
        const label = `${stat.label ?? ''}`.toLowerCase();
        const display = `${stat.displayName ?? ''}`.toLowerCase();
        return name.includes('starter') || label.includes('starter') || display.includes('starter');
      });
      const athletes = Array.isArray(starterStat?.athletes) ? starterStat?.athletes ?? [] : [];
      return athletes
        .map((row) => row.athlete?.displayName?.trim() || row.athlete?.shortName?.trim() || '')
        .filter((name): name is string => !!name);
    };
    if (!homePlayers.length) homePlayers = getFromBox(homeTeam);
    if (!awayPlayers.length) awayPlayers = getFromBox(awayTeam);
  }

  return { homePlayers, awayPlayers, statusText };
}

async function fetchStandingsPayload(): Promise<unknown> {
  for (const url of EREDIVISIE_STANDINGS_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = (await res.json()) as unknown;
      if (parseStandings(json).length > 0) return json;
    } catch {
      // probeer volgend endpoint
    }
  }
  throw new Error('Kon actuele standen niet ophalen.');
}

function formatKickoffLabel(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '-';
  const datePart = new Intl.DateTimeFormat('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${datePart} · ${timePart}`;
}

function parseAjaxMatches(payload: unknown): MatchItem[] {
  const json = (payload ?? {}) as {
    events?: {
      id?: string;
      date?: string;
      competitions?: {
        status?: { type?: { completed?: boolean | null; state?: string | null } | null } | null;
        competitors?: {
          homeAway?: 'home' | 'away' | string;
          score?: string | null;
          team?: { id?: string | null; displayName?: string | null; abbreviation?: string | null } | null;
        }[] | null;
      }[] | null;
      competitionsName?: string | null;
      league?: { name?: string | null } | null;
      shortName?: string | null;
      name?: string | null;
    }[];
  };

  const events = Array.isArray(json.events) ? json.events : [];
  const now = Date.now();

  const rows = events
    .map((event) => {
      const competition = event.competitions?.[0];
      const competitors = Array.isArray(competition?.competitors) ? competition?.competitors ?? [] : [];

      const home = competitors.find((c) => c.homeAway === 'home');
      const away = competitors.find((c) => c.homeAway === 'away');
      if (!home || !away) return null;

      const homeId = `${home.team?.id ?? ''}`.trim();
      const awayId = `${away.team?.id ?? ''}`.trim();
      const homeAbr = `${home.team?.abbreviation ?? ''}`.trim().toUpperCase();
      const awayAbr = `${away.team?.abbreviation ?? ''}`.trim().toUpperCase();
      const hasAjax =
        homeId === AJAX_TEAM_ID || awayId === AJAX_TEAM_ID || homeAbr === 'AJA' || awayAbr === 'AJA';
      if (!hasAjax) return null;

      const ts = new Date(event.date ?? '').getTime();
      const completed =
        competition?.status?.type?.completed === true || competition?.status?.type?.state === 'post';
      const inferredFinished = completed || (Number.isFinite(ts) && ts < now - 2 * 60 * 60 * 1000);
      const homeScore = Number.parseInt(home.score ?? '', 10);
      const awayScore = Number.parseInt(away.score ?? '', 10);

      const row: MatchItem = {
        id: event.id ?? `${homeId}-${awayId}-${event.date ?? ''}`,
        competition: event.league?.name?.trim() || event.shortName?.trim() || 'Eredivisie',
        homeTeam: home.team?.displayName?.trim() || 'Thuis',
        awayTeam: away.team?.displayName?.trim() || 'Uit',
        kickoffLabel: formatKickoffLabel(event.date ?? ''),
        kickoffTs: Number.isFinite(ts) ? ts : 0,
        status: inferredFinished ? 'finished' : 'upcoming',
      };
      if (Number.isFinite(homeScore)) row.homeScore = homeScore;
      if (Number.isFinite(awayScore)) row.awayScore = awayScore;
      return row;
    })
    .filter((item): item is MatchItem => !!item);

  return rows;
}

function formatAjaxKickoffCountdown(kickoffTs: number, nowTs: number): string {
  if (!Number.isFinite(kickoffTs) || kickoffTs <= 0) return 'Tijd nog niet bekend';
  const delta = kickoffTs - nowTs;
  if (delta <= 0 && delta >= -2 * 60 * 60 * 1000) return 'LIVE';
  if (delta < -2 * 60 * 60 * 1000) return 'Afgelopen';

  const totalMinutes = Math.max(0, Math.ceil(delta / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `Nog ${hours} uur ${minutes} min tot aftrap`;
}

function parseLeagueUpcomingMatches(payload: unknown): LeagueUpcomingItem[] {
  const json = (payload ?? {}) as {
    events?: {
      id?: string;
      date?: string;
      shortName?: string | null;
      league?: { name?: string | null } | null;
      competitions?: {
        status?: { type?: { completed?: boolean | null; state?: string | null } | null } | null;
        competitors?: {
          homeAway?: 'home' | 'away' | string;
          team?: { displayName?: string | null } | null;
        }[] | null;
      }[] | null;
    }[];
  };

  const now = Date.now();
  const events = Array.isArray(json.events) ? json.events : [];
  const rows = events
    .map((event) => {
      const competition = event.competitions?.[0];
      const competitors = Array.isArray(competition?.competitors) ? competition?.competitors ?? [] : [];
      const home = competitors.find((c) => c.homeAway === 'home');
      const away = competitors.find((c) => c.homeAway === 'away');
      if (!home || !away) return null;

      const ts = new Date(event.date ?? '').getTime();
      if (!Number.isFinite(ts)) return null;
      const completed =
        competition?.status?.type?.completed === true || competition?.status?.type?.state === 'post';
      if (completed || ts < now - 2 * 60 * 60 * 1000) return null;

      return {
        id: event.id ?? `${home.team?.displayName ?? 'thuis'}-${away.team?.displayName ?? 'uit'}-${event.date ?? ''}`,
        competition: event.league?.name?.trim() || event.shortName?.trim() || 'Eredivisie',
        homeTeam: home.team?.displayName?.trim() || 'Thuis',
        awayTeam: away.team?.displayName?.trim() || 'Uit',
        kickoffLabel: formatKickoffLabel(event.date ?? ''),
        kickoffTs: ts,
      } satisfies LeagueUpcomingItem;
    })
    .filter((row): row is LeagueUpcomingItem => !!row)
    .sort((a, b) => a.kickoffTs - b.kickoffTs)
    .slice(0, 40);

  return rows;
}

function parseLiveMatches(payload: unknown): LiveMatchItem[] {
  const json = (payload ?? {}) as {
    events?: {
      id?: string;
      date?: string;
      shortName?: string | null;
      league?: { name?: string | null } | null;
      status?: {
        type?: {
          state?: string | null;
          shortDetail?: string | null;
          description?: string | null;
        } | null;
      } | null;
      competitions?: {
        status?: {
          type?: {
            state?: string | null;
            shortDetail?: string | null;
            description?: string | null;
          } | null;
        } | null;
        competitors?: {
          homeAway?: 'home' | 'away' | string;
          score?: string | null;
          team?: { displayName?: string | null } | null;
        }[] | null;
      }[] | null;
    }[];
  };

  const events = Array.isArray(json.events) ? json.events : [];

  return events
    .map((event) => {
      const competition = event.competitions?.[0];
      const competitors = Array.isArray(competition?.competitors) ? competition?.competitors ?? [] : [];
      const home = competitors.find((c) => c.homeAway === 'home');
      const away = competitors.find((c) => c.homeAway === 'away');
      if (!home || !away) return null;

      const statusObj = competition?.status?.type ?? event.status?.type;
      const state = `${statusObj?.state ?? ''}`.toLowerCase();
      const isLive = state === 'in';
      if (!isLive) return null;

      const ts = new Date(event.date ?? '').getTime();
      const homeScore = Number.parseInt(home.score ?? '0', 10);
      const awayScore = Number.parseInt(away.score ?? '0', 10);

      return {
        id: event.id ?? `${home.team?.displayName ?? 'thuis'}-${away.team?.displayName ?? 'uit'}-${event.date ?? ''}`,
        competition: event.league?.name?.trim() || event.shortName?.trim() || 'Eredivisie',
        homeTeam: home.team?.displayName?.trim() || 'Thuis',
        awayTeam: away.team?.displayName?.trim() || 'Uit',
        homeScore: Number.isFinite(homeScore) ? homeScore : 0,
        awayScore: Number.isFinite(awayScore) ? awayScore : 0,
        statusLabel: statusObj?.shortDetail?.trim() || statusObj?.description?.trim() || 'Live',
        kickoffTs: Number.isFinite(ts) ? ts : Date.now(),
      } satisfies LiveMatchItem;
    })
    .filter((row): row is LiveMatchItem => !!row)
    .sort((a, b) => a.kickoffTs - b.kickoffTs);
}

function buildAjaxGoalSnapshotMap(items: AjaxGoalAlertItem[]): Record<string, GoalSnapshot> {
  const snapshot: Record<string, GoalSnapshot> = {};
  items.forEach((item) => {
    snapshot[item.matchId] = {
      homeScore: item.homeScore,
      awayScore: item.awayScore,
      latestGoalKey: item.goalKey,
    };
  });
  return snapshot;
}

function parseAjaxGoalAlerts(payload: unknown): AjaxGoalAlertItem[] {
  const json = (payload ?? {}) as {
    events?: {
      id?: string;
      date?: string;
      status?: { type?: { state?: string | null } | null } | null;
      competitions?: {
        status?: { type?: { state?: string | null } | null } | null;
        competitors?: {
          homeAway?: 'home' | 'away' | string;
          score?: string | null;
          team?: { id?: string | null; displayName?: string | null; abbreviation?: string | null } | null;
        }[] | null;
        details?: {
          id?: string | number | null;
          text?: string | null;
          clock?: { displayValue?: string | null } | null;
          scoringPlay?: boolean | null;
          type?: { text?: string | null } | null;
          team?: { displayName?: string | null; abbreviation?: string | null } | null;
          athletesInvolved?: { displayName?: string | null; shortName?: string | null }[] | null;
        }[] | null;
      }[] | null;
    }[];
  };

  const events = Array.isArray(json.events) ? json.events : [];
  const rows: AjaxGoalAlertItem[] = [];

  events.forEach((event) => {
    const competition = event.competitions?.[0];
    const competitors = Array.isArray(competition?.competitors) ? competition?.competitors ?? [] : [];
    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) return;

    const homeId = `${home.team?.id ?? ''}`.trim();
    const awayId = `${away.team?.id ?? ''}`.trim();
    const homeAbr = `${home.team?.abbreviation ?? ''}`.trim().toUpperCase();
    const awayAbr = `${away.team?.abbreviation ?? ''}`.trim().toUpperCase();
    const hasAjax = homeId === AJAX_TEAM_ID || awayId === AJAX_TEAM_ID || homeAbr === 'AJA' || awayAbr === 'AJA';
    if (!hasAjax) return;

    const state = `${competition?.status?.type?.state ?? event.status?.type?.state ?? ''}`.toLowerCase();
    if (state !== 'in') return;

    const homeScore = Number.parseInt(home.score ?? '0', 10);
    const awayScore = Number.parseInt(away.score ?? '0', 10);
    const details = Array.isArray(competition?.details) ? competition?.details ?? [] : [];
    const goalDetails = details.filter((detail) => {
      const scoringPlay = detail?.scoringPlay === true;
      const typeText = `${detail?.type?.text ?? ''}`.toLowerCase();
      const plainText = `${detail?.text ?? ''}`.toLowerCase();
      return scoringPlay || typeText.includes('goal') || plainText.includes('goal');
    });
    const lastGoal = goalDetails.at(-1);
    const lastGoalId = `${lastGoal?.id ?? ''}`.trim();
    const lastGoalClock = `${lastGoal?.clock?.displayValue ?? ''}`.trim();
    const lastGoalText = `${lastGoal?.text ?? ''}`.trim();
    const goalKey = [lastGoalId, lastGoalClock, lastGoalText, `${homeScore}-${awayScore}`]
      .filter((part) => !!part)
      .join('|') || null;
    const scorer =
      lastGoal?.athletesInvolved?.[0]?.displayName?.trim() ||
      lastGoal?.athletesInvolved?.[0]?.shortName?.trim() ||
      null;
    const scoringTeam =
      lastGoal?.team?.displayName?.trim() || lastGoal?.team?.abbreviation?.trim() || null;

    rows.push({
      matchId: event.id ?? `${homeId}-${awayId}-${event.date ?? ''}`,
      homeTeam: home.team?.displayName?.trim() || 'Thuis',
      awayTeam: away.team?.displayName?.trim() || 'Uit',
      homeScore: Number.isFinite(homeScore) ? homeScore : 0,
      awayScore: Number.isFinite(awayScore) ? awayScore : 0,
      scorerName: scorer,
      scoringTeam,
      goalKey,
    });
  });

  return rows;
}

function parseStandings(payload: unknown): StandingRow[] {
  type StandingStat = {
    name?: string | null;
    abbreviation?: string | null;
    displayName?: string | null;
    value?: number | string | null;
  };

  type RawStandingEntry = {
    team?: {
      displayName?: string | null;
      shortDisplayName?: string | null;
      name?: string | null;
      abbreviation?: string | null;
    } | null;
    stats?: StandingStat[] | null;
  };

  const allEntries = collectStandingEntries(payload);
  const entries = allEntries.filter(
    (entry, idx, arr) =>
      !!entry.team &&
      Array.isArray(entry.stats) &&
      arr.findIndex((candidate) => candidate === entry) === idx
  );

  const getStat = (
    stats: StandingStat[],
    wanted: string[]
  ): number | null => {
    const keys = wanted.map((k) => k.toLowerCase());
    const hit = stats.find((s) => {
      const c1 = `${s.name ?? ''}`.toLowerCase();
      const c2 = `${s.abbreviation ?? ''}`.toLowerCase();
      const c3 = `${s.displayName ?? ''}`.toLowerCase();
      return keys.some((k) => c1 === k || c2 === k || c3 === k);
    });
    if (!hit) return null;
    const value = Number(hit.value ?? NaN);
    return Number.isFinite(value) ? value : null;
  };

  return (entries as RawStandingEntry[])
    .map((entry, idx) => {
      const stats = Array.isArray(entry.stats) ? entry.stats : [];
      const wins = getStat(stats, ['wins', 'w']) ?? 0;
      const points = getStat(stats, ['points', 'pts', 'p']) ?? 0;
      const rank = getStat(stats, ['rank', 'rnk']) ?? idx + 1;
      const explicitDiff = getStat(stats, ['pointdifferential', 'differential', 'gd']);
      const goalsFor = getStat(stats, ['pointsfor', 'goalsfor', 'gf']);
      const goalsAgainst = getStat(stats, ['pointsagainst', 'goalsagainst', 'ga']);
      const goalDiff =
        explicitDiff ?? (goalsFor !== null && goalsAgainst !== null ? goalsFor - goalsAgainst : 0);

      return {
        rank,
        team:
          entry.team?.displayName?.trim() ||
          entry.team?.shortDisplayName?.trim() ||
          entry.team?.name?.trim() ||
          entry.team?.abbreviation?.trim() ||
          '-',
        wins,
        goalDiff,
        points,
      } satisfies StandingRow;
    })
    .filter((row) => row.team !== '-')
    .sort((a, b) => a.rank - b.rank);
}

function collectStandingEntries(payload: unknown): {
  team?: {
    displayName?: string | null;
    shortDisplayName?: string | null;
    name?: string | null;
    abbreviation?: string | null;
  } | null;
  stats?: {
    name?: string | null;
    abbreviation?: string | null;
    displayName?: string | null;
    value?: number | string | null;
  }[] | null;
}[] {
  const results: {
    team?: {
      displayName?: string | null;
      shortDisplayName?: string | null;
      name?: string | null;
      abbreviation?: string | null;
    } | null;
    stats?: {
      name?: string | null;
      abbreviation?: string | null;
      displayName?: string | null;
      value?: number | string | null;
    }[] | null;
  }[] = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;

    const maybeTeam = obj.team as Record<string, unknown> | undefined;
    const maybeStats = obj.stats;
    if (maybeTeam && Array.isArray(maybeStats)) {
      results.push({
        team: {
          displayName: typeof maybeTeam.displayName === 'string' ? maybeTeam.displayName : null,
          shortDisplayName:
            typeof maybeTeam.shortDisplayName === 'string' ? maybeTeam.shortDisplayName : null,
          name: typeof maybeTeam.name === 'string' ? maybeTeam.name : null,
          abbreviation: typeof maybeTeam.abbreviation === 'string' ? maybeTeam.abbreviation : null,
        },
        stats: maybeStats as {
          name?: string | null;
          abbreviation?: string | null;
          displayName?: string | null;
          value?: number | string | null;
        }[],
      });
    }

    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value === 'object') {
        visit(value);
      }
    }
  };

  visit(payload);
  return results;
}

type SegmentButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function SegmentButton({ label, active, onPress }: SegmentButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
      activeOpacity={0.9}
    >
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 10,
  },
  infoBanner: {
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#BFDCC2',
    backgroundColor: '#E6F3E6',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoText: {
    color: '#1A6B2C',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  nextMatchBanner: {
    borderRadius: 10,
    borderWidth: 1.1,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 1,
  },
  nextMatchCaption: {
    color: '#666666',
    fontSize: 10,
    fontWeight: '800',
  },
  nextMatchTeams: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
  },
  nextMatchCountdown: {
    color: Ajax.red,
    fontSize: 12,
    fontWeight: '900',
  },
  errorText: {
    color: '#FFE4A8',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -2,
  },
  followLiveBtn: {
    flex: 1,
    borderWidth: 1.2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  followLiveBtnOn: {
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
  },
  followLiveBtnOff: {
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
  },
  followLiveBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
  followLiveBtnTextOn: {
    color: '#FFFFFF',
  },
  followLiveBtnTextOff: {
    color: Ajax.red,
  },
  topControlRow: {
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#E4E4E4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshBtnDisabled: {
    opacity: 0.6,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  flashCard: {
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#FFD369',
    backgroundColor: '#111111',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  flashCardTitle: {
    color: '#FFD369',
    fontSize: 13,
    fontWeight: '900',
  },
  flashCardSubtitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  flashColorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flashColorBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  flashColorBtnRed: {
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
  },
  flashColorBtnWhite: {
    borderColor: '#D9D9D9',
    backgroundColor: '#FFFFFF',
  },
  flashColorBtnActive: {
    borderColor: '#FFD369',
    borderWidth: 2,
  },
  flashColorBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  flashColorBtnTextWhite: {
    color: '#111111',
  },
  flashTempoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flashTempoBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
  },
  flashTempoBtnText: {
    color: Ajax.red,
    fontSize: 11,
    fontWeight: '900',
  },
  flashControlDisabled: {
    opacity: 0.45,
  },
  flashTempoLabel: {
    minWidth: 68,
    color: '#FFD369',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  flashActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  audioSyncBtn: {
    borderRadius: 8,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  audioSyncBtnOn: {
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
  },
  audioSyncBtnOff: {
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
  },
  audioSyncBtnBusy: {
    opacity: 0.75,
  },
  audioSyncBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
  audioSyncBtnTextOn: {
    color: '#FFFFFF',
  },
  audioSyncBtnTextOff: {
    color: Ajax.red,
  },
  audioSyncMeterText: {
    color: '#FFD369',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: -3,
  },
  audioSyncErrorText: {
    color: '#FFE4A8',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -2,
  },
  audioSyncLockText: {
    color: '#FFD369',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: -2,
  },
  flashTapBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#FFD369',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  flashTapBtnText: {
    color: '#FFD369',
    fontSize: 12,
    fontWeight: '900',
  },
  tapBeatHintText: {
    color: '#FFD369',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: -2,
  },
  flashStartBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  flashStopBtn: {
    borderColor: '#1A1A1A',
    backgroundColor: '#1A1A1A',
  },
  flashStartBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  flashFullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  flashFullscreenTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  flashFullscreenSubtitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  flashFullscreenHintWrap: {
    marginTop: 20,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: '#FFD369',
    backgroundColor: 'rgba(0,0,0,0.48)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  flashFullscreenHint: {
    color: '#FFD369',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
  },
  segmentRow: {
    gap: 6,
  },
  segmentLine: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 30,
  },
  segmentButtonActive: {
    backgroundColor: Ajax.red,
  },
  segmentText: {
    color: Ajax.red,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  listWrap: {
    gap: 8,
  },
  matchCard: {
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#D9D9D9',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  liveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: Ajax.red,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  lineupCard: {
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#D9D9D9',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  lineupTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '900',
  },
  lineupStatus: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '700',
  },
  lineupColumns: {
    flexDirection: 'row',
    gap: 10,
  },
  lineupColumn: {
    flex: 1,
    gap: 2,
  },
  lineupDivider: {
    width: 1,
    backgroundColor: '#E5E5E5',
  },
  lineupTeamTitle: {
    color: Ajax.red,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
  },
  lineupPlayer: {
    color: '#222222',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  lineupEmpty: {
    color: '#777777',
    fontSize: 12,
    fontWeight: '700',
  },
  competitionPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: Ajax.red,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: Ajax.red,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  matchTeams: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  kickoffText: {
    color: '#555555',
    fontSize: 14,
    fontWeight: '700',
  },
  standingsWrap: {
    gap: 8,
  },
  tableHeader: {
    borderRadius: 12,
    backgroundColor: Ajax.red,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeaderText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '900',
  },
  tableRow: {
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#D9D9D9',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableCell: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '800',
  },
  pointsText: {
    color: Ajax.red,
    fontWeight: '900',
  },
  colRank: { width: 28, textAlign: 'center' },
  colTeam: { flex: 1, paddingLeft: 6 },
  colWins: { width: 38, textAlign: 'center' },
  colGd: { width: 50, textAlign: 'center' },
  colPts: { width: 36, textAlign: 'center' },
});
