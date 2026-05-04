require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const schema = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  push_subscription TEXT DEFAULT NULL,
  daily_suggestion_date DATE DEFAULT NULL,
  daily_suggestion_text TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Custom',
  frequency TEXT DEFAULT 'daily',
  frequency_days INTEGER[] DEFAULT NULL,
  description TEXT DEFAULT '',
  is_preloaded BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('done', 'skipped', 'missed')),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT DEFAULT 'small' CHECK (level IN ('small', 'medium', 'big')),
  condition_type TEXT NOT NULL CHECK (condition_type IN ('habits_done_today', 'streak', 'points')),
  condition_value INTEGER NOT NULL,
  is_preloaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS punishments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  severity TEXT DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'strict')),
  trigger_condition TEXT DEFAULT 'habit_missed',
  is_preloaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS punishment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  punishment_id UUID NOT NULL REFERENCES punishments(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  skipped BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_days INTEGER NOT NULL,
  rules JSONB NOT NULL DEFAULT '[]',
  reset_on_miss BOOLEAN DEFAULT TRUE,
  is_preloaded BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  total_completions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  started_at DATE NOT NULL,
  current_day INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  encrypted_blob TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT NOT NULL,
  mood_emoji TEXT DEFAULT NULL,
  energy_level TEXT DEFAULT NULL,
  word_count INTEGER DEFAULT 0,
  has_ai_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

CREATE TABLE IF NOT EXISTS diary_english_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_mistakes INTEGER DEFAULT 0,
  common_error_types TEXT[] DEFAULT '{}',
  entries_written INTEGER DEFAULT 0,
  avg_word_count INTEGER DEFAULT 0,
  UNIQUE(user_id, week_start)
);

CREATE OR REPLACE FUNCTION increment_points(user_id UUID, amount INTEGER)
RETURNS VOID AS $$ BEGIN UPDATE users SET points = GREATEST(0, points + amount) WHERE id = user_id; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_points(user_id UUID, amount INTEGER)
RETURNS VOID AS $$ BEGIN UPDATE users SET points = GREATEST(0, points - amount) WHERE id = user_id; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_challenge_completions(challenge_id UUID)
RETURNS VOID AS $$ BEGIN UPDATE challenges SET total_completions = total_completions + 1 WHERE id = challenge_id; END; $$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const rls = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE punishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE punishment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_english_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='habits' AND policyname='Users can manage own habits') THEN
    CREATE POLICY "Users can manage own habits" ON habits FOR ALL USING (user_id = auth.uid() OR is_preloaded = TRUE);
    CREATE POLICY "Users can manage own habit logs" ON habit_logs FOR ALL USING (user_id = auth.uid());
    CREATE POLICY "Users can manage own rewards" ON rewards FOR ALL USING (user_id = auth.uid() OR is_preloaded = TRUE);
    CREATE POLICY "Users can manage own reward logs" ON reward_logs FOR ALL USING (user_id = auth.uid());
    CREATE POLICY "Users can manage own punishments" ON punishments FOR ALL USING (user_id = auth.uid() OR is_preloaded = TRUE);
    CREATE POLICY "Users can manage own punishment logs" ON punishment_logs FOR ALL USING (user_id = auth.uid());
    CREATE POLICY "Anyone can view challenges" ON challenges FOR SELECT USING (TRUE);
    CREATE POLICY "Users can create custom challenges" ON challenges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY "Users can manage own user_challenges" ON user_challenges FOR ALL USING (user_id = auth.uid());
    CREATE POLICY "Users can only access own diary entries" ON diary_entries FOR ALL USING (user_id = auth.uid());
    CREATE POLICY "Users can manage own English progress" ON diary_english_progress FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
