-- HabitForge Schema Fix Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ljmewyielysbqpnrzxhp/sql/new

-- 1. Add habit_type to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS habit_type TEXT DEFAULT 'good' CHECK (habit_type IN ('good', 'bad'));
UPDATE habits SET habit_type = 'good' WHERE habit_type IS NULL;

-- 2. Add checkin tracking to user_challenges
ALTER TABLE user_challenges ADD COLUMN IF NOT EXISTS last_checkin_date DATE DEFAULT NULL;
ALTER TABLE user_challenges ADD COLUMN IF NOT EXISTS last_checkin_notes TEXT DEFAULT NULL;

-- 3. Add points_ledger tracking (virtual — computed from logs, no new table needed)
-- Already handled in backend

-- 4. Update preloaded bad habit seeds (add habit_type = 'bad')
UPDATE habits SET habit_type = 'bad' WHERE name IN (
  'Wasted 2+ Hours on Phone',
  'skip phone in some area',
  'Excessive Social Media',
  'Junk Food / Unhealthy Snacking',
  'Staying Up Late (After 1 AM)',
  'Procrastinating Important Tasks'
);

-- 5. Verify
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'habits' AND column_name = 'habit_type';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_challenges' AND column_name IN ('last_checkin_date', 'last_checkin_notes');
