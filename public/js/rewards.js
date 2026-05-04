// ── REWARDS MODULE ──
const Rewards = {
  async render() {
    try {
      const rewards = await api.rewards.list();
      const unlocked = rewards.filter(r => r.earned_today && !r.used_today);
      const locked = rewards.filter(r => !r.earned_today);
      const used = rewards.filter(r => r.used_today);
      return { unlocked, locked, used, all: rewards };
    } catch { return { unlocked: [], locked: [], used: [], all: [] }; }
  },

  renderPage() {
    const el = document.getElementById('page-settings');
    this.showRewardsPage(el);
  },

  async showRewardsPage(container) {
    container.innerHTML = skeleton(3);
    try {
      const rewards = await api.rewards.list();
      const logs = await api.rewards.logs();

      const html = `
        <div class="header-row"><h1>🏆 Rewards</h1><button class="btn btn-sm btn-primary" id="add-reward-btn">+ Add</button></div>

        <div class="section-label">Your Rewards</div>
        <div class="reward-grid">
          ${rewards.map(r => {
            const emoji = r.level === 'big' ? '🏅' : r.level === 'medium' ? '🎮' : '🎬';
            const canDelete = !r.is_preloaded;
            return `
            <div class="reward-card ${r.earned_today ? 'unlocked' : ''} ${r.used_today ? 'used' : ''}" style="position:relative">
              ${canDelete ? `<button class="del-reward-btn" data-id="${r.id}" style="position:absolute;top:6px;right:6px;background:rgba(239,68,68,0.15);border:none;border-radius:6px;padding:2px 6px;font-size:11px;color:var(--danger);cursor:pointer">✕</button>` : ''}
              <div class="reward-emoji">${emoji}</div>
              <div class="reward-name">${r.name}</div>
              <div class="reward-condition">${r.condition_value} ${r.condition_type === 'habits_done_today' ? 'habits' : r.condition_type === 'points' ? 'pts' : 'streak'}</div>
              ${r.earned_today && !r.used_today ? `<button class="btn btn-sm btn-success btn-full use-reward" data-id="${r.id}" style="margin-top:8px;">Use it! 🎉</button>` : ''}
              ${r.used_today ? `<div style="font-size:11px;color:var(--success);margin-top:6px;">✓ Used today</div>` : ''}
              ${!r.earned_today ? `<div style="font-size:11px;color:var(--text-dim);margin-top:6px;">🔒 Locked</div>` : ''}
            </div>`;
          }).join('')}
        </div>

        <div class="divider"></div>
        <div class="section-label">Recent History</div>
        ${logs.slice(0, 10).map(l => `
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;">
            <span>🎁 ${l.rewards?.name || 'Reward'}</span>
            <span style="color:var(--text-muted)">${timeAgo(l.earned_at)}</span>
          </div>`).join('') || '<p style="color:var(--text-muted);font-size:14px;">No rewards earned yet</p>'}
      `;
      container.innerHTML = html;

      container.querySelectorAll('.use-reward').forEach(btn => {
        btn.onclick = async () => {
          await api.rewards.use(btn.dataset.id);
          toast('Enjoy your reward! 🎉', 'success');
          this.showRewardsPage(container);
        };
      });

      container.querySelectorAll('.del-reward-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          confirm('Delete this reward?', async () => {
            try {
              await api.rewards.delete(btn.dataset.id);
              toast('Reward deleted', 'info');
              this.showRewardsPage(container);
            } catch (err) { toast(err.message, 'error'); }
          }, 'Delete', true);
        };
      });

      container.querySelector('#add-reward-btn').onclick = () => this.showAddModal(container);
    } catch (err) { container.innerHTML = emptyState('⚠️', 'Error', err.message); }
  },

  showAddModal(container) {
    const modal = showModal(`
      <h3 class="modal-title">New Reward</h3>
      <div class="input-group"><label>Reward Name</label><input id="r-name" class="input" placeholder="e.g. 1 hour gaming"></div>
      <div class="input-group"><label>Level</label>
        <select id="r-level" class="input"><option value="small">Small</option><option value="medium">Medium</option><option value="big">Big</option></select>
      </div>
      <div class="input-group"><label>Unlock When</label>
        <select id="r-cond-type" class="input">
          <option value="habits_done_today">Habits done today ≥</option>
          <option value="points">Total points ≥</option>
        </select>
      </div>
      <div class="input-group"><label>Value</label><input id="r-cond-val" class="input" type="number" value="3" min="1"></div>
      <button class="btn btn-primary btn-full" id="save-reward-btn">Add Reward</button>
    `);
    modal.querySelector('#save-reward-btn').onclick = async () => {
      const name = modal.querySelector('#r-name').value.trim();
      if (!name) return toast('Enter a reward name', 'error');
      await api.rewards.create({
        name, level: modal.querySelector('#r-level').value,
        condition_type: modal.querySelector('#r-cond-type').value,
        condition_value: parseInt(modal.querySelector('#r-cond-val').value)
      });
      closeModal(); toast('Reward added! 🏆', 'success');
      this.showRewardsPage(container);
    };
  }
};

