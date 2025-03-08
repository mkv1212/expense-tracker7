// Utility Functions
function $(selector) { return document.querySelector(selector); }
function $$(selector) { return document.querySelectorAll(selector); }
function log(message) { console.log(`[Tracker] ${message}`); }
function error(message) { console.error(`[Tracker Error] ${message}`); }

function showPopup(id, message) {
    const popup = $(`#${id}`);
    if (!popup) {
        error(`Popup with ID ${id} not found`);
        return;
    }
    const content = popup.querySelector('.popup-content p');
    if (content) content.textContent = message;
    popup.style.display = 'block';
    popup.style.animation = 'scaleUp 0.4s ease-out';
    if (id === 'login-popup') {
        const redirectBtn = $('#login-redirect-btn');
        if (redirectBtn) {
            redirectBtn.onclick = () => {
                popup.style.animation = 'fadeOut 0.4s ease-in';
                setTimeout(() => { popup.style.display = 'none'; window.location.href = 'login.html'; }, 400);
            };
        }
    } else {
        const closeBtn = $('#success-close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                popup.style.animation = 'fadeOut 0.4s ease-in';
                setTimeout(() => popup.style.display = 'none', 400);
            };
        }
        setTimeout(() => {
            popup.style.animation = 'fadeOut 0.4s ease-in';
            setTimeout(() => popup.style.display = 'none', 400);
        }, 3000);
    }
}

function animateElement(element, animation) {
    if (element) {
        element.style.animation = `${animation} 0.6s ease`;
        setTimeout(() => element.style.animation = '', 600);
    }
}

function applyHoverGlow(element) {
    if (element) {
        element.addEventListener('mouseover', () => {
            element.style.boxShadow = '0 0 15px #22d3ee';
            element.style.transform = 'translateY(-4px)';
        });
        element.addEventListener('mouseout', () => {
            element.style.boxShadow = 'none';
            element.style.transform = 'translateY(0)';
        });
    }
}

// Session Management
const SessionManager = {
    setUserId(userId) {
        localStorage.setItem('userId', userId);
    },
    getUserId() {
        return localStorage.getItem('userId');
    },
    setToken(token) {
        localStorage.setItem('token', token);
    },
    getToken() {
        return localStorage.getItem('token');
    },
    clearSession() {
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('avatar');
    },
    isLoggedIn() {
        return !!this.getUserId() && !!this.getToken();
    }
};

