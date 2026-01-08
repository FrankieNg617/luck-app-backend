'use strict';

const { normalizeSign, getRulerPlanet } = require('./zodiac');

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

const DOMAINS = ['Career', 'Fortune', 'Love', 'Social', 'Study'];

/**
 * Domain relevance weights.
 * Now applied to (transitPlanet, natalPlanet) pairs.
 */
const DOMAIN_RELEVANCE = {
  Career: {
    Sun: 0.6, Moon: 0.2, Mercury: 0.4, Venus: 0.1, Mars: 0.7, Jupiter: 0.4, Saturn: 0.8,
    Uranus: 0.3, Neptune: 0.1, Pluto: 0.3
  },
  Fortune: {
    Sun: 0.2, Moon: 0.1, Mercury: 0.3, Venus: 0.6, Mars: 0.2, Jupiter: 0.8, Saturn: 0.4,
    Uranus: 0.3, Neptune: 0.1, Pluto: 0.2
  },
  Love: {
    Sun: 0.2, Moon: 0.7, Mercury: 0.2, Venus: 0.9, Mars: 0.5, Jupiter: 0.2, Saturn: 0.1,
    Uranus: 0.2, Neptune: 0.5, Pluto: 0.3
  },
  Social: {
    Sun: 0.2, Moon: 0.5, Mercury: 0.7, Venus: 0.5, Mars: 0.2, Jupiter: 0.5, Saturn: 0.1,
    Uranus: 0.3, Neptune: 0.2, Pluto: 0.1
  },
  Study: {
    Sun: 0.2, Moon: 0.2, Mercury: 0.9, Venus: 0.1, Mars: 0.2, Jupiter: 0.4, Saturn: 0.6,
    Uranus: 0.3, Neptune: 0.1, Pluto: 0.1
  }
};

// tiny sign “flavor”
const SIGN_BASE = {
  Aries:       { Career: +2, Fortune:  0, Love:  0, Social: +1, Study: -1 },
  Taurus:      { Career:  0, Fortune: +2, Love: +1, Social:  0, Study:  0 },
  Gemini:      { Career: +1, Fortune:  0, Love:  0, Social: +2, Study: +2 },
  Cancer:      { Career:  0, Fortune:  0, Love: +2, Social:  0, Study:  0 },
  Leo:         { Career: +2, Fortune:  0, Love: +1, Social: +1, Study: -1 },
  Virgo:       { Career: +1, Fortune: +1, Love:  0, Social:  0, Study: +2 },
  Libra:       { Career:  0, Fortune:  0, Love: +2, Social: +1, Study:  0 },
  Scorpio:     { Career: +1, Fortune:  0, Love: +1, Social: -1, Study:  0 },
  Sagittarius: { Career: +1, Fortune:  0, Love:  0, Social: +1, Study:  0 },
  Capricorn:   { Career: +2, Fortune: +1, Love: -1, Social: -1, Study: +2 },
  Aquarius:    { Career: +1, Fortune:  0, Love:  0, Social: +1, Study: +1 },
  Pisces:      { Career:  0, Fortune:  0, Love: +1, Social:  0, Study:  0 }
};

function pairDomainRelevance(domain, transitPlanet, natalPlanet) {
  const ra = DOMAIN_RELEVANCE[domain][transitPlanet] ?? 0;
  const rb = DOMAIN_RELEVANCE[domain][natalPlanet] ?? 0;
  return clamp((ra + rb) / 1.5, 0, 1);
}

function tuneConjunctionPolarityFallback(transitBody, natalBody) {
  const pair = new Set([transitBody, natalBody]);
  if (pair.has('Venus') || pair.has('Moon')) return +0.6;
  if (pair.has('Mercury')) return +0.5;
  if (pair.has('Jupiter')) return +0.5;
  if (pair.has('Mars') || pair.has('Sun')) return +0.3;
  if (pair.has('Saturn')) return -0.4;
  return 0;
}

/**
 * Personalized scoring: transit aspects to natal planets.
 * Inputs:
 * - sunSign: user's Sun sign (string)
 * - aspects: transit->natal aspects array
 */
function scorePersonalDay({ sunSign, aspects }) {
  const s = normalizeSign(sunSign);
  const ruler = getRulerPlanet(s);
  const base = SIGN_BASE[s] || { Career: 0, Fortune: 0, Love: 0, Social: 0, Study: 0 };

  const scores = {
    Career: 50 + base.Career,
    Fortune: 50 + base.Fortune,
    Love: 50 + base.Love,
    Social: 50 + base.Social,
    Study: 50 + base.Study
  };

  // Optimism baseline: makes most days feel positive rather than neutral
  for (const k of Object.keys(scores)) {
  scores[k] += 10;
  }

  const negCaps = { Career: -20, Fortune: -20, Love: -20, Social: -18, Study: -20 };
  const posCaps = { Career: +24, Fortune: +24, Love: +24, Social: +22, Study: +24 };
  const accum = { Career: 0, Fortune: 0, Love: 0, Social: 0, Study: 0 };

  const top = aspects.slice(0, 25);

  for (const asp of top) {
    const { transitBody, natalBody, baseWeight, strength, polarity, isMoonAspect } = asp;

    let pol = polarity;
    if (asp.aspect === 'Conjunction' && pol === 0) {
      pol = tuneConjunctionPolarityFallback(transitBody, natalBody);
    }

    const moonBoost = isMoonAspect ? 1.12 : 1.0;

    // Personal bonus if the user's ruler planet is involved (either in transit or natal)
    const rulerBonus = (transitBody === ruler || natalBody === ruler) ? 1.12 : 1.0;

    for (const domain of DOMAINS) {
      const rel = pairDomainRelevance(domain, transitBody, natalBody);
      if (rel <= 0) continue;

      const contrib = strength * baseWeight * pol * rel * moonBoost * rulerBonus;
      accum[domain] += contrib;
    }
  }

  for (const domain of DOMAINS) {
    accum[domain] = clamp(accum[domain], negCaps[domain], posCaps[domain]);
    scores[domain] = clamp(Math.round(scores[domain] + accum[domain]), 0, 100);
  }

  const overall = clamp(
    Math.round(
      0.22 * scores.Career +
      0.18 * scores.Fortune +
      0.22 * scores.Love +
      0.18 * scores.Social +
      0.20 * scores.Study
    ),
    0, 100
  );

  //overall = Math.max(55, overall);

  const topAspects = pickTopExplanations(aspects, 8);

  return {
    scores: {
      overall,
      career: scores.Career,
      fortune: scores.Fortune,
      love: scores.Love,
      social: scores.Social,
      study: scores.Study
    },
    topAspects
  };
}

function pickTopExplanations(aspects, n) {
  const sorted = [...aspects].sort((a, b) => {
    const am = a.isMoonAspect ? 1 : 0;
    const bm = b.isMoonAspect ? 1 : 0;
    if (bm !== am) return bm - am;
    return b.strength - a.strength;
  });

  const seen = new Set();
  const out = [];
  for (const a of sorted) {
    const key = `${a.transitBody}-${a.aspect}-${a.natalBody}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
    if (out.length >= n) break;
  }
  return out;
}

module.exports = { scorePersonalDay };
