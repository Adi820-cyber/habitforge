const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

// GET /challenges - list all available challenges
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('challenges').select('*').order('total_completions', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /challenges/active - user's active challenges
router.get('/active', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_challenges')
    .select('*, challenges(name, description, duration_days, rules)')
    .eq('user_id', req.user.id)
    .eq('status', 'active');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /challenges/completed - user's completed challenges
router.get('/completed', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_challenges')
    .select('*, challenges(name, description, duration_days)')
    .eq('user_id', req.user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /challenges/:id - challenge details
router.get('/:id', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('challenges').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Challenge not found' });

  // Check if user has joined
  const { data: userChallenge } = await supabaseAdmin
    .from('user_challenges').select('*')
    .eq('user_id', req.user.id).eq('challenge_id', req.params.id)
    .eq('status', 'active').single();

  return res.json({ ...data, user_progress: userChallenge || null });
});

// POST /challenges/:id/join - start a challenge
router.post('/:id/join', auth, async (req, res) => {
  // Check if already active
  const { data: existing } = await supabaseAdmin
    .from('user_challenges').select('id').eq('user_id', req.user.id)
    .eq('challenge_id', req.params.id).eq('status', 'active').single();

  if (existing) return res.status(400).json({ error: 'You are already in this challenge' });

  const { data, error } = await supabaseAdmin.from('user_challenges').insert({
    user_id: req.user.id,
    challenge_id: req.params.id,
    started_at: new Date().toISOString().split('T')[0],
    current_day: 0,   // starts at 0; first check-in makes it Day 1
    status: 'active'
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// POST /challenges/:id/checkin - daily check-in with task notes
router.post('/:id/checkin', auth, async (req, res) => {
  const { notes } = req.body;
  const today = new Date().toISOString().split('T')[0];

  const { data: uc, error } = await supabaseAdmin
    .from('user_challenges').select('*, challenges(duration_days, reset_on_miss, name)')
    .eq('user_id', req.user.id).eq('challenge_id', req.params.id).eq('status', 'active').single();

  if (error || !uc) return res.status(404).json({ error: 'Active challenge not found' });

  // Prevent double check-in on same day
  if (uc.last_checkin_date === today) {
    return res.status(400).json({ error: 'Already checked in today! Come back tomorrow.' });
  }

  const newDay = uc.current_day + 1;  // 0→1 on first check-in, then 1→2 etc.
  const isComplete = newDay >= uc.challenges.duration_days;

  const updates = isComplete
    ? { current_day: uc.challenges.duration_days, status: 'completed', completed_at: new Date().toISOString(), last_checkin_date: today, last_checkin_notes: notes || null }
    : { current_day: newDay, last_checkin_date: today, last_checkin_notes: notes || null };

  const { data: updated } = await supabaseAdmin.from('user_challenges')
    .update(updates).eq('id', uc.id).select().single();

  if (isComplete) {
    await supabaseAdmin.rpc('increment_challenge_completions', { challenge_id: req.params.id });
    await supabaseAdmin.rpc('increment_points', { user_id: req.user.id, amount: 500 });
    return res.json({ ...updated, completed: true, message: `🏆 ${uc.challenges.name} completed! +500 points!` });
  }

  await supabaseAdmin.rpc('increment_points', { user_id: req.user.id, amount: 20 });
  return res.json({ ...updated, completed: false, current_day: newDay });
});

// POST /challenges - create custom challenge
router.post('/', auth, async (req, res) => {
  const { name, description, duration_days, rules, reset_on_miss } = req.body;
  if (!name || !duration_days || !rules) {
    return res.status(400).json({ error: 'name, duration_days, and rules are required' });
  }

  const { data, error } = await supabaseAdmin.from('challenges').insert({
    name, description: description || '',
    duration_days, rules,
    reset_on_miss: reset_on_miss !== false,
    is_preloaded: false,
    created_by: req.user.id,
    total_completions: 0
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

module.exports = router;
