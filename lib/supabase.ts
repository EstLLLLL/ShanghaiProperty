import { createClient } from "@supabase/supabase-js";

// Accept either the bare project URL or one that includes /rest/v1[/];
// supabase-js wants the bare form.
export function normalizeSupabaseUrl(raw: string | undefined) {
  if (!raw) return undefined;
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabasePublic = url && anonKey ? createClient(url, anonKey) : null;

export const supabaseAdmin = url && serviceKey ? createClient(url, serviceKey) : null;

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "visit-photos";
