/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MERGE — fuzzy match + cross-bookmaker consolidation
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { CONFIG } from './config.js';
import { normTeam, normLeague, pickBetterLeagueName, fuzzyTeamMatch } from './utils.js';
import { BOOKIES } from './api/bookies.js';

/**
 * Unified 4-pass fuzzy match finder used by both mergeMatches and mergeBookmaker.
 *
 * Pass 0 — Alias (from Supabase alias DB, with optional cross-bookie fallback)
 * Pass 1 — Exact normalized home|away key, within getWin(mk)
 * Pass 2 — Fuzzy both sides (substring / token Jaccard), within getWin(mk)
 * Pass 3 — Partial (one exact side + one fuzzy), within getStrict(mk)
 */
export function findMatch(mk, targetList, targetNorm, exactIndex, used, getWin, getStrict, teamMap, leagueMap, crossAliasMaps = {}) {
  const mkH = normTeam(mk.home);
  const mkA = normTeam(mk.away);
  const mkL = normLeague(mk.leagueName);
  const tw = getWin(mk);
  const ts = getStrict(mk);

  // ── Pass 0: Alias ──────────────────────────────────────────────────────────
  let activeTeamMap = teamMap;
  let activeLeagueMap = leagueMap;
  if (!mk.bookmakers?.merkur) {
    for (const [bk, maps] of Object.entries(crossAliasMaps)) {
      if (mk.bookmakers?.[bk] !== null) {
        activeTeamMap = maps.team;
        activeLeagueMap = maps.league;
        break;
      }
    }
  }
  const targetHs = activeTeamMap.get(mkH);
  const targetAs = activeTeamMap.get(mkA);
  if (targetHs || targetAs) {
    // With league signal first
    for (let i = 0; i < targetList.length; i++) {
      if (used.has(i)) continue;
      if (Math.abs(targetList[i].kickOffTime - mk.kickOffTime) > tw) continue;
      const homeMatch = targetHs ? targetHs.has(targetNorm[i].home) : (mkH === targetNorm[i].home);
      const awayMatch = targetAs ? targetAs.has(targetNorm[i].away) : (mkA === targetNorm[i].away);
      const targetLs = activeLeagueMap.get(mkL);
      const leagueMatch = (targetLs && targetLs.has(targetNorm[i].league)) || (mkL === targetNorm[i].league);
      if (homeMatch && awayMatch && leagueMatch) return { idx: i, quality: 'alias' };
    }
    // Fallback: without league signal
    for (let i = 0; i < targetList.length; i++) {
      if (used.has(i)) continue;
      if (Math.abs(targetList[i].kickOffTime - mk.kickOffTime) > tw) continue;
      const homeMatch = targetHs ? targetHs.has(targetNorm[i].home) : (mkH === targetNorm[i].home);
      const awayMatch = targetAs ? targetAs.has(targetNorm[i].away) : (mkA === targetNorm[i].away);
      if (homeMatch && awayMatch) return { idx: i, quality: 'alias' };
    }
  }

  // ── Pass 1: Exact normalized key ────────────────────────────────────────────
  const key1 = `${mkH}|${mkA}`;
  for (const idx of (exactIndex[key1] || [])) {
    if (used.has(idx)) continue;
    if (Math.abs(targetList[idx].kickOffTime - mk.kickOffTime) <= tw) return { idx, quality: 'exact' };
  }

  // ── Pass 2: Fuzzy both sides ────────────────────────────────────────────────
  let bestIdx = -1, bestScore = 0;
  targetList.forEach((entry, i) => {
    if (used.has(i)) return;
    if (Math.abs(entry.kickOffTime - mk.kickOffTime) > tw) return;
    if (fuzzyTeamMatch(mkH, targetNorm[i].home) && fuzzyTeamMatch(mkA, targetNorm[i].away)) {
      const score = 1 - Math.abs(entry.kickOffTime - mk.kickOffTime) / tw;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
  });
  if (bestIdx !== -1) return { idx: bestIdx, quality: 'fuzzy' };

  // ── Pass 3: Partial (one side exact, other fuzzy) ───────────────────────────
  bestIdx = -1; bestScore = 0;
  targetList.forEach((entry, i) => {
    if (used.has(i)) return;
    if (Math.abs(entry.kickOffTime - mk.kickOffTime) > ts) return;
    const homeExact = mkH === targetNorm[i].home;
    const awayExact = mkA === targetNorm[i].away;
    const homeFuzz = fuzzyTeamMatch(mkH, targetNorm[i].home);
    const awayFuzz = fuzzyTeamMatch(mkA, targetNorm[i].away);
    if ((homeExact && awayFuzz) || (awayExact && homeFuzz)) {
      const score = 1 - Math.abs(entry.kickOffTime - mk.kickOffTime) / ts;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
  });
  if (bestIdx !== -1) return { idx: bestIdx, quality: 'partial' };

  return { idx: -1, quality: null };
}

/**
 * Detects a systematic kickoff time offset (timezone bug) in newList relative
 * to mergedList by sampling exact name matches and computing the median delta.
 * Returns the offset in ms to subtract from newList times, or 0 if no clear
 * whole-hour offset is found.
 */
export function detectBookieTimeOffset(mergedList, newList) {
  const newNormMap = new Map();
  newList.forEach(e => {
    const key = `${normTeam(e.home)}|${normTeam(e.away)}`;
    if (!newNormMap.has(key)) newNormMap.set(key, e.kickOffTime);
  });

  const deltas = [];
  for (const mk of mergedList) {
    const key = `${normTeam(mk.home)}|${normTeam(mk.away)}`;
    const newTime = newNormMap.get(key);
    if (newTime !== undefined) {
      deltas.push(newTime - mk.kickOffTime);
      if (deltas.length >= CONFIG.TIMEZONE_SAMPLE_SIZE) break;
    }
  }

  if (deltas.length < 3) return 0;
  deltas.sort((a, b) => a - b);
  const median = deltas[Math.floor(deltas.length / 2)];
  const nearestHour = Math.round(median / 3600000) * 3600000;
  return Math.abs(median - nearestHour) < CONFIG.TIMEZONE_TOLERANCE ? nearestHour : 0;
}

/**
 * Merge merkur (canonical) and maxbet lists using 4-pass fuzzy matching.
 */
export function mergeMatches(merkurList, maxbetList, teamAliasMap, leagueAliasMap) {
  const merged = [];
  const usedMb = new Set();
  const TIME_WIN = CONFIG.MERGE_TIME_WIN;
  const TIME_STRICT = CONFIG.MERGE_TIME_STRICT;

  const timeOffset = detectBookieTimeOffset(merkurList, maxbetList);
  if (timeOffset !== 0) {
    console.info(`[maxbet] Correcting kickoff times by ${timeOffset / 3600000 > 0 ? '+' : ''}${timeOffset / 3600000}h`);
    maxbetList = maxbetList.map(e => ({ ...e, kickOffTime: e.kickOffTime - timeOffset }));
  }

  const mbNorm = maxbetList.map(m => ({
    home: normTeam(m.home),
    away: normTeam(m.away),
    league: normLeague(m.leagueName),
  }));

  const getWin = () => TIME_WIN;
  const getStrict = () => TIME_STRICT;

  const exactIndex = {};
  maxbetList.forEach((m, i) => {
    const key = `${mbNorm[i].home}|${mbNorm[i].away}`;
    if (!exactIndex[key]) exactIndex[key] = [];
    exactIndex[key].push(i);
  });

  for (const mk of merkurList) {
    const { idx, quality } = findMatch(mk, maxbetList, mbNorm, exactIndex, usedMb, getWin, getStrict, teamAliasMap, leagueAliasMap);

    if (idx !== -1) {
      usedMb.add(idx);
      const mb = maxbetList[idx];
      const bestLg = pickBetterLeagueName(mk.leagueName, mb.leagueName);
      merged.push({
        home: mk.home,
        away: mk.away,
        leagueName: bestLg,
        kickOffTime: mk.kickOffTime,
        live: mk.live || mb.live,
        bookmakers: {
          merkur: { odds: mk.odds, oddsCount: mk.oddsCount, kickOffTime: mk.kickOffTime },
          maxbet: { odds: mb.odds, oddsCount: mb.oddsCount, kickOffTime: mb.kickOffTime },
        },
        matched: true,
        matchQuality: quality,
      });
    } else {
      merged.push({
        home: mk.home,
        away: mk.away,
        leagueName: mk.leagueName,
        kickOffTime: mk.kickOffTime,
        live: mk.live,
        bookmakers: {
          merkur: { odds: mk.odds, oddsCount: mk.oddsCount, kickOffTime: mk.kickOffTime },
          maxbet: null,
        },
        matched: false,
        matchQuality: null,
      });
    }
  }

  maxbetList.forEach((mb, i) => {
    if (!usedMb.has(i)) {
      merged.push({
        home: mb.home,
        away: mb.away,
        leagueName: mb.leagueName,
        kickOffTime: mb.kickOffTime,
        live: mb.live,
        bookmakers: {
          merkur: null,
          maxbet: { odds: mb.odds, oddsCount: mb.oddsCount, kickOffTime: mb.kickOffTime },
        },
        matched: false,
        matchQuality: null,
      });
    }
  });

  return merged;
}

/**
 * Merge an additional bookmaker's matches into the already-merged list.
 */
export function mergeBookmaker(mergedList, newList, bookieKey, teamAliasMap, leagueAliasMap, crossAliasMaps = {}) {
  const used = new Set();

  function getTimeWin(mk) {
    const count = Object.values(mk.bookmakers).filter(b => b !== null).length;
    return count >= 2 ? CONFIG.MERGE_TIME_WIN_CONSENSUS : CONFIG.MERGE_TIME_WIN;
  }
  function getTimeStrict(mk) {
    const count = Object.values(mk.bookmakers).filter(b => b !== null).length;
    return count >= 2 ? CONFIG.MERGE_TIME_STRICT_CONSENSUS : CONFIG.MERGE_TIME_STRICT;
  }

  const timeOffset = detectBookieTimeOffset(mergedList, newList);
  if (timeOffset !== 0) {
    console.info(`[${bookieKey}] Correcting kickoff times by ${timeOffset / 3600000 > 0 ? '+' : ''}${timeOffset / 3600000}h`);
    newList = newList.map(e => ({ ...e, kickOffTime: e.kickOffTime - timeOffset }));
  }

  const newNorm = newList.map(m => ({
    home: normTeam(m.home),
    away: normTeam(m.away),
    league: normLeague(m.leagueName),
  }));

  const exactIndex = {};
  newList.forEach((m, i) => {
    const key = `${newNorm[i].home}|${newNorm[i].away}`;
    if (!exactIndex[key]) exactIndex[key] = [];
    exactIndex[key].push(i);
  });

  const result = mergedList.map(mk => {
    const { idx } = findMatch(mk, newList, newNorm, exactIndex, used, getTimeWin, getTimeStrict, teamAliasMap, leagueAliasMap, crossAliasMaps);

    if (idx !== -1) {
      used.add(idx);
      const entry = newList[idx];
      return { ...mk, bookmakers: { ...mk.bookmakers, [bookieKey]: { odds: entry.odds, oddsCount: entry.oddsCount, fairOdds: entry.fairOdds, probs: entry.probs, kickOffTime: entry.kickOffTime } } };
    }
    return { ...mk, bookmakers: { ...mk.bookmakers, [bookieKey]: null } };
  });

  const emptyBks = Object.fromEntries(BOOKIES.map(b => [b.key, null]));
  newList.forEach((entry, i) => {
    if (!used.has(i)) {
      result.push({
        home: entry.home,
        away: entry.away,
        leagueName: entry.leagueName,
        kickOffTime: entry.kickOffTime,
        live: entry.live,
        bookmakers: { ...emptyBks, [bookieKey]: { odds: entry.odds, oddsCount: entry.oddsCount, fairOdds: entry.fairOdds, probs: entry.probs, kickOffTime: entry.kickOffTime } },
        matched: false,
        matchQuality: null,
      });
    }
  });

  return result;
}

/**
 * Resolves the authoritative kickoff time for a merged match.
 */
export function resolveKickOffTime(match) {
  const CONSENSUS_WIN = CONFIG.CONSENSUS_WIN;

  const times = Object.values(match.bookmakers)
    .filter(b => b && b.kickOffTime)
    .map(b => b.kickOffTime);

  if (times.length === 0) return match.kickOffTime;
  if (times.length === 1) return times[0];

  let bestGroup = [];
  for (const t of times) {
    const group = times.filter(t2 => Math.abs(t2 - t) <= CONSENSUS_WIN);
    if (group.length > bestGroup.length) bestGroup = group;
  }

  if (bestGroup.length >= 3) {
    bestGroup.sort((a, b) => a - b);
    return bestGroup[Math.floor(bestGroup.length / 2)];
  }

  const now = Date.now();
  return times.reduce((closest, t) =>
    Math.abs(t - now) < Math.abs(closest - now) ? t : closest
  , times[0]);
}
