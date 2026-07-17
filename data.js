const INITIAL_DATA = {
  profile: {
    name: "Ahmad Bin Abdullah",
    email: "ahmad.abdullah@email.com",
    currency: "RM",
    language: "ms", // ms: Bahasa Melayu, en: English
    startingDay: 1,
    dateFormat: "DD/MM/YYYY",
    setupCompleted: true
  },
  accounts: [
    {
      id: "acc-1",
      name: "ABC Bank Simpanan",
      type: "savings",
      number: "1234 5678 9012",
      openingBalance: 12500.00,
      currentBalance: 12420.35,
      isActive: true
    },
    {
      id: "acc-2",
      name: "Tunai (Cash)",
      type: "cash",
      number: "-",
      openingBalance: 200.00,
      currentBalance: 200.00,
      isActive: true
    }
  ],
  categories: [
    { id: "cat-gaji", name: "Gaji", type: "income", color: "#10b981", icon: "briefcase" },
    { id: "cat-makanan", name: "Makanan & Minuman", type: "expense", color: "#f59e0b", icon: "coffee" },
    { id: "cat-utiliti", name: "Utiliti", type: "expense", color: "#3b82f6", icon: "bolt" },
    { id: "cat-sewa", name: "Rumah & Sewa", type: "expense", color: "#8b5cf6", icon: "home" },
    { id: "cat-pengangkutan", name: "Pengangkutan", type: "expense", color: "#ec4899", icon: "car" },
    { id: "cat-pasar-raya", name: "Barangan Runcit", type: "expense", color: "#14b8a6", icon: "shopping-cart" },
    { id: "cat-insurans", name: "Insurans & Kesihatan", type: "expense", color: "#ef4444", icon: "heart-beat" },
    { id: "cat-pendidikan", name: "Buku & Pendidikan", type: "expense", color: "#6366f1", icon: "book" },
    { id: "cat-beli-belah", name: "Beli-belah", type: "expense", color: "#a855f7", icon: "shopping-bag" },
    { id: "cat-caj-bank", name: "Caj Bank", type: "expense", color: "#64748b", icon: "credit-card" },
    { id: "cat-simpanan", name: "Simpanan", type: "expense", color: "#06b6d4", icon: "piggy-bank" },
    { id: "cat-lain", name: "Lain-lain", type: "expense", color: "#94a3b8", icon: "info" }
  ],
  transactions: [
    {
      id: "tx-1",
      accountId: "acc-1",
      type: "expense",
      amount: 186.40,
      category: "Barangan Runcit",
      date: "2026-05-02",
      merchant: "Kedai Runcit Maju",
      description: "Pembayaran QR — Kedai Runcit Maju"
    },
    {
      id: "tx-2",
      accountId: "acc-1",
      type: "expense",
      amount: 248.75,
      category: "Utiliti",
      date: "2026-05-03",
      merchant: "TNB",
      description: "Auto Debit — Bil Elektrik"
    },
    {
      id: "tx-3",
      accountId: "acc-1",
      type: "income",
      amount: 500.00,
      category: "Lain-lain",
      date: "2026-05-04",
      merchant: "Ahmad Rizal",
      description: "Pemindahan Masuk — Ahmad Rizal"
    },
    {
      id: "tx-4",
      accountId: "acc-1",
      type: "expense",
      amount: 120.00,
      category: "Pengangkutan",
      date: "2026-05-05",
      merchant: "Stesen Minyak",
      description: "Pembayaran Kad — Stesen Minyak"
    },
    {
      id: "tx-5",
      accountId: "acc-1",
      type: "expense",
      amount: 98.00,
      category: "Utiliti",
      date: "2026-05-06",
      merchant: "Telco",
      description: "Pembayaran Dalam Talian — Telco"
    },
    {
      id: "tx-6",
      accountId: "acc-1",
      type: "expense",
      amount: 300.00,
      category: "Lain-lain",
      date: "2026-05-08",
      merchant: "Pengeluaran ATM",
      description: "Pengeluaran tunai di mesin ATM"
    },
    {
      id: "tx-7",
      accountId: "acc-1",
      type: "expense",
      amount: 84.50,
      category: "Makanan & Minuman",
      date: "2026-05-10",
      merchant: "Restoran Selera",
      description: "Pembayaran QR — Restoran Selera"
    },
    {
      id: "tx-8",
      accountId: "acc-1",
      type: "expense",
      amount: 159.00,
      category: "Utiliti",
      date: "2026-05-12",
      merchant: "Unifi",
      description: "Auto Debit — Internet Rumah"
    },
    {
      id: "tx-9",
      accountId: "acc-1",
      type: "income",
      amount: 4800.00,
      category: "Gaji",
      date: "2026-05-15",
      merchant: "Majikan",
      description: "Gaji Bulanan Mei"
    },
    {
      id: "tx-10",
      accountId: "acc-1",
      type: "expense",
      amount: 1500.00,
      category: "Rumah & Sewa",
      date: "2026-05-16",
      merchant: "Tuan Rumah",
      description: "Pemindahan Duit — Sewa Rumah"
    },
    {
      id: "tx-11",
      accountId: "acc-1",
      type: "expense",
      amount: 327.80,
      category: "Barangan Runcit",
      date: "2026-05-17",
      merchant: "Pasar Raya",
      description: "Pembayaran Kad — Pasar Raya"
    },
    {
      id: "tx-12",
      accountId: "acc-1",
      type: "expense",
      amount: 245.00,
      category: "Insurans & Kesihatan",
      date: "2026-05-18",
      merchant: "Syarikat Insurans",
      description: "Bayaran Insurans Bulanan"
    },
    {
      id: "tx-13",
      accountId: "acc-1",
      type: "expense",
      amount: 800.00,
      category: "Simpanan",
      date: "2026-05-20",
      merchant: "Akaun Simpanan",
      description: "Pemindahan Duit — Akaun Simpanan Tambahan"
    },
    {
      id: "tx-14",
      accountId: "acc-1",
      type: "expense",
      amount: 76.30,
      category: "Insurans & Kesihatan",
      date: "2026-05-21",
      merchant: "Farmasi",
      description: "Pembayaran QR — Farmasi"
    },
    {
      id: "tx-15",
      accountId: "acc-1",
      type: "expense",
      amount: 132.40,
      category: "Buku & Pendidikan",
      date: "2026-05-23",
      merchant: "Kedai Buku",
      description: "Pembayaran Kad — Kedai Buku"
    },
    {
      id: "tx-16",
      accountId: "acc-1",
      type: "expense",
      amount: 950.00,
      category: "Pengangkutan",
      date: "2026-05-25",
      merchant: "Ansuran Kereta",
      description: "Bayaran Ansuran Kenderaan"
    },
    {
      id: "tx-17",
      accountId: "acc-1",
      type: "income",
      amount: 120.00,
      category: "Lain-lain",
      date: "2026-05-27",
      merchant: "Bayaran Balik Pembelian",
      description: "Bayaran Balik Pembelian Barang"
    },
    {
      id: "tx-18",
      accountId: "acc-1",
      type: "expense",
      amount: 215.90,
      category: "Beli-belah",
      date: "2026-05-28",
      merchant: "E-Dagang",
      description: "Pembayaran Kad — Belanja E-Dagang"
    },
    {
      id: "tx-19",
      accountId: "acc-1",
      type: "expense",
      amount: 10.00,
      category: "Caj Bank",
      date: "2026-05-30",
      merchant: "ABC Bank",
      description: "Caj Perkhidmatan Bank"
    },
    {
      id: "tx-20",
      accountId: "acc-1",
      type: "expense",
      amount: 45.60,
      category: "Makanan & Minuman",
      date: "2026-05-31",
      merchant: "Kafe",
      description: "Pembayaran QR — Kafe"
    }
  ],
  budgets: [
    { id: "b-1", category: "Barangan Runcit", amount: 600.00 },
    { id: "b-2", category: "Utiliti", amount: 600.00 },
    { id: "b-3", category: "Makanan & Minuman", amount: 200.00 },
    { id: "b-4", category: "Pengangkutan", amount: 1200.00 },
    { id: "b-5", category: "Rumah & Sewa", amount: 1600.00 }
  ],
  goals: [
    {
      id: "g-1",
      name: "Dana Kecemasan",
      targetAmount: 20000.00,
      currentAmount: 12500.00,
      targetDate: "2026-12-31",
      accountId: "acc-1",
      status: "sedang_berjalan"
    },
    {
      id: "g-2",
      name: "Percutian Hujung Tahun",
      targetAmount: 5000.00,
      currentAmount: 1000.00,
      targetDate: "2026-11-30",
      accountId: "acc-1",
      status: "sedang_berjalan"
    }
  ],
  bills: [
    {
      id: "bill-1",
      name: "Sewa Rumah Bulanan",
      amount: 1500.00,
      frequency: "Bulanan",
      dueDate: "16",
      category: "Rumah & Sewa",
      isPaid: true
    },
    {
      id: "bill-2",
      name: "Bil Elektrik TNB",
      amount: 250.00,
      frequency: "Bulanan",
      dueDate: "3",
      category: "Utiliti",
      isPaid: true
    },
    {
      id: "bill-3",
      name: "Internet Unifi Rumah",
      amount: 159.00,
      frequency: "Bulanan",
      dueDate: "12",
      category: "Utiliti",
      isPaid: true
    },
    {
      id: "bill-4",
      name: "Ansuran Kereta",
      amount: 950.00,
      frequency: "Bulanan",
      dueDate: "25",
      category: "Pengangkutan",
      isPaid: true
    }
  ]
};

if (typeof window !== 'undefined') {
  window.INITIAL_DATA = INITIAL_DATA;
}
