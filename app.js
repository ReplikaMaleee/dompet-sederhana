/**
 * ==========================================
 * Dompet Digital Tracker - Main Application
 * ==========================================
 */

// ==================== STATE ====================
let transactions = [];
let deleteTargetId = null;
let pendingImportData = [];
let selectedFile = null;

// ==================== CONSTANTS ====================
const STORAGE_KEY = 'dompetDigitalTransactions';

const categoryIcons = {
    'Gaji': '💰',
    'Bonus': '🎁',
    'Investasi': '📈',
    'Freelance': '💻',
    'Hadiah': '🎀',
    'Lainnya (Masuk)': '📥',
    'Makan': '🍔',
    'Transport': '🚗',
    'Belanja': '🛒',
    'Hiburan': '🎬',
    'Tagihan': '📄',
    'Kesehatan': '💊',
    'Pendidikan': '📚',
    'Lainnya (Keluar)': '📤'
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format number to Indonesian Rupiah currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Format number with thousand separator (for input display)
 */
function formatNumberInput(value) {
    let number = value.replace(/\D/g, '');
    number = number.replace(/^0+/, '') || '0';
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse formatted number string to raw number
 */
function parseFormattedNumber(value) {
    return parseInt(value.replace(/\./g, '').replace(/\D/g, '')) || 0;
}

/**
 * Format date to Indonesian locale
 */
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

/**
 * Format file size to human readable
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ==================== STORAGE FUNCTIONS ====================

/**
 * Load transactions from localStorage
 */
function loadTransactions() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        transactions = JSON.parse(saved);
    }
    updateUI();
}

/**
 * Save transactions to localStorage
 */
function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ==================== UI UPDATE FUNCTIONS ====================

/**
 * Update dashboard cards with totals
 */
function updateDashboard() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;

    document.getElementById('totalBalance').textContent = formatCurrency(balance);
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpense').textContent = formatCurrency(expense);
}

/**
 * Render transaction list
 */
