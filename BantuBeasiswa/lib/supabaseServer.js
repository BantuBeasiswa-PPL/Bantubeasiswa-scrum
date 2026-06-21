import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const testingEnvPath = path.resolve(process.cwd(), '.env.testing');
if (fs.existsSync(testingEnvPath)) {
  dotenv.config({ path: testingEnvPath, override: true });
}

/**
 * Client Supabase untuk route API / getServerSideProps.
 * Memakai SUPABASE_SERVICE_ROLE_KEY bila tersedia agar query tidak terblokir RLS
 * setelah akses sudah diverifikasi lewat JWT aplikasi sendiri.
 */
export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL dan kunci Supabase wajib di-set');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
