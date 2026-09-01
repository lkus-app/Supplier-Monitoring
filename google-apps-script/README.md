# 📊 Panduan Setup Database Google Sheets & Google Apps Script API
### Sistem Informasi Manajemen Monitoring Bongkar Muat (SIM-BONGKAR)

Panduan ini menjelaskan cara mengonfigurasi Google Sheets sebagai database cloud terpusat sehingga data sinkron secara real-time antara **PC**, **Laptop**, **Tablet**, dan **Handphone (HP)**.

---

## 🚀 Langkah 1: Buat Google Spreadsheet Baru

1. Buka [Google Sheets](https://sheets.new) di browser Anda.
2. Beri nama spreadsheet, contoh: **`SIM BONGKAR WH DATABASE`**.
3. Pastikan tab sheet pertama bernama **`DataBongkar`** (atau biarkan default, script akan membuatnya otomatis).

---

## 📜 Langkah 2: Pasang Kode Google Apps Script

1. Di menu Google Spreadsheet, klik **Extensions** (Ekstensi) > **Apps Script**.
2. Hapus semua kode default di editor `Code.gs`.
3. Salin seluruh isi file **`google-apps-script/Code.gs`** dari proyek ini dan tempelkan ke editor Apps Script.
4. Klik tombol **Save (Simpan / Ikon Disket)** atau tekan `Ctrl + S`.
5. Beri nama proyek Apps Script: **`SIM-BONGKAR-API`**.

---

## 🌐 Langkah 3: Deploy sebagai Web App (PENTING!)

Agar aplikasi frontend (PC & HP) bisa mengakses Google Sheets tanpa perlu login akun Google di tiap HP driver/operator:

1. Di pojok kanan atas Apps Script, klik tombol **Deploy** (Terapkan) > **New deployment** (Penerapan baru).
2. Klik ikon gerigi ⚙️ di samping *Select type*, pilih **Web app**.
3. Isi konfigurasi sebagai berikut:
   - **Description**: `SIM BONGKAR API v1.0`
   - **Execute as (Jalankan sebagai)**: **`Me (email anda)`** *(PENTING: Agar script berjalan dengan izin akun pembuat sheet)*
   - **Who has access (Siapa yang memiliki akses)**: **`Anyone`** (Siapa saja) *(PENTING: Agar HP & PC dapat melakukan request tanpa hambatan OAuth login)*
4. Klik **Deploy**.
5. Jika diminta otorisasi:
   - Klik **Authorize access**.
   - Pilih akun Google Anda.
   - Klik **Advanced** (Lanjutan) > Klik **Go to SIM-BONGKAR-API (unsafe)**.
   - Klik **Allow** (Izinkan).
6. Salin **Web App URL** yang diberikan (akhiran `/exec`).
   - Format URL contoh:
     `https://script.google.com/macros/s/AKfycbxAJYZpcwSCPiXIv4krL73OzYGXfRHaK-gpgV8EPP58hSDw82YeOdTbgUpRSp3ynjIf3Q/exec`

---

## 🔗 Langkah 4: Hubungkan ke Aplikasi Frontend

URL Web App Anda sudah dikonfigurasi di file:
1. `.env.example` / `.env` :
   ```env
   VITE_GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbxAJYZpcwSCPiXIv4krL73OzYGXfRHaK-gpgV8EPP58hSDw82YeOdTbgUpRSp3ynjIf3Q/exec"
   GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbxAJYZpcwSCPiXIv4krL73OzYGXfRHaK-gpgV8EPP58hSDw82YeOdTbgUpRSp3ynjIf3Q/exec"
   ```
2. Frontend secara otomatis menggunakan opsi `{ redirect: 'follow' }` dan fallback backend Express yang tangguh.

---

## 🔄 Alur Kerja Sinkronisasi Data Real-Time

1. **Ketika Truk Masuk (Security Gate-In)**:
   - Frontend mengirim request `POST` dengan `action: "upsertItem"` ke Google Apps Script Web App.
   - Baris baru langsung tercatat di Google Sheet.
2. **Admin Gudang & Operator**:
   - Polling otomatis berjalan setiap 3 detik via `/api/records` & Google Apps Script.
   - Saat status PO diverifikasi atau bongkar selesai, perubahan langsung diperbarui di baris spreadsheet terkait.
3. **Supervisor Reset / Clear Data**:
   - Tombol **Reset Data** di tab Supervisor mengirim `action: "clearAll"` yang membersihkan antrean di Google Sheet seketika untuk semua perangkat.
