const { createClient } = require('@supabase/supabase-js');

// ── Validate env vars at startup ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Supabase config check:');
console.log(`   SUPABASE_URL: ${SUPABASE_URL ? '✅ SET (' + SUPABASE_URL.substring(0, 30) + '...)' : '❌ MISSING'}`);
console.log(`   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✅ SET (' + SUPABASE_ANON_KEY.substring(0, 20) + '...)' : '❌ MISSING'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ SET (' + SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...)' : '❌ MISSING'}`);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('⚠️  WARNING: Missing Supabase env vars! Set them in Render Dashboard → Environment.');
}

// Admin client (server-side only — bypasses RLS for seeding/admin ops)
const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { auth: { persistSession: false } }
);

// Public client (respects RLS)
const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder'
);

module.exports = { supabase, supabaseAdmin };
