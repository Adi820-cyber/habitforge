const { supabaseAdmin } = require('../config/supabase');

// Pick a random reward to show as a "surprise reward" when completing good habits
async function pickRandom(userId) {
  const { data: own } = await supabaseAdmin
    .from('rewards').select('id, name, level')
    .eq('user_id', userId);

  if (own && own.length > 0) {
    return own[Math.floor(Math.random() * own.length)];
  }

  // Fallback to preloaded rewards
  const { data: pre } = await supabaseAdmin
    .from('rewards').select('id, name, level')
    .eq('is_preloaded', true);

  if (pre && pre.length > 0) {
    return pre[Math.floor(Math.random() * pre.length)];
  }

  return null;
}

async function checkUnlocks(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { count: doneToday } = await supabaseAdmin
      .from('habit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('log_date', today)
      .eq('status', 'done');

    const { data: user } = await supabaseAdmin
      .from('users').select('points').eq('id', userId).single();

    const { data: rewards } = await supabaseAdmin
      .from('rewards').select('*')
      .or(`user_id.eq.${userId},is_preloaded.eq.true`);

    const { data: alreadyEarned } = await supabaseAdmin
      .from('reward_logs').select('reward_id')
      .eq('user_id', userId)
      .gte('earned_at', today + 'T00:00:00Z');

    const earnedIds = new Set((alreadyEarned || []).map(r => r.reward_id));
    let newlyUnlocked = null;

    for (const reward of (rewards || [])) {
      if (earnedIds.has(reward.id)) continue;
      let conditionMet = false;
      if (reward.condition_type === 'habits_done_today' && doneToday >= reward.condition_value) conditionMet = true;
      if (reward.condition_type === 'points' && (user?.points || 0) >= reward.condition_value) conditionMet = true;

      if (conditionMet) {
        await supabaseAdmin.from('reward_logs').insert({
          user_id: userId,
          reward_id: reward.id,
          earned_at: new Date().toISOString(),
          used: false
        });
        if (!newlyUnlocked) newlyUnlocked = reward; // return first newly unlocked
      }
    }

    return newlyUnlocked;
  } catch (err) {
    console.error('Reward check error:', err.message);
    return null;
  }
}

module.exports = { checkUnlocks, pickRandom };
