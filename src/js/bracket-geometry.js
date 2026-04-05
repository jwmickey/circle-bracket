/**
 * Shared bracket geometry constants and pure utility functions.
 * Used by both the browser-side bracket rendering (bracket.js / utils.js)
 * and the server-side favicon generator (bin/generate-favicon.js).
 */

const teams = require('../data/teams.json');

// widths of rounds when there are 64 slots on the outer ring
const roundWidths64 = [0, 0.075, 0.09, 0.125, 0.15, 0.18, 0.22];

// widths of rounds when there are 32 slots on the outer ring
const roundWidths32 = [0, 0.1, 0.15, 0.175, 0.2, 0.25];

/**
 * Computes [outerRadius, innerRadius] for a given round.
 * @param {number} round - The round number
 * @param {number} numRounds - Total number of rounds
 * @param {number} center - Half-size of the canvas area used as the base radius
 * @param {number} padding - Amount subtracted from center to get the starting radius
 */
const getRadiiForRound = (round, numRounds, center, padding) => {
  const source = numRounds === 7 ? roundWidths64 : roundWidths32;
  let radius = Math.floor(center - padding);
  let innerRadius = 0;

  for (let i = 1; i < round; i++) {
    radius -= Math.floor(center * source[i]);
  }

  if (round < numRounds) {
    innerRadius = Math.floor(radius - center * source[round]);
  }

  return [radius, innerRadius];
};

/**
 * Maps a region code to the corresponding quadrant number.
 * TL→2, TR→3, BL→1, BR→0
 */
const regionToQuadrant = regionCode => {
  switch (regionCode) {
    case "TL": return 2;
    case "TR": return 3;
    case "BL": return 1;
    case "BR": return 0;
    default:   return -1;
  }
};

/**
 * Computes the ring slot index for a team in the final four or championship round.
 * @param {string} regionCode - The team's originating region ('TL', 'TR', 'BL', 'BR')
 * @param {number} round - The round number
 * @param {number} numRounds - Total number of rounds
 */
const translateToSlot = (regionCode, round, numRounds) => {
  const quadrant = regionToQuadrant(regionCode);
  if (quadrant < 0) return 0;

  if (round === numRounds - 1) {
    // championship game: left half (slot 1) vs right half (slot 0)
    return quadrant === 2 || quadrant === 1 ? 1 : 0;
  }
  // final four
  return quadrant;
};

/**
 * Finds a team object by its team code, checking both exact matches and alternate codes.
 * @param {string} code - The team code to search for (e.g., 'UNC', 'DUKE')
 * @returns {object|undefined} The team object from teams.json, or undefined if not found
 */
const findTeamByCode = code => {
  if (teams.hasOwnProperty(code)) {
    return teams[code];
  }
  return Object.values(teams).find(t => {
    if (t.hasOwnProperty('alternates')) {
      if (typeof t.alternates == 'object') {
        const alts = t.alternates.map(a => a.toLowerCase());
        return alts.includes(code);
      } else {
        return t.alternates === code;
      }
    }
  });
};

/**
 * Scales dimensions to fit within maximum bounds while preserving aspect ratio.
 * @param {number} w - Original width
 * @param {number} h - Original height
 * @param {number} mW - Maximum allowed width
 * @param {number} mH - Maximum allowed height
 * @returns {[number, number]} Scaled [width, height] as floored integers
 */
const scaleDims = (w, h, mW, mH) => {
  let scale = Math.min(mW, mH) / Math.max(w, h);
  return [Math.floor(w * scale), Math.floor(h * scale)];
};

/**
 * Calculates the bounding box for a team logo within a ring segment.
 * The bounding box is intentionally over-sized to give logos room to render
 * before the arc clipping path is applied.
 * @param {number} radius - Outer radius of the ring segment
 * @param {number} innerRadius - Inner radius of the ring segment
 * @param {number} centerX - X coordinate of the bracket center
 * @param {number} centerY - Y coordinate of the bracket center
 * @param {number} slots - Total number of slots in this ring
 * @param {number} slot - Zero-based index of this slot
 * @returns {{ x: number, y: number, maxWidth: number, maxHeight: number }}
 */
const calcImageBox = (radius, innerRadius, centerX, centerY, slots, slot) => {
  const quadrant = slot / slots;
  const t1 = ((Math.PI * 2) / slots) * slot;
  const t2 = ((Math.PI * 2) / slots) * (slot + 1);
  let x1Radius, y1Radius, x2Radius, y2Radius;

  if (quadrant < 0.25) {
    x1Radius = innerRadius;
    y1Radius = innerRadius;
    x2Radius = radius;
    y2Radius = radius;
  } else if (quadrant < 0.5) {
    x1Radius = radius;
    y1Radius = innerRadius;
    x2Radius = innerRadius;
    y2Radius = radius;
  } else if (quadrant < 0.75) {
    x1Radius = radius;
    y1Radius = radius;
    x2Radius = innerRadius;
    y2Radius = innerRadius;
  } else {
    x1Radius = innerRadius;
    y1Radius = radius;
    x2Radius = radius;
    y2Radius = innerRadius;
  }

  const x1 = Math.floor(
    Math.min(x1Radius * Math.cos(t1), x1Radius * Math.cos(t2)) + centerX
  );
  const y1 = Math.floor(
    Math.min(y1Radius * Math.sin(t1), y1Radius * Math.sin(t2)) + centerY
  );
  const x2 = Math.floor(
    Math.max(x2Radius * Math.cos(t1), x2Radius * Math.cos(t2)) + centerX
  );
  const y2 = Math.floor(
    Math.max(y2Radius * Math.sin(t1), y2Radius * Math.sin(t2)) + centerY
  );

  const maxWidth = Math.abs(x2 - x1);
  const maxHeight = Math.abs(y2 - y1);

  return { x: x1, y: y1, maxWidth, maxHeight };
};

module.exports = {
  roundWidths64,
  roundWidths32,
  getRadiiForRound,
  regionToQuadrant,
  translateToSlot,
  findTeamByCode,
  scaleDims,
  calcImageBox,
};
