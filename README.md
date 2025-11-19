# SO Rawan Website

Professional Stock Opname Management System built for Cloudflare Pages.

## 🚀 Features

- ✅ Modern & Professional UI
- ✅ Real-time Data from Google Sheets
- ✅ Auto-complete Search
- ✅ Smart Calculations
- ✅ Data Validation
- ✅ Real-time Statistics
- ✅ Mobile Responsive

## 📋 Setup

### 1. Create GitHub Repository

Create a new repository and upload all files.

### 2. Cloudflare Pages Setup

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/)
2. Connect your GitHub repository
3. Build settings:
   - Build command: `npm run build`
   - Build output directory: `public`
4. Set environment variables:
   - `GS_CLIENT_EMAIL`
   - `GS_PRIVATE_KEY`
   - `SPREADSHEET_ID`

### 3. Google Sheets Setup

Ensure your Google Sheets has:
- `List_so` worksheet with columns: PLU, Nama Barang
- `Absensi` worksheet with columns: NIK, NAMA, JABATAN
- `SoRawan` worksheet for storing data

## 🎯 Usage

1. Select Kasir from dropdown
2. Set Date & Shift
3. Search Items by PLU or name
4. Input OH & Fisik quantities
5. Review Statistics in real-time
6. Submit Data to save to Google Sheets

## 📞 Support

For issues, check Cloudflare Pages logs and verify environment variables.
