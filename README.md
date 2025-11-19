# SO Rawan Website System

Professional Stock Opname Management System built for Cloudflare Pages.

## 🚀 Features

- ✅ **Modern & Professional UI** - Beautiful, responsive design
- ✅ **Real-time Data** - From Google Sheets (List_so & Absensi worksheets)
- ✅ **Auto-complete Search** - Fast PLU and product name search
- ✅ **Smart Calculations** - Automatic selisih calculation
- ✅ **Data Validation** - Prevent duplicates and errors
- ✅ **Real-time Statistics** - Live updates of stock status
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **Fast Deployment** - Via Cloudflare Pages + GitHub Actions

## 📋 Prerequisites

1. **Google Service Account** with access to:
   - Google Sheets API
   - Your spreadsheet containing:
     - `List_so` worksheet (PLU, Nama Barang)
     - `Absensi` worksheet (Nama Kasir data)
     - `SoRawan` worksheet (for saving data)

2. **Cloudflare Account** with:
   - Pages access
   - API Token

3. **GitHub Account** for repository and CI/CD

## 🛠️ Setup Instructions

### 1. Clone & Setup Repository

```bash
git clone https://github.com/your-username/so-rawan-website.git
cd so-rawan-website
