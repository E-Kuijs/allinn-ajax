import { NEWS_ITEMS, NewsItem } from '@/src/core/mock-content';

const CACHE_MS = 4 * 60 * 1000;
const AJAX_ARTICLES_URL = 'https://www.ajax.nl/artikelen/';
const NEWS_SOURCES = [
  {
    label: 'Google News Ajax',
    url: 'https://news.google.com/rss/search?q=Ajax+Amsterdam+when:7d&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    label: 'Google News Ajax Trainer',
    url: 'https://news.google.com/rss/search?q=Ajax+trainer+Garcia+when:30d&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    label: 'Google News Ajax.nl',
    url: 'https://news.google.com/rss/search?q=site:ajax.nl+Ajax+when:30d&hl=nl&gl=NL&ceid=NL:nl',
  },
];

type ParsedFeedItem = {
  title: string;
  summary: string;
  url: string;
  dateRaw: string;
  source: string;
};

let cachedItems: NewsItem[] | null = null;
let cachedAt = 0;
const loadedBodies = new Set<string>();

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCharCode(parseInt(dec, 10)));
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = regex.exec(block);
  return (match?.[1] ?? '').trim();
}

function extractFirstHref(html: string): string {
  const match = /<a[^>]+href=["']([^"']+)["']/i.exec(html);
  return (match?.[1] ?? '').trim();
}

function normalizeUrl(input: string): string {
  const value = decodeHtmlEntities(input).trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `https://www.ajax.nl${value}`;
  return `https://${value.replace(/^\/+/, '')}`;
}

function safeDateTimestamp(input: string): number {
  if (!input) return 0;
  const parsed = new Date(input);
  const ts = parsed.getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function formatDutchDate(input: string): string {
  const ts = safeDateTimestamp(input);
  if (!ts) return '';
  return new Date(ts)
    .toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\./g, '');
}

function toCategory(title: string, summary: string): NewsItem['category'] {
  const hay = `${title} ${summary}`.toLowerCase();
  if (
    hay.includes('training') ||
    hay.includes('trainings') ||
    hay.includes('trainen') ||
    hay.includes('oefensessie') ||
    hay.includes('afwerken op') ||
    hay.includes('open training')
  ) {
    return 'Training';
  }
  if (
    hay.includes('europa league') ||
    hay.includes('europacup') ||
    hay.includes('champions league') ||
    hay.includes('conference league') ||
    hay.includes('uefa') ||
    hay.includes('europese')
  ) {
    return 'Europa League';
  }
  if (
    hay.includes('eredivisie') ||
    hay.includes('competitie') ||
    hay.includes('wedstrijd') ||
    hay.includes('speelronde') ||
    hay.includes('psv') ||
    hay.includes('feyenoord') ||
    hay.includes('az') ||
    hay.includes('fc twente') ||
    hay.includes('sparta') ||
    hay.includes('utrecht')
  ) {
    return 'Eredivisie';
  }
  if (
    hay.includes('trainer') ||
    hay.includes('coach') ||
    hay.includes('garcia') ||
    hay.includes('transfer') ||
    hay.includes('contract') ||
    hay.includes('technisch')
  ) {
    return 'Transfers';
  }
  return 'Club';
}

function buildSummary(raw: string): string {
  const clean = stripHtml(raw);
  if (!clean) return 'Open het originele artikel voor de volledige inhoud.';
  return clean.length > 220 ? `${clean.slice(0, 217)}...` : clean;
}

function toNewsId(url: string, index: number): string {
  const normalized = normalizeUrl(url).split('?')[0].replace(/\/+$/, '');
  const slug = normalized.split('/').pop() ?? `nieuws-${index + 1}`;
  return slug.toLowerCase();
}

function parseRss(xml: string, sourceLabel: string): ParsedFeedItem[] {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const parsed: ParsedFeedItem[] = [];

  itemBlocks.forEach((block) => {
    const title = stripHtml(extractTag(block, 'title'));
    const descriptionRaw = extractTag(block, 'description');
    const summary = buildSummary(descriptionRaw);
    const pubDate = extractTag(block, 'pubDate');
    const sourceFromTag = stripHtml(extractTag(block, 'source'));

    let link = normalizeUrl(extractTag(block, 'link'));
    if (/news\.google\.com/i.test(link)) {
      const fromDescription = normalizeUrl(extractFirstHref(descriptionRaw));
      if (fromDescription) {
        link = fromDescription;
      }
    }

    if (!title || !link) return;

    parsed.push({
      title,
      summary,
      url: link,
      dateRaw: pubDate,
      source: sourceFromTag || sourceLabel,
    });
  });

  return parsed;
}

async function fetchRssSource(url: string, label: string): Promise<ParsedFeedItem[]> {
  const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/rss+xml,text/xml' } });
  if (!response.ok) throw new Error(`RSS bron fout: ${response.status}`);
  const xml = await response.text();
  return parseRss(xml, label);
}

function getTypeList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

function walkRecordTree(value: unknown, onRecord: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    value.forEach((child) => walkRecordTree(child, onRecord));
    return;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    onRecord(record);
    Object.values(record).forEach((child) => walkRecordTree(child, onRecord));
  }
}

function extractJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null = regex.exec(html);
  while (match) {
    const raw = match[1].trim().replace(/^<!--|-->$/g, '');
    if (raw) {
      try {
        out.push(JSON.parse(raw));
      } catch {
        // ignore malformed block
      }
    }
    match = regex.exec(html);
  }
  return out;
}

