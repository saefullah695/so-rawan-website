// Global variables
let items = [];
let allListSoItems = [];
let allKasirItems = [];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});

async function initializeApp() {
    try {
        // Set today's date
        document.getElementById('tanggal').valueAsDate = new Date();
        
        // Load items from List_so worksheet and kasir from Absensi
        await Promise.all([
            loadListSoItems(),
            loadKasirItems()
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup tab navigation
        setupTabNavigation();
        
        // Hide loading, show main content with animation
        setTimeout(() => {
            document.getElementById('loading').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
                document.querySelector('.main-container').style.display = 'block';
                showAlert('success', 'Sistem SO Rawan berhasil dimuat!', 'Siap digunakan');
            }, 300);
        }, 1000);
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showAlert('error', 'Gagal memuat sistem', error.message);
    }
}

function updateCurrentTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('currentTime').textContent = 
        now.toLocaleDateString('id-ID', options);
}

function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // Show selected tab content
            const tabId = this.getAttribute('data-tab') + 'Tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
}

async function loadListSoItems() {
    try {
        showAlert('info', 'Memuat data barang...', 'Mengambil dari database');
        
        const response = await fetch('/api/list-so');
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        
        if (result.success) {
            allListSoItems = result.data;
            updateSearchStats();
            console.log('Loaded List_so items:', allListSoItems.length);
        } else {
            throw new Error(result.error || 'Failed to load items');
        }
    } catch (error) {
        console.error('Error loading List_so items:', error);
        throw error;
    }
}

async function loadKasirItems() {
    try {
        const response = await fetch('/api/absensi');
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        
        if (result.success) {
            allKasirItems = result.data;
            populateKasirDropdown();
            console.log('Loaded kasir items:', allKasirItems.length);
        } else {
            throw new Error(result.error || 'Failed to load kasir data');
        }
    } catch (error) {
        console.error('Error loading kasir items:', error);
        throw error;
    }
}

function populateKasirDropdown() {
    const select = document.getElementById('nama');
    
    // Clear existing options except the first one
    select.innerHTML = '<option value="">Pilih Kasir...</option>';
    
    // Add unique kasir names
    const uniqueKasir = [...new Set(allKasirItems.map(item => item.nama))].sort();
    
    uniqueKasir.forEach(nama => {
        const option = document.createElement('option');
        option.value = nama;
        option.textContent = nama;
        select.appendChild(option);
    });
}

function setupEventListeners() {
    // Auto-calculate selisih
    document.getElementById('oh').addEventListener('input', calculateSelisih);
    document.getElementById('fisik').addEventListener('input', calculateSelisih);
    
    // Search functionality
    document.getElementById('searchItem').addEventListener('input', handleSearch);
    
    // Enter key to add item
    document.getElementById('fisik').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addItem();
        }
    });
    
    // Click outside to close search results
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            document.getElementById('searchResults').style.display = 'none';
        }
    });
}

function updateSearchStats() {
    const countElement = document.getElementById('searchCount');
    if (countElement) {
        countElement.textContent = allListSoItems.length.toLocaleString();
    }
}

