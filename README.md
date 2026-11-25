# LEVEL UP SYSTEM // Studio OS v3.3 (PWA + Firebase + Agnes AI)

> **Live App (HP & Laptop PWA):** https://level-up-os-sl26.web.app

Aplikasi web progresif (**PWA**) lintas perangkat untuk **HP (Android / iPhone)** dan **Laptop (macOS / Windows / Linux)** yang menggabungkan pelacak karier, belajar, dan kebugaran berbasis jurnal ilmiah dengan:

- **Tampilan Adaptif HP & Laptop**: Grid 12-kolom ala Blender Studio di desktop dan **Bottom Navigation Bar** ergonomis 5 tab di HP, siap di-install ke Home Screen dan bekerja offline.
- **5 Kemampuan Anti-Bias & Kalibrasi Ilmiah**: Mifflin-St Jeor (BMR), Morton et al. (2018) target protein `1.6g/kg`, Lamon et al. (2021) pengali tidur, Schoenfeld et al. (2017) beban latihan fisik, dan Ericsson et al. (1993) deliberate practice.
- **3D Aether Core Viewport (Three.js)**: Drag-to-orbit lancar di mouse maupun sentuhan HP, mode shading `HYBRID / WIRE / SOLID`, dan bonus Overdrive saat 4/4 node terisi.
- **Agnes AI (OpenAI Standard API)**: AI Coach Peta Impian, Tugas Harian AI tersinkronisasi, dan Pencari Diskon Sekitar, Klaim Gratis & Peluang Karier (default endpoint `https://apihub.agnes-ai.com/v1`).
- **Cloud Sync Real-Time (Firebase Auth + Cloud Firestore)**: Login Google / Email agar progres tersinkronisasi otomatis antar HP dan Laptop, lengkap dengan offline persistence dan Firestore Security Rules privat per user.

---

## 1. Menjalankan di Laptop & HP (Lokal)

```bash
npm install
npm run dev
```

- Buka di **Laptop**: `http://localhost:5173`
- Buka di **HP (Wi-Fi yang sama)**: gunakan URL `Network` yang tampil di terminal Vite (misal `http://192.168.x.x:5173`).

---

## 2. Menghubungkan Agnes AI API Key

Ada dua cara (pilih yang paling nyaman):

1. **Langsung di Aplikasi (Disarankan)**:
   - Klik tombol **PENGATURAN** di header → tab **Agnes AI**.
   - Base URL default: `https://apihub.agnes-ai.com/v1`
   - Pilih model (contoh: `agnes-2.5-flash`, `agnes-3.0-flash`, atau `agnes-2.5-pro-beta`).
   - Masukkan **Agnes AI API Key**, klik **TES KONEKSI AI**, lalu **SIMPAN KONFIGURASI**.
   - API Key disimpan hanya di perangkat lokal (tidak pernah dikirim ke Firestore).
2. **Via `.env.local`**:
   - Salin `.env.example` menjadi `.env.local` dan isi `VITE_AI_API_KEY`.

---

## 3. Mengaktifkan Cloud Sync HP ↔ Laptop (Firebase)

1. Buat project di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Authentication** → Sign-in method: **Google** dan **Email/Password**.
   - Di **Authentication → Settings → Authorized domains**, pastikan `localhost` dan domain hosting kamu terdaftar.
3. Aktifkan **Cloud Firestore** (mode produksi).
4. Salin konfigurasi Web App (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`):
   - Bisa ditempel langsung di **PENGATURAN → Cloud Sync → Setup Firebase Config**, **ATAU** diisi di file `.env.local`.
5. Deploy Security Rules dan Hosting agar bisa di-install sebagai PWA HTTPS di HP & Laptop:

```bash
npm run build
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use --add
npx -y firebase-tools@latest deploy --only firestore:rules,hosting
```

Setelah deploy ke `https://<project-id>.web.app`:
- **Android (Chrome)**: buka link → tap menu `⋮` → **Install app / Tambahkan ke layar utama**.
- **iPhone (Safari)**: buka link → tap tombol **Share** → **Tambahkan ke Layar Utama (Add to Home Screen)**.
- **Laptop (Chrome/Edge)**: klik tombol **INSTALL APP** di header atau ikon Install di address bar.
