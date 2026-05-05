const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');

function friendlyAuthError(msg) {
  if (!msg) return 'Something went wrong';
  if (msg.includes('rate limit') || msg.includes('email rate')) return 'Supabase email rate limit hit. Go to Supabase Dashboard → Auth → Providers → Email → turn OFF "Confirm email" and Save. Then try again.';
  if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('User already')) return 'Email already registered. Please sign in instead.';
  if (msg.includes('Invalid login credentials')) return 'Wrong email or password.';
  if (msg.includes('Email not confirmed')) return 'Email not confirmed. Disable email confirmation in Supabase dashboard or check your inbox.';
  if (msg.includes('weak password') || msg.includes('Password should')) return 'Password too weak — use 8+ chars with letters and numbers.';
  return msg;
}

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password || !display_name) {
      return res.status(400).json({ error: 'Email, password and display name are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: friendlyAuthError(error.message) });

    // Upsert user profile (safe for retries)
    if (data.user) {
      await supabaseAdmin.from('users').upsert({
        id: data.user.id,
        email,
        display_name,
        timezone: req.body.timezone || 'Asia/Kolkata',
        points: 0
      }, { onConflict: 'id' });
    }

    return res.status(201).json({
      message: data.session ? 'Account created!' : 'Account created! Sign in now (or confirm email if required).',
      user: data.user,
      session: data.session
    });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: friendlyAuthError(error.message) });

    return res.json({ session: data.session, user: data.user });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) await supabase.auth.admin?.signOut(token);
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err.message);
    return res.json({ message: 'Logged out' });
  }
});

// GET /auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'User not found' });
  return res.json(data);
});

// PUT /auth/me - update profile
router.put('/me', require('../middleware/auth'), async (req, res) => {
  const { display_name, timezone, push_subscription } = req.body;
  const updates = {};
  if (display_name) updates.display_name = display_name;
  if (timezone) updates.timezone = timezone;
  if (push_subscription !== undefined) updates.push_subscription = JSON.stringify(push_subscription);

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

module.exports = router;
