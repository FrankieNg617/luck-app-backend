'use strict';

const express = require('express');
const router = express.Router();

const { getLocalNoonUTCDate } = require('../astrology/time');
const { getLongitudesDeg, getMoonSign } = require('../astrology/planets');
const { signFromLongitude } = require('../astrology/zodiac');

/**
 * Public / per-sign daily “sky snapshot” endpoint.
 * GET /api/daily-public?tz=Asia/Tokyo&date=2026-01-06
 */
router.get('/daily-public', (req, res, next) => {
  try {
    const tz = String(req.query.tz || '').trim();
    const dateStr = req.query.date ? String(req.query.date).trim() : '';
    if (!tz) return res.status(400).json({ error: 'BadRequest', message: 'Missing tz.' });

    const { localNoon, utcDate } = getLocalNoonUTCDate({ tz, dateStr });
    const longitudes = getLongitudesDeg(utcDate);

    res.json({
      meta: {
        tz,
        anchored_local_noon: localNoon.toISO(),
        anchored_utc: utcDate.toISOString()
      },
      sky: {
        sunSign: signFromLongitude(longitudes.Sun),
        moonSign: getMoonSign(longitudes.Moon),
        longitudes_deg: longitudes
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
