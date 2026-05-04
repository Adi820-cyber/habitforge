const { supabaseAdmin } = require('../config/supabase');

// Picks a random punishment for the user (user's own first, then preloaded)
async function pickRandom(userId) {
  // User's own punishments first
  const { data: own } = await supabaseAdmin
    .from('punishments').select('id, name, severity')
    .eq('user_id', userId);

  if (own && own.length > 0) {
    return own[Math.floor(Math.random() * own.length)];
  }

  // Fallback to preloaded punishments
  const { data: pre } = await supabaseAdmin
    .from('punishments').select('id, name, severity')
    .eq('is_preloaded', true);

  if (pre && pre.length > 0) {
    return pre[Math.floor(Math.random() * pre.length)];
  }

  return null;
}

async function triggerForHabit(userId, habitId) {
  try {
    const punishment = await pickRandom(userId);
    if (!punishment) return null;

    // Prevent double-trigger for same habit today
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabaseAdmin
      .from('punishment_logs').select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .gte('triggered_at', today + 'T00:00:00Z');

    if (count > 0) return punishment; // already triggered, just return name

    await supabaseAdmin.from('punishment_logs').insert({
      user_id: userId,
      punishment_id: punishment.id,
      habit_id: habitId,
      triggered_at: new Date().toISOString(),
      completed: false,
      skipped: false
    });

    await supabaseAdmin.rpc('decrement_points', { user_id: userId, amount: 15 });
    return punishment;
  } catch (err) {
    console.error('Punishment trigger error:', err.message);
    return null;
  }
}

module.exports = { triggerForHabit, pickRandom };
