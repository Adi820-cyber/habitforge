// ── SHARED COMPONENTS ──

function toast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, duration);
}

function showModal(content, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-sheet"><div class="modal-handle"></div>${content}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); if (onClose) onClose(); } });
  document.getElementById('modal-container').appendChild(overlay);
  return overlay;
}

function closeModal() {
  const m = document.querySelector('.modal-overlay');
  if (m) m.remove();
}

function confirm(msg, onConfirm, confirmText = 'Confirm', dangerMode = false) {
  const modal = showModal(`
    <h3 class="modal-title">${msg}</h3>
    <div style="display:flex;gap:10px;margin-top:8px;">
      <button class="btn btn-ghost btn-full" id="modal-cancel-btn">Cancel</button>
      <button class="btn ${dangerMode ? 'btn-danger' : 'btn-primary'} btn-full" id="modal-confirm-btn">${confirmText}</button>
    </div>
  `);
  modal.querySelector('#modal-cancel-btn').onclick = () => closeModal();
  modal.querySelector('#modal-confirm-btn').onclick = () => { closeModal(); onConfirm(); };
}

function skeleton(rows = 3) {
  return Array.from({ length: rows }, () =>
    `<div class="skeleton" style="height:72px;margin-bottom:10px;"></div>`
  ).join('');
}

function emptyState(icon, title, text, btnHtml = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><p class="empty-text">${text}</p>${btnHtml ? `<div style="margin-top:20px;">${btnHtml}</div>` : ''}</div>`;
}

function categoryColor(cat) {
  const m = { Focus: '#3B82F6', Fitness: '#10B981', Health: '#F59E0B', 'Digital Detox': '#8B5CF6', Mindset: '#EC4899', Custom: '#64748B' };
  return m[cat] || '#64748B';
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function severityBadge(s) {
  const m = { mild: 'badge-success', moderate: 'badge-warning', strict: 'badge-danger' };
  return `<span class="badge ${m[s] || 'badge-gray'}">${s}</span>`;
}
