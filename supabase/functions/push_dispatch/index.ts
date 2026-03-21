import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const dispatchSecret = Deno.env.get('PUSH_DISPATCH_SECRET') ?? '';

const AJAX_TEAM_ID = '139';
const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/ned.1/scoreboard';
const BREAKING_RSS_URL =
  'https://news.google.com/rss/search?q=Ajax+trainer+transfer+bestuur+when:2d&hl=nl&gl=NL&ceid=NL:nl';

type PushState = {
  sentKeys: string[];
  goalSnapshots: Record<string, { homeScore: number; awayScore: number; goalKey: string | null }>;
  seenBreakingNews: string[];
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: 'default';
  data?: Record<string, unknown>;
  channelId?: string;
  categoryId?: string;
  priority?: 'default' | 'normal' | 'high';
};

function nowMs() {
  return Date.now();
}

function unique(values: string[]) {
  return [...new Set(values.filter((v) => !!v))];
}

function normalizeToken(raw: string) {
  const token = raw.trim();
  if (!token) return '';
  if (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) return token;
  return '';
}

function parseRssItems(xml: string): Array<{ id: string; title: string }> {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const out: Array<{ id: string; title: string }> = [];
  items.forEach((block, idx) => {
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(block);
    const linkMatch = /<link[^>]*>([\s\S]*?)<\/link>/i.exec(block);
    const title = (titleMatch?.[1] ?? '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    const link = (linkMatch?.[1] ?? '').trim();
    if (!title) return;
    out.push({
      id: `${link || 'news'}|${title}|${idx}`.toLowerCase(),
      title,
    });
  });
  return out;
}

function isBreakingTitle(title: string) {
  const hay = title.toLowerCase();
  return [
    'trainer',
    'coach',
    'technisch directeur',
    'bestuurslid',
    'raad van commissarissen',
    'aankoop',
    'contract',
    'transfer',
    'getekend',
  ].some((word) => hay.includes(word));
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function sendExpoPushes(messages: ExpoPushMessage[]) {
  let sent = 0;
  let failed = 0;

  for (const group of chunk(messages, 100)) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(group),
    });
    if (!res.ok) {
      failed += group.length;
      continue;
    }
    const data = (await res.json()) as { data?: Array<{ status?: string; details?: { error?: string } }> };
    const statuses = Array.isArray(data.data) ? data.data : [];
    statuses.forEach((row) => {
      if (row.status === 'ok') sent += 1;
      else failed += 1;
    });
  }

  return { sent, failed };
}

