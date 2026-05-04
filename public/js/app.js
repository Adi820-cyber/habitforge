// ── APP ROUTER & INIT ──
const App = {
  currentUser: null,
  currentPage: 'dashboard',

  async init() {
    // Offline detection
    window.addEventListener('online', () => document.body.classList.remove('offline'));
    window.addEventListener('offline', () => document.body.classList.add('offline'));
    if (!navigator.onLine) document.body.classList.add('offline');

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('/sw.js'); }
      catch (e) { console.warn('SW registration failed:', e); }
    }

    // Check auth
    const token = api.getToken();
    if (!token) { this.showAuth(); return; }

    try {
      const user = await api.auth.me();
      this.currentUser = user;
      this.showApp();
    } catch {
      api.clearToken();
      this.showAuth();
    }
  },

  showAuth() {
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('app').style.display = 'none';
    Auth.renderLogin();
  },

  showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    this.navigate('dashboard');
    this._setupNavigation();
  },

  _setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.page));
    });
  },

  navigate(page) {
    this.currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById(`nav-${page}`);
    if (navBtn) navBtn.classList.add('active');

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    // Render page content
    switch (page) {
      case 'dashboard': Dashboard.render(); break;
      case 'habits': Habits.render(); break;
      case 'diary': Diary.render(); break;
      case 'stats': Stats.render(); break;
      case 'settings': Settings.render(); break;
    }

    window.scrollTo(0, 0);
  }
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
