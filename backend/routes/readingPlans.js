const { Router } = require('express');
const pool = require('../db');

const router = Router({ mergeParams: true });

const COST_PER_DAY = 10; // SKR

async function getUserId(walletAddress) {
  const result = await pool.query(
    'SELECT id, trial_plans_used FROM users WHERE wallet_address = $1',
    [walletAddress]
  );
  return result.rows[0] ?? null;
}

// GET /api/users/:walletAddress/reading-plans
router.get('/', async (req, res) => {
  try {
    const user = await getUserId(req.params.walletAddress);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await pool.query(
      'SELECT * FROM reading_plans WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      days: row.days,
      startDate: row.start_date,
      age: row.age,
      status: row.status,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error('Error fetching reading plans:', error);
    res.status(500).json({ error: 'Failed to fetch reading plans' });
  }
});

// GET /api/users/:walletAddress/reading-plans/trial-status
// NOTE: must be registered before /:id to avoid route conflict
router.get('/trial-status', async (req, res) => {
  try {
    const user = await getUserId(req.params.walletAddress);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const trialsRemaining = Math.max(0, 2 - user.trial_plans_used);
    res.json({
      trialsUsed: user.trial_plans_used,
      trialsRemaining,
      isTrialAvailable: trialsRemaining > 0,
      costPerDay: COST_PER_DAY,
    });
  } catch (error) {
    console.error('Error checking trial status:', error);
    res.status(500).json({ error: 'Failed to check trial status' });
  }
});

// GET /api/users/:walletAddress/reading-plans/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await getUserId(req.params.walletAddress);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await pool.query(
      'SELECT * FROM reading_plans WHERE id = $1 AND user_id = $2',
      [req.params.id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reading plan not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id, userId: row.user_id, name: row.name, days: row.days,
      startDate: row.start_date, age: row.age, status: row.status,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error('Error fetching reading plan:', error);
    res.status(500).json({ error: 'Failed to fetch reading plan' });
  }
});

// POST /api/users/:walletAddress/reading-plans
router.post('/', async (req, res) => {
  try {
    const { name, days, startDate, age, paymentTxSignature } = req.body;

    if (!name || !days || !startDate || !age) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await getUserId(req.params.walletAddress);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const trialsRemaining = Math.max(0, 2 - user.trial_plans_used);
    const isTrialAvailable = trialsRemaining > 0;
    const totalCost = days * COST_PER_DAY;

    if (!isTrialAvailable && !paymentTxSignature) {
      return res.status(402).json({
        error: 'Payment required',
        costSkr: totalCost,
        costPerDay: COST_PER_DAY,
        days,
        message: `This plan costs ${totalCost} SKR (${COST_PER_DAY} SKR per day)`,
      });
    }

    const planResult = await pool.query(
      `INSERT INTO reading_plans
         (user_id, name, days, start_date, age, status, is_trial, payment_tx_signature)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
       RETURNING *`,
      [user.id, name, days, startDate, age, isTrialAvailable, paymentTxSignature ?? null]
    );

    const plan = planResult.rows[0];

    if (isTrialAvailable) {
      await pool.query(
        'UPDATE users SET trial_plans_used = trial_plans_used + 1 WHERE id = $1',
        [user.id]
      );
    }

    if (paymentTxSignature) {
      await pool.query(
        `INSERT INTO reading_plan_payments (user_id, plan_id, amount_skr, tx_signature, status)
         VALUES ($1, $2, $3, $4, 'confirmed')`,
        [user.id, plan.id, totalCost, paymentTxSignature]
      );
    }

    res.status(201).json({
      id: plan.id, userId: plan.user_id, name: plan.name, days: plan.days,
      startDate: plan.start_date, age: plan.age, status: plan.status,
      isTrial: plan.is_trial,
      costSkr: isTrialAvailable ? 0 : totalCost,
      createdAt: plan.created_at,
    });
  } catch (error) {
    console.error('Error creating reading plan:', error);
    res.status(500).json({ error: 'Failed to create reading plan' });
  }
});

// PATCH /api/users/:walletAddress/reading-plans/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await getUserId(req.params.walletAddress);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await pool.query(
      `UPDATE reading_plans
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, req.params.id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reading plan not found' });
    }

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating reading plan:', error);
    res.status(500).json({ error: 'Failed to update reading plan' });
  }
});

// DELETE /api/users/:walletAddress/reading-plans/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await getUserId(req.params.walletAddress);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await pool.query(
      'DELETE FROM reading_plans WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reading plan not found' });
    }

    res.json({ message: 'Reading plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting reading plan:', error);
    res.status(500).json({ error: 'Failed to delete reading plan' });
  }
});

module.exports = router;
