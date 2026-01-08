'use strict';

const express = require('express');
const { initDb } = require('./src/db/sqlite');
const usersRoute = require('./src/routes/users');
const dailyPublicRoute = require('./src/routes/daily_public');

const app = express();
app.use(express.json());

// init DB before serving requests
initDb().then(() => {
  console.log('SQLite ready.');
}).catch((e) => {
  console.error('Failed to init DB:', e);
  process.exit(1);
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api', usersRoute);
app.use('/api', dailyPublicRoute);

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'InternalServerError',
    message: err?.message ?? 'Unknown error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Astrology backend running on http://localhost:${PORT}`);
});