// ── PUNISHMENTS MODULE ──
const Punishments = {
  async showPage(container) {
    container.innerHTML = skeleton(3);
    try {
      const { punishments, active_punishments } = await api.punishments.list();
      const logs = await api.punishments.logs();

      const html = `
        <div class="header-row"><h1>⚡ Punishments</h1><button class="btn btn-sm btn-primary" id="add-pun-btn">+ Add</button></div>

        <div class="section-label">Active (${active_punishments.length})</div>
        ${active_punishments.length === 0
          ? '<div class="card"><p style="color:var(--success);font-weight:600">✅ No active punishments! Keep it up.</p></div>'
          : active_punishments.map(p => `
            <div class="punishment-item">
              <div class="punishment-icon">💪</div>
              <div class="punishment-info">
                <div class="punishment-name">${p.punishments?.name || p.name}</div>
                <div class="punishment-meta">${severityBadge(p.punishments?.severity || 'moderate')} · ${timeAgo(p.triggered_at)}</div>
              </div>
              <div class="punishment-actions">
                <button class="btn btn-sm btn-success done-pun" data-id="${p.id}">✓ Done</button>
                <button class="btn btn-sm btn-ghost skip-pun" data-id="${p.id}" style="color:var(--danger)">Skip</button>
              </div>
            </div>`).join('')}

        <div class="divider"></div>
        <div class="section-label">Your Punishment List</div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">These get randomly picked when you slip or miss a habit</p>
        ${(punishments || []).map(p => {
          const canDelete = !p.is_preloaded;
          return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
            <div>
              <div style="font-size:14px;font-weight:600">${p.name}</div>
              <div style="font-size:12px;color:var(--text-muted)">${severityBadge(p.severity)}</div>
            </div>
            ${canDelete ? `<button class="btn btn-sm btn-ghost del-pun-btn" data-id="${p.id}" style="color:var(--danger)">✕</button>` : '<span style="font-size:11px;color:var(--text-dim)">default</span>'}
          </div>`;
        }).join('')}

        <div class="divider"></div>
        <div class="section-label">History</div>
        ${logs.slice(0, 15).map(l => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
            <span>${l.punishments?.name || 'Punishment'}</span>
            <span class="badge ${l.completed ? 'badge-success' : l.skipped ? 'badge-danger' : 'badge-gray'}">${l.completed ? 'Done ✓' : l.skipped ? 'Skipped' : 'Pending'}</span>
          </div>`).join('') || '<p style="color:var(--text-muted);font-size:14px">No history yet</p>'}
      `;
      container.innerHTML = html;

      container.querySelectorAll('.done-pun').forEach(btn => {
        btn.onclick = async () => {
          const res = await api.punishments.complete(btn.dataset.id);
          toast(res.message || 'Punishment completed! +3 pts 💪', 'success');
          this.showPage(container);
        };
      });
      container.querySelectorAll('.skip-pun').forEach(btn => {
        btn.onclick = () => confirm('Skip this punishment? -10 shame points.', async () => {
          const res = await api.punishments.skip(btn.dataset.id);
          toast(res.message || 'Skipped. -10 pts', 'warning');
          this.showPage(container);
        }, 'Skip anyway', true);
      });
      container.querySelectorAll('.del-pun-btn').forEach(btn => {
        btn.onclick = () => confirm('Delete this punishment?', async () => {
          try {
            await api.punishments.delete(btn.dataset.id);
            toast('Punishment deleted', 'info');
            this.showPage(container);
          } catch (err) { toast(err.message, 'error'); }
        }, 'Delete', true);
      });
      container.querySelector('#add-pun-btn').onclick = () => this.showAddModal(container);
    } catch (err) { container.innerHTML = emptyState('⚠️', 'Error', err.message); }
  },

  showAddModal(container) {
    const modal = showModal(`
      <h3 class="modal-title">New Punishment</h3>
      <div class="input-group"><label>Punishment</label><input id="p-name" class="input" placeholder="e.g. 20 pushups"></div>
      <div class="input-group"><label>Severity</label>
        <select id="p-sev" class="input"><option value="mild">Mild</option><option value="moderate" selected>Moderate</option><option value="strict">Strict</option></select>
      </div>
      <button class="btn btn-primary btn-full" id="save-pun-btn">Add Punishment</button>
    `);
    modal.querySelector('#save-pun-btn').onclick = async () => {
      const name = modal.querySelector('#p-name').value.trim();
      if (!name) return toast('Enter a punishment name', 'error');
      await api.punishments.create({ name, severity: modal.querySelector('#p-sev').value });
      closeModal(); toast('Punishment added', 'info');
      this.showPage(container);
    };
  }
};
