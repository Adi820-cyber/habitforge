const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

// GET /stats/today
router.get('/today', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const { data: user } = await supabaseAdmin.from('users').select('points, daily_suggestion_date, daily_suggestion_text').eq('id', req.user.id).single();

  const { data: habits } = await supabaseAdmin.from('habits').select('id').eq('user_id', req.user.id).eq('is_archived', false).eq('habit_type', 'good');
  const { data: logs } = await supabaseAdmin.from('habit_logs').select('status, habit_id').eq('user_id', req.user.id).eq('log_date', today);

  const doneCount = (logs || []).filter(l => l.status === 'done').length;
  const totalCount = (habits || []).length;
  const completionRate = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

  // Calculate current habit streak — single query, then compute in JS
  let streak = 0;
  const streakFrom = new Date();
  streakFrom.setDate(streakFrom.getDate() - 90); // look back max 90 days
  const { data: recentDoneLogs } = await supabaseAdmin
    .from('habit_logs').select('log_date')
    .eq('user_id', req.user.id).eq('status', 'done')
    .gte('log_date', streakFrom.toISOString().split('T')[0])
    .order('log_date', { ascending: false });

  const doneDates = new Set((recentDoneLogs || []).map(l => l.log_date));
  for (let i = 0; i < 90; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (doneDates.has(dateStr)) streak++;
    else if (i > 0) break; // gap found — streak ends
    // if i===0 (today) and not done, don't break yet (they might complete it today)
  }

  let ai_suggestion = null;
  if (user?.daily_suggestion_date === today && user?.daily_suggestion_text) {
    try { ai_suggestion = JSON.parse(user.daily_suggestion_text); } catch { ai_suggestion = null; }
  }

  return res.json({ done_count: doneCount, total_count: totalCount, completion_rate: completionRate, best_streak: streak, points: user?.points || 0, ai_suggestion });
});

// GET /stats/weekly
router.get('/weekly', auth, async (req, res) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const { data: logs } = await supabaseAdmin.from('habit_logs').select('log_date, status').eq('user_id', req.user.id).in('log_date', days);
  const { data: habits } = await supabaseAdmin.from('habits').select('id').eq('user_id', req.user.id).eq('is_archived', false).eq('habit_type', 'good');
  const total = (habits || []).length;

  const result = days.map(day => {
    const dayLogs = (logs || []).filter(l => l.log_date === day);
    const done = dayLogs.filter(l => l.status === 'done').length;
    const d = new Date(day + 'T00:00:00');
    return { date: day, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), done, total };
  });

  return res.json(result);
});

// GET /stats/heatmap
router.get('/heatmap', auth, async (req, res) => {
  const months = parseInt(req.query.months) || 3;
  const from = new Date(); from.setMonth(from.getMonth() - months);
  const { data: logs } = await supabaseAdmin.from('habit_logs').select('log_date, status').eq('user_id', req.user.id).gte('log_date', from.toISOString().split('T')[0]);
  const heatmap = {};
  (logs || []).forEach(l => {
    if (!heatmap[l.log_date]) heatmap[l.log_date] = { done: 0, total: 0 };
    heatmap[l.log_date].total++;
    if (l.status === 'done') heatmap[l.log_date].done++;
  });
  return res.json(heatmap);
});

// GET /stats/points
router.get('/points', auth, async (req, res) => {
  const { data: user } = await supabaseAdmin.from('users').select('points').eq('id', req.user.id).single();
  const { data: allUsers } = await supabaseAdmin.from('users').select('id, points').order('points', { ascending: false }).limit(100);
  const rank = (allUsers || []).findIndex(u => u.id === req.user.id) + 1;
  return res.json({ points: user?.points || 0, rank: rank || null });
});

