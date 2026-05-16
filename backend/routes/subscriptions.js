const { Router } = require('express');
const pool = require('../db');

const router = Router({ mergeParams: true });

// GET /api/users/:walletAddress/subscription
router.get('/', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const userResult = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [walletAddress]
    );

    if (userResult.rows.length === 0) {
      return res.json({ isPremium: false, purchaseDate: null, txSignature: null });
    }

    const userId = userResult.rows[0].id;

    const subResult = await pool.query(
      `SELECT tx_signature, amount_skr, is_active, purchased_at
       FROM premium_subscriptions
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      return res.json({ isPremium: false, purchaseDate: null, txSignature: null });
    }

    const sub = subResult.rows[0];
    res.json({
      isPremium: true,
      purchaseDate: sub.purchased_at,
      expiryDate: null,
      txSignature: sub.tx_signature,
      amountSKR: parseFloat(sub.amount_skr),
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// POST /api/users/:walletAddress/subscription
router.post('/', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { txSignature, amountSKR } = req.body;

    if (!txSignature || !amountSKR) {
      return res.status(400).json({ error: 'txSignature and amountSKR are required' });
    }

    // Upsert user
    const userResult = await pool.query(
      `INSERT INTO users (wallet_address, last_active)
       VALUES ($1, CURRENT_TIMESTAMP)
       ON CONFLICT (wallet_address)
       DO UPDATE SET last_active = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [walletAddress]
    );
    const userId = userResult.rows[0].id;

    // Duplicate transaction guard
    const dupCheck = await pool.query(
      'SELECT id FROM premium_subscriptions WHERE tx_signature = $1',
      [txSignature]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Transaction already recorded', isPremium: true });
    }

    // Upsert subscription (one active record per user)
    await pool.query(
      `INSERT INTO premium_subscriptions (user_id, tx_signature, amount_skr, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (user_id) DO UPDATE SET
         tx_signature = $2, amount_skr = $3, is_active = true,
         purchased_at = CURRENT_TIMESTAMP`,
      [userId, txSignature, amountSKR]
    );

    console.log(`[Subscription] Premium activated for ${walletAddress} | tx: ${txSignature}`);

    res.status(201).json({
      isPremium: true,
      purchaseDate: new Date().toISOString(),
      txSignature,
      amountSKR,
    });
  } catch (error) {
    console.error('Error recording subscription:', error);
    res.status(500).json({ error: 'Failed to record subscription' });
  }
});

module.exports = router;
