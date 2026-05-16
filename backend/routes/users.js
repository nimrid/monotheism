const { Router } = require('express');
const pool = require('../db');

const router = Router();

// POST /api/users/connect-wallet
router.post('/connect-wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const result = await pool.query(
      `INSERT INTO users (wallet_address, last_active)
       VALUES ($1, CURRENT_TIMESTAMP)
       ON CONFLICT (wallet_address)
       DO UPDATE SET
         last_active = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [walletAddress]
    );

    const user = result.rows[0];
    res.json({
      id: user.id,
      walletAddress: user.wallet_address,
      createdAt: user.created_at,
      lastActive: user.last_active,
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    res.status(500).json({ error: 'Failed to connect wallet' });
  }
});

// GET /api/users/:walletAddress
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const result = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      walletAddress: user.wallet_address,
      createdAt: user.created_at,
      lastActive: user.last_active,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
