require('dotenv').config();
const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// DB setup using built-in node:sqlite
const db = new DatabaseSync(path.join(__dirname, 'easycart.db'));
db.exec('PRAGMA journal_mode=WAL');
db.exec('PRAGMA foreign_keys=ON');

// Init tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT DEFAULT 'เสื้อยืด',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS product_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    size_id INTEGER,
    stock INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    name TEXT NOT NULL,
    hex_code TEXT DEFAULT '#000000'
  );
  CREATE TABLE IF NOT EXISTS color_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    color_id INTEGER,
    image_path TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_slip TEXT,
    payment_confirmed_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    color_name TEXT,
    size_name TEXT,
    price REAL,
    quantity INTEGER
  );
`);

// Settings table
db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
const _settingsDefaults = {
  store_name:'EasyCart', logo_icon:'🛒', logo_image:'',
  color_primary:'#0284C7', color_accent:'#DB2777', color_bg:'#F5F8FF',
  color_text_dark:'#1E2A50', color_text_body:'#4A5C88', color_text_light:'#94A3C8',
  font_family:'Noto Sans Thai',
  hero_title:'เสื้อยืดน่ารัก สีสวย 🎨',
  hero_subtitle:'เลือกสีที่ชอบ เลือกไซส์ที่ใช่ ส่งตรงถึงบ้าน',
  color_hero_text:'#FFFFFF', color_hero_sub:'rgba(255,255,255,0.85)',
  color_btn_primary_text:'#FFFFFF', color_btn_accent_text:'#FFFFFF',
  color_logo:'',
  color_product_name:'', color_product_price:'',
  color_product_gallery_bg:'', color_product_desc_bg:'', color_product_desc_text:'',
  bank_name:'ธนาคารกสิกรไทย (KBank)', bank_account:'xxx-x-xxxxx-x', bank_account_name:'EasyCart Store',
  color_payment_title:'', color_payment_sub:'',
  color_payment_upload_bg:'', color_payment_upload_border:'',
  color_checkout_heading:'', color_bank_bg:'', color_bank_text:'#FFFFFF',
  color_footer_bg:'', color_footer_text:'#FFFFFF',
  color_track_title:'', color_track_sub:'',
  color_track_id:'', color_track_total:'', color_track_step_bg:'',
  color_status_pending_bg:'#FFF4DD', color_status_pending_txt:'#7A5500',
  color_status_shipped_bg:'#E2D9F3', color_status_shipped_txt:'#4A2880',
  color_status_delivered_bg:'#D4EDDA', color_status_delivered_txt:'#0A4020',
  popup_enabled:'0', popup_image:'', popup_link:'',
  badge_1:'✦ Cotton 100%', badge_2:'🚚 ส่งทั่วไทย',
  badge_3:'✦ หลากสีให้เลือก', badge_4:'🌟 คุณภาพดี ราคาเป็นมิตร',
  badge_1_enabled:'1', badge_2_enabled:'1', badge_3_enabled:'1', badge_4_enabled:'1',
  badge_color:'#FFFFFF', badge_bg:'rgba(255,255,255,0.12)', badge_border:'rgba(255,255,255,0.25)',
  footer_desc:'ร้านเสื้อยืดน่ารัก คุณภาพดี ราคาเป็นมิตร จัดส่งทั่วประเทศไทย',
  footer_line:'@easycart', footer_fb:'EasyCart',
  footer_email:'shop@easycart.com',
  footer_copy:'© 2024 EasyCart T-Shirt Store — All rights reserved',
  size_chart_image:'',
  gallery_slider_enabled:'1',
};
{ const ins = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
  for (const [k,v] of Object.entries(_settingsDefaults)) ins.run(k,v); }

// Product gallery slideshow
db.exec(`CREATE TABLE IF NOT EXISTS product_gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  image_path TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
)`);
try { db.exec('ALTER TABLE products ADD COLUMN gallery_enabled INTEGER DEFAULT 1'); } catch(e) {}

// Coupons table
db.exec(`CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value REAL NOT NULL,
  min_order REAL DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  expires_at TEXT DEFAULT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime'))
)`);
try { db.exec('ALTER TABLE orders ADD COLUMN coupon_code TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0'); } catch(e) {}

// Banners table
db.exec(`CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT, subtitle TEXT,
  button_text TEXT, button_link TEXT DEFAULT '/',
  image_path TEXT, sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime'))
)`);

// Migrate: add cover_image column if not exists
try { db.exec('ALTER TABLE products ADD COLUMN cover_image TEXT'); } catch(e) {}
// Migrate: add price per size
try { db.exec('ALTER TABLE product_sizes ADD COLUMN price REAL'); } catch(e) {}

// Color+Size variants table
db.exec(`CREATE TABLE IF NOT EXISTS color_sizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  color_id INTEGER NOT NULL,
  size_id INTEGER NOT NULL,
  price REAL,
  stock INTEGER DEFAULT 0,
  sku TEXT DEFAULT '',
  UNIQUE(color_id, size_id)
)`);

// Migrate existing product_sizes data into color_sizes (one-time)
{
  const migrated = db.prepare("SELECT value FROM settings WHERE key='color_sizes_migrated'").get();
  if (!migrated) {
    const colors = db.prepare('SELECT * FROM colors').all();
    const ins = db.prepare('INSERT OR IGNORE INTO color_sizes (color_id,size_id,stock,price) VALUES (?,?,?,?)');
    colors.forEach(c => {
      const pSizes = db.prepare('SELECT * FROM product_sizes WHERE product_id=?').all(c.product_id);
      pSizes.forEach(ps => ins.run(c.id, ps.size_id, ps.stock, ps.price));
    });
    db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('color_sizes_migrated','1')").run();
  }
}

// Seed default sizes
const sizeCount = db.prepare('SELECT COUNT(*) as c FROM sizes').get();
if (sizeCount.c === 0) {
  const ins = db.prepare('INSERT INTO sizes (name, sort_order) VALUES (?, ?)');
  [['XS',1],['S',2],['M',3],['L',4],['XL',5],['2XL',6],['3XL',7]].forEach(([n,o]) => ins.run(n,o));
}

// Seed demo product
const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get();
if (prodCount.c === 0) {
  const pid = db.prepare(`INSERT INTO products (name,description,price) VALUES (?,?,?)`)
    .run('เสื้อยืด Basic Oversize', 'เสื้อยืด Oversize ผ้า Cotton 100% นุ่มสบาย ใส่ได้ทุกวัน', 290).lastInsertRowid;
  const sizes = db.prepare('SELECT * FROM sizes').all();
  sizes.forEach(s => db.prepare('INSERT INTO product_sizes (product_id,size_id,stock) VALUES (?,?,?)').run(pid,s.id,20));
  [['ขาว','#FFFFFF'],['ดำ','#222222'],['ฟ้า','#87CEEB'],['เหลือง','#FFE66D'],['เขียว','#7EC8A4'],['ส้ม','#FF8A65']]
    .forEach(([n,h]) => db.prepare('INSERT INTO colors (product_id,name,hex_code) VALUES (?,?,?)').run(pid,n,h));
}

// Multer — image-only filter
const imageFilter = (req, file, cb) => {
  if (/^image\/(jpeg|jpg|png|gif|webp|avif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น'), false);
};
const safeExt = (file) => {
  const allowed = ['.jpg','.jpeg','.png','.gif','.webp','.avif'];
  const ext = path.extname(file.originalname).toLowerCase();
  return allowed.includes(ext) ? ext : '.bin';
};
const productStorage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, path.join(__dirname,'uploads/products')),
  filename: (req,file,cb) => cb(null, Date.now()+'-'+Math.random().toString(36).slice(2)+safeExt(file))
});
const paymentStorage = multer.diskStorage({
  destination: (req,file,cb) => { const d=path.join(__dirname,'uploads/payments'); fs.mkdirSync(d,{recursive:true}); cb(null,d); },
  filename: (req,file,cb) => cb(null, Date.now()+'-'+Math.random().toString(36).slice(2)+safeExt(file))
});
const uploadProduct = multer({ storage: productStorage, limits:{ fileSize:5*1024*1024 }, fileFilter:imageFilter });
const uploadPayment = multer({ storage: paymentStorage, limits:{ fileSize:5*1024*1024 }, fileFilter:imageFilter });
const logoStorage = multer.diskStorage({
  destination: (req,file,cb) => { const d=path.join(__dirname,'uploads/logo'); fs.mkdirSync(d,{recursive:true}); cb(null,d); },
  filename: (req,file,cb) => cb(null, 'logo'+safeExt(file))
});
const uploadLogo = multer({ storage: logoStorage, limits:{ fileSize:2*1024*1024 }, fileFilter:imageFilter });
const galleryStorage = multer.diskStorage({
  destination: (req,file,cb) => { const d=path.join(__dirname,'uploads/gallery'); fs.mkdirSync(d,{recursive:true}); cb(null,d); },
  filename: (req,file,cb) => cb(null, Date.now()+'-'+Math.random().toString(36).slice(2)+safeExt(file))
});
const uploadGallery = multer({ storage: galleryStorage, limits:{ fileSize:5*1024*1024 }, fileFilter:imageFilter });
const sizeChartStorage = multer.diskStorage({
  destination: (req,file,cb) => { const d=path.join(__dirname,'uploads/sizechart'); fs.mkdirSync(d,{recursive:true}); cb(null,d); },
  filename: (req,file,cb) => cb(null, 'sizechart'+safeExt(file))
});
const uploadSizeChart = multer({ storage: sizeChartStorage, limits:{ fileSize:5*1024*1024 }, fileFilter:imageFilter });
const popupStorage = multer.diskStorage({
  destination: (req,file,cb) => { const d=path.join(__dirname,'uploads/popup'); fs.mkdirSync(d,{recursive:true}); cb(null,d); },
  filename: (req,file,cb) => cb(null, 'popup'+safeExt(file))
});
const uploadPopup = multer({ storage: popupStorage, limits:{ fileSize:5*1024*1024 }, fileFilter:imageFilter });
const bannerStorage = multer.diskStorage({
  destination: (req,file,cb) => { const d=path.join(__dirname,'uploads/banners'); fs.mkdirSync(d,{recursive:true}); cb(null,d); },
  filename: (req,file,cb) => cb(null, Date.now()+'-'+Math.random().toString(36).slice(2)+safeExt(file))
});
const uploadBanner = multer({ storage: bannerStorage, limits:{ fileSize:5*1024*1024 }, fileFilter:imageFilter });

// Mailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||587),
  secure: false, auth:{ user:process.env.SMTP_USER, pass:process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.urlencoded({ extended:true }));

// Security headers
app.use((req,res,next) => {
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(),microphone=(),geolocation=()');
  next();
});

app.use('/uploads', express.static(path.join(__dirname,'uploads')));
app.use('/admin', express.static(path.join(__dirname,'admin')));
app.use(express.static(path.join(__dirname,'public')));

app.set('trust proxy', 1); // trust Cloudflare / nginx X-Forwarded-For

// Rate limiter — simple in-memory (resets on restart, fine for single instance)
const _rl = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const key = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    const now = Date.now();
    const rec = _rl.get(key) || { count:0, start:now };
    if (now - rec.start > windowMs) { rec.count = 0; rec.start = now; }
    rec.count++;
    _rl.set(key, rec);
    if (rec.count > max) return res.status(429).json({ error:'Too many requests' });
    next();
  };
}

function adminAuth(req,res,next) {
  if (req.headers['x-admin-key'] === process.env.ADMIN_PASS) return next();
  res.status(401).json({ error:'Unauthorized' });
}

// ==================== PUBLIC API ====================

app.get('/api/products', (req,res) => {
  const products = db.prepare('SELECT * FROM products WHERE is_active=1 ORDER BY id DESC').all();
  products.forEach(p => {
    p.colors = db.prepare(`
      SELECT c.*, ci.image_path FROM colors c
      LEFT JOIN color_images ci ON c.id=ci.color_id AND ci.sort_order=(SELECT MIN(sort_order) FROM color_images WHERE color_id=c.id)
      WHERE c.product_id=?`).all(p.id);
  });
  res.json(products);
});

app.get('/api/products/:id', (req,res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=? AND is_active=1').get(req.params.id);
  if (!p) return res.status(404).json({ error:'Not found' });
  const colors = db.prepare('SELECT * FROM colors WHERE product_id=?').all(p.id);
  colors.forEach(c => {
    c.images = db.prepare('SELECT * FROM color_images WHERE color_id=? ORDER BY sort_order').all(c.id);
    c.sizes = db.prepare(`
      SELECT s.id, s.name, s.sort_order,
        COALESCE(cs.stock, 0) as stock,
        COALESCE(cs.price, ps.price) as size_price
      FROM sizes s
      LEFT JOIN color_sizes cs ON s.id=cs.size_id AND cs.color_id=?
      LEFT JOIN product_sizes ps ON s.id=ps.size_id AND ps.product_id=?
      ORDER BY s.sort_order`).all(c.id, p.id);
  });
  p.colors = colors;
  p.sizes = db.prepare(`
    SELECT s.id, s.name, s.sort_order, COALESCE(ps.stock,0) as stock, ps.price as size_price
    FROM sizes s LEFT JOIN product_sizes ps ON s.id=ps.size_id AND ps.product_id=?
    ORDER BY s.sort_order`).all(p.id);
  p.gallery = db.prepare('SELECT * FROM product_gallery WHERE product_id=? ORDER BY sort_order,id').all(p.id);
  res.json(p);
});

// ==================== COUPON PUBLIC API ====================
function validateCoupon(code, subtotal) {
  if (!code) return null;
  const c = db.prepare("SELECT * FROM coupons WHERE code=? AND is_active=1").get(code.toUpperCase().trim());
  if (!c) return { error: 'ไม่พบโค้ดคูปอง' };
  if (c.max_uses !== null && c.used_count >= c.max_uses) return { error: 'คูปองถูกใช้งานครบจำนวนแล้ว' };
  if (c.expires_at && new Date(c.expires_at) < new Date()) return { error: 'คูปองหมดอายุแล้ว' };
  if (subtotal < c.min_order) return { error: `ยอดสั่งซื้อขั้นต่ำ ฿${c.min_order.toLocaleString()}` };
  const discount = c.discount_type === 'percent'
    ? Math.min(subtotal, Math.round(subtotal * c.discount_value / 100))
    : Math.min(subtotal, c.discount_value);
  return { coupon: c, discount };
}

app.post('/api/coupon/validate', rateLimit(30, 60*1000), (req,res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'กรุณาระบุโค้ด' });
  const result = validateCoupon(code, subtotal || 0);
  if (result?.error) return res.status(400).json({ error: result.error });
  res.json({
    code: result.coupon.code,
    discount_type: result.coupon.discount_type,
    discount_value: result.coupon.discount_value,
    discount: result.discount,
  });
});

app.post('/api/orders', (req,res) => {
  const { customer_name, customer_phone, customer_email, customer_address, items, coupon_code } = req.body;
  if (!customer_name||!customer_phone||!customer_email||!customer_address||!items?.length)
    return res.status(400).json({ error:'ข้อมูลไม่ครบถ้วน' });

  const order_number = 'EC'+Date.now().toString().slice(-8);
  let subtotal = 0;
  const enriched = items.map(item => {
    const product = db.prepare('SELECT * FROM products WHERE id=?').get(item.product_id);
    const color = db.prepare('SELECT * FROM colors WHERE id=?').get(item.color_id);
    const size = db.prepare('SELECT * FROM sizes WHERE id=?').get(item.size_id);
    const cs = db.prepare('SELECT price FROM color_sizes WHERE color_id=? AND size_id=?').get(item.color_id, item.size_id);
    const ps = db.prepare('SELECT price FROM product_sizes WHERE product_id=? AND size_id=?').get(item.product_id, item.size_id);
    const itemPrice = (cs?.price != null) ? cs.price : (ps?.price != null) ? ps.price : product.price;
    subtotal += itemPrice * item.quantity;
    return { ...item, product_name:product.name, color_name:color.name, size_name:size.name, price:itemPrice };
  });

  let discountAmount = 0;
  let appliedCoupon = null;
  if (coupon_code) {
    const result = validateCoupon(coupon_code, subtotal);
    if (!result?.error) {
      discountAmount = result.discount;
      appliedCoupon = result.coupon;
    }
  }
  const total = Math.max(0, subtotal - discountAmount);

  const orderId = db.prepare(`INSERT INTO orders (order_number,customer_name,customer_phone,customer_email,customer_address,total_amount,coupon_code,discount_amount) VALUES (?,?,?,?,?,?,?,?)`)
    .run(order_number,customer_name,customer_phone,customer_email,customer_address,total,appliedCoupon?.code||null,discountAmount).lastInsertRowid;

  enriched.forEach(i => db.prepare(`INSERT INTO order_items (order_id,product_id,product_name,color_name,size_name,price,quantity) VALUES (?,?,?,?,?,?,?)`)
    .run(orderId,i.product_id,i.product_name,i.color_name,i.size_name,i.price,i.quantity));

  if (appliedCoupon) db.prepare('UPDATE coupons SET used_count=used_count+1 WHERE id=?').run(appliedCoupon.id);

  sendOrderEmail(order_number,customer_name,customer_email,customer_address,customer_phone,enriched,subtotal,discountAmount,appliedCoupon?.code);
  res.json({ order_number, order_id:orderId, total });
});

app.post('/api/orders/:orderNumber/payment', uploadPayment.single('slip'), (req,res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get(req.params.orderNumber);
  if (!order) return res.status(404).json({ error:'ไม่พบออเดอร์' });
  const slipPath = req.file ? '/uploads/payments/'+req.file.filename : null;
  db.prepare("UPDATE orders SET payment_slip=?, status='paid' WHERE order_number=?").run(slipPath,req.params.orderNumber);
  sendPaymentNotifyEmail(order,slipPath);
  res.json({ success:true });
});

app.get('/api/track', (req,res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error:'ระบุเลขออเดอร์หรือเบอร์โทร' });
  const orders = db.prepare(`SELECT * FROM orders WHERE order_number=? OR customer_phone=? ORDER BY created_at DESC LIMIT 5`).all(q,q);
  orders.forEach(o => { o.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id); });
  res.json(orders);
});

// ==================== PRODUCT GALLERY SLIDESHOW ====================
app.get('/api/admin/products/:id/gallery', adminAuth, (req,res) => {
  res.json(db.prepare('SELECT * FROM product_gallery WHERE product_id=? ORDER BY sort_order,id').all(req.params.id));
});
app.post('/api/admin/products/:id/gallery', adminAuth, uploadGallery.array('images',20), (req,res) => {
  const existing = db.prepare('SELECT MAX(sort_order) as m FROM product_gallery WHERE product_id=?').get(req.params.id);
  let order = (existing.m || 0) + 1;
  req.files.forEach(f => db.prepare('INSERT INTO product_gallery (product_id,image_path,sort_order) VALUES (?,?,?)').run(req.params.id, '/uploads/gallery/'+f.filename, order++));
  res.json({ ok:true });
});
app.delete('/api/admin/gallery/:id', adminAuth, (req,res) => {
  const img = db.prepare('SELECT * FROM product_gallery WHERE id=?').get(req.params.id);
  if (img) { try { fs.unlinkSync(path.join(__dirname, img.image_path.replace(/^\//,''))); } catch(e) {} }
  db.prepare('DELETE FROM product_gallery WHERE id=?').run(req.params.id);
  res.json({ ok:true });
});
app.put('/api/admin/products/:id/gallery-toggle', adminAuth, (req,res) => {
  db.prepare('UPDATE products SET gallery_enabled=? WHERE id=?').run(req.body.enabled ? 1 : 0, req.params.id);
  res.json({ ok:true });
});

// ==================== COLOR-SIZE VARIANTS ====================

app.get('/api/admin/products/:id/color-sizes', adminAuth, (req,res) => {
  const colors = db.prepare('SELECT * FROM colors WHERE product_id=?').all(req.params.id);
  const sizes = db.prepare('SELECT * FROM sizes ORDER BY sort_order').all();
  colors.forEach(c => {
    c.images = db.prepare('SELECT * FROM color_images WHERE color_id=? ORDER BY sort_order LIMIT 1').all(c.id);
    c.variants = sizes.map(s => {
      const cs = db.prepare('SELECT * FROM color_sizes WHERE color_id=? AND size_id=?').get(c.id, s.id);
      return { size_id: s.id, size_name: s.name, price: cs?.price ?? null, stock: cs?.stock ?? 0, sku: cs?.sku ?? '' };
    });
  });
  res.json({ colors, sizes });
});

app.put('/api/admin/color-sizes/:colorId/:sizeId', adminAuth, (req,res) => {
  const { price, stock, sku } = req.body;
  const priceVal = (price !== undefined && price !== '' && price !== null) ? parseFloat(price) : null;
  db.prepare(`INSERT INTO color_sizes (color_id,size_id,price,stock,sku) VALUES (?,?,?,?,?)
    ON CONFLICT(color_id,size_id) DO UPDATE SET price=excluded.price, stock=excluded.stock, sku=excluded.sku`)
    .run(req.params.colorId, req.params.sizeId, priceVal, parseInt(stock)||0, sku||'');
  res.json({ ok:true });
});

app.put('/api/admin/products/:id/color-sizes/bulk', adminAuth, (req,res) => {
  const { price, stock, sku } = req.body;
  const colors = db.prepare('SELECT id FROM colors WHERE product_id=?').all(req.params.id);
  const sizes = db.prepare('SELECT id FROM sizes').all();
  const priceVal = (price !== undefined && price !== '' && price !== null) ? parseFloat(price) : null;
  const stockVal = (stock !== undefined && stock !== '' && stock !== null) ? parseInt(stock) : null;
  const skuVal = (sku !== undefined && sku !== '' && sku !== null) ? sku : null;
  colors.forEach(c => sizes.forEach(s => {
    const existing = db.prepare('SELECT * FROM color_sizes WHERE color_id=? AND size_id=?').get(c.id, s.id);
    if (existing) {
      db.prepare('UPDATE color_sizes SET price=?, stock=?, sku=? WHERE color_id=? AND size_id=?')
        .run(priceVal !== null ? priceVal : existing.price,
             stockVal !== null ? stockVal : existing.stock,
             skuVal !== null ? skuVal : existing.sku,
             c.id, s.id);
    } else {
      db.prepare('INSERT INTO color_sizes (color_id,size_id,price,stock,sku) VALUES (?,?,?,?,?)')
        .run(c.id, s.id, priceVal, stockVal ?? 0, skuVal ?? '');
    }
  }));
  res.json({ ok:true });
});

// ==================== ADMIN API ====================

// ==================== BANNERS PUBLIC ====================
app.get('/api/banners', (req,res) => {
  res.json(db.prepare('SELECT * FROM banners WHERE is_active=1 ORDER BY sort_order,id').all());
});

// ==================== BANNERS ADMIN ====================
app.get('/api/admin/banners', adminAuth, (req,res) => {
  res.json(db.prepare('SELECT * FROM banners ORDER BY sort_order,id').all());
});
app.post('/api/admin/banners', adminAuth, (req,res) => {
  const { title,subtitle,button_text,button_link,sort_order } = req.body;
  const id = db.prepare('INSERT INTO banners (title,subtitle,button_text,button_link,sort_order) VALUES (?,?,?,?,?)')
    .run(title||'',subtitle||'',button_text||'',button_link||'/',sort_order||0).lastInsertRowid;
  res.json({ ok:true, id });
});
app.put('/api/admin/banners/:id', adminAuth, (req,res) => {
  const { title,subtitle,button_text,button_link,sort_order,is_active } = req.body;
  db.prepare('UPDATE banners SET title=?,subtitle=?,button_text=?,button_link=?,sort_order=?,is_active=? WHERE id=?')
    .run(title||'',subtitle||'',button_text||'',button_link||'/',sort_order??0,is_active??1,req.params.id);
  res.json({ ok:true });
});
app.delete('/api/admin/banners/:id', adminAuth, (req,res) => {
  const b = db.prepare('SELECT image_path FROM banners WHERE id=?').get(req.params.id);
  if (b?.image_path) try { fs.unlinkSync(path.join(__dirname,b.image_path.replace(/^\//,''))); } catch(e) {}
  db.prepare('DELETE FROM banners WHERE id=?').run(req.params.id);
  res.json({ ok:true });
});
app.post('/api/admin/banners/:id/image', adminAuth, uploadBanner.single('image'), (req,res) => {
  if (!req.file) return res.status(400).json({ error:'no file' });
  const old = db.prepare('SELECT image_path FROM banners WHERE id=?').get(req.params.id);
  if (old?.image_path) try { fs.unlinkSync(path.join(__dirname,old.image_path.replace(/^\//,''))); } catch(e) {}
  const imgPath = '/uploads/banners/'+req.file.filename;
  db.prepare('UPDATE banners SET image_path=? WHERE id=?').run(imgPath,req.params.id);
  res.json({ ok:true, image_path:imgPath });
});

app.get('/api/theme', (req,res) => {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  const out = {};
  rows.forEach(r => out[r.key] = r.value);
  res.json(out);
});

// Rate-limit admin verify to 20 attempts / 15 min per IP
app.get('/api/admin/verify', rateLimit(20, 15*60*1000), adminAuth, (req,res) => res.json({ ok:true }));

app.post('/api/admin/upload-logo', adminAuth, uploadLogo.single('logo'), (req,res) => {
  if (!req.file) return res.status(400).json({ error:'no file' });
  const imgPath = '/uploads/logo/' + req.file.filename;
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('logo_image', imgPath);
  res.json({ ok:true, logo_image: imgPath });
});

app.post('/api/admin/upload-sizechart', adminAuth, uploadSizeChart.single('image'), (req,res) => {
  if (!req.file) return res.status(400).json({ error:'no file' });
  const imgPath = '/uploads/sizechart/' + req.file.filename;
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('size_chart_image', imgPath);
  res.json({ ok:true, size_chart_image: imgPath });
});

app.post('/api/admin/upload-popup', adminAuth, uploadPopup.single('image'), (req,res) => {
  if (!req.file) return res.status(400).json({ error:'no file' });
  const old = db.prepare("SELECT value FROM settings WHERE key='popup_image'").get();
  if (old?.value) try { fs.unlinkSync(path.join(__dirname, old.value.replace(/^\//,''))); } catch(e) {}
  const imgPath = '/uploads/popup/' + req.file.filename;
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('popup_image', imgPath);
  res.json({ ok:true, popup_image: imgPath });
});
app.delete('/api/admin/popup-image', adminAuth, (req,res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key='popup_image'").get();
  if (row?.value) try { fs.unlinkSync(path.join(__dirname, row.value.replace(/^\//,''))); } catch(e) {}
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('popup_image', '');
  res.json({ ok:true });
});

app.delete('/api/admin/sizechart', adminAuth, (req,res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get('size_chart_image');
  if (row?.value) try { fs.unlinkSync(path.join(__dirname, row.value.replace(/^\//,''))); } catch(e) {}
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('size_chart_image', '');
  res.json({ ok:true });
});

app.delete('/api/admin/logo', adminAuth, (req,res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get('logo_image');
  if (row?.value) try { fs.unlinkSync(path.join(__dirname, row.value.replace(/^\//,''))); } catch(e) {}
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('logo_image', '');
  res.json({ ok:true });
});

app.put('/api/admin/theme', adminAuth, (req,res) => {
  const upd = db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)');
  for (const [k,v] of Object.entries(req.body)) upd.run(k, String(v));
  res.json({ ok:true });
});

app.put('/api/admin/change-password', adminAuth, (req,res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/^ADMIN_PASS=.*$/m, 'ADMIN_PASS=' + newPassword);
  fs.writeFileSync(envPath, envContent, 'utf8');
  process.env.ADMIN_PASS = newPassword;
  res.json({ ok: true });
});

app.get('/api/admin/products', adminAuth, (req,res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  products.forEach(p => {
    p.colors = db.prepare('SELECT * FROM colors WHERE product_id=?').all(p.id);
    p.colors.forEach(c => { c.images = db.prepare('SELECT * FROM color_images WHERE color_id=? ORDER BY sort_order').all(c.id); });
    p.sizes = db.prepare('SELECT s.*,COALESCE(ps.stock,0) as stock FROM sizes s LEFT JOIN product_sizes ps ON s.id=ps.size_id AND ps.product_id=? ORDER BY s.sort_order').all(p.id);
  });
  res.json(products);
});

app.post('/api/admin/products', adminAuth, (req,res) => {
  const { name,description,price,category } = req.body;
  const id = db.prepare('INSERT INTO products (name,description,price,category) VALUES (?,?,?,?)').run(name,description,price,category||'เสื้อยืด').lastInsertRowid;
  const sizes = db.prepare('SELECT * FROM sizes').all();
  sizes.forEach(s => db.prepare('INSERT OR IGNORE INTO product_sizes (product_id,size_id,stock) VALUES (?,?,0)').run(id,s.id));
  res.json({ id });
});

app.put('/api/admin/products/:id', adminAuth, (req,res) => {
  const { name,description,price,category,is_active } = req.body;
  db.prepare('UPDATE products SET name=?,description=?,price=?,category=?,is_active=? WHERE id=?').run(name,description,price,category,is_active,req.params.id);
  res.json({ ok:true });
});

app.delete('/api/admin/products/:id', adminAuth, (req,res) => {
  const id = req.params.id;
  const colors = db.prepare('SELECT id FROM colors WHERE product_id=?').all(id);
  colors.forEach(c => {
    const imgs = db.prepare('SELECT image_path FROM color_images WHERE color_id=?').all(c.id);
    imgs.forEach(img => { try { fs.unlinkSync(path.join(__dirname, img.image_path.replace(/^\//,''))); } catch(e) {} });
    db.prepare('DELETE FROM color_images WHERE color_id=?').run(c.id);
  });
  db.prepare('DELETE FROM colors WHERE product_id=?').run(id);
  db.prepare('DELETE FROM product_sizes WHERE product_id=?').run(id);
  const p = db.prepare('SELECT cover_image FROM products WHERE id=?').get(id);
  if (p?.cover_image) try { fs.unlinkSync(path.join(__dirname, p.cover_image.replace(/^\//,''))); } catch(e) {}
  db.prepare('DELETE FROM products WHERE id=?').run(id);
  res.json({ ok:true });
});

app.post('/api/admin/products/:id/cover', adminAuth, uploadProduct.single('cover'), (req,res) => {
  if (!req.file) return res.status(400).json({ error:'no file' });
  const old = db.prepare('SELECT cover_image FROM products WHERE id=?').get(req.params.id);
  if (old?.cover_image) try { fs.unlinkSync(path.join(__dirname, old.cover_image.replace(/^\//,''))); } catch(e) {}
  const imgPath = '/uploads/products/' + req.file.filename;
  db.prepare('UPDATE products SET cover_image=? WHERE id=?').run(imgPath, req.params.id);
  res.json({ ok:true, cover_image: imgPath });
});

app.post('/api/admin/colors', adminAuth, (req,res) => {
  const { product_id,name,hex_code } = req.body;
  const id = db.prepare('INSERT INTO colors (product_id,name,hex_code) VALUES (?,?,?)').run(product_id,name,hex_code).lastInsertRowid;
  res.json({ id });
});

app.put('/api/admin/colors/:id', adminAuth, (req,res) => {
  const { name,hex_code } = req.body;
  db.prepare('UPDATE colors SET name=?,hex_code=? WHERE id=?').run(name,hex_code,req.params.id);
  res.json({ ok:true });
});

app.delete('/api/admin/colors/:id', adminAuth, (req,res) => {
  const images = db.prepare('SELECT * FROM color_images WHERE color_id=?').all(req.params.id);
  images.forEach(img => { try { fs.unlinkSync(path.join(__dirname,img.image_path.replace(/^\//,''))); } catch{} });
  db.prepare('DELETE FROM color_images WHERE color_id=?').run(req.params.id);
  db.prepare('DELETE FROM colors WHERE id=?').run(req.params.id);
  res.json({ ok:true });
});

app.post('/api/admin/colors/:id/images', adminAuth, uploadProduct.array('images',10), (req,res) => {
  const colorId = req.params.id;
  const existing = db.prepare('SELECT MAX(sort_order) as m FROM color_images WHERE color_id=?').get(colorId);
  let order = (existing.m||0)+1;
  req.files.forEach(file => db.prepare('INSERT INTO color_images (color_id,image_path,sort_order) VALUES (?,?,?)').run(colorId,'/uploads/products/'+file.filename,order++));
  res.json({ ok:true });
});

app.delete('/api/admin/images/:id', adminAuth, (req,res) => {
  const img = db.prepare('SELECT * FROM color_images WHERE id=?').get(req.params.id);
  if (img) { try { fs.unlinkSync(path.join(__dirname,img.image_path.replace('/',''))); } catch{} db.prepare('DELETE FROM color_images WHERE id=?').run(req.params.id); }
  res.json({ ok:true });
});

app.get('/api/admin/sizes', adminAuth, (req,res) => res.json(db.prepare('SELECT * FROM sizes ORDER BY sort_order').all()));

app.post('/api/admin/sizes', adminAuth, (req,res) => {
  const { name,sort_order } = req.body;
  const id = db.prepare('INSERT INTO sizes (name,sort_order) VALUES (?,?)').run(name,sort_order||99).lastInsertRowid;
  // Add to all existing products
  const prods = db.prepare('SELECT id FROM products').all();
  prods.forEach(p => db.prepare('INSERT OR IGNORE INTO product_sizes (product_id,size_id,stock) VALUES (?,?,0)').run(p.id,id));
  res.json({ id });
});

app.put('/api/admin/sizes/:id', adminAuth, (req,res) => {
  const { name,sort_order } = req.body;
  db.prepare('UPDATE sizes SET name=?,sort_order=? WHERE id=?').run(name,sort_order,req.params.id);
  res.json({ ok:true });
});

app.delete('/api/admin/sizes/:id', adminAuth, (req,res) => {
  db.prepare('DELETE FROM product_sizes WHERE size_id=?').run(req.params.id);
  db.prepare('DELETE FROM sizes WHERE id=?').run(req.params.id);
  res.json({ ok:true });
});

app.put('/api/admin/products/:pid/sizes/:sid', adminAuth, (req,res) => {
  const { stock, price } = req.body;
  const priceVal = (price !== undefined && price !== '' && price !== null) ? parseFloat(price) : null;
  const exists = db.prepare('SELECT * FROM product_sizes WHERE product_id=? AND size_id=?').get(req.params.pid,req.params.sid);
  if (exists) db.prepare('UPDATE product_sizes SET stock=?, price=? WHERE product_id=? AND size_id=?').run(stock, priceVal, req.params.pid,req.params.sid);
  else db.prepare('INSERT INTO product_sizes (product_id,size_id,stock,price) VALUES (?,?,?,?)').run(req.params.pid,req.params.sid,stock,priceVal);
  res.json({ ok:true });
});

app.get('/api/admin/orders', adminAuth, (req,res) => {
  const { status,q } = req.query;
  let query = 'SELECT * FROM orders';
  const params = [];
  const conds = [];
  if (status) { conds.push('status=?'); params.push(status); }
  if (q) { conds.push('(order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)'); params.push(`%${q}%`,`%${q}%`,`%${q}%`); }
  if (conds.length) query += ' WHERE '+conds.join(' AND ');
  query += ' ORDER BY created_at DESC';
  const orders = db.prepare(query).all(...params);
  orders.forEach(o => { o.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id); });
  res.json(orders);
});

app.put('/api/admin/orders/:id/status', adminAuth, (req,res) => {
  const { status,notes } = req.body;
  db.prepare('UPDATE orders SET status=?,notes=? WHERE id=?').run(status,notes||null,req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (order && ['confirmed','shipped','delivered'].includes(status)) sendStatusUpdateEmail(order,status);
  res.json({ ok:true });
});

app.delete('/api/admin/orders/:id', adminAuth, (req,res) => {
  db.prepare('DELETE FROM order_items WHERE order_id=?').run(req.params.id);
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ ok:true });
});

// ==================== COUPONS ADMIN ====================
app.get('/api/admin/coupons', adminAuth, (req,res) => {
  res.json(db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all());
});
app.post('/api/admin/coupons', adminAuth, (req,res) => {
  const { code, discount_type, discount_value, min_order, max_uses, expires_at } = req.body;
  if (!code || !discount_value) return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  try {
    const id = db.prepare(`INSERT INTO coupons (code,discount_type,discount_value,min_order,max_uses,expires_at) VALUES (?,?,?,?,?,?)`)
      .run(code.toUpperCase().trim(), discount_type||'percent', parseFloat(discount_value), parseFloat(min_order)||0, max_uses||null, expires_at||null).lastInsertRowid;
    res.json({ ok:true, id });
  } catch(e) { res.status(400).json({ error: 'โค้ดนี้มีอยู่แล้ว' }); }
});
app.put('/api/admin/coupons/:id', adminAuth, (req,res) => {
  const { code, discount_type, discount_value, min_order, max_uses, expires_at, is_active } = req.body;
  db.prepare(`UPDATE coupons SET code=?,discount_type=?,discount_value=?,min_order=?,max_uses=?,expires_at=?,is_active=? WHERE id=?`)
    .run(code.toUpperCase().trim(), discount_type, parseFloat(discount_value), parseFloat(min_order)||0, max_uses||null, expires_at||null, is_active??1, req.params.id);
  res.json({ ok:true });
});
app.delete('/api/admin/coupons/:id', adminAuth, (req,res) => {
  db.prepare('DELETE FROM coupons WHERE id=?').run(req.params.id);
  res.json({ ok:true });
});

app.get('/api/admin/stats', adminAuth, (req,res) => {
  res.json({
    total_orders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
    pending_orders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='pending'").get().c,
    paid_orders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='paid'").get().c,
    total_revenue: db.prepare("SELECT COALESCE(SUM(total_amount),0) as s FROM orders WHERE status IN ('paid','confirmed','shipped','delivered')").get().s,
    total_products: db.prepare("SELECT COUNT(*) as c FROM products WHERE is_active=1").get().c,
  });
});

// ==================== EMAIL ====================
function siteUrl() {
  const h = process.env.SITE_URL || `http://localhost:${PORT}`;
  return h.replace(/\/$/, '');
}