function calculateSelisih() {
    const oh = parseInt(document.getElementById('oh').value) || 0;
    const fisik = parseInt(document.getElementById('fisik').value) || 0;
    const selisih = fisik - oh;
    
    document.getElementById('selisih').value = selisih;
    
    // Update visual indicator
    const indicator = document.getElementById('selisihIndicator');
    indicator.className = 'selisih-indicator';
    
    if (selisih > 0) {
        indicator.classList.add('selisih-positive');
    } else if (selisih < 0) {
        indicator.classList.add('selisih-negative');
    } else if (selisih === 0 && (oh !== 0 || fisik !== 0)) {
        indicator.classList.add('selisih-zero');
    }
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if (searchTerm.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    const filteredItems = allListSoItems.filter(item => 
        item.plu.toLowerCase().includes(searchTerm) || 
        item.namaBarang.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // Limit to 8 results
    
    displaySearchResults(filteredItems, resultsContainer);
}

function displaySearchResults(items, container) {
    if (items.length === 0) {
        container.innerHTML = `
            <div class="search-item">
                <div class="name">Tidak ditemukan</div>
            </div>
        `;
        container.style.display = 'block';
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="search-item" onclick="selectItem('${item.plu}', '${item.namaBarang.replace(/'/g, "\\'")}')">
            <div class="plu">${item.plu}</div>
            <div class="name">${item.namaBarang}</div>
            <div class="action"><i class="fas fa-arrow-right"></i></div>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

function selectItem(plu, namaBarang) {
    document.getElementById('plu').value = plu;
    document.getElementById('namaBarang').value = namaBarang;
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('searchItem').value = '';
    document.getElementById('oh').focus();
    
    // Add subtle animation to the input fields
    const inputs = document.querySelectorAll('#plu, #namaBarang');
    inputs.forEach(input => {
        input.style.transform = 'scale(1.02)';
        setTimeout(() => {
            input.style.transform = 'scale(1)';
        }, 200);
    });
}

function addItem() {
    const plu = document.getElementById('plu').value.trim();
    const namaBarang = document.getElementById('namaBarang').value.trim();
    const oh = document.getElementById('oh').value;
    const fisik = document.getElementById('fisik').value;
    const selisih = document.getElementById('selisih').value;
    
    // Validation
    if (!plu || !namaBarang) {
        showAlert('error', 'Pilih barang terlebih dahulu', 'Gunakan pencarian untuk memilih barang');
        return;
    }
    
    if (!oh || !fisik) {
        showAlert('error', 'Data tidak lengkap', 'OH dan Fisik harus diisi');
        return;
    }
    
    // Check for duplicate PLU
    if (items.some(item => item.plu === plu)) {
        showAlert('error', 'Barang sudah ada', 'PLU ini sudah ada dalam daftar');
        return;
    }
    
    // Add item to array
    const newItem = {
        plu: plu,
        namaBarang: namaBarang,
        oh: parseInt(oh),
        fisik: parseInt(fisik),
        selisih: parseInt(selisih),
        timestamp: new Date().toISOString()
    };
    
    items.push(newItem);
    updatePreview();
    updateStats();
    clearItemForm();
    
    showAlert('success', 'Barang ditambahkan', `${namaBarang} berhasil ditambahkan ke daftar`);
}

function removeItem(index) {
    const removedItem = items[index];
    items.splice(index, 1);
    updatePreview();
    updateStats();
    
    showAlert('info', 'Barang dihapus', `${removedItem.namaBarang} dihapus dari daftar`);
}

function clearAllItems() {
    if (items.length === 0) return;
    
    if (confirm('Apakah Anda yakin ingin menghapus semua barang dari daftar?')) {
        items = [];
        updatePreview();
        updateStats();
        showAlert('info', 'Daftar dikosongkan', 'Semua barang telah dihapus');
    }
}

function updatePreview() {
    const tbody = document.getElementById('itemsTableBody');
    
    if (items.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h4>Belum ada barang</h4>
                        <p>Tambahkan barang dari form input di atas</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = items.map((item, index) => {
        let statusClass, statusText, statusIcon;
        
        if (item.selisih > 0) {
            statusClass = 'status-positive';
            statusText = 'LEBIH';
            statusIcon = 'fa-arrow-up';
        } else if (item.selisih < 0) {
            statusClass = 'status-negative';
            statusText = 'KURANG';
            statusIcon = 'fa-arrow-down';
        } else {
            statusClass = 'status-perfect';
            statusText = 'SESUAI';
            statusIcon = 'fa-check';
        }
        
        return `
            <tr>
                <td><strong>${item.plu}</strong></td>
                <td>${item.namaBarang}</td>
                <td>${item.oh}</td>
                <td>${item.fisik}</td>
                <td><strong>${item.selisih > 0 ? '+' : ''}${item.selisih}</strong></td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i> ${statusText}
                    </span>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="removeItem(${index})" title="Hapus barang">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStats() {
    // Update main numbers
    document.getElementById('totalItems').textContent = items.length;
    
    const positiveItems = items.filter(item => item.selisih > 0).length;
    const negativeItems = items.filter(item => item.selisih < 0).length;
    const perfectItems = items.filter(item => item.selisih === 0).length;
    
    document.getElementById('positiveItems').textContent = positiveItems;
    document.getElementById('negativeItems').textContent = negativeItems;
    document.getElementById('perfectItems').textContent = perfectItems;
    
    // Add animation to stat changes
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        stat.style.transform = 'scale(1.1)';
        setTimeout(() => {
            stat.style.transform = 'scale(1)';
        }, 150);
    });
}

function clearItemForm() {
    document.getElementById('plu').value = '';
    document.getElementById('namaBarang').value = '';
    document.getElementById('oh').value = '';
    document.getElementById('fisik').value = '';
    document.getElementById('selisih').value = '0';
    document.getElementById('searchItem').value = '';
    document.getElementById('searchResults').style.display = 'none';
    
    // Reset selisih indicator
    document.getElementById('selisihIndicator').className = 'selisih-indicator';
}

async function submitData() {
    const nama = document.getElementById('nama').value.trim();
    const tanggal = document.getElementById('tanggal').value;
    const shift = document.getElementById('shift').value;
    
    // Validation
    if (!nama || !tanggal || !shift) {
        showAlert('error', 'Data tidak lengkap', 'Harap isi semua field yang wajib');
        return;
    }
    
    if (items.length === 0) {
        showAlert('error', 'Tidak ada barang', 'Minimal harus ada 1 barang dalam daftar');
        return;
    }
    
    // Format tanggal to DD-MM-YYYY
    const dateObj = new Date(tanggal);
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
    
    // Prepare data
    const data = {
        nama: nama,
        tanggal_rekap: formattedDate,
        shift: shift,
        items: items
    };
    
    try {
        showAlert('info', 'Mengirim data...', 'Sedang menyimpan ke database');
        
        const response = await fetch('/api/so-rawan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', 'Data tersimpan!', result.message || `Berhasil menyimpan ${items.length} barang`);
            
            // Reset form with celebration
            celebrateSuccess();
            
            // Reset data
            items = [];
            updatePreview();
            updateStats();
            document.getElementById('nama').value = '';
            document.getElementById('shift').value = '';
            
        } else {
            showAlert('error', 'Gagal menyimpan', result.error || 'Terjadi kesalahan');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('error', 'Koneksi error', 'Gagal terhubung ke server');
    }
}

function celebrateSuccess() {
    // Add celebration animation to success button
    const successBtn = document.querySelector('.btn-success');
    successBtn.style.transform = 'scale(1.1)';
    successBtn.style.background = 'var(--success-dark)';
    
    setTimeout(() => {
        successBtn.style.transform = 'scale(1)';
        successBtn.style.background = '';
    }, 600);
    
    // Add confetti effect (simple CSS version)
    const confetti = document.createElement('div');
    confetti.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        background: radial-gradient(circle at 20% 50%, rgba(76, 201, 240, 0.3) 0%, transparent 50%),
                   radial-gradient(circle at 80% 20%, rgba(67, 97, 238, 0.3) 0%, transparent 50%),
                   radial-gradient(circle at 40% 80%, rgba(114, 9, 183, 0.3) 0%, transparent 50%);
        animation: fadeOut 1s ease-in-out 1s forwards;
    `;
    
    document.body.appendChild(confetti);
    
    setTimeout(() => {
        document.body.removeChild(confetti);
    }, 2000);
}

function showAlert(type, title, message) {
    const container = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alertHTML = `
        <div class="alert ${type}" id="${alertId}">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                <div class="alert-message">${message}</div>
            </div>
            <button class="alert-close" onclick="closeAlert('${alertId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', alertHTML);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        closeAlert(alertId);
    }, 5000);
}

function closeAlert(alertId) {
    const alert = document.getElementById(alertId);
    if (alert) {
        alert.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            alert.remove();
        }, 300);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl + Enter to submit
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        submitData();
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('searchItem').value = '';
    }
});

// Add CSS for fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
