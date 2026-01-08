'use strict';

const ASPECTS = [
  { name: 'Conjunction', angle: 0,   baseWeight: 10, defaultPolarity: 0 },
  { name: 'Sextile',     angle: 60,  baseWeight: 6,  defaultPolarity: +1 },
  { name: 'Square',      angle: 90,  baseWeight: 8,  defaultPolarity: -0.55 },
  { name: 'Trine',       angle: 120, baseWeight: 8,  defaultPolarity: +1 },
  { name: 'Opposition',  angle: 180, baseWeight: 10, defaultPolarity: -0.65 }
];

function angleSepDeg(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function orbForPair(bodyA, bodyB, aspectName) {
  const pair = new Set([bodyA, bodyB]);
  if (aspectName === 'Sextile') {
    if (pair.has('Sun') || pair.has('Moon')) return 5;
    return 4;
  }
  if (pair.has('Sun') || pair.has('Moon')) return 8;
  return 6;
}

function conjunctionPolarity(bodyA, bodyB) {
  const pair = new Set([bodyA, bodyB]);
  if (pair.has('Venus') || pair.has('Jupiter')) return +1;
  if (pair.has('Saturn')) return -1;
  if (pair.has('Mars')) return 0;
  return 0;
}

/**
 * Transit-to-natal aspects.
 * transitLongitudes: { Sun: deg, Moon: deg, ... }
 * natalLongitudes:   { Sun: deg, Moon: deg, ... }
 */
function computeTransitNatalAspects(transitLongitudes, natalLongitudes) {
  const tBodies = Object.keys(transitLongitudes);
  const nBodies = Object.keys(natalLongitudes);

  const found = [];

  for (const t of tBodies) {
    for (const n of nBodies) {
      const sep = angleSepDeg(transitLongitudes[t], natalLongitudes[n]);

      for (const asp of ASPECTS) {
        const orb = orbForPair(t, n, asp.name);
        const dist = Math.abs(sep - asp.angle);

        if (dist <= orb) {
          const strength = 1 - (dist / orb);

          let polarity = asp.defaultPolarity;
          if (asp.name === 'Conjunction') polarity = conjunctionPolarity(t, n);

          const isMoonAspect = (t === 'Moon' || n === 'Moon');

          found.push({
            transitBody: t,
            natalBody: n,
            aspect: asp.name,
            angle: asp.angle,
            separation_deg: sep,
            orb_deg: orb,
            distance_from_exact_deg: dist,
            strength,
            baseWeight: asp.baseWeight,
            polarity,
            isMoonAspect
          });
        }
      }
    }
  }

  found.sort((a, b) => (b.strength + (b.isMoonAspect ? 0.05 : 0)) - (a.strength + (a.isMoonAspect ? 0.05 : 0)));
  return found;
}

function aspectToHumanText(a) {
  const bodies = `${a.transitBody} ${a.aspect} natal ${a.natalBody}`;
  const intensity = a.strength >= 0.75 ? 'strong' : (a.strength >= 0.45 ? 'moderate' : 'mild');
  const tone = a.polarity > 0 ? 'supportive' : (a.polarity < 0 ? 'challenging' : 'mixed');
  return `${bodies} (${intensity}, ${tone})`;
}

module.exports = { computeTransitNatalAspects, aspectToHumanText };
