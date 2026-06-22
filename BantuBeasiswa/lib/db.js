import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'dokumen-pendaftaran';

/**
 * Supabase client — gunakan import { supabase } di seluruh aplikasi.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function getStorageBucket() {
  return STORAGE_BUCKET;
}