// GET /stats/suggestion — triggers fresh AI suggestion and saves it
router.get('/suggestion', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const { data: user } = await supabaseAdmin.from('users').select('daily_suggestion_date, daily_suggestion_text').eq('id', req.user.id).single();

  if (user?.daily_suggestion_date === today && user?.daily_suggestion_text) {
    try { return res.json(JSON.parse(user.daily_suggestion_text)); } catch {}
  }

  const { data: habits } = await supabaseAdmin.from('habits').select('id, name').eq('user_id', req.user.id).eq('is_archived', false).eq('habit_type', 'good');
  const { data: logs } = await supabaseAdmin.from('habit_logs').select('habit_id, status').eq('user_id', req.user.id).eq('log_date', today);

  const logMap = {}; (logs || []).forEach(l => { logMap[l.habit_id] = l.status; });
  const habitsWithStatus = (habits || []).map(h => ({ ...h, status: logMap[h.id] || 'pending' }));
  const doneCount = habitsWithStatus.filter(h => h.status === 'done').length;

  const aiService = require('../services/aiService');
  const suggestion = await aiService.generateDailySuggestion(req.user.id, habitsWithStatus, doneCount, habitsWithStatus.length);

  await supabaseAdmin.from('users').update({ daily_suggestion_date: today, daily_suggestion_text: JSON.stringify(suggestion) }).eq('id', req.user.id);

  return res.json(suggestion);
});

// GET /stats/bad-habits
router.get('/bad-habits', auth, async (req, res) => {
  const from = new Date(); from.setDate(from.getDate() - 30);
  const fromStr = from.toISOString().split('T')[0];
  const { data: badHabits } = await supabaseAdmin.from('habits').select('id, name, category').eq('user_id', req.user.id).eq('habit_type', 'bad').eq('is_archived', false);
  if (!badHabits || badHabits.length === 0) return res.json([]);
  const { data: logs } = await supabaseAdmin.from('habit_logs').select('habit_id, status, log_date').eq('user_id', req.user.id).in('habit_id', badHabits.map(h => h.id)).gte('log_date', fromStr);
  const result = badHabits.map(h => {
    const habitLogs = (logs || []).filter(l => l.habit_id === h.id);
    const resisted = habitLogs.filter(l => l.status === 'skipped').length;
    const slipped = habitLogs.filter(l => l.status === 'done').length;
    const total = habitLogs.length;
    const resistRate = total > 0 ? Math.round(resisted / total * 100) : 0;
    let streak = 0;
    const sorted = [...habitLogs].sort((a, b) => b.log_date.localeCompare(a.log_date));
    for (const log of sorted) { if (log.status === 'skipped') streak++; else break; }
    return { ...h, resisted, slipped, total, resistRate, streak };
  });
  return res.json(result);
});

// GET /stats/points-ledger
router.get('/points-ledger', auth, async (req, res) => {
  const from = new Date(); from.setDate(from.getDate() - 30);
  const fromStr = from.toISOString().split('T')[0];

  const [habitLogsRes, punLogsRes] = await Promise.all([
    supabaseAdmin.from('habit_logs').select('log_date, status, habits(name, habit_type)').eq('user_id', req.user.id).gte('log_date', fromStr).order('log_date', { ascending: false }).limit(100),
    supabaseAdmin.from('punishment_logs').select('triggered_at, completed, skipped, punishments(name)').eq('user_id', req.user.id).gte('triggered_at', from.toISOString()).order('triggered_at', { ascending: false }).limit(50)
  ]);

  const entries = [];

  for (const log of habitLogsRes.data || []) {
    const type = log.habits?.habit_type || 'good';
    if (type === 'good' && log.status === 'done') {
      entries.push({ date: log.log_date, label: `✅ ${log.habits?.name}`, points: +10, type: 'earned' });
    } else if (type === 'good' && log.status === 'missed') {
      entries.push({ date: log.log_date, label: `❌ Missed: ${log.habits?.name}`, points: 0, type: 'missed' });
    } else if (type === 'bad' && log.status === 'skipped') {
      entries.push({ date: log.log_date, label: `💪 Resisted: ${log.habits?.name}`, points: +15, type: 'earned' });
    } else if (type === 'bad' && log.status === 'done') {
      entries.push({ date: log.log_date, label: `😔 Slipped: ${log.habits?.name}`, points: -15, type: 'lost' });
    }
  }

  for (const log of punLogsRes.data || []) {
    const date = (log.triggered_at || '').split('T')[0];
    if (log.completed) entries.push({ date, label: `💪 Completed: ${log.punishments?.name}`, points: +3, type: 'earned' });
    if (log.skipped) entries.push({ date, label: `⚠️ Skipped: ${log.punishments?.name}`, points: -10, type: 'lost' });
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));
  return res.json(entries.slice(0, 80));
});

module.exports = router;
