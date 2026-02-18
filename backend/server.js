// Simple Express.js backend for reading plans
// Run with: node backend/server.js

const express = require('express');
const { Pool } = require('pg');
require('dotenv').config(); // Now loads from backend/.env

const app = express();
app.use(express.json());

// Enable CORS for React Native app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Log connection info (without exposing password)
if (process.env.DATABASE_URL) {
  console.log('✓ DATABASE_URL found in environment');
} else {
  console.error('✗ DATABASE_URL not found! Check your .env file');
}

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// Create reading_plans table if it doesn't exist
const initDB = async () => {
  const createTablesQuery = `
    -- Users Table (Primary table linking everything)
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_address VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Reading Plans Table
    CREATE TABLE IF NOT EXISTS reading_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      days INTEGER NOT NULL,
      start_date DATE NOT NULL,
      age INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Reading Progress Table
    CREATE TABLE IF NOT EXISTS reading_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE,
      chapter_id VARCHAR(50) NOT NULL,
      book_name VARCHAR(100) NOT NULL,
      book_id VARCHAR(10) NOT NULL,
      chapter_number INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      completed BOOLEAN DEFAULT false,
      progress_percentage INTEGER DEFAULT 0,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      last_position INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(plan_id, chapter_id)
    );

    -- Daily Reading Sessions Table
    CREATE TABLE IF NOT EXISTS reading_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      session_date DATE NOT NULL,
      completed BOOLEAN DEFAULT false,
      chapters_completed INTEGER DEFAULT 0,
      total_chapters INTEGER NOT NULL,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(plan_id, day_number)
    );

    -- Saved Verses Table
    CREATE TABLE IF NOT EXISTS saved_verses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      book_name VARCHAR(100) NOT NULL,
      book_id VARCHAR(10) NOT NULL,
      chapter_number INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      verse_text TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Bible Definitions Search History
    CREATE TABLE IF NOT EXISTS definition_searches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      search_term VARCHAR(255) NOT NULL,
      result_word VARCHAR(255),
      result_definition TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_reading_plans_user_id ON reading_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_reading_progress_plan_id ON reading_progress(plan_id);
    CREATE INDEX IF NOT EXISTS idx_reading_progress_completed ON reading_progress(completed);
    CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON reading_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_reading_sessions_plan_id ON reading_sessions(plan_id);
    CREATE INDEX IF NOT EXISTS idx_reading_sessions_date ON reading_sessions(session_date);
    CREATE INDEX IF NOT EXISTS idx_saved_verses_user_id ON saved_verses(user_id);
    CREATE INDEX IF NOT EXISTS idx_definition_searches_user_id ON definition_searches(user_id);
  `;
  
  try {
    await pool.query(createTablesQuery);
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

initDB();

// ============================================
// USER / WALLET ENDPOINTS
// ============================================

// Connect wallet - creates or updates user
app.post('/api/users/connect-wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Upsert user - create if doesn't exist, update last_active if exists
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

// Get user by wallet address
app.get('/api/users/:walletAddress', async (req, res) => {
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

// ============================================
// SAVED VERSES ENDPOINTS
// ============================================

// Get all saved verses for a user
app.get('/api/users/:walletAddress/saved-verses', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Get user ID from wallet address
    const userResult = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Get saved verses
    const result = await pool.query(
      `SELECT * FROM saved_verses 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    const verses = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      bookName: row.book_name,
      bookId: row.book_id,
      chapterNumber: row.chapter_number,
      verseNumber: row.verse_number,
      verseText: row.verse_text,
      notes: row.notes,
      createdAt: row.created_at,
    }));
    
    res.json(verses);
  } catch (error) {
    console.error('Error fetching saved verses:', error);
    res.status(500).json({ error: 'Failed to fetch saved verses' });
  }
});

// Save a verse
app.post('/api/users/:walletAddress/saved-verses', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { bookName, bookId, chapterNumber, verseNumber, verseText, notes } = req.body;
    
    if (!bookName || !bookId || !chapterNumber || !verseNumber || !verseText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get user ID from wallet address
    const userResult = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Check if verse is already saved
    const existingVerse = await pool.query(
      `SELECT id FROM saved_verses 
       WHERE user_id = $1 AND book_id = $2 AND chapter_number = $3 AND verse_number = $4`,
      [userId, bookId, chapterNumber, verseNumber]
    );
    
    if (existingVerse.rows.length > 0) {
      return res.status(409).json({ error: 'Verse already saved' });
    }
    
    // Save verse
    const result = await pool.query(
      `INSERT INTO saved_verses (user_id, book_name, book_id, chapter_number, verse_number, verse_text, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, bookName, bookId, chapterNumber, verseNumber, verseText, notes || null]
    );
    
    const row = result.rows[0];
    const savedVerse = {
      id: row.id,
      userId: row.user_id,
      bookName: row.book_name,
      bookId: row.book_id,
      chapterNumber: row.chapter_number,
      verseNumber: row.verse_number,
      verseText: row.verse_text,
      notes: row.notes,
      createdAt: row.created_at,
    };
    
    res.status(201).json(savedVerse);
  } catch (error) {
    console.error('Error saving verse:', error);
    res.status(500).json({ error: 'Failed to save verse' });
  }
});

// Delete a saved verse
app.delete('/api/users/:walletAddress/saved-verses/:verseId', async (req, res) => {
  try {
    const { walletAddress, verseId } = req.params;
    
    // Get user ID from wallet address
    const userResult = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Delete verse
    const result = await pool.query(
      'DELETE FROM saved_verses WHERE id = $1 AND user_id = $2 RETURNING *',
      [verseId, userId]
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

// Get all reading plans
app.get('/api/reading-plans', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reading_plans ORDER BY created_at DESC'
    );
    
    const plans = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      days: row.days,
      startDate: row.start_date,
      age: row.age,
      status: row.status,
      createdAt: row.created_at,
    }));
    
    res.json(plans);
  } catch (error) {
    console.error('Error fetching reading plans:', error);
    res.status(500).json({ error: 'Failed to fetch reading plans' });
  }
});

// Get a specific reading plan
app.get('/api/reading-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM reading_plans WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reading plan not found' });
    }
    
    const row = result.rows[0];
    const plan = {
      id: row.id,
      name: row.name,
      days: row.days,
      startDate: row.start_date,
      age: row.age,
      status: row.status,
      createdAt: row.created_at,
    };
    
    res.json(plan);
  } catch (error) {
    console.error('Error fetching reading plan:', error);
    res.status(500).json({ error: 'Failed to fetch reading plan' });
  }
});

