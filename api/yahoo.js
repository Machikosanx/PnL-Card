// Vercel Serverless Function: พร็อกซีดึงราคา/กราฟจาก Yahoo Finance ให้หน้าเว็บเรียกแบบ same-origin (เลี่ยง CORS)
// วางไฟล์นี้ที่ api/yahoo.js ข้างๆ index.html ในโปรเจกต์ Vercel แล้ว deploy ใหม่
// เรียกใช้: /api/yahoo?symbol=NQ%3DF&interval=5m&range=5d
module.exports = async (req, res) => {
  const { symbol = '', interval = '1m', range = '1d' } = req.query || {};
  // จำกัดให้ยิงได้เฉพาะ endpoint กราฟของ Yahoo ด้วยค่าที่ตรวจแล้ว กันถูกใช้เป็น open proxy
  if (!/^[A-Za-z0-9=^.\-]{1,20}$/.test(symbol) || !/^(1m|2m|5m|15m|30m|1h|1d)$/.test(interval) || !/^(1d|5d|1mo|3mo)$/.test(range)) {
    return res.status(400).json({ error: 'bad params' });
  }
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PnLCardStudio)', Accept: 'application/json' } });
    const body = await r.text();
    // แคชที่ edge ของ Vercel: ผู้ใช้หลายคนที่ขอสัญลักษณ์เดียวกันจะแชร์ผลเดียวกัน ลดการยิง Yahoo และจำนวนครั้งที่ฟังก์ชันทำงาน
    res.setHeader('Cache-Control', r.ok ? `s-maxage=${interval === '1m' ? 4 : 20}, stale-while-revalidate=30` : 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(r.status).send(body);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'upstream failed' });
  }
};
