// ==================== //
// Data & State
// ==================== //
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    name: 'User',
    dailyTarget: 0,
    theme: 'light',
    balanceHidden: false
};

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let editingTransaction = null;

// Categories
const categories = {
    income: [
        { id: 'salary', name: 'Gaji', icon: 'fa-briefcase', color: '#48bb78' },
        { id: 'bonus', name: 'Bonus', icon: 'fa-gift', color: '#38a169' },
        { id: 'investment', name: 'Investasi', icon: 'fa-chart-line', color: '#2f855a' },
        { id: 'freelance', name: 'Freelance', icon: 'fa-laptop', color: '#276749' },
        { id: 'other_income', name: 'Lainnya', icon: 'fa-plus-circle', color: '#22543d' }
    ],
    expense: [
        { id: 'food', name: 'Makanan', icon: 'fa-utensils', color: '#f56565' },
        { id: 'transport', name: 'Transportasi', icon: 'fa-car', color: '#ed8936' },
        { id: 'shopping', name: 'Belanja', icon: 'fa-shopping-bag', color: '#ecc94b' },
        { id: 'bills', name: 'Tagihan', icon: 'fa-file-invoice', color: '#9f7aea' },
        { id: 'entertainment', name: 'Hiburan', icon: 'fa-gamepad', color: '#667eea' },
        { id: 'health', name: 'Kesehatan', icon: 'fa-medkit', color: '#fc8181' },
        { id: 'education', name: 'Pendidikan', icon: 'fa-graduation-cap', color: '#4fd1c5' },
        { id: 'other_expense', name: 'Lainnya', icon: 'fa-ellipsis-h', color: '#a0aec0' }
    ]
};

// ==================== //
// Initialization
// ==================== //
document.addEventListener('DOMContentLoaded', () => {
    // Apply theme
    if (settings.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Hide splash screen after load
    setTimeout(() => {
        document.getElementById('splash').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }, 1500);
    
    // Set current date
    updateCurrentDate();
    
    // Update greeting
    updateGreeting();
    
    // Initialize data
    updateDashboard();
    updateTransactionsList();
    
    // Set default date/time in form
    setDefaultDateTime();
    
    // Update category options
    updateCategoryOptions('expense');
    
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js');
    }
});

// ==================== //
// Helper Functions
// ==================== //
function formatCurrency(amount) {
    return 'Rp ' + amount.toLocaleString('id-ID');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

function formatTime(timeStr) {
    return timeStr;
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getCategoryInfo(categoryId, type) {
    const categoryList = categories[type];
    return categoryList.find(c => c.id === categoryId) || categoryList[categoryList.length - 1];
}

// ==================== //
// UI Updates
// ==================== //
function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('id-ID', options);
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Selamat Malam';
    
    if (hour >= 5 && hour < 12) greeting = 'Selamat Pagi';
    else if (hour >= 12 && hour < 15) greeting = 'Selamat Siang';
    else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
    
    document.getElementById('greeting-text').textContent = `${greeting}, ${settings.name}! 👋`;
}

function updateDashboard() {
    const today = getToday();
    
    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    let todayIncome = 0;
    let todayExpense = 0;
    let todayCount = 0;
    
    transactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += t.amount;
            if (t.date === today) {
                todayIncome += t.amount;
                todayCount++;
            }
        } else {
            totalExpense += t.amount;
            if (t.date === today) {
                todayExpense += t.amount;
                todayCount++;
            }
        }
    });
    
    const totalBalance = totalIncome - totalExpense;
    const todayNet = todayIncome - todayExpense;
    
    // Update UI
    const balanceEl = document.getElementById('total-balance');
    if (settings.balanceHidden) {
        balanceEl.textContent = '••••••••';
        balanceEl.classList.add('hidden-balance');
    } else {
        balanceEl.textContent = formatCurrency(totalBalance);
        balanceEl.classList.remove('hidden-balance');
    }
    
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expense').textContent = formatCurrency(totalExpense);
    document.getElementById('today-income').textContent = formatCurrency(todayIncome);
    document.getElementById('today-expense').textContent = formatCurrency(todayExpense);
    document.getElementById('today-net').textContent = formatCurrency(todayNet);
    document.getElementById('today-count').textContent = `${todayCount} transaksi`;
    
    // Color for today net
    const todayNetEl = document.getElementById('today-net');
    todayNetEl.style.color = todayNet >= 0 ? 'var(--income)' : 'var(--expense)';
}

