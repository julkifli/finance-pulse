const db = require('./lib/db');

module.exports = async (req, res) => {
  try {
    const hasEnv = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
    if (!hasEnv) {
      return res.status(200).json({ enabled: false, error: "Database environment variable not set." });
    }
    
    // Test connection
    await db.query('SELECT 1');
    return res.status(200).json({ enabled: true, database: 'postgresql' });
  } catch (err) {
    return res.status(200).json({ enabled: false, error: err.message });
  }
};
