// Vercel Serverless Function entry point.
//
// Membungkus aplikasi Express yang sama (createApp) tanpa memanggil listen().
// Vercel akan meneruskan setiap request ke handler ini. Karena rewrite di
// vercel.json memetakan "/api/(.*)" -> "/api", path asli (mis. /api/health)
// tetap utuh saat sampai ke Express, sehingga router '/api/...' cocok.
import { createApp } from '../backend/src/app.js';

const app = createApp();

export default function handler(req, res) {
  return app(req, res);
}