function updateTransactionsList() {
    const list = document.getElementById('transactions-list');
    const recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
        .slice(0, 5);
    
    if (recentTransactions.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Belum ada transaksi</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = recentTransactions.map(t => createTransactionItem(t)).join('');
}

function createTransactionItem(transaction) {
    const category = getCategoryInfo(transaction.category, transaction.type);
    const isIncome = transaction.type === 'income';
    
    return `
        <div class="transaction-item" onclick="showTransactionDetail('${transaction.id}')">
            <div class="transaction-icon ${transaction.type}">
                <i class="fas ${category.icon}"></i>
            </div>
            <div class="transaction-info">
                <h4>${transaction.description || category.name}</h4>
                <p>${category.name} • ${formatDate(transaction.date)}</p>
            </div>
            <div class="transaction-amount">
                <strong class="${transaction.type}">${isIncome ? '+' : '-'} ${formatCurrency(transaction.amount)}</strong>
                <span>${transaction.time}</span>
            </div>
        </div>
    `;
}

// ==================== //
// Modal Functions
// ==================== //
function showAddTransaction(type = 'expense') {
    document.getElementById('modal-title').textContent = 'Tambah Transaksi';
    document.getElementById('transaction-form').reset();
    setDefaultDateTime();
    
    if (type === 'income') {
        document.getElementById('type-income').checked = true;
    } else {
        document.getElementById('type-expense').checked = true;
    }
    
    updateCategoryOptions(type);
    editingTransaction = null;
    openModal('add-modal');
}

function updateCategoryOptions(type) {
    const select = document.getElementById('category');
    const categoryList = categories[type];
    
    select.innerHTML = '<option value="">Pilih Kategori</option>' +
        categoryList.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// Listen for type change
document.querySelectorAll('input[name="type"]').forEach(input => {
    input.addEventListener('change', (e) => {
        updateCategoryOptions(e.target.value);
    });
});

function setDefaultDateTime() {
    const now = new Date();
    document.getElementById('date').value = now.toISOString().split('T')[0];
    document.getElementById('time').value = now.toTimeString().slice(0, 5);
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== //
// Transaction CRUD
// ==================== //
function saveTransaction(event) {
    event.preventDefault();
    
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseInt(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    
    if (!category) {
        showToast('Pilih kategori!', 'error');
        return;
    }
    
    if (editingTransaction) {
        // Update existing
        const index = transactions.findIndex(t => t.id === editingTransaction);
        if (index !== -1) {
            transactions[index] = {
                ...transactions[index],
                type, amount, category, description, date, time
            };
        }
        showToast('Transaksi berhasil diperbarui!');
    } else {
        // Add new
        const transaction = {
            id: generateId(),
            type,
            amount,
            category,
            description,
            date,
            time,
            createdAt: new Date().toISOString()
        };
        transactions.push(transaction);
        showToast('Transaksi berhasil ditambahkan!');
    }
    
    saveData();
    updateDashboard();
    updateTransactionsList();
    closeModal('add-modal');
}

function showTransactionDetail(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    editingTransaction = id;
    
    document.getElementById('modal-title').textContent = 'Edit Transaksi';
    document.getElementById(`type-${transaction.type}`).checked = true;
    updateCategoryOptions(transaction.type);
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('category').value = transaction.category;
    document.getElementById('description').value = transaction.description;
    document.getElementById('date').value = transaction.date;
    document.getElementById('time').value = transaction.time;
    
    openModal('add-modal');
}

function deleteTransaction(id) {
    showConfirm('Hapus Transaksi?', 'Transaksi ini akan dihapus permanen.', () => {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateDashboard();
        updateTransactionsList();
        updateAllTransactionsList();
        showToast('Transaksi berhasil dihapus!');
    });
}

// ==================== //
// All Transactions
// ==================== //
function showAllTransactions() {
    updateAllTransactionsList();
    updateFilterCategories();
    openModal('all-transactions-modal');
}

function updateAllTransactionsList() {
    const list = document.getElementById('all-transactions-list');
    const sortedTransactions = [...transactions]
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    if (sortedTransactions.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Belum ada transaksi</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = sortedTransactions.map(t => createTransactionItem(t)).join('');
}

function updateFilterCategories() {
    const select = document.getElementById('filter-category');
    const allCategories = [...categories.income, ...categories.expense];
    
    select.innerHTML = '<option value="all">Semua Kategori</option>' +
        allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function filterTransactions() {
    const search = document.getElementById('search-transaction').value.toLowerCase();
    const typeFilter = document.getElementById('filter-type').value;
    const categoryFilter = document.getElementById('filter-category').value;
    
    const list = document.getElementById('all-transactions-list');
    
    let filtered = transactions.filter(t => {
        const matchSearch = t.description.toLowerCase().includes(search) ||
            getCategoryInfo(t.category, t.type).name.toLowerCase().includes(search);
        const matchType = typeFilter === 'all' || t.type === typeFilter;
        const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
        
        return matchSearch && matchType && matchCategory;
    });
    
    filtered = filtered.sort((a, b) => 
        new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
    );
    
    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Tidak ada transaksi yang cocok</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = filtered.map(t => createTransactionItem(t)).join('');
}

// ==================== //
// Schedule / Calendar
// ==================== //
function showSchedule() {
    generateCalendar();
    updateMonthSummary();
    openModal('schedule-modal');
}

function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    document.getElementById('calendar-month').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
    
    // Day headers
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    let html = dayNames.map(d => `<div class="calendar-header">${d}</div>`).join('');
    
    // Get first day of month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTransactions = transactions.filter(t => t.date === dateStr);
        const hasIncome = dayTransactions.some(t => t.type === 'income');
        const hasExpense = dayTransactions.some(t => t.type === 'expense');
        
        let classes = 'calendar-day';
        if (today.getDate() === day && today.getMonth() === currentMonth && 
            today.getFullYear() === currentYear) {
            classes += ' today';
        }
        if (hasIncome) classes += ' has-income';
        if (hasExpense) classes += ' has-expense';
        if (selectedDate === dateStr) classes += ' selected';
        
        html += `<div class="${classes}" onclick="selectDate('${dateStr}')">${day}</div>`;
    }
    
    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    calendar.innerHTML = html;
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    generateCalendar();
    updateMonthSummary();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    generateCalendar();
    updateMonthSummary();
}

function selectDate(dateStr) {
    selectedDate = dateStr;
    generateCalendar();
    showDailyDetail(dateStr);
}

function showDailyDetail(dateStr) {
    const detail = document.getElementById('daily-detail');
    const dayTransactions = transactions.filter(t => t.date === dateStr);
    
    if (dayTransactions.length === 0) {
        detail.innerHTML = `
            <h4>📅 ${formatDate(dateStr)}</h4>
            <div class="empty-state">
                <p>Tidak ada transaksi</p>
            </div>
        `;
        return;
    }
    
    const income = dayTransactions.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTransactions.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    detail.innerHTML = `
        <h4>📅 ${formatDate(dateStr)}</h4>
        <div class="today-card">
            <div class="today-stat">
                <div class="today-icon income">
                    <i class="fas fa-arrow-down"></i>
                </div>
                <div class="today-info">
                    <span>Pemasukan</span>
                    <strong>${formatCurrency(income)}</strong>
                </div>
            </div>
            <div class="today-stat">
                <div class="today-icon expense">
                    <i class="fas fa-arrow-up"></i>
                </div>
                <div class="today-info">
                    <span>Pengeluaran</span>
                    <strong>${formatCurrency(expense)}</strong>
                </div>
            </div>
            <div class="today-net">
                <span>Sisa</span>
                <strong style="color: ${income - expense >= 0 ? 'var(--income)' : 'var(--expense)'}">
                    ${formatCurrency(income - expense)}
                </strong>
            </div>
        </div>
        <div class="transactions-list" style="margin-top: 15px;">
            ${dayTransactions.map(t => createTransactionItem(t)).join('')}
        </div>
    `;
}

function updateMonthSummary() {
    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const income = monthTransactions.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate daily average
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyAverage = Math.round((income - expense) / daysInMonth);
    
    // Find best day
    const dailyTotals = {};
    monthTransactions.forEach(t => {
        if (!dailyTotals[t.date]) {
            dailyTotals[t.date] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            dailyTotals[t.date].income += t.amount;
        } else {
            dailyTotals[t.date].expense += t.amount;
        }
    });
    
    let bestDay = '-';
    let bestAmount = -Infinity;
    Object.entries(dailyTotals).forEach(([date, totals]) => {
        const net = totals.income - totals.expense;
        if (net > bestAmount) {
            bestAmount = net;
            bestDay = formatDate(date);
        }
    });
    
    document.getElementById('month-income').textContent = formatCurrency(income);
    document.getElementById('month-expense').textContent = formatCurrency(expense);
    document.getElementById('daily-average').textContent = formatCurrency(dailyAverage);
    document.getElementById('best-day').textContent = bestDay;
}

// ==================== //
// Reports
// ==================== //
function showReport() {
    switchReportTab('weekly');
    openModal('report-modal');
}

function switchReportTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const content = document.getElementById('report-content');
    
    switch(tab) {
        case 'weekly':
            content.innerHTML = generateWeeklyReport();
            break;
        case 'monthly':
            content.innerHTML = generateMonthlyReport();
            break;
        case 'category':
            content.innerHTML = generateCategoryReport();
            break;
    }
}

function generateWeeklyReport() {
    const weeks = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date >= weekStart && date <= weekEnd;
        });
        
        const income = weekTransactions.filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = weekTransactions.filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        weeks.push({
            label: `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
            income,
            expense
        });
    }
    
    const maxAmount = Math.max(...weeks.flatMap(w => [w.income, w.expense])) || 1;
    
    return weeks.map(w => `
        <div class="chart-bar">
            <div class="chart-bar-label">${w.label}</div>
            <div class="chart-bar-container">
                <div class="chart-bar-income" style="width: ${(w.income / maxAmount) * 100}%"></div>
            </div>
            <div class="chart-bar-value" style="color: var(--income)">${formatCurrency(w.income)}</div>
        </div>
        <div class="chart-bar">
            <div class="chart-bar-label"></div>
            <div class="chart-bar-container">
                <div class="chart-bar-expense" style="width: ${(w.expense / maxAmount) * 100}%"></div>
            </div>
            <div class="chart-bar-value" style="color: var(--expense)">${formatCurrency(w.expense)}</div>
        </div>
    `).join('');
}

function generateMonthlyReport() {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        
        const monthTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date >= month && date <= monthEnd;
        });
        
        const income = monthTransactions.filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
            'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        
        months.push({
            label: monthNames[month.getMonth()],
            income,
            expense
        });
    }
    
    const maxAmount = Math.max(...months.flatMap(m => [m.income, m.expense])) || 1;
    
    return months.map(m => `
        <div class="chart-bar">
            <div class="chart-bar-label">${m.label}</div>
            <div class="chart-bar-container">
                <div class="chart-bar-income" style="width: ${(m.income / maxAmount) * 50}%"></div>
                <div class="chart-bar-expense" style="width: ${(m.expense / maxAmount) * 50}%"></div>
            </div>
            <div class="chart-bar-value">
                <span style="color: var(--income)">+${(m.income/1000).toFixed(0)}k</span> /
                <span style="color: var(--expense)">-${(m.expense/1000).toFixed(0)}k</span>
            </div>
        </div>
    `).join('');
}

function generateCategoryReport() {
    const categoryTotals = {};
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
        if (!categoryTotals[t.category]) {
            categoryTotals[t.category] = 0;
        }
        categoryTotals[t.category] += t.amount;
    });
    
    const total = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0) || 1;
    const sorted = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    if (sorted.length === 0) {
        return '<div class="empty-state"><p>Belum ada data pengeluaran</p></div>';
    }
    
    const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#4fd1c5', 
        '#667eea', '#9f7aea', '#ed64a6'];
    
    return `<div class="category-chart">${sorted.map(([catId, amount], index) => {
        const category = getCategoryInfo(catId, 'expense');
        const percentage = ((amount / total) * 100).toFixed(1);
        
        return `
            <div class="category-item">
                <div class="category-icon" style="color: ${colors[index]}">
                    <i class="fas ${category.icon}"></i>
                </div>
                <div class="category-info">
                    <h5>${category.name}</h5>
                    <div class="category-progress">
                        <div class="category-progress-bar" 
                             style="width: ${percentage}%; background: ${colors[index]}"></div>
                    </div>
                </div>
                <div class="category-value">
                    <strong>${formatCurrency(amount)}</strong>
                    <span>${percentage}%</span>
                </div>
            </div>
        `;
    }).join('')}</div>`;
}

// ==================== //
// Export Data
// ==================== //
function exportData(format) {
    if (transactions.length === 0) {
        showToast('Tidak ada data untuk diekspor', 'error');
        return;
    }
    
    let content, filename, type;
    
    if (format === 'csv') {
        const headers = ['Tanggal', 'Waktu', 'Jenis', 'Kategori', 'Keterangan', 'Jumlah'];
        const rows = transactions.map(t => [
            t.date,
            t.time,
            t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
            getCategoryInfo(t.category, t.type).name,
            t.description,
            t.amount
        ]);
        
        content = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `keuangan_${getToday()}.csv`;
        type = 'text/csv';
    } else {
        content = JSON.stringify({ transactions, settings }, null, 2);
        filename = `keuangan_${getToday()}.json`;
        type = 'application/json';
    }
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast(`Data berhasil diekspor ke ${filename}`);
}

// ==================== //
// Settings
// ==================== //
function showSettings() {
    document.getElementById('display-name').textContent = settings.name;
    document.getElementById('display-target').textContent = formatCurrency(settings.dailyTarget);
    document.getElementById('display-theme').textContent = settings.theme === 'dark' ? 'Gelap' : 'Terang';
    openModal('settings-modal');
}

function toggleBalance() {
    settings.balanceHidden = !settings.balanceHidden;
    const icon = document.getElementById('eye-icon');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
    saveSettings();
    updateDashboard();
}

function changeName() {
    const name = prompt('Masukkan nama Anda:', settings.name);
    if (name && name.trim()) {
        settings.name = name.trim();
        saveSettings();
        updateGreeting();
        document.getElementById('display-name').textContent = settings.name;
        showToast('Nama berhasil diubah!');
    }
}

function changeTarget() {
    const target = prompt('Masukkan target pendapatan harian:', settings.dailyTarget);
    if (target !== null) {
        settings.dailyTarget = parseInt(target) || 0;
        saveSettings();
        document.getElementById('display-target').textContent = formatCurrency(settings.dailyTarget);
        showToast('Target berhasil diubah!');
    }
}

function toggleTheme() {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.getElementById('display-theme').textContent = 
        settings.theme === 'dark' ? 'Gelap' : 'Terang';
    saveSettings();
}

function clearAllData() {
    showConfirm('Hapus Semua Data?', 
        'Semua transaksi akan dihapus permanen dan tidak dapat dikembalikan!', 
        () => {
            transactions = [];
            saveData();
            updateDashboard();
            updateTransactionsList();
            closeModal('settings-modal');
            showToast('Semua data berhasil dihapus!');
        }
    );
}

function backupData() {
    const backup = {
        transactions,
        settings,
        backupDate: new Date().toISOString()
    };
    
    const content = JSON.stringify(backup, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_keuangan_${getToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Backup berhasil dibuat!');
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const backup = JSON.parse(e.target.result);
            
            if (backup.transactions) {
                showConfirm('Restore Data?', 
                    'Data saat ini akan diganti dengan data dari backup.',
                    () => {
                        transactions = backup.transactions;
                        if (backup.settings) {
                            settings = { ...settings, ...backup.settings };
                            saveSettings();
                            if (settings.theme === 'dark') {
                                document.documentElement.setAttribute('data-theme', 'dark');
                            }
                        }
                        saveData();
                        updateDashboard();
                        updateTransactionsList();
                        updateGreeting();
                        closeModal('settings-modal');
                        showToast('Data berhasil dipulihkan!');
                    }
                );
            } else {
                showToast('File backup tidak valid!', 'error');
            }
        } catch (err) {
            showToast('Gagal membaca file backup!', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==================== //
// Utility Functions
// ==================== //
function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(settings));
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.classList.remove('error');
    if (type === 'error') {
        toast.classList.add('error');
    }
    
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function showConfirm(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    const confirmBtn = document.getElementById('confirm-btn');
    confirmBtn.onclick = () => {
        closeModal('confirm-modal');
        onConfirm();
    };
    
    openModal('confirm-modal');
}

function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    switch(tab) {
        case 'home':
            // Already on home
            break;
        case 'transactions':
            showAllTransactions();
            break;
        case 'schedule':
            showSchedule();
            break;
        case 'profile':
            showSettings();
            break;
    }
}

// Close modal when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});