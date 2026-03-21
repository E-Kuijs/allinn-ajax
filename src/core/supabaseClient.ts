import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

function extractProjectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function decodeBase64Url(input: string): string | null {
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

    // atob werkt niet altijd fijn in RN/Hermes, dus fallback via Buffer
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(padded);
    }

    // Buffer fallback
     
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

function extractProjectRefFromAnonKey(anonKey: string): string | null {
  try {
    const parts = anonKey.split('.');
    if (parts.length < 2) return null;

    const payloadRaw = decodeBase64Url(parts[1]);
    if (!payloadRaw) return null;

    const payload = JSON.parse(payloadRaw) as { ref?: unknown };
    return typeof payload.ref === 'string' ? payload.ref : null;
  } catch {
    return null;
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars ontbreken: EXPO_PUBLIC_SUPABASE_URL en/of EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

const urlProjectRef = extractProjectRefFromUrl(supabaseUrl);
const keyProjectRef = extractProjectRefFromAnonKey(supabaseAnonKey);
const supabaseHost = (() => {
  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return null;
  }
})();

if (urlProjectRef && keyProjectRef && urlProjectRef !== keyProjectRef) {
  throw new Error(
    `Supabase env mismatch: EXPO_PUBLIC_SUPABASE_URL wijst naar "${urlProjectRef}", maar EXPO_PUBLIC_SUPABASE_ANON_KEY hoort bij "${keyProjectRef}". Gebruik URL + ANON key van hetzelfde Supabase project.`
  );
}

export const supabaseRuntimeDebug = {
  url: supabaseUrl,
  host: supabaseHost,
  urlProjectRef,
  keyProjectRef,
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    // Nieuwe sleutel zodat oude/beschadigde refresh-tokens niet meer worden hergebruikt.
    storageKey: 'all-inn-ajax-auth-v2',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
