// ── SHARED COMPONENTS (All 5 Tiers) ──

// ── TOAST ──
function toast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, duration);
}

// ── MODAL ──
function showModal(content, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-sheet"><div class="modal-handle"></div>${content}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); if (onClose) onClose(); } });
  document.getElementById('modal-container').appendChild(overlay);
  return overlay;
}
function closeModal() { const m = document.querySelector('.modal-overlay'); if (m) m.remove(); }

function confirm(msg, onConfirm, confirmText = 'Confirm', dangerMode = false) {
  const modal = showModal(`
    <h3 class="modal-title">${msg}</h3>
    <div style="display:flex;gap:10px;margin-top:8px;">
      <button class="btn btn-ghost btn-full" id="modal-cancel-btn">Cancel</button>
      <button class="btn ${dangerMode ? 'btn-danger' : 'btn-primary'} btn-full" id="modal-confirm-btn">${confirmText}</button>
    </div>
  `);
  modal.querySelector('#modal-cancel-btn').onclick = () => closeModal();
  modal.querySelector('#modal-confirm-btn').onclick = () => { closeModal(); onConfirm(); };
}

// ── UTILITIES ──
function skeleton(rows = 3) {
  return Array.from({ length: rows }, () =>
    `<div class="skeleton" style="height:72px;margin-bottom:10px;"></div>`
  ).join('');
}

function emptyState(icon, title, text, btnHtml = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><p class="empty-text">${text}</p>${btnHtml ? `<div style="margin-top:20px;">${btnHtml}</div>` : ''}</div>`;
}

function categoryColor(cat) {
  const m = { Focus: '#3B82F6', Fitness: '#10B981', Health: '#F59E0B', 'Digital Detox': '#8B5CF6', Mindset: '#EC4899', Custom: '#64748B' };
  return m[cat] || '#64748B';
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function severityBadge(s) {
  const m = { mild: 'badge-success', moderate: 'badge-warning', strict: 'badge-danger' };
  return `<span class="badge ${m[s] || 'badge-gray'}">${s}</span>`;
}

// ══════════════════════════════════════════════
// TIER 1 — CONFETTI ENGINE
// ══════════════════════════════════════════════
function fireConfetti(count = 30) {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  const colors = ['#2563EB', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#60A5FA'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.animationDuration = (1 + Math.random() * 1.5) + 's';
    piece.style.width = (6 + Math.random() * 8) + 'px';
    piece.style.height = (6 + Math.random() * 8) + 'px';
    if (Math.random() > 0.5) piece.style.borderRadius = '50%';
    container.appendChild(piece);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3000);
}

// ══════════════════════════════════════════════
// TIER 1 — ANIMATED COUNTER
// ══════════════════════════════════════════════
function animateCounter(el, target, duration = 800) {
  if (!el) return;
  const start = 0;
  const startTime = performance.now();
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ══════════════════════════════════════════════
// TIER 1 — PROGRESS RING SVG
// ══════════════════════════════════════════════
function progressRing(pct, size = 120, strokeWidth = 8) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : pct >= 20 ? '#60A5FA' : '#EF4444';
  return `
    <div class="progress-ring" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(51,65,85,0.4)" stroke-width="${strokeWidth}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}" style="filter: drop-shadow(0 0 6px ${color}40)"/>
      </svg>
      <div class="ring-label">
        <div class="ring-pct" style="color:${color}">${pct}%</div>
        <div class="ring-sub">complete</div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════
// TIER 1 — CELEBRATION ENGINE (Tiny Habits)
// ══════════════════════════════════════════════
const IDENTITY_MESSAGES = [
  "That's what a disciplined person does! 💪",
  "You're building the identity of a champion! 🏆",
  "Winners show up daily — just like you! 🔥",
  "This is who you are now! Keep proving it! ⭐",
  "Every check-mark rewires your brain. Science! 🧠",
  "You're not just doing habits — you're becoming unstoppable! 🚀",
  "Consistency is your superpower! ⚡",
  "Small actions, massive transformation! 💎",
];

