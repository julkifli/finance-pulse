const db = require('./lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Support both GET query or POST body
  const email = req.method === 'GET' ? req.query.email : req.body.email;
  
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await db.query(
      'SELECT profile, accounts, categories, transactions, budgets, goals, bills FROM users_data WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result.rows[0];
    return res.status(200).json({
      profile: row.profile || {},
      accounts: row.accounts || [],
      categories: row.categories || [],
      transactions: row.transactions || [],
      budgets: row.budgets || [],
      goals: row.goals || [],
      bills: row.bills || []
    });
  } catch (err) {
    console.error('Error loading data from SQL:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
