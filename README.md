# 💰 Finance Pulse — Pemantauan Kewangan Pintar

Aplikasi web pemantauan kewangan peribadi yang dibina menggunakan HTML, CSS, dan JavaScript tulen, berdasarkan data penyata akaun simulasi **ABC Bank**.

## ✨ Ciri-ciri

- 📊 **Dashboard** — Gambaran baki, pendapatan, perbelanjaan & aliran tunai dengan carta Chart.js
- 💳 **Senarai Transaksi** — Cari, tapis, tambah & padam transaksi dengan mudah (dengan modal pengesahan tersuai)
- 🎯 **Matlamat Simpanan** — Jejaki kemajuan simpanan ke arah matlamat kewangan
- 📅 **Bil & Komitmen** — Jadualkan dan pantau bil bulanan berulang
- ⚙️ **Tetapan Firebase** — Sambungkan ke Firebase Firestore untuk sandaran awan

## 🚀 Cara Jalankan

```bash
# Clone repositori
git clone https://github.com/julkifli/finance-pulse.git
cd finance-pulse

# Jalankan pelayan tempatan
./start-server.sh
```

Buka pelayar dan pergi ke: **http://localhost:3000**

## 🔧 Stack Teknologi

| Teknologi | Tujuan |
|-----------|--------|
| HTML5 | Struktur aplikasi |
| CSS3 (Vanilla) | Dark glassmorphism UI |
| JavaScript (ES6+) | Logik aplikasi SPA |
| Chart.js | Visualisasi carta |
| Firebase Firestore | Sandaran database awan (pilihan) |
| LocalStorage | Simpanan data tempatan (lalai) |

## 📂 Struktur Fail

```
finance-pulse/
├── index.html        # Antara muka utama SPA
├── styles.css        # Semua stail dark glassmorphism
├── app.js            # Logik SPA, kawalan tab, CRUD
├── data.js           # Data permulaan (penyata simulasi)
├── firebase-db.js    # Penyambung Firebase Firestore
├── server.js         # Pelayan Node.js (opsyen)
├── start-server.sh   # Skrip permulaan pelayan Python
└── README.md         # Dokumentasi projek
```

## 🔥 Sambung Firebase (Pilihan)

1. Buka konsol Firebase dan cipta projek baru
2. Dapatkan konfigurasi web Firebase
3. Buka tab **Tetapan** dalam aplikasi
4. Masukkan API Key & Project ID, klik **Simpan & Sambung Firebase**

---

Dibina oleh [@julkifli](https://github.com/julkifli)
