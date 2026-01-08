'use strict';

const { DateTime } = require('luxon');

/**
 * Local-noon anchor for daily transits.
 */
function getLocalNoonUTCDate({ tz, dateStr }) {
  let base;
  if (dateStr) {
    base = DateTime.fromISO(dateStr, { zone: tz });
    if (!base.isValid) throw new Error('Invalid date. Use YYYY-MM-DD.');
  } else {
    base = DateTime.now().setZone(tz);
    if (!base.isValid) throw new Error('Invalid timezone (IANA), e.g. Asia/Tokyo.');
  }

  const localNoon = base.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  const utc = localNoon.toUTC();
  return { localNoon, utcDate: utc.toJSDate() };
}

/**
 * Birth datetime -> UTC Date
 * birthDate: YYYY-MM-DD
 * birthTime: HH:mm (24h)
 */
function birthToUTCDate({ birthDate, birthTime, birthTz }) {
  const dt = DateTime.fromISO(`${birthDate}T${birthTime}`, { zone: birthTz });
  if (!dt.isValid) {
    throw new Error('Invalid birthDate/birthTime/birthTz. Example date=2002-05-14 time=09:25 tz=Asia/Tokyo');
  }
  return { local: dt, utcDate: dt.toUTC().toJSDate() };
}

module.exports = { getLocalNoonUTCDate, birthToUTCDate };
