const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const aiService = require('../services/aiService');

// Simple in-memory rate limiter for AI endpoints (max 10 per hour per user)
const aiCallCounts = new Map();
function aiRateLimit(req, res, next) {
  const key = req.user?.id;
  if (!key) return next();
  const now = Date.now();
  const record = aiCallCounts.get(key) || { count: 0, resetAt: now + 3600000 };
  if (now > record.resetAt) { record.count = 0; record.resetAt = now + 3600000; }
  if (record.count >= 15) {
    return res.status(429).json({ error: 'AI rate limit: max 15 diary AI calls per hour. Try again later.' });
  }
  record.count++;
  aiCallCounts.set(key, record);
  next();
}

// POST /diary/ai-process
router.post('/ai-process', auth, aiRateLimit, async (req, res) => {
  const { raw_entry, mood_emoji, energy_level } = req.body;

  if (!raw_entry || raw_entry.trim().length < 10) {
    return res.status(400).json({ error: 'Entry must be at least 10 characters' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: logs } = await supabaseAdmin
      .from('habit_logs').select('status, habits(name)')
      .eq('user_id', req.user.id).eq('log_date', today);

    const { data: recentEntries } = await supabaseAdmin
      .from('diary_entries').select('mood_emoji, entry_date')
      .eq('user_id', req.user.id)
      .gte('entry_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
      .order('entry_date', { ascending: false });

    const habitData = (logs || []).map(l => ({ name: l.habits?.name || 'Unknown', status: l.status }));
    const recentMoods = (recentEntries || []).map(e => e.mood_emoji).filter(Boolean);

    const aiResponse = await aiService.processDiaryEntry(raw_entry, habitData, mood_emoji, energy_level, recentMoods);
    return res.json(aiResponse);
  } catch (err) {
    console.error('Diary AI route error:', err.message);
    // Always return graceful fallback — never 500
    return res.json({
      corrected_entry: req.body.raw_entry,
      english_lessons: [],
      mood_analysis: {
        detected_mood: req.body.mood_emoji ? 'noted' : 'neutral',
        energy_level: req.body.energy_level || 'medium',
        emotional_keywords: [],
        mood_summary: 'AI temporarily unavailable. Your entry is saved safely.'
      },
      habit_suggestions: [],
      coach_message: 'Great job writing today! Daily journaling is itself a powerful habit. Keep going! 📝'
    });
  }
});

// POST /diary/entry
router.post('/entry', auth, async (req, res) => {
  const { entry_date, encrypted_blob, iv, salt, mood_emoji, energy_level, word_count, has_ai_response } = req.body;
  const date = entry_date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin.from('diary_entries').upsert({
    user_id: req.user.id, entry_date: date, encrypted_blob, iv, salt,
    mood_emoji: mood_emoji || null, energy_level: energy_level || null,
    word_count: word_count || 0, has_ai_response: has_ai_response !== false
  }, { onConflict: 'user_id,entry_date' }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// GET /diary/entries
router.get('/entries', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('diary_entries')
    .select('id, entry_date, mood_emoji, energy_level, word_count, has_ai_response, created_at')
    .eq('user_id', req.user.id).order('entry_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /diary/entry/:date
router.get('/entry/:date', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('diary_entries')
    .select('encrypted_blob, iv, salt, mood_emoji, energy_level, word_count')
    .eq('user_id', req.user.id).eq('entry_date', req.params.date).single();
  if (error || !data) return res.status(404).json({ error: 'Entry not found' });
  return res.json(data);
});

// DELETE /diary/entry/:date
router.delete('/entry/:date', auth, async (req, res) => {
  const { error } = await supabaseAdmin.from('diary_entries')
    .delete().eq('user_id', req.user.id).eq('entry_date', req.params.date);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Entry deleted permanently' });
});

// GET /diary/mood-trend
router.get('/mood-trend', auth, async (req, res) => {
  const from = new Date(); from.setDate(from.getDate() - 30);
  const { data, error } = await supabaseAdmin
    .from('diary_entries').select('entry_date, mood_emoji, energy_level')
    .eq('user_id', req.user.id).gte('entry_date', from.toISOString().split('T')[0])
    .order('entry_date', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /diary/english-progress
router.get('/english-progress', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('diary_english_progress').select('*').eq('user_id', req.user.id)
    .order('week_start', { ascending: false }).limit(8);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /diary/english-progress
router.post('/english-progress', auth, async (req, res) => {
  const { week_start, total_mistakes, common_error_types, entries_written, avg_word_count } = req.body;
  const { data, error } = await supabaseAdmin.from('diary_english_progress').upsert({
    user_id: req.user.id, week_start, total_mistakes: total_mistakes || 0,
    common_error_types: common_error_types || [], entries_written: entries_written || 0,
    avg_word_count: avg_word_count || 0
  }, { onConflict: 'user_id,week_start' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /diary/export-data
router.get('/export-data', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('diary_entries').select('entry_date, encrypted_blob, iv, salt, mood_emoji, energy_level')
    .eq('user_id', req.user.id).order('entry_date', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /diary/weekly-insight
router.get('/weekly-insight', auth, async (req, res) => {
  try {
    const from = new Date(); from.setDate(from.getDate() - 7);
    const [moodRes, habitRes, progressRes] = await Promise.all([
      supabaseAdmin.from('diary_entries').select('mood_emoji, energy_level, entry_date')
        .eq('user_id', req.user.id).gte('entry_date', from.toISOString().split('T')[0]),
      supabaseAdmin.from('habit_logs').select('log_date, status')
        .eq('user_id', req.user.id).gte('log_date', from.toISOString().split('T')[0]),
      supabaseAdmin.from('diary_english_progress').select('total_mistakes, week_start')
        .eq('user_id', req.user.id).order('week_start', { ascending: false }).limit(2)
    ]);
    const moodData = (moodRes.data || []).map(e => e.mood_emoji);
    const energyData = (moodRes.data || []).map(e => e.energy_level);
    const habitLogs = habitRes.data || [];
    const doneCount = habitLogs.filter(l => l.status === 'done').length;
    const totalCount = habitLogs.length;
    const habitRates = { done: doneCount, total: totalCount, rate: totalCount > 0 ? Math.round(doneCount/totalCount*100) : 0 };
    const errorCounts = (progressRes.data || [])[0]?.total_mistakes || 0;
    const insight = await aiService.generateWeeklyInsight(req.user.id, moodData, energyData, habitRates, errorCounts);
    return res.json(insight);
  } catch (err) {
    console.error('Weekly insight error:', err.message);
    return res.json({
      mood_pattern: 'Keep tracking your moods daily to see patterns emerge.',
      best_day: 'Not enough data yet — check back after a full week.',
      habit_correlation: 'Complete more habits to unlock habit insights.',
      english_progress: 'Write diary entries regularly to improve your English.',
      next_week_focus: ['Stay consistent with daily habits', 'Write in your diary every day', 'Complete at least 70% of your habits']
    });
  }
});

module.exports = router;
