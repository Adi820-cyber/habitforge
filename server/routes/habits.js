const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const streakService = require('../services/streakService');
const rewardService = require('../services/rewardService');
const punishmentService = require('../services/punishmentService');

// GET /habits/preloaded
router.get('/preloaded', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('habits').select('*').eq('is_preloaded', true).is('user_id', null);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /habits/preloaded/:id/add
router.post('/preloaded/:id/add', auth, async (req, res) => {
  const { data: template, error: tErr } = await supabaseAdmin
    .from('habits').select('*').eq('id', req.params.id).single();
  if (tErr) return res.status(404).json({ error: 'Preloaded habit not found' });

  const { data, error } = await supabaseAdmin.from('habits').insert({
    user_id: req.user.id,
    name: template.name,
    category: template.category,
    frequency: template.frequency,
    description: template.description,
    habit_type: template.habit_type || 'good',
    is_preloaded: false,
    is_archived: false
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// GET /habits — all user habits with optional ?date= for logs
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('habits').select('*')
    .eq('user_id', req.user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /habits — create habit
router.post('/', auth, async (req, res) => {
  const { name, category, frequency, description, frequency_days, habit_type } = req.body;
  if (!name) return res.status(400).json({ error: 'Habit name is required' });

  const { data, error } = await supabaseAdmin.from('habits').insert({
    user_id: req.user.id,
    name,
    category: category || 'Custom',
    frequency: frequency || 'daily',
    description: description || '',
    frequency_days: frequency_days || null,
    habit_type: habit_type || 'good',
    is_preloaded: false,
    is_archived: false
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PUT /habits/:id — update
router.put('/:id', auth, async (req, res) => {
  const { name, category, description, frequency, frequency_days, habit_type } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (category) updates.category = category;
  if (description !== undefined) updates.description = description;
  if (frequency) updates.frequency = frequency;
  if (frequency_days !== undefined) updates.frequency_days = frequency_days;
  if (habit_type) updates.habit_type = habit_type;

  const { data, error } = await supabaseAdmin.from('habits')
    .update(updates).eq('id', req.params.id).eq('user_id', req.user.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /habits/:id — soft archive
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabaseAdmin.from('habits')
    .update({ is_archived: true }).eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Habit archived' });
});

// GET /habits/logs?date=YYYY-MM-DD
router.get('/logs', auth, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const { data, error } = await supabaseAdmin
    .from('habit_logs')
    .select('*, habits(name, category, habit_type)')
    .eq('user_id', req.user.id)
    .eq('log_date', date);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /habits/:id/log — mark done/skipped for a specific date
router.post('/:id/log', auth, async (req, res) => {
  const { status, note, date } = req.body;
  const logDate = date || new Date().toISOString().split('T')[0];

  if (!['done', 'skipped', 'missed'].includes(status)) {
    return res.status(400).json({ error: 'Status must be done, skipped, or missed' });
  }

  // Fetch the habit to know its type
  const { data: habit } = await supabaseAdmin
    .from('habits').select('habit_type, name')
    .eq('id', req.params.id).eq('user_id', req.user.id).single();

  const habitType = habit?.habit_type || 'good';

  const { data, error } = await supabaseAdmin.from('habit_logs').upsert({
    habit_id: req.params.id,
    user_id: req.user.id,
    log_date: logDate,
    status,
    note: note || ''
  }, { onConflict: 'habit_id,log_date' }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  let reward = null;
  let punishment = null;

  if (habitType === 'good') {
    if (status === 'done') {
      await supabaseAdmin.rpc('increment_points', { user_id: req.user.id, amount: 10 });
      const unlocked = await rewardService.checkUnlocks(req.user.id);
      // Always give a random reward hint even if nothing unlocked yet
      reward = unlocked || await rewardService.pickRandom(req.user.id);
    } else if (status === 'missed') {
      punishment = await punishmentService.triggerForHabit(req.user.id, req.params.id);
    }
  } else if (habitType === 'bad') {
    if (status === 'done') {
      // Did the bad habit → punishment + lose points
      punishment = await punishmentService.triggerForHabit(req.user.id, req.params.id);
    } else if (status === 'skipped') {
      // Resisted the bad habit → reward + gain points
      await supabaseAdmin.rpc('increment_points', { user_id: req.user.id, amount: 15 });
      const unlocked = await rewardService.checkUnlocks(req.user.id);
      reward = unlocked || await rewardService.pickRandom(req.user.id);
    }
  }

  return res.json({ ...data, habit_type: habitType, reward, punishment });
});

// GET /habits/:id/streak
router.get('/:id/streak', auth, async (req, res) => {
  const streak = await streakService.getStreak(req.params.id, req.user.id);
  return res.json(streak);
});

module.exports = router;
