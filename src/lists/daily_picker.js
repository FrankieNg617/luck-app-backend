'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LIST_DIR = path.join(__dirname); // src/lists/

const LUCK_COLORS = [
  'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet',
  'Pink', 'Purple', 'Teal', 'Cyan', 'Magenta',
  'Black', 'White', 'Gray', 'Brown',
  'Gold', 'Silver', 'Navy', 'Maroon'
];

// in-memory cache so we don't re-read files every request
let cachedLists = null;
let cachedMtime = null;

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0); // ignore empty lines
}

/**
 * Reload lists if any file changed.
 */
function loadLists() {
  const files = [
    'life_advices.txt',
    'suggest_to_do.txt',
    'avoid_to_do.txt',
    'daily_tasks.txt',
    'foods.txt'
  ];

  // Check latest mtime among files
  const mtimes = files.map(f => fs.statSync(path.join(LIST_DIR, f)).mtimeMs);
  const newest = Math.max(...mtimes);

  if (cachedLists && cachedMtime === newest) {
    return cachedLists;
  }

  const lists = {
    lifeAdvices: readLines(path.join(LIST_DIR, 'life_advices.txt')),
    suggestToDo: readLines(path.join(LIST_DIR, 'suggest_to_do.txt')),
    avoidToDo: readLines(path.join(LIST_DIR, 'avoid_to_do.txt')),
    dailyTasks: readLines(path.join(LIST_DIR, 'daily_tasks.txt')),
    foods: readLines(path.join(LIST_DIR, 'foods.txt'))
  };

  cachedLists = lists;
  cachedMtime = newest;
  return lists;
}

function formatHourRange(startHour24) {
  const endHour24 = (startHour24 + 2) % 24;

  function fmt(h24) {
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    let h = h24 % 12;
    if (h === 0) h = 12;
    return `${h}${ampm}`;
  }

  return `${fmt(startHour24)}-${fmt(endHour24)}`;
}

function hashToUint32(str) {
  const h = crypto.createHash('sha256').update(str).digest();
  // use first 4 bytes as uint32
  return h.readUInt32LE(0);
}

// Simple deterministic PRNG
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne(rng, arr) {
  if (!arr.length) throw new Error('List is empty.');
  const idx = Math.floor(rng() * arr.length);
  return arr[idx];
}

/**
 * Picks n unique items from arr, deterministically using rng.
 * If arr has fewer than n items, returns all of them (unique).
 */
function pickNUnique(rng, arr, n) {
  const copy = [...arr];
  const out = [];
  const limit = Math.min(n, copy.length);

  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

/**
 * Main function to generate daily content per user/day.
 * This is deterministic for (userId, localDate, tz).
 */
function getDailyContent({ userId, localDate, tz }) {
  const lists = loadLists();

  // Different streams so categories don't influence each other
  const seedBase = `${userId}|${localDate}|${tz}`;

  const rngAdvice = mulberry32(hashToUint32(seedBase + '|advice'));
  const rngSuggest = mulberry32(hashToUint32(seedBase + '|suggest'));
  const rngAvoid = mulberry32(hashToUint32(seedBase + '|avoid'));
  const rngFood = mulberry32(hashToUint32(seedBase + '|food'));
  const rngTasks = mulberry32(hashToUint32(seedBase + '|tasks'));
  const rngColor = mulberry32(hashToUint32(seedBase + '|color'));
  const rngNumbers = mulberry32(hashToUint32(seedBase + '|numbers'));
  const rngTime = mulberry32(hashToUint32(seedBase + '|time'));


  // Validate lists (better error than silent weirdness)
  if (!lists.lifeAdvices.length) throw new Error('life_advices.txt is empty.');
  if (!lists.suggestToDo.length) throw new Error('suggest_to_do.txt is empty.');
  if (!lists.avoidToDo.length) throw new Error('avoid_to_do.txt is empty.');
  if (!lists.foods.length) throw new Error('foods.txt is empty.');
  if (!lists.dailyTasks.length) throw new Error('daily_tasks.txt is empty.');

  const luckyColor = pickOne(rngColor, LUCK_COLORS);

  // Pick two UNIQUE numbers from 1..99
  const luckyNumbers = pickNUnique(
    rngNumbers,
    Array.from({ length: 99 }, (_, i) => i + 1),
    2
  );

  // Pick a 2-hour time range between 8AM and 11PM
  // Valid start hours: 8..21
  const START_HOUR_MIN = 8;
  const START_HOUR_MAX = 21; // 9PM → 9PM–11PM

  const startHour =
    START_HOUR_MIN +
    Math.floor(rngTime() * (START_HOUR_MAX - START_HOUR_MIN + 1));

  const luckyTime = formatHourRange(startHour);

  return {
    life_advice: pickOne(rngAdvice, lists.lifeAdvices),
    suggest_to_do: pickNUnique(rngSuggest, lists.suggestToDo, 2),
    avoid_to_do: pickNUnique(rngAvoid, lists.avoidToDo, 2),
    lucky_food: pickOne(rngFood, lists.foods),
    daily_tasks: pickNUnique(rngTasks, lists.dailyTasks, 3),
    lucky_color: luckyColor,
    lucky_numbers: luckyNumbers,     // e.g. [7, 42]
    lucky_time: luckyTime            // e.g. "5PM-7PM"
  };
}

module.exports = { getDailyContent };