function celebrate(pointsMsg, reward, habitType = 'good') {
  fireConfetti(25);
  const msg = IDENTITY_MESSAGES[Math.floor(Math.random() * IDENTITY_MESSAGES.length)];
  const emoji = reward?.level === 'big' ? '🏅' : reward?.level === 'medium' ? '🎮' : '🎁';

  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  overlay.innerHTML = `
    <div class="celebration-card">
      <div style="font-size:64px;margin-bottom:12px">${habitType === 'bad' ? '😤' : emoji}</div>
      <h3 style="font-size:20px;font-weight:800;margin-bottom:6px">${habitType === 'bad' ? 'Bad Habit Triggered!' : 'Habit Complete!'}</h3>
      <div style="color:${habitType === 'bad' ? 'var(--danger)' : 'var(--success)'};font-size:16px;font-weight:700;margin-bottom:10px">${pointsMsg}</div>
      <div style="font-size:14px;color:var(--accent-light);margin-bottom:14px;font-style:italic">"${msg}"</div>
      ${reward ? `
        <div style="background:rgba(255,255,255,0.05);border-radius:14px;padding:14px;margin-bottom:14px;border:1px solid var(--border)">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">🎁 Reward Suggestion</div>
          <div style="font-size:16px;font-weight:700;color:var(--accent-light)">${reward.name}</div>
        </div>
      ` : ''}
      <button class="btn btn-primary btn-full" onclick="this.closest('.celebration-overlay').remove()">🔥 Keep Going!</button>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 8000);
}

// ══════════════════════════════════════════════
// TIER 3 — LEVEL SYSTEM
// ══════════════════════════════════════════════
const LEVELS = [
  { name: 'Beginner', emoji: '🌱', min: 0 },
  { name: 'Apprentice', emoji: '🌿', min: 100 },
  { name: 'Builder', emoji: '🔨', min: 500 },
  { name: 'Warrior', emoji: '⚔️', min: 1500 },
  { name: 'Master', emoji: '🏅', min: 5000 },
  { name: 'Legend', emoji: '👑', min: 15000 },
];

function getLevel(points) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (points >= l.min) lvl = l; }
  const idx = LEVELS.indexOf(lvl);
  const next = LEVELS[idx + 1];
  const progress = next ? Math.round(((points - lvl.min) / (next.min - lvl.min)) * 100) : 100;
  return { ...lvl, progress, nextName: next?.name || 'MAX', nextMin: next?.min || lvl.min, pointsToNext: next ? next.min - points : 0 };
}

function levelBadgeHTML(points) {
  const lvl = getLevel(points);
  return `
    <div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span class="level-badge">${lvl.emoji} ${lvl.name}</span>
        <span style="font-size:11px;color:var(--text-dim)">${lvl.pointsToNext > 0 ? lvl.pointsToNext + ' pts to ' + lvl.nextName : '🏆 MAX LEVEL'}</span>
      </div>
      <div class="level-bar"><div class="level-fill" style="width:${lvl.progress}%"></div></div>
    </div>`;
}

// ══════════════════════════════════════════════
// TIER 3 — ACHIEVEMENT DEFINITIONS
// ══════════════════════════════════════════════
const ACHIEVEMENTS = [
  { id: 'first_habit', emoji: '🌟', name: 'First Step', desc: 'Create your first habit', check: (d) => d.totalHabits >= 1 },
  { id: 'streak_3', emoji: '🔥', name: '3-Day Fire', desc: '3-day streak', check: (d) => d.streak >= 3 },
  { id: 'streak_7', emoji: '💪', name: 'Week Warrior', desc: '7-day streak', check: (d) => d.streak >= 7 },
  { id: 'streak_14', emoji: '⚡', name: 'Unstoppable', desc: '14-day streak', check: (d) => d.streak >= 14 },
  { id: 'streak_30', emoji: '🏆', name: 'Monthly Master', desc: '30-day streak', check: (d) => d.streak >= 30 },
  { id: 'streak_75', emoji: '💎', name: '75 Hard', desc: '75-day streak', check: (d) => d.streak >= 75 },
  { id: 'points_100', emoji: '💰', name: 'First Hundred', desc: 'Earn 100 points', check: (d) => d.points >= 100 },
  { id: 'points_500', emoji: '🤑', name: 'Big Saver', desc: 'Earn 500 points', check: (d) => d.points >= 500 },
  { id: 'points_1000', emoji: '🏦', name: 'Thousandaire', desc: 'Earn 1000 points', check: (d) => d.points >= 1000 },
  { id: 'points_5000', emoji: '👑', name: 'Point King', desc: 'Earn 5000 points', check: (d) => d.points >= 5000 },
  { id: 'habits_5', emoji: '📋', name: 'Habit Collector', desc: 'Track 5 habits', check: (d) => d.totalHabits >= 5 },
  { id: 'bad_resist_10', emoji: '🛡️', name: 'Resistance', desc: 'Resist bad habits 10x', check: (d) => d.badResisted >= 10 },
  { id: 'diary_1', emoji: '📝', name: 'Dear Diary', desc: 'Write first diary entry', check: (d) => d.diaryEntries >= 1 },
  { id: 'diary_7', emoji: '📖', name: 'Journal Keeper', desc: 'Write 7 diary entries', check: (d) => d.diaryEntries >= 7 },
  { id: 'challenge_1', emoji: '🏅', name: 'Challenger', desc: 'Complete a challenge', check: (d) => d.challengesCompleted >= 1 },
  { id: 'perfect_day', emoji: '✨', name: 'Perfect Day', desc: '100% completion in a day', check: (d) => d.perfectDays >= 1 },
  { id: 'early_bird', emoji: '🌅', name: 'Early Bird', desc: 'Log before 7am', check: (d) => d.earlyLogs >= 1 },
  { id: 'night_owl', emoji: '🦉', name: 'Night Owl', desc: 'Log after 10pm', check: (d) => d.nightLogs >= 1 },
  { id: 'level_warrior', emoji: '⚔️', name: 'Warrior Status', desc: 'Reach Warrior level', check: (d) => d.points >= 1500 },
  { id: 'level_legend', emoji: '🏰', name: 'Legendary', desc: 'Reach Legend level', check: (d) => d.points >= 15000 },
];

function getUnlockedBadges() {
  try { return JSON.parse(localStorage.getItem('hf_badges') || '[]'); } catch { return []; }
}
function saveBadge(id) {
  const badges = getUnlockedBadges();
  if (!badges.includes(id)) { badges.push(id); localStorage.setItem('hf_badges', JSON.stringify(badges)); }
}
function checkBadges(data) {
  const unlocked = getUnlockedBadges();
  const newBadges = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.includes(a.id) && a.check(data)) { saveBadge(a.id); newBadges.push(a); }
  }
  return newBadges;
}

function badgeWallHTML() {
  const unlocked = getUnlockedBadges();
  return `<div class="badge-grid">${ACHIEVEMENTS.map(a => `
    <div class="badge-card ${unlocked.includes(a.id) ? 'unlocked' : 'locked'}">
      <span class="badge-emoji">${a.emoji}</span>
      <div class="badge-name">${a.name}</div>
      <div class="badge-desc">${a.desc}</div>
    </div>
  `).join('')}</div>`;
}

// ══════════════════════════════════════════════
// TIER 5 — QUOTES ENGINE
// ══════════════════════════════════════════════
const HABIT_QUOTES = [
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear", book: "Atomic Habits" },
  { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear", book: "Atomic Habits" },
  { text: "The task of breaking a bad habit is like uprooting a powerful oak within us.", author: "James Clear", book: "Atomic Habits" },
  { text: "Habits are the compound interest of self-improvement.", author: "James Clear", book: "Atomic Habits" },
  { text: "Champions don't do extraordinary things. They do ordinary things, but they do them without thinking.", author: "Charles Duhigg", book: "The Power of Habit" },
  { text: "Small wins are a steady application of a small advantage.", author: "Charles Duhigg", book: "The Power of Habit" },
  { text: "When a habit is fully formed, you don't need motivation — you just need a prompt.", author: "BJ Fogg", book: "Tiny Habits" },
  { text: "People change best by feeling good, not by feeling bad.", author: "BJ Fogg", book: "Tiny Habits" },
  { text: "The main thing is to keep the main thing the main thing.", author: "Stephen Covey", book: "The 7 Habits" },
  { text: "Begin with the end in mind.", author: "Stephen Covey", book: "The 7 Habits" },
  { text: "Seek clarity. Generate energy. Raise necessity. Increase productivity.", author: "Brendon Burchard", book: "High Performance Habits" },
  { text: "High performers don't just think about what they want — they envision who they want to become.", author: "Brendon Burchard", book: "High Performance Habits" },
  { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock", book: "" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun", book: "" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", book: "" },
];

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return HABIT_QUOTES[day % HABIT_QUOTES.length];
}

function quoteCardHTML() {
  const q = getDailyQuote();
  return `
    <div class="quote-card">
      <div class="quote-text">${q.text}</div>
      <div class="quote-author">— ${q.author}</div>
      ${q.book ? `<div class="quote-book">${q.book}</div>` : ''}
    </div>`;
}

// ══════════════════════════════════════════════
// TIER 5 — HABIT STRENGTH CALCULATOR
// ══════════════════════════════════════════════
function habitStrength(consistencyPct) {
  if (consistencyPct >= 90) return { label: 'Automatic', level: 4, color: '#10B981' };
  if (consistencyPct >= 70) return { label: 'Solid', level: 3, color: '#60A5FA' };
  if (consistencyPct >= 40) return { label: 'Developing', level: 2, color: '#F59E0B' };
  return { label: 'Fragile', level: 1, color: '#EF4444' };
}

function strengthMeterHTML(pct) {
  const s = habitStrength(pct);
  return `<div class="strength-meter">
    ${[1,2,3,4].map(i => `<div class="strength-dot ${i <= s.level ? 'active' : ''}" style="${i <= s.level ? 'background:'+s.color : ''}"></div>`).join('')}
    <span class="strength-label" style="color:${s.color}">${s.label}</span>
  </div>`;
}
