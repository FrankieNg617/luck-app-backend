'use strict';

const WESTERN_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

function normalizeSign(sign) {
  const s = String(sign || '').trim().toLowerCase();
  if (!s) return '';
  return WESTERN_SIGNS.find(x => x.toLowerCase() === s) || '';
}

function signFromLongitude(lonDeg) {
  const norm = (((lonDeg % 360) + 360) % 360);
  const idx = Math.floor(norm / 30);
  return WESTERN_SIGNS[idx];
}

function getRulerPlanet(sign) {
  const s = normalizeSign(sign);
  const map = {
    Aries: 'Mars',
    Taurus: 'Venus',
    Gemini: 'Mercury',
    Cancer: 'Moon',
    Leo: 'Sun',
    Virgo: 'Mercury',
    Libra: 'Venus',
    Scorpio: 'Mars',
    Sagittarius: 'Jupiter',
    Capricorn: 'Saturn',
    Aquarius: 'Uranus',
    Pisces: 'Neptune'
  };
  return map[s] || 'Sun';
}

module.exports = { WESTERN_SIGNS, normalizeSign, signFromLongitude, getRulerPlanet };
