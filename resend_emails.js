require('dotenv').config({ path: '/opt/easycart/.env' });
const { DatabaseSync } = require('node:sqlite');
const nodemailer = require('nodemailer');

const db = new DatabaseSync('/opt/easycart/easycart.db');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||587),
  secure: false, auth:{ user:process.env.SMTP_USER, pass:process.env.SMTP_PASS }
});

const SITE = (process.env.SITE_URL||'').replace(/\/$/,'');

// Comma-separated emails to resend to (e.g. RESEND_TARGETS="a@example.com,b@example.com")
const TARGET_EMAILS = (process.env.RESEND_TARGETS || 'customer@example.com')
  .split(',').map(s => s.trim()).filter(Boolean);

const orders = db.prepare('SELECT * FROM orders ORDER BY id ASC').all();

async function sendEmail(o, items) {
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
      <h2>สวัสดี คุณ${o.customer_name} 👋</h2>
      <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:20px 0">
        <p><strong>เลขออเดอร์:</strong> <span style="color:#4FC3F7;font-size:1.2em;font-weight:bold">${o.order_number}</span></p>
        <p><strong>เบอร์:</strong> ${o.customer_phone} | <strong>ที่อยู่:</strong> ${o.customer_address}</p>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f0f9ff">
          <th style="padding:10px;text-align:left">สินค้า</th><th style="padding:10px">สี</th>
          <th style="padding:10px">ไซส์</th><th style="padding:10px">จำนวน</th><th style="padding:10px;text-align:right">ราคา</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot><tr><td colspan="4" style="padding:12px;text-align:right;font-weight:bold">ยอดรวม</td>
          <td style="padding:12px;text-align:right;color:#FF7043;font-size:1.2em;font-weight:bold">฿${o.total_amount.toLocaleString()}</td></tr></tfoot>
      </table>
      <div style="background:#fff8e1;border:2px dashed #FFE066;padding:20px;border-radius:8px;margin:20px 0">
        <h3 style="color:#F57F17;margin-top:0">📲 ขั้นตอนชำระเงิน</h3>
        <p>โอนมาที่: <strong>ธนาคารกสิกรไทย XXX-X-XXXXX-X</strong> ชื่อ: EasyCart Store</p>
        <p>แล้วแจ้งสลิปที่ <a href="${SITE}/payment.html?order=${o.order_number}">คลิกที่นี่</a></p>
      </div>
      <div style="text-align:center;margin-top:20px">
        <a href="${SITE}/track.html?q=${o.order_number}" style="background:#4FC3F7;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">🔍 ติดตามออเดอร์</a>
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: `"EasyCart" <${process.env.SMTP_USER}>`,
    to: o.customer_email,
    subject: `[EasyCart] ยืนยันคำสั่งซื้อ #${o.order_number}`,
    html
  });
}

(async () => {
  const targets = orders.filter(o => TARGET_EMAILS.includes(o.customer_email));
  console.log(`Resending to ${targets.length} orders...`);
  for (const o of targets) {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id);
    try {
      await sendEmail(o, items);
      console.log(`✅ Sent: ${o.order_number} → ${o.customer_email}`);
    } catch(e) {
      console.log(`❌ Failed: ${o.order_number} — ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('Done.');
  process.exit(0);
})();
