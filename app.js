// Application State
let state = {
  profile: {},
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  bills: []
};

// Chart.js Instances
let cashFlowChart = null;
let categoryChart = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
  renderCurrentSection();
});

// Load state from localStorage or initialize with ABC Bank simulation data
async function initApp() {
  const savedData = localStorage.getItem('finance_pulse_data');
  if (savedData) {
    state = JSON.parse(savedData);
  } else {
    // If no saved data, load simulation data by default
    if (window.INITIAL_DATA) {
      state = JSON.parse(JSON.stringify(window.INITIAL_DATA));
      saveState();
    } else {
      // Fallback fallback empty state
      state.profile = { setupCompleted: false };
    }
  }

  // Update DB indicator
  updateDbStatusBadge();
  updateProfileDisplay();

  // If Firebase is enabled, pull the latest data from Cloud Firestore (if SQL not active)
  const hasSql = (typeof isSqlEnabled !== 'undefined' && isSqlEnabled());
  if (!hasSql && typeof isFirebaseEnabled !== 'undefined' && isFirebaseEnabled()) {
    const cloudState = await loadFromFirebase(state.profile);
    if (cloudState) {
      state = cloudState;
      localStorage.setItem('finance_pulse_data', JSON.stringify(state));
      updateProfileDisplay();
      
      // Re-render active section if it is dashboard
      const activeTab = sessionStorage.getItem('current_section') || 'dashboard';
      if (activeTab === 'dashboard') {
        renderDashboard();
      }
    }
  }

  // Check onboarding status
  if (!state.profile || !state.profile.setupCompleted) {
    showSection('onboarding');
  } else {
    // Make sure sidebar/topbar is visible
    document.getElementById('sidebar').style.display = 'flex';
    updateProfileDisplay();
  }
}

// Save state to localStorage and Firestore / SQL Database
function saveState() {
  localStorage.setItem('finance_pulse_data', JSON.stringify(state));
  if (typeof isSqlEnabled !== 'undefined' && isSqlEnabled()) {
    saveToSql(state);
  } else if (typeof isFirebaseEnabled !== 'undefined' && isFirebaseEnabled()) {
    saveToFirebase(state);
  }
}

// Update DB connection indicator
function updateDbStatusBadge() {
  const isFb = (typeof isFirebaseEnabled !== 'undefined' && isFirebaseEnabled());
  const isSql = (typeof isSqlEnabled !== 'undefined' && isSqlEnabled());
  const text = isSql ? "DB: SQL Database" : (isFb ? "DB: Firebase Cloud" : "DB: Local");
  const bg = (isSql || isFb) ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)";
  const color = (isSql || isFb) ? "var(--color-success)" : "var(--text-secondary)";
  
  const desktopBadge = document.getElementById('db-status-badge');
  if (desktopBadge) {
    desktopBadge.textContent = text;
    desktopBadge.style.background = bg;
    desktopBadge.style.color = color;
  }

  const mobileBadge = document.getElementById('mobile-db-status-badge');
  if (mobileBadge) {
    mobileBadge.textContent = text;
    mobileBadge.style.background = bg;
    mobileBadge.style.color = color;
  }
}

// Navigation Control
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });

  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Update navigation styling
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-section') === sectionId) {
      item.classList.add('active');
    }
  });

  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-section') === sectionId) {
      item.classList.add('active');
    }
  });

  // Render contents specific to section
  if (sectionId === 'dashboard') {
    renderDashboard();
  } else if (sectionId === 'transactions') {
    renderTransactionsTab();
  } else if (sectionId === 'budgets') {
    renderBudgetsTab();
  } else if (sectionId === 'goals') {
    renderGoalsTab();
  } else if (sectionId === 'recurring-bills') {
    renderBillsTab();
  } else if (sectionId === 'settings') {
    renderSettingsTab();
  }

  // Save selected tab in session to stay on it on reload
  sessionStorage.setItem('current_section', sectionId);
}

function renderCurrentSection() {
  if (!state.profile || !state.profile.setupCompleted) {
    showSection('onboarding');
    return;
  }
  const current = sessionStorage.getItem('current_section') || 'dashboard';
  showSection(current);
}

// Update sidebar user details display
function updateProfileDisplay() {
  const profileName = state.profile.name || "Pengguna";
  const avatarText = profileName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  document.querySelectorAll('.user-avatar').forEach(avatar => {
    avatar.textContent = avatarText;
  });
  
  document.querySelectorAll('.user-name').forEach(nameDisplay => {
    nameDisplay.textContent = profileName;
  });
}

