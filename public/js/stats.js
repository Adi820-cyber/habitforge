// ── STATS MODULE (Tiers 3+4) ──
const Stats = {
  _tab: 'overview',

  async render() {
    const el = document.getElementById('page-stats');
    el.innerHTML = skeleton(5);
    try {
      const [todayData, weeklyData, heatmapData, pointsData, badHabitData] = await Promise.all([
        api.stats.today(), api.stats.weekly(), api.stats.heatmap(3),
        api.stats.points(), api.stats.badHabits().catch(() => [])
      ]);
      el.innerHTML = this._build(todayData, weeklyData, heatmapData, pointsData, badHabitData);
      this._drawWeeklyChart(weeklyData);
      this._drawHeatmap(heatmapData);
      this._wireBtns(el);
      this._animateCounters(el);
      if (this._tab === 'ledger') this._loadLedger(el.querySelector('#ledger-section'));
    } catch (err) { el.innerHTML = emptyState('⚠️', 'Error', err.message); }
  },

  _animateCounters(el) {
    el.querySelectorAll('.anim-counter').forEach(c => animateCounter(c, parseInt(c.dataset.target) || 0));
  },

  _build(today, weekly, heatmap, points, badHabits) {
    const weekDone = weekly.reduce((a, d) => a + d.done, 0);
    const totalResisted = badHabits.reduce((a, h) => a + h.resisted, 0);
    const totalSlipped = badHabits.reduce((a, h) => a + h.slipped, 0);
    const overallResistRate = (totalResisted + totalSlipped) > 0 ? Math.round(totalResisted / (totalResisted + totalSlipped) * 100) : 0;
    const pts = points.points || 0;

    return `
      <div class="page-header"><h1>📊 Statistics</h1></div>

      <!-- Level -->
      ${levelBadgeHTML(pts)}

      <!-- Tab Switcher -->
      <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg-card);backdrop-filter:var(--glass-blur);border-radius:14px;padding:4px;border:1px solid var(--border)">
        ${['overview','bad','ledger','badges'].map(t => `
          <button class="stat-tab-btn" data-tab="${t}" style="flex:1;padding:8px;border:none;border-radius:10px;background:${this._tab===t?'var(--gradient-primary)':'transparent'};color:${this._tab===t?'#fff':'var(--text-muted)'};font-weight:600;cursor:pointer;font-size:12px;font-family:inherit;transition:all 0.2s">
            ${{overview:'Overview',bad:'🚫 Bad',ledger:'💰 Points',badges:'🏆 Badges'}[t]}
          </button>
        `).join('')}
      </div>

      <!-- OVERVIEW TAB -->
      <div id="tab-overview" style="display:${this._tab==='overview'?'block':'none'}">
        <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px">
          <div style="flex-shrink:0">${progressRing(today.completion_rate || 0, 100, 7)}</div>
          <div class="stats-grid" style="flex:1;margin:0;grid-template-columns:1fr 1fr;">
            <div class="stat-card"><div class="stat-num anim-counter" data-target="${pts}" style="color:#F59E0B">0</div><div class="stat-label">Points</div></div>
            <div class="stat-card"><div class="stat-num anim-counter" data-target="${weekDone}" style="color:var(--success)">0</div><div class="stat-label">This Week</div></div>
            <div class="stat-card"><div class="stat-num anim-counter" data-target="${today.best_streak||0}" style="color:var(--accent-light)">0</div><div class="stat-label">🔥 Streak</div></div>
            <div class="stat-card"><div class="stat-num" style="color:var(--primary-light)">${overallResistRate}%</div><div class="stat-label">Resist Rate</div></div>
          </div>
        </div>

        <div class="chart-wrap"><div class="chart-title">Good Habits — This Week</div><canvas id="weekly-chart" height="140"></canvas></div>
        <div class="chart-wrap"><div class="chart-title">Activity Heatmap (3 months)</div><div id="heatmap-container" class="heatmap-grid"></div></div>

        <div class="divider"></div>
        <button class="btn btn-ghost btn-full" id="show-challenges-btn">🏅 View Challenges</button>
        <div style="height:8px;"></div>
        <button class="btn btn-ghost btn-full" id="show-rewards-btn">🏆 Manage Rewards &amp; Punishments</button>
        <div style="height:8px;"></div>
        <button class="btn btn-ghost btn-full" id="weekly-review-btn">📋 Weekly Review</button>
      </div>

      <!-- BAD HABITS TAB -->
      <div id="tab-bad" style="display:${this._tab==='bad'?'block':'none'}">
        ${badHabits.length > 0 ? `
          <div class="stats-grid" style="margin-bottom:16px">
            <div class="stat-card"><div class="stat-num" style="color:var(--success)">${totalResisted}</div><div class="stat-label">Resisted</div></div>
            <div class="stat-card"><div class="stat-num" style="color:var(--danger)">${totalSlipped}</div><div class="stat-label">Slipped</div></div>
          </div>
          ${badHabits.map(h => {
            const rate = h.resistRate;
            const color = rate >= 70 ? 'var(--success)' : rate >= 40 ? '#F59E0B' : 'var(--danger)';
            return `<div class="card" style="padding:14px 16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div><div style="font-weight:700;font-size:14px">🚫 ${h.name}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${h.category} · ${h.streak > 0 ? `🔥 ${h.streak}d resist` : 'No streak'}</div>
                  ${strengthMeterHTML(rate)}
                </div>
                <div style="text-align:right"><div style="font-size:20px;font-weight:800;color:${color}">${rate}%</div><div style="font-size:11px;color:var(--text-muted)">resist rate</div></div>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${rate}%;background:${color}"></div></div>
            </div>`;
          }).join('')}
        ` : emptyState('🚫', 'No bad habits tracked', 'Add bad habits in the Habits tab')}
      </div>

      <!-- POINTS LEDGER TAB -->
      <div id="tab-ledger" style="display:${this._tab==='ledger'?'block':'none'}">
        <div class="card" style="text-align:center;padding:16px;margin-bottom:16px">
          <div style="font-size:36px;font-weight:800;color:#F59E0B">${pts}</div>
          <div style="color:var(--text-muted);font-size:13px">Total Points · Rank #${points.rank || '—'}</div>
        </div>
        <div class="section-label">Last 30 Days History</div>
        <div id="ledger-section"><div style="text-align:center;padding:20px;color:var(--text-muted)">Loading…</div></div>
      </div>

      <!-- BADGES TAB -->
      <div id="tab-badges" style="display:${this._tab==='badges'?'block':'none'}">
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:14px;font-weight:700;color:var(--text-muted)">${getUnlockedBadges().length}/${ACHIEVEMENTS.length} Unlocked</div>
          <div class="progress-bar" style="margin-top:8px"><div class="progress-fill" style="width:${Math.round(getUnlockedBadges().length/ACHIEVEMENTS.length*100)}%"></div></div>
        </div>
        ${badgeWallHTML()}
      </div>
    `;
  },

  async _loadLedger(el) {
    if (!el) return;
    try {
      const entries = await api.stats.pointsLedger();
      if (!entries?.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:14px;text-align:center;padding:20px">No transactions yet.</p>'; return; }
      let lastDate = '';
      el.innerHTML = entries.map(e => {
        let dh = ''; if (e.date !== lastDate) { lastDate = e.date; dh = `<div style="font-size:11px;font-weight:700;color:var(--text-dim);padding:10px 0 4px;text-transform:uppercase">${formatDate(e.date)}</div>`; }
        const color = e.type === 'earned' ? 'var(--success)' : e.type === 'lost' ? 'var(--danger)' : 'var(--text-muted)';
        return `${dh}<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px">${e.label}</span>
          <span style="font-weight:700;color:${color};font-size:14px">${e.points>0?'+':''}${e.points}</span></div>`;
      }).join('');
    } catch { el.innerHTML = `<p style="color:var(--danger)">Failed to load</p>`; }
  },

  _wireBtns(el) {
    el.querySelectorAll('.stat-tab-btn').forEach(btn => { btn.onclick = () => { this._tab = btn.dataset.tab; this.render(); }; });
    const cb = el.querySelector('#show-challenges-btn');
    if (cb) cb.onclick = () => { Challenges.showBrowse(document.getElementById('page-habits')); App.navigate('habits'); };
    const rb = el.querySelector('#show-rewards-btn');
    if (rb) rb.onclick = () => { Rewards.showRewardsPage(document.getElementById('page-settings')); App.navigate('settings'); };
    // Weekly Review
    const wr = el.querySelector('#weekly-review-btn');
    if (wr) wr.onclick = () => this._showWeeklyReview();
    if (this._tab === 'ledger') this._loadLedger(el.querySelector('#ledger-section'));
  },

  _showWeeklyReview() {
    const today = new Date();
    const reflections = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const r = localStorage.getItem('hf_reflect_' + key);
      if (r) { try { reflections.push({ date: key, ...JSON.parse(r) }); } catch {} }
    }
    showModal(`
      <h3 class="modal-title">📋 Weekly Review</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">"Sharpen the Saw" — Stephen Covey</p>
      ${reflections.length > 0 ? reflections.map(r => `
        <div class="review-section">
          <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin-bottom:8px">${formatDate(r.date)}</div>
          ${r.good ? `<div style="font-size:13px;margin-bottom:4px"><span style="color:var(--success)">✅</span> ${r.good}</div>` : ''}
          ${r.improve ? `<div style="font-size:13px;margin-bottom:4px"><span style="color:var(--warning)">💡</span> ${r.improve}</div>` : ''}
          ${r.tomorrow ? `<div style="font-size:13px"><span style="color:var(--primary-light)">🎯</span> ${r.tomorrow}</div>` : ''}
        </div>
      `).join('') : '<p style="color:var(--text-muted);text-align:center;padding:20px">No reflections this week. Start using the Evening Reflection on the dashboard!</p>'}
      <button class="btn btn-primary btn-full" onclick="closeModal()" style="margin-top:12px">Close</button>
    `);
  },

  _drawWeeklyChart(data) {
    const canvas = document.getElementById('weekly-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth; const H = 140;
    canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const max = Math.max(...data.map(d => d.total), 1);
    const barW = Math.floor((W - 40) / data.length) - 6;
    const startX = 20;
    ctx.fillStyle = 'rgba(51,65,85,0.4)';
    data.forEach((d, i) => { const x = startX + i * (barW + 6); const h = ((d.total / max) * (H - 40)) || 2; ctx.beginPath(); ctx.roundRect(x, H - 30 - h, barW, h, 4); ctx.fill(); });
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#2563EB'); grad.addColorStop(1, '#8B5CF6');
    ctx.fillStyle = grad;
    data.forEach((d, i) => { const x = startX + i * (barW + 6); const h = ((d.done / max) * (H - 40)) || 2; ctx.beginPath(); ctx.roundRect(x, H - 30 - h, barW, h, 4); ctx.fill(); });
    ctx.fillStyle = '#64748B'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    data.forEach((d, i) => { const x = startX + i * (barW + 6) + barW / 2; ctx.fillStyle = '#64748B'; ctx.fillText(d.label, x, H - 10);
      if (d.done > 0) { ctx.fillStyle = '#F1F5F9'; ctx.fillText(d.done, x, H - 34 - ((d.done / max) * (H - 40))); } });
  },

  _drawHeatmap(data) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    const today = new Date(); const cells = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0]; const day = data[key];
      let level = 0;
      if (day) { const rate = day.done / Math.max(day.total, 1); level = rate >= 0.8 ? 3 : rate >= 0.5 ? 2 : 1; }
      cells.push(`<div class="heatmap-cell l${level}" title="${key}: ${day ? day.done + '/' + day.total : 'No data'}"></div>`);
    }
    container.innerHTML = cells.join('');
  }
};