// Create a new reading plan
app.post('/api/reading-plans', async (req, res) => {
  try {
    const { name, days, startDate, age } = req.body;
    
    if (!name || !days || !startDate || !age) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      `INSERT INTO reading_plans (name, days, start_date, age, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [name, days, startDate, age]
    );
    
    const row = result.rows[0];
    const plan = {
      id: row.id,
      name: row.name,
      days: row.days,
      startDate: row.start_date,
      age: row.age,
      status: row.status,
      createdAt: row.created_at,
    };
    
    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating reading plan:', error);
    res.status(500).json({ error: 'Failed to create reading plan' });
  }
});

// Update reading plan status
app.patch('/api/reading-plans/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const result = await pool.query(
      `UPDATE reading_plans 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
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

// Delete a reading plan
app.delete('/api/reading-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM reading_plans WHERE id = $1 RETURNING *',
      [id]
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

// ============================================
// READING PROGRESS ENDPOINTS
// ============================================

// Get all progress for a reading plan
app.get('/api/reading-plans/:planId/progress', async (req, res) => {
  try {
    const { planId } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM reading_progress 
       WHERE plan_id = $1 
       ORDER BY day_number, chapter_number`,
      [planId]
    );
    
    const progress = result.rows.map(row => ({
      id: row.id,
      planId: row.plan_id,
      chapterId: row.chapter_id,
      bookName: row.book_name,
      bookId: row.book_id,
      chapterNumber: row.chapter_number,
      dayNumber: row.day_number,
      completed: row.completed,
      progressPercentage: row.progress_percentage,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      lastPosition: row.last_position,
    }));
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching reading progress:', error);
    res.status(500).json({ error: 'Failed to fetch reading progress' });
  }
});

// Update chapter progress
app.post('/api/reading-plans/:planId/progress', async (req, res) => {
  try {
    const { planId } = req.params;
    const { 
      chapterId, 
      bookName, 
      bookId, 
      chapterNumber, 
      dayNumber,
      progressPercentage,
      lastPosition,
      completed 
    } = req.body;
    
    // Upsert progress
    const result = await pool.query(
      `INSERT INTO reading_progress 
        (plan_id, chapter_id, book_name, book_id, chapter_number, day_number, 
         progress_percentage, last_position, completed, started_at, completed_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
         COALESCE((SELECT started_at FROM reading_progress WHERE plan_id = $1 AND chapter_id = $2), CURRENT_TIMESTAMP),
         CASE WHEN $9 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
         CURRENT_TIMESTAMP)
       ON CONFLICT (plan_id, chapter_id) 
       DO UPDATE SET
         progress_percentage = $7,
         last_position = $8,
         completed = $9,
         completed_at = CASE WHEN $9 = true THEN CURRENT_TIMESTAMP ELSE reading_progress.completed_at END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [planId, chapterId, bookName, bookId, chapterNumber, dayNumber, 
       progressPercentage, lastPosition, completed]
    );
    
    const row = result.rows[0];
    const progress = {
      id: row.id,
      planId: row.plan_id,
      chapterId: row.chapter_id,
      bookName: row.book_name,
      bookId: row.book_id,
      chapterNumber: row.chapter_number,
      dayNumber: row.day_number,
      completed: row.completed,
      progressPercentage: row.progress_percentage,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      lastPosition: row.last_position,
    };
    
    res.json(progress);
  } catch (error) {
    console.error('Error updating reading progress:', error);
    res.status(500).json({ error: 'Failed to update reading progress' });
  }
});

// Get progress for a specific day
app.get('/api/reading-plans/:planId/progress/day/:dayNumber', async (req, res) => {
  try {
    const { planId, dayNumber } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM reading_progress 
       WHERE plan_id = $1 AND day_number = $2
       ORDER BY chapter_number`,
      [planId, dayNumber]
    );
    
    const progress = result.rows.map(row => ({
      id: row.id,
      planId: row.plan_id,
      chapterId: row.chapter_id,
      bookName: row.book_name,
      bookId: row.book_id,
      chapterNumber: row.chapter_number,
      dayNumber: row.day_number,
      completed: row.completed,
      progressPercentage: row.progress_percentage,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      lastPosition: row.last_position,
    }));
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching day progress:', error);
    res.status(500).json({ error: 'Failed to fetch day progress' });
  }
});

// Get overall plan statistics
app.get('/api/reading-plans/:planId/stats', async (req, res) => {
  try {
    const { planId } = req.params;
    
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_chapters,
         COUNT(*) FILTER (WHERE completed = true) as completed_chapters,
         COUNT(DISTINCT day_number) as total_days,
         COUNT(DISTINCT day_number) FILTER (WHERE completed = true) as completed_days,
         AVG(progress_percentage) as avg_progress,
         MAX(day_number) FILTER (WHERE completed = true) as last_completed_day
       FROM reading_progress
       WHERE plan_id = $1`,
      [planId]
    );
    
    const stats = result.rows[0];
    
    res.json({
      totalChapters: parseInt(stats.total_chapters) || 0,
      completedChapters: parseInt(stats.completed_chapters) || 0,
      totalDays: parseInt(stats.total_days) || 0,
      completedDays: parseInt(stats.completed_days) || 0,
      averageProgress: parseFloat(stats.avg_progress) || 0,
      lastCompletedDay: parseInt(stats.last_completed_day) || 0,
      completionPercentage: stats.total_chapters > 0 
        ? Math.round((stats.completed_chapters / stats.total_chapters) * 100)
        : 0
    });
  } catch (error) {
    console.error('Error fetching plan stats:', error);
    res.status(500).json({ error: 'Failed to fetch plan statistics' });
  }
});

// Mark chapter as completed
app.patch('/api/reading-plans/:planId/progress/:chapterId/complete', async (req, res) => {
  try {
    const { planId, chapterId } = req.params;
    
    const result = await pool.query(
      `UPDATE reading_progress 
       SET completed = true, 
           progress_percentage = 100,
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE plan_id = $1 AND chapter_id = $2
       RETURNING *`,
      [planId, chapterId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Progress record not found' });
    }
    
    res.json({ message: 'Chapter marked as completed' });
  } catch (error) {
    console.error('Error marking chapter complete:', error);
    res.status(500).json({ error: 'Failed to mark chapter as completed' });
  }
});

// Get reading streak
app.get('/api/reading-plans/:planId/streak', async (req, res) => {
  try {
    const { planId } = req.params;
    
    // Get all days with completed chapters, grouped by day
    const result = await pool.query(
      `SELECT 
         day_number,
         DATE(completed_at) as completion_date,
         COUNT(*) as chapters_completed
       FROM reading_progress
       WHERE plan_id = $1 AND completed = true
       GROUP BY day_number, DATE(completed_at)
       ORDER BY day_number DESC`,
      [planId]
    );
    
    const completedDays = result.rows;
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    // Calculate streaks (simplified - counts consecutive days)
    for (let i = 0; i < completedDays.length; i++) {
      if (i === 0 || completedDays[i].day_number === completedDays[i-1].day_number - 1) {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    }
    
    res.json({
      currentStreak,
      bestStreak,
      totalDaysCompleted: completedDays.length,
      lastCompletedDate: completedDays.length > 0 ? completedDays[0].completion_date : null
    });
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: 'Failed to fetch reading streak' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Reading Plans API is running',
    timestamp: new Date().toISOString()
  });
});
