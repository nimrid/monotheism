const { Router } = require('express');
const pool = require('../db');

const router = Router({ mergeParams: true });

async function resolveIds(walletAddress, planId) {
  const userResult = await pool.query(
    'SELECT id FROM users WHERE wallet_address = $1',
    [walletAddress]
  );
  const userId = userResult.rows[0]?.id;
  if (!userId) return { userId: null, planOk: false };

  const planResult = await pool.query(
    'SELECT id FROM reading_plans WHERE id = $1 AND user_id = $2',
    [planId, userId]
  );
  return { userId, planOk: planResult.rows.length > 0 };
}

function mapProgress(row) {
  return {
    id: row.id, userId: row.user_id, planId: row.plan_id,
    chapterId: row.chapter_id, bookName: row.book_name, bookId: row.book_id,
    chapterNumber: row.chapter_number, dayNumber: row.day_number,
    completed: row.completed, progressPercentage: row.progress_percentage,
    startedAt: row.started_at, completedAt: row.completed_at,
    lastPosition: row.last_position,
  };
}

// GET /api/users/:walletAddress/reading-plans/:planId/progress
router.get('/', async (req, res) => {
  try {
    const { walletAddress, planId } = req.params;
    const { userId, planOk } = await resolveIds(walletAddress, planId);
    if (!userId) return res.status(404).json({ error: 'User not found' });
    if (!planOk) return res.status(404).json({ error: 'Reading plan not found' });

    const result = await pool.query(
      `SELECT * FROM reading_progress
       WHERE plan_id = $1 AND user_id = $2
       ORDER BY day_number, chapter_number`,
      [planId, userId]
    );
    res.json(result.rows.map(mapProgress));
  } catch (error) {
    console.error('Error fetching reading progress:', error);
    res.status(500).json({ error: 'Failed to fetch reading progress' });
  }
});

