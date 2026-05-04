// ── DIARY MODULE ──
const Diary = {
  entries: [],
  currentView: 'home',

  async render() {
    const el = document.getElementById('page-diary');
    if (!DiaryEncryption.hasPIN()) { this.showSetupPIN(el); return; }
    if (!DiaryEncryption.isUnlocked()) { this.showUnlockPIN(el); return; }
    this.showHome(el);
  },

  showSetupPIN(el) {
    let pin = '';
    let confirmPin = '';
    let stage = 'set';
    el.innerHTML = `
      <div class="page-header"><h1>📔 Setup Diary PIN</h1><p>Your PIN encrypts your diary. It never leaves your device.</p></div>
      <div id="pin-stage-label" style="text-align:center;font-size:16px;font-weight:600;margin-bottom:8px;">Create your 4-digit PIN</div>
      <div class="pin-display" id="pin-display">${'<div class="pin-dot"></div>'.repeat(4)}</div>
      <div class="pin-pad" id="pin-pad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `<button class="pin-key" data-key="${k}">${k}</button>`).join('')}
      </div>
    `;
    this._bindPinPad(el, async (entered) => {
      if (stage === 'set') {
        pin = entered;
        stage = 'confirm';
        el.querySelector('#pin-stage-label').textContent = 'Confirm your PIN';
        return false;
      } else {
        if (entered === pin) {
          await DiaryEncryption.setupPIN(pin);
          toast('PIN set! Your diary is protected 🔒', 'success');
          this.showHome(el);
          return true;
        } else {
          stage = 'set'; pin = '';
          toast('PINs do not match, try again', 'error');
          el.querySelector('#pin-stage-label').textContent = 'Create your 4-digit PIN';
          return false;
        }
      }
    });
  },

  showUnlockPIN(el) {
    let attempts = 0;
    el.innerHTML = `
      <div class="page-header"><h1>📔 Diary</h1><p>Enter your PIN to unlock</p></div>
      <div class="pin-display" id="pin-display">${'<div class="pin-dot"></div>'.repeat(4)}</div>
      <div id="pin-error" style="text-align:center;color:var(--danger);height:20px;margin-bottom:8px;font-size:13px;"></div>
      <div class="pin-pad" id="pin-pad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `<button class="pin-key" data-key="${k}">${k}</button>`).join('')}
      </div>
    `;
    this._bindPinPad(el, async (entered) => {
      const ok = await DiaryEncryption.verifyPIN(entered);
      if (ok) { this.showHome(el); return true; }
      attempts++;
      el.querySelector('#pin-error').textContent = `Wrong PIN (${attempts}/5)`;
      if (attempts >= 5) {
        el.querySelector('#pin-pad').style.pointerEvents = 'none';
        el.querySelector('#pin-error').textContent = 'Too many attempts. Wait 10 minutes.';
        setTimeout(() => { el.querySelector('#pin-pad').style.pointerEvents = ''; attempts = 0; el.querySelector('#pin-error').textContent = ''; }, 10 * 60 * 1000);
      }
      return false;
    });
  },

  _bindPinPad(el, onComplete) {
    let current = '';
    const display = el.querySelector('#pin-display');
    const updateDisplay = () => {
      display.innerHTML = Array.from({ length: 4 }, (_, i) =>
        `<div class="pin-dot ${i < current.length ? 'filled' : ''}"></div>`
      ).join('');
    };
    el.querySelector('#pin-pad').addEventListener('click', async e => {
      const key = e.target.closest('.pin-key')?.dataset.key;
      if (key === undefined) return;
      if (key === '⌫') { current = current.slice(0, -1); }
      else if (current.length < 4 && key !== '') { current += key; }
      updateDisplay();
      if (current.length === 4) {
        const done = await onComplete(current);
        if (!done) { setTimeout(() => { current = ''; updateDisplay(); }, 400); }
      }
    });
  },

  async showHome(el) {
    el.innerHTML = skeleton(3);
    try {
      this.entries = await api.diary.listEntries();
      const moodTrend = await api.diary.moodTrend();
      const moodMap = {};
      moodTrend.forEach(e => { moodMap[e.entry_date] = e.mood_emoji; });

      const today = new Date().toISOString().split('T')[0];
      const hasToday = this.entries.some(e => e.entry_date === today);

      // Build 30-day calendar
      const calDays = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const hasEntry = this.entries.some(e => e.entry_date === key);
        const mood = moodMap[key];
        calDays.push({ key, day: d.getDate(), hasEntry, mood, isToday: key === today });
      }

      const streak = this._calcWritingStreak();

      el.innerHTML = `
        <div class="header-row"><h1>📔 Diary</h1>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-sm btn-ghost" id="diary-export-btn">📄 Export</button>
            <button class="btn btn-sm btn-ghost" id="diary-lock-btn">🔒</button>
          </div>
        </div>

        <div class="stats-grid" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:12px;">
          <div class="stat-card"><div class="stat-num" style="color:var(--accent-light)">${this.entries.length}</div><div class="stat-label">Entries</div></div>
          <div class="stat-card"><div class="stat-num" style="color:#F59E0B">${streak}</div><div class="stat-label">Day Streak</div></div>
          <div class="stat-card"><div class="stat-num" style="font-size:${moodTrend.length ? '14px' : '20px'}">${moodTrend.slice(-7).map(e => e.mood_emoji || '·').join('') || '—'}</div><div class="stat-label">This Week</div></div>
        </div>

        <!-- 7-day Mood Trend Chart -->
        ${moodTrend.length >= 2 ? (() => {
          const last7 = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const found = moodTrend.find(e => e.entry_date === key);
            last7.push({ key, day: d.toLocaleDateString('en-IN', { weekday: 'short' }), entry: found });
          }
          const energyToNum = e => e === 'high' ? 3 : e === 'medium' ? 2 : e === 'low' ? 1 : 0;
          return `
            <div class="chart-wrap" style="margin-bottom:14px">
              <div class="chart-title">7-Day Mood & Energy</div>
              <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;align-items:end;height:60px;padding:0 4px">
                ${last7.map(d => {
                  const energyH = d.entry ? energyToNum(d.entry.energy_level) * 18 + 4 : 4;
                  const color = d.entry ? (d.entry.energy_level === 'high' ? 'var(--success)' : d.entry.energy_level === 'medium' ? 'var(--primary-light)' : 'var(--text-dim)') : 'var(--border)';
                  return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                    <div style="font-size:14px">${d.entry?.mood_emoji || ''}</div>
                    <div style="width:100%;height:${energyH}px;background:${color};border-radius:4px 4px 0 0;transition:height 0.3s"></div>
                  </div>`;
                }).join('')}
              </div>
              <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:4px 4px 0">
                ${last7.map(d => `<div style="text-align:center;font-size:10px;color:var(--text-dim)">${d.day}</div>`).join('')}
              </div>
            </div>
          `;
        })() : ''}

        <div class="diary-calendar">
          ${calDays.map(d => `
            <div class="diary-day" data-date="${d.key}">
              <div class="diary-day-num">${d.day}</div>
              <div class="diary-dot ${d.hasEntry ? 'has-entry' : ''} ${d.isToday ? 'today' : ''}">${d.mood || (d.hasEntry ? '✓' : '')}</div>
            </div>`).join('')}
        </div>

        ${hasToday
          ? `<button class="btn btn-ghost btn-full" id="write-today-btn" style="margin-bottom:12px;">📖 View / Edit Today's Entry</button>`
          : `<button class="btn btn-primary btn-full" id="write-today-btn" style="margin-bottom:12px;">✍️ Write Today's Entry</button>`}

        <div class="section-label">Recent Entries</div>
        ${this.entries.slice(0, 10).map(e => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;" class="entry-row" data-date="${e.entry_date}">
            <div>
              <div style="font-weight:600;font-size:14px">${formatDate(e.entry_date)}</div>
              <div style="font-size:12px;color:var(--text-muted)">${e.word_count} words ${e.mood_emoji || ''}</div>
            </div>
            <span style="font-size:20px">${e.mood_emoji || '📝'}</span>
          </div>`).join('') || '<p style="color:var(--text-muted)">No entries yet. Write your first one!</p>'}
      `;

      el.querySelector('#write-today-btn').onclick = () => this.showWriteEntry(el, today);
      el.querySelector('#diary-lock-btn').onclick = () => { DiaryEncryption.lock(); this.render(); };
      el.querySelector('#diary-export-btn').onclick = () => this.exportPDF(el);

      el.querySelectorAll('.entry-row').forEach(row => {
        row.onclick = () => this.showViewEntry(el, row.dataset.date);
      });
      el.querySelectorAll('.diary-day').forEach(day => {
        day.onclick = () => {
          const date = day.dataset.date;
          const has = this.entries.some(e => e.entry_date === date);
          if (has) this.showViewEntry(el, date);
          else if (date === today) this.showWriteEntry(el, date);
        };
      });
    } catch (err) { el.innerHTML = emptyState('⚠️', 'Error', err.message); }
  },

  _calcWritingStreak() {
    const dates = new Set(this.entries.map(e => e.entry_date));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (dates.has(key)) streak++;
      else if (i > 0) break;
    }
    return streak;
  },

  showWriteEntry(el, date) {
    let selectedMood = null, selectedEnergy = null;
    const moods = ['😊', '😐', '😢', '😤', '⚡'];

    el.innerHTML = `
      <div class="header-row">
        <button class="btn btn-sm btn-ghost" id="back-diary">← Back</button>
        <h1 style="font-size:16px">${formatDate(date)}</h1>
        <div id="word-count" style="color:var(--text-muted);font-size:13px">0 words</div>
      </div>

      <div class="section-label">How are you feeling?</div>
      <div class="mood-row">${moods.map(m => `<button class="mood-btn" data-mood="${m}">${m}</button>`).join('')}</div>

      <div class="section-label">Energy Level</div>
      <div class="energy-toggle">
        <button class="energy-btn" data-energy="low">😴 Low</button>
        <button class="energy-btn" data-energy="medium">⚡ Medium</button>
        <button class="energy-btn" data-energy="high">🔥 High</button>
      </div>

      <div style="height:14px;"></div>
      <div class="input-group">
        <label>Your Day — write anything, any language</label>
        <textarea id="diary-text" class="input" rows="10" placeholder="Write your day... Marathi, English, mix — anything works. AI will help you with English after you submit."></textarea>
      </div>

      <!-- Voice to Text -->
      <button class="btn btn-ghost btn-full" id="voice-btn" style="margin-bottom:12px;">🎤 Voice Input (tap to speak)</button>

      <button class="btn btn-primary btn-full" id="submit-diary-btn" disabled>Save & Get AI Feedback</button>
      <div id="ai-loading" style="display:none;text-align:center;padding:24px;"><div class="skeleton" style="height:200px;"></div><p style="color:var(--text-muted);margin-top:12px;">🤖 AI is reading your diary…</p></div>
    `;

    const textarea = el.querySelector('#diary-text');
    const submitBtn = el.querySelector('#submit-diary-btn');
    const wcEl = el.querySelector('#word-count');

    textarea.addEventListener('input', () => {
      const wc = textarea.value.trim().split(/\s+/).filter(Boolean).length;
      wcEl.textContent = `${wc} words`;
      submitBtn.disabled = textarea.value.trim().length < 30;
    });

    el.querySelectorAll('.mood-btn').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedMood = btn.dataset.mood;
      };
    });

    el.querySelectorAll('.energy-btn').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.energy-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEnergy = btn.dataset.energy;
      };
    });

    // Voice to Text
    const voiceBtn = el.querySelector('#voice-btn');
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      let isListening = false;

      voiceBtn.onclick = () => {
        if (isListening) { recognition.stop(); return; }
        recognition.start(); isListening = true;
        voiceBtn.textContent = '🔴 Listening… (tap to stop)';
        voiceBtn.style.color = 'var(--danger)';
      };
      recognition.onresult = e => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        textarea.value = textarea.value + ' ' + transcript;
        textarea.dispatchEvent(new Event('input'));
      };
      recognition.onend = () => {
        isListening = false;
        voiceBtn.textContent = '🎤 Voice Input (tap to speak)';
        voiceBtn.style.color = '';
      };
    } else {
      voiceBtn.textContent = '🎤 Voice not supported on this browser';
      voiceBtn.disabled = true;
    }

    el.querySelector('#back-diary').onclick = () => this.showHome(el);

    submitBtn.onclick = async () => {
      const rawEntry = textarea.value.trim();
      submitBtn.style.display = 'none';
      el.querySelector('#ai-loading').style.display = 'block';
      try {
        const aiResponse = await api.diary.aiProcess({ raw_entry: rawEntry, mood_emoji: selectedMood, energy_level: selectedEnergy });
        this.showAIFeedback(el, date, rawEntry, aiResponse, selectedMood, selectedEnergy);
      } catch (err) {
        toast('AI failed: ' + err.message, 'error');
        submitBtn.style.display = '';
        el.querySelector('#ai-loading').style.display = 'none';
      }
    };
  },

  showAIFeedback(el, date, rawEntry, ai, mood, energy) {
    const lessons = ai.english_lessons || [];
    const suggestions = ai.habit_suggestions || [];

    el.innerHTML = `
      <div class="header-row">
        <button class="btn btn-sm btn-ghost" id="back-write">← Back</button>
        <h1 style="font-size:16px">AI Feedback</h1>
      </div>

      <div class="ai-card"><div class="ai-icon">💬</div><div class="ai-motivation">${ai.coach_message || 'Great work writing today!'}</div></div>

      <div class="accordion-item ${lessons.length > 0 ? 'open' : ''}">
        <div class="accordion-header" data-accordion>
          📚 English Lessons (${lessons.length} corrections) <span class="accordion-arrow">▼</span>
        </div>
        <div class="accordion-body ${lessons.length > 0 ? 'open' : ''}">
          ${lessons.map(l => `<div class="lesson-item"><div class="lesson-original">✗ "${l.original}"</div><div class="lesson-corrected">✓ "${l.corrected}"</div><div class="lesson-explanation">${l.explanation}</div></div>`).join('') || '<p style="color:var(--text-muted)">No major errors found!</p>'}
        </div>
      </div>

      <div class="accordion-item">
        <div class="accordion-header" data-accordion>
          ✍️ Corrected Entry <span class="accordion-arrow">▼</span>
        </div>
        <div class="accordion-body">
          <p style="line-height:1.8;font-size:14px;color:var(--text-muted)">${ai.corrected_entry || ''}</p>
        </div>
      </div>

      <div class="accordion-item">
        <div class="accordion-header" data-accordion>
          😊 Mood Analysis <span class="accordion-arrow">▼</span>
        </div>
        <div class="accordion-body">
          ${ai.mood_analysis ? `
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
              <span class="badge badge-accent">${ai.mood_analysis.detected_mood}</span>
              <span class="badge badge-primary">${ai.mood_analysis.energy_level} energy</span>
            </div>
            <p style="font-size:14px;color:var(--text-muted)">${ai.mood_analysis.mood_summary}</p>` : 'No mood analysis available.'}
        </div>
      </div>

      <div class="accordion-item">
        <div class="accordion-header" data-accordion>
          🎯 Habit Suggestions for Tomorrow <span class="accordion-arrow">▼</span>
        </div>
        <div class="accordion-body">
          ${suggestions.map(s => `
            <div style="padding:10px 0;border-bottom:1px solid var(--border);">
              <div style="font-weight:600;font-size:14px">+ ${s.habit}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${s.reason}</div>
              <button class="btn btn-sm btn-ghost add-suggested-habit" data-name="${s.habit}" style="margin-top:8px">Add This Habit</button>
            </div>`).join('')}
        </div>
      </div>

      <div style="height:16px;"></div>
      <button class="btn btn-primary btn-full" id="save-diary-btn">🔒 Save Entry (Encrypted)</button>
    `;

    // Wire accordion toggles via JS (no inline onclick)
    el.querySelectorAll('[data-accordion]').forEach(hdr => {
      hdr.addEventListener('click', () => hdr.nextElementSibling.classList.toggle('open'));
    });

    el.querySelector('#back-write').onclick = () => this.showHome(el);

    el.querySelectorAll('.add-suggested-habit').forEach(btn => {
      btn.onclick = async () => {
        await api.habits.create({ name: btn.dataset.name, category: 'Custom', frequency: 'daily' });
        btn.textContent = '✓ Added'; btn.disabled = true;
        toast('Habit added!', 'success');
      };
    });

    el.querySelector('#save-diary-btn').onclick = async () => {
      const btn = el.querySelector('#save-diary-btn');
      btn.disabled = true; btn.textContent = 'Encrypting & Saving…';
      try {
        const fullData = JSON.stringify({ raw_entry: rawEntry, ai_response: ai });
        const pin = DiaryEncryption.getActivePin();
        const { encrypted_blob, iv, salt } = await DiaryEncryption.encrypt(fullData, pin);

        await api.diary.saveEntry({
          entry_date: date,
          encrypted_blob, iv, salt,
          mood_emoji: mood,
          energy_level: energy,
          word_count: rawEntry.split(/\s+/).filter(Boolean).length,
          has_ai_response: true
        });

        // Update English progress
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const ws = weekStart.toISOString().split('T')[0];
        await api.diary.saveProgress({
          week_start: ws,
          total_mistakes: (ai.english_lessons || []).length,
          common_error_types: [],
          entries_written: 1,
          avg_word_count: rawEntry.split(/\s+/).filter(Boolean).length
        });

        toast('Diary saved & encrypted! 🔒', 'success');
        this.showHome(el);
      } catch (err) { toast('Save failed: ' + err.message, 'error'); btn.disabled = false; btn.textContent = '🔒 Save Entry (Encrypted)'; }
    };
  },

  async showViewEntry(el, date) {
    el.innerHTML = `<div class="page-header"><button class="btn btn-ghost" id="back-view">← Back</button><h1>${formatDate(date)}</h1></div><div style="text-align:center;padding:40px;"><p style="color:var(--text-muted)">🔓 Decrypting entry…</p></div>`;
    el.querySelector('#back-view').onclick = () => this.showHome(el);

    try {
      const encData = await api.diary.getEntry(date);
      const pin = DiaryEncryption.getActivePin();
      const plaintext = await DiaryEncryption.decrypt(encData.encrypted_blob, encData.iv, encData.salt, pin);
      const { raw_entry, ai_response } = JSON.parse(plaintext);

      el.innerHTML = `
        <div class="header-row">
          <button class="btn btn-sm btn-ghost" id="back-view2">← Back</button>
          <h1 style="font-size:16px">${formatDate(date)}</h1>
          <span>${encData.mood_emoji || '📝'}</span>
        </div>
        <div class="card">
          <div class="section-label">Your Entry</div>
          <p style="line-height:1.8;font-size:14px;white-space:pre-wrap">${raw_entry}</p>
        </div>
        ${ai_response?.corrected_entry ? `<div class="card"><div class="section-label">AI Corrected</div><p style="line-height:1.8;font-size:14px;color:var(--text-muted)">${ai_response.corrected_entry}</p></div>` : ''}
        ${ai_response?.coach_message ? `<div class="ai-card"><div class="ai-icon">💬</div><div class="ai-motivation">${ai_response.coach_message}</div></div>` : ''}
        <button class="btn btn-ghost btn-full" id="del-entry-btn" style="color:var(--danger)">Delete Entry</button>
      `;
      el.querySelector('#back-view2').onclick = () => this.showHome(el);
      el.querySelector('#del-entry-btn').onclick = () => {
        confirm('Delete this diary entry permanently?', async () => {
          await api.diary.deleteEntry(date);
          toast('Entry deleted', 'info');
          this.showHome(el);
        }, 'Delete', true);
      };
    } catch (err) { toast('Could not decrypt: wrong PIN?', 'error'); this.showHome(el); }
  },

  async exportPDF(el) {
    // Step 1: Verify PIN is active — if not, ask for it
    if (!DiaryEncryption.isUnlocked()) {
      const pinModal = showModal(`
        <h3 class="modal-title">🔐 Enter Diary PIN</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px">Your PIN is needed to decrypt entries for the PDF</p>
        <div class="pin-display" id="export-pin-display">
          ${'<div class="pin-dot"></div>'.repeat(4)}
        </div>
        <div class="pin-pad" style="max-width:260px;margin:16px auto 0;">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `<button class="pin-key" data-k="${k}">${k}</button>`).join('')}
        </div>
        <p id="pin-export-err" style="color:var(--danger);font-size:13px;text-align:center;margin-top:10px;min-height:18px"></p>
      `);

      let enteredPin = '';
      const display = pinModal.querySelector('#export-pin-display');
      const dots = () => display.querySelectorAll('.pin-dot');
      const updateDots = () => dots().forEach((d, i) => d.classList.toggle('filled', i < enteredPin.length));

      pinModal.querySelectorAll('.pin-key').forEach(btn => {
        btn.onclick = async () => {
          const k = btn.dataset.k;
          if (k === '⌫') { enteredPin = enteredPin.slice(0, -1); updateDots(); return; }
          if (!k || enteredPin.length >= 4) return;
          enteredPin += k;
          updateDots();
          if (enteredPin.length === 4) {
            const ok = await DiaryEncryption.unlock(enteredPin);
            if (ok) { closeModal(); this._doExport(el); }
            else {
              pinModal.querySelector('#pin-export-err').textContent = 'Wrong PIN, try again';
              enteredPin = ''; updateDots();
            }
          }
        };
      });
      return;
    }

    this._doExport(el);
  },

  // Strip HTML entities and tags for clean PDF text
  _cleanText(str) {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-z]+;/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  },

  async _doExport(el) {
    toast('Preparing PDF…', 'info');
    if (!window.jspdf) {
      const script = document.createElement('script');
      script.src = '/js/jspdf.umd.min.js';   // served locally — no CDN/tracking issues
      document.head.appendChild(script);
      await new Promise((res, rej) => {
        script.onload = res;
        script.onerror = () => rej(new Error('Could not load PDF library'));
      });
    }

    toast('Decrypting and generating PDF…', 'info');
    try {
      const allEntries = await api.diary.exportData();
      const pin = DiaryEncryption.getActivePin();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFont('helvetica');
      let y = 20;

      // Title
      doc.setFontSize(22); doc.setTextColor(30, 64, 175);
      doc.text('HabitForge Diary', 105, y, { align: 'center' }); y += 10;
      doc.setFontSize(11); doc.setTextColor(100);
      doc.text(`Exported: ${new Date().toLocaleDateString('en-IN')} | ${allEntries.length} entries`, 105, y, { align: 'center' }); y += 16;

      let successCount = 0;

      for (const entry of allEntries) {
        try {
          const plain = await DiaryEncryption.decrypt(entry.encrypted_blob, entry.iv, entry.salt, pin);
          const { raw_entry, ai_response } = JSON.parse(plain);

          if (y > 250) { doc.addPage(); y = 20; }

          // Date header bar
          doc.setFillColor(30, 64, 175);
          doc.rect(10, y - 6, 190, 10, 'F');
          doc.setTextColor(255); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
          const dateLabel = `${formatDate(entry.entry_date)}  ${entry.mood_emoji || ''}  ${entry.energy_level || ''}`;
          doc.text(this._cleanText(dateLabel), 15, y); y += 14;

          // Your entry (italic, gray)
          doc.setTextColor(100); doc.setFontSize(10); doc.setFont('helvetica', 'italic');
          const rawLines = doc.splitTextToSize(this._cleanText(raw_entry || ''), 180);
          doc.text(rawLines, 15, y); y += rawLines.length * 5 + 8;

          // AI corrected entry (normal, darker)
          if (ai_response?.corrected_entry && ai_response.corrected_entry !== raw_entry) {
            doc.setTextColor(50); doc.setFont('helvetica', 'normal');
            const corrLines = doc.splitTextToSize(this._cleanText(ai_response.corrected_entry), 180);
            doc.text(corrLines, 15, y); y += corrLines.length * 5 + 8;
          }

          // Coach message (purple)
          if (ai_response?.coach_message) {
            doc.setTextColor(124, 58, 237); doc.setFont('helvetica', 'italic');
            const msg = this._cleanText(ai_response.coach_message);
            const msgLines = doc.splitTextToSize(`"${msg}"`, 180);
            doc.text(msgLines, 15, y); y += msgLines.length * 5 + 6;
          }

          // Divider
          doc.setDrawColor(51, 65, 85); doc.line(10, y, 200, y); y += 12;
          successCount++;
        } catch {
          // Entry can't decrypt with current PIN — skip silently
        }
      }

      if (successCount === 0) {
        toast('No entries could be decrypted. Check your PIN.', 'error');
        return;
      }

      doc.save('habitforge-diary.pdf');
      toast(`PDF exported! ${successCount} entries ✓`, 'success');
    } catch (err) { toast('Export failed: ' + err.message, 'error'); }
  }
};
