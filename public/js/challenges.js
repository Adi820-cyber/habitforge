// ── CHALLENGES MODULE ──
const Challenges = {
  async render() {
    const el = document.getElementById('page-stats'); // reusing until we add 6th tab
    // Actually challenges are shown in their own section within habits page or stats
    // For now render as a full takeover of page-habits when user taps challenges
    const container = document.getElementById('page-habits');
    this.showBrowse(container);
  },

  async showBrowse(container) {
    container.innerHTML = skeleton(4);
    try {
      const [all, active] = await Promise.all([api.challenges.list(), api.challenges.active()]);
      const activeIds = new Set(active.map(a => a.challenge_id));

      const today = new Date().toISOString().split('T')[0];
      const html = `
        <div class="header-row"><h1>🏅 Challenges</h1></div>

        ${active.length > 0 ? `
          <div class="section-label">Your Active Challenges</div>
          ${active.map(uc => {
            const alreadyDone = uc.last_checkin_date === today;
            const pct = Math.round((uc.current_day / uc.challenges?.duration_days) * 100);
            return `
            <div class="card challenge-card">
              <div class="challenge-header">
                <div>
                  <div style="font-weight:800;font-size:16px">${uc.challenges?.name}</div>
                  <div style="color:var(--text-muted);font-size:13px;margin-top:4px">Day ${uc.current_day} of ${uc.challenges?.duration_days}</div>
                  ${alreadyDone ? `<div style="font-size:12px;color:var(--success);margin-top:4px">✓ Checked in today</div>` : ''}
                </div>
                <div class="challenge-days">${uc.current_day}<div class="challenge-unit">/ ${uc.challenges?.duration_days}</div></div>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
              ${alreadyDone
                ? `<button class="btn btn-ghost btn-full" style="margin-top:12px;color:var(--success);border-color:var(--success)" disabled>✅ Checked In Today — Come back tomorrow!</button>`
                : `<button class="btn btn-primary btn-full checkin-btn" data-id="${uc.challenge_id}" style="margin-top:12px">✅ Check In Today</button>`
              }
            </div>`;
          }).join('')}
          <div class="divider"></div>` : ''}

        <div class="section-label">All Challenges</div>
        ${all.map(c => `
          <div class="card challenge-card" data-id="${c.id}">
            <div class="challenge-header">
              <div>
                <div style="font-weight:800;font-size:16px">${c.name}</div>
                <div style="color:var(--text-muted);font-size:13px;margin-top:4px">${c.description?.substring(0, 80)}…</div>
              </div>
              <div class="challenge-days">${c.duration_days}<div class="challenge-unit">days</div></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
              <span class="badge badge-gray">🏆 ${c.total_completions} completed it</span>
              ${activeIds.has(c.id)
                ? '<span class="badge badge-success">✓ Active</span>'
                : `<button class="btn btn-sm btn-primary join-btn" data-id="${c.id}">Join</button>`}
            </div>
          </div>`).join('')}

        <!-- Completed Challenges -->
        <div id="completed-section" style="margin-top:8px"></div>
      `;
      container.innerHTML = html;

      // Load completed challenges async
      this._loadCompleted(container.querySelector('#completed-section'));

      container.querySelectorAll('.join-btn').forEach(btn => {
        btn.onclick = async () => {
          try {
            await api.challenges.join(btn.dataset.id);
            toast('Challenge joined! Day 1 starts on first check-in 💪', 'success');
            this.showBrowse(container);
          } catch (err) { toast(err.message, 'error'); }
        };
      });

      container.querySelectorAll('.checkin-btn').forEach(btn => {
        btn.onclick = () => {
          const challengeId = btn.dataset.id;
          const card = btn.closest('.challenge-card');
          const name = card.querySelector('div[style*="font-weight"]')?.textContent || 'Challenge';

          // Find challenge data
          const uc = active.find(u => u.challenge_id === challengeId);
          const rules = uc?.challenges?.rules;
          let ruleList = [];
          try { ruleList = typeof rules === 'string' ? JSON.parse(rules) : (rules || []); } catch {}

          const modal = showModal(`
            <h3 class="modal-title">📋 Day ${uc?.current_day} Check-In</h3>
            <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px">${name}</p>
            ${ruleList.length > 0 ? `
              <div class="section-label">Today's Tasks</div>
              ${ruleList.map((rule, i) => `
                <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;">
                  <input type="checkbox" id="task-${i}" style="margin-top:3px;accent-color:var(--primary);">
                  <span style="font-size:14px">${rule}</span>
                </label>
              `).join('')}
            ` : ''}
            <div class="input-group" style="margin-top:14px;">
              <label>Notes (optional — what did you do today?)</label>
              <textarea id="checkin-notes" class="input" rows="3" placeholder="e.g. Did workout at 7am, drank full gallon, read 12 pages..."></textarea>
            </div>
            <button class="btn btn-primary btn-full" id="submit-checkin-btn">✅ Submit Check-In</button>
          `);

          modal.querySelector('#submit-checkin-btn').onclick = async () => {
            const notes = modal.querySelector('#checkin-notes').value.trim();
            const checkedTasks = ruleList.filter((_, i) => modal.querySelector(`#task-${i}`)?.checked);
            const fullNote = [
              checkedTasks.length ? `Completed: ${checkedTasks.join(', ')}` : '',
              notes
            ].filter(Boolean).join('\n');
            try {
              const res = await api.challenges.checkin(challengeId, fullNote);
              closeModal();
              if (res.completed) toast(`🏆 ${res.message}`, 'success');
              else toast(`Day ${res.current_day} done! Keep going 🔥`, 'success');
              Challenges.showBrowse(container);
            } catch (err) { toast(err.message, 'error'); }
          };
        };
      });

      container.querySelectorAll('.challenge-card[data-id]').forEach(card => {
        card.addEventListener('click', e => {
          if (e.target.tagName === 'BUTTON') return;
          this.showDetail(card.dataset.id);
        });
      });
    } catch (err) { container.innerHTML = emptyState('⚠️', 'Error', err.message); }
  },

  async _loadCompleted(el) {
    if (!el) return;
    try {
      const completed = await api.challenges.completed();
      if (!completed || completed.length === 0) return;
      el.innerHTML = `
        <div class="divider"></div>
        <div class="section-label">🏆 Completed Challenges (${completed.length})</div>
        ${completed.map(uc => {
          const completedDate = uc.completed_at ? new Date(uc.completed_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—';
          const startDate = uc.started_at ? new Date(uc.started_at + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '';
          return `
          <div class="card" style="margin-bottom:10px;border-left:4px solid #F59E0B;position:relative;overflow:hidden;">
            <div style="position:absolute;top:8px;right:10px;font-size:28px;opacity:0.15">🏆</div>
            <div style="font-weight:800;font-size:15px;margin-bottom:4px">${uc.challenges?.name || 'Challenge'}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${uc.challenges?.duration_days} days · Started ${startDate}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="badge badge-success">✓ Completed ${completedDate}</span>
              <span style="font-size:12px;color:#F59E0B;font-weight:700">+500 pts 🏅</span>
            </div>
          </div>`;
        }).join('')}
      `;
    } catch {}
  },

  async showDetail(id) {
    try {
      const c = await api.challenges.get(id);
      const rules = Array.isArray(c.rules) ? c.rules : JSON.parse(c.rules || '[]');
      showModal(`
        <h3 class="modal-title">${c.name}</h3>
        <p style="color:var(--text-muted);font-size:14px;margin-bottom:16px">${c.description}</p>
        <div class="section-label">Rules</div>
        <ul style="padding-left:16px;line-height:2;">
          ${rules.map(r => `<li style="font-size:14px;color:var(--text)">${r}</li>`).join('')}
        </ul>
        <div style="display:flex;gap:8px;margin-top:20px;">
          ${c.reset_on_miss ? '<span class="badge badge-danger">⚠️ Miss a day = Restart</span>' : '<span class="badge badge-success">No reset on miss</span>'}
          <span class="badge badge-gray">${c.duration_days} days</span>
        </div>
        ${!c.user_progress ? `<button class="btn btn-primary btn-full join-modal-btn" data-id="${c.id}" style="margin-top:20px">Join This Challenge</button>` : '<p style="color:var(--success);font-weight:600;margin-top:16px">✓ You are doing this challenge</p>'}
      `);
      const joinBtn = document.querySelector('.join-modal-btn');
      if (joinBtn) {
        joinBtn.onclick = async () => {
          await api.challenges.join(id);
          closeModal(); toast('Challenge joined! 💪', 'success');
          this.showBrowse(document.getElementById('page-habits'));
        };
      }
    } catch (err) { toast(err.message, 'error'); }
  }
};