// Calculation Engine
function formatCurrency(amount) {
  const currency = state.profile.currency || "RM";
  return `${currency} ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Recalculate account balances dynamically based on transactions
function recalculateBalances() {
  state.accounts.forEach(account => {
    let balance = parseFloat(account.openingBalance);
    
    // Filter transactions for this account
    const accTx = state.transactions.filter(t => t.accountId === account.id);
    
    accTx.forEach(tx => {
      const amt = parseFloat(tx.amount);
      if (tx.type === 'income') {
        balance += amt;
      } else if (tx.type === 'expense') {
        balance -= amt;
      } else if (tx.type === 'transfer') {
        // Transfers are handled as transfer out of accountId
        balance -= amt;
      }
      
      // If there are transfer-ins where this account is the destination:
      if (tx.type === 'transfer' && tx.destinationAccountId === account.id) {
        balance += amt;
      }
    });

    account.currentBalance = balance;
  });
  saveState();
}

// ==========================================
// 1. DASHBOARD CONTROLLER
// ==========================================
function renderDashboard() {
  recalculateBalances();
  
  // 1. Calculations
  let totalBalance = 0;
  state.accounts.forEach(acc => {
    if (acc.isActive) totalBalance += acc.currentBalance;
  });

  // Calculate Monthly Income / Expense for current active month (simulation: May 2026)
  const currentMonthTx = state.transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getFullYear() === 2026 && d.getMonth() === 4; // May (0-indexed 4)
  });

  let totalIncome = 0;
  let totalExpense = 0;

  currentMonthTx.forEach(tx => {
    if (tx.type === 'income') {
      totalIncome += parseFloat(tx.amount);
    } else if (tx.type === 'expense') {
      totalExpense += parseFloat(tx.amount);
    }
  });

  const netCashFlow = totalIncome - totalExpense;

  // 2. Update UI Cards
  document.getElementById('dash-balance').textContent = formatCurrency(totalBalance);
  document.getElementById('dash-income').textContent = formatCurrency(totalIncome);
  document.getElementById('dash-expense').textContent = formatCurrency(totalExpense);
  
  const cashFlowEl = document.getElementById('dash-cashflow');
  cashFlowEl.textContent = formatCurrency(netCashFlow);
  if (netCashFlow >= 0) {
    cashFlowEl.style.color = 'var(--color-success)';
  } else {
    cashFlowEl.style.color = 'var(--color-danger)';
  }

  // 3. Render Dashboard Transactions (last 5)
  renderRecentTransactions();

  // 4. Render Account List Widget
  renderAccountListWidget();

  // 5. Render Notifications and Budget Alerts
  renderBudgetAlertsWidget();

  // 6. Draw Dashboard Charts
  setTimeout(() => {
    drawDashboardCharts(totalIncome, totalExpense);
  }, 100);
}

function renderRecentTransactions() {
  const listContainer = document.getElementById('recent-transactions-list');
  listContainer.innerHTML = '';

  // Sort transactions by date desc, then by id desc
  const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 5);

  if (recent.length === 0) {
    listContainer.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin='round' stroke-width='2' d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' /></svg>
          <h3>Tiada Transaksi</h3>
          <p>Mula rekod perbelanjaan anda sekarang.</p>
        </td>
      </tr>
    `;
    return;
  }

  recent.forEach(tx => {
    const tr = document.createElement('tr');
    
    // Find category color
    const cat = state.categories.find(c => c.name === tx.category);
    const color = cat ? cat.color : '#94a3b8';
    
    const formattedDate = new Date(tx.date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const badgeClass = `badge-${tx.type}`;
    const typeLabel = tx.type === 'income' ? 'Masuk' : 'Keluar';

    tr.innerHTML = `
      <td>${formattedDate}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}"></span>
          <strong>${tx.merchant || tx.category}</strong>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-left: 16px;">${tx.description || ''}</div>
      </td>
      <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
      <td><span style="color: ${cat ? cat.color : 'inherit'}">${tx.category}</span></td>
      <td style="font-weight: 700; text-align: right; color: ${tx.type === 'income' ? 'var(--color-success)' : 'inherit'}">
        ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
      </td>
    `;
    listContainer.appendChild(tr);
  });
}

function renderAccountListWidget() {
  const container = document.getElementById('dash-accounts-list');
  container.innerHTML = '';
  
  state.accounts.forEach(acc => {
    const div = document.createElement('div');
    div.className = 'account-item';
    div.innerHTML = `
      <div class="account-details">
        <div class="account-name">${acc.name}</div>
        <div class="account-number">${acc.number || ''}</div>
      </div>
      <div class="account-bal">${formatCurrency(acc.currentBalance)}</div>
    `;
    container.appendChild(div);
  });
}

