// ── SETTINGS MODULE ──
const Settings = {
  currentSection: 'main',

  async render() {
    const el = document.getElementById('page-settings');
    el.innerHTML = await this._buildMain();
    this._attachListeners(el);
  },

  async _buildMain() {
    let user = {};
    try { user = await api.auth.me(); } catch {}
    return `
      <div class="page-header"><h1>⚙️ Settings</h1></div>

      <div class="card" style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
        <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;flex-shrink:0;">${(user.display_name || 'U')[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:700;font-size:17px">${user.display_name || '—'}</div>
          <div style="color:var(--text-muted);font-size:13px">${user.email || ''}</div>
          <div style="color:#F59E0B;font-size:13px;font-weight:600">⭐ ${user.points || 0} points</div>
        </div>
      </div>

      <div class="section-label">Manage</div>
      <div class="card card-sm" id="go-rewards" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span>🏆 My Rewards</span><span style="color:var(--text-dim)">›</span>
      </div>
      <div class="card card-sm" id="go-punishments" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span>⚡ My Punishments</span><span style="color:var(--text-dim)">›</span>
      </div>
      <div class="card card-sm" id="go-challenges" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span>🏅 Challenges</span><span style="color:var(--text-dim)">›</span>
      </div>
      <div class="card card-sm" id="go-english" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span>📚 English Progress</span><span style="color:var(--text-dim)">›</span>
      </div>

      <div class="section-label" style="margin-top:16px">App</div>
      <div class="card card-sm" id="go-install" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span>📱 Install App on Android</span><span style="color:var(--text-dim)">›</span>
      </div>
      <div class="card card-sm" id="go-notifications" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span>🔔 Enable Push Notifications</span><span style="color:var(--text-dim)">›</span>
      </div>
      <div class="card card-sm" id="go-weekly" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span>📊 Get Weekly AI Insight</span><span style="color:var(--text-dim)">›</span>
      </div>

      <div style="height:10px;"></div>
      <button class="btn btn-ghost btn-full" id="reset-onboard-btn" style="color:var(--text-muted);font-size:13px">🔄 Reset Onboarding Guide</button>
      <div style="height:8px;"></div>
      <button class="btn btn-ghost btn-full" id="logout-btn" style="color:var(--danger)">Sign Out</button>
    `;
  },

  _attachListeners(el) {
    el.querySelector('#go-rewards').onclick = () => Rewards.showRewardsPage(el);
    el.querySelector('#go-punishments').onclick = () => Punishments.showPage(el);
    el.querySelector('#go-challenges').onclick = () => { Challenges.showBrowse(el); };
    el.querySelector('#go-english').onclick = () => this.showEnglishProgress(el);
    el.querySelector('#go-install').onclick = () => this.showInstallGuide();
    el.querySelector('#go-notifications').onclick = () => this.setupNotifications();
    el.querySelector('#go-weekly').onclick = () => this.getWeeklyInsight();
    el.querySelector('#reset-onboard-btn').onclick = () => {
      localStorage.removeItem('hf_onboarded');
      toast('Onboarding guide reset! Go to Dashboard to see it.', 'info');
    };
    el.querySelector('#logout-btn').onclick = () => {
      confirm('Sign out of HabitForge?', () => {
        api.clearToken();
        DiaryEncryption.lock();
        location.reload();
      }, 'Sign Out', true);
    };
  },

  async showEnglishProgress(el) {
    el.innerHTML = skeleton(3);
    try {
      const progress = await api.diary.englishProgress();
      el.innerHTML = `
        <div class="header-row"><button class="btn btn-sm btn-ghost" id="back-eng">← Back</button><h1>📚 English Progress</h1></div>
        ${progress.length === 0
          ? emptyState('📚', 'No data yet', 'Write diary entries and AI will track your English improvement')
          : `
          <div class="stats-grid">
            <div class="stat-card"><div class="stat-num" style="color:var(--success)">${progress.reduce((a, w) => a + w.entries_written, 0)}</div><div class="stat-label">Total Entries</div></div>
            <div class="stat-card"><div class="stat-num" style="color:var(--danger)">${progress.reduce((a, w) => a + w.total_mistakes, 0)}</div><div class="stat-label">Mistakes Fixed</div></div>
          </div>
          <div class="section-label">Weekly Trend</div>
          ${progress.map(w => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:600;font-size:14px">Week of ${formatDate(w.week_start)}</div>
                <div style="font-size:12px;color:var(--text-muted)">${w.entries_written} entries · ${w.avg_word_count} avg words</div>
              </div>
              <span class="badge badge-danger">${w.total_mistakes} errors</span>
            </div>`).join('')}`}
      `;
      el.querySelector('#back-eng').onclick = () => this.render();
    } catch (err) { el.innerHTML = emptyState('⚠️', 'Error', err.message); }
  },

  showInstallGuide() {
    showModal(`
      <h3 class="modal-title">📱 Install on Android</h3>
      <div style="line-height:2.2;font-size:14px;">
        <div>1️⃣ Open this URL in <strong>Chrome</strong> on your Android phone</div>
        <div>2️⃣ Tap the <strong>⋮ menu</strong> (three dots) in top right</div>
        <div>3️⃣ Tap <strong>"Add to Home Screen"</strong></div>
        <div>4️⃣ Tap <strong>Install</strong> or <strong>Add</strong></div>
        <div>5️⃣ HabitForge appears on your home screen like a native app! 🎉</div>
      </div>
      <div class="divider"></div>
      <p style="font-size:13px;color:var(--text-muted)">The app works offline too. Your habit data syncs when you reconnect.</p>
    `);
  },

  async setupNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return toast('Push notifications not supported on this browser', 'error');
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return toast('Notification permission denied', 'error');

    try {
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api.push.vapidKey();
      if (!publicKey) return toast('Push not configured yet', 'warning');

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(publicKey)
      });
      await api.push.subscribe(sub.toJSON());
      toast('Push notifications enabled! 🔔', 'success');
    } catch (err) { toast('Failed to enable notifications: ' + err.message, 'error'); }
  },

  async getWeeklyInsight() {
    toast('Generating weekly insight…', 'info');
    try {
      const insight = await api.diary.weeklyInsight();
      showModal(`
        <h3 class="modal-title">📊 Your Weekly Insight</h3>
        <div style="line-height:1.8;font-size:14px;">
          ${insight.mood_pattern ? `<div class="card card-sm" style="margin-bottom:10px;"><strong>😊 Mood Pattern</strong><br>${insight.mood_pattern}</div>` : ''}
          ${insight.best_day ? `<div class="card card-sm" style="margin-bottom:10px;"><strong>⭐ Best Day</strong><br>${insight.best_day}</div>` : ''}
          ${insight.habit_correlation ? `<div class="card card-sm" style="margin-bottom:10px;"><strong>🔗 Habit Insight</strong><br>${insight.habit_correlation}</div>` : ''}
          ${insight.english_progress ? `<div class="card card-sm" style="margin-bottom:10px;"><strong>📚 English</strong><br>${insight.english_progress}</div>` : ''}
          ${(insight.next_week_focus || []).length ? `<div class="card card-sm"><strong>🎯 Focus Next Week</strong><ul style="margin-top:8px;padding-left:16px;">${insight.next_week_focus.map(f => `<li>${f}</li>`).join('')}</ul></div>` : ''}
        </div>
      `);
    } catch (err) { toast('Could not generate insight: ' + err.message, 'error'); }
  },

  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
  }
};
