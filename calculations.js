/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CALCULATIONS — trader specs, odds analysis, history tracking
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { CONFIG } from './config.js';
import { valid, extractOdds } from './utils.js';
import { state } from './state.js';
import { BOOKIES } from './api/bookies.js';

/**
 * Calculate fair (margin-free) probabilities from bookmaker odds.
 * Uses simple normalization (Equal Margin removal).
 */
export function getFairProbs(h, x, a) {
  if (!valid(h) || !valid(x) || !valid(a)) return null;
  const sum = (1 / h) + (1 / x) + (1 / a);
  return {
    h: (1 / h) / sum,
    x: (1 / x) / sum,
    a: (1 / a) / sum,
    margin: sum - 1,
  };
}

/**
 * Perform trader-specific calculations for a match:
 * 1. Arbitrage detection across all bookmakers.
 * 2. Value detection using Cloudbet as the sharp reference.
 */
export function calculateTraderSpecs(m) {
  const bks = m.bookmakers;
  const allParsed = BOOKIES
    .map(bk => bks[bk.key] ? extractOdds(bks[bk.key].odds) : null)
    .filter(Boolean);

  // 1. ARBITRAGE
  const maxH = Math.max(...allParsed.map(o => o.h).filter(valid), 0);
  const maxX = Math.max(...allParsed.map(o => o.x).filter(valid), 0);
  const maxA = Math.max(...allParsed.map(o => o.a).filter(valid), 0);

  if (maxH > 0 && maxX > 0 && maxA > 0) {
    const arbProb = (1 / maxH) + (1 / maxX) + (1 / maxA);
    if (arbProb < 0.999) {
      m.arb = { roi: (1 / arbProb) - 1, h: maxH, x: maxX, a: maxA };
    }
  }

  // 2. VALUE (Sharp reference = Cloudbet)
  const sharpData = bks.cloudbet;
  if (sharpData) {
    const p = sharpData.probs;
    let fair = null;
    if (p && p['1'] > 0 && p['2'] > 0 && p['3'] > 0) {
      fair = { h: p['1'], x: p['2'], a: p['3'], ov: p['24'], un: p['22'] };
    } else {
      const sharpOdds = extractOdds(sharpData.odds);
      if (valid(sharpOdds.h) && valid(sharpOdds.x) && valid(sharpOdds.a)) {
        const fp = getFairProbs(sharpOdds.h, sharpOdds.x, sharpOdds.a);
        if (fp) fair = { h: fp.h, x: fp.x, a: fp.a };
      }
    }

    if (fair) {
      m.valueBets = [];
      const outcomes = ['h', 'x', 'a'];
      if (fair.ov > 0) outcomes.push('ov', 'un');
      ['merkur', 'maxbet', 'soccerbet'].forEach(bkKey => {
        const bkData = bks[bkKey];
        if (!bkData) return;
        const bkOdds = extractOdds(bkData.odds);
        for (const outcome of outcomes) {
          const prob = fair[outcome];
          if (prob > 0 && valid(bkOdds[outcome])) {
            const ev = bkOdds[outcome] * prob;
            if (ev > 1 + CONFIG.VALUE_MIN_EV) {
              m.valueBets.push({ bk: bkKey, outcome, odd: bkOdds[outcome], fair: 1 / prob, ev: ev - 1 });
            }
          }
        }
      });
      if (m.valueBets.length > 0) m.valueBets.sort((a, b) => b.ev - a.ev);
    }
  }
}

/** CSS class for a single odds cell (best/worst/tied across bookmakers). */
export function getOddClass(val, lo, hi) {
  if (!valid(val)) return 'na';
  if (lo === hi) return 'mid';
  if (val === lo) return 'fav';
  if (val === hi) return 'out';
  return 'mid';
}

/** Returns 'up', 'down', or null for odds movement since last snapshot. */
export function getOddMovement(matchKey, bkKey, outcomeKey, currentVal) {
  const prev = state.prevOddsMap.get(`${matchKey}|${bkKey}`);
  if (!prev || !valid(currentVal) || !valid(prev[outcomeKey])) return null;
  if (currentVal > prev[outcomeKey]) return 'up';
  if (currentVal < prev[outcomeKey]) return 'down';
  return null;
}

/** Append current odds snapshot to the rolling oddsHistory for each match×bookie. */
export function updateOddsHistory() {
  state.allMatches.forEach(m => {
    const matchKey = `${m.home}|${m.away}|${m.leagueName}`;
    BOOKIES.forEach(bk => {
      const data = m.bookmakers[bk.key];
      if (!data) return;
      const o = extractOdds(data.odds);
      const key = `${matchKey}|${bk.key}`;
      if (!state.oddsHistory.has(key)) state.oddsHistory.set(key, { h: [], x: [], a: [] });
      const hist = state.oddsHistory.get(key);
      ['h', 'x', 'a'].forEach(out => {
        if (valid(o[out])) {
          hist[out].push(o[out]);
          if (hist[out].length > CONFIG.ODDS_HISTORY_SIZE) hist[out].shift();
        }
      });
    });
  });
}