// POST /api/users/:walletAddress/reading-plans/:planId/progress
router.post('/', async (req, res) => {
  try {
    const { walletAddress, planId } = req.params;
    const { chapterId, bookName, bookId, chapterNumber, dayNumber,
            progressPercentage, lastPosition, completed } = req.body;

    const { userId, planOk } = await resolveIds(walletAddress, planId);
    if (!userId) return res.status(404).json({ error: 'User not found' });
    if (!planOk) return res.status(404).json({ error: 'Reading plan not found' });

    const result = await pool.query(
      `INSERT INTO reading_progress
        (user_id, plan_id, chapter_id, book_name, book_id, chapter_number, day_number,
         progress_percentage, last_position, completed, started_at, completed_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         COALESCE((SELECT started_at FROM reading_progress WHERE plan_id = $2 AND chapter_id = $3), CURRENT_TIMESTAMP),
         CASE WHEN $10 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
         CURRENT_TIMESTAMP)
       ON CONFLICT (plan_id, chapter_id) DO UPDATE SET
         progress_percentage = $8, last_position = $9, completed = $10,
         completed_at = CASE WHEN $10 = true THEN CURRENT_TIMESTAMP ELSE reading_progress.completed_at END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, planId, chapterId, bookName, bookId, chapterNumber,
       dayNumber, progressPercentage, lastPosition, completed]
    );
    res.json(mapProgress(result.rows[0]));
  } catch (error) {
    console.error('Error updating reading progress:', error);
    res.status(500).json({ error: 'Failed to update reading progress' });
  }
});

// GET /api/users/:walletAddress/reading-plans/:planId/progress/day/:dayNumber
router.get('/day/:dayNumber', async (req, res) => {
  try {
    const { walletAddress, planId, dayNumber } = req.params;
    const { userId, planOk } = await resolveIds(walletAddress, planId);
    if (!userId) return res.status(404).json({ error: 'User not found' });
    if (!planOk) return res.status(404).json({ error: 'Reading plan not found' });

    const result = await pool.query(
      `SELECT * FROM reading_progress
       WHERE plan_id = $1 AND user_id = $2 AND day_number = $3
       ORDER BY chapter_number`,
      [planId, userId, dayNumber]
    );
    res.json(result.rows.map(mapProgress));
  } catch (error) {
    console.error('Error fetching day progress:', error);
    res.status(500).json({ error: 'Failed to fetch day progress' });
  }
});

// GET /api/users/:walletAddress/reading-plans/:planId/stats
router.get('/stats', async (req, res) => {
  try {
    const { walletAddress, planId } = req.params;
    const { userId, planOk } = await resolveIds(walletAddress, planId);
    if (!userId) return res.status(404).json({ error: 'User not found' });
    if (!planOk) return res.status(404).json({ error: 'Reading plan not found' });

    const result = await pool.query(
      `SELECT COUNT(*) as total_chapters,
              COUNT(*) FILTER (WHERE completed = true) as completed_chapters,
              COUNT(DISTINCT day_number) as total_days,
              COUNT(DISTINCT day_number) FILTER (WHERE completed = true) as completed_days,
              AVG(progress_percentage) as avg_progress,
              MAX(day_number) FILTER (WHERE completed = true) as last_completed_day
       FROM reading_progress WHERE plan_id = $1 AND user_id = $2`,
      [planId, userId]
    );

    const s = result.rows[0];
    res.json({
      totalChapters: parseInt(s.total_chapters) || 0,
      completedChapters: parseInt(s.completed_chapters) || 0,
      totalDays: parseInt(s.total_days) || 0,
      completedDays: parseInt(s.completed_days) || 0,
      averageProgress: parseFloat(s.avg_progress) || 0,
      lastCompletedDay: parseInt(s.last_completed_day) || 0,
      completionPercentage: s.total_chapters > 0
        ? Math.round((s.completed_chapters / s.total_chapters) * 100) : 0,
    });
  } catch (error) {
    console.error('Error fetching plan stats:', error);
    res.status(500).json({ error: 'Failed to fetch plan statistics' });
  }
});

// PATCH /api/users/:walletAddress/reading-plans/:planId/progress/:chapterId/complete
router.patch('/:chapterId/complete', async (req, res) => {
  try {
    const { walletAddress, planId, chapterId } = req.params;
    const { userId, planOk } = await resolveIds(walletAddress, planId);
    if (!userId) return res.status(404).json({ error: 'User not found' });
    if (!planOk) return res.status(404).json({ error: 'Reading plan not found' });

    const result = await pool.query(
      `UPDATE reading_progress
       SET completed = true, progress_percentage = 100,
           completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE plan_id = $1 AND chapter_id = $2 AND user_id = $3 RETURNING *`,
      [planId, chapterId, userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Progress record not found' });
    res.json({ message: 'Chapter marked as completed' });
  } catch (error) {
    console.error('Error marking chapter complete:', error);
    res.status(500).json({ error: 'Failed to mark chapter as completed' });
  }
});

// GET /api/users/:walletAddress/reading-plans/:planId/streak
router.get('/streak', async (req, res) => {
  try {
    const { walletAddress, planId } = req.params;
    const { userId, planOk } = await resolveIds(walletAddress, planId);
    if (!userId) return res.status(404).json({ error: 'User not found' });
    if (!planOk) return res.status(404).json({ error: 'Reading plan not found' });

    const result = await pool.query(
      `SELECT day_number, DATE(completed_at) as completion_date, COUNT(*) as chapters_completed
       FROM reading_progress
       WHERE plan_id = $1 AND user_id = $2 AND completed = true
       GROUP BY day_number, DATE(completed_at)
       ORDER BY day_number DESC`,
      [planId, userId]
    );

    const days = result.rows;
    let currentStreak = 0, bestStreak = 0, tempStreak = 0;
    for (let i = 0; i < days.length; i++) {
      if (i === 0 || days[i].day_number === days[i - 1].day_number - 1) {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
      } else { tempStreak = 1; }
      bestStreak = Math.max(bestStreak, tempStreak);
    }

    res.json({
      currentStreak, bestStreak,
      totalDaysCompleted: days.length,
      lastCompletedDate: days.length > 0 ? days[0].completion_date : null,
    });
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: 'Failed to fetch reading streak' });
  }
});

module.exports = router;
