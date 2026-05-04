-- Add habit_type to habits (good = build, bad = break)
ALTER TABLE habits ADD COLUMN IF NOT EXISTS habit_type TEXT DEFAULT 'good' CHECK (habit_type IN ('good', 'bad'));

-- Add task_notes to user_challenges for daily check-in notes
ALTER TABLE user_challenges ADD COLUMN IF NOT EXISTS last_checkin_notes TEXT DEFAULT NULL;
ALTER TABLE user_challenges ADD COLUMN IF NOT EXISTS last_checkin_date DATE DEFAULT NULL;

-- Add note to habit_logs if missing
ALTER TABLE habit_logs ALTER COLUMN note SET DEFAULT '';

-- Pre-seed some bad habits to break
INSERT INTO habits (name, category, frequency, description, is_preloaded, is_archived, habit_type) VALUES
('Opened Social Media Before 10AM', 'Digital Detox', 'daily', 'Mark as done if you opened Instagram/YouTube before 10am', true, false, 'bad'),
('Ate Junk Food Today', 'Health', 'daily', 'Mark as done if you had junk food today', true, false, 'bad'),
('Slept After 1 AM', 'Health', 'daily', 'Mark as done if you slept after 1am', true, false, 'bad'),
('Skipped Workout', 'Fitness', 'daily', 'Mark as done if you skipped your planned workout', true, false, 'bad'),
('Wasted 2+ Hours on Phone', 'Digital Detox', 'daily', 'Mark as done if you spent 2+ hours scrolling today', true, false, 'bad')
ON CONFLICT DO NOTHING;