function renderTransactions() {
    const container = document.getElementById('transactionList');
    const emptyState = document.getElementById('emptyState');
    const countBadge = document.getElementById('transactionCount');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterType = document.getElementById('filterType').value;

    // Filter transactions
    let filtered = transactions.filter(t => {
        const matchSearch = t.description.toLowerCase().includes(searchTerm) ||
                           t.category.toLowerCase().includes(searchTerm);
        const matchType = filterType === 'all' || t.type === filterType;
        return matchSearch && matchType;
    });

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update count badge
    countBadge.textContent = `${filtered.length} transaksi`;

    // Render empty state or transaction list
    if (filtered.length === 0) {
        container.innerHTML = '';
        container.appendChild(emptyState.cloneNode(true));
        lucide.createIcons();
        return;
    }

    container.innerHTML = filtered.map(t => `
        <div class="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 group animate-slide-in">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 flex items-center justify-center text-2xl ${t.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'} rounded-xl">
                    ${categoryIcons[t.category] || '💳'}
                </div>
                <div>
                    <p class="font-semibold text-gray-800">${t.description}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-xs text-gray-500">${formatDate(t.date)}</span>
                        <span class="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span class="text-xs px-2 py-0.5 ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} rounded-full font-medium">${t.category}</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <p class="font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </p>
                <button onclick="showDeleteModal('${t.id}')" class="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 rounded-lg transition-all duration-200">
                    <i data-lucide="trash-2" class="w-4 h-4 text-red-500"></i>
                </button>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

/**
 * Calculate category breakdown
 */
function calculateCategoryBreakdown(type) {
    const filtered = transactions.filter(t => t.type === type);
    const breakdown = {};
    
    filtered.forEach(t => {
        if (!breakdown[t.category]) {
            breakdown[t.category] = 0;
        }
        breakdown[t.category] += t.amount;
    });

    // Convert to array and sort by amount (highest first)
    const result = Object.entries(breakdown)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

    return result;
}

/**
 * Render category breakdown
 */
function renderCategoryBreakdown() {
    renderIncomeCategoryBreakdown();
    renderExpenseCategoryBreakdown();
}

/**
 * Render income category breakdown
 */
function renderIncomeCategoryBreakdown() {
    const container = document.getElementById('incomeCategoryList');
    const countBadge = document.getElementById('incomeCategoryCount');
    const totalContainer = document.getElementById('incomeCategoryTotal');
    const totalAmountEl = document.getElementById('incomeTotalAmount');
    
    const breakdown = calculateCategoryBreakdown('income');
    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
    
    countBadge.textContent = `${breakdown.length} kategori`;

    if (breakdown.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-gray-400">
                <i data-lucide="inbox" class="w-12 h-12 mb-3 stroke-1"></i>
                <p class="text-sm">Belum ada pemasukan</p>
            </div>
        `;
        totalContainer.classList.add('hidden');
        lucide.createIcons();
        return;
    }

    container.innerHTML = breakdown.map(item => {
        const percentage = total > 0 ? (item.amount / total * 100).toFixed(1) : 0;
        const icon = categoryIcons[item.category] || '💰';
        
        return `
            <div class="category-item p-3 rounded-xl cursor-default">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">${icon}</span>
                        <span class="font-medium text-gray-800">${item.category}</span>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-emerald-600">${formatCurrency(item.amount)}</p>
                        <p class="text-xs text-gray-500">${percentage}%</p>
                    </div>
                </div>
                <div class="category-progress-bar">
                    <div class="category-progress-fill income" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');

    totalContainer.classList.remove('hidden');
    totalAmountEl.textContent = formatCurrency(total);
}

/**
 * Render expense category breakdown
 */
function renderExpenseCategoryBreakdown() {
    const container = document.getElementById('expenseCategoryList');
    const countBadge = document.getElementById('expenseCategoryCount');
    const totalContainer = document.getElementById('expenseCategoryTotal');
    const totalAmountEl = document.getElementById('expenseTotalAmount');
    
    const breakdown = calculateCategoryBreakdown('expense');
    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
    
    countBadge.textContent = `${breakdown.length} kategori`;

    if (breakdown.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-gray-400">
                <i data-lucide="inbox" class="w-12 h-12 mb-3 stroke-1"></i>
                <p class="text-sm">Belum ada pengeluaran</p>
            </div>
        `;
        totalContainer.classList.add('hidden');
        lucide.createIcons();
        return;
    }

    container.innerHTML = breakdown.map(item => {
        const percentage = total > 0 ? (item.amount / total * 100).toFixed(1) : 0;
        const icon = categoryIcons[item.category] || '💳';
        
        return `
            <div class="category-item p-3 rounded-xl cursor-default">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">${icon}</span>
                        <span class="font-medium text-gray-800">${item.category}</span>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-red-600">${formatCurrency(item.amount)}</p>
                        <p class="text-xs text-gray-500">${percentage}%</p>
                    </div>
                </div>
                <div class="category-progress-bar">
                    <div class="category-progress-fill expense" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');

    totalContainer.classList.remove('hidden');
    totalAmountEl.textContent = formatCurrency(total);
}

/**
 * Update all UI components
 */
function updateUI() {
    updateDashboard();
    renderTransactions();
    renderCategoryBreakdown();
}

// ==================== FORM HANDLING ====================

/**
 * Setup amount input with auto-formatting
 */
function setupAmountInput() {
    const amountInput = document.getElementById('amount');
    const amountRaw = document.getElementById('amountRaw');

    amountInput.addEventListener('input', function(e) {
        let value = e.target.value;
        const formatted = formatNumberInput(value);
        e.target.value = formatted === '0' ? '' : formatted;
        amountRaw.value = parseFormattedNumber(formatted);
    });

    amountInput.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
            e.preventDefault();
        }
    });

    amountInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const formatted = formatNumberInput(pastedText);
        e.target.value = formatted === '0' ? '' : formatted;
        amountRaw.value = parseFormattedNumber(formatted);
    });
}

/**
 * Handle form submission
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const amountValue = parseFormattedNumber(document.getElementById('amount').value);
    
    if (amountValue <= 0) {
        showToast('Nominal harus lebih dari 0!');
        return;
    }

    const transaction = {
        id: generateId(),
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
        category: document.getElementById('category').value,
        type: document.querySelector('input[name="type"]:checked').value,
        amount: amountValue
    };

    transactions.push(transaction);
    saveTransactions();
    updateUI();
    
    // Reset form
    e.target.reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('amountRaw').value = '0';
    
    showToast('Transaksi berhasil ditambahkan!');
}

// ==================== DELETE MODAL ====================

/**
 * Show delete confirmation modal
 */
function showDeleteModal(id) {
    deleteTargetId = id;
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteModal').classList.add('flex');
}

/**
 * Close delete confirmation modal
 */
function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deleteModal').classList.remove('flex');
}

/**
 * Confirm and execute delete
 */
function confirmDelete() {
    if (deleteTargetId) {
        transactions = transactions.filter(t => t.id !== deleteTargetId);
        saveTransactions();
        updateUI();
        closeDeleteModal();
        showToast('Transaksi berhasil dihapus!');
    }
}

// ==================== TOAST NOTIFICATION ====================

/**
 * Show toast notification
 */
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}

// ==================== EXPORT FUNCTIONS ====================

/**
 * Export transactions to CSV file
 */
function exportToCSV() {
    if (transactions.length === 0) {
        showToast('Tidak ada data untuk diexport!');
        return;
    }

    const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Nominal'];
    const rows = transactions.map(t => [
        t.date,
        `"${t.description}"`,
        t.category,
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        t.amount
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, 'dompet-digital-transaksi.csv');
    showToast('File CSV berhasil didownload!');
}

/**
 * Export transactions to XLSX (XML-based Excel) file
 */
function exportToXLSX() {
    if (transactions.length === 0) {
        showToast('Tidak ada data untuk diexport!');
        return;
    }

    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Transaksi">
<Table>
<Row>
<Cell><Data ss:Type="String">Tanggal</Data></Cell>
<Cell><Data ss:Type="String">Deskripsi</Data></Cell>
<Cell><Data ss:Type="String">Kategori</Data></Cell>
<Cell><Data ss:Type="String">Tipe</Data></Cell>
<Cell><Data ss:Type="String">Nominal</Data></Cell>
</Row>`;

    transactions.forEach(t => {
        xmlContent += `
<Row>
<Cell><Data ss:Type="String">${t.date}</Data></Cell>
<Cell><Data ss:Type="String">${t.description}</Data></Cell>
<Cell><Data ss:Type="String">${t.category}</Data></Cell>
<Cell><Data ss:Type="String">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</Data></Cell>
<Cell><Data ss:Type="Number">${t.amount}</Data></Cell>
</Row>`;
    });

    xmlContent += `
</Table>
</Worksheet>
</Workbook>`;

    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
    downloadFile(blob, 'dompet-digital-transaksi.xls');
    showToast('File Excel berhasil didownload!');
}

/**
 * Download file helper
 */
function downloadFile(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// ==================== IMPORT FUNCTIONS ====================

/**
 * Show import modal
 */
function showImportModal() {
    document.getElementById('importModal').classList.remove('hidden');
    document.getElementById('importModal').classList.add('flex');
    lucide.createIcons();
    setupDropZone();
}

/**
 * Close import modal
 */
function closeImportModal() {
    document.getElementById('importModal').classList.add('hidden');
    document.getElementById('importModal').classList.remove('flex');
    clearFileSelection();
}

/**
 * Setup drag and drop zone
 */
function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Remove existing listeners to prevent duplicates
    const newDropZone = dropZone.cloneNode(true);
    dropZone.parentNode.replaceChild(newDropZone, dropZone);
    
    const newFileInput = document.getElementById('fileInput');

    newDropZone.addEventListener('click', () => newFileInput.click());

    newDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        newDropZone.classList.add('border-amber-400', 'bg-amber-50');
    });

    newDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        newDropZone.classList.remove('border-amber-400', 'bg-amber-50');
    });

    newDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        newDropZone.classList.remove('border-amber-400', 'bg-amber-50');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    newFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

