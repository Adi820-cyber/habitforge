// ── DASHBOARD MODULE ──
const Dashboard = {
  selectedDate: (() => {
    // Fix: parse as local date, not UTC
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  })(),

  _localToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  },

  _offsetDate(dateStr, days) {
    // Fix: parse date as LOCAL time, not UTC
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  },

  async render() {
    // Show onboarding for first-time users
    if (!localStorage.getItem('hf_onboarded')) { this._showOnboarding(); return; }

    const el = document.getElementById('page-dashboard');
    el.innerHTML = skeleton(4);
    try {
      const [habits, summary] = await Promise.all([api.habits.list(), api.stats.today()]);
      const logs = await api.habits.logsForDate(this.selectedDate);
      this._render(el, habits, logs, summary);
    } catch (err) {
      el.innerHTML = emptyState('⚠️', 'Error loading dashboard', err.message);
    }
  },

  _showOnboarding() {
    const el = document.getElementById('page-dashboard');
    el.innerHTML = `
      <div style="padding:24px 0">
        <div style="text-align:center;margin-bottom:28px">
          <div style="font-size:64px;margin-bottom:12px">🔥</div>
          <h1 style="font-size:24px;font-weight:800;margin-bottom:8px">Welcome to HabitForge!</h1>
          <p style="color:var(--text-muted);font-size:14px;line-height:1.7">Your personal habit tracker with AI coaching, gamified rewards, and behavioral science — all in one app.</p>
        </div>

        <div class="card" style="margin-bottom:14px;border-left:4px solid var(--primary)">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px">Step 1 — Add your first habits 💪</div>
          <p style="color:var(--text-muted);font-size:13px">Pick habits you want to BUILD (reading, workout, study) or habits you want to BREAK (social media, junk food).</p>
          <button class="btn btn-primary btn-full" id="ob-habits-btn" style="margin-top:12px">Browse Habit Library →</button>
        </div>

        <div class="card" style="margin-bottom:14px;border-left:4px solid #F59E0B">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px">Step 2 — Track daily ✅</div>
          <p style="color:var(--text-muted);font-size:13px">Check off each habit every day. Good habit done = +10 pts. Bad habit resisted = +15 pts. Earn rewards, face punishments.</p>
        </div>

        <div class="card" style="margin-bottom:14px;border-left:4px solid var(--success)">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px">Step 3 — Write in your Diary 📔</div>
          <p style="color:var(--text-muted);font-size:13px">Write daily. The AI coach reads your entry, corrects your English, analyses your mood, and gives personalized advice.</p>
        </div>

        <div class="card" style="margin-bottom:24px;border-left:4px solid var(--accent-light)">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px">Step 4 — Join Challenges 🏅</div>
          <p style="color:var(--text-muted);font-size:13px">Try 75 Hard, 21-Day Workout, 30-Day No Social Media and more. Complete a challenge = 500 bonus points!</p>
        </div>

        <button class="btn btn-primary btn-full" id="ob-start-btn" style="font-size:16px;padding:16px">🚀 Let's Start!</button>
      </div>
    `;
    el.querySelector('#ob-habits-btn').onclick = () => { App.navigate('habits'); };
    el.querySelector('#ob-start-btn').onclick = () => {
      localStorage.setItem('hf_onboarded', '1');
      this.render();
    };
  },

  _render(el, habits, logs, summary) {
    const logMap = {};
    (logs || []).forEach(l => { logMap[l.habit_id] = l; });

    const activeHabits = habits.filter(h => !h.is_archived);
    const goodHabits = activeHabits.filter(h => (h.habit_type || 'good') === 'good');
    const badHabits = activeHabits.filter(h => h.habit_type === 'bad');

    const today = this._localToday();
    const isToday = this.selectedDate === today;
    const dateLabel = isToday ? 'Today' : formatDate(this.selectedDate);

    const doneGood = goodHabits.filter(h => logMap[h.id]?.status === 'done').length;
    const resistedBad = badHabits.filter(h => logMap[h.id]?.status === 'skipped').length;

    el.innerHTML = `
      <!-- Date Picker Header -->
      <div class="header-row" style="margin-bottom:0">
        <h1>📊 ${dateLabel}</h1>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="btn btn-sm btn-ghost" id="prev-date">‹</button>
          <input type="date" id="date-picker" class="input" style="padding:6px 10px;font-size:13px;width:auto;border-radius:10px;" value="${this.selectedDate}" max="${today}">
          <button class="btn btn-sm btn-ghost" id="next-date" ${isToday ? 'disabled style="opacity:0.3"' : ''}>›</button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid" style="margin:14px 0;">
        <div class="stat-card"><div class="stat-num" style="color:var(--success)">${doneGood}/${goodHabits.length}</div><div class="stat-label">Good Done</div></div>
        <div class="stat-card"><div class="stat-num" style="color:#F59E0B">${summary.points || 0}</div><div class="stat-label">Points</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--primary-light)">${resistedBad}/${badHabits.length}</div><div class="stat-label">Bad Resisted</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--accent-light)">${summary.best_streak || 0}🔥</div><div class="stat-label">Streak</div></div>
      </div>

      <!-- Good Habits -->
      <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
        <span>✅ Good Habits to Build</span>
        <button class="btn btn-sm btn-ghost" id="goto-habits-btn">Manage →</button>
      </div>
      ${goodHabits.length === 0
        ? emptyState('📋', 'No good habits', 'Add habits in the Habits tab', `<button class="btn btn-primary" id="add-first-habit">+ Add Habit</button>`)
        : goodHabits.map(h => this._habitCard(h, logMap[h.id], 'good')).join('')}

      <!-- Bad Habits -->
      ${badHabits.length > 0 ? `
        <div class="section-label" style="margin-top:16px;">🚫 Bad Habits to Break</div>
        <div class="card" style="padding:10px 14px;margin-bottom:10px;border-left:3px solid var(--danger);font-size:13px;color:var(--text-muted)">
          Tap "✓ Resisted" if you avoided it today, or "Did it 😔" if you slipped (punishment triggered)
        </div>
        ${badHabits.map(h => this._habitCard(h, logMap[h.id], 'bad')).join('')}
      ` : `
        <div style="margin-top:12px;">
          <button class="btn btn-ghost btn-full" id="add-bad-habit-btn">+ Track a bad habit to break</button>
        </div>
      `}

      <!-- Active Punishments -->
      <div id="punishment-section"></div>

      <!-- AI Suggestion -->
      <div id="ai-suggestion-section" style="margin-top:4px;"></div>
    `;

    // Date navigation — using local date parsing
    el.querySelector('#prev-date').onclick = () => {
      this.selectedDate = this._offsetDate(this.selectedDate, -1);
      this.render();
    };
    el.querySelector('#next-date')?.addEventListener('click', () => {
      const next = this._offsetDate(this.selectedDate, 1);
      if (next <= today) { this.selectedDate = next; this.render(); }
    });
    el.querySelector('#date-picker').onchange = (e) => {
      this.selectedDate = e.target.value;
      this.render();
    };

    // Habit log buttons
    el.querySelectorAll('[data-log]').forEach(btn => {
      btn.onclick = async () => {
        const { habitId, status, habitType } = btn.dataset;
        btn.disabled = true; btn.textContent = '…';
        try {
          const result = await api.habits.log(habitId, status, '', this.selectedDate);

          if (habitType === 'bad' && status === 'done') {
            this._showPunishmentModal(result.punishment);
          } else if (habitType === 'bad' && status === 'skipped') {
            this._showRewardModal(result.reward, '+15 points for resisting! 💪');
          } else if (status === 'done') {
            this._showRewardModal(result.reward, '+10 points! 🔥');
            this._checkStreakMilestone(result);
          } else if (status === 'missed') {
            toast('Habit missed — punishment may be triggered 😤', 'info');
          } else {
            toast('Logged', 'info');
          }
          this.render();
        } catch (err) {
          toast('Failed: ' + err.message, 'error');
          btn.disabled = false;
        }
      };
    });

    // Nav shortcuts
    el.querySelector('#goto-habits-btn')?.addEventListener('click', () => App.navigate('habits'));
    el.querySelector('#add-first-habit')?.addEventListener('click', () => App.navigate('habits'));
    el.querySelector('#add-bad-habit-btn')?.addEventListener('click', () => {
      App.navigate('habits');
      setTimeout(() => document.getElementById('add-habit-btn')?.click(), 300);
    });

    // Load punishments + AI suggestion async
    this._loadPunishments(el.querySelector('#punishment-section'));
    if (isToday) this._loadAISuggestion(el.querySelector('#ai-suggestion-section'), goodHabits, logMap);
  },

  _habitCard(habit, log, type) {
    const status = log?.status;
    const isBad = type === 'bad';
    const isDone = status === 'done';
    const isSkipped = status === 'skipped';
    const isMissed = status === 'missed';

    let statusBadge = '';
    let actionBtns = '';

    if (isBad) {
      if (isDone) {
        statusBadge = '<span class="badge badge-danger">⚠️ Slipped</span>';
        actionBtns = '<span style="font-size:12px;color:var(--danger)">Punishment triggered</span>';
      } else if (isSkipped) {
        statusBadge = '<span class="badge badge-success">💪 Resisted!</span>';
        actionBtns = '<span style="font-size:12px;color:var(--success)">+15 pts earned</span>';
      } else {
        actionBtns = `
          <button class="btn btn-sm btn-success" data-log data-habit-id="${habit.id}" data-status="skipped" data-habit-type="bad">✓ Resisted</button>
          <button class="btn btn-sm btn-ghost" style="color:var(--danger);border-color:var(--danger)" data-log data-habit-id="${habit.id}" data-status="done" data-habit-type="bad">Did it 😔</button>
        `;
      }
    } else {
      if (isDone) {
        statusBadge = '<span class="badge badge-success">✓ Done</span>';
        actionBtns = '<span style="font-size:12px;color:var(--success)">+10 pts</span>';
      } else if (isSkipped) {
        statusBadge = '<span class="badge badge-gray">Skipped</span>';
      } else if (isMissed) {
        statusBadge = '<span class="badge badge-danger">Missed 😔</span>';
      } else {
        actionBtns = `
          <button class="btn btn-sm btn-success" data-log data-habit-id="${habit.id}" data-status="done" data-habit-type="good">✓ Done</button>
          <button class="btn btn-sm btn-ghost" data-log data-habit-id="${habit.id}" data-status="missed" data-habit-type="good">Miss</button>
        `;
      }
    }

    return `
      <div class="habit-item ${isDone ? 'done' : ''} ${isBad ? 'bad-habit' : ''}">
        <div class="habit-icon" style="background:${isBad ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)'}">
          ${isBad ? '🚫' : '⭐'}
        </div>
        <div class="habit-info">
          <div class="habit-name">${habit.name}</div>
          <div class="habit-meta">${habit.category} ${statusBadge}</div>
        </div>
        <div class="habit-actions" style="display:flex;gap:6px;flex-shrink:0;">
          ${actionBtns}
        </div>
      </div>
    `;
  },

  _checkStreakMilestone(result) {
    // Called after a good habit is logged done
    // Milestones: 3, 7, 14, 21, 30 days
    api.stats.today().then(data => {
      const s = data.best_streak || 0;
      if ([3, 7, 14, 21, 30, 50, 75, 100].includes(s)) {
        setTimeout(() => {
          showModal(`
            <div style="text-align:center;padding:16px 0">
              <div style="font-size:72px;animation:bounce 0.6s ease">🔥</div>
              <h3 style="font-size:22px;font-weight:800;margin:12px 0 6px">${s}-Day Streak!</h3>
              <p style="color:var(--text-muted)">You've been consistent for ${s} days in a row. That's incredible! Keep going!</p>
              <button class="btn btn-primary btn-full" onclick="closeModal()" style="margin-top:16px">🚀 Let's Keep It!</button>
            </div>
          `);
        }, 1500);
      }
    }).catch(() => {});
  },

  async _loadPunishments(el) {
    if (!el) return;
    try {
      const { active_punishments } = await api.punishments.list();
      if (!active_punishments?.length) { el.innerHTML = ''; return; }
      el.innerHTML = `
        <div class="section-label" style="margin-top:16px;">⚡ Active Punishments (${active_punishments.length})</div>
        ${active_punishments.slice(0, 3).map(p => `
          <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;margin-bottom:8px;border-left:3px solid var(--danger);">
            <div>
              <div style="font-weight:600;font-size:14px">💪 ${p.punishments?.name || p.name}</div>
              <div style="font-size:12px;color:var(--text-muted)">Triggered ${timeAgo(p.triggered_at)}</div>
            </div>
            <button class="btn btn-sm btn-success complete-punishment" data-id="${p.id}">✓ Done</button>
          </div>
        `).join('')}
      `;
      el.querySelectorAll('.complete-punishment').forEach(btn => {
        btn.onclick = async () => {
          await api.punishments.complete(btn.dataset.id);
          toast('Punishment completed! +3 pts 💪', 'success');
          this._loadPunishments(el);
        };
      });
    } catch {}
  },

  async _loadAISuggestion(el, habits, logMap) {
    if (!el || habits.length === 0) return;
    try {
      const today = this._localToday();
      const storedDate = localStorage.getItem('ai_suggestion_date');

      if (storedDate === today) {
        const cached = localStorage.getItem('ai_suggestion_text');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed.motivation === 'string') { this._renderAI(el, parsed); return; }
          } catch {}
        }
      }

      const data = await api.stats.today();
      let suggestion = data.ai_suggestion;
      if (typeof suggestion === 'string') { try { suggestion = JSON.parse(suggestion); } catch {} }

      if (suggestion && typeof suggestion === 'object' && suggestion.motivation) {
        localStorage.setItem('ai_suggestion_date', today);
        localStorage.setItem('ai_suggestion_text', JSON.stringify(suggestion));
        this._renderAI(el, suggestion);
      }
    } catch {}
  },

  _showRewardModal(reward, pointsMsg) {
    const emoji = reward?.level === 'big' ? '🏅' : reward?.level === 'medium' ? '🎮' : '🎁';
    const modal = showModal(`
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:64px;margin-bottom:12px;animation:bounce 0.6s ease">${emoji}</div>
        <h3 style="font-size:20px;font-weight:800;margin-bottom:6px">Habit Complete!</h3>
        <div style="color:var(--success);font-size:16px;font-weight:700;margin-bottom:14px">${pointsMsg}</div>
        ${reward ? `
          <div style="background:var(--bg-card);border-radius:14px;padding:16px;margin-bottom:16px;border:1px solid var(--border)">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:6px">🎁 Random Reward Suggestion</div>
            <div style="font-size:17px;font-weight:700;color:var(--accent-light)">${reward.name}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${reward.level || 'small'} reward</div>
          </div>
        ` : ''}
        <button class="btn btn-primary btn-full" id="claim-reward-close">🔥 Keep Going!</button>
      </div>
    `);
    modal.querySelector('#claim-reward-close').onclick = () => closeModal();
  },

  _showPunishmentModal(punishment) {
    const BAD_HABIT_FACTS = [
      'Breaking a bad habit frees up mental energy for things that matter.',
      'Every time you resist, the neural pathway for that habit weakens.',
      'It takes 66 days on average to break a deeply ingrained habit.',
      'You are not your habits — you have the power to change.',
      'Small wins of resistance compound into massive transformation.'
    ];
    const fact = BAD_HABIT_FACTS[Math.floor(Math.random() * BAD_HABIT_FACTS.length)];
    const modal = showModal(`
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:64px;margin-bottom:12px">😤</div>
        <h3 style="font-size:20px;font-weight:800;margin-bottom:6px;color:var(--danger)">Bad Habit Triggered!</h3>
        <div style="color:var(--danger);font-size:14px;margin-bottom:12px">-15 points deducted</div>
        ${punishment ? `
          <div style="background:rgba(239,68,68,0.1);border:1px solid var(--danger);border-radius:14px;padding:16px;margin-bottom:12px;">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">⚡ Your punishment:</div>
            <div style="font-size:18px;font-weight:800;color:var(--danger)">${punishment.name}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${punishment.severity || 'moderate'} severity</div>
          </div>
        ` : ''}
        <div style="background:var(--bg-card);border-radius:12px;padding:12px;margin-bottom:16px;font-size:13px;color:var(--text-muted);font-style:italic">
          💡 "${fact}"
        </div>
        <button class="btn btn-danger btn-full" id="pun-close-btn">I Accept 💪</button>
      </div>
    `);
    modal.querySelector('#pun-close-btn').onclick = () => closeModal();
  },

  _renderAI(el, data) {
    if (!data || !el) return;
    const motivation = typeof data.motivation === 'string' ? data.motivation : '';
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    el.innerHTML = `
      <div class="ai-card">
        <div class="ai-icon">🤖</div>
        <div style="flex:1">
          <div class="ai-motivation">${motivation}</div>
          ${suggestions.length ? `
            <ul style="margin-top:10px;padding-left:16px;line-height:2;">
              ${suggestions.map(s => `<li style="font-size:13px;color:var(--text-muted)">${typeof s === 'string' ? s : ''}</li>`).join('')}
            </ul>` : ''}
        </div>
      </div>
    `;
  }
};
