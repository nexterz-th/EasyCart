// Cart management - stored in localStorage
function getCart() {
  return JSON.parse(localStorage.getItem('easycart_cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('easycart_cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(item) {
  const cart = getCart();
  const idx = cart.findIndex(c =>
    c.product_id === item.product_id &&
    c.color_id === item.color_id &&
    c.size_id === item.size_id
  );
  if (idx >= 0) {
    cart[idx].quantity += item.quantity;
  } else {
    cart.push(item);
  }
  saveCart(cart);
  showToast('เพิ่มสินค้าลงตะกร้าแล้ว 🛒', 'success');
}

function removeFromCart(idx) {
  const cart = getCart();
  cart.splice(idx, 1);
  saveCart(cart);
  renderCartItems();
}

function updateQty(idx, delta) {
  const cart = getCart();
  cart[idx].quantity = Math.max(1, (cart[idx].quantity || 1) + delta);
  saveCart(cart);
  renderCartItems();
}

function clearCart() {
  localStorage.removeItem('easycart_cart');
  updateCartUI();
}

function updateCartUI() {
  const cart = getCart();
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  document.querySelectorAll('#cartCount').forEach(el => el.textContent = count);
  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = '฿' + total.toLocaleString();

  // floating cart badge
  const badge = document.getElementById('floatingCartCount');
  const floatBtn = document.getElementById('floatingCart');
  if (badge) badge.textContent = count;
  if (floatBtn) floatBtn.style.display = count > 0 ? 'flex' : 'none';
}

function renderCartItems() {
  const cart = getCart();
  const container = document.getElementById('cartItems');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🛒</div>
        <h3>ตะกร้าว่างเปล่า</h3>
        <p>เลือกสินค้าที่ชอบได้เลย!</p>
      </div>`;
    return;
  }

  container.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${item.image ? `<img src="${item.image}" alt="${item.product_name}">` : '👕'}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.product_name}</div>
        <div class="cart-item-variant">สี: ${item.color_name} | ไซส์: ${item.size_name}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
          <button onclick="updateQty(${i},-1)" style="width:24px;height:24px;border-radius:50%;border:1px solid #ddd;background:white;cursor:pointer;font-size:0.9rem">-</button>
          <span style="font-weight:700">${item.quantity}</span>
          <button onclick="updateQty(${i},1)" style="width:24px;height:24px;border-radius:50%;border:1px solid #ddd;background:white;cursor:pointer;font-size:0.9rem">+</button>
          <span class="cart-item-price">฿${(item.price * item.quantity).toLocaleString()}</span>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${i})">✕</button>
    </div>
  `).join('');

  updateCartUI();
}

function toggleCart(e) {
  if (e) e.preventDefault();
  const overlay = document.getElementById('cartOverlay');
  const panel = document.getElementById('cartPanel');
  if (!overlay || !panel) return;
  const isOpen = overlay.classList.contains('open');
  if (isOpen) {
    overlay.classList.remove('open');
    panel.classList.remove('open');
  } else {
    overlay.classList.add('open');
    panel.classList.add('open');
    renderCartItems();
  }
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => t.className = 'toast', 3000);
}

function toggleMobileNav() {
  const m = document.getElementById('mobileNav');
  if (m) m.classList.toggle('open');
}

function initFloatingCart() {
  if (!document.getElementById('cartPanel')) return;
  if (document.getElementById('floatingCart')) return;
  const btn = document.createElement('button');
  btn.id = 'floatingCart';
  btn.setAttribute('aria-label', 'ตะกร้าสินค้า');
  btn.onclick = (e) => toggleCart(e);
  btn.innerHTML = '🛒<span id="floatingCartCount" class="floating-cart-count">0</span>';
  document.body.appendChild(btn);
}


// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initFloatingCart();
  updateCartUI();
});
