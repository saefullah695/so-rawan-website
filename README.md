# Rekap SO Rawan Hilang

Aplikasi web untuk input data Stock Opname barang rawan hilang yang terintegrasi dengan Google Sheets dan WhatsApp Bot.

## Setup

### 1. Google Sheets API Setup

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih existing
3. Enable **Google Sheets API**
4. Buat **API Key** di Credentials
5. Restrict API Key untuk hanya mengakses Google Sheets API

### 2. Google Sheet Setup

1. Buat spreadsheet baru atau gunakan existing
2. Buka **Share** → **Change to anyone with the link** → **Viewer**
3. Copy **Spreadsheet ID** dari URL:
   `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

### 3. Konfigurasi Aplikasi

Edit file `index.html` dan ganti:

```javascript
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Ganti dengan ID spreadsheet
const API_KEY = 'YOUR_API_KEY'; // Ganti dengan API key
