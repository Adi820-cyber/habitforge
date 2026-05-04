const { supabaseAdmin } = require('../config/supabase');

async function getStreak(habitId, userId) {
  const { data: logs } = await supabaseAdmin
    .from('habit_logs')
    .select('log_date, status')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .eq('status', 'done')
    .order('log_date', { ascending: false });

  if (!logs || logs.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const doneDates = new Set(logs.map(l => l.log_date));

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checkDate = new Date(today);
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (doneDates.has(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Allow today to be missing (not yet logged)
      if (checkDate.getTime() === today.getTime()) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  // Calculate longest streak
  const sortedDates = [...doneDates].sort();
  let longest = 0;
  let current = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  longest = Math.max(longest, current, currentStreak);

  return { currentStreak, longestStreak: longest };
}

module.exports = { getStreak };
