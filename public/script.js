// script.js

// Utility Functions
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const log = message => console.log(`[Tracker] ${message}`);
const error = message => console.error(`[Tracker Error] ${message}`);

function showPopup(id, message) {
    const popup = $(`#${id}`);
    if (!popup) return error(`Popup with ID ${id} not found`);
    const content = popup.querySelector('.popup-content p');
    if (content) content.textContent = message;
    popup.style.display = 'block';
    const redirectBtn = $('#login-redirect-btn');
    if (id === 'login-popup' && redirectBtn) {
        redirectBtn.onclick = () => window.location.href = 'login.html';
    }
    const closeBtn = $('#success-close-btn');
    if (closeBtn) closeBtn.onclick = () => popup.style.display = 'none';
    setTimeout(() => popup.style.display = 'none', 3000);
}

// Session Management
const SessionManager = {
    setUserId(userId) { 
        localStorage.setItem('userId', userId);
        log(`UserId set: ${userId}`);
    },
    getUserId() { 
        const userId = localStorage.getItem('userId');
        log(`Getting userId: ${userId}`);
        return userId;
    },
    setToken(token) { 
        localStorage.setItem('token', token);
        log(`Token set: ${token}`);
    },
    getToken() { 
        const token = localStorage.getItem('token');
        log(`Getting token: ${token}`);
        return token;
    },
    clearSession() {
        log('Clearing session');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('avatar');
        log('Session cleared');
    },
    isLoggedIn() { 
        const loggedIn = !!this.getUserId() && !!this.getToken();
        log(`isLoggedIn: ${loggedIn}`);
        return loggedIn;
    }
};

