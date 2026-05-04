const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const rewardService = require('../services/rewardService');

// GET /rewards/preloaded
router.get('/preloaded', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('rewards').select('*').eq('is_preloaded', true).is('user_id', null);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /rewards/logs
router.get('/logs', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('reward_logs').select('*, rewards(name, level)')
    .eq('user_id', req.user.id)
    .order('earned_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /rewards - all user rewards
router.get('/', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const { data: rewards, error } = await supabaseAdmin
    .from('rewards').select('*')
    .or(`user_id.eq.${req.user.id},is_preloaded.eq.true`);

  if (error) return res.status(500).json({ error: error.message });

  // Check which rewards are earned today
  const { data: earnedToday } = await supabaseAdmin
    .from('reward_logs').select('reward_id, used')
    .eq('user_id', req.user.id)
    .gte('earned_at', today + 'T00:00:00Z');

  const earnedMap = {};
  (earnedToday || []).forEach(r => { earnedMap[r.reward_id] = r.used; });

  const result = (rewards || []).map(r => ({
    ...r,
    earned_today: earnedMap[r.id] !== undefined,
    used_today: earnedMap[r.id] === true
  }));

  return res.json(result);
});

// POST /rewards - create custom reward
router.post('/', auth, async (req, res) => {
  const { name, level, condition_type, condition_value } = req.body;
  if (!name || !condition_type || !condition_value) {
    return res.status(400).json({ error: 'name, condition_type, and condition_value are required' });
  }

  const { data, error } = await supabaseAdmin.from('rewards').insert({
    user_id: req.user.id,
    name, level: level || 'small',
    condition_type, condition_value,
    is_preloaded: false
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// DELETE /rewards/:id
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabaseAdmin.from('rewards')
    .delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Reward deleted' });
});

// POST /rewards/:id/use
router.post('/:id/use', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabaseAdmin.from('reward_logs')
    .update({ used: true })
    .eq('user_id', req.user.id)
    .eq('reward_id', req.params.id)
    .gte('earned_at', today + 'T00:00:00Z');

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Reward marked as used' });
});

// POST /rewards/check - manually trigger unlock check
router.post('/check', auth, async (req, res) => {
  await rewardService.checkUnlocks(req.user.id);
  return res.json({ message: 'Reward check completed' });
});

module.exports = router;
