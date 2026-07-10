// Shared admin utilities
function getKey() {
  const k = sessionStorage.getItem('adminKey');
  if (!k) { location.href = '/admin/index.html'; return null; }
  return k;
}

function authHeaders() {
  return { 'x-admin-key': getKey(), 'Content-Type': 'application/json' };
}

function adminFetch(url, opts = {}) {
  const key = getKey();
  if (!key) return Promise.reject('no key');
  const isFormData = opts.body instanceof FormData;
  opts.headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(opts.headers || {}),
    'x-admin-key': key,
  };
  return fetch(url, opts).then(async r => {
    if (r.status === 401) { sessionStorage.clear(); location.href = '/admin/index.html'; }
    return r;
  });
}

function showToast(msg, type = '') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = 'toast', 3000);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function statusBadge(s) {
  const map = {
    pending:   ['badge-pending',   '⏳ รอชำระเงิน'],
    paid:      ['badge-paid',      '💰 รอยืนยัน'],
    confirmed: ['badge-confirmed', '✅ ยืนยันแล้ว'],
    shipped:   ['badge-shipped',   '🚚 จัดส่งแล้ว'],
    delivered: ['badge-delivered', '📦 รับแล้ว'],
    cancelled: ['badge-cancelled', '❌ ยกเลิก'],
  };
  const [cls, label] = map[s] || ['', s];
  return `<span class="badge ${cls}">${label}</span>`;
}

function logout() { sessionStorage.clear(); location.href = '/admin/index.html'; }
