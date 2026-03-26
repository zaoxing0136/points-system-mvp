import { createClient } from '@supabase/supabase-js';

function buildClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function probeQuery(builder) {
  try {
    const { error } = await builder;
    if (error) {
      return {
        ok: false,
        code: error.code || '',
        message: error.message || 'Query failed'
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      code: '',
      message: error.message || 'Query failed'
    };
  }
}

export default async function handler(_req, res) {
  const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = buildClient();

  const checks = {
    env: {
      ok: hasSupabaseUrl && hasSupabaseAnonKey,
      hasSupabaseUrl,
      hasSupabaseAnonKey,
      hasServiceRoleKey
    },
    db: supabase ? {
      userProfiles: await probeQuery(supabase.from('user_profiles').select('id', { head: true, count: 'exact' }).limit(1)),
      classes: await probeQuery(supabase.from('classes').select('id', { head: true, count: 'exact' }).limit(1)),
      badgeDefinitions: await probeQuery(supabase.from('badge_definitions').select('id', { head: true, count: 'exact' }).limit(1)),
      badgeProgressView: await probeQuery(supabase.from('student_badge_progress').select('student_id', { head: true, count: 'exact' }).limit(1)),
      badgeLeaderboardView: await probeQuery(supabase.from('badge_leaderboard').select('student_id', { head: true, count: 'exact' }).limit(1))
    } : null
  };

  const ok = Boolean(
    checks.env.ok
    && checks.db
    && checks.db.userProfiles.ok
    && checks.db.classes.ok
    && checks.db.badgeDefinitions.ok
    && checks.db.badgeProgressView.ok
    && checks.db.badgeLeaderboardView.ok
  );

  res.statusCode = ok ? 200 : 500;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({
    ok,
    runtime: 'vercel-node',
    checks,
    timestamp: new Date().toISOString()
  }));
}
