'use strict';

const { DateTime } = require('luxon');

/**
 * Returns the YYYY-MM-DD string in the user's timezone that your daily score is for.
 * If dateStr is provided, it must be YYYY-MM-DD and is used directly (validated).
 * Otherwise uses "today" in tz.
 */
function getLocalDateKey({ tz, dateStr }) {
  if (dateStr) {
    const dt = DateTime.fromISO(dateStr, { zone: tz });
    if (!dt.isValid) throw new Error('Invalid date. Use YYYY-MM-DD.');
    return dt.toFormat('yyyy-LL-dd');
  }

  const now = DateTime.now().setZone(tz);
  if (!now.isValid) throw new Error('Invalid timezone (IANA), e.g. Asia/Tokyo.');
  return now.toFormat('yyyy-LL-dd');
}

module.exports = { getLocalDateKey };