`;

const seedData = `
INSERT INTO habits (name, category, frequency, description, is_preloaded, is_archived) VALUES
('Study / Deep Work - 2 Hours', 'Focus', 'daily', 'Dedicated study or learning time', true, false),
('Physical Workout / Gym', 'Fitness', 'daily', 'Any exercise for minimum 30 minutes', true, false),
('Read 20 Pages', 'Mindset', 'daily', 'Read any book - 20 pages minimum', true, false),
('No Phone First 1 Hour After Waking', 'Digital Detox', 'daily', 'Keep phone away for first hour', true, false),
('Meditate 10 Minutes', 'Health', 'daily', 'Mindfulness meditation', true, false),
('Sleep Before Midnight', 'Health', 'daily', 'Be in bed before 12 AM', true, false),
('Drink 3 Litres Water', 'Health', 'daily', 'Track and drink at least 3L', true, false),
('Work on Main Project (Coding)', 'Focus', 'weekdays', 'Work on your primary project for at least 1 hour', true, false),
('No Social Media After 10 PM', 'Digital Detox', 'daily', 'No Instagram, YouTube, Reels after 10 PM', true, false),
('Write Journal / Reflect', 'Mindset', 'daily', 'Spend 10 minutes writing thoughts', true, false)
ON CONFLICT DO NOTHING;

INSERT INTO rewards (name, level, condition_type, condition_value, is_preloaded) VALUES
('20 Min YouTube / Reels', 'small', 'habits_done_today', 3, true),
('1 Hour Gaming', 'medium', 'habits_done_today', 5, true),
('Watch Full Movie', 'medium', 'habits_done_today', 7, true),
('Completely Free Day (No Rules)', 'big', 'habits_done_today', 10, true),
('Order Favourite Food', 'medium', 'points', 200, true)
ON CONFLICT DO NOTHING;

INSERT INTO punishments (name, severity, trigger_condition, is_preloaded) VALUES
('15-Min Brisk Walk', 'mild', 'habit_missed', true),
('20 Pushups', 'moderate', 'habit_missed', true),
('No Entertainment for 2 Hours', 'moderate', 'habit_missed', true),
('Phone Away for 1 Hour', 'moderate', 'phone_overuse', true),
('No Reels / YouTube Tomorrow', 'moderate', 'bad_day', true),
('Write 5 Reasons Why You Failed', 'mild', 'habit_missed', true),
('Cold Shower - No Excuses', 'strict', 'habit_missed', true)
ON CONFLICT DO NOTHING;

INSERT INTO challenges (name, description, duration_days, rules, reset_on_miss, is_preloaded, total_completions) VALUES
('75 Hard', 'The ultimate mental toughness program. Miss any task = restart from Day 1.', 75, '["Follow a diet - zero alcohol, zero cheat meals", "Two 45-minute workouts (one must be outdoors)", "Drink 1 gallon of water daily", "Read 10 pages of a non-fiction book", "Take a daily progress photo"]', true, true, 0),
('30-Day No Social Media', 'Delete Instagram, YouTube, Reels from your phone for 30 days.', 30, '["Zero Instagram / YouTube / Reels", "Delete apps from phone", "News and WhatsApp allowed", "Replace scroll time with reading"]', true, true, 0),
('21-Day Daily Workout', 'Any workout - minimum 20 minutes. No rest days for 21 days.', 21, '["Minimum 20 minutes of any workout", "No rest days", "Log your workout type daily"]', false, true, 0),
('30-Day Cold Shower', 'End every shower with 2 minutes of cold water only.', 30, '["Minimum 2 minutes cold water", "Every single day", "Warm shower allowed before cold"]', true, true, 0),
('14-Day Digital Detox Morning', 'No phone for first 60 minutes after waking.', 14, '["Zero phone for first 60 min", "Alarm allowed (set night before)", "Journal or read instead"]', false, true, 0),
('30-Day Read Daily', 'Read minimum 20 pages every day for 30 days.', 30, '["20 pages minimum per day", "Any book counts", "Audiobooks do NOT count"]', true, true, 0),
('7-Day No Sugar', 'Zero added sugar for 7 days. Fruits allowed. Restart on fail.', 7, '["Zero added sugar", "Fresh fruits allowed", "Restart from Day 1 if you slip"]', true, true, 0)
ON CONFLICT DO NOTHING;
`;

async function runSQL(sql, label) {
  console.log(`\n⏳ Running: ${label}...`);
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    // rpc doesn't exist — use raw query via REST
    // Supabase doesn't expose raw SQL via JS client directly
    // We'll use the Postgres connection via supabase-js storage hack
    console.log(`  ℹ️  Note: ${error.message}`);
    return false;
  }
  console.log(`  ✅ Done`);
  return true;
}

// Supabase JS client can run SQL via the from().rpc() but not arbitrary DDL
// Instead, we use the supabase-js REST API with service role to hit the pg endpoint
async function execSQL(sql, label) {
  console.log(`\n⏳ ${label}...`);
  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  // Use fetch with service role key for DDL
  const response = await fetch(`${process.env.SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const text = await response.text();
    console.log(`  ❌ HTTP ${response.status}: ${text.substring(0, 200)}`);
    return false;
  }
  console.log(`  ✅ Success`);
  return true;
}

