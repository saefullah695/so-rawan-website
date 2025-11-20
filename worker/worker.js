// Worker.js — Rekap SO Rawan Hilang
// Menyajikan index.html di root (/) dan menyediakan API untuk Google Sheets

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ✅ Halaman utama (index.html)
    if (path === "/") {
      // Return HTML content directly
      const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rekap SO Rawan Hilang</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    <style>
        :root {
            --primary: #4361ee;
            --secondary: #3f37c9;
            --success: #4cc9f0;
            --dark: #1d3557;
            --light: #f8f9fa;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        
        .glass-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.18);
            padding: 25px;
            margin-bottom: 20px;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .form-label {
            font-weight: 600;
            color: var(--dark);
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-weight: 600;
        }
        
        .btn-success {
            background: linear-gradient(135deg, var(--success), #4895ef);
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-weight: 600;
        }
        
        .table-responsive {
            border-radius: 10px;
            overflow: hidden;
        }
        
        .table th {
            background-color: var(--primary);
            color: white;
            border: none;
        }
        
        .selisih-positive {
            color: #2ecc71;
            font-weight: bold;
        }
        
        .selisih-negative {
            color: #e74c3c;
            font-weight: bold;
        }
        
        .selisih-zero {
            color: #7f8c8d;
        }
        
        .stats-card {
            text-align: center;
            padding: 15px;
        }
        
        .stats-number {
            font-size: 2.5em;
            font-weight: 700;
            color: var(--primary);
        }
        
        .stats-label {
            color: var(--dark);
            font-weight: 600;
        }
        
        footer {
            text-align: center;
            color: white;
            margin-top: 30px;
            opacity: 0.8;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-clipboard-list me-2"></i>Rekap SO Rawan Hilang</h1>
            <p>Sistem input data Stock Opname barang rawan hilang - Terintegrasi dengan WhatsApp Bot</p>
        </div>
        
        <div class="row">
            <!-- Stats Cards -->
            <div class="col-md-4">
                <div class="glass-card stats-card">
                    <div class="stats-number" id="totalItems">0</div>
                    <div class="stats-label">Total Item Tersedia</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="glass-card stats-card">
                    <div class="stats-number" id="itemCount">0 Item</div>
                    <div class="stats-label">Item Ditambahkan</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="glass-card stats-card">
                    <div class="stats-number" id="todayData">0</div>
                    <div class="stats-label">Input Hari Ini</div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <!-- Form Input -->
            <div class="col-lg-6">
                <div class="glass-card">
                    <h3><i class="fas fa-edit me-2"></i>Input Data SO</h3>
                    <form id="soForm">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="tanggal" class="form-label">Tanggal</label>
                                <input type="date" class="form-control" id="tanggal" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="shift" class="form-label">Shift</label>
                                <select class="form-select" id="shift" required>
                                    <option value="">Pilih Shift</option>
                                    <option value="Pagi">Pagi</option>
                                    <option value="Sore">Sore</option>
                                    <option value="Malam">Malam</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label for="namaKasir" class="form-label">Nama Kasir</label>
                            <select class="form-select" id="namaKasir" required>
                                <option value="">Pilih Nama Kasir</option>
                            </select>
                        </div>
                        
                        <div class="mb-3">
                            <label for="itemSelect" class="form-label">Pilih Item</label>
                            <select class="form-select" id="itemSelect">
                                <option value="">Pilih Item Barang</option>
                            </select>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="oh" class="form-label">OH (On Hand)</label>
                                <input type="number" class="form-control" id="oh" value="0" min="0">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="fisik" class="form-label">Fisik</label>
                                <input type="number" class="form-control" id="fisik" value="0" min="0">
                            </div>
                        </div>
                        
                        <div class="d-grid">
                            <button type="button" class="btn btn-primary" id="addItemBtn">
                                <i class="fas fa-plus me-2"></i>Tambah Item
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Daftar Item -->
            <div class="col-lg-6">
                <div class="glass-card">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3><i class="fas fa-list me-2"></i>Daftar Item</h3>
                        <div class="action-buttons">
                            <button class="btn btn-outline-danger btn-sm" id="clearBtn">
                                <i class="fas fa-trash me-1"></i>Hapus Semua
                            </button>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>PLU</th>
                                    <th>Nama Barang</th>
                                    <th>OH</th>
                                    <th>Fisik</th>
                                    <th>Selisih</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="itemsTableBody">
                                <!-- Data items akan dimuat di sini -->
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="d-grid mt-3">
                        <button type="button" class="btn btn-success" onclick="submitData()">
                            <i class="fas fa-paper-plane me-2"></i>Simpan Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Riwayat Input -->
        <div class="row mt-4">
            <div class="col-12">
                <div class="glass-card">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3><i class="fas fa-history me-2"></i>Riwayat Input Hari Ini</h3>
                        <div class="action-buttons">
                            <button class="btn btn-outline-primary btn-sm" id="refreshBtn">
                                <i class="fas fa-refresh me-1"></i>Refresh
                            </button>
                            <button class="btn btn-outline-success btn-sm" id="syncBtn">
                                <i class="fas fa-sync me-1"></i>Sinkronisasi
                            </button>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Shift</th>
                                    <th>Kasir</th>
                                    <th>Jumlah Item</th>
                                    <th>Sumber</th>
                                    <th>Waktu</th>
                                </tr>
                            </thead>
                            <tbody id="historyTableBody">
                                <!-- Data riwayat akan dimuat di sini -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Loading -->
        <div class="loading" id="loading">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Memproses data...</p>
        </div>
        
        <footer>
            <p>&copy; 2024 Rekap SO Rawan Hilang | Terintegrasi dengan Google Sheets & WhatsApp Bot | Multi-Input Support</p>
        </footer>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Konfigurasi - GANTI DENGAN MILIK ANDA
        const WORKER_URL = 'https://your-worker.your-domain.workers.dev'; // Ganti dengan URL Worker Anda
        
        // Nama worksheet - HARUS SAMA DENGAN BOT WHATSAPP
        const LIST_SO_SHEET = 'List_so';
        const ABSENSI_SHEET = 'Absensi';
        const SO_RAWAN_SHEET = 'SoRawan';
        
        // Variabel global
        let listItems = [];
        let kasirList = [];
        let currentItems = [];
        
        // Fungsi generateUniqueId - SAMA DENGAN BOT WHATSAPP
        function generateUniqueId(...args) {
            const hash = CryptoJS.MD5(args.join('-')).toString();
            return hash;
        }
        
        // Fungsi standardizeDateFormat - SAMA DENGAN BOT WHATSAPP
        function standardizeDateFormat(dateString) {
            if (!dateString) return '';
            
            try {
                let dateObj;
                
                if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // Format YYYY-MM-DD (dari input date)
                    const [year, month, day] = dateString.split('-');
                    dateObj = new Date(year, month - 1, day);
                } else if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
                    // Format DD-MM-YYYY
                    const [day, month, year] = dateString.split('-');
                    dateObj = new Date(year, month - 1, day);
                } else if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    // Format DD/MM/YYYY
                    const [day, month, year] = dateString.split('/');
                    dateObj = new Date(year, month - 1, day);
                } else {
                    // Coba parsing langsung
                    dateObj = new Date(dateString);
                }
                
                if (!isNaN(dateObj.getTime())) {
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    return `${day}-${month}-${year}`;
                }
                
                return dateString;
            } catch (error) {
                console.error('Error standardize date:', error);
                return dateString;
            }
        }
        
        // Fungsi untuk mengambil data dari Google Sheets melalui Worker
        async function fetchSheetData(sheetName, range = '') {
            const url = `${WORKER_URL}/api/sheets?sheetName=${encodeURIComponent(sheetName)}&range=${encodeURIComponent(range)}`;
            
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                return data.values || [];
            } catch (error) {
                console.error(`Error fetching data from ${sheetName}:`, error);
                showError(`Gagal mengambil data dari ${sheetName}`);
                return [];
            }
        }
        
        // Fungsi untuk mengirim data ke Google Sheets melalui Worker
        async function appendToSheet(sheetName, data) {
            const url = `${WORKER_URL}/api/sheets/append`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sheetName: sheetName,
                        values: data
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error(`Error appending data to ${sheetName}:`, error);
                throw error;
            }
        }

        // Fungsi untuk update data di Google Sheets melalui Worker
        async function updateSheetData(sheetName, range, data) {
            const url = `${WORKER_URL}/api/sheets/update`;
            
            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sheetName: sheetName,
                        range: range,
                        values: data
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error(`Error updating data in ${sheetName}:`, error);
                throw error;
            }
        }
        
        // Fungsi untuk memuat data item dari worksheet List_so
        async function loadListItems() {
            showLoading();
            const data = await fetchSheetData(LIST_SO_SHEET);
            
            if (data.length > 0) {
                // Skip header row
                listItems = data.slice(1).map(row => ({
                    plu: row[0] || '',
                    nama: row[1] || ''
                })).filter(item => item.plu && item.nama); // Filter item yang valid
                
                updateItemSelect();
                updateTotalItems();
                hideLoading();
            } else {
                console.error('Tidak ada data item ditemukan');
                hideLoading();
            }
        }
        
        // Fungsi untuk memuat data kasir dari worksheet Absensi
        async function loadKasirList() {
            const data = await fetchSheetData(ABSENSI_SHEET);
            
            if (data.length > 0) {
                // Skip header row, ambil kolom nama (asumsi kolom kedua)
                kasirList = [...new Set(data.slice(1)
                    .map(row => row[1] || '')
                    .filter(name => name.trim() !== ''))];
                
                updateKasirSelect();
            } else {
                console.error('Tidak ada data kasir ditemukan');
                // Fallback kasir list
                kasirList = ['Kasir 1', 'Kasir 2', 'Kasir 3'];
                updateKasirSelect();
            }
        }
        
        // Fungsi untuk memperbarui dropdown item
        function updateItemSelect() {
            const select = document.getElementById('itemSelect');
            select.innerHTML = '<option value="">Pilih Item Barang</option>';
            
            listItems.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${item.plu} - ${item.nama}`;
                select.appendChild(option);
            });
        }
        
        // Fungsi untuk memperbarui dropdown kasir
        function updateKasirSelect() {
            const select = document.getElementById('namaKasir');
            select.innerHTML = '<option value="">Pilih Nama Kasir</option>';
            
            kasirList.forEach(kasir => {
                const option = document.createElement('option');
                option.value = kasir;
                option.textContent = kasir;
                select.appendChild(option);
            });
        }
        
        // Fungsi untuk menambah item ke tabel
        function addItemToTable() {
            const itemSelect = document.getElementById('itemSelect');
            const ohInput = document.getElementById('oh');
            const fisikInput = document.getElementById('fisik');
            
            if (itemSelect.value === '') {
                alert('Pilih item terlebih dahulu!');
                return;
            }
            
            const oh = parseInt(ohInput.value) || 0;
            const fisik = parseInt(fisikInput.value) || 0;
            
            if (oh < 0 || fisik < 0) {
                alert('Nilai OH dan Fisik tidak boleh negatif!');
                return;
            }
            
            const itemIndex = parseInt(itemSelect.value);
            const selectedItem = listItems[itemIndex];
            const selisih = fisik - oh;
            
            // Cek apakah item sudah ada di tabel
            const existingIndex = currentItems.findIndex(item => item.plu === selectedItem.plu);
            
            if (existingIndex !== -1) {
                // Update item yang sudah ada
                currentItems[existingIndex].oh = oh;
                currentItems[existingIndex].fisik = fisik;
                currentItems[existingIndex].selisih = selisih;
            } else {
                // Tambah item baru
                currentItems.push({
                    plu: selectedItem.plu,
                    nama: selectedItem.nama,
                    oh: oh,
                    fisik: fisik,
                    selisih: selisih
                });
            }
            
            updateItemsTable();
            
            // Reset form input
            ohInput.value = '0';
            fisikInput.value = '0';
            itemSelect.value = '';
            
            // Focus kembali ke select item
            itemSelect.focus();
        }
        
        // Fungsi untuk memperbarui tabel item
        function updateItemsTable() {
            const tbody = document.getElementById('itemsTableBody');
            tbody.innerHTML = '';
            
            if (currentItems.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="6" class="text-center text-muted">Belum ada item yang ditambahkan</td>`;
                tbody.appendChild(row);
                return;
            }
            
            currentItems.forEach((item, index) => {
                const row = document.createElement('tr');
                
                let selisihClass = 'selisih-zero';
                if (item.selisih > 0) {
                    selisihClass = 'selisih-positive';
                } else if (item.selisih < 0) {
                    selisihClass = 'selisih-negative';
                }
                
                const selisihText = item.selisih > 0 ? `+${item.selisih}` : item.selisih;
                
                row.innerHTML = `
                    <td>${item.plu}</td>
                    <td>${item.nama}</td>
                    <td>${item.oh}</td>
                    <td>${item.fisik}</td>
                    <td class="${selisihClass}">${selisihText}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeItem(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
            });
            
            // Update item count
            document.getElementById('itemCount').textContent = `${currentItems.length} Item`;
        }
        
        // Fungsi untuk menghapus item dari tabel
        function removeItem(index) {
            currentItems.splice(index, 1);
            updateItemsTable();
        }
        
        // Fungsi untuk menghapus semua item
        function clearAllItems() {
            if (currentItems.length === 0) {
                alert('Tidak ada item untuk dihapus!');
                return;
            }
            
            if (confirm('Apakah Anda yakin ingin menghapus semua item?')) {
                currentItems = [];
                updateItemsTable();
            }
        }
        
        // Fungsi untuk memperbarui statistik
        function updateTotalItems() {
            document.getElementById('totalItems').textContent = listItems.length;
        }
        
        // Fungsi untuk menampilkan loading
        function showLoading() {
            document.getElementById('loading').style.display = 'block';
        }
        
        // Fungsi untuk menyembunyikan loading
        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }

        // Fungsi untuk menampilkan error
        function showError(message) {
            alert(`Error: ${message}`);
        }
        
        // Fungsi untuk mencari data existing di SoRawan worksheet
        async function findExistingData(nama, shift, tanggal, plu) {
            try {
                const data = await fetchSheetData(SO_RAWAN_SHEET);
                if (data.length < 2) return null;
                
                const headers = data[0];
                const idColumn = headers.indexOf('ID');
                const namaColumn = headers.indexOf('Nama Kasir');
                const shiftColumn = headers.indexOf('Shift');
                const tanggalColumn = headers.indexOf('Tanggal Rekap');
                const pluColumn = headers.indexOf('PLU');
                
                if (idColumn === -1) return null;
                
                const searchId = generateUniqueId(nama, shift, tanggal, plu);
                
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (row[idColumn] === searchId) {
                        return {
                            rowIndex: i + 1, // +1 karena Sheets API menggunakan 1-based index
                            data: row
                        };
                    }
                }
                
                return null;
            } catch (error) {
                console.error('Error finding existing data:', error);
                return null;
            }
        }
        
        // Fungsi untuk mengirim data ke Google Sheets
        async function submitData() {
            if (currentItems.length === 0) {
                alert('Tidak ada item yang ditambahkan!');
                return;
            }
            
            const tanggal = document.getElementById('tanggal').value;
            const shift = document.getElementById('shift').value;
            const namaKasir = document.getElementById('namaKasir').value;
            
            if (!tanggal || !shift || !namaKasir) {
                alert('Harap lengkapi semua field!');
                return;
            }
            
            showLoading();
            
            try {
                const formattedDate = standardizeDateFormat(tanggal);
                let successCount = 0;
                let updateCount = 0;
                let errorCount = 0;
                
                for (const item of currentItems) {
                    try {
                        const uniqueId = generateUniqueId(namaKasir, shift, formattedDate, item.plu);
                        const timestamp = new Date().toISOString();
                        
                        const rowData = [
                            uniqueId,
                            timestamp,
                            namaKasir,
                            formattedDate,
                            shift,
                            item.plu,
                            item.nama,
                            item.oh.toString(),
                            item.fisik.toString(),
                            item.selisih.toString(),
                            'Website'
                        ];
                        
                        const existingData = await findExistingData(namaKasir, shift, formattedDate, item.plu);
                        
                        if (existingData) {
                            const range = `A${existingData.rowIndex}:K${existingData.rowIndex}`;
                            await updateSheetData(SO_RAWAN_SHEET, range, rowData);
                            updateCount++;
                        } else {
                            await appendToSheet(SO_RAWAN_SHEET, rowData);
                            successCount++;
                        }
                    } catch (error) {
                        console.error(`Error processing item ${item.plu}:`, error);
                        errorCount++;
                    }
                }
                
                let message = 'Data berhasil disimpan!';
                if (successCount > 0) message += ` ${successCount} item baru ditambahkan.`;
                if (updateCount > 0) message += ` ${updateCount} item diperbarui.`;
                if (errorCount > 0) message += ` ${errorCount} item gagal diproses.`;
                
                alert(message);
                
                // Reset hanya jika semua berhasil
                if (errorCount === 0) {
                    document.getElementById('soForm').reset();
                    document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
                    currentItems = [];
                    updateItemsTable();
                }
                
                await loadHistory();
                
            } catch (error) {
                console.error('Error submitting data:', error);
                alert('Terjadi kesalahan saat menyimpan data. Silakan coba lagi.');
            } finally {
                hideLoading();
            }
        }
        
        // Fungsi untuk memuat riwayat input hari ini
        async function loadHistory() {
            const today = new Date();
            const formattedToday = standardizeDateFormat(today.toISOString().split('T')[0]);
            
            const data = await fetchSheetData(SO_RAWAN_SHEET);
            const tbody = document.getElementById('historyTableBody');
            tbody.innerHTML = '';
            
            if (data.length <= 1) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="6" class="text-center text-muted">Belum ada data untuk hari ini</td>`;
                tbody.appendChild(row);
                document.getElementById('todayData').textContent = '0';
                return;
            }
            
            const headers = data[0];
            const timestampCol = headers.indexOf('Timestamp');
            const namaCol = headers.indexOf('Nama Kasir');
            const tanggalCol = headers.indexOf('Tanggal Rekap');
            const shiftCol = headers.indexOf('Shift');
            const pengirimCol = headers.indexOf('Pengirim');
            
            // Validasi kolom
            if (timestampCol === -1 || namaCol === -1 || tanggalCol === -1 || shiftCol === -1) {
                console.error('Struktur kolom tidak sesuai');
                return;
            }
            
            const todayData = data.slice(1).filter(row => {
                const rowDate = standardizeDateFormat(row[tanggalCol]);
                return rowDate === formattedToday;
            });
            
            // Kelompokkan data
            const groupedData = {};
            todayData.forEach(row => {
                const key = `${row[namaCol]}-${row[tanggalCol]}-${row[shiftCol]}`;
                if (!groupedData[key]) {
                    groupedData[key] = {
                        kasir: row[namaCol],
                        tanggal: row[tanggalCol],
                        shift: row[shiftCol],
                        pengirim: row[pengirimCol] || 'Unknown',
                        waktu: row[timestampCol],
                        count: 0
                    };
                }
                groupedData[key].count++;
            });
            
            const groups = Object.values(groupedData);
            
            if (groups.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="6" class="text-center text-muted">Belum ada data untuk hari ini</td>`;
                tbody.appendChild(row);
            } else {
                groups.forEach(item => {
                    const row = document.createElement('tr');
                    const waktu = new Date(item.waktu);
                    const waktuText = isNaN(waktu.getTime()) ? 'Invalid Date' : waktu.toLocaleTimeString('id-ID');
                    
                    row.innerHTML = `
                        <td>${item.tanggal}</td>
                        <td>${item.shift}</td>
                        <td>${item.kasir}</td>
                        <td>${item.count} item</td>
                        <td>
                            <span class="badge ${item.pengirim === 'Website' ? 'bg-success' : 'bg-primary'}">
                                ${item.pengirim}
                            </span>
                        </td>
                        <td>${waktuText}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
            
            document.getElementById('todayData').textContent = groups.length;
        }

        // Fungsi untuk sinkronisasi data
        async function syncData() {
            showLoading();
            try {
                await Promise.all([
                    loadListItems(),
                    loadKasirList(),
                    loadHistory()
                ]);
                alert('Data berhasil disinkronisasi!');
            } catch (error) {
                console.error('Error syncing data:', error);
                alert('Terjadi kesalahan saat sinkronisasi data.');
            } finally {
                hideLoading();
            }
        }
        
        // Inisialisasi saat halaman dimuat
        document.addEventListener('DOMContentLoaded', function() {
            // Set tanggal hari ini sebagai default
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('tanggal').value = today;
            
            // Muat data
            syncData();
            
            // Event listeners
            document.getElementById('addItemBtn').addEventListener('click', addItemToTable);
            document.getElementById('clearBtn').addEventListener('click', clearAllItems);
            document.getElementById('refreshBtn').addEventListener('click', loadHistory);
            document.getElementById('syncBtn').addEventListener('click', syncData);
            
            // Enter key support untuk form
            document.getElementById('soForm').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addItemToTable();
                }
            });
        });
    </script>
