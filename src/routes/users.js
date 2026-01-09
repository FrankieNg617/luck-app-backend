'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { getDb } = require('../db/sqlite');

const { birthToUTCDate, getLocalNoonUTCDate } = require('../astrology/time');
const { getLongitudesDeg, getMoonSign } = require('../astrology/planets');
const { ascendantLongitudeDeg } = require('../astrology/ascendant');
const { signFromLongitude } = require('../astrology/zodiac');
const { getLocalDateKey } = require('../astrology/date_key');

/**
 * POST /api/users
 * Body:
 * {
 *   "birthDate":"2002-05-14",
 *   "birthTime":"09:25",
 *   "birthTz":"Asia/Tokyo",
 *   "lat":35.6762,
 *   "lon":139.6503
 * }
 */
router.post('/users', async (req, res, next) => {
  try {
    const { birthDate, birthTime, birthTz, lat, lon } = req.body || {};

    if (!birthDate || !birthTime || !birthTz) {
      return res.status(400).json({ error: 'BadRequest', message: 'birthDate, birthTime, birthTz are required.' });
    }
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({ error: 'BadRequest', message: 'lat and lon must be numbers.' });
    }

    const { utcDate } = birthToUTCDate({ birthDate, birthTime, birthTz });

    const natalLongitudes = getLongitudesDeg(utcDate);

    const ascLon = ascendantLongitudeDeg({ utcDate, latDeg: lat, lonDeg: lon });
    const risingSign = signFromLongitude(ascLon);

    const natal = {
      birth: {
        birthDate,
        birthTime,
        birthTz,
        birth_utc: utcDate.toISOString(),
        lat,
        lon
      },
      longitudes_deg: natalLongitudes,
      sunSign: signFromLongitude(natalLongitudes.Sun),
      moonSign: getMoonSign(natalLongitudes.Moon),
      ascendant: {
        longitude_deg: ascLon,
        risingSign
      },
      houses: {
        system: 'Whole Sign',
        firstHouseSign: risingSign
      }
    };

    const userId = crypto.randomUUID();
    const db = getDb();

    await db.run(
      `INSERT INTO users (id, created_at, birth_utc, birth_tz, lat, lon, natal_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        new Date().toISOString(),
        utcDate.toISOString(),
        birthTz,
        lat,
        lon,
        JSON.stringify(natal)
      ]
    );

    res.json({ userId, natal });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:id
 */
router.get('/users/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const row = await db.get('SELECT id, created_at, natal_json FROM users WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'NotFound', message: 'User not found.' });

    res.json({
      userId: row.id,
      createdAt: row.created_at,
      natal: JSON.parse(row.natal_json)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/daily-personal?userId=...&tz=Asia/Tokyo&date=2026-01-06
 * Optional: &refresh=1  (forces recompute, overwrites cache)
 */
router.get('/daily-personal', async (req, res, next) => {
  try {
    const userId = String(req.query.userId || '').trim();
    const tz = String(req.query.tz || '').trim();
    const dateStr = req.query.date ? String(req.query.date).trim() : '';
    const refresh = String(req.query.refresh || '').trim() === '1';

    if (!userId) return res.status(400).json({ error: 'BadRequest', message: 'Missing userId.' });
    if (!tz) return res.status(400).json({ error: 'BadRequest', message: 'Missing tz (IANA), e.g. Asia/Tokyo.' });

    const db = getDb();

    // Determine the cache key date in that timezone (YYYY-MM-DD)
    const localDateKey = getLocalDateKey({ tz, dateStr });

    // 1) Return cached result (unless refresh=1)
    if (!refresh) {
      const cached = await db.get(
        `SELECT result_json FROM daily_scores WHERE user_id = ? AND local_date = ? AND tz = ?`,
        [userId, localDateKey, tz]
      );
      if (cached) {
        const payload = JSON.parse(cached.result_json);
        payload.meta = payload.meta || {};
        payload.meta.cached = true;
        payload.meta.cache_key = { userId, localDate: localDateKey, tz };
        return res.json(payload);
      }
    }

    // 2) Load natal
    const row = await db.get('SELECT natal_json FROM users WHERE id = ?', [userId]);
    if (!row) return res.status(404).json({ error: 'NotFound', message: 'User not found.' });

    const natal = JSON.parse(row.natal_json);

    // 3) Compute daily anchor (local noon of the requested local date)
    const { localNoon, utcDate } = getLocalNoonUTCDate({ tz, dateStr: localDateKey });

    // 4) Compute transits and aspects
    const transitLongitudes = getLongitudesDeg(utcDate);
    const { computeTransitNatalAspects, aspectToHumanText } = require('../astrology/aspects');
    const aspects = computeTransitNatalAspects(transitLongitudes, natal.longitudes_deg);

    // 5) Score
    const { scorePersonalDay } = require('../astrology/scoring');
    const scored = scorePersonalDay({ sunSign: natal.sunSign, aspects });

    const explanations = scored.topAspects.map(a => aspectToHumanText(a));

    const { getDailyContent } = require('../lists/daily_picker');

    const dailyContent = getDailyContent({
        userId,
        localDate: localDateKey,
        tz
    });

    const payload = {
      meta: {
        userId,
        tz,
        local_date: localDateKey,
        anchored_local_noon: localNoon.toISO(),
        anchored_utc: utcDate.toISOString(),
        cached: false
      },
      natalSummary: {
        sunSign: natal.sunSign,
        moonSign: natal.moonSign,
        risingSign: natal.ascendant?.risingSign
      },
      scores: scored.scores,
      explanations,
      daily_content: dailyContent
    };


    // 6) Upsert cache
    await db.run(
      `INSERT INTO daily_scores (user_id, local_date, tz, anchored_local_noon, anchored_utc, result_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, local_date, tz) DO UPDATE SET
         anchored_local_noon = excluded.anchored_local_noon,
         anchored_utc = excluded.anchored_utc,
         result_json = excluded.result_json,
         created_at = excluded.created_at
      `,
      [
        userId,
        localDateKey,
        tz,
        localNoon.toISO(),
        utcDate.toISOString(),
        JSON.stringify(payload),
        new Date().toISOString()
      ]
    );

    return res.json(payload);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
