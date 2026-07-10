// Homepage - load products
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/products');
    const products = await res.json();

    if (!products.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="icon">👕</div>
          <h3>ยังไม่มีสินค้า</h3>
          <p>กรุณารอสักครู่</p>
        </div>`;
      return;
    }

    grid.innerHTML = products.map(p => {
      const firstColor = p.colors?.[0];
      const img = p.cover_image || firstColor?.image_path;
      const colorDots = p.colors?.map(c => `
        <span class="color-dot" style="background:${c.hex_code}" title="${c.name}"></span>
      `).join('') || '';

      return `
        <a href="/product.html?id=${p.id}" class="product-card">
          <div class="product-img">
            ${img ? `<img src="${img}" alt="${p.name}" loading="lazy">` : '👕'}
          </div>
          <div class="product-info">
            <div class="product-name">${p.name}</div>
            <div class="product-price">฿${p.price.toLocaleString()}</div>
            <div class="color-dots">${colorDots}</div>
          </div>
        </a>`;
    }).join('');
  } catch(e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>โหลดสินค้าไม่ได้ กรุณาลองใหม่</p></div>`;
  }
}

loadProducts();