function renderBudgetAlertsWidget() {
  const container = document.getElementById('dash-notif-list');
  container.innerHTML = '';
  
  const alerts = [];
  
  // Check category budget limits
  state.budgets.forEach(b => {
    // Total spent in this category
    const spent = state.transactions
      .filter(tx => tx.type === 'expense' && tx.category === b.category)
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      
    const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    
    if (percent >= 100) {
      alerts.push({
        type: 'danger',
        title: `Bajet Terlebih: ${b.category}`,
        text: `Anda telah membelanjakan ${formatCurrency(spent)} melebihi bajet ${formatCurrency(b.amount)} (${percent.toFixed(0)}%).`
      });
    } else if (percent >= 90) {
      alerts.push({
        type: 'warning',
        title: `Bajet Kritikal: ${b.category}`,
        text: `Kategori ${b.category} telah mencapai ${percent.toFixed(0)}% daripada bajet (${formatCurrency(spent)} / ${formatCurrency(b.amount)}).`
      });
    } else if (percent >= 70) {
      alerts.push({
        type: 'warning',
        title: `Amaran Bajet: ${b.category}`,
        text: `Belanja ${b.category} mencecah ${percent.toFixed(0)}% daripada had bajet.`
      });
    }
  });

  // Check upcoming unpaid bills
  state.bills.forEach(bill => {
    if (!bill.isPaid) {
      alerts.push({
        type: 'info',
        title: `Bil Tertunggak: ${bill.name}`,
        text: `Bayaran sebanyak ${formatCurrency(bill.amount)} dijadualkan setiap bulan pada ${bill.dueDate}.`
      });
    }
  });

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="notif-item notif-success">
        <div class="notif-content">
          <div class="notif-title">Kedudukan Kewangan Baik</div>
          <div class="notif-text">Semua perbelanjaan berada di dalam bajet dan tiada bil tertunggak!</div>
        </div>
      </div>
    `;
    return;
  }

  alerts.forEach(al => {
    const div = document.createElement('div');
    div.className = `notif-item notif-${al.type}`;
    div.innerHTML = `
      <div class="notif-content">
        <div class="notif-title">${al.title}</div>
        <div class="notif-text">${al.text}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

function drawDashboardCharts(totalIncome, totalExpense) {
  // Chart 1: Cash Flow Accumulation Trend over May 2026
  const cashFlowCtx = document.getElementById('cashFlowChartCanvas');
  if (!cashFlowCtx) return;

  if (cashFlowChart) {
    cashFlowChart.destroy();
  }

  // Pre-process daily balances
  // Start with opening balance at 2026-05-01
  const startBalance = 12500.00;
  let runningBalance = startBalance;
  
  // Sort transaction in May 2026 by date asc
  const mayTx = state.transactions
    .filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === 2026 && d.getMonth() === 4;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Build daily data
  const daysInMonth = 31;
  const labels = [];
  const balanceData = [];
  
  // Map transactions by day
  const txByDay = {};
  for (let i = 1; i <= daysInMonth; i++) {
    txByDay[i] = [];
  }
  
  mayTx.forEach(tx => {
    const day = new Date(tx.date).getDate();
    if (txByDay[day]) txByDay[day].push(tx);
  });

  for (let day = 1; day <= daysInMonth; day++) {
    labels.push(`${day} Mei`);
    
    // Apply all transactions of this day
    txByDay[day].forEach(tx => {
      if (tx.type === 'income') {
        runningBalance += parseFloat(tx.amount);
      } else if (tx.type === 'expense' || tx.type === 'transfer') {
        runningBalance -= parseFloat(tx.amount);
      }
    });
    
    balanceData.push(runningBalance);
  }

  cashFlowChart = new Chart(cashFlowCtx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Baki Akaun (RM)',
        data: balanceData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#6366f1',
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f8fafc',
          bodyColor: '#f8fafc',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return ' Baki: RM ' + context.raw.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });

  // Chart 2: Category Breakdown
  const categoryCtx = document.getElementById('categoryChartCanvas');
  if (!categoryCtx) return;

  if (categoryChart) {
    categoryChart.destroy();
  }

  // Calculate expense sum by category
  const categoriesExp = {};
  state.transactions.forEach(tx => {
    if (tx.type === 'expense') {
      categoriesExp[tx.category] = (categoriesExp[tx.category] || 0) + parseFloat(tx.amount);
    }
  });

  const catNames = Object.keys(categoriesExp);
  const catAmts = Object.values(categoriesExp);
  
  // Match category colors
  const catColors = catNames.map(name => {
    const c = state.categories.find(cat => cat.name === name);
    return c ? c.color : '#94a3b8';
  });

  categoryChart = new Chart(categoryCtx, {
    type: 'doughnut',
    data: {
      labels: catNames,
      datasets: [{
        data: catAmts,
        backgroundColor: catColors,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.8)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#f8fafc', font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const total = context.dataset.data.reduce((a,b) => a+b, 0);
              const pct = ((val / total) * 100).toFixed(0);
              return ` ${context.label}: RM ${val.toFixed(2)} (${pct}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

// ==========================================
// 2. TRANSACTIONS TAB CONTROLLER
// ==========================================
function renderTransactionsTab() {
  // Populate filter selectors
  populateTransactionFilters();
  
  // Render table entries
  applyTransactionFilters();
}

function populateTransactionFilters() {
  const categorySelect = document.getElementById('filter-category');
  
  // Keep the first default option
  categorySelect.innerHTML = '<option value="">Semua Kategori</option>';
  
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = cat.name;
    categorySelect.appendChild(opt);
  });

  const accountSelect = document.getElementById('filter-account');
  accountSelect.innerHTML = '<option value="">Semua Akaun</option>';
  state.accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = acc.name;
    accountSelect.appendChild(opt);
  });
}

function applyTransactionFilters() {
  const searchVal = document.getElementById('search-tx').value.toLowerCase();
  const typeVal = document.getElementById('filter-type').value;
  const categoryVal = document.getElementById('filter-category').value;
  const accountVal = document.getElementById('filter-account').value;

  let filtered = [...state.transactions];

  if (searchVal) {
    filtered = filtered.filter(tx => 
      (tx.description && tx.description.toLowerCase().includes(searchVal)) || 
      (tx.merchant && tx.merchant.toLowerCase().includes(searchVal)) ||
      (tx.category && tx.category.toLowerCase().includes(searchVal))
    );
  }

  if (typeVal) {
    filtered = filtered.filter(tx => tx.type === typeVal);
  }

  if (categoryVal) {
    filtered = filtered.filter(tx => tx.category === categoryVal);
  }

  if (accountVal) {
    filtered = filtered.filter(tx => tx.accountId === accountVal || tx.destinationAccountId === accountVal);
  }

  // Sort desc by date
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  const tableBody = document.getElementById('transactions-table-body');
  tableBody.innerHTML = '';

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' /></svg>
          <h3>Tiada Transaksi Dijumpai</h3>
          <p>Cuba laraskan carian atau tapis anda.</p>
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(tx => {
    const tr = document.createElement('tr');
    
    const cat = state.categories.find(c => c.name === tx.category);
    const color = cat ? cat.color : '#94a3b8';
    const formattedDate = new Date(tx.date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const badgeClass = `badge-${tx.type}`;
    
    let typeLabel = 'Belanja';
    if (tx.type === 'income') typeLabel = 'Masuk';
    if (tx.type === 'transfer') typeLabel = 'Pindahan';
    
    // Find account name
    const acc = state.accounts.find(a => a.id === tx.accountId);
    const accName = acc ? acc.name : '-';

    tr.innerHTML = `
      <td>${formattedDate}</td>
      <td>
        <div style="font-weight: 600;">${tx.merchant || tx.category}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${tx.description || ''}</div>
      </td>
      <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
      <td style="color: ${color}; font-weight: 500;">${tx.category}</td>
      <td style="font-size: 13px; color: var(--text-secondary);">${accName}</td>
      <td style="font-weight: 700; text-align: right; color: ${tx.type === 'income' ? 'var(--color-success)' : 'inherit'}">
        ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
      </td>
      <td style="text-align: right; white-space: nowrap;">
        <button class="btn btn-secondary btn-icon-only" data-delete-id="${tx.id}" title="Padam">
          <svg style="width: 16px; height: 16px; color: var(--color-danger); pointer-events: none;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Event delegation — handles delete for all rows
  tableBody.onclick = function(e) {
    const btn = e.target.closest('[data-delete-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-delete-id');
    deleteTransaction(id);
  };
}

// Custom confirm dialog — replaces window.confirm() which Chrome suppresses on localhost
function showConfirm(message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const msgEl = document.getElementById('confirm-modal-msg');
  const okBtn = document.getElementById('confirm-modal-ok');
  const cancelBtn = document.getElementById('confirm-modal-cancel');

  if (message) msgEl.textContent = message;
  modal.style.display = 'flex';

  function cleanup() {
    modal.style.display = 'none';
    okBtn.replaceWith(okBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  }

  document.getElementById('confirm-modal-ok').addEventListener('click', () => {
    cleanup();
    onConfirm();
  }, { once: true });

  document.getElementById('confirm-modal-cancel').addEventListener('click', () => {
    cleanup();
  }, { once: true });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) cleanup();
  }, { once: true });
}

function deleteTransaction(id) {
  showConfirm('Adakah anda pasti mahu memadam transaksi ini? Tindakan ini tidak boleh dibatalkan.', () => {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    recalculateBalances();
    renderTransactionsTab();
  });
}


// Open modal for adding transaction
function showAddTransactionModal() {
  // Populate accounts list in modal
  const accSelect = document.getElementById('tx-account');
  accSelect.innerHTML = '';
  state.accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = acc.name;
    accSelect.appendChild(opt);
  });

  // Populate categories list in modal
  const catSelect = document.getElementById('tx-category');
  catSelect.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = `${cat.name} (${cat.type === 'income' ? 'Masuk' : 'Keluar'})`;
    catSelect.appendChild(opt);
  });

  // Show transfer destination row by default based on type
  document.getElementById('tx-type').value = 'expense';
  toggleTransferDestination();

  // Reset form
  document.getElementById('add-tx-form').reset();
  
  // Set date to today
  const today = new Date().toISOString().substring(0, 10);
  document.getElementById('tx-date').value = today;

  document.getElementById('tx-modal').classList.add('active');
}

