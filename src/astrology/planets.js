'use strict';

const Astronomy = require('astronomy-engine');
const { signFromLongitude } = require('./zodiac');

function norm360(deg) {
  deg %= 360;
  return deg < 0 ? deg + 360 : deg;
}

/**
 * Correct ecliptic longitude (deg 0..360) using astronomy-engine:
 * - Sun:  SunPosition(date).elon
 * - Moon: EclipticGeoMoon(date).lon
 * - Planets: GeoVector(body, date, true) -> Ecliptic(vector).elon
 */
function eclipticLongitudeDeg(bodyEnum, utcDate) {
  if (bodyEnum === Astronomy.Body.Sun) {
    return norm360(Astronomy.SunPosition(utcDate).elon);
  }
  if (bodyEnum === Astronomy.Body.Moon) {
    return norm360(Astronomy.EclipticGeoMoon(utcDate).lon);
  }
  const vec = Astronomy.GeoVector(bodyEnum, utcDate, true);
  const ecl = Astronomy.Ecliptic(vec);
  return norm360(ecl.elon);
}

function getLongitudesDeg(utcDate) {
  const bodies = [
    ['Sun', Astronomy.Body.Sun],
    ['Moon', Astronomy.Body.Moon],
    ['Mercury', Astronomy.Body.Mercury],
    ['Venus', Astronomy.Body.Venus],
    ['Mars', Astronomy.Body.Mars],
    ['Jupiter', Astronomy.Body.Jupiter],
    ['Saturn', Astronomy.Body.Saturn],
    ['Uranus', Astronomy.Body.Uranus],
    ['Neptune', Astronomy.Body.Neptune],
    ['Pluto', Astronomy.Body.Pluto]
  ];

  const out = {};
  for (const [name, bodyEnum] of bodies) {
    out[name] = eclipticLongitudeDeg(bodyEnum, utcDate);
  }
  return out;
}

function getMoonSign(moonLonDeg) {
  return signFromLongitude(moonLonDeg);
}

module.exports = { getLongitudesDeg, getMoonSign };
