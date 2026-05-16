// server.js — entry point
// Run with: node backend/server.js

require('dotenv').config();
const express = require('express');

const initDB = require('./initDB');
const usersRouter = require('./routes/users');
const savedVersesRouter = require('./routes/savedVerses');
const readingPlansRouter = require('./routes/readingPlans');
const readingProgressRouter = require('./routes/readingProgress');
const subscriptionsRouter = require('./routes/subscriptions');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/users', usersRouter);
app.use('/api/users/:walletAddress/saved-verses', savedVersesRouter);
app.use('/api/users/:walletAddress/reading-plans', readingPlansRouter);
app.use(
  '/api/users/:walletAddress/reading-plans/:planId/progress',
  readingProgressRouter
);
app.use('/api/users/:walletAddress/subscription', subscriptionsRouter);

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Monotheism API is running',
    timestamp: new Date().toISOString(),
  });
});

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