function extractAjaxPushSignals(scoreboard: unknown, state: PushState) {
  const messages: Array<Omit<ExpoPushMessage, 'to'>> = [];
  const sentKeys = new Set(state.sentKeys);
  const nextGoals: PushState['goalSnapshots'] = { ...state.goalSnapshots };
  const events = Array.isArray((scoreboard as any)?.events) ? ((scoreboard as any).events as any[]) : [];

  for (const event of events) {
    const eventId = `${event?.id ?? ''}`.trim();
    if (!eventId) continue;
    const competition = event?.competitions?.[0];
    const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
    const home = competitors.find((c: any) => c?.homeAway === 'home');
    const away = competitors.find((c: any) => c?.homeAway === 'away');
    if (!home || !away) continue;

    const homeId = `${home?.team?.id ?? ''}`.trim();
    const awayId = `${away?.team?.id ?? ''}`.trim();
    const homeAbr = `${home?.team?.abbreviation ?? ''}`.trim().toUpperCase();
    const awayAbr = `${away?.team?.abbreviation ?? ''}`.trim().toUpperCase();
    const isAjaxMatch =
      homeId === AJAX_TEAM_ID || awayId === AJAX_TEAM_ID || homeAbr === 'AJA' || awayAbr === 'AJA';
    if (!isAjaxMatch) continue;

    const homeTeam = `${home?.team?.displayName ?? 'Thuis'}`.trim();
    const awayTeam = `${away?.team?.displayName ?? 'Uit'}`.trim();
    const kickoffTs = new Date(event?.date ?? '').getTime();
    const stateCode = `${competition?.status?.type?.state ?? event?.status?.type?.state ?? ''}`.toLowerCase();
    const diffMs = kickoffTs - nowMs();

    if (stateCode === 'pre') {
      if (diffMs > 0 && diffMs <= 12 * 60 * 60 * 1000) {
        const key = `matchday12:${eventId}`;
        if (!sentKeys.has(key)) {
          messages.push({
            title: '⚽ Matchday!',
            body: `Nog 12 uur tot ${homeTeam} - ${awayTeam}. Praat mee met supporters in de fan chat.`,
            data: { intent: 'open-chat', eventId },
            sound: 'default',
            channelId: 'default',
            priority: 'high',
          });
          sentKeys.add(key);
        }
      }

      if (diffMs > 0 && diffMs <= 75 * 60 * 1000) {
        const key = `lineup:${eventId}`;
        if (!sentKeys.has(key)) {
          messages.push({
            title: '🔥 Opstelling bekend',
            body: 'Bekijk nu de basisopstelling van Ajax.',
            data: { intent: 'open-events-lineup', eventId },
            sound: 'default',
            channelId: 'default',
            categoryId: 'lineup-action-category',
            priority: 'high',
          });
          sentKeys.add(key);
        }
      }
    }

    if (stateCode === 'in') {
      const kickoffKey = `kickoff:${eventId}`;
      if (!sentKeys.has(kickoffKey)) {
        messages.push({
          title: '⏱️ Wedstrijd begint',
          body: `${homeTeam} - ${awayTeam} is begonnen. Volg live standen nu.`,
          data: { intent: 'open-events-live', eventId },
          sound: 'default',
          channelId: 'default',
          priority: 'high',
        });
        sentKeys.add(kickoffKey);
      }

      const homeScore = Number.parseInt(`${home?.score ?? '0'}`, 10) || 0;
      const awayScore = Number.parseInt(`${away?.score ?? '0'}`, 10) || 0;
      const details = Array.isArray(competition?.details) ? competition.details : [];
      const scoringDetails = details.filter((row: any) => {
        const scoringPlay = row?.scoringPlay === true;
        const text = `${row?.text ?? ''}`.toLowerCase();
        const typeText = `${row?.type?.text ?? ''}`.toLowerCase();
        return scoringPlay || text.includes('goal') || typeText.includes('goal');
      });
      const lastGoal = scoringDetails[scoringDetails.length - 1];
      const scorer =
        `${lastGoal?.athletesInvolved?.[0]?.displayName ?? lastGoal?.athletesInvolved?.[0]?.shortName ?? ''}`.trim();
      const scoringTeam = `${lastGoal?.team?.displayName ?? lastGoal?.team?.abbreviation ?? 'Doelpunt'}`.trim();
      const goalKeyParts = [
        `${lastGoal?.id ?? ''}`.trim(),
        `${lastGoal?.clock?.displayValue ?? ''}`.trim(),
        `${lastGoal?.text ?? ''}`.trim(),
        `${homeScore}-${awayScore}`,
      ].filter((v) => !!v);
      const goalKey = goalKeyParts.join('|') || null;

      const prev = nextGoals[eventId];
      const prevTotal = prev ? prev.homeScore + prev.awayScore : homeScore + awayScore;
      const nextTotal = homeScore + awayScore;
      const hasNewGoal = !!prev && nextTotal > prevTotal;
      const changedGoalKey = !!goalKey && goalKey !== prev?.goalKey;

      if (hasNewGoal && (changedGoalKey || !prev?.goalKey)) {
        messages.push({
          title: '⚽ Doelpunt!',
          body: `${scoringTeam}${scorer ? ` (${scorer})` : ''}\nStand: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`,
          data: { intent: 'open-events-live', eventId },
          sound: 'default',
          channelId: 'default',
          priority: 'high',
        });
      }

      nextGoals[eventId] = { homeScore, awayScore, goalKey };
    }
  }

  return {
    messages,
    nextState: {
      sentKeys: [...sentKeys].slice(-400),
      goalSnapshots: nextGoals,
      seenBreakingNews: state.seenBreakingNews.slice(-300),
    } satisfies PushState,
  };
}

