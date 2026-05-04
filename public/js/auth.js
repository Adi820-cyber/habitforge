// ── AUTH MODULE ──
const Auth = {
  renderLogin() {
    document.getElementById('auth-container').innerHTML = `
      <div class="auth-logo">⚡</div>
      <h1 class="auth-title">HabitForge</h1>
      <p class="auth-sub">Build habits. Earn rewards. Grow 1% daily.</p>
      <div class="input-group"><label>Email</label><input id="login-email" class="input" type="email" placeholder="you@email.com" autocomplete="email"></div>
      <div class="input-group"><label>Password</label><input id="login-password" class="input" type="password" placeholder="Your password" autocomplete="current-password"></div>
      <button class="btn btn-primary btn-full" id="login-btn">Sign In</button>
      <div class="auth-toggle">Don't have an account? <a id="go-register">Create one</a></div>
    `;
    document.getElementById('login-btn').onclick = () => this.login();
    document.getElementById('go-register').onclick = () => this.renderRegister();
    document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') this.login(); });
  },

  renderRegister() {
    document.getElementById('auth-container').innerHTML = `
      <div class="auth-logo">⚡</div>
      <h1 class="auth-title">Create Account</h1>
      <p class="auth-sub">Start your habit journey today</p>
      <div class="input-group"><label>Your Name</label><input id="reg-name" class="input" type="text" placeholder="Aditya" autocomplete="name"></div>
      <div class="input-group"><label>Email</label><input id="reg-email" class="input" type="email" placeholder="you@email.com" autocomplete="email"></div>
      <div class="input-group"><label>Password <span style="color:var(--text-dim);font-weight:400">(min 8 chars)</span></label><input id="reg-password" class="input" type="password" placeholder="Create a password" autocomplete="new-password"></div>
      <button class="btn btn-primary btn-full" id="reg-btn">Create Account</button>
      <div class="auth-toggle">Already have an account? <a id="go-login">Sign in</a></div>
    `;
    document.getElementById('reg-btn').onclick = () => this.register();
    document.getElementById('go-login').onclick = () => this.renderLogin();
  },

  async login() {
    const btn = document.getElementById('login-btn');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) return toast('Fill in all fields', 'error');

    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const data = await api.auth.login({ email, password });
      api.setToken(data.session.access_token);
      App.currentUser = data.user;
      App.showApp();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  },

  async register() {
    const btn = document.getElementById('reg-btn');
    const display_name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!display_name || !email || !password) return toast('Fill in all fields', 'error');
    if (password.length < 8) return toast('Password must be at least 8 characters', 'error');

    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const data = await api.auth.register({ display_name, email, password });
      if (data.session) {
        api.setToken(data.session.access_token);
        App.currentUser = data.user;
        App.showApp();
      } else {
        toast('Account created! Please sign in.', 'success');
        this.renderLogin();
      }
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  }
};
