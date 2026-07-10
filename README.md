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

> ⚠️ **ต้องใช้ Node.js เวอร์ชัน 22.5 ขึ้นไป** เพราะแอปใช้โมดูล built-in `node:sqlite` (แนะนำสาย LTS เช่น `22.x`)

1. เอาโค้ดขึ้น server ผ่าน **Deploy using Git** หรือ **Upload Files**
2. เปิดหน้า **Node.js** แล้วตั้งค่า:
   - **Node.js version**: `22.x` ขึ้นไป
   - **Application Root**: โฟลเดอร์โปรเจกต์
   - **Application Startup File**: `server.js`
3. กด **NPM install** เพื่อติดตั้ง dependencies
4. เพิ่ม **Custom Environment Variables** (แทนไฟล์ `.env` ที่ไม่ถูก commit):
   `ADMIN_PASS`, `SITE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `STORE_EMAIL`
   — **ไม่ต้อง**ตั้ง `PORT` เพราะ Passenger กำหนดให้อัตโนมัติผ่าน `process.env.PORT`
5. กด **Restart App**

> หากพบ error เกี่ยวกับ `--experimental-sqlite` ให้เพิ่ม environment variable `NODE_OPTIONS=--experimental-sqlite`