async function fetchBreakingNewsTitles() {
  const res = await fetch(BREAKING_RSS_URL, {
    method: 'GET',
    headers: { Accept: 'application/rss+xml,text/xml' },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRssItems(xml);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!supabaseUrl || !serviceRoleKey) return new Response('Missing Supabase env', { status: 500 });

  const bearer = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
  if (dispatchSecret && bearer !== dispatchSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const tokensRes = await supabase
    .from('user_push_tokens')
    .select('expo_push_token')
    .eq('enabled', true);

  if (tokensRes.error) {
    return Response.json({ ok: false, message: tokensRes.error.message }, { status: 400 });
  }

  const tokens = unique(
    (tokensRes.data ?? [])
      .map((row: any) => normalizeToken(`${row?.expo_push_token ?? ''}`))
      .filter((token) => !!token)
  );

  if (!tokens.length) {
    return Response.json({ ok: true, sent: 0, failed: 0, reason: 'no_tokens' });
  }

  const stateRes = await supabase
    .from('push_runtime_state')
    .select('value')
    .eq('key', 'dispatch')
    .maybeSingle();

  const state: PushState = {
    sentKeys: Array.isArray((stateRes.data as any)?.value?.sentKeys)
      ? (stateRes.data as any).value.sentKeys.filter((v: unknown) => typeof v === 'string')
      : [],
    goalSnapshots: ((stateRes.data as any)?.value?.goalSnapshots ?? {}) as PushState['goalSnapshots'],
    seenBreakingNews: Array.isArray((stateRes.data as any)?.value?.seenBreakingNews)
      ? (stateRes.data as any).value.seenBreakingNews.filter((v: unknown) => typeof v === 'string')
      : [],
  };

  const scoreboardRes = await fetch(SCOREBOARD_URL, { headers: { Accept: 'application/json' } });
  const scoreboardJson = scoreboardRes.ok ? await scoreboardRes.json() : {};
  const signal = extractAjaxPushSignals(scoreboardJson, state);

  const breakingNews = await fetchBreakingNewsTitles();
  const seenNews = new Set(signal.nextState.seenBreakingNews);
  const breakingMessages: Array<Omit<ExpoPushMessage, 'to'>> = [];
  for (const item of breakingNews.slice(0, 20)) {
    if (seenNews.has(item.id)) continue;
    seenNews.add(item.id);
    if (!isBreakingTitle(item.title)) continue;
    breakingMessages.push({
      title: '🚨 Breaking Ajax nieuws',
      body: item.title,
      data: { intent: 'open-news-item' },
      sound: 'default',
      channelId: 'default',
      priority: 'high',
    });
  }

  const allPayloads = [...signal.messages, ...breakingMessages];
  const messages: ExpoPushMessage[] = [];
  allPayloads.forEach((content) => {
    tokens.forEach((token) => {
      messages.push({ to: token, ...content });
    });
  });

  const sendResult = await sendExpoPushes(messages);

  const nextState: PushState = {
    sentKeys: signal.nextState.sentKeys,
    goalSnapshots: signal.nextState.goalSnapshots,
    seenBreakingNews: [...seenNews].slice(-300),
  };
  await supabase
    .from('push_runtime_state')
    .upsert({ key: 'dispatch', value: nextState, updated_at: new Date().toISOString() });

  return Response.json({
    ok: true,
    tokens: tokens.length,
    notifications: allPayloads.length,
    sent: sendResult.sent,
    failed: sendResult.failed,
  });
});
