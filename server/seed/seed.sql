-- HabitForge Seed Data
-- Run AFTER schema.sql

-- ============================================
-- PRELOADED HABITS
-- ============================================
INSERT INTO habits (name, category, frequency, description, is_preloaded, is_archived) VALUES
('Study / Deep Work – 2 Hours', 'Focus', 'daily', 'Dedicated, distraction-free study or learning time', true, false),
('Physical Workout / Gym', 'Fitness', 'daily', 'Any form of exercise for minimum 30 minutes', true, false),
('Read 20 Pages', 'Mindset', 'daily', 'Read any book — fiction or non-fiction — 20 pages minimum', true, false),
('No Phone First 1 Hour After Waking', 'Digital Detox', 'daily', 'Keep phone away for first hour of the day', true, false),
('Meditate 10 Minutes', 'Health', 'daily', 'Mindfulness meditation, breathing, or stillness practice', true, false),
('Sleep Before Midnight', 'Health', 'daily', 'Be in bed and lights off before 12 AM', true, false),
('Drink 3 Litres Water', 'Health', 'daily', 'Track and drink at least 3L of water through the day', true, false),
('Work on Main Project (Coding)', 'Focus', 'weekdays', 'Work on your primary project or skill for at least 1 hour', true, false),
('No Social Media After 10 PM', 'Digital Detox', 'daily', 'No Instagram, YouTube, Reels after 10 PM', true, false),
('Write Journal / Reflect', 'Mindset', 'daily', 'Spend 10 minutes writing your thoughts, wins, or lessons of the day', true, false),
('Cold Shower', 'Health', 'daily', 'End shower with at least 30 seconds of cold water', true, false),
('1% Learning – Watch 1 Educational Video', 'Mindset', 'daily', 'Watch one educational YouTube video or tutorial', true, false)
ON CONFLICT DO NOTHING;

-- ============================================
-- PRELOADED REWARDS
-- ============================================
INSERT INTO rewards (name, level, condition_type, condition_value, is_preloaded) VALUES
('20 Min YouTube / Reels', 'small', 'habits_done_today', 3, true),
('1 Hour Gaming', 'medium', 'habits_done_today', 5, true),
('Watch Full Movie', 'medium', 'habits_done_today', 7, true),
('Completely Free Day (No Rules)', 'big', 'habits_done_today', 10, true),
('Order Favourite Food', 'medium', 'points', 200, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- PRELOADED PUNISHMENTS
-- ============================================
INSERT INTO punishments (name, severity, trigger_condition, is_preloaded) VALUES
('15-Min Brisk Walk', 'mild', 'habit_missed', true),
('20 Pushups', 'moderate', 'habit_missed', true),
('No Entertainment for 2 Hours', 'moderate', 'habit_missed', true),
('Phone Away for 1 Hour', 'moderate', 'phone_overuse', true),
('No Reels / YouTube Tomorrow', 'moderate', 'bad_day', true),
('Write 5 Reasons Why You Failed', 'mild', 'habit_missed', true),
('Cold Shower – No Excuses', 'strict', 'habit_missed', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- PRELOADED CHALLENGES
-- ============================================
INSERT INTO challenges (name, description, duration_days, rules, reset_on_miss, is_preloaded, total_completions) VALUES
(
  '75 Hard',
  'The ultimate mental toughness program. Miss any task on any day and you restart from Day 1. No excuses, no substitutions.',
  75,
  '["Follow a diet — zero alcohol, zero cheat meals", "Complete two 45-minute workouts (one must be outdoors)", "Drink 1 gallon (3.7L) of water", "Read 10 pages of a non-fiction book", "Take a daily progress photo"]',
  true, true, 0
),
(
  '30-Day No Social Media',
  'Delete Instagram, YouTube, and Reels from your phone for 30 days. News and messaging apps allowed.',
  30,
  '["Zero Instagram / YouTube / Reels daily", "Delete apps from phone (not just log out)", "News apps and WhatsApp allowed", "Replace scroll time with reading or learning"]',
  true, true, 0
),
(
  '21-Day Daily Workout',
  'Any workout counts — gym, run, home workout. Minimum 20 minutes. No rest days for 21 days.',
  21,
  '["Minimum 20 minutes of any workout", "No rest days — consistency is the goal", "Log your workout type each day", "Any intensity counts — walk, gym, yoga"]',
  false, true, 0
),
(
  '30-Day Cold Shower',
  'End every shower with minimum 2 minutes of cold water only. Build mental toughness daily.',
  30,
  '["Minimum 2 minutes cold water only", "Every single day — no exceptions", "Warm shower allowed before cold part", "Track time in cold water daily"]',
  true, true, 0
),
(
  '14-Day Digital Detox Morning',
  'No phone for the first 60 minutes after waking. Start each day with clarity, not scrolling.',
  14,
  '["Zero phone use for first 60 min after waking", "Alarm clock allowed (or set alarm night before)", "Journaling, stretching, or reading instead", "Note how mornings feel without phone"]',
  false, true, 0
),
(
  '30-Day Read Daily',
  'Read minimum 20 pages of any book every single day for 30 days.',
  30,
  '["Minimum 20 pages per day", "Any book counts — fiction or non-fiction", "Audiobooks do NOT count", "Log what you read each day"]',
  true, true, 0
),
(
  '7-Day No Sugar Challenge',
  'Zero added sugar for 7 days. Fresh fruits are allowed. Restart if you fail.',
  7,
  '["Zero added sugar — no sweets, soda, packaged juice", "Fresh whole fruits allowed", "Read ingredient labels carefully", "Restart from Day 1 if you slip"]',
  true, true, 0
)
ON CONFLICT DO NOTHING;