/**
 * Handle file selection
 */
function handleFileSelect(file) {
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
        showToast('Format file tidak didukung! Gunakan CSV, XLS, atau XLSX.');
        return;
    }

    selectedFile = file;
    
    // Show file info
    document.getElementById('dropZone').classList.add('hidden');
    document.getElementById('fileInfo').classList.remove('hidden');
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);

    // Parse file
    parseFile(file);
}

/**
 * Clear file selection
 */
function clearFileSelection() {
    selectedFile = null;
    pendingImportData = [];
    document.getElementById('fileInput').value = '';
    document.getElementById('dropZone').classList.remove('hidden');
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('importPreview').classList.add('hidden');
    document.getElementById('importBtn').disabled = true;
}

/**
 * Parse file based on extenyang ssion
 */
function parseFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (extension === 'csv') {
        parseCSV(file);
    } else if (extension === 'xls' || extension === 'xlsx') {
        parseExcel(file);
    }
}

/**
 * Parse CSV file
 */
function parseCSV(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                showToast('File CSV kosong atau tidak valid!');
                clearFileSelection();
                return;
            }

            const dataRows = lines.slice(1);
            pendingImportData = [];

            dataRows.forEach((line) => {
                const values = parseCSVLine(line);
                if (values.length >= 5) {
                    const transaction = parseRowToTransaction(values);
                    if (transaction) {
                        pendingImportData.push(transaction);
                    }
                }
            });

            showImportPreview();
        } catch (error) {
            showToast('Gagal membaca file CSV!');
            clearFileSelection();
        }
    };
    reader.readAsText(file);
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    
    return result;
}

