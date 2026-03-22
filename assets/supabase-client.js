import { createClient } from '@supabase/supabase-js';

const supabaseUrl = __PUBLIC_SUPABASE_URL__;
const supabaseAnonKey = __PUBLIC_SUPABASE_ANON_KEY__;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })
  : null;

export function ensureSupabase() {
  if (!supabase) {
    throw new Error('缺少 Supabase 配置，请先设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。');
  }
  return supabase;
}
