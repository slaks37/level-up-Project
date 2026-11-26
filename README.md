# LEVEL UP SYSTEM // Studio OS v3.3 (PWA + Firebase + Admin Shared AI)

> [Level Up PWA](https://levelup.sociopreneur.online/)
>
> [Admin Control Center](https://go-levelup.sociopreneur.online/)

Aplikasi web progresif (**PWA**) lintas perangkat untuk **HP (Android / iPhone)** dan **Laptop (macOS / Windows / Linux)** yang menggabungkan pelacak karier, belajar, dan kebugaran berbasis jurnal ilmiah dengan:

- **Sistem Login Lengkap (Email + Password, Daftar, Reset Password & Google Sign-In)** melalui Firebase Authentication.
- **Admin Control Center**:
  - Atur **Shared Agnes AI API Key** agar semua user bisa memakai AI secara aman tanpa harus mengisi API key sendiri (API key tersimpan **100% di sisi server**, tidak pernah terekspos ke browser user).
  - Atur **kuota harian AI per user**, model default (`agnes-2.5-flash` / `agnes-3.0-flash` / `agnes-2.5-pro-beta`), pesan pengumuman, dan tombol aktif/nonaktif global.
  - **Manajemen User**: lihat daftar user terdaftar, pantau pemakaian AI, reset kuota harian, suspend/aktifkan akun, dan angkat/cabut admin.
  - **AI Usage Audit Logs**: pantau riwayat pemanggilan AI secara real-time.
- **Tampilan Adaptif HP & Laptop (PWA Offline)**: Grid 12-kolom Blender Studio di desktop dan **Bottom Navigation Bar** 5 tab di HP, bisa di-install ke Home Screen.
- **Jurnal harian** dengan check-in pagi, siang, dan malam berdasarkan waktu di perangkat. Catatan tidur, makan, energi, dan tugas yang selesai membantu membentuk rekap dan refleksi harian.
- **Skill dan upgrade diri** dengan detail sesi, riwayat aktivitas, dan rekomendasi yang mengikuti progres peta impian.
- **Berita promo harian** dari halaman publik Indomaret dan feed Alfagift dengan tanggal dan tautan sumber.

Catatan jurnal akun tersinkron melalui Firebase Firestore. Catatan tamu dan foto profil tersimpan di perangkat. Foto yang sudah dibuat pada versi sebelumnya dapat dipakai di panel energi. Status energi merupakan gambaran dari catatan pemain untuk refleksi harian. Foto makanan dan agenda .ics tersimpan di perangkat. Kelompok makanan berasal dari pilihan pemain saat mencatat makan.

GitHub Actions menjalankan pengambilan berita setiap hari sekitar 07.23 WIB dan menerbitkan hasilnya ke branch `promo-news`. Untuk memeriksa hasil sumber secara lokal, jalankan `python3 scripts/refresh-promo-news.py /tmp/levelup-promo-news.json`.

Profil kerja memuat industri, tanggung jawab, dan proyek aktif. Panel Tugas memadukan cek sprint atau progres, tindak lanjut rapat, impor agenda Kalender Google, dan rencana latihan yang menyesuaikan tidur, makan, dan catatan capek atau nyeri. Langkah kecil Peta Impian dapat dijadikan tugas dan tersimpan saat selesai.

Admin menambahkan alamat terverifikasi melalui panel Email dengan Akses Admin. Pemain baru membuat akun melalui situs publik. Proxy Agnes produksi di folder `proxy/` menggunakan identitas Firebase dengan akses terbatas ke konfigurasi Agnes dan kuota. Atur `VITE_AI_PROXY_URL` ke alias produksi proxy pada build Hosting.

Izin Google Calendar langsung menggunakan `calendar.events.owned.readonly`. Kedua domain harus menjadi JavaScript origin pada OAuth Web Client. Aktifkan `VITE_CALENDAR_OAUTH_ENABLED` setelah scope ini mendapatkan verifikasi Google. Impor .ics tersedia saat peninjauan berlangsung.

## Struktur Project

```text
├── src/                  # Frontend PWA (React + TypeScript + Tailwind)
├── server/               # Secure Express AI Proxy Server (Node 22 + TypeScript)
├── functions/            # Firebase Cloud Functions v2 Proxy (siap deploy Blaze)
├── firestore.rules       # Strict per-user + Admin RBAC Security Rules
├── firestore.indexes.json# Firestore composite indexes
├── firebase.json         # Firebase Firestore & Hosting config
├── render.yaml           # 1-click deploy blueprint Express Proxy ke Render (Gratis)
└── .env.example          # Template environment frontend
```

---

## 1. Environment Setup

1. **Frontend (`.env.local`)** — salin dari `.env.example`:
   - `VITE_FIREBASE_*`: kredensial Firebase Web App
   - `VITE_ADMIN_EMAIL`: email Super Admin kamu
   - `VITE_AI_PROXY_URL`: kosongkan saat dev lokal (Vite proxy otomatis ke `localhost:8787`), atau isi URL server proxy produksi (misal dari Render / Cloud Run / Firebase Functions).
2. **Express Proxy Server (`server/.env.local`)** — salin dari `server/.env.example`:
   - `PORT=8787`
   - `ADMIN_EMAIL`: email Super Admin kamu
   - `FIREBASE_PROJECT_ID=level-up-os-sl26`
   - `FIREBASE_WEB_API_KEY`: API key Firebase Web App (verifikasi ID token langsung)
   - `AGNES_AI_API_KEY`: API Key Agnes AI (opsional — bisa juga diisi langsung lewat halaman `/admin`!)
   - `FIREBASE_SERVICE_ACCOUNT_JSON` / `GOOGLE_APPLICATION_CREDENTIALS` (opsional — mengaktifkan full Firebase Admin SDK untuk menyimpan audit log & kuota lintas-server di Firestore).

---

## 2. Menjalankan Full-Stack di Laptop & HP (Lokal)

```bash
npm install
npm --prefix server install
npm run dev:full
```

- **Frontend Laptop:** http://localhost:5173
- **Admin Page:** http://localhost:5173/admin
- **Secure AI Proxy Server:** http://localhost:8787/api/health

---

## 3. Deploy ke Produksi

### A. Deploy Firestore Rules, Indexes & PWA Hosting
```bash
npm run build
npx -y firebase-tools@latest deploy --only firestore,hosting
```

Hubungkan `levelup.sociopreneur.online` dan `go-levelup.sociopreneur.online` ke situs Firebase Hosting `level-up-os-sl26`. Tambahkan kedua hostname ke daftar Authorized Domains di Firebase Authentication. Sesi login dan data offline tersimpan per domain browser.

Rute `/admin` tetap tersedia di lingkungan lokal dan di `level-up-os-sl26.web.app`. Pada domain publik `levelup.sociopreneur.online`, rute ini mengarahkan pengunjung ke domain admin.

### B. Deploy Secure Shared AI Proxy Server (Pilih Salah Satu)
- **Opsi 1 — Gratis di Render (tanpa kartu kredit):**
  Hubungkan repository GitHub ini di [Render](https://render.com) menggunakan blueprint `render.yaml`, isi `FIREBASE_WEB_API_KEY` & `AGNES_AI_API_KEY` di environment Render, lalu masukkan URL Render-nya di `VITE_AI_PROXY_URL` (atau langsung dari `/admin`).
- **Opsi 2 — Firebase Cloud Functions v2 (Blaze Plan):**
  ```bash
  npm --prefix functions install
  npm --prefix functions run build
  npx -y firebase-tools@latest deploy --only functions
  ```