async function sendOrderEmail(orderNum,name,email,address,phone,items,subtotal,discountAmount,couponCode) {
  const total = Math.max(0, subtotal - (discountAmount||0));
  const getSetting = (key) => db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value || '';
  const bankName = getSetting('bank_name');
  const bankAccount = getSetting('bank_account');
  const bankAccountName = getSetting('bank_account_name');
  const itemsHtml = items.map(i=>`
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.product_name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.color_name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.size_name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">฿${(i.price*i.quantity).toLocaleString()}</td>
    </tr>`).join('');
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#4FC3F7,#81C784);padding:30px;text-align:center;border-radius:12px 12px 0 0">
      <h1 style="color:white;margin:0">🌟 EasyCart</h1><p style="color:white">ขอบคุณที่สั่งซื้อ!</p>
    </div>
    <div style="padding:30px;background:#fff;border:1px solid #e0e0e0">
      <h2>สวัสดี คุณ${name} 👋</h2>
      <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:20px 0">
        <p><strong>เลขออเดอร์:</strong> <span style="color:#4FC3F7;font-size:1.2em;font-weight:bold">${orderNum}</span></p>
        <p><strong>เบอร์:</strong> ${phone} | <strong>ที่อยู่:</strong> ${address}</p>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f0f9ff">
          <th style="padding:10px;text-align:left">สินค้า</th><th style="padding:10px">สี</th>
          <th style="padding:10px">ไซส์</th><th style="padding:10px">จำนวน</th><th style="padding:10px;text-align:right">ราคา</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          ${discountAmount ? `<tr><td colspan="4" style="padding:8px;text-align:right;color:#666">ยอดสินค้า</td><td style="padding:8px;text-align:right">฿${subtotal.toLocaleString()}</td></tr>
          <tr><td colspan="4" style="padding:8px;text-align:right;color:#16a34a">ส่วนลดคูปอง ${couponCode}</td><td style="padding:8px;text-align:right;color:#16a34a">-฿${discountAmount.toLocaleString()}</td></tr>` : ''}
          <tr><td colspan="4" style="padding:12px;text-align:right;font-weight:bold">ยอดรวมสุทธิ</td>
          <td style="padding:12px;text-align:right;color:#FF7043;font-size:1.2em;font-weight:bold">฿${total.toLocaleString()}</td></tr>
        </tfoot>
      </table>
      <div style="background:#fff8e1;border:2px dashed #FFE066;padding:20px;border-radius:8px;margin:20px 0">
        <h3 style="color:#F57F17;margin-top:0">📲 ขั้นตอนชำระเงิน</h3>
        <p>โอนมาที่: <strong>${bankName} ${bankAccount}</strong> ชื่อ: ${bankAccountName}</p>
        <p>แล้วแจ้งสลิปที่ <a href="${siteUrl()}/payment.html?order=${orderNum}">คลิกที่นี่</a></p>
      </div>
    </div>
  </div>`;
  try { await transporter.sendMail({ from:`"EasyCart" <${process.env.SMTP_USER}>`, to:email, bcc:process.env.STORE_EMAIL, subject:`[EasyCart] ยืนยันคำสั่งซื้อ #${orderNum}`, html }); }
  catch(e){ console.log('Email skip:', e.message); }
}

