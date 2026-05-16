const { Router } = require('express');
const pool = require('../db');

const router = Router({ mergeParams: true }); // inherit :walletAddress from parent

// Helper: resolve wallet address → user id
async function getUserId(walletAddress) {
  const result = await pool.query(
    'SELECT id FROM users WHERE wallet_address = $1',
    [walletAddress]
  );
  return result.rows[0]?.id ?? null;
}

// GET /api/users/:walletAddress/saved-verses
router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req.params.walletAddress);
    if (!userId) return res.status(404).json({ error: 'User not found' });

    const result = await pool.query(
      'SELECT * FROM saved_verses WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      bookName: row.book_name,
      bookId: row.book_id,
      chapterNumber: row.chapter_number,
      verseNumber: row.verse_number,
      verseText: row.verse_text,
      notes: row.notes,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error('Error fetching saved verses:', error);
    res.status(500).json({ error: 'Failed to fetch saved verses' });
  }
});

// POST /api/users/:walletAddress/saved-verses
router.post('/', async (req, res) => {
  try {
    const { bookName, bookId, chapterNumber, verseNumber, verseText, notes } = req.body;

    if (!bookName || !chapterNumber || !verseNumber || !verseText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await getUserId(req.params.walletAddress);
    if (!userId) return res.status(404).json({ error: 'User not found' });

    // Duplicate check
    const existing = await pool.query(
      `SELECT id FROM saved_verses
       WHERE user_id = $1 AND chapter_number = $2 AND verse_number = $3`,
      [userId, chapterNumber, verseNumber]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Verse already saved' });
    }

    const result = await pool.query(
      `INSERT INTO saved_verses
         (user_id, book_name, book_id, chapter_number, verse_number, verse_text, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, bookName, bookId ?? null, chapterNumber, verseNumber, verseText, notes ?? null]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      userId: row.user_id,
      bookName: row.book_name,
      bookId: row.book_id,
      chapterNumber: row.chapter_number,
      verseNumber: row.verse_number,
      verseText: row.verse_text,
      notes: row.notes,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error('Error saving verse:', error);
    res.status(500).json({ error: 'Failed to save verse' });
  }
});

// DELETE /api/users/:walletAddress/saved-verses/:verseId
router.delete('/:verseId', async (req, res) => {
  try {
    const userId = await getUserId(req.params.walletAddress);
    if (!userId) return res.status(404).json({ error: 'User not found' });

    const result = await pool.query(
      'DELETE FROM saved_verses WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.verseId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Saved verse not found' });
    }

    res.json({ message: 'Verse deleted successfully' });
  } catch (error) {
    console.error('Error deleting saved verse:', error);
    res.status(500).json({ error: 'Failed to delete saved verse' });
  }
});

module.exports = router;
