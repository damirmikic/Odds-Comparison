/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   API PARSERS — one function per bookmaker response format
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { FLAGS } from '../config.js';

/**
 * Parse raw API response (Merkur / MaxBet share this format).
 * Returns array of { home, away, leagueName, kickOffTime, live, odds, oddsCount }
 */
export function parseMatches(data) {
  return (data.esMatches || [])
    .filter(m => m.sport === 'S')
    .map(m => ({
      home: m.home,
      away: m.away,
      leagueName: m.leagueName,
      kickOffTime: m.kickOffTime,
      live: Boolean(m.live),
      odds: m.odds || {},
      oddsCount: m.oddsCount || 0,
    }));
}

export function isSbtOutright(m) {
  const league = (m.leagueName || '').toLowerCase();
  const home = (m.home || '').toLowerCase();
  const away = (m.away || '').toLowerCase();
  return league.includes('pobednik') || /\d{4}\/\d{2}/.test(league)
    || home.includes('pobednik') || away.includes('pobednik');
}

export function isMaxbetBonus(m) {
  return (m.leagueName || '').toLowerCase().includes('bonus');
}

/**
 * Parse SoccerBet API response.
 * Flattens betMap["N"]["NULL"].ov → odds["N"] to match the flat format
 * used by Merkur/MaxBet.
 */
export function parseSoccerbetMatches(data) {
  return (data.esMatches || [])
    .filter(m => m.sport === 'S' && !isSbtOutright(m))
    .map(m => {
      const odds = {};
      const betMap = m.betMap || {};
      for (const [betType, specMap] of Object.entries(betMap)) {
        if (specMap['NULL'] != null) odds[betType] = specMap['NULL'].ov;
      }
      return {
        home: m.home,
        away: m.away,
        leagueName: m.leagueName,
        kickOffTime: m.kickOffTime,
        live: Boolean(m.live),
        odds,
        oddsCount: m.oddsCount || Object.keys(odds).length,
      };
    });
}

/**
 * Parse Cloudbet API response (competitions[].events[]).
 * Maps soccer.match_odds → odds['1'/'2'/'3'] and
 * soccer.total_goals (total=2.5) → odds['24'/'22'].
 */
export function parseCloudbetMatches(data) {
  // Build slug → display name from FLAGS, sorted longest-first so multi-word
  // countries ("south-korea") match before single-word prefixes ("south").
  const countryBySlug = Object.keys(FLAGS)
    .filter(n => n !== 'Other')
    .map(n => [n.toLowerCase().replace(/\s+/g, '-'), n])
    .sort((a, b) => b[0].length - a[0].length);

  function resolveLeagueName(comp) {
    const rest = comp.key.replace(/^soccer-/, '');
    for (const [slug, country] of countryBySlug) {
      if (rest === slug || rest.startsWith(slug + '-')) {
        return `${country}: ${comp.name}`;
      }
    }
    return comp.name;
  }

  const matches = [];
  for (const comp of (data.competitions || [])) {
    const leagueName = resolveLeagueName(comp);
    for (const event of (comp.events || [])) {
      if (event.type !== 'EVENT_TYPE_EVENT') continue;
      if (!['TRADING', 'TRADING_LIVE'].includes(event.status)) continue;

      const markets = event.markets || {};
      const odds = {};
      const probs = {};

      // 1X2
      const ftMatch = markets['soccer.match_odds']?.submarkets?.['period=ft'];
      if (ftMatch) {
        for (const sel of (ftMatch.selections || [])) {
          if (sel.status !== 'SELECTION_ENABLED') continue;
          if (sel.outcome === 'home') { odds['1'] = sel.price; if (sel.probability > 0) probs['1'] = sel.probability; }
          if (sel.outcome === 'draw') { odds['2'] = sel.price; if (sel.probability > 0) probs['2'] = sel.probability; }
          if (sel.outcome === 'away') { odds['3'] = sel.price; if (sel.probability > 0) probs['3'] = sel.probability; }
        }
      }

      // Over/Under 2.5
      const ftGoals = markets['soccer.total_goals']?.submarkets?.['period=ft'];
      if (ftGoals) {
        for (const sel of (ftGoals.selections || [])) {
          if (sel.status !== 'SELECTION_ENABLED' || sel.params !== 'total=2.5') continue;
          if (sel.outcome === 'over')  { odds['24'] = sel.price; if (sel.probability > 0) probs['24'] = sel.probability; }
          if (sel.outcome === 'under') { odds['22'] = sel.price; if (sel.probability > 0) probs['22'] = sel.probability; }
        }
      }

      // Build fair (no-vig) odds directly from API probabilities
      const fairOdds = {};
      for (const [k, p] of Object.entries(probs)) fairOdds[k] = 1 / p;

      matches.push({
        home: event.home.name,
        away: event.away.name,
        leagueName,
        kickOffTime: new Date(event.cutoffTime).getTime(),
        live: event.status === 'TRADING_LIVE' && new Date(event.cutoffTime).getTime() <= Date.now(),
        odds,
        fairOdds: Object.keys(fairOdds).length > 0 ? fairOdds : undefined,
        probs: Object.keys(probs).length > 0 ? probs : undefined,
        oddsCount: Object.keys(markets).length,
      });
    }
  }
  return matches;
}
