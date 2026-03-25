import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Buffer } from "buffer";

const FALLBACK_SUPABASE_URL = "https://yehfisrddqmsklrsqpzr.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllaGZpc3JkZHFtc2tscnNxcHpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjMyNjgsImV4cCI6MjA4ODM5OTI2OH0.D58uAN-fEjxaKGOU4CvnSASENKGjBcIwVb3gAWj2Hrk";

const envSupabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const envSupabaseAnonKey = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""
).trim();

type FallbackReason = "none" | "missing_env" | "env_mismatch";

function extractProjectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function extractHostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function decodeBase64Url(input: string): string | null {
  try {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

    if (typeof globalThis.atob === "function") {
      return globalThis.atob(padded);
    }

    return Buffer.from(padded, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

function extractProjectRefFromAnonKey(anonKey: string): string | null {
  try {
    const parts = anonKey.split(".");
    if (parts.length < 2) return null;

    const payloadRaw = decodeBase64Url(parts[1]);
    if (!payloadRaw) return null;

    const payload = JSON.parse(payloadRaw) as { ref?: unknown };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

function detectKeyType(
  key: string,
): "publishable" | "secret" | "jwt" | "unknown" | null {
  if (!key) return null;
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("sb_secret_")) return "secret";

  const parts = key.split(".");
  if (parts.length === 3) return "jwt";

  return "unknown";
}

function maskValue(value: string, keepStart = 8, keepEnd = 6): string {
  if (!value) return "(empty)";
  if (value.length <= keepStart + keepEnd) return value;
  return `${value.slice(0, keepStart)}...${value.slice(-keepEnd)}`;
}

let supabaseUrl = envSupabaseUrl || FALLBACK_SUPABASE_URL;
let supabaseAnonKey = envSupabaseAnonKey || FALLBACK_SUPABASE_ANON_KEY;

let fallbackReason: FallbackReason =
  envSupabaseUrl && envSupabaseAnonKey ? "none" : "missing_env";

const envUrlProjectRef = extractProjectRefFromUrl(envSupabaseUrl);
const envKeyProjectRef = extractProjectRefFromAnonKey(envSupabaseAnonKey);

if (
  envUrlProjectRef &&
  envKeyProjectRef &&
  envUrlProjectRef !== envKeyProjectRef
) {
  fallbackReason = "env_mismatch";
  supabaseUrl = FALLBACK_SUPABASE_URL;
  supabaseAnonKey = FALLBACK_SUPABASE_ANON_KEY;

  console.warn(
    `[SupabaseRuntimeDebug] Env mismatch gedetecteerd. URL ref=${envUrlProjectRef}, KEY ref=${envKeyProjectRef}. Fallback productieconfig wordt gebruikt.`,
  );
}

const urlProjectRef = extractProjectRefFromUrl(supabaseUrl);
const keyProjectRef = extractProjectRefFromAnonKey(supabaseAnonKey);
const host = extractHostFromUrl(supabaseUrl);
const keyType = detectKeyType(supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    storageKey: "all-inn-ajax-auth-v2",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const supabaseRuntimeDebug = {
  supabaseUrl,
  supabaseUrlMasked: maskValue(supabaseUrl, 24, 0),
  anonKeyMasked: maskValue(supabaseAnonKey, 10, 8),
  host,
  urlProjectRef,
  keyProjectRef,
  keyType,
  fallbackReason,
  usingFallback: fallbackReason !== "none",
  envHasUrl: !!envSupabaseUrl,
  envHasAnonKey: !!envSupabaseAnonKey,
  envUrlProjectRef,
  envKeyProjectRef,
  isConfigConsistent:
    !!urlProjectRef && !!keyProjectRef
      ? urlProjectRef === keyProjectRef
      : false,
  log: (...args: unknown[]) => {
    console.log("[SupabaseRuntimeDebug]", ...args);
  },
};

if (__DEV__) {
  console.log("[SupabaseRuntimeDebug] init", {
    supabaseUrl: supabaseRuntimeDebug.supabaseUrlMasked,
    anonKey: supabaseRuntimeDebug.anonKeyMasked,
    host: supabaseRuntimeDebug.host,
    urlProjectRef: supabaseRuntimeDebug.urlProjectRef,
    keyProjectRef: supabaseRuntimeDebug.keyProjectRef,
    keyType: supabaseRuntimeDebug.keyType,
    fallbackReason: supabaseRuntimeDebug.fallbackReason,
    usingFallback: supabaseRuntimeDebug.usingFallback,
    envHasUrl: supabaseRuntimeDebug.envHasUrl,
    envHasAnonKey: supabaseRuntimeDebug.envHasAnonKey,
    envUrlProjectRef: supabaseRuntimeDebug.envUrlProjectRef,
    envKeyProjectRef: supabaseRuntimeDebug.envKeyProjectRef,
    isConfigConsistent: supabaseRuntimeDebug.isConfigConsistent,
  });
}

export async function testSupabaseConnection() {
  try {
    const { error, data } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) {
      console.log("[SupabaseConnectionTest] query error", error);
      return { ok: false as const, error };
    }

    console.log("[SupabaseConnectionTest] success", {
      count: Array.isArray(data) ? data.length : 0,
    });

    return { ok: true as const, data };
  } catch (error: any) {
    console.log("[SupabaseConnectionTest] catch", {
      message: error?.message ?? "Unknown error",
      name: error?.name ?? null,
      stack: error?.stack ?? null,
    });

    return { ok: false as const, error };
  }
}
