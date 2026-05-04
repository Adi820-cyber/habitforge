// ── API CLIENT ──
const API_BASE = '/api/v1';

const api = {
  _token: null,

  setToken(t) { this._token = t; localStorage.setItem('hf_token', t); },
  clearToken() { this._token = null; localStorage.removeItem('hf_token'); },
  getToken() { return this._token || localStorage.getItem('hf_token'); },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(API_BASE + path, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      if (!navigator.onLine) throw new Error('You are offline');
      throw err;
    }
  },

  get: (p) => api.request('GET', p),
  post: (p, b) => api.request('POST', p, b),
  put: (p, b) => api.request('PUT', p, b),
  delete: (p) => api.request('DELETE', p),

  // Auth
  auth: {
    register: (d) => api.post('/auth/register', d),
    login: (d) => api.post('/auth/login', d),
    me: () => api.get('/auth/me'),
    updateProfile: (d) => api.put('/auth/me', d),
  },

  // Habits
  habits: {
    list: () => api.get('/habits'),
    preloaded: () => api.get('/habits/preloaded'),
    addPreloaded: (id) => api.post(`/habits/preloaded/${id}/add`),
    create: (d) => api.post('/habits', d),
    update: (id, d) => api.put(`/habits/${id}`, d),
    delete: (id) => api.delete(`/habits/${id}`),
    archive: (id) => api.delete(`/habits/${id}`),
    log: (id, status, note = '', date = null) => api.post(`/habits/${id}/log`, { status, note, date }),
    streak: (id) => api.get(`/habits/${id}/streak`),
    logsForDate: (date) => api.get(`/habits/logs?date=${date}`),
  },

  // Rewards
  rewards: {
    list: () => api.get('/rewards'),
    preloaded: () => api.get('/rewards/preloaded'),
    create: (d) => api.post('/rewards', d),
    delete: (id) => api.delete(`/rewards/${id}`),
    use: (id) => api.post(`/rewards/${id}/use`),
    logs: () => api.get('/rewards/logs'),
  },

  // Punishments
  punishments: {
    list: () => api.get('/punishments'),
    preloaded: () => api.get('/punishments/preloaded'),
    create: (d) => api.post('/punishments', d),
    delete: (id) => api.delete(`/punishments/${id}`),
    logs: () => api.get('/punishments/logs'),
    complete: (id) => api.post(`/punishments/logs/${id}/complete`),
    skip: (id) => api.post(`/punishments/logs/${id}/skip`),
  },

  // Challenges
  challenges: {
    list: () => api.get('/challenges'),
    get: (id) => api.get(`/challenges/${id}`),
    join: (id) => api.post(`/challenges/${id}/join`),
    checkin: (id, notes) => api.post(`/challenges/${id}/checkin`, { notes }),
    active: () => api.get('/challenges/active'),
    completed: () => api.get('/challenges/completed'),
    create: (d) => api.post('/challenges', d),
  },

  // Stats
  stats: {
    today: () => api.get('/stats/today'),
    weekly: () => api.get('/stats/weekly'),
    heatmap: (m) => api.get(`/stats/heatmap?months=${m || 3}`),
    points: () => api.get('/stats/points'),
    suggestion: () => api.get('/stats/suggestion'),
    badHabits: () => api.get('/stats/bad-habits'),
    pointsLedger: () => api.get('/stats/points-ledger'),
  },

  // Diary
  diary: {
    aiProcess: (d) => api.post('/diary/ai-process', d),
    saveEntry: (d) => api.post('/diary/entry', d),
    listEntries: () => api.get('/diary/entries'),
    getEntry: (date) => api.get(`/diary/entry/${date}`),
    deleteEntry: (date) => api.delete(`/diary/entry/${date}`),
    moodTrend: () => api.get('/diary/mood-trend'),
    englishProgress: () => api.get('/diary/english-progress'),
    saveProgress: (d) => api.post('/diary/english-progress', d),
    exportData: () => api.get('/diary/export-data'),
    weeklyInsight: () => api.get('/diary/weekly-insight'),
  },

  // Push
  push: {
    vapidKey: () => api.get('/push/vapid-public-key'),
    subscribe: (sub) => api.post('/push/subscribe', { subscription: sub }),
  }
};
