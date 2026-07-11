# EasyCart

ร้านค้าออนไลน์ขายเสื้อยืด (T‑Shirt Store) — Node.js/Express + SQLite พร้อมระบบหลังบ้าน (Admin) จัดการสินค้า สี ไซซ์ ออเดอร์ คูปอง แบนเนอร์ และธีมของหน้าร้าน

> เว็บจริง: https://easycart.nexterz.com

---

## ✨ ฟีเจอร์

**หน้าร้าน (ลูกค้า)**
- หน้าแรกพร้อมแบนเนอร์/ป็อปอัป และรายการสินค้า
- หน้าสินค้า: เลือกสี ไซซ์ ดูแกลเลอรีรูปและตารางไซซ์
- ตะกร้าสินค้า + ใช้คูปองส่วนลด
- สั่งซื้อ (checkout) และอัปโหลดสลิปโอนเงิน
- ติดตามสถานะออเดอร์ (track) ด้วยเลขออเดอร์
- แจ้งเตือนทางอีเมลอัตโนมัติ (SMTP)
- รองรับธีมสว่าง/มืด

**หลังบ้าน (Admin)** — ที่ `/admin`
- จัดการสินค้า สี ไซซ์ และสต็อกแยกตามสี×ไซซ์
- แกลเลอรีรูปสินค้า, รูปปก, ตารางไซซ์, โลโก้, ป็อปอัป
- จัดการออเดอร์ + อัปเดตสถานะ
- คูปองส่วนลด และแบนเนอร์หน้าแรก
- ตั้งค่าธีม/หน้าร้าน และเปลี่ยนรหัสผ่านแอดมิน
- แดชบอร์ดสถิติ

---

## 🧱 เทคโนโลยี