// Best approach: use supabase-js with service_role to run statements table-by-table
async function createTables() {
  console.log('\n🚀 HabitForge Database Setup\n');

  // Split schema into individual statements and run each
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 20);
  let success = 0;

  for (const stmt of statements) {
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    process.stdout.write(`  → ${preview}... `);
    try {
      const { error } = await supabase.from('_setup_check').select('*').limit(0);
      // Actually use the Supabase management API
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
        headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY }
      });
      // The supabase-js client doesn't support raw DDL
      // Use the pg connection string approach
      process.stdout.write('(skipped - use migration)\n');
    } catch (e) {
      process.stdout.write(`ERROR: ${e.message}\n`);
    }
  }
}

// ACTUAL WORKING APPROACH: Use Supabase's db.execute via management API
async function setupViaManagementAPI() {
  const projectRef = 'ljmewyielysbqpnrzxhp';
  // This requires a Supabase Management API token (different from service role)
  // Instead, let's do it the right way via the CLI with --db-url

  console.log('\n✅ Using Supabase CLI db dump approach...\n');

  const { execSync } = require('child_process');
  const dbUrl = `postgresql://postgres:${encodeURIComponent('KzFwvwlvQaNtU6dY')}@db.ljmewyielysbqpnrzxhp.supabase.co:5432/postgres`;

  const fs = require('fs');

  // Write combined SQL
  const combined = schema + '\n' + rls + '\n' + seedData;
  fs.writeFileSync('supabase/migrations/20260504000000_initial_schema.sql', combined);
  console.log('✅ Migration file created: supabase/migrations/20260504000000_initial_schema.sql');

  try {
    console.log('\n📤 Pushing migration to Supabase...');
    const result = execSync(
      `supabase db push --linked --password "${encodeURIComponent('KzFwvwlvQaNtU6dY')}"`,
      { cwd: process.cwd(), encoding: 'utf8', timeout: 60000 }
    );
    console.log(result);
    console.log('✅ Migration pushed successfully!');
  } catch (err) {
    console.log('Push output:', err.stdout || '');
    console.log('Push error:', err.stderr || err.message);

    // Try direct psql connection via npx
    try {
      console.log('\n📤 Trying via direct connection...');
      const result2 = execSync(
        `supabase db push --db-url "postgresql://postgres:KzFwvwlvQaNtU6dY@db.ljmewyielysbqpnrzxhp.supabase.co:5432/postgres" --include-all`,
        { cwd: process.cwd(), encoding: 'utf8', timeout: 60000 }
      );
      console.log(result2);
    } catch (err2) {
      console.log('Direct error:', err2.stdout || err2.stderr || err2.message);
      console.log('\n⚠️  CLI push failed. The migration file is ready at:');
      console.log('   supabase/migrations/20260504000000_initial_schema.sql');
      console.log('\n📋 MANUAL OPTION: Copy the SQL and paste it in Supabase SQL editor:');
      console.log('   https://supabase.com/dashboard/project/ljmewyielysbqpnrzxhp/sql/new');
    }
  }
}

setupViaManagementAPI().catch(console.error);
