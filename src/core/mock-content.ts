export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  body: string;
  date: string;
  category: 'Eredivisie' | 'Europa League' | 'Transfers' | 'Training' | 'Club';
  sourceUrl?: string;
};

export type MatchItem = {
  id: string;
  type: 'upcoming' | 'past';
  home: string;
  away: string;
  dateLabel: string;
  time: string;
  competition: string;
  venue: string;
  homeScore: number | null;
  awayScore: number | null;
  startIso?: string;
};

export type StandingRow = {
  position: number;
  team: string;
  played: number;
  goalDiff: number;
  points: number;
};

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: '1',
    title: 'Buitengewone Algemene Vergadering van Aandeelhouders van 9 maart',
    summary: 'Nieuwe leden van de RvC benoemd en update over de bestuurlijke structuur.',
    body:
      'Op 9 maart 2026 vond de BAVA plaats in de Johan Cruijff ArenA. Tijdens de vergadering zijn nieuwe commissarissen benoemd en is de bestuurlijke update rond Jordi Cruijff toegelicht.',
    date: '9 mrt 2026',
    category: 'Club',
  },
  {
    id: '2',
    title: 'Jordi Cruijff begonnen als technisch directeur bij Ajax',
    summary: 'Cruijff is per 1 februari 2026 gestart in zijn nieuwe rol.',
    body:
      'Ajax communiceerde begin februari dat Jordi Cruijff formeel is begonnen als technisch directeur. De aanstelling loopt tot en met 30 juni 2028.',
    date: '2 feb 2026',
    category: 'Transfers',
  },
  {
    id: '3',
    title: 'Ajax stelt Jordi Cruijff aan',
    summary: 'De club bevestigde de aanstelling van Cruijff als technisch directeur.',
    body:
      'Na een eerder mondeling akkoord is het contract ondertekend. Ajax meldde dat Cruijff op 1 februari 2026 start en dat de aanstelling doorloopt tot de zomer van 2028.',
    date: '17 jan 2026',
    category: 'Club',
  },
  {
    id: '4',
    title: 'Buitengewone Algemene Vergadering op 9 maart aangekondigd',
    summary: 'Ajax publiceerde de agenda en planning voor de BAVA.',
    body:
      'In januari maakte Ajax bekend dat de BAVA op 9 maart 2026 zou plaatsvinden. Daarbij werd ook gecommuniceerd over voordrachten binnen de Raad van Commissarissen.',
    date: '23 jan 2026',
    category: 'Club',
  },
  {
    id: '5',
    title: 'Informatie over losse kaartverkoop Eredivisie',
    summary: 'Ajax deelde het schema voor losse kaartverkoop van thuiswedstrijden.',
    body:
      'Vanaf 13 januari startte de verkoop voor meerdere thuisduels in de tweede seizoenshelft. Ajax publiceerde daarbij ook het verkoopschema voor supporters en leden.',
    date: '12 jan 2026',
    category: 'Eredivisie',
  },
];

export const MATCHES: MatchItem[] = [
  {
    id: 'm1',
    type: 'upcoming',
    home: 'Ajax',
    away: 'Sparta',
    dateLabel: 'Zaterdag 14 maart 2026',
    time: '21:00',
    competition: 'Eredivisie',
    venue: 'Johan Cruijff ArenA',
    homeScore: null,
    awayScore: null,
    startIso: '2026-03-14T20:00:00Z',
  },
  {
    id: 'm2',
    type: 'upcoming',
    home: 'Feyenoord',
    away: 'Ajax',
    dateLabel: 'Zondag 22 maart 2026',
    time: '14:30',
    competition: 'Eredivisie',
    venue: 'De Kuip',
    homeScore: null,
    awayScore: null,
    startIso: '2026-03-22T13:30:00Z',
  },
  {
    id: 'm3',
    type: 'upcoming',
    home: 'Ajax',
    away: 'FC Twente',
    dateLabel: 'Zaterdag 4 april 2026',
    time: '21:00',
    competition: 'Eredivisie',
    venue: 'Johan Cruijff ArenA',
    homeScore: null,
    awayScore: null,
    startIso: '2026-04-04T19:00:00Z',
  },
  {
    id: 'm4',
    type: 'past',
    home: 'Ajax',
    away: 'Feyenoord',
    dateLabel: 'Zondag 2 maart 2026',
    time: 'Afgelopen',
    competition: 'Eredivisie',
    venue: 'Johan Cruijff ArenA',
    homeScore: 2,
    awayScore: 0,
  },
  {
    id: 'm5',
    type: 'past',
    home: 'Twente',
    away: 'Ajax',
    dateLabel: 'Zondag 23 februari 2026',
    time: 'Afgelopen',
    competition: 'Eredivisie',
    venue: 'De Grolsch Veste',
    homeScore: 1,
    awayScore: 1,
  },
];

export const STANDINGS: StandingRow[] = [
  { position: 1, team: 'Ajax', played: 24, goalDiff: 34, points: 57 },
  { position: 2, team: 'PSV', played: 24, goalDiff: 28, points: 54 },
  { position: 3, team: 'Feyenoord', played: 24, goalDiff: 22, points: 49 },
  { position: 4, team: 'AZ', played: 24, goalDiff: 17, points: 45 },
  { position: 5, team: 'FC Twente', played: 24, goalDiff: 12, points: 41 },
];
