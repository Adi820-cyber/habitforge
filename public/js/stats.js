// ── STATS MODULE ──
const Stats = {
  _tab: 'overview',

  async render() {
    const el = document.getElementById('page-stats');
    el.innerHTML = skeleton(5);
    try {
      const [todayData, weeklyData, heatmapData, pointsData, badHabitData] = await Promise.all([
        api.stats.today(),
        api.stats.weekly(),
        api.stats.heatmap(3),
        api.stats.points(),
        api.stats.badHabits().catch(() => [])
      ]);
      el.innerHTML = this._build(todayData, weeklyData, heatmapData, pointsData, badHabitData);
      this._drawWeeklyChart(weeklyData);
      this._drawHeatmap(heatmapData);
      this._wireBtns(el);
      if (this._tab === 'ledger') this._loadLedger(el.querySelector('#ledger-section'));
    } catch (err) { el.innerHTML = emptyState('⚠️', 'Error', err.message); }
  },

  _build(today, weekly, heatmap, points, badHabits) {
    const weekDone = weekly.reduce((a, d) => a + d.done, 0);
    const totalResisted = badHabits.reduce((a, h) => a + h.resisted, 0);
    const totalSlipped = badHabits.reduce((a, h) => a + h.slipped, 0);
    const overallResistRate = (totalResisted + totalSlipped) > 0
      ? Math.round(totalResisted / (totalResisted + totalSlipped) * 100) : 0;

    return `
      <div class="page-header"><h1>📊 Statistics</h1></div>

      <!-- Tab Switcher -->
      <div style="display:flex;gap:6px;margin-bottom:16px;background:var(--bg-card);border-radius:12px;padding:4px;">
        <button class="stat-tab-btn ${this._tab==='overview'?'active':''}" data-tab="overview" style="flex:1;padding:8px;border:none;border-radius:10px;background:${this._tab==='overview'?'var(--primary)':'transparent'};color:${this._tab==='overview'?'#fff':'var(--text-muted)'};font-weight:600;cursor:pointer;font-size:13px">Overview</button>
        <button class="stat-tab-btn ${this._tab==='bad'?'active':''}" data-tab="bad" style="flex:1;padding:8px;border:none;border-radius:10px;background:${this._tab==='bad'?'var(--danger)':'transparent'};color:${this._tab==='bad'?'#fff':'var(--text-muted)'};font-weight:600;cursor:pointer;font-size:13px">Bad Habits</button>
        <button class="stat-tab-btn ${this._tab==='ledger'?'active':''}" data-tab="ledger" style="flex:1;padding:8px;border:none;border-radius:10px;background:${this._tab==='ledger'?'#F59E0B':'transparent'};color:${this._tab==='ledger'?'#fff':'var(--text-muted)'};font-weight:600;cursor:pointer;font-size:13px">💰 Points</button>
      </div>

      <!-- OVERVIEW TAB -->
      <div id="tab-overview" style="display:${this._tab==='overview'?'block':'none'}">
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-num" style="color:var(--primary-light)">${today.completion_rate}%</div><div class="stat-label">Today's Rate</div></div>
          <div class="stat-card"><div class="stat-num" style="color:#F59E0B">${points.points}</div><div class="stat-label">Total Points</div></div>
          <div class="stat-card"><div class="stat-num" style="color:var(--success)">${weekDone}</div><div class="stat-label">Done This Week</div></div>
          <div class="stat-card"><div class="stat-num" style="color:var(--accent-light)">${today.best_streak || 0}🔥</div><div class="stat-label">Streak</div></div>
        </div>

        <div class="chart-wrap">
          <div class="chart-title">Good Habits — This Week</div>
          <canvas id="weekly-chart" height="140"></canvas>
        </div>

        <div class="chart-wrap">
          <div class="chart-title">Activity Heatmap (3 months)</div>
          <div id="heatmap-container" class="heatmap-grid"></div>
        </div>

        <div class="divider"></div>
        <button class="btn btn-ghost btn-full" id="show-challenges-btn">🏅 View Challenges</button>
        <div style="height:8px;"></div>
        <button class="btn btn-ghost btn-full" id="show-rewards-btn">🏆 Manage Rewards &amp; Punishments</button>
      </div>

      <!-- BAD HABITS TAB -->
      <div id="tab-bad" style="display:${this._tab==='bad'?'block':'none'}">
        ${badHabits.length > 0 ? `
          <div class="stats-grid" style="margin-bottom:16px">
            <div class="stat-card">
              <div class="stat-num" style="color:var(--success)">${totalResisted}</div>
              <div class="stat-label">Times Resisted</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" style="color:var(--danger)">${totalSlipped}</div>
              <div class="stat-label">Times Slipped</div>
            </div>
            <div class="stat-card" style="grid-column:span 2">
              <div class="stat-num" style="color:${overallResistRate>=70?'var(--success)':overallResistRate>=40?'#F59E0B':'var(--danger)'}">${overallResistRate}%</div>
              <div class="stat-label">Overall Resistance</div>
            </div>
          </div>

          ${badHabits.map(h => {
            const rate = h.resistRate;
            const color = rate >= 70 ? 'var(--success)' : rate >= 40 ? '#F59E0B' : 'var(--danger)';
            return `
              <div class="card" style="margin-bottom:10px;padding:14px 16px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <div>
                    <div style="font-weight:700;font-size:14px">🚫 ${h.name}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${h.category} · ${h.streak > 0 ? `🔥 ${h.streak} day resist streak` : 'No current streak'}</div>
                  </div>
                  <div style="text-align:right">
                    <div style="font-size:20px;font-weight:800;color:${color}">${rate}%</div>
                    <div style="font-size:11px;color:var(--text-muted)">resist rate</div>
                  </div>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${rate}%;background:${color}"></div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px">
                  <span style="color:var(--success)">✅ Resisted: ${h.resisted}</span>
                  <span style="color:var(--danger)">❌ Slipped: ${h.slipped}</span>
                </div>
              </div>
            `;
          }).join('')}
        ` : `
          <div class="card" style="text-align:center;padding:30px 20px">
            <div style="font-size:40px;margin-bottom:12px">🚫</div>
            <div style="font-weight:700;margin-bottom:6px">No bad habits tracked yet</div>
            <div style="color:var(--text-muted);font-size:13px">Add bad habits in the Habits tab to see your 30-day control record here</div>
          </div>
        `}
      </div>

      <!-- POINTS LEDGER TAB -->
      <div id="tab-ledger" style="display:${this._tab==='ledger'?'block':'none'}">
        <div class="card" style="text-align:center;padding:16px;margin-bottom:16px">
          <div style="font-size:36px;font-weight:800;color:#F59E0B">${points.points}</div>
          <div style="color:var(--text-muted);font-size:13px">Total Points · Rank #${points.rank || '—'}</div>
        </div>
        <div class="section-label">Last 30 Days History</div>
        <div id="ledger-section">
          <div style="text-align:center;padding:20px;color:var(--text-muted)">Loading ledger…</div>
        </div>
      </div>
    `;
  },

  async _loadLedger(el) {
    if (!el) return;
    try {
      const entries = await api.stats.pointsLedger();
      if (!entries || entries.length === 0) {
        el.innerHTML = '<p style="color:var(--text-muted);font-size:14px;text-align:center;padding:20px">No point transactions yet. Start logging habits!</p>';
        return;
      }
      let lastDate = '';
      el.innerHTML = entries.map(e => {
        let dateHeader = '';
        if (e.date !== lastDate) {
          lastDate = e.date;
          dateHeader = `<div style="font-size:11px;font-weight:700;color:var(--text-dim);padding:10px 0 4px;text-transform:uppercase;letter-spacing:0.5px">${formatDate(e.date)}</div>`;
        }
        const color = e.type === 'earned' ? 'var(--success)' : e.type === 'lost' ? 'var(--danger)' : 'var(--text-muted)';
        const sign = e.points > 0 ? '+' : '';
        return `${dateHeader}
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:13px">${e.label}</span>
            <span style="font-weight:700;color:${color};font-size:14px;flex-shrink:0;margin-left:8px">${sign}${e.points}</span>
          </div>`;
      }).join('');
    } catch (err) {
      el.innerHTML = `<p style="color:var(--danger)">Failed to load ledger</p>`;
    }
  },

  _wireBtns(el) {
    // Tab switching
    el.querySelectorAll('.stat-tab-btn').forEach(btn => {
      btn.onclick = () => {
        this._tab = btn.dataset.tab;
        this.render();
      };
    });
    const cb = el.querySelector('#show-challenges-btn');
    if (cb) cb.onclick = () => { Challenges.showBrowse(document.getElementById('page-habits')); App.navigate('habits'); };
    const rb = el.querySelector('#show-rewards-btn');
    if (rb) rb.onclick = () => { Rewards.showRewardsPage(document.getElementById('page-settings')); App.navigate('settings'); };
    // Load ledger if on that tab
    if (this._tab === 'ledger') this._loadLedger(el.querySelector('#ledger-section'));
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

    ctx.fillStyle = '#334155';
    data.forEach((d, i) => {
      const x = startX + i * (barW + 6);
      const h = ((d.total / max) * (H - 40)) || 2;
      ctx.beginPath(); ctx.roundRect(x, H - 30 - h, barW, h, 4); ctx.fill();
    });

    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#1E40AF'); grad.addColorStop(1, '#7C3AED');
    ctx.fillStyle = grad;
    data.forEach((d, i) => {
      const x = startX + i * (barW + 6);
      const h = ((d.done / max) * (H - 40)) || 2;
      ctx.beginPath(); ctx.roundRect(x, H - 30 - h, barW, h, 4); ctx.fill();
    });

    ctx.fillStyle = '#64748B'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    data.forEach((d, i) => {
      const x = startX + i * (barW + 6) + barW / 2;
      ctx.fillStyle = '#64748B';
      ctx.fillText(d.label, x, H - 10);
      if (d.done > 0) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillText(d.done, x, H - 34 - ((d.done / max) * (H - 40)));
      }
    });
  },

  _drawHeatmap(data) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    const today = new Date();
    const cells = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const day = data[key];
      let level = 0;
      if (day) {
        const rate = day.done / Math.max(day.total, 1);
        level = rate >= 0.8 ? 3 : rate >= 0.5 ? 2 : 1;
      }
      cells.push(`<div class="heatmap-cell l${level}" title="${key}: ${day ? day.done + '/' + day.total : 'No data'}"></div>`);
    }
    container.innerHTML = cells.join('');
  }
};
