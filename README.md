# SO Rawan Hilang - Cloudflare Pages

Sistem input data Stock Opname barang rawan hilang yang terintegrasi dengan Google Sheets dan WhatsApp Bot.

## Fitur

- Input data SO barang rawan hilang
- Integrasi dengan Google Sheets via Service Account
- Sinkronisasi data dengan WhatsApp Bot
- Interface responsive dengan glassmorphism design
- Validasi data dan prevent duplikasi

## Setup Environment Variables

Di Cloudflare Dashboard, set environment variables berikut:

- `SPREADSHEET_ID`: ID Google Spreadsheet Anda
- `LIST_SO_SHEET`: Nama sheet untuk list barang (default: List_so)
- `ABSENSI_SHEET`: Nama sheet untuk data kasir (default: Absensi)  
- `SO_RAWAN_SHEET`: Nama sheet untuk data SO (default: SoRawan)
- `GOOGLE_SERVICE_ACCOUNT`: JSON credentials Service Account

## Deployment

1. Connect repository ke Cloudflare Pages
2. Set build command: (kosongkan)
3. Set build output directory: `public`
4. Set environment variables di Cloudflare Dashboard
5. Deploy otomatis dari branch main

## Development

```bash
npm install
npm run dev
