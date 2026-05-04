require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.APP_URL : '*',
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
app.use('/api/v1/diary/ai-process', aiLimiter);
app.use('/api/v1/diary', limiter, require('./routes/diary'));

// Push notification subscribe endpoint
app.post('/api/v1/push/subscribe', require('./middleware/auth'), async (req, res) => {
  const { supabaseAdmin } = require('./config/supabase');
  const { subscription } = req.body;
  await supabaseAdmin.from('users')
    .update({ push_subscription: JSON.stringify(subscription) })
    .eq('id', req.user.id);
  res.json({ message: 'Push subscription saved' });
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

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🔥 HabitForge server running on http://localhost:${PORT}`);
  console.log(`📱 Open in browser to use the app`);
  console.log(`🌐 API base: http://localhost:${PORT}/api/v1\n`);
});

module.exports = app;
