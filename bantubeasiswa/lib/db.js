import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client — gunakan import { supabase } di seluruh aplikasi (anon / RLS).
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Client untuk route API admin yang perlu menulis ke tabel terproteksi RLS.
 * Set `SUPABASE_SERVICE_ROLE_KEY` di .env.local (Project Settings → API); jangan expose ke client.
 * Tanpa env ini, fallback ke `supabase` (anon).
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return supabase;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}