function closeAddTransactionModal() {
  document.getElementById('tx-modal').classList.remove('active');
}

function toggleTransferDestination() {
  const type = document.getElementById('tx-type').value;
  const destRow = document.getElementById('transfer-dest-row');
  const catGroup = document.getElementById('tx-category-group');

  if (type === 'transfer') {
    destRow.style.display = 'block';
    catGroup.style.display = 'none';
    
    // Populate destination accounts (excluding same source account if possible, else all)
    const destSelect = document.getElementById('tx-dest-account');
    destSelect.innerHTML = '';
    state.accounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = acc.name;
      destSelect.appendChild(opt);
    });
  } else {
    destRow.style.display = 'none';
    catGroup.style.display = 'block';
  }
}

function handleAddTransactionSubmit(e) {
  e.preventDefault();
  
  const type = document.getElementById('tx-type').value;
  const accountId = document.getElementById('tx-account').value;
  const destAccountId = document.getElementById('tx-dest-account').value;
  const category = document.getElementById('tx-category').value;
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const date = document.getElementById('tx-date').value;
  const merchant = document.getElementById('tx-merchant').value;
  const description = document.getElementById('tx-description').value;

  if (isNaN(amount) || amount <= 0) {
    alert("Sila masukkan amaun yang sah (lebih daripada 0).");
    return;
  }

  if (type === 'transfer' && accountId === destAccountId) {
    alert("Akaun sumber dan destinasi tidak boleh sama.");
    return;
  }

  const newTx = {
    id: 'tx-' + Date.now(),
    accountId,
    type,
    amount,
    date,
    merchant: merchant || (type === 'transfer' ? "Pindahan Wang" : category),
    description: description || ""
  };

  if (type === 'transfer') {
    newTx.destinationAccountId = destAccountId;
    newTx.category = "Pindahan";
  } else {
    newTx.category = category;
  }

  state.transactions.push(newTx);
  saveState();
  recalculateBalances();
  closeAddTransactionModal();
  renderTransactionsTab();
}

