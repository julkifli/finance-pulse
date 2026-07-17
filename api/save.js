const db = require('./lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, profile, accounts, categories, transactions, budgets, goals, bills } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required to save data' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Upsert query
    await db.query(
      `INSERT INTO users_data (email, profile, accounts, categories, transactions, budgets, goals, bills, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (email) 
       DO UPDATE SET 
         profile = EXCLUDED.profile,
         accounts = EXCLUDED.accounts,
         categories = EXCLUDED.categories,
         transactions = EXCLUDED.transactions,
         budgets = EXCLUDED.budgets,
         goals = EXCLUDED.goals,
         bills = EXCLUDED.bills,
         updated_at = NOW()`,
      [
        normalizedEmail,
        JSON.stringify(profile || {}),
        JSON.stringify(accounts || []),
        JSON.stringify(categories || []),
        JSON.stringify(transactions || []),
        JSON.stringify(budgets || []),
        JSON.stringify(goals || []),
        JSON.stringify(bills || [])
      ]
    );

    return res.status(200).json({ success: true, message: 'Data saved successfully to SQL database' });
  } catch (err) {
    console.error('Error saving data to SQL:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
