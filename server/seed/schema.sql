-- HabitForge Database Schema
-- Run this entire file in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
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

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- HABITS TABLE
-- ============================================
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

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own habits" ON habits FOR ALL USING (user_id = auth.uid() OR is_preloaded = TRUE);
CREATE POLICY "Service role full access habits" ON habits FOR ALL USING (TRUE);

CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_preloaded ON habits(is_preloaded);

-- ============================================
-- HABIT LOGS TABLE
-- ============================================
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

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own habit logs" ON habit_logs FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);

-- ============================================
-- REWARDS TABLE
-- ============================================
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

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own rewards" ON rewards FOR ALL USING (user_id = auth.uid() OR is_preloaded = TRUE);

-- ============================================
-- REWARD LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reward_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

ALTER TABLE reward_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reward logs" ON reward_logs FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_reward_logs_user ON reward_logs(user_id, earned_at);

-- ============================================
-- PUNISHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS punishments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  severity TEXT DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'strict')),
  trigger_condition TEXT DEFAULT 'habit_missed',
  is_preloaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE punishments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own punishments" ON punishments FOR ALL USING (user_id = auth.uid() OR is_preloaded = TRUE);

-- ============================================
-- PUNISHMENT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS punishment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  punishment_id UUID NOT NULL REFERENCES punishments(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  skipped BOOLEAN DEFAULT FALSE
);

ALTER TABLE punishment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own punishment logs" ON punishment_logs FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_punishment_logs_user ON punishment_logs(user_id, triggered_at);

-- ============================================
-- CHALLENGES TABLE
-- ============================================
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

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view challenges" ON challenges FOR SELECT USING (TRUE);
CREATE POLICY "Users can create custom challenges" ON challenges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- USER CHALLENGES TABLE
-- ============================================
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

ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own challenges" ON user_challenges FOR ALL USING (user_id = auth.uid());

-- ============================================
-- DIARY ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  encrypted_blob TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT NOT NULL,
  mood_emoji TEXT DEFAULT NULL,
  energy_level TEXT DEFAULT NULL CHECK (energy_level IN ('low', 'medium', 'high', NULL)),
  word_count INTEGER DEFAULT 0,
  has_ai_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own diary entries" ON diary_entries FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_diary_entries_user_date ON diary_entries(user_id, entry_date);

-- ============================================
-- DIARY ENGLISH PROGRESS TABLE
-- ============================================
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

ALTER TABLE diary_english_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own English progress" ON diary_english_progress FOR ALL USING (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTIONS (for points increment/decrement)
-- ============================================
CREATE OR REPLACE FUNCTION increment_points(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET points = GREATEST(0, points + amount) WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_points(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET points = GREATEST(0, points - amount) WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_challenge_completions(challenge_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE challenges SET total_completions = total_completions + 1 WHERE id = challenge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