async function fetchAjaxOfficialNews(): Promise<ParsedFeedItem[]> {
  const response = await fetch(AJAX_ARTICLES_URL, {
    method: 'GET',
    headers: { Accept: 'text/html' },
  });
  if (!response.ok) throw new Error(`Ajax artikelen niet bereikbaar: ${response.status}`);
  const html = await response.text();
  const blocks = extractJsonLdBlocks(html);
  const out: ParsedFeedItem[] = [];
  const seen = new Set<string>();

  blocks.forEach((block) => {
    walkRecordTree(block, (record) => {
      const types = getTypeList(record['@type']);
      if (!types.some((type) => /newsarticle|article/i.test(type))) return;

      const title = stripHtml(String(record.headline ?? record.name ?? ''));
      const summary = buildSummary(String(record.description ?? ''));
      const rawUrl = String(record.url ?? '');
      const dateRaw = String(record.datePublished ?? record.dateModified ?? '');
      const url = normalizeUrl(rawUrl);

      if (!title || !url || seen.has(url)) return;
      seen.add(url);
      out.push({
        title,
        summary,
        url,
        dateRaw,
        source: 'Ajax.nl',
      });
    });
  });

  return out;
}

function toNewsItem(item: ParsedFeedItem, index: number): NewsItem {
  const formattedDate = formatDutchDate(item.dateRaw) || NEWS_ITEMS[0]?.date || '';
  return {
    id: toNewsId(item.url, index),
    title: item.title,
    summary: item.summary,
    body: `${item.summary}\n\nBron: ${item.source}. Open het originele artikel voor volledige inhoud.`,
    date: formattedDate,
    category: toCategory(item.title, item.summary),
    sourceUrl: item.url,
  };
}

function getFallbackItems(): NewsItem[] {
  return NEWS_ITEMS.map((item) => ({ ...item }));
}

function dedupeNewsItems(items: ParsedFeedItem[]): ParsedFeedItem[] {
  const seen = new Set<string>();
  const out: ParsedFeedItem[] = [];
  items.forEach((item) => {
    const key = `${normalizeUrl(item.url).toLowerCase()}|${item.title.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

async function fetchLiveNews(): Promise<NewsItem[]> {
  const feedResults = await Promise.allSettled(
    NEWS_SOURCES.map((source) => fetchRssSource(source.url, source.label))
  );

  const parsed: ParsedFeedItem[] = [];
  feedResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      parsed.push(...result.value);
    }
  });

  try {
    const ajaxOfficial = await fetchAjaxOfficialNews();
    parsed.push(...ajaxOfficial);
  } catch {
    // keep rss-only if official ajax page fails
  }

  if (!parsed.length) {
    throw new Error('Geen live nieuwsbronnen beschikbaar');
  }

  const onlyAjaxRelated = parsed.filter((item) => {
    const hay = `${item.title} ${item.summary}`.toLowerCase();
    return hay.includes('ajax') || hay.includes('amsterdam') || hay.includes('cruijff');
  });

  const deduped = dedupeNewsItems(onlyAjaxRelated.length ? onlyAjaxRelated : parsed);
  deduped.sort((a, b) => safeDateTimestamp(b.dateRaw) - safeDateTimestamp(a.dateRaw));

  return deduped.slice(0, 30).map((item, index) => toNewsItem(item, index));
}

async function fetchArticleBodyFromSource(sourceUrl: string): Promise<string | null> {
  const response = await fetch(sourceUrl, {
    method: 'GET',
    headers: { Accept: 'text/html' },
  });
  if (!response.ok) return null;
  const html = await response.text();

  const articleMatch = /<article[\s\S]*?>([\s\S]*?)<\/article>/i.exec(html);
  const articleHtml = articleMatch ? articleMatch[1] : html;
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let match: RegExpExecArray | null = paragraphRegex.exec(articleHtml);
  while (match && paragraphs.length < 14) {
    const text = stripHtml(match[1]);
    if (text.length > 25) {
      paragraphs.push(text);
    }
    match = paragraphRegex.exec(articleHtml);
  }

  if (!paragraphs.length) return null;
  const body = paragraphs.join('\n\n').trim();
  return body.length > 140 ? body : null;
}

export async function getNewsItems(options?: { forceRefresh?: boolean }): Promise<NewsItem[]> {
  const forceRefresh = options?.forceRefresh ?? false;
  const now = Date.now();

  if (!forceRefresh && cachedItems && now - cachedAt < CACHE_MS) {
    return cachedItems;
  }

  try {
    const liveItems = await fetchLiveNews();
    cachedItems = liveItems;
    cachedAt = now;
    return liveItems;
  } catch {
    const fallback = getFallbackItems();
    cachedItems = fallback;
    cachedAt = now;
    return fallback;
  }
}

export async function getNewsItemWithBody(id: string): Promise<NewsItem | null> {
  const items = await getNewsItems();
  const item = items.find((entry) => entry.id === id) ?? null;
  if (!item) return null;
  if (!item.sourceUrl || loadedBodies.has(item.id)) return item;

  try {
    const body = await fetchArticleBodyFromSource(item.sourceUrl);
    if (body) {
      const updated: NewsItem = { ...item, body };
      if (cachedItems) {
        cachedItems = cachedItems.map((entry) => (entry.id === updated.id ? updated : entry));
      }
      loadedBodies.add(item.id);
      return updated;
    }
  } catch {
    // keep fallback summary body
  }

  loadedBodies.add(item.id);
  return item;
}