// Export Transactions to CSV
function exportTransactionsCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Tarikh,Peniaga/Butiran,Jenis,Kategori,Akaun,Amaun (RM)\n";

  // Sort by date desc
  const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(tx => {
    const acc = state.accounts.find(a => a.id === tx.accountId);
    const accName = acc ? acc.name : '-';
    
    // Format values
    const date = tx.date;
    const desc = `"${(tx.merchant || tx.category).replace(/"/g, '""')}"`;
    const type = tx.type === 'income' ? 'Masuk' : tx.type === 'expense' ? 'Keluar' : 'Pindahan';
    const cat = tx.category;
    const amt = tx.amount.toFixed(2);

    csvContent += `${date},${desc},${type},${cat},${accName},${amt}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `finance_pulse_transaksi_${Date.now()}.csv`);
  document.body.appendChild(link); // Required for FF
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// 3. BUDGETS TAB CONTROLLER
// ==========================================
function renderBudgetsTab() {
  const grid = document.getElementById('budgets-grid');
  grid.innerHTML = '';

  // Get only expense categories
  const expenseCats = state.categories.filter(c => c.type === 'expense');

  expenseCats.forEach(cat => {
    // Find budget for this category
    const budget = state.budgets.find(b => b.category === cat.name);
    const limit = budget ? parseFloat(budget.amount) : 0;

    // Calculate total spent
    const spent = state.transactions
      .filter(tx => tx.type === 'expense' && tx.category === cat.name)
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    
    // Determine status
    let statusText = 'Selamat';
    let statusClass = 'status-safe';
    let progressColorClass = 'bg-success';

    if (limit === 0) {
      statusText = 'Bajet Belum Ditetapkan';
      statusClass = 'text-muted';
      progressColorClass = 'bg-secondary';
    } else if (percent >= 100) {
      statusText = 'Melebihi Bajet';
      statusClass = 'status-overlimit';
      progressColorClass = 'bg-danger';
    } else if (percent >= 90) {
      statusText = 'Kritikal';
      statusClass = 'status-critical';
      progressColorClass = 'bg-danger'; // Orange/Red
    } else if (percent >= 70) {
      statusText = 'Perhatian';
      statusClass = 'status-attention';
      progressColorClass = 'bg-warning';
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="budget-card-info">
        <div>
          <span class="budget-cat-name" style="color: ${cat.color};">${cat.name}</span>
          <div class="budget-limit">${limit > 0 ? 'Had: ' + formatCurrency(limit) : 'Tiada had perbelanjaan'}</div>
        </div>
        <div style="text-align: right;">
          <div class="budget-spent">${formatCurrency(spent)}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${percent.toFixed(0)}% Digunakan</div>
        </div>
      </div>
      <div class="progress-container">
        <div class="progress-bar ${progressColorClass}" style="width: ${Math.min(percent, 100)}%"></div>
      </div>
      <div class="budget-footer">
        <span class="budget-status-label ${statusClass}">${statusText}</span>
        <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="showSetBudgetModal('${cat.name}', ${limit})">Urus</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function showSetBudgetModal(categoryName, currentLimit) {
  document.getElementById('budget-category-label').textContent = categoryName;
  document.getElementById('budget-amount').value = currentLimit || '';
  document.getElementById('budget-modal').classList.add('active');
}

function closeSetBudgetModal() {
  document.getElementById('budget-modal').classList.remove('active');
}

function handleSetBudgetSubmit(e) {
  e.preventDefault();
  const catName = document.getElementById('budget-category-label').textContent;
  const amt = parseFloat(document.getElementById('budget-amount').value);

  if (isNaN(amt) || amt < 0) {
    alert("Sila masukkan amaun bajet yang sah (minima 0).");
    return;
  }

  // Find and update or create
  const idx = state.budgets.findIndex(b => b.category === catName);
  if (idx > -1) {
    if (amt === 0) {
      // Remove budget
      state.budgets.splice(idx, 1);
    } else {
      state.budgets[idx].amount = amt;
    }
  } else if (amt > 0) {
    state.budgets.push({
      id: 'b-' + Date.now(),
      category: catName,
      amount: amt
    });
  }

  saveState();
  closeSetBudgetModal();
  renderBudgetsTab();
}

// ==========================================
// 4. GOALS TAB CONTROLLER
// ==========================================
function renderGoalsTab() {
  const grid = document.getElementById('goals-grid');
  grid.innerHTML = '';

  if (state.goals.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z' /></svg>
        <h3>Tiada Matlamat Simpanan</h3>
        <p>Tetapkan sasaran seperti dana kecemasan, deposit rumah, atau percutian.</p>
        <button class="btn btn-primary" onclick="showAddGoalModal()">Cipta Matlamat Pertama</button>
      </div>
    `;
    return;
  }

  state.goals.forEach(goal => {
    const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    
    // Calculate months remaining
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    
    // Difference in months
    let monthsRemaining = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
    if (monthsRemaining <= 0) monthsRemaining = 1; // Minimum 1 month avoid divide by zero

    const monthlyNeeded = (goal.targetAmount - goal.currentAmount) / monthsRemaining;
    const formattedDate = targetDate.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="goal-card-header">
        <div>
          <span class="goal-title">${goal.name}</span>
          <div class="goal-date">Sasaran: ${formattedDate}</div>
        </div>
        <button class="btn btn-secondary btn-icon-only" onclick="deleteGoal('${goal.id}')" title="Padam">
          <svg style="width: 14px; height: 14px; color: var(--color-danger);" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
      <div class="goal-stats">
        <span class="goal-amount">${formatCurrency(goal.currentAmount)}</span>
        <span class="goal-target">Sasaran: ${formatCurrency(goal.targetAmount)}</span>
      </div>
      <div class="progress-container">
        <div class="progress-bar bg-primary" style="width: ${Math.min(percent, 100)}%"></div>
      </div>
      <div style="font-size: 11px; text-align: right; color: var(--text-secondary); margin-top: 4px;">${percent.toFixed(0)}% Selesai</div>
      
      <div class="goal-contribution">
        ${goal.currentAmount >= goal.targetAmount ? 
          '<span style="color: var(--color-success); font-weight: 600;">Tahniah! Matlamat anda telah tercapai.</span>' : 
          `Simpanan bulanan disyorkan: <strong>${formatCurrency(monthlyNeeded)}</strong> (selama ${monthsRemaining} bulan)`
        }
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <input type="number" id="contrib-amt-${goal.id}" placeholder="Jumlah RM" class="form-control" style="padding: 6px 12px; font-size: 13px;">
        <button class="btn btn-primary" style="padding: 6px 16px; font-size: 13px;" onclick="addGoalContribution('${goal.id}')">Tambah</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function showAddGoalModal() {
  document.getElementById('add-goal-form').reset();
  
  // Populate account selector
  const accSelect = document.getElementById('goal-account');
  accSelect.innerHTML = '';
  state.accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = acc.name;
    accSelect.appendChild(opt);
  });

  document.getElementById('goal-modal').classList.add('active');
}

function closeAddGoalModal() {
  document.getElementById('goal-modal').classList.remove('active');
}

function handleAddGoalSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('goal-name').value;
  const targetAmount = parseFloat(document.getElementById('goal-target-amount').value);
  const currentAmount = parseFloat(document.getElementById('goal-current-amount').value) || 0;
  const targetDate = document.getElementById('goal-target-date').value;
  const accountId = document.getElementById('goal-account').value;

  if (!name || isNaN(targetAmount) || targetAmount <= 0 || !targetDate) {
    alert("Sila lengkapkan borang matlamat.");
    return;
  }

  state.goals.push({
    id: 'g-' + Date.now(),
    name,
    targetAmount,
    currentAmount,
    targetDate,
    accountId,
    status: 'sedang_berjalan'
  });

  saveState();
  closeAddGoalModal();
  renderGoalsTab();
}