// UI Manager
const UIManager = {
    init() {
        if (!SessionManager.isLoggedIn() && !window.location.pathname.includes('signup.html') && !window.location.pathname.includes('login.html')) {
            showPopup('login-popup', 'Login required to access this page.');
            return;
        }
        this.setupEventListeners();
        this.applyTheme();
        if (window.location.pathname.includes('tracker.html')) {
            this.renderTrackerTable();
            this.loadAvatar();
        }
        if (window.location.pathname.includes('calculation.html')) {
            this.updateCalculationPage();
        }
        if (window.location.pathname.includes('graph.html')) {
            this.renderChart();
        }
    },
    setupEventListeners() {
        const signupForm = $('#signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const usernameInput = signupForm.querySelector('input[type="text"]');
                const emailInput = signupForm.querySelector('input[type="email"]');
                const passwordInput = signupForm.querySelector('input[type="password"]');
                if (!usernameInput || !emailInput || !passwordInput) {
                    showPopup('success-popup', 'Form error: Missing fields!');
                    return;
                }
                const username = usernameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                try {
                    const response = await fetch('/api/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, email, password })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        showPopup('success-popup', data.message);
                        setTimeout(() => window.location.href = 'login.html', 2000);
                    } else {
                        showPopup('success-popup', data.message);
                    }
                } catch (err) {
                    error(`Signup error: ${err.message}`);
                    showPopup('success-popup', 'Signup failed. Try again.');
                }
            });
        }

        const loginForm = $('#login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = loginForm.querySelector('input[type="email"]');
                const passwordInput = loginForm.querySelector('input[type="password"]');
                if (!emailInput || !passwordInput) {
                    showPopup('success-popup', 'Form error: Missing fields!');
                    return;
                }
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        SessionManager.setUserId(data.userId);
                        SessionManager.setToken(data.token); // Store the token
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
            entryForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const token = SessionManager.getToken();
                if (!token) {
                    showPopup('login-popup', 'Please log in to add entries.');
                    return;
                }
                const expenseItem = $('#expense-item').value === 'Custom' ? ($('#expense-custom') ? $('#expense-custom').value.trim() : '') : $('#expense-item').value;
                const expenseAmount = $('#expense-amount') ? $('#expense-amount').value : '';
                const expenseDate = $('#expense-date') ? $('#expense-date').value : '';
                const savingItem = $('#saving-item').value === 'Custom' ? ($('#saving-custom') ? $('#saving-custom').value.trim() : '') : $('#saving-item').value;
                const savingAmount = $('#saving-amount') ? $('#saving-amount').value : '';
                const savingDate = $('#saving-date') ? $('#saving-date').value : '';
                try {
                    const response = await fetch('/api/entries', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}` // Add token to header
                        },
                        body: JSON.stringify({
                            expenseItem,
                            expenseAmount,
                            expenseDate,
                            savingOption: savingItem,
                            savingAmount,
                            savingDate
                        })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        showPopup('success-popup', data.message);
                        this.renderTrackerTable();
                        entryForm.reset();
                        $$('.custom-input').forEach(input => input.style.display = 'none');
                    } else {
                        showPopup('success-popup', data.message);
                    }
                } catch (err) {
                    error(`Add entry error: ${err.message}`);
                    showPopup('success-popup', 'Failed to add entry. Try again.');
                }
            });
        }

        const uploadAvatarBtn = $('#upload-avatar-btn');
        if (uploadAvatarBtn) {
            uploadAvatarBtn.addEventListener('click', () => this.uploadAvatarHandler());
            applyHoverGlow(uploadAvatarBtn);
        }

        const expenseSelect = $('#expense-item');
        const savingSelect = $('#saving-item');
        if (expenseSelect) {
            expenseSelect.addEventListener('change', () => {
                const custom = $('#expense-custom');
                if (custom) {
                    custom.style.display = expenseSelect.value === 'Custom' ? 'block' : 'none';
                    animateElement(custom, 'fadeIn');
                }
            });
        }
        if (savingSelect) {
            savingSelect.addEventListener('change', () => {
                const custom = $('#saving-custom');
                if (custom) {
                    custom.style.display = savingSelect.value === 'Custom' ? 'block' : 'none';
                    animateElement(custom, 'fadeIn');
                }
            });
        }

        const timeFilter = $('#time-filter');
        const datePicker = $('#date-picker');
        if (timeFilter) {
            timeFilter.addEventListener('change', () => {
                this.updateCalculationPage();
                animateElement(timeFilter, 'scaleUp');
            });
        }
        if (datePicker) {
            datePicker.addEventListener('change', () => {
                this.updateCalculationPage();
                animateElement(datePicker, 'scaleUp');
            });
        }

        const exportBtns = $$('#export-btn');
        exportBtns.forEach(btn => {
            btn.addEventListener('click', () => this.exportToCSV());
            applyHoverGlow(btn);
        });

        const themeBtn = document.createElement('button');
        themeBtn.textContent = 'Toggle Theme';
        themeBtn.style.cssText = 'position: fixed; top: 20px; left: 20px; padding: 10px 20px; background: linear-gradient(to right, #1e40af, #f97316); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; z-index: 10;';
        themeBtn.addEventListener('click', () => {
            this.toggleTheme();
            animateElement(themeBtn, 'glow');
        });
        applyHoverGlow(themeBtn);
        document.body.appendChild(themeBtn);
    },
    async renderTrackerTable() {
        const tbody = $('#tracker-body');
        const token = SessionManager.getToken();
        if (!tbody || !token) return;

        tbody.innerHTML = '';
        try {
            const response = await fetch('/api/entries', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const entries = await response.json();
            entries.slice(0, 5).forEach(entry => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(entry.expenseDate).toLocaleDateString()}</td>
                    <td>${entry.expenseItem}</td>
                    <td>₹${entry.expenseAmount.toLocaleString('en-IN')}</td>
                    <td>${entry.savingOption}</td>
                    <td>₹${entry.savingAmount.toLocaleString('en-IN')}</td>
                `;
                tbody.appendChild(row);
                animateElement(row, 'fadeIn');
                row.addEventListener('mouseover', () => row.style.background = 'rgba(34, 211, 238, 0.1)');
                row.addEventListener('mouseout', () => row.style.background = '#e5e7eb');
            });
        } catch (err) {
            error(`Render tracker table error: ${err.message}`);
            showPopup('success-popup', 'Failed to load entries.');
        }
    },
    uploadAvatarHandler() {
        const fileInput = $('#avatar-upload');
        if (!fileInput || !fileInput.files[0]) {
            showPopup('success-popup', 'Please select an image!');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const img = $('#profile-avatar');
            if (img) {
                img.src = dataUrl;
                localStorage.setItem('avatar', dataUrl);
                showPopup('success-popup', 'Avatar uploaded successfully!');
                animateElement(img, 'scaleUp');
            }
        };
        reader.readAsDataURL(fileInput.files[0]);
    },
    loadAvatar() {
        const savedAvatar = localStorage.getItem('avatar');
        const avatarImg = $('#profile-avatar');
        if (savedAvatar && avatarImg) {
            avatarImg.src = savedAvatar;
            animateElement(avatarImg, 'fadeIn');
        }
    },
    async updateCalculationPage() {
        const tbody = $('#table-body');
        const token = SessionManager.getToken();
        if (!tbody || !token) return;

        const filter = $('#time-filter') ? $('#time-filter').value : 'month';
        const date = $('#date-picker') ? $('#date-picker').value : '';

        tbody.innerHTML = '';
        try {
            const response = await fetch('/api/entries', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const entries = await response.json();
            const filteredEntries = this.filterEntries(entries, filter, date);
            const totals = this.calculateTotals(filteredEntries);

            filteredEntries.forEach(entry => {
                const row = document.createElement('tr');
                const total = entry.savingAmount - entry.expenseAmount;
                row.innerHTML = `
                    <td>${new Date(entry.expenseDate).toLocaleDateString()}</td>
                    <td>${entry.expenseItem}</td>
                    <td>₹${entry.expenseAmount.toLocaleString('en-IN')}</td>
                    <td>${entry.savingOption}</td>
                    <td>₹${entry.savingAmount.toLocaleString('en-IN')}</td>
                    <td>₹${total.toLocaleString('en-IN')}</td>
                `;
                tbody.appendChild(row);
                animateElement(row, 'fadeIn');
            });

            const totalExpense = $('#total-expense');
            const totalSaving = $('#total-saving');
            const netTotal = $('#net-total');
            if (totalExpense) totalExpense.textContent = `₹${totals.expense.toLocaleString('en-IN')}`;
            if (totalSaving) totalSaving.textContent = `₹${totals.saving.toLocaleString('en-IN')}`;
            if (netTotal) netTotal.textContent = `₹${totals.net.toLocaleString('en-IN')}`;
            if (totalExpense) animateElement(totalExpense, 'scaleUp');
            if (totalSaving) animateElement(totalSaving, 'scaleUp');
            if (netTotal) animateElement(netTotal, 'scaleUp');
        } catch (err) {
            error(`Update calculation page error: ${err.message}`);
            showPopup('success-popup', 'Failed to load calculations.');
        }
    },
    async renderChart() {
        const canvas = $('#finance-chart');
        const token = SessionManager.getToken();
        if (!canvas || !token) {
            error('Chart canvas or token missing');
            showPopup('success-popup', 'Chart unavailable.');
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            error('Failed to get 2D context for chart');
            return;
        }
        try {
            const response = await fetch('/api/entries', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const entries = await response.json();
            const totals = this.calculateTotals(entries);

            if (window.financeChart) window.financeChart.destroy();
            window.financeChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Expenses (₹)', 'Savings (₹)'],
                    datasets: [{
                        data: [totals.expense, totals.saving],
                        backgroundColor: ['#f97316', '#22d3ee'],
                        borderColor: '#e5e7eb',
                        borderWidth: 4,
                        hoverOffset: 20
                    }]
                },
                options: {
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { color: '#4b5563', font: { size: 16, weight: 'bold', family: 'Montserrat' }, padding: 20 }
                        },
                        tooltip: {
                            backgroundColor: '#1e40af',
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 12 },
                            callbacks: {
                                label: function(context) {
                                    return `₹${context.parsed.toLocaleString('en-IN')}`;
                                }
                            }
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: 2000,
                        easing: 'easeOutBounce'
                    },
                    elements: {
                        arc: {
                            borderWidth: 5,
                            borderColor: '#e5e7eb',
                            shadowOffsetX: 8,
                            shadowOffsetY: 8,
                            shadowBlur: 20,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: true
                }
            });
            animateElement(canvas, 'scaleUp');
        } catch (err) {
            error(`Render chart error: ${err.message}`);
            showPopup('success-popup', 'Failed to load chart.');
        }
    },
    filterEntries(entries, filterType, baseDate) {
        const date = new Date(baseDate || Date.now());
        return entries.filter(entry => {
            const entryDate = new Date(entry.expenseDate || entry.savingDate);
            const diffDays = Math.ceil(Math.abs(date - entryDate) / (1000 * 60 * 60 * 24));
            switch (filterType) {
                case 'day': return diffDays <= 1;
                case 'week': return diffDays <= 7;
                case 'month': return diffDays <= 30;
                case 'half-year': return diffDays <= 182;
                case 'year': return diffDays <= 365;
                default: return true;
            }
        });
    },
    calculateTotals(entries) {
        return entries.reduce((totals, entry) => {
            totals.expense += entry.expenseAmount;
            totals.saving += entry.savingAmount;
            totals.net = totals.saving - totals.expense;
            return totals;
        }, { expense: 0, saving: 0, net: 0 });
    },
    exportToCSV() {
        const token = SessionManager.getToken();
        if (!token) return;
        fetch('/api/entries', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(entries => {
                let csv = 'Date,Expense Item,Expense Amount (₹),Saving Option,Saving Amount (₹)\n';
                entries.forEach(entry => {
                    csv += `${new Date(entry.expenseDate).toLocaleDateString()},${entry.expenseItem},${entry.expenseAmount},${entry.savingOption},${entry.savingAmount}\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tracker_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                log('Data exported to CSV');
            })
            .catch(err => {
                error(`Export error: ${err.message}`);
                showPopup('success-popup', 'Failed to export data.');
            });
    },
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        showPopup('success-popup', `Theme switched to ${this.theme}!`);
    },
    applyTheme() {
        if (this.theme === 'dark') {
            document.body.style.background = 'linear-gradient(135deg, #4b5563, #0ea5e9, #d1d5db, #e11d48, #1e40af)';
            $$('.welcome-section, .auth-section, .tracker-section, .calc-section, .graph-section').forEach(el => {
                el.style.background = '#d1d5db';
                el.style.color = '#1e40af';
            });
            $$('.action-btn.primary-btn').forEach(btn => btn.style.background = 'linear-gradient(to right, #4b5563, #22d3ee)');
            $$('.action-btn.secondary-btn').forEach(btn => btn.style.background = 'linear-gradient(to right, #4b5563, #f97316)');
            $$('.nav-btn').forEach(a => a.style.background = '#22d3ee');
            $$('.auth-btn').forEach(btn => btn.style.background = 'linear-gradient(to right, #4b5563, #22d3ee)');
            $$('.styled-select, .styled-input, .custom-input').forEach(input => input.style.background = '#e5e7eb');
        } else {
            document.body.style.background = 'linear-gradient(135deg, #1e40af, #22d3ee, #e5e7eb, #f97316, #4b5563)';
            $$('.welcome-section, .auth-section, .tracker-section, .calc-section, .graph-section').forEach(el => {
                el.style.background = '#ffffff';
                el.style.color = '#4b5563';
            });
            $$('.action-btn.primary-btn').forEach(btn => btn.style.background = 'linear-gradient(to right, #1e40af, #22d3ee)');
            $$('.action-btn.secondary-btn').forEach(btn => btn.style.background = 'linear-gradient(to right, #4b5563, #f97316)');
            $$('.nav-btn').forEach(a => a.style.background = '#22d3ee');
            $$('.auth-btn').forEach(btn => btn.style.background = 'linear-gradient(to right, #1e40af, #22d3ee)');
            $$('.styled-select, .styled-input, .custom-input').forEach(input => input.style.background = '#ffffff');
        }
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    try {
        UIManager.init();
        if (SessionManager.isLoggedIn() && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('signup.html')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.textContent = 'Logout';
            logoutBtn.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: linear-gradient(to right, #1e40af, #f97316); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; z-index: 10;';
            logoutBtn.addEventListener('click', () => {
                SessionManager.clearSession();
                window.location.href = 'login.html';
                animateElement(logoutBtn, 'scaleUp');
            });
            applyHoverGlow(logoutBtn);
            document.body.appendChild(logoutBtn);
        }
        $$('.nav-btn').forEach(link => applyHoverGlow(link));
    } catch (e) {
        error(`Initialization failed: ${e.message}`);
        showPopup('success-popup', 'An error occurred during initialization. Please refresh the page.');
    }
});

// Additional Features
function validateInputs() {
    $$('input, select').forEach(input => {
        if (input) {
            input.addEventListener('blur', () => {
                input.style.borderColor = !input.value.trim() && input.type !== 'file' ? '#f97316' : '#22d3ee';
                animateElement(input, 'scaleUp');
            });
            input.addEventListener('focus', () => animateElement(input, 'glow'));
        }
    });
}

validateInputs();

// Error Handling
window.onerror = (msg, url, lineNo, colNo, err) => {
    error(`Global error: ${msg} at ${url}:${lineNo}:${colNo} - ${err ? err.stack : 'No stack'}`);
    showPopup('success-popup', 'An error occurred. Please try again or refresh the page.');
};