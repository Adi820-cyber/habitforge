require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Catch unhandled async errors so the server never crashes on Render ──
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err);
  // Don't exit — keep the server alive on Render
});

// Trust Render's reverse proxy (fixes express-rate-limit X-Forwarded-For error)
app.set('trust proxy', 1);

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "*.supabase.co", "generativelanguage.googleapis.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
      workerSrc: ["'self'", "blob:"],
      mediaSrc: ["'self'", "blob:"]
    }
  }
}));

// ── CORS — In production, allow same-origin (frontend is served from the same server) ──
// No need for APP_URL since frontend + backend are on the same Render service.
app.use(cors({
  origin: true,  // reflects the request origin — safe since auth is token-based
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — only strict in production
const isDev = process.env.NODE_ENV !== 'production';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 500,
  message: { error: 'Too many requests, please slow down' },
  skip: () => isDev  // Skip entirely in development
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 20,
  message: { error: 'AI rate limit exceeded, wait 1 minute' },
  skip: () => isDev  // Skip entirely in development
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 50,
  message: { error: 'Too many auth attempts, try again later' },
  skip: () => isDev
});


// API Routes
app.use('/api/v1/auth', authLimiter, require('./routes/auth'));
app.use('/api/v1/habits', limiter, require('./routes/habits'));
app.use('/api/v1/rewards', limiter, require('./routes/rewards'));
app.use('/api/v1/punishments', limiter, require('./routes/punishments'));
app.use('/api/v1/challenges', limiter, require('./routes/challenges'));
app.use('/api/v1/stats', limiter, require('./routes/stats'));
// Mount diary with AI sub-path rate limiter applied inline on the router
app.use('/api/v1/diary', limiter, require('./routes/diary'));

// Push notification subscribe endpoint
app.post('/api/v1/push/subscribe', require('./middleware/auth'), async (req, res) => {
  try {
    const { supabaseAdmin } = require('./config/supabase');
    const { subscription } = req.body;
    await supabaseAdmin.from('users')
      .update({ push_subscription: JSON.stringify(subscription) })
      .eq('id', req.user.id);
    res.json({ message: 'Push subscription saved' });
  } catch (err) {
    console.error('Push subscribe error:', err.message);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

// VAPID public key endpoint (frontend needs this)
app.get('/api/v1/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../public')));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Global error handler — catches thrown errors in async routes (via express 5+ or express-async-errors)
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack || err.message || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🔥 HabitForge server running on port ${PORT}`);
  console.log(`📱 Open in browser to use the app`);
  console.log(`🌐 API base: /api/v1\n`);
});

module.exports = app;
