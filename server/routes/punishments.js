const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

// GET /punishments/preloaded
router.get('/preloaded', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('punishments').select('*').eq('is_preloaded', true).is('user_id', null);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /punishments/logs
router.get('/logs', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('punishment_logs')
    .select('*, punishments(name, severity), habits(name)')
    .eq('user_id', req.user.id)
    .order('triggered_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /punishments - all user punishments
router.get('/', auth, async (req, res) => {
  const { data: punishments, error } = await supabaseAdmin
    .from('punishments').select('*')
    .or(`user_id.eq.${req.user.id},is_preloaded.eq.true`);
  if (error) return res.status(500).json({ error: error.message });

  // Get active (pending) punishment logs
  const { data: activeLogs } = await supabaseAdmin
    .from('punishment_logs').select('*, punishments(name, severity)')
    .eq('user_id', req.user.id)
    .eq('completed', false)
    .eq('skipped', false)
    .order('triggered_at', { ascending: false });

  return res.json({ punishments, active_punishments: activeLogs || [] });
});

// POST /punishments - create custom
router.post('/', auth, async (req, res) => {
  const { name, severity, trigger_condition } = req.body;
  if (!name || !severity) return res.status(400).json({ error: 'name and severity required' });

  const { data, error } = await supabaseAdmin.from('punishments').insert({
    user_id: req.user.id,
    name, severity,
    trigger_condition: trigger_condition || 'habit_missed',
    is_preloaded: false
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// DELETE /punishments/:id
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabaseAdmin.from('punishments')
    .delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Punishment deleted' });
});

// POST /punishments/logs/:id/complete
router.post('/logs/:id/complete', auth, async (req, res) => {
  const { error } = await supabaseAdmin.from('punishment_logs')
    .update({ completed: true }).eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  // Restore some points for completing punishment
  await supabaseAdmin.rpc('increment_points', { user_id: req.user.id, amount: 3 });
  return res.json({ message: 'Punishment completed! +3 points' });
});

// POST /punishments/logs/:id/skip
router.post('/logs/:id/skip', auth, async (req, res) => {
  const { error } = await supabaseAdmin.from('punishment_logs')
    .update({ skipped: true }).eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  // Shame score — deduct points
  await supabaseAdmin.rpc('decrement_points', { user_id: req.user.id, amount: 10 });
  return res.json({ message: 'Punishment skipped. -10 shame points.' });
});

module.exports = router;
