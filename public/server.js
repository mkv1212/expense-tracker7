// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    // Check if user is logged in
    if (!token || !userId) {
        document.getElementById('login-popup').style.display = 'block';
        return;
    }

    // Load existing entries
    loadEntries(userId);

    // Handle form submission
    document.getElementById('entry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addEntry(userId, token);
    });

    // Handle export to CSV
    document.getElementById('export-btn').addEventListener('click', exportToCSV);

    // Handle avatar upload
    document.getElementById('upload-avatar-btn').addEventListener('click', () => {
        document.getElementById('avatar-upload').click();
    });

    document.getElementById('avatar-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('profile-avatar').src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle login popup redirect
    document.getElementById('login-redirect-btn').addEventListener('click', () => {
        window.location.href = 'login.html';
    });

    // Handle success popup close
    document.getElementById('success-close-btn').addEventListener('click', () => {
        document.getElementById('success-popup').style.display = 'none';
    });

    // Show/hide custom expense and saving inputs
    document.getElementById('expense-item').addEventListener('change', (e) => {
        document.getElementById('expense-custom').style.display = e.target.value === 'Custom' ? 'block' : 'none';
    });

    document.getElementById('saving-item').addEventListener('change', (e) => {
        document.getElementById('saving-custom').style.display = e.target.value === 'Custom' ? 'block' : 'none';
    });
});

// Function to add a new entry
async function addEntry(userId, token) {
    const expenseItem = document.getElementById('expense-item').value === 'Custom'
        ? document.getElementById('expense-custom').value
        : document.getElementById('expense-item').value;
    const expenseAmount = document.getElementById('expense-amount').value;
    const expenseDate = document.getElementById('expense-date').value;
    const savingOption = document.getElementById('saving-item').value === 'Custom'
        ? document.getElementById('saving-custom').value
        : document.getElementById('saving-item').value;
    const savingAmount = document.getElementById('saving-amount').value;
    const savingDate = document.getElementById('saving-date').value;

    const entryData = {
        userId,
        expenseItem: expenseItem || '-',
        expenseAmount: expenseAmount ? parseInt(expenseAmount) : 0,
        expenseDate: expenseDate || new Date().toISOString().split('T')[0],
        savingOption: savingOption || '-',
        savingAmount: savingAmount ? parseInt(savingAmount) : 0,
        savingDate: savingDate || new Date().toISOString().split('T')[0],
    };

    try {
        const response = await fetch('/api/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // Send token in Authorization header
            },
            body: JSON.stringify(entryData),
        });

        const result = await response.json();
        if (response.ok) {
            document.getElementById('entry-form').reset();
            document.getElementById('success-popup').style.display = 'block';
            loadEntries(userId); // Refresh the table
        } else {
            alert(result.message || 'Failed to add entry');
        }
    } catch (err) {
        console.error('Error adding entry:', err);
        alert('An error occurred while adding the entry');
    }
}

// Function to load and display entries
async function loadEntries(userId) {
    try {
        const response = await fetch(`/api/entries?userId=${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Send token
            },
        });

        const result = await response.json();
        if (response.ok) {
            const entries = result;
            const tableBody = document.getElementById('tracker-body');
            tableBody.innerHTML = ''; // Clear existing rows

            entries.forEach(entry => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(entry.expenseDate).toLocaleDateString()}</td>
                    <td>${entry.expenseItem}</td>
                    <td>${entry.expenseAmount}</td>
                    <td>${entry.savingOption}</td>
                    <td>${entry.savingAmount}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            alert(result.message || 'Failed to load entries');
        }
    } catch (err) {
        console.error('Error fetching entries:', err);
        alert('An error occurred while fetching entries');
    }
}

// Function to export table to CSV
function exportToCSV() {
    const rows = document.querySelectorAll('#tracker-table tr');
    let csvContent = 'data:text/csv;charset=utf-8,';
    rows.forEach(row => {
        const rowData = Array.from(row.cells).map(cell => `"${cell.textContent}"`).join(',');
        csvContent += rowData + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'tracker_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}