</body>
</html>`;
      
      return new Response(htmlContent, {
        headers: { 
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache"
        },
      });
    }

    // ✅ Endpoint API
    if (path.startsWith("/api/")) {
      return handleRequest(request, env);
    }

    // Jika path tidak ditemukan
    return new Response("Not Found", { status: 404 });
  },
};

// =============================
// ====== API HANDLER ==========
// =============================

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = await getAccessToken(env);

    if (path === "/api/sheets" && request.method === "GET") {
      return await getSheetData(request, accessToken, env);
    } else if (path === "/api/sheets/append" && request.method === "POST") {
      return await appendToSheet(request, accessToken, env);
    } else if (path === "/api/sheets/update" && request.method === "PUT") {
      return await updateSheetData(request, accessToken, env);
    } else {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }
  } catch (error) {
    console.error("Worker error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// =============================
// ====== GOOGLE AUTH ==========
// =============================

function normalizePrivateKey(raw) {
  if (!raw) throw new Error("PRIVATE_KEY missing");
  return raw.replace(/\\n/g, "\n");
}

async function getAccessToken(env) {
  const serviceAccount = {
    client_email: env.SERVICE_ACCOUNT_EMAIL,
    private_key: normalizePrivateKey(env.PRIVATE_KEY),
  };

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const jwtHeader = JSON.stringify({ alg: "RS256", typ: "JWT" });
  const jwtPayload = JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: expiry,
    iat: now,
  });

  const base64Header = btoa(unescape(encodeURIComponent(jwtHeader)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const base64Payload = btoa(unescape(encodeURIComponent(jwtPayload)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = await signJWT(signatureInput, serviceAccount.private_key);
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signatureInput}.${base64Signature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(
      `Failed to get access token: ${tokenResponse.status} ${errorText}`
    );
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function signJWT(data, privateKey) {
  // Remove header and footer and convert to ArrayBuffer
  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(data)
  );

  return signature;
}

// =============================
// ====== SHEETS API ===========
// =============================

async function getSheetData(request, accessToken, env) {
  const url = new URL(request.url);
  const spreadsheetId = env.SPREADSHEET_ID;
  const sheetName = url.searchParams.get("sheetName");
  const range = url.searchParams.get("range") || "";

  if (!spreadsheetId || !sheetName) {
    return new Response(
      JSON.stringify({ error: "Missing required parameters" }),
      { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const apiRange = range ? `${sheetName}!${range}` : sheetName;
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(apiRange)}`;

  const response = await fetch(apiUrl, {
    headers: { 
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Sheets API error:', errorText);
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch sheet data",
        details: errorText
      }),
      { 
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function appendToSheet(request, accessToken, env) {
  const { sheetName, values } = await request.json();
  const spreadsheetId = env.SPREADSHEET_ID;

  if (!spreadsheetId || !sheetName || !values) {
    return new Response(
      JSON.stringify({ error: "Missing required parameters" }),
      { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z:append?valueInputOption=RAW`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [values],
      majorDimension: "ROWS"
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Sheets API append error:', errorText);
    return new Response(
      JSON.stringify({ 
        error: "Failed to append data",
        details: errorText
      }),
      { 
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function updateSheetData(request, accessToken, env) {
  const { sheetName, range, values } = await request.json();
  const spreadsheetId = env.SPREADSHEET_ID;

  if (!spreadsheetId || !sheetName || !range || !values) {
    return new Response(
      JSON.stringify({ error: "Missing required parameters" }),
      { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!${range}?valueInputOption=RAW`;

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [values],
      majorDimension: "ROWS"
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Sheets API update error:', errorText);
    return new Response(
      JSON.stringify({ 
        error: "Failed to update data",
        details: errorText
      }),
      { 
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