// UI Manager
const UIManager = {
    init() {
        log('UIManager.init called');
        const isLoggedIn = SessionManager.isLoggedIn();
        const isAuthPage = window.location.pathname.includes('signup.html') || window.location.pathname.includes('login.html');

        if (!isLoggedIn && !isAuthPage) {
            log('User not logged in, showing login popup');
            showPopup('login-popup', 'Access restricted. Please log in to continue.');
            return;
        }

        this.setupEventListeners();
        this.updateYearFilter();
        if (window.location.pathname.includes('tracker.html')) {
            log('Initializing tracker page');
            this.renderTrackerTable();
            this.loadAvatar();
        }
        if (window.location.pathname.includes('calculation.html')) this.updateCalculationPage();
        if (window.location.pathname.includes('graph.html')) this.renderChart();
    },

    setupEventListeners() {
        log('Setting up event listeners');

        const signupForm = $('#signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', async e => {
                e.preventDefault();
                const inputs = signupForm.querySelectorAll('input');
                const username = inputs[0].value.trim();
                const email = inputs[1].value.trim();
                const password = inputs[2].value;
                try {
                    const response = await fetch('/api/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, email, password })
                    });
                    const data = await response.json();
                    showPopup('success-popup', data.message);
                    if (response.ok) setTimeout(() => window.location.href = 'login.html', 2000);
                } catch (err) {
                    error(`Signup error: ${err.message}`);
                    showPopup('success-popup', 'Signup failed. Try again.');
                }
            });
        }

        const loginForm = $('#login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async e => {
                e.preventDefault();
                const inputs = loginForm.querySelectorAll('input');
                const identifier = inputs[0].value.trim();
                const password = inputs[1].value;
                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ identifier, password })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        SessionManager.setUserId(data.userId);
                        SessionManager.setToken(data.token);
                        showPopup('success-popup', data.message);
                        setTimeout(() => window.location.href = 'tracker.html', 2000);
                    } else {
                        showPopup('success-popup', data.message);
                    }
                } catch (err) {
                    error(`Login error: ${err.message}`);
                    showPopup('success-popup', 'Login failed. Try again.');
                }
            });
        }

        const entryForm = $('#entry-form');
        if (entryForm) {
            entryForm.addEventListener('submit', async e => {
                e.preventDefault();
                log('Form submitted');
                const userId = SessionManager.getUserId();
                const token = SessionManager.getToken();
                if (!userId || !token) {
                    log('User not logged in');
                    showPopup('login-popup', 'Please log in to add entries.');
                    return;
                }

                // Collect form data
                const expenseItem = $('#expense-item').value === 'Custom' ? $('#expense-custom').value.trim() : $('#expense-item').value;
                const expenseAmount = parseFloat($('#expense-amount').value) || 0;
                const expenseDate = $('#expense-date').value || new Date().toISOString().split('T')[0];
                const savingItem = $('#saving-item').value === 'Custom' ? $('#saving-custom').value.trim() : $('#saving-item').value;
                const savingAmount = parseFloat($('#saving-amount').value) || 0;
                const savingDate = $('#saving-date').value || new Date().toISOString().split('T')[0];

                // Validate form data
                if (!expenseItem && !savingItem) {
                    showPopup('success-popup', 'Please provide at least an expense item or saving item.');
                    return;
                }

                const entryData = {
                    expenseItem: expenseItem || null,
                    expenseAmount,
                    expenseDate: expenseDate ? new Date(expenseDate).toISOString() : null,
                    savingOption: savingItem || null,
                    savingAmount,
                    savingDate: savingDate ? new Date(savingDate).toISOString() : null,
                };

                log('Form data to send:', entryData);

                try {
                    const response = await fetch('/api/entries', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify(entryData),
                    });

                    log('API response status:', response.status);
                    const data = await response.json();
                    log('API response data:', data);

                    if (response.ok) {
                        showPopup('success-popup', data.message);
                        entryForm.reset();
                        $$('.custom-input').forEach(input => (input.style.display = 'none'));
                        this.renderTrackerTable();
                    } else {
                        showPopup('success-popup', data.message || 'Failed to add entry.');
                    }
                } catch (err) {
                    error(`Add entry error: ${err.message}`);
                    showPopup('success-popup', 'Failed to add entry. Please try again.');
                }
            });
        }

        const uploadBtn = $('#upload-avatar-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                log('Upload avatar button clicked');
                const fileInput = $('#avatar-upload');
                if (!fileInput) {
                    error('File input not found');
                    return;
                }
                fileInput.click();
            });
        }

        const fileInput = $('#avatar-upload');
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                log('File input changed');
                this.uploadAvatarHandler();
            });
        }

        const expenseSelect = $('#expense-item');
        if (expenseSelect) {
            expenseSelect.addEventListener('change', () => {
                const custom = $('#expense-custom');
                if (custom) custom.style.display = expenseSelect.value === 'Custom' ? 'block' : 'none';
            });
        }

        const savingSelect = $('#saving-item');
        if (savingSelect) {
            savingSelect.addEventListener('change', () => {
                const custom = $('#saving-custom');
                if (custom) custom.style.display = savingSelect.value === 'Custom' ? 'block' : 'none';
            });
        }

        const timeFilter = $('#time-filter');
        if (timeFilter) {
            timeFilter.addEventListener('change', () => {
                const monthFilter = $('#month-filter');
                if (monthFilter) monthFilter.style.display = timeFilter.value === 'month' ? 'block' : 'none';
                if (window.location.pathname.includes('calculation.html')) this.updateCalculationPage();
                if (window.location.pathname.includes('graph.html')) this.renderChart();
            });
        }

        const monthFilter = $('#month-filter');
        if (monthFilter) monthFilter.addEventListener('change', () => {
            if (window.location.pathname.includes('calculation.html')) this.updateCalculationPage();
            if (window.location.pathname.includes('graph.html')) this.renderChart();
        });

        const yearFilter = $('#year-filter');
        if (yearFilter) yearFilter.addEventListener('change', () => {
            if (window.location.pathname.includes('calculation.html')) this.updateCalculationPage();
            if (window.location.pathname.includes('graph.html')) this.renderChart();
        });

        const exportButtons = $$('#export-btn');
        exportButtons.forEach(btn => btn.addEventListener('click', () => this.exportToCSV()));

        this.setupLogoutButton();
    },

    setupLogoutButton() {
        log('Setting up logout button');
        const logoutBtn = $('#logout-btn');
        if (logoutBtn) {
            log('Logout button found, attaching event listener');
            logoutBtn.addEventListener('click', () => {
                log('Logout button clicked');
                SessionManager.clearSession();
                log('Redirecting to index.html');
                window.location.href = 'index.html';
            });
        } else {
            error('Logout button not found in DOM');
        }
    },

    updateYearFilter() {
        const yearFilter = $('#year-filter');
        if (!yearFilter) return;

        const currentYear = new Date().getFullYear();
        const startYear = 2021;
        const endYear = currentYear + 1;

        yearFilter.innerHTML = '';
        for (let year = endYear; year >= startYear; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            yearFilter.appendChild(option);
        }
    },

    async renderTrackerTable() {
        log('renderTrackerTable called');
        const tbody = $('#tracker-body');
        const userId = SessionManager.getUserId();
        const token = SessionManager.getToken();

        if (!tbody) {
            error('Table body element (#tracker-body) not found');
            return;
        }

        if (!userId || !token) {
            error('User not logged in: userId or token missing');
            showPopup('login-popup', 'Please log in to view your entries.');
            return;
        }

        log(`Fetching entries for userId: ${userId}`);
        tbody.innerHTML = '<tr><td colspan="5">Loading entries...</td></tr>';

        try {
            const response = await fetch(`/api/entries/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            log(`API response status: ${response.status}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to fetch entries: ${errorData.message || response.statusText}`);
            }

            const entries = await response.json();
            log('Fetched entries:', entries);

            if (!Array.isArray(entries)) {
                throw new Error('Entries data is not an array');
            }

            if (entries.length === 0) {
                log('No entries found for this user');
                tbody.innerHTML = '<tr><td colspan="5">No recent entries found.</td></tr>';
                return;
            }

            // Sort entries by date (use expenseDate or savingDate)
            entries.sort((a, b) => {
                const dateA = new Date(a.expenseDate || a.savingDate || 0);
                const dateB = new Date(b.expenseDate || b.savingDate || 0);
                return dateB - dateA;
            });

            log('Sorted entries:', entries);

            tbody.innerHTML = '';

            // Display up to 5 most recent entries
            entries.slice(0, 5).forEach((entry, index) => {
                log(`Rendering entry ${index}:`, entry);

                // Determine if this is an expense or saving entry
                const isExpenseEntry = entry.expenseItem && entry.expenseAmount > 0;
                const isSavingEntry = entry.savingOption && entry.savingAmount > 0;

                // Use the appropriate date for display
                const displayDate = entry.expenseDate
                    ? new Date(entry.expenseDate).toLocaleDateString('en-IN')
                    : entry.savingDate
                    ? new Date(entry.savingDate).toLocaleDateString('en-IN')
                    : '-';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${displayDate}</td>
                    <td>${entry.expenseItem || '-'}</td>
                    <td>₹${(entry.expenseAmount || 0).toLocaleString('en-IN')}</td>
                    <td>${entry.savingOption || '-'}</td>
                    <td>₹${(entry.savingAmount || 0).toLocaleString('en-IN')}</td>
                `;
                tbody.appendChild(row);
            });

            log('Table updated successfully');
        } catch (err) {
            error(`Render tracker table error: ${err.message}`);
            tbody.innerHTML = '<tr><td colspan="5">Failed to load entries. Please try again.</td></tr>';
            showPopup('success-popup', 'Failed to load entries. Please try again.');
        }
    },

    uploadAvatarHandler() {
        log('uploadAvatarHandler called');
        const fileInput = $('#avatar-upload');
        if (!fileInput) {
            error('File input not found');
            showPopup('success-popup', 'File input not found. Please try again.');
            return;
        }

        const file = fileInput.files[0];
        if (!file) {
            log('No file selected');
            showPopup('success-popup', 'Please select an image to upload!');
            return;
        }

        if (!file.type.startsWith('image/')) {
            log('Invalid file type:', file.type);
            showPopup('success-popup', 'Only images are allowed!');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            log('File too large:', file.size);
            showPopup('success-popup', 'File size must be less than 2MB!');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            log('Image read successfully, data URL length:', dataUrl.length);
            const img = $('#profile-avatar');
            if (img) {
                img.src = dataUrl;
                localStorage.setItem('avatar', dataUrl);
                log('Avatar updated and saved to localStorage');
                showPopup('success-popup', 'Avatar uploaded successfully!');
            } else {
                error('Profile avatar element not found');
                showPopup('success-popup', 'Failed to update avatar. Please try again.');
            }
        };
        reader.onerror = () => {
            error('Error reading file');
            showPopup('success-popup', 'Failed to read the image. Please try again.');
        };
        reader.readAsDataURL(file);
    },

    loadAvatar() {
        log('loadAvatar called');
        const savedAvatar = localStorage.getItem('avatar');
        const avatarImg = $('#profile-avatar');
        if (savedAvatar && avatarImg) {
            avatarImg.src = savedAvatar;
            log('Avatar loaded from localStorage');
        } else {
            log('No saved avatar found or avatar element missing');
        }
    },

    async updateCalculationPage() {
        const tbody = $('#table-body');
        const userId = SessionManager.getUserId();
        const token = SessionManager.getToken();
        if (!tbody || !userId || !token) return;

        const filter = $('#time-filter')?.value || 'week';
        const month = $('#month-filter')?.value || '0';
        const year = parseInt($('#year-filter')?.value) || new Date().getFullYear();
        tbody.innerHTML = '';
        try {
            const response = await fetch(`/api/entries/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const entries = await response.json();
            log('Fetched entries for calculation:', entries);
            const filteredEntries = this.filterEntries(entries, filter, month, year);
            const totals = this.calculateTotals(filteredEntries);

            filteredEntries.forEach(entry => {
                const row = document.createElement('tr');
                const total = entry.savingAmount - entry.expenseAmount;
                row.innerHTML = `
                    <td>${entry.expenseDate ? new Date(entry.expenseDate).toLocaleDateString() : entry.savingDate ? new Date(entry.savingDate).toLocaleDateString() : '-'}</td>
                    <td>${entry.expenseItem || '-'}</td>
                    <td>₹${entry.expenseAmount.toLocaleString('en-IN')}</td>
                    <td>${entry.savingOption || '-'}</td>
                    <td>₹${entry.savingAmount.toLocaleString('en-IN')}</td>
                    <td>₹${total.toLocaleString('en-IN')}</td>
                `;
                tbody.appendChild(row);
            });

            const totalExpense = $('#total-expense');
            const totalSaving = $('#total-saving');
            const netTotal = $('#net-total');
            if (totalExpense) totalExpense.textContent = `₹${totals.expense.toLocaleString('en-IN')}`;
            if (totalSaving) totalSaving.textContent = `₹${totals.saving.toLocaleString('en-IN')}`;
            if (netTotal) netTotal.textContent = `₹${totals.net.toLocaleString('en-IN')}`;
        } catch (err) {
            error(`Update calculation page error: ${err.message}`);
            showPopup('success-popup', 'Failed to load calculations.');
        }
    },

    async renderChart() {
        const isLoggedIn = SessionManager.isLoggedIn();
        if (!isLoggedIn) {
            showPopup('login-popup', 'Login required to view the graph.');
            return;
        }

        const canvas = $('#finance-chart');
        const chartLoading = $('#chart-loading');
        const userId = SessionManager.getUserId();
        const token = SessionManager.getToken();
        if (!canvas || !userId || !token) {
            error('Canvas, userId, or token missing');
            return;
        }

        const filter = $('#time-filter')?.value || 'week';
        const month = $('#month-filter')?.value || '0';
        const year = parseInt($('#year-filter')?.value) || new Date().getFullYear();

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            error('Failed to get canvas context');
            return;
        }

        if (chartLoading) chartLoading.style.display = 'block';

        try {
            const response = await fetch(`/api/entries/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Failed to fetch entries: ${response.status}`);
            const entries = await response.json();
            log('Raw entries from server:', entries);

            entries.forEach((entry, index) => {
                log(`Entry ${index}: expenseDate=${entry.expenseDate}, savingDate=${entry.savingDate}`);
            });

            const filteredEntries = this.filterEntries(entries, filter, month, year);
            log('Filtered entries:', filteredEntries);

            if (filteredEntries.length === 0) {
                showPopup('success-popup', 'No data available for the selected period.');
                if (chartLoading) chartLoading.style.display = 'none';
                return;
            }

            const labels = this.getChartLabels(filter, month, year);
            const expensesData = this.getChartData(filteredEntries, 'expense', filter, month, year);
            const savingsData = this.getChartData(filteredEntries, 'saving', filter, month, year);

            log('Chart labels:', labels);
            log('Expenses data:', expensesData);
            log('Savings data:', savingsData);

            if (window.financeChart) {
                window.financeChart.destroy();
                window.financeChart = null;
            }

            window.financeChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Expenses (₹)',
                            data: expensesData,
                            borderColor: '#e63946',
                            backgroundColor: 'rgba(230, 57, 70, 0.1)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 3,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#e63946',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2
                        },
                        {
                            label: 'Savings (₹)',
                            data: savingsData,
                            borderColor: '#2a9d8f',
                            backgroundColor: 'rgba(42, 157, 143, 0.1)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 3,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#2a9d8f',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₹)',
                                font: { size: 14, weight: 'bold' },
                                color: '#333'
                            },
                            ticks: {
                                stepSize: 500,
                                callback: value => `₹${value.toLocaleString('en-IN')}`,
                                font: { size: 12 },
                                color: '#666'
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Time',
                                font: { size: 14, weight: 'bold' },
                                color: '#333'
                            },
                            ticks: {
                                font: { size: 12 },
                                color: '#666',
                                maxRotation: 45,
                                minRotation: 45
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#333',
                                font: { size: 14, weight: 'bold' },
                                padding: 20,
                                boxWidth: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 12 },
                            padding: 10,
                            cornerRadius: 4,
                            callbacks: {
                                label: context => `${context.dataset.label}: ₹${context.parsed.y.toLocaleString('en-IN')}`
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeInOutQuart'
                    },
                    interaction: {
                        mode: 'nearest',
                        intersect: false,
                        axis: 'x'
                    },
                    hover: {
                        mode: 'nearest',
                        intersect: false
                    }
                }
            });

            log('Chart rendered successfully');
        } catch (err) {
            error(`Render chart error: ${err.message}`);
            showPopup('success-popup', 'Failed to load chart. Please try again.');
        } finally {
            if (chartLoading) chartLoading.style.display = 'none';
        }
    },

    filterEntries(entries, filterType, month, year) {
        const now = new Date();
        const startOfPeriod = new Date(now);
        const endOfPeriod = new Date(now);

        if (filterType === 'week') {
            startOfPeriod.setDate(now.getDate() - 6);
            startOfPeriod.setHours(0, 0, 0, 0);
            endOfPeriod.setHours(23, 59, 59, 999);
        } else if (filterType === 'month') {
            startOfPeriod.setFullYear(year);
            startOfPeriod.setMonth(parseInt(month));
            startOfPeriod.setDate(1);
            startOfPeriod.setHours(0, 0, 0, 0);
            endOfPeriod.setFullYear(year);
            endOfPeriod.setMonth(parseInt(month) + 1);
            endOfPeriod.setDate(0);
            endOfPeriod.setHours(23, 59, 59, 999);
        } else if (filterType === 'last6months') {
            startOfPeriod.setMonth(now.getMonth() - 5);
            startOfPeriod.setDate(1);
            startOfPeriod.setHours(0, 0, 0, 0);
            endOfPeriod.setHours(23, 59, 59, 999);
        }

        log(`Filter period: ${startOfPeriod.toISOString()} to ${endOfPeriod.toISOString()}`);

        return entries.filter(entry => {
            const entryDateStr = entry.expenseDate || entry.savingDate;
            if (!entryDateStr) {
                log('No date in entry:', entry);
                return false;
            }

            let entryDate;
            try {
                entryDate = new Date(entryDateStr);
                if (isNaN(entryDate.getTime())) {
                    entryDate = new Date(`${entryDateStr}T00:00:00Z`);
                }
                if (isNaN(entryDate.getTime())) {
                    throw new Error('Invalid date format');
                }
            } catch (err) {
                log(`Invalid date in entry: ${entryDateStr}`, entry);
                return false;
            }

            const isWithinPeriod = entryDate >= startOfPeriod && entryDate <= endOfPeriod;
            log(`Entry date ${entryDate.toISOString()} - Within period: ${isWithinPeriod}`);
            return isWithinPeriod;
        });
    },

    getChartLabels(filterType, month, year) {
        const now = new Date();
        const labels = [];
        if (filterType === 'week') {
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(now.getDate() - i);
                labels.push(date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
            }
        } else if (filterType === 'month') {
            const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                labels.push(`${i}`);
            }
        } else if (filterType === 'last6months') {
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now);
                date.setMonth(now.getMonth() - i);
                labels.push(date.toLocaleString('en-IN', { month: 'short', year: 'numeric' }));
            }
        }
        return labels;
    },

    getChartData(entries, type, filterType, month, year) {
        const now = new Date();
        let data = [];

        if (filterType === 'week') {
            data = Array(7).fill(0);
            const startDate = new Date(now);
            startDate.setDate(now.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            entries.forEach(entry => {
                const entryDate = new Date(entry.expenseDate || entry.savingDate);
                if (isNaN(entryDate.getTime())) return;
                if (entryDate >= startDate && entryDate <= now) {
                    const diffDays = Math.floor((entryDate - startDate) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 0 && diffDays < 7) {
                        data[diffDays] += type === 'expense' ? parseFloat(entry.expenseAmount) || 0 : parseFloat(entry.savingAmount) || 0;
                    }
                }
            });
        } else if (filterType === 'month') {
            const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();
            data = Array(daysInMonth).fill(0);
            entries.forEach(entry => {
                const entryDate = new Date(entry.expenseDate || entry.savingDate);
                if (isNaN(entryDate.getTime())) return;
                if (entryDate.getFullYear() === year && entryDate.getMonth() === parseInt(month)) {
                    const dayIndex = entryDate.getDate() - 1;
                    data[dayIndex] += type === 'expense' ? parseFloat(entry.expenseAmount) || 0 : parseFloat(entry.savingAmount) || 0;
                }
            });
        } else if (filterType === 'last6months') {
            data = Array(6).fill(0);
            const startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 5);
            startDate.setDate(1);
            entries.forEach(entry => {
                const entryDate = new Date(entry.expenseDate || entry.savingDate);
                if (isNaN(entryDate.getTime())) return;
                if (entryDate >= startDate && entryDate <= now) {
                    const diffMonths = (entryDate.getFullYear() - startDate.getFullYear()) * 12 + entryDate.getMonth() - startDate.getMonth();
                    if (diffMonths >= 0 && diffMonths < 6) {
                        data[diffMonths] += type === 'expense' ? parseFloat(entry.expenseAmount) || 0 : parseFloat(entry.savingAmount) || 0;
                    }
                }
            });
        }
        return data;
    },

    calculateTotals(entries) {
        return entries.reduce((totals, entry) => {
            totals.expense += parseFloat(entry.expenseAmount) || 0;
            totals.saving += parseFloat(entry.savingAmount) || 0;
            totals.net = totals.saving - totals.expense;
            return totals;
        }, { expense: 0, saving: 0, net: 0 });
    },

    exportToCSV() {
        const userId = SessionManager.getUserId();
        const token = SessionManager.getToken();
        if (!userId || !token) return;
        fetch(`/api/entries/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(entries => {
                let csv = 'Date,Expense Item,Expense Amount (₹),Saving Option,Saving Amount (₹)\n';
                entries.forEach(entry => {
                    csv += `${entry.expenseDate ? new Date(entry.expenseDate).toLocaleDateString() : entry.savingDate ? new Date(entry.savingDate).toLocaleDateString() : '-'},${entry.expenseItem || '-'},${entry.expenseAmount},${entry.savingOption || '-'},${entry.savingAmount}\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tracker_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            })
            .catch(err => error(`Export error: ${err.message}`));
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    log('DOM fully loaded, initializing app');
    const isLoggedIn = SessionManager.isLoggedIn();
    const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html');

    if (isLoggedIn && !isAuthPage) {
        log('User is logged in, adding logout button');
        const header = document.querySelector('header');
        if (header) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.textContent = 'Logout';
            logoutBtn.className = 'action-btn primary-btn';
            header.appendChild(logoutBtn);
            log('Logout button added to header');
        } else {
            error('Header element not found, cannot add logout button');
        }
    } else {
        log('User not logged in or on auth page, skipping logout button');
    }

    UIManager.init();
});