// ── HABITS MODULE ──
const Habits = {
  _habits: [], // cache to avoid re-fetching on edit

  async render() {
    const el = document.getElementById('page-habits');
    el.innerHTML = skeleton(4);
    try {
      this._habits = await api.habits.list();
      this.showList(el, this._habits);
    } catch (err) { el.innerHTML = emptyState('⚠️', 'Error', err.message); }
  },

  showList(el, habits) {
    const goodHabits = habits.filter(h => !h.is_archived && (h.habit_type || 'good') === 'good');
    const badHabits = habits.filter(h => !h.is_archived && h.habit_type === 'bad');

    el.innerHTML = `
      <div class="header-row"><h1>💪 My Habits</h1>
        <button class="btn btn-sm btn-primary" id="add-habit-btn">+ Add</button>
      </div>

      <!-- GOOD HABITS -->
      <div class="section-label" style="display:flex;justify-content:space-between;">
        <span>✅ Build Habits (${goodHabits.length})</span>
        <button class="btn btn-sm btn-ghost" id="browse-good-btn">Browse Library</button>
      </div>
      ${goodHabits.length === 0
        ? '<div class="card"><p style="color:var(--text-muted);font-size:14px">No good habits yet. Add some!</p></div>'
        : goodHabits.map(h => this._card(h)).join('')}

      <div class="divider"></div>

      <!-- BAD HABITS -->
      <div class="section-label" style="display:flex;justify-content:space-between;">
        <span>🚫 Break Habits (${badHabits.length})</span>
        <button class="btn btn-sm btn-ghost" id="browse-bad-btn">Browse</button>
      </div>
      <div class="card" style="padding:10px 14px;margin-bottom:10px;border-left:3px solid var(--danger);font-size:13px;color:var(--text-muted)">
        Track habits you want to STOP. Resisted = +15pts. Slipped = punishment triggered.
      </div>
      ${badHabits.length === 0
        ? '<div class="card"><p style="color:var(--text-muted);font-size:14px">Add a bad habit — e.g. "Scrolled social media before 10am"</p></div>'
        : badHabits.map(h => this._card(h)).join('')}
    `;

    el.querySelector('#add-habit-btn').onclick = () => this.showAddModal(el);
    el.querySelector('#browse-good-btn').onclick = () => this.showLibrary(el, 'good');
    el.querySelector('#browse-bad-btn').onclick = () => this.showLibrary(el, 'bad');

    el.querySelectorAll('[data-edit]').forEach(btn => {
      btn.onclick = () => {
        // Use cached habits — no extra API call
        const h = this._habits.find(x => x.id === btn.dataset.edit);
        if (h) this.showEditModal(h, el);
      };
    });

    el.querySelectorAll('[data-archive]').forEach(btn => {
      btn.onclick = () => {
        // Use custom confirm helper instead of window.confirm
        confirm('Archive this habit? You can still see its history.', async () => {
          await api.habits.archive(btn.dataset.archive);
          toast('Habit archived', 'info');
          this.render();
        }, 'Archive');
      };
    });
  },

  _card(h) {
    const isBad = h.habit_type === 'bad';
    return `
      <div class="habit-item ${isBad ? 'bad-habit' : ''}" style="flex-wrap:wrap;">
        <div class="habit-icon" style="background:${isBad ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)'}">
          ${isBad ? '🚫' : '⭐'}
        </div>
        <div class="habit-info" style="flex:1">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">${h.category} · ${h.frequency} ${isBad ? '· <span style="color:var(--danger)">Break this</span>' : ''}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-ghost" data-edit="${h.id}">✏️</button>
          <button class="btn btn-sm btn-ghost" style="color:var(--danger)" data-archive="${h.id}">🗑</button>
        </div>
      </div>
    `;
  },

  showAddModal(el) {
    const modal = showModal(`
      <h3 class="modal-title">New Habit</h3>
      <div class="input-group"><label>Habit Name</label><input id="h-name" class="input" placeholder="e.g. Read 20 pages"></div>
      <div class="input-group"><label>Type</label>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <button class="btn btn-sm type-btn active" data-type="good" style="flex:1;border:2px solid var(--primary)">✅ Build (Good)</button>
          <button class="btn btn-sm type-btn" data-type="bad" style="flex:1;border:2px solid transparent">🚫 Break (Bad)</button>
        </div>
        <input type="hidden" id="h-type" value="good">
      </div>
      <div class="input-group"><label>Category</label>
        <select id="h-cat" class="input">
          <option>Focus</option><option>Fitness</option><option>Health</option>
          <option>Digital Detox</option><option>Mindset</option><option>Custom</option>
        </select>
      </div>
      <div class="input-group"><label>Frequency</label>
        <select id="h-freq" class="input"><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option></select>
      </div>
      <div class="input-group"><label>Description (optional)</label><input id="h-desc" class="input" placeholder="What counts as done?"></div>
      <button class="btn btn-primary btn-full" id="save-habit-btn">Add Habit</button>
    `);

    modal.querySelectorAll('.type-btn').forEach(btn => {
      btn.onclick = () => {
        modal.querySelectorAll('.type-btn').forEach(b => { b.style.borderColor = 'transparent'; b.classList.remove('active'); });
        btn.style.borderColor = btn.dataset.type === 'bad' ? 'var(--danger)' : 'var(--primary)';
        btn.classList.add('active');
        modal.querySelector('#h-type').value = btn.dataset.type;
      };
    });

    modal.querySelector('#save-habit-btn').onclick = async () => {
      const name = modal.querySelector('#h-name').value.trim();
      if (!name) return toast('Enter a habit name', 'error');
      try {
        await api.habits.create({
          name,
          habit_type: modal.querySelector('#h-type').value,
          category: modal.querySelector('#h-cat').value,
          frequency: modal.querySelector('#h-freq').value,
          description: modal.querySelector('#h-desc').value
        });
        closeModal();
        toast('Habit added! 🎯', 'success');
        this.render();
      } catch (err) { toast(err.message, 'error'); }
    };
  },

  // Takes habit object directly (no API call needed)
  showEditModal(h, el) {
    const modal = showModal(`
      <h3 class="modal-title">Edit Habit</h3>
      <div class="input-group"><label>Name</label><input id="eh-name" class="input" value="${h.name}"></div>
      <div class="input-group"><label>Category</label>
        <select id="eh-cat" class="input">
          ${['Focus','Fitness','Health','Digital Detox','Mindset','Custom'].map(c =>
            `<option ${h.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="input-group"><label>Frequency</label>
        <select id="eh-freq" class="input">
          <option ${h.frequency==='daily'?'selected':''} value="daily">Daily</option>
          <option ${h.frequency==='weekdays'?'selected':''} value="weekdays">Weekdays</option>
          <option ${h.frequency==='weekends'?'selected':''} value="weekends">Weekends</option>
        </select>
      </div>
      <div class="input-group"><label>Type</label>
        <select id="eh-type" class="input">
          <option value="good" ${h.habit_type !== 'bad' ? 'selected' : ''}>✅ Good (Build this habit)</option>
          <option value="bad" ${h.habit_type === 'bad' ? 'selected' : ''}>🚫 Bad (Break this habit)</option>
        </select>
      </div>
      <button class="btn btn-primary btn-full" id="update-habit-btn">Save Changes</button>
    `);
    modal.querySelector('#update-habit-btn').onclick = async () => {
      await api.habits.update(h.id, {
        name: modal.querySelector('#eh-name').value,
        category: modal.querySelector('#eh-cat').value,
        frequency: modal.querySelector('#eh-freq').value,
        habit_type: modal.querySelector('#eh-type').value
      });
      closeModal(); toast('Updated!', 'success'); this.render();
    };
  },

  async showLibrary(el, filterType = 'good') {
    el.innerHTML = skeleton(5);
    try {
      const preloaded = await api.habits.preloaded();
      const filtered = preloaded.filter(h => (h.habit_type || 'good') === filterType);
      const myHabits = await api.habits.list();
      const myNames = new Set(myHabits.map(h => h.name.toLowerCase()));

      el.innerHTML = `
        <div class="header-row">
          <button class="btn btn-sm btn-ghost" id="back-lib">← Back</button>
          <h1 style="font-size:16px">${filterType === 'bad' ? '🚫 Bad Habits Library' : '✅ Good Habits Library'}</h1>
        </div>
        ${filtered.length === 0 ? '<div class="card"><p style="color:var(--text-muted)">No preloaded habits for this type yet.</p></div>' : ''}
        ${filtered.map(h => `
          <div class="card" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:600;font-size:14px">${h.name}</div>
              <div style="font-size:12px;color:var(--text-muted)">${h.category} · ${h.description}</div>
            </div>
            ${myNames.has(h.name.toLowerCase())
              ? '<span class="badge badge-success">Added</span>'
              : `<button class="btn btn-sm btn-primary add-preloaded" data-id="${h.id}">+ Add</button>`}
          </div>`).join('')}
      `;
      el.querySelector('#back-lib').onclick = () => this.render();
      el.querySelectorAll('.add-preloaded').forEach(btn => {
        btn.onclick = async () => {
          await api.habits.addPreloaded(btn.dataset.id);
          btn.textContent = '✓'; btn.disabled = true;
          toast('Habit added!', 'success');
        };
      });
    } catch (err) { el.innerHTML = emptyState('⚠️', 'Error', err.message); }
  }
};
