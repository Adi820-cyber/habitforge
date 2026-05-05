// ── DASHBOARD MODULE (All 5 Tiers) ──
const Dashboard = {
  selectedDate: (() => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
  _localToday() { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; },
  _offsetDate(d, days) { const [y,m,dd]=d.split('-').map(Number); const dt=new Date(y,m-1,dd+days); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; },

  async render() {
    if (!localStorage.getItem('hf_onboarded')) { this._showOnboarding(); return; }
    const el = document.getElementById('page-dashboard');
    el.innerHTML = skeleton(4);
    try {
      const [habits, summary] = await Promise.all([api.habits.list(), api.stats.today()]);
      const logs = await api.habits.logsForDate(this.selectedDate);
      this._render(el, habits, logs, summary);
      // Check achievements async
      this._checkAchievements(summary, habits);
    } catch (err) { el.innerHTML = emptyState('⚠️', 'Error loading dashboard', err.message); }
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
        ${quoteCardHTML()}
        <div class="card" style="margin-bottom:14px;border-left:4px solid var(--primary)">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px">Step 1 — Add your first habits 💪</div>
          <p style="color:var(--text-muted);font-size:13px">Pick habits you want to BUILD or BREAK. Use the 2-minute rule: start tiny!</p>
          <button class="btn btn-primary btn-full" id="ob-habits-btn" style="margin-top:12px">Browse Habit Library →</button>
        </div>
        <div class="card" style="margin-bottom:14px;border-left:4px solid #F59E0B">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px">Step 2 — Track daily ✅</div>
          <p style="color:var(--text-muted);font-size:13px">Check off each habit. Earn points, level up, unlock achievements!</p>
        </div>
        <div class="card" style="margin-bottom:14px;border-left:4px solid var(--success)">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px">Step 3 — Write in your Diary 📔</div>
          <p style="color:var(--text-muted);font-size:13px">AI coach reads your entry, corrects English, analyses mood, gives advice.</p>
        </div>
        <div class="card" style="margin-bottom:24px;border-left:4px solid var(--accent-light)">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px">Step 4 — Join Challenges 🏅</div>
          <p style="color:var(--text-muted);font-size:13px">75 Hard, 21-Day Workout, 30-Day No Social Media and more!</p>
        </div>
        <button class="btn btn-primary btn-full" id="ob-start-btn" style="font-size:16px;padding:16px">🚀 Let's Start!</button>
      </div>`;
    el.querySelector('#ob-habits-btn').onclick = () => App.navigate('habits');
    el.querySelector('#ob-start-btn').onclick = () => { localStorage.setItem('hf_onboarded','1'); this.render(); };
  },

  _render(el, habits, logs, summary) {
    const logMap = {}; (logs||[]).forEach(l => { logMap[l.habit_id] = l; });
    const active = habits.filter(h => !h.is_archived);
    const good = active.filter(h => (h.habit_type||'good')==='good');
    const bad = active.filter(h => h.habit_type==='bad');
    const today = this._localToday();
    const isToday = this.selectedDate === today;
    const dateLabel = isToday ? 'Today' : formatDate(this.selectedDate);
    const doneGood = good.filter(h => logMap[h.id]?.status==='done').length;
    const resistedBad = bad.filter(h => logMap[h.id]?.status==='skipped').length;
    const totalActive = good.length + bad.length;
    const totalDone = doneGood + resistedBad;
    const pct = totalActive > 0 ? Math.round((totalDone/totalActive)*100) : 0;
    const pts = summary.points || 0;
    const streak = summary.best_streak || 0;
    // Focus mode
    const focusHabits = JSON.parse(localStorage.getItem('hf_focus_habits') || '[]');
    const focusMode = focusHabits.length > 0 && isToday;

    el.innerHTML = `
      <!-- Daily Quote -->
      ${isToday ? quoteCardHTML() : ''}

      <!-- Level Bar -->
      ${levelBadgeHTML(pts)}

      <!-- Date Picker Header -->
      <div class="header-row" style="margin-bottom:0">
        <h1>📊 ${dateLabel}</h1>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="btn btn-sm btn-ghost" id="prev-date">‹</button>
          <input type="date" id="date-picker" class="input" style="padding:6px 10px;font-size:13px;width:auto;border-radius:10px;" value="${this.selectedDate}" max="${today}">
          <button class="btn btn-sm btn-ghost" id="next-date" ${isToday ? 'disabled style="opacity:0.3"' : ''}>›</button>
        </div>
      </div>

      <!-- Progress Ring + Stats -->
      <div style="display:flex;align-items:center;gap:20px;margin:14px 0;">
        <div style="flex-shrink:0">${progressRing(pct, 100, 7)}</div>
        <div class="stats-grid" style="flex:1;margin:0;grid-template-columns:1fr 1fr;">
          <div class="stat-card"><div class="stat-num anim-counter" data-target="${pts}" style="color:#F59E0B">0</div><div class="stat-label">Points</div></div>
          <div class="stat-card"><div class="stat-num anim-counter" data-target="${streak}" style="color:var(--accent-light)">0</div><div class="stat-label">🔥 Streak</div></div>
          <div class="stat-card"><div class="stat-num" style="color:var(--success)">${doneGood}/${good.length}</div><div class="stat-label">Good</div></div>
          <div class="stat-card"><div class="stat-num" style="color:var(--primary-light)">${resistedBad}/${bad.length}</div><div class="stat-label">Resisted</div></div>
        </div>
      </div>

      ${focusMode ? `
        <div class="focus-banner">
          <div class="focus-count">🎯</div>
          <div><div style="font-weight:700;font-size:14px;color:#FCD34D">Focus Mode</div><div style="font-size:12px;color:var(--text-muted)">${focusHabits.length} priority habits selected</div></div>
          <button class="btn btn-sm btn-ghost" id="clear-focus" style="margin-left:auto;font-size:11px">Clear</button>
        </div>
      ` : (isToday && good.length >= 3 ? `<button class="btn btn-sm btn-ghost btn-full" id="set-focus-btn" style="margin-bottom:10px;font-size:12px">🎯 Set Focus Mode — Pick 3 priorities</button>` : '')}

      <!-- Morning Check-in -->
      ${isToday && !localStorage.getItem('hf_checkin_'+today) ? `
        <div class="checkin-card" style="margin-bottom:14px">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:10px">☀️ Morning Check-in</h3>
          <div class="input-group" style="margin-bottom:10px">
            <label>What's your #1 priority today?</label>
            <input type="text" class="input" id="morning-priority" placeholder="e.g. Finish my workout">
          </div>
          <div style="margin-bottom:10px">
            <label style="font-size:13px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:7px">Energy level</label>
            <div class="energy-toggle">
              <button class="energy-btn" data-energy="low">😴 Low</button>
              <button class="energy-btn" data-energy="medium">😊 Medium</button>
              <button class="energy-btn selected" data-energy="high">⚡ High</button>
            </div>
          </div>
          <button class="btn btn-primary btn-full btn-sm" id="save-checkin">✓ Start My Day</button>
        </div>
      ` : ''}

      <!-- Good Habits -->
      <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
        <span>✅ Good Habits to Build</span>
        <button class="btn btn-sm btn-ghost" id="goto-habits-btn">Manage →</button>
      </div>
      ${good.length === 0
        ? emptyState('📋','No good habits','Add habits in the Habits tab',`<button class="btn btn-primary" id="add-first-habit">+ Add Habit</button>`)
        : (focusMode ? good.filter(h => focusHabits.includes(h.id)) : good).map(h => this._habitCard(h, logMap[h.id], 'good')).join('')}

      <!-- Bad Habits -->
      ${bad.length > 0 ? `
        <div class="section-label" style="margin-top:16px;">🚫 Bad Habits to Break</div>
        ${bad.map(h => this._habitCard(h, logMap[h.id], 'bad')).join('')}
      ` : ''}

      <!-- Punishments -->
      <div id="punishment-section"></div>

      <!-- Evening Reflection -->
      ${isToday && this._isEvening() && !localStorage.getItem('hf_reflect_'+today) ? `
        <div class="reflection-card" style="margin-top:14px">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;color:var(--accent-light)">🌙 Evening Reflection</h3>
          <div class="input-group" style="margin-bottom:8px"><label>What went well today?</label><input class="input" id="reflect-good" placeholder="I completed..."></div>
          <div class="input-group" style="margin-bottom:8px"><label>What could improve?</label><input class="input" id="reflect-improve" placeholder="I struggled with..."></div>
          <div class="input-group" style="margin-bottom:8px"><label>Tomorrow's focus?</label><input class="input" id="reflect-tomorrow" placeholder="I will..."></div>
          <button class="btn btn-accent btn-full btn-sm" id="save-reflection">Save Reflection 🌙</button>
        </div>
      ` : ''}

      <!-- AI Suggestion -->
      <div id="ai-suggestion-section" style="margin-top:4px;"></div>
    `;

    // Wire everything
    this._wireNav(el, today, isToday);
    this._wireHabitBtns(el);
    this._wireCheckin(el, today);
    this._wireReflection(el, today);
    this._wireFocus(el, good);
    this._animateCounters(el);
    this._loadPunishments(el.querySelector('#punishment-section'));
    if (isToday) this._loadAISuggestion(el.querySelector('#ai-suggestion-section'), good, logMap);
  },

  _isEvening() { return new Date().getHours() >= 18; },

  _animateCounters(el) {
    el.querySelectorAll('.anim-counter').forEach(c => {
      const target = parseInt(c.dataset.target) || 0;
      animateCounter(c, target);
    });
  },

  _wireNav(el, today, isToday) {
    el.querySelector('#prev-date').onclick = () => { this.selectedDate = this._offsetDate(this.selectedDate, -1); this.render(); };
    el.querySelector('#next-date')?.addEventListener('click', () => { const n = this._offsetDate(this.selectedDate, 1); if (n <= today) { this.selectedDate = n; this.render(); } });
    el.querySelector('#date-picker').onchange = (e) => { this.selectedDate = e.target.value; this.render(); };
    el.querySelector('#goto-habits-btn')?.addEventListener('click', () => App.navigate('habits'));
    el.querySelector('#add-first-habit')?.addEventListener('click', () => App.navigate('habits'));
  },

  _wireHabitBtns(el) {
    el.querySelectorAll('[data-log]').forEach(btn => {
      btn.onclick = async () => {
        const { habitId, status, habitType } = btn.dataset;
        btn.disabled = true; btn.textContent = '…';
        try {
          const result = await api.habits.log(habitId, status, '', this.selectedDate);
          if (habitType === 'bad' && status === 'done') {
            celebrate('-15 points deducted 😤', result.punishment, 'bad');
          } else if (habitType === 'bad' && status === 'skipped') {
            celebrate('+15 points for resisting! 💪', result.reward);
          } else if (status === 'done') {
            celebrate('+10 points! 🔥', result.reward);
          } else if (status === 'missed') {
            toast('Habit missed 😤', 'info');
          }
          this.render();
        } catch (err) { toast('Failed: ' + err.message, 'error'); btn.disabled = false; }
      };
    });
    // Note input toggle
    el.querySelectorAll('.note-toggle').forEach(btn => {
      btn.onclick = () => {
        const noteEl = btn.parentElement.querySelector('.habit-note-input');
        if (noteEl) noteEl.style.display = noteEl.style.display === 'none' ? 'block' : 'none';
      };
    });
  },

  _wireCheckin(el, today) {
    el.querySelectorAll('.energy-btn').forEach(btn => {
      btn.onclick = () => { el.querySelectorAll('.energy-btn').forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); };
    });
    const saveBtn = el.querySelector('#save-checkin');
    if (saveBtn) saveBtn.onclick = () => {
      const priority = el.querySelector('#morning-priority')?.value || '';
      const energy = el.querySelector('.energy-btn.selected')?.dataset.energy || 'medium';
      localStorage.setItem('hf_checkin_' + today, JSON.stringify({ priority, energy, time: Date.now() }));
      toast('Morning check-in saved! ☀️', 'success');
      fireConfetti(15);
      this.render();
    };
  },

  _wireReflection(el, today) {
    const saveBtn = el.querySelector('#save-reflection');
    if (saveBtn) saveBtn.onclick = () => {
      const data = {
        good: el.querySelector('#reflect-good')?.value || '',
        improve: el.querySelector('#reflect-improve')?.value || '',
        tomorrow: el.querySelector('#reflect-tomorrow')?.value || '',
        time: Date.now()
      };
      localStorage.setItem('hf_reflect_' + today, JSON.stringify(data));
      toast('Evening reflection saved! 🌙', 'success');
      this.render();
    };
  },

  _wireFocus(el, goodHabits) {
    const setBtn = el.querySelector('#set-focus-btn');
    if (setBtn) setBtn.onclick = () => {
      const content = `<h3 class="modal-title">🎯 Pick Your 3 Focus Habits</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">"Put First Things First" — Stephen Covey</p>
        ${goodHabits.map(h => `<label style="display:flex;align-items:center;gap:10px;padding:10px;cursor:pointer;border-bottom:1px solid var(--border)">
          <input type="checkbox" class="focus-check" value="${h.id}" style="width:20px;height:20px">
          <span style="font-weight:600">${h.name}</span>
        </label>`).join('')}
        <button class="btn btn-primary btn-full" id="confirm-focus" style="margin-top:16px">Set Focus</button>`;
      const modal = showModal(content);
      modal.querySelector('#confirm-focus').onclick = () => {
        const checked = [...modal.querySelectorAll('.focus-check:checked')].map(c => c.value).slice(0, 3);
        if (checked.length === 0) { toast('Pick at least 1 habit', 'warning'); return; }
        localStorage.setItem('hf_focus_habits', JSON.stringify(checked));
        closeModal(); toast('Focus mode activated! 🎯', 'success'); this.render();
      };
    };
    const clearBtn = el.querySelector('#clear-focus');
    if (clearBtn) clearBtn.onclick = () => { localStorage.removeItem('hf_focus_habits'); this.render(); };
  },

  _habitCard(habit, log, type) {
    const status = log?.status;
    const isBad = type === 'bad';
    const isDone = status === 'done';
    const isSkipped = status === 'skipped';
    const isMissed = status === 'missed';
    let statusBadge = '', actionBtns = '';

    if (isBad) {
      if (isDone) { statusBadge = '<span class="badge badge-danger">⚠️ Slipped</span>'; actionBtns = '<span style="font-size:12px;color:var(--danger)">Punishment triggered</span>'; }
      else if (isSkipped) { statusBadge = '<span class="badge badge-success">💪 Resisted!</span>'; actionBtns = '<span style="font-size:12px;color:var(--success)">+15 pts</span>'; }
      else { actionBtns = `<button class="btn btn-sm btn-success" data-log data-habit-id="${habit.id}" data-status="skipped" data-habit-type="bad">✓ Resisted</button><button class="btn btn-sm btn-ghost" style="color:var(--danger);border-color:var(--danger)" data-log data-habit-id="${habit.id}" data-status="done" data-habit-type="bad">Did it 😔</button>`; }
    } else {
      if (isDone) { statusBadge = '<span class="badge badge-success">✓ Done</span>'; actionBtns = '<span style="font-size:12px;color:var(--success)">+10 pts</span>'; }
      else if (isSkipped) { statusBadge = '<span class="badge badge-gray">Skipped</span>'; }
      else if (isMissed) { statusBadge = '<span class="badge badge-danger">Missed 😔</span>'; }
      else { actionBtns = `<button class="btn btn-sm btn-success" data-log data-habit-id="${habit.id}" data-status="done" data-habit-type="good">✓ Done</button><button class="btn btn-sm btn-ghost" data-log data-habit-id="${habit.id}" data-status="missed" data-habit-type="good">Miss</button>`; }
    }

    const keystoneTag = habit.is_keystone ? '<span class="keystone-tag">⭐ Keystone</span>' : '';
    const stackChain = habit.anchor_habit ? `<div class="habit-stack-chain"><span>After "${habit.anchor_habit}"</span><span class="chain-arrow">→</span><span>${habit.name}</span></div>` : '';

    return `
      <div class="habit-item ${isDone ? 'done' : ''} ${isBad ? 'bad-habit' : ''}">
        <div class="habit-icon" style="background:${isBad ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)'}">${isBad ? '🚫' : '⭐'}</div>
        <div class="habit-info">
          <div class="habit-name">${habit.name} ${keystoneTag}</div>
          <div class="habit-meta">${habit.category} ${statusBadge}</div>
          ${stackChain}
        </div>
        <div class="habit-actions" style="display:flex;gap:6px;flex-shrink:0;">${actionBtns}</div>
      </div>`;
  },

  async _checkAchievements(summary, habits) {
    try {
      const data = { totalHabits: habits.length, streak: summary.best_streak||0, points: summary.points||0,
        badResisted: 0, diaryEntries: 0, challengesCompleted: 0, perfectDays: summary.completion_rate===100?1:0,
        earlyLogs: new Date().getHours() < 7 ? 1 : 0, nightLogs: new Date().getHours() >= 22 ? 1 : 0 };
      const newBadges = checkBadges(data);
      if (newBadges.length > 0) {
        setTimeout(() => { fireConfetti(40);
          toast(`🏆 Achievement unlocked: ${newBadges[0].name}!`, 'success', 5000);
        }, 2000);
      }
    } catch {}
  },

  async _loadPunishments(el) {
    if (!el) return;
    try {
      const { active_punishments } = await api.punishments.list();
      if (!active_punishments?.length) { el.innerHTML = ''; return; }
      el.innerHTML = `<div class="section-label" style="margin-top:16px;">⚡ Active Punishments (${active_punishments.length})</div>
        ${active_punishments.slice(0,3).map(p => `<div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;margin-bottom:8px;border-left:3px solid var(--danger);">
          <div><div style="font-weight:600;font-size:14px">💪 ${p.punishments?.name||p.name}</div><div style="font-size:12px;color:var(--text-muted)">Triggered ${timeAgo(p.triggered_at)}</div></div>
          <button class="btn btn-sm btn-success complete-punishment" data-id="${p.id}">✓ Done</button>
        </div>`).join('')}`;
      el.querySelectorAll('.complete-punishment').forEach(btn => {
        btn.onclick = async () => { await api.punishments.complete(btn.dataset.id); toast('Punishment completed! +3 pts 💪','success'); this._loadPunishments(el); };
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
        if (cached) { try { const p = JSON.parse(cached); if (p?.motivation) { this._renderAI(el, p); return; } } catch {} }
      }
      const data = await api.stats.today();
      let suggestion = data.ai_suggestion;
      if (typeof suggestion === 'string') { try { suggestion = JSON.parse(suggestion); } catch {} }
      if (suggestion?.motivation) { localStorage.setItem('ai_suggestion_date', today); localStorage.setItem('ai_suggestion_text', JSON.stringify(suggestion)); this._renderAI(el, suggestion); }
    } catch {}
  },

  _renderAI(el, data) {
    if (!data || !el) return;
    const motivation = typeof data.motivation === 'string' ? data.motivation : '';
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    el.innerHTML = `<div class="ai-card"><div class="ai-icon">🤖</div><div style="flex:1">
      <div class="ai-motivation">${motivation}</div>
      ${suggestions.length ? `<ul style="margin-top:10px;padding-left:16px;line-height:2;">${suggestions.map(s => `<li style="font-size:13px;color:var(--text-muted)">${typeof s === 'string' ? s : ''}</li>`).join('')}</ul>` : ''}
    </div></div>`;
  }
};
