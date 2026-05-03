import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client — gunakan import { supabase } di seluruh aplikasi.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);