/**
 * Parse Excel file
 */
function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length < 2) {
                showToast('File Excel kosong atau tidak valid!');
                clearFileSelection();
                return;
            }

            const dataRows = jsonData.slice(1);
            pendingImportData = [];

            dataRows.forEach((row) => {
                if (row.length >= 5) {
                    const transaction = parseRowToTransaction(row);
                    if (transaction) {
                        pendingImportData.push(transaction);
                    }
                }
            });

            showImportPreview();
        } catch (error) {
            showToast('Gagal membaca file Excel!');
            clearFileSelection();
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Parse row data to transaction object
 */
function parseRowToTransaction(values) {
    let [tanggal, deskripsi, kategori, tipe, nominal] = values;

    // Clean up values
    deskripsi = String(deskripsi || '').replace(/^"|"$/g, '').trim();
    kategori = String(kategori || '').trim();
    tipe = String(tipe || '').toLowerCase().trim();
    
    // Parse nominal
    if (typeof nominal === 'string') {
        nominal = parseInt(nominal.replace(/[^\d]/g, '')) || 0;
    } else {
        nominal = parseInt(nominal) || 0;
    }

    // Parse date
    let dateStr = '';
    if (tanggal) {
        if (typeof tanggal === 'number') {
            // Handle Excel date serial number
            const excelDate = new Date((tanggal - 25569) * 86400 * 1000);
            dateStr = excelDate.toISOString().split('T')[0];
        } else {
            const date = new Date(tanggal);
            if (!isNaN(date.getTime())) {
                dateStr = date.toISOString().split('T')[0];
            } else {
                dateStr = tanggal;
            }
        }
    }

    // Determine type
    let type = 'expense';
    if (tipe.includes('pemasukan') || tipe.includes('income') || tipe.includes('masuk')) {
        type = 'income';
    }

    // Validate
    if (!dateStr || !deskripsi || nominal <= 0) {
        return null;
    }

    return {
        id: generateId(),
        date: dateStr,
        description: deskripsi,
        category: kategori || 'Lainnya',
        type: type,
        amount: nominal
    };
}

/**
 * Show import preview
 */
function showImportPreview() {
    if (pendingImportData.length === 0) {
        showToast('Tidak ada data valid yang ditemukan!');
        clearFileSelection();
        return;
    }

    document.getElementById('importPreview').classList.remove('hidden');
    document.getElementById('previewCount').textContent = `${pendingImportData.length} transaksi akan diimport`;
    
    const previewList = document.getElementById('previewList');
    const previewItems = pendingImportData.slice(0, 5);
    
    previewList.innerHTML = previewItems.map(t => `
        <div class="flex justify-between items-center py-1 border-b border-gray-200 last:border-0">
            <span class="truncate flex-1">${t.description}</span>
            <span class="${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'} font-medium ml-2">
                ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
            </span>
        </div>
    `).join('');

    if (pendingImportData.length > 5) {
        previewList.innerHTML += `<p class="text-gray-400 text-center py-1">...dan ${pendingImportData.length - 5} transaksi lainnya</p>`;
    }

    document.getElementById('importBtn').disabled = false;
}

/**
 * Confirm and execute import
 */
function confirmImport() {
    if (pendingImportData.length === 0) {
        showToast('Tidak ada data untuk diimport!');
        return;
    }

    const importMode = document.querySelector('input[name="importMode"]:checked').value;

    if (importMode === 'replace') {
        transactions = [...pendingImportData];
    } else {
        transactions = [...transactions, ...pendingImportData];
    }

    saveTransactions();
    updateUI();
    closeImportModal();
    showToast(`${pendingImportData.length} transaksi berhasil diimport!`);
}

// ==================== INITIALIZATION ====================

/**
 * Initialize application
 */
function initApp() {
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Set default date to today
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    // Setup amount input formatting
    setupAmountInput();
    
    // Load transactions from localStorage
    loadTransactions();
    
    // Setup form submission
    document.getElementById('transactionForm').addEventListener('submit', handleFormSubmit);
    
    // Setup search and filter
    document.getElementById('searchInput').addEventListener('input', renderTransactions);
    document.getElementById('filterType').addEventListener('change', renderTransactions);
    
    // Close modal on outside click
    document.getElementById('deleteModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeDeleteModal();
        }
    });

    document.getElementById('importModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeImportModal();
        }
    });
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);