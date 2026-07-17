// Firebase Database Helper
let firebaseApp = null;
let firestoreDb = null;
let isFirebaseInitialized = false;

// Load Firebase configuration from localStorage
function getFirebaseConfig() {
  const config = localStorage.getItem('firebase_config');
  return config ? JSON.parse(config) : null;
}

// Save Firebase configuration
function saveFirebaseConfig(config) {
  localStorage.setItem('firebase_config', JSON.stringify(config));
}

// Clear Firebase configuration
function clearFirebaseConfig() {
  localStorage.removeItem('firebase_config');
}

// Initialize Firebase App & Firestore
function initFirebase() {
  const config = getFirebaseConfig();
  if (!config) {
    console.log("Firebase tidak dikonfigurasikan. Menggunakan LocalStorage sahaja.");
    isFirebaseInitialized = false;
    return false;
  }

  try {
    // Check if Firebase compat libraries are loaded
    if (typeof firebase === 'undefined') {
      console.warn("SDK Firebase tidak dijumpai. Pastikan CDN dimuatkan.");
      isFirebaseInitialized = false;
      return false;
    }

    // Initialize if not already done
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.app();
    }
    
    firestoreDb = firebase.firestore();
    isFirebaseInitialized = true;
    console.log("Firebase Cloud Firestore berjaya disambungkan!");
    return true;
  } catch (error) {
    console.error("Gagal memulakan Firebase:", error);
    isFirebaseInitialized = false;
    return false;
  }
}

// Check if Firebase is active
function isFirebaseEnabled() {
  return isFirebaseInitialized && firestoreDb !== null;
}

// Get standard document key for user data
function getFirestoreUserDocKey(profileState) {
  const email = (profileState && profileState.email) ? profileState.email : 'ahmad.abdullah@email.com';
  // Return URL safe document key
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// Save State to Firebase Firestore
async function saveToFirebase(appState) {
  if (!isFirebaseEnabled()) return false;

  try {
    const docKey = getFirestoreUserDocKey(appState.profile);
    await firestoreDb.collection('users').doc(docKey).set({
      profile: appState.profile,
      accounts: appState.accounts,
      categories: appState.categories,
      transactions: appState.transactions,
      budgets: appState.budgets,
      goals: appState.goals,
      bills: appState.bills,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Data berjaya disegerakkan ke Firebase Cloud Firestore.");
    return true;
  } catch (error) {
    console.error("Gagal menyegerakkan data ke Firebase:", error);
    return false;
  }
}

// Load State from Firebase Firestore
async function loadFromFirebase(profileState) {
  if (!isFirebaseEnabled()) return null;

  try {
    const docKey = getFirestoreUserDocKey(profileState);
    const doc = await firestoreDb.collection('users').doc(docKey).get();
    
    if (doc.exists) {
      const data = doc.data();
      console.log("Data berjaya dimuat turun daripada Firebase Cloud Firestore.");
      return {
        profile: data.profile || {},
        accounts: data.accounts || [],
        categories: data.categories || [],
        transactions: data.transactions || [],
        budgets: data.budgets || [],
        goals: data.goals || [],
        bills: data.bills || []
      };
    } else {
      console.log("Tiada data dijumpai di Firebase bagi pengguna ini. Menggunakan data tempatan sedia ada.");
      return null;
    }
  } catch (error) {
    console.error("Gagal memuat turun data dari Firebase:", error);
    return null;
  }
}

// Initial auto-run on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    initFirebase();
  });
}
