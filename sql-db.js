// SQL Database Helper
let isSqlInitialized = false;
let isSqlChecking = false;

// Check if SQL Database is enabled on backend
async function initSql() {
  if (isSqlChecking) return false;
  isSqlChecking = true;
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error("Status API returned error");
    const data = await res.json();
    if (data.enabled) {
      isSqlInitialized = true;
      console.log("SQL Database API is active!");
      updateDbStatusBadge();
      return true;
    } else {
      console.log("SQL Database API is not active:", data.error || "No env set");
      isSqlInitialized = false;
      return false;
    }
  } catch (error) {
    console.warn("SQL Database API probe failed:", error);
    isSqlInitialized = false;
    return false;
  } finally {
    isSqlChecking = false;
  }
}

function isSqlEnabled() {
  return isSqlInitialized;
}

// Get user email safely for key
function getSqlUserEmail(profileState) {
  const email = (profileState && profileState.email) ? profileState.email : 'ahmad.abdullah@email.com';
  return email.trim().toLowerCase();
}

// Save State to SQL Database via API
async function saveToSql(appState) {
  if (!isSqlEnabled()) return false;

  const email = getSqlUserEmail(appState.profile);
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        profile: appState.profile,
        accounts: appState.accounts,
        categories: appState.categories,
        transactions: appState.transactions,
        budgets: appState.budgets,
        goals: appState.goals,
        bills: appState.bills
      })
    });

    if (!res.ok) {
      throw new Error(`API returned status ${res.status}`);
    }

    const result = await res.json();
    console.log("Data berjaya disegerakkan ke SQL Database:", result);
    return true;
  } catch (error) {
    console.error("Gagal menyegerakkan data ke SQL Database:", error);
    return false;
  }
}

// Load State from SQL Database via API
async function loadFromSql(profileState) {
  if (!isSqlEnabled()) return null;

  const email = getSqlUserEmail(profileState);
  try {
    const res = await fetch(`/api/load?email=${encodeURIComponent(email)}`);
    if (res.status === 404) {
      console.log("Tiada data dijumpai di SQL Database bagi pengguna ini.");
      return null;
    }
    if (!res.ok) {
      throw new Error(`API returned status ${res.status}`);
    }

    const data = await res.json();
    console.log("Data berjaya dimuat turun daripada SQL Database.");
    return data;
  } catch (error) {
    console.error("Gagal memuat turun data dari SQL Database:", error);
    return null;
  }
}

// Initial auto-run on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    initSql().then(active => {
      if (active) {
        // Trigger initial data load from SQL if enabled
        syncWithSqlOnLoad();
      }
    });
  });
}

// Helper to pull data after SQL initialized
async function syncWithSqlOnLoad() {
  if (!isSqlEnabled()) return;
  
  try {
    const localDataStr = localStorage.getItem('finance_pulse_data');
    let localProfile = {};
    if (localDataStr) {
      try {
        localProfile = JSON.parse(localDataStr).profile || {};
      } catch (e) {}
    }
    
    const sqlState = await loadFromSql(localProfile);
    if (sqlState && typeof state !== 'undefined') {
      // Retain active page-section if any
      const currentSection = sessionStorage.getItem('current_section');
      
      state = sqlState;
      localStorage.setItem('finance_pulse_data', JSON.stringify(state));
      
      if (typeof updateProfileDisplay === 'function') {
        updateProfileDisplay();
      }
      
      // Update badge
      if (typeof updateDbStatusBadge === 'function') {
        updateDbStatusBadge();
      }
      
      const activeTab = currentSection || 'dashboard';
      if (typeof showSection === 'function') {
        showSection(activeTab);
      }
      
      if (activeTab === 'dashboard' && typeof renderDashboard === 'function') {
        renderDashboard();
      } else if (activeTab === 'transactions' && typeof renderTransactionsTab === 'function') {
        renderTransactionsTab();
      } else if (activeTab === 'budgets' && typeof renderBudgetsTab === 'function') {
        renderBudgetsTab();
      } else if (activeTab === 'goals' && typeof renderGoalsTab === 'function') {
        renderGoalsTab();
      } else if (activeTab === 'recurring-bills' && typeof renderBillsTab === 'function') {
        renderBillsTab();
      } else if (activeTab === 'settings' && typeof renderSettingsTab === 'function') {
        renderSettingsTab();
      }
      console.log("State disegerakkan daripada SQL Database ketika pemulaan.");
    }
  } catch (e) {
    console.error("Gagal menyelaraskan SQL ketika pemulaan:", e);
  }
}
