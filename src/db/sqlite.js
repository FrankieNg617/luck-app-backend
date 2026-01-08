'use strict';

const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const { runMigrations } = require('./migrations');

let db;

async function initDb() {
  if (db) return db;

  const file = process.env.SQLITE_PATH || path.join(process.cwd(), 'data.sqlite');
  db = await open({
    filename: file,
    driver: sqlite3.Database
  });

  await runMigrations(db);
  return db;
}

function getDb() {
  if (!db) throw new Error('DB not initialized yet.');
  return db;
}

module.exports = { initDb, getDb };