function addGoalContribution(id) {
  const input = document.getElementById(`contrib-amt-${id}`);
  const amt = parseFloat(input.value);
  
  if (isNaN(amt) || amt <= 0) {
    alert("Sila masukkan amaun caruman yang sah.");
    return;
  }

  const goal = state.goals.find(g => g.id === id);
  if (goal) {
    // Add contribution to current amount
    goal.currentAmount += amt;
    
    // Write an expense transaction for the savings contribution
    const newTx = {
      id: 'tx-' + Date.now(),
      accountId: goal.accountId,
      type: 'expense',
      amount: amt,
      category: "Simpanan",
      date: new Date().toISOString().substring(0, 10),
      merchant: `Simpanan: ${goal.name}`,
      description: `Caruman untuk matlamat ${goal.name}`
    };
    state.transactions.push(newTx);
    
    saveState();
    recalculateBalances();
    alert(`Berjaya menambah ${formatCurrency(amt)} ke ${goal.name}!`);
    renderGoalsTab();
  }
}

function deleteGoal(id) {
  showConfirm('Adakah anda pasti mahu memadam matlamat simpanan ini?', () => {
    state.goals = state.goals.filter(g => g.id !== id);
    saveState();
    renderGoalsTab();
  });
}

// ==========================================
// 5. BILLS / RECURRING TAB CONTROLLER
// ==========================================
function renderBillsTab() {
  const grid = document.getElementById('bills-grid');
  grid.innerHTML = '';

  if (state.bills.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin='round' stroke-width='2' d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' /></svg>
        <h3>Tiada Bil Berulang</h3>
        <p>Masukkan bil/komitmen bulanan tetap anda seperti sewa, bil internet, insurans dan utiliti.</p>
        <button class="btn btn-primary" onclick="showAddBillModal()">Tambah Komitmen Pertama</button>
      </div>
    `;
    return;
  }

  state.bills.forEach(bill => {
    const card = document.createElement('div');
    card.className = 'card bill-card';
    
    const paidClass = bill.isPaid ? 'status-safe' : 'status-critical';
    const paidText = bill.isPaid ? 'Telah Dibayar Bulan Ini' : 'Belum Dibayar';

    card.innerHTML = `
      <div>
        <div class="bill-header">
          <div>
            <span class="bill-name">${bill.name}</span>
            <div><span class="bill-category">${bill.category}</span></div>
          </div>
          <button class="btn btn-secondary btn-icon-only" onclick="deleteBill('${bill.id}')" title="Padam">
            <svg style="width: 14px; height: 14px; color: var(--color-danger);" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
        <div class="bill-amount">${formatCurrency(bill.amount)}</div>
        <div class="bill-meta">
          <span>Kekerapan: ${bill.frequency}</span>
          <span>Tarikh Akhir: ${bill.dueDate}hb</span>
        </div>
      </div>
      <div class="bill-footer">
        <span class="budget-status-label ${paidClass}">${paidText}</span>
        ${bill.isPaid ? 
          `<button class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="toggleBillStatus('${bill.id}', false)">Set Semula</button>` : 
          `<button class="btn btn-success" style="padding: 6px 12px; font-size: 12px;" onclick="payBillPrompt('${bill.id}')">Tandakan Dibayar</button>`
        }
      </div>
    `;
    grid.appendChild(card);
  });
}

function showAddBillModal() {
  document.getElementById('add-bill-form').reset();
  
  // Populate categories list in modal
  const catSelect = document.getElementById('bill-category');
  catSelect.innerHTML = '';
  state.categories.filter(c => c.type === 'expense').forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = cat.name;
    catSelect.appendChild(opt);
  });

  document.getElementById('bill-modal').classList.add('active');
}

function closeAddBillModal() {
  document.getElementById('bill-modal').classList.remove('active');
}

function handleAddBillSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('bill-name').value;
  const amount = parseFloat(document.getElementById('bill-amount').value);
  const dueDate = document.getElementById('bill-due-date').value;
  const category = document.getElementById('bill-category').value;
  const frequency = document.getElementById('bill-frequency').value;

  if (!name || isNaN(amount) || amount <= 0 || !dueDate) {
    alert("Sila lengkapkan maklumat bil.");
    return;
  }

  state.bills.push({
    id: 'bill-' + Date.now(),
    name,
    amount,
    frequency,
    dueDate,
    category,
    isPaid: false
  });

  saveState();
  closeAddBillModal();
  renderBillsTab();
}

function toggleBillStatus(id, status) {
  const bill = state.bills.find(b => b.id === id);
  if (bill) {
    bill.isPaid = status;
    saveState();
    renderBillsTab();
  }
}

// Prompt account selection for paying bill
function payBillPrompt(id) {
  const bill = state.bills.find(b => b.id === id);
  if (!bill) return;

  // Let's create a quick alert-driven select or default to first account
  // To keep it simple, we default to the first account (Akaun Simpanan ABC) and create a transaction
  const acc = state.accounts[0];
  if (!acc) {
    alert("Sila tambahkan akaun kewangan terlebih dahulu di halaman Settings.");
    return;
  }

  if (confirm(`Bayar bil "${bill.name}" sebanyak ${formatCurrency(bill.amount)} menggunakan akaun "${acc.name}"?`)) {
    // 1. Mark bill as Paid
    bill.isPaid = true;

    // 2. Create actual transaction
    const newTx = {
      id: 'tx-' + Date.now(),
      accountId: acc.id,
      type: 'expense',
      amount: bill.amount,
      category: bill.category,
      date: new Date().toISOString().substring(0, 10),
      merchant: bill.name,
      description: `Bayaran Komitmen Berulang - ${bill.name}`
    };
    state.transactions.push(newTx);

    saveState();
    recalculateBalances();
    alert("Bayaran bil berjaya direkodkan!");
    renderBillsTab();
  }
}

function deleteBill(id) {
  showConfirm('Adakah anda pasti mahu memadam komitmen bil ini?', () => {
    state.bills = state.bills.filter(b => b.id !== id);
    saveState();
    renderBillsTab();
  });
}

// ==========================================
// 6. SETTINGS TAB CONTROLLER
// ==========================================
function renderSettingsTab() {
  document.getElementById('set-name').value = state.profile.name || '';
  document.getElementById('set-email').value = state.profile.email || '';
  document.getElementById('set-currency').value = state.profile.currency || 'RM';
  document.getElementById('set-lang').value = state.profile.language || 'ms';
  document.getElementById('set-startday').value = state.profile.startingDay || 1;

  // Populate Firebase inputs if config exists
  if (typeof getFirebaseConfig !== 'undefined') {
    const fbConfig = getFirebaseConfig();
    if (fbConfig) {
      document.getElementById('fb-api-key').value = fbConfig.apiKey || '';
      document.getElementById('fb-project-id').value = fbConfig.projectId || '';
      document.getElementById('fb-auth-domain').value = fbConfig.authDomain || '';
      document.getElementById('fb-app-id').value = fbConfig.appId || '';
    } else {
      document.getElementById('fb-api-key').value = '';
      document.getElementById('fb-project-id').value = '';
      document.getElementById('fb-auth-domain').value = '';
      document.getElementById('fb-app-id').value = '';
    }
  }
}

function handleProfileSubmit(e) {
  e.preventDefault();
  state.profile.name = document.getElementById('set-name').value;
  state.profile.email = document.getElementById('set-email').value;
  state.profile.currency = document.getElementById('set-currency').value;
  state.profile.language = document.getElementById('set-lang').value;
  state.profile.startingDay = parseInt(document.getElementById('set-startday').value) || 1;
  state.profile.setupCompleted = true;

  saveState();
  updateProfileDisplay();
  alert("Profil berjaya dikemas kini!");
}

function handleResetData() {
  if (confirm("Adakah anda pasti mahu menetapkan semula semua data? Ini akan memadamkan rekod yang disimpan dan memuatkan semula skrin onboarding.")) {
    localStorage.removeItem('finance_pulse_data');
    sessionStorage.clear();
    location.reload();
  }
}

function handleLoadSimulationData() {
  if (confirm("Sila sahkan untuk memuatkan semula data simulasi Penyata Akaun ABC Bank (Ahmad Bin Abdullah). Ini akan menimpa data semasa.")) {
    if (window.INITIAL_DATA) {
      state = JSON.parse(JSON.stringify(window.INITIAL_DATA));
      saveState();
      location.reload();
    } else {
      alert("Format fail data.js tidak dijumpai.");
    }
  }
}

// ==========================================
// ONBOARDING SETUP CONTROLLER
// ==========================================
function handleOnboardingSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('onboard-name').value;
  const currency = document.getElementById('onboard-currency').value;
  const initialBalance = parseFloat(document.getElementById('onboard-balance').value) || 0;

  if (!name) {
    alert("Sila masukkan nama penuh anda.");
    return;
  }

  // Initialize fresh user profile
  state.profile = {
    name,
    email: "",
    currency,
    language: "ms",
    startingDay: 1,
    dateFormat: "DD/MM/YYYY",
    setupCompleted: true
  };

  // Fresh primary account
  state.accounts = [
    {
      id: "acc-primary",
      name: "Akaun Utama",
      type: "savings",
      number: "-",
      openingBalance: initialBalance,
      currentBalance: initialBalance,
      isActive: true
    }
  ];

  // Default empty lists
  state.transactions = [];
  state.budgets = [
    { id: "b-df-1", category: "Makanan & Minuman", amount: 300 },
    { id: "b-df-2", category: "Barangan Runcit", amount: 500 }
  ];
  state.goals = [];
  state.bills = [];

  // Default categories
  if (window.INITIAL_DATA && window.INITIAL_DATA.categories) {
    state.categories = JSON.parse(JSON.stringify(window.INITIAL_DATA.categories));
  }

  saveState();
  
  // Show app layout
  document.getElementById('sidebar').style.display = 'flex';
  updateProfileDisplay();
  
  showSection('dashboard');
}

function handleOnboardingLoadSim() {
  if (window.INITIAL_DATA) {
    state = JSON.parse(JSON.stringify(window.INITIAL_DATA));
    saveState();
    document.getElementById('sidebar').style.display = 'flex';
    updateProfileDisplay();
    showSection('dashboard');
  } else {
    alert("Gagal memuatkan data simulasi.");
  }
}

// ==========================================
// EVENTS AND EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Desktop Menu Navigation Click
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      showSection(section);
    });
  });

  // Mobile Bottom Nav Click
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      showSection(section);
    });
  });

  // Quick Action Buttons
  const quickExpense = document.getElementById('quick-add-expense');
  if (quickExpense) {
    quickExpense.addEventListener('click', () => {
      showSection('transactions');
      showAddTransactionModal();
    });
  }

  const quickIncome = document.getElementById('quick-add-income');
  if (quickIncome) {
    quickIncome.addEventListener('click', () => {
      showSection('transactions');
      showAddTransactionModal();
      document.getElementById('tx-type').value = 'income';
      toggleTransferDestination();
    });
  }

  const quickGoal = document.getElementById('quick-add-goal');
  if (quickGoal) {
    quickGoal.addEventListener('click', () => {
      showSection('goals');
      showAddGoalModal();
    });
  }

  const quickBill = document.getElementById('quick-add-bill');
  if (quickBill) {
    quickBill.addEventListener('click', () => {
      showSection('recurring-bills');
      showAddBillModal();
    });
  }

  // Transactions page filters changes
  const searchInput = document.getElementById('search-tx');
  if (searchInput) searchInput.addEventListener('input', applyTransactionFilters);
  
  const typeFilter = document.getElementById('filter-type');
  if (typeFilter) typeFilter.addEventListener('change', applyTransactionFilters);

  const catFilter = document.getElementById('filter-category');
  if (catFilter) catFilter.addEventListener('change', applyTransactionFilters);

  const accFilter = document.getElementById('filter-account');
  if (accFilter) accFilter.addEventListener('change', applyTransactionFilters);

  // Forms submit handles
  const addTxForm = document.getElementById('add-tx-form');
  if (addTxForm) addTxForm.addEventListener('submit', handleAddTransactionSubmit);

  const setBudgetForm = document.getElementById('set-budget-form');
  if (setBudgetForm) setBudgetForm.addEventListener('submit', handleSetBudgetSubmit);

  const addGoalForm = document.getElementById('add-goal-form');
  if (addGoalForm) addGoalForm.addEventListener('submit', handleAddGoalSubmit);

  const addBillForm = document.getElementById('add-bill-form');
  if (addBillForm) addBillForm.addEventListener('submit', handleAddBillSubmit);

  const profileForm = document.getElementById('settings-profile-form');
  if (profileForm) profileForm.addEventListener('submit', handleProfileSubmit);

  // Onboarding forms submit handles
  const onboardForm = document.getElementById('onboard-form');
  if (onboardForm) onboardForm.addEventListener('submit', handleOnboardingSubmit);

  const onboardSimBtn = document.getElementById('onboard-load-sim');
  if (onboardSimBtn) onboardSimBtn.addEventListener('click', handleOnboardingLoadSim);

  // Firebase Config Form handles
  const fbForm = document.getElementById('settings-firebase-form');
  if (fbForm) {
    fbForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const apiKey = document.getElementById('fb-api-key').value.trim();
      const projectId = document.getElementById('fb-project-id').value.trim();
      const authDomain = document.getElementById('fb-auth-domain').value.trim();
      const appId = document.getElementById('fb-app-id').value.trim();

      if (!apiKey || !projectId) {
        alert("Sila masukkan sekurang-kurangnya API Key dan Project ID.");
        return;
      }

      const config = {
        apiKey,
        authDomain,
        projectId,
        storageBucket: `${projectId}.appspot.com`,
        messagingSenderId: "123456789",
        appId
      };

      saveFirebaseConfig(config);
      
      if (initFirebase()) {
        updateDbStatusBadge();
        // Upload current state to sync immediately
        await saveToFirebase(state);
        alert("Firebase berjaya disambungkan dan disegerakkan!");
      } else {
        alert("Gagal menyambung ke Firebase. Sila semak kunci konfigurasi anda.");
        clearFirebaseConfig();
        updateDbStatusBadge();
      }
    });
  }

  const fbClearBtn = document.getElementById('fb-clear-btn');
  if (fbClearBtn) {
    fbClearBtn.addEventListener('click', () => {
      if (confirm("Adakah anda pasti mahu memutuskan sambungan Firebase? Kunci konfigurasi akan dipadamkan.")) {
        clearFirebaseConfig();
        isFirebaseInitialized = false;
        firestoreDb = null;
        updateDbStatusBadge();
        alert("Sambungan Firebase diputuskan. Aplikasi kembali menggunakan LocalStorage.");
        document.getElementById('fb-api-key').value = '';
        document.getElementById('fb-project-id').value = '';
        document.getElementById('fb-auth-domain').value = '';
        document.getElementById('fb-app-id').value = '';
      }
    });
  }
}