| ส่วน | ใช้ |
|------|-----|
| Backend | Node.js + [Express](https://expressjs.com/) 4 |
| Database | SQLite ผ่าน `node:sqlite` (built‑in ของ Node.js) |
| อัปโหลดไฟล์ | [Multer](https://github.com/expressjs/multer) |
| อีเมล | [Nodemailer](https://nodemailer.com/) (SMTP) |
| Config | [dotenv](https://github.com/motdotla/dotenv) |
| Frontend | HTML/CSS/JavaScript (vanilla, ไม่มี build step) |

> ⚠️ **ต้องใช้ Node.js เวอร์ชัน 22 ขึ้นไป** เพราะแอปใช้โมดูล `node:sqlite` ที่มากับ Node เอง (ไม่ต้องติดตั้ง native module เพิ่ม)

---

## 🚀 เริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies
```bash
npm install
```

### 2. ตั้งค่า environment
คัดลอกไฟล์ตัวอย่างแล้วกรอกค่าจริง:
```bash
cp .env.example .env
```

แก้ไฟล์ `.env`:
```env
PORT=4829                                # พอร์ตที่แอปรัน
ADMIN_PASS=change_me                      # รหัสผ่านเข้าหลังบ้าน
SITE_URL=https://your-domain.example.com  # URL ของเว็บ (ใช้ในอีเมล/ลิงก์)
SMTP_HOST=smtp.example.com                # เซิร์ฟเวอร์ส่งอีเมล
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=change_me
STORE_EMAIL=you@example.com               # อีเมลร้าน (ผู้รับแจ้งเตือนออเดอร์)
```

### 3. รันแอป
```bash
npm start        # โปรดักชัน
npm run dev      # โหมด dev (ต้องมี nodemon)
```

แอปจะสร้างไฟล์ฐานข้อมูล `easycart.db` และตารางทั้งหมดให้อัตโนมัติเมื่อรันครั้งแรก

### 4. เปิดใช้งาน
- หน้าร้าน: <http://localhost:4829>
- หลังบ้าน: <http://localhost:4829/admin> (ล็อกอินด้วย `ADMIN_PASS`)

---

## 📁 โครงสร้างโปรเจกต์

```
EasyCart/
├── server.js            # แอปหลัก + API + สร้างตาราง DB
├── resend_emails.js     # สคริปต์ส่งอีเมลซ้ำ (utility)
├── package.json
├── .env.example         # เทมเพลตค่า config
├── admin/               # หน้าเว็บหลังบ้าน (static HTML/CSS/JS)
│   ├── index.html  dashboard.html  products.html
│   ├── orders.html  coupons.html  banners.html
│   ├── sizes.html  settings.html
│   └── admin.css  admin.js
├── public/              # หน้าร้าน (static)
│   ├── index.html  product.html  checkout.html
│   ├── payment.html  track.html  success.html
│   ├── css/  js/  images/
│   └── uploads/
└── uploads/             # ไฟล์ที่ผู้ใช้/แอดมินอัปโหลด (รูปสินค้า, สลิป ฯลฯ)
    ├── products/  gallery/  banners/  popup/
    ├── logo/  sizechart/  slips/  payments/
```

---

## 🔌 API โดยสังเขป

**สาธารณะ**
| Method | Endpoint | หน้าที่ |
|--------|----------|--------|
| GET | `/api/products` | รายการสินค้า |
| GET | `/api/products/:id` | รายละเอียดสินค้า |
| POST | `/api/coupon/validate` | ตรวจสอบคูปอง |
| POST | `/api/orders` | สร้างออเดอร์ |
| POST | `/api/orders/:orderNumber/payment` | อัปโหลดสลิปชำระเงิน |
| GET | `/api/track` | ติดตามออเดอร์ |
| GET | `/api/banners` · `/api/theme` | แบนเนอร์ / ธีมหน้าร้าน |

**หลังบ้าน** (ต้องส่ง header `x-admin-key: <ADMIN_PASS>`)
- `/api/admin/products`, `/api/admin/colors`, `/api/admin/sizes` — จัดการสินค้า/สี/ไซซ์ (CRUD)
- `/api/admin/orders`, `/api/admin/coupons`, `/api/admin/banners` — ออเดอร์/คูปอง/แบนเนอร์
- `/api/admin/upload-logo`, `/upload-sizechart`, `/upload-popup` — อัปโหลดรูป
- `/api/admin/theme`, `/api/admin/change-password`, `/api/admin/stats`

---

## 🔒 หมายเหตุด้านความปลอดภัย

- ไฟล์ `.env`, ฐานข้อมูล (`*.db`), และรูปใน `uploads/` **ไม่ถูก commit** ขึ้น git (ดู `.gitignore`)
- การยืนยันตัวตนหลังบ้านใช้รหัสผ่านเดียว (`ADMIN_PASS`) ผ่าน header — ควรตั้งรหัสที่คาดเดายากและรันผ่าน HTTPS เสมอ
- อย่าใส่ค่าลับจริงลงในไฟล์ที่ commit — ใช้ `.env` เท่านั้น

---

## 🌐 Deployment

โปรดักชันรันเป็น Node.js process (พอร์ต `4829`) โดยมี Nginx เป็น reverse proxy:

```nginx
server {
    listen 80;
    server_name easycart.nexterz.com;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:4829;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

แนะนำให้รัน process ด้วย `pm2` หรือ `systemd` เพื่อให้ทำงานต่อเนื่องและ restart อัตโนมัติ

### Deploy บน Plesk (Node.js / Passenger)

จะรันบน Plesk มี 2 ขั้นใหญ่ — **เอาโค้ดขึ้น (Git)** แล้ว **ตั้งค่า Node.js**

> ⚠️ **ต้องใช้ Node.js เวอร์ชัน 22.5 ขึ้นไป** เพราะแอปใช้โมดูล built-in `node:sqlite` (แนะนำสาย LTS เช่น `22.x`)

#### 1. เอาโค้ดขึ้นด้วย Git

หน้า Plesk → tab **Get Started** → กด **Deploy using Git**

- **Repository URL:** `https://github.com/nexterz-th/EasyCart.git`
- **Branch:** `main`
- repo เป็น Public → ดึงได้เลย ไม่ต้องใส่ token
- กด **OK** → Plesk จะ clone โค้ดมาไว้ที่ `httpdocs` (หรือโฟลเดอร์ที่เลือก)

> ตั้ง **Auto-deploy** ไว้ด้วยก็ได้ — พอ push ขึ้น GitHub Plesk จะดึงโค้ดใหม่ให้อัตโนมัติ

#### 2. ตั้งค่า Node.js

หน้า Plesk → กด **Node.js** แล้วตั้ง:

| ช่อง | ค่า |
|---|---|
| **Node.js version** | `22.x` (LTS) |
| **Application Mode** | `production` |
| **Application Root** | โฟลเดอร์ที่ clone โค้ดมา (ที่มี `package.json`) |
| **Application Startup File** | `server.js` |
| **Application URL** | `https://easycart.nexterz.com` |

#### 3. ติดตั้ง dependencies

กดปุ่ม **NPM install** (Plesk จะรัน `npm install` ให้ ติดตั้ง express, multer, nodemailer ฯลฯ)

#### 4. ใส่ Environment Variables

ในหน้า Node.js เดียวกัน → **Custom environment variables** → เพิ่ม (แทน `.env` ที่ไม่ถูก commit):

```
ADMIN_PASS   = รหัสแอดมินที่ตั้งเอง (คาดเดายาก)
SITE_URL     = https://easycart.nexterz.com
SMTP_HOST    = (โฮสต์เมลของคุณ)
SMTP_PORT    = 587
SMTP_USER    = (อีเมลที่ใช้ส่ง)
SMTP_PASS    = (รหัสเมล)
STORE_EMAIL  = (อีเมลรับแจ้งออเดอร์)
```

> ⚠️ **ห้ามใส่ `PORT`** — Passenger กำหนดให้อัตโนมัติผ่าน `process.env.PORT` ถ้าใส่จะรันไม่ขึ้น

#### 5. Restart

กด **Restart App** → เปิด `https://easycart.nexterz.com`

- หน้าร้าน: `/`
- หลังบ้าน: `/admin` (ล็อกอินด้วย `ADMIN_PASS`)
- DB `easycart.db` + ตารางทั้งหมด จะถูกสร้างอัตโนมัติครั้งแรกที่รัน

#### แก้ปัญหาที่พบบ่อย

ถ้าเปิดแล้วเจอ **503 / Application failed** ให้ดู log ที่หน้า Node.js:

- เลือก Node version ต่ำกว่า 22.5 → `Cannot find module 'node:sqlite'` → เปลี่ยนเป็น `22.x`
- ขึ้นเรื่อง `--experimental-sqlite` → เพิ่ม env `NODE_OPTIONS = --experimental-sqlite`
- ล็อกอินแอดมินไม่ได้ → เช็คว่า `ADMIN_PASS` ตั้งถูก (ไม่มีเว้นวรรค/เครื่องหมายคำพูดครอบ) และ **กด Restart App หลังแก้ env ทุกครั้ง**
