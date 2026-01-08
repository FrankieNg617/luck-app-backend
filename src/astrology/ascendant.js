'use strict';

/**
 * Compute Ascendant ecliptic longitude (tropical) in degrees.
 * Inputs:
 * - utcDate: JS Date in UTC
 * - latDeg: observer latitude (degrees, +north)
 * - lonDeg: observer longitude (degrees, +east)
 *
 * Uses standard astronomy approximations:
 * - GMST formula from Meeus-style approximation
 * - Mean obliquity of the ecliptic
 * - Ascendant formula using Local Sidereal Time, latitude, obliquity
 *
 * This is suitable for astrology apps (minute-level accuracy is typically enough).
 */

function deg2rad(d) { return d * Math.PI / 180; }
function rad2deg(r) { return r * 180 / Math.PI; }
function norm360(x) { x %= 360; return x < 0 ? x + 360 : x; }

function julianDate(utcDate) {
  // Unix epoch -> JD
  return utcDate.getTime() / 86400000 + 2440587.5;
}

function gmstDeg(utcDate) {
  const JD = julianDate(utcDate);
  const T = (JD - 2451545.0) / 36525.0;
  // GMST in degrees
  const gmst =
    280.46061837 +
    360.98564736629 * (JD - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  return norm360(gmst);
}

function meanObliquityDeg(utcDate) {
  const JD = julianDate(utcDate);
  const T = (JD - 2451545.0) / 36525.0;
  // Mean obliquity (approx)
  const eps =
    23.439291 -
    0.0130042 * T -
    1.64e-7 * T * T +
    5.04e-7 * T * T * T;
  return eps;
}

function ascendantLongitudeDeg({ utcDate, latDeg, lonDeg }) {
  const theta = norm360(gmstDeg(utcDate) + lonDeg); // Local Sidereal Time in degrees
  const eps = meanObliquityDeg(utcDate);

  const θ = deg2rad(theta);
  const ε = deg2rad(eps);
  const φ = deg2rad(latDeg);

  // λ = atan2( sinθ*cosε - tanφ*sinε, cosθ )
  const y = Math.sin(θ) * Math.cos(ε) - Math.tan(φ) * Math.sin(ε);
  const x = Math.cos(θ);
  let λ = rad2deg(Math.atan2(y, x));
  λ = norm360(λ);

  return λ;
}

module.exports = { ascendantLongitudeDeg };
