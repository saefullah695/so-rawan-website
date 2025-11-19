# Website Rekap SO Rawan Hilang

Website untuk input data Stock Opname (SO) barang rawan hilang yang terintegrasi dengan Google Spreadsheet dan WhatsApp Bot.

## Fitur

- Input data SO Rawan Hilang
- Pilih kasir dari daftar absensi
- Pilih item dari daftar barang
- Input OH (On Hand) dan Fisik oleh user
- Perhitungan selisih otomatis
- Riwayat input harian
- Sinkronisasi data dengan WhatsApp Bot
- **UPSERT Mechanism** - Update data jika sudah ada, Insert jika baru
- **Duplicate Prevention** - Menggunakan ID yang sama dengan bot WhatsApp
- Tampilan modern dan responsif

## Setup

### 1. Google Spreadsheet

Buat spreadsheet dengan worksheet berikut:

1. **List_so** - Daftar barang rawan hilang
   - Kolom A: PLU
   - Kolom B: Nama Barang

2. **Absensi** - Daftar kasir
   - Kolom A: NIK
   - Kolom B: Nama
   - Kolom C: Jabatan
   - Kolom D: Tanggal
   - Kolom E: Shift
   - Kolom F: No Handphone

3. **SoRawan** - Penyimpanan data input (SAMA DENGAN BOT WHATSAPP)
   - Kolom A: ID (hash unik)
   - Kolom B: Timestamp
   - Kolom C: Nama Kasir
   - Kolom D: Tanggal Rekap
   - Kolom E: Shift
   - Kolom F: PLU
   - Kolom G: Nama Barang
   - Kolom H: OH
   - Kolom I: Fisik
   - Kolom J: Selisih
   - Kolom K: Pengirim

### 2. Google Sheets API

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang sudah ada
3. Aktifkan Google Sheets API
4. Buat API Key
5. Batasi API Key untuk hanya mengakses Google Sheets API

### 3. Konfigurasi Website

Edit file `index.html` dan ganti nilai berikut:

```javascript
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Ganti dengan ID spreadsheet Anda
const API_KEY = 'YOUR_API_KEY'; // Ganti dengan API key Anda