async function sendPaymentNotifyEmail(order,slipPath) {
  const html = `<div style="font-family:sans-serif"><h2>💰 แจ้งโอนเงินใหม่!</h2>
    <p><strong>ออเดอร์:</strong> ${order.order_number} | <strong>ลูกค้า:</strong> ${order.customer_name} | <strong>ยอด:</strong> ฿${order.total_amount.toLocaleString()}</p>
    ${slipPath?`<img src="${siteUrl()}${slipPath}" style="max-width:300px">`:''}
  </div>`;
  try { await transporter.sendMail({ from:`"EasyCart" <${process.env.SMTP_USER}>`, to:process.env.STORE_EMAIL, subject:`[แจ้งโอน] ออเดอร์ #${order.order_number}`, html }); }
  catch(e){ console.log('Email skip:', e.message); }
}

async function sendStatusUpdateEmail(order,status) {
  const labels = { confirmed:'ยืนยันชำระเงิน', shipped:'จัดส่งแล้ว', delivered:'รับสินค้าแล้ว' };
  const html = `<div style="font-family:sans-serif;max-width:500px">
    <div style="background:linear-gradient(135deg,#4FC3F7,#81C784);padding:20px;border-radius:8px;text-align:center">
      <h2 style="color:white">อัปเดตออเดอร์ #${order.order_number}</h2></div>
    <div style="padding:20px"><p>สวัสดี คุณ${order.customer_name}</p>
      <p>สถานะ: <strong style="color:#4CAF50">${labels[status]||status}</strong></p>
      <a href="${siteUrl()}/track.html?q=${order.order_number}">ติดตามออเดอร์</a></div>
  </div>`;
  try { await transporter.sendMail({ from:`"EasyCart" <${process.env.SMTP_USER}>`, to:order.customer_email, subject:`[EasyCart] ออเดอร์ #${order.order_number} - ${labels[status]||status}`, html }); }
  catch(e){ console.log('Email skip:', e.message); }
}

app.listen(PORT, () => {
  console.log(`🌟 EasyCart is running!`);
  console.log(`   Store: http://localhost:${PORT}`);
  console.log(`   Admin: http://localhost:${PORT}/admin`);
  console.log(`   Password: ${process.env.ADMIN_PASS}`);
});
