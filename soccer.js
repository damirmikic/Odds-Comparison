/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONFIG
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const APIS = {
  merkur: 'https://www.merkurxtip.rs/restapi/offer/en/init',
  maxbet: 'https://www.maxbet.rs/restapi/offer/en/init',
  soccerbet: 'https://www.soccerbet.rs/restapi/offer/en/init',
};

const FLAGS = {
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Spain': '🇪🇸', 'Germany': '🇩🇪', 'Italy': '🇮🇹', 'France': '🇫🇷',
  'Portugal': '🇵🇹', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Turkey': '🇹🇷',
  'Russia': '🇷🇺', 'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'USA': '🇺🇸',
  'Mexico': '🇲🇽', 'Austria': '🇦🇹', 'Switzerland': '🇨🇭', 'Poland': '🇵🇱',
  'Czech Republic': '🇨🇿', 'Croatia': '🇭🇷', 'Serbia': '🇷🇸', 'Romania': '🇷🇴',
  'Ukraine': '🇺🇦', 'Greece': '🇬🇷', 'Denmark': '🇩🇰', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Finland': '🇫🇮', 'Japan': '🇯🇵', 'South Korea': '🇰🇷',
  'China': '🇨🇳', 'Australia': '🇦🇺', 'International': '🌐', 'UEFA': '🇪🇺',
  'CAF': '🌍', 'Africa': '🌍', 'Asia': '🌏', 'South America': '🌎',
  'North America': '🌎', 'CONMEBOL': '🌎', 'Hungary': '🇭🇺', 'Slovakia': '🇸🇰',
  'Bulgaria': '🇧🇬', 'Israel': '🇮🇱', 'Slovenia': '🇸🇮', 'Bosnia': '🇧🇦',
  'Montenegro': '🇲🇪', 'Albania': '🇦🇱', 'Kosovo': '🇽🇰', 'Ireland': '🇮🇪',
  'Cyprus': '🇨🇾', 'Malta': '🇲🇹', 'Morocco': '🇲🇦', 'Egypt': '🇪🇬',
  'Nigeria': '🇳🇬', 'Ghana': '🇬🇭', 'Colombia': '🇨🇴', 'Chile': '🇨🇱',
  'Uruguay': '🇺🇾', 'Peru': '🇵🇪', 'Ecuador': '🇪🇨', 'Venezuela': '🇻🇪',
  'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Saudi Arabia': '🇸🇦', 'UAE': '🇦🇪',
  'Iran': '🇮🇷', 'India': '🇮🇳', 'Belarus': '🇧🇾', 'Lithuania': '🇱🇹',
  'Latvia': '🇱🇻', 'Estonia': '🇪🇪', 'Georgia': '🇬🇪', 'Armenia': '🇦🇲',
  'Azerbaijan': '🇦🇿', 'Kazakhstan': '🇰🇿', 'Iceland': '🇮🇸', 'Luxembourg': '🇱🇺',
  'Andorra': '🇦🇩', 'Uganda': '🇺🇬', 'Cameroon': '🇨🇲', 'Senegal': '🇸🇳',
  'Tunisia': '🇹🇳', 'Algeria': '🇩🇿', 'South Africa': '🇿🇦', 'Kenya': '🇰🇪',
  'Tanzania': '🇹🇿', 'Zambia': '🇿🇲', 'Zimbabwe': '🇿🇼', 'Angola': '🇦🇴',
  'Mozambique': '🇲🇿', 'Congo': '🇨🇬', 'Ethiopia': '🇪🇹', 'Libya': '🇱🇾',
  'Sudan': '🇸🇩', 'Costa Rica': '🇨🇷', 'Honduras': '🇭🇳', 'Guatemala': '🇬🇹',
  'Panama': '🇵🇦', 'El Salvador': '🇸🇻', 'Nicaragua': '🇳🇮', 'Other': '🏳',
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STATE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
let allMatches = [];   // merged match objects
let activeFilter = 'all';
let searchQuery = '';
let selectedLeague = null;
let viewMode = 'compare'; // 'compare' | 'merkur' | 'maxbet' | 'soccerbet'

const collapsedCountries = new Set();

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UTILS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseCountry(leagueName) {
  // 1. Check manual group overrides
  const groups = getLeagueGroups();
  const override = groups.find(g => g.league_name === leagueName);
  if (override) return override.group_name;

  // 2. Special hardcoded case for International Clubs
  if (leagueName.toLowerCase().startsWith('international clubs')) return 'International';

  // 3. Default comma-split logic
  const i = leagueName.indexOf(',');
  return i === -1 ? 'Other' : leagueName.slice(0, i).trim();
}

function hasCountry(name) { return name && name.includes(','); }

function pickBetterLeagueName(n1, n2) {
  if (hasCountry(n1) && !hasCountry(n2)) return n1;
  if (hasCountry(n2) && !hasCountry(n1)) return n2;
  return n1 || n2;
}

function parseLeagueName(leagueName) {
  const i = leagueName.indexOf(',');
  return i === -1 ? leagueName : leagueName.slice(i + 1).trim();
}

function getFlag(country) { return FLAGS[country] || '🏳'; }

function fmtTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const tom = new Date(now); tom.setDate(now.getDate() + 1);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const t = `${hh}:${mm}`;
  if (d.toDateString() === now.toDateString()) return t;
  if (d.toDateString() === tom.toDateString()) return `TMW ${t}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${t}`;
}

function fmtOdd(v) {
  return (v == null || !isFinite(v) || v <= 0) ? '—' : parseFloat(v).toFixed(2);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FUZZY MATCHING HELPERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Normalize a team name for comparison:
 * - lowercase
 * - expand common abbreviations (atl → atletico, ind → independiente, etc.)
 * - strip punctuation and extra spaces
 */
const ABBREV = {
  '\batl\b': 'atletico',
  '\bind\b': 'independiente',
  '\bsp\b': 'sporting',
  '\bfc\b': '',
  '\bac\b': '',
  '\bsc\b': '',
  '\bcd\b': '',
  '\bcf\b': '',
  '\bfk\b': '',
  '\bsk\b': '',
  '\bnk\b': '',
  '\bfk\b': '',
  '\bif\b': '',
  '\bbk\b': '',
  '\bik\b': '',
  '\bgif\b': '',
  '\bais\b': '',
  '\bde\b': '',
  '\bdel\b': '',
  '\bla\b': '',
  '\blas\b': '',
  '\blos\b': '',
  '\bel\b': '',
  '\breal\b': 'real',
  '\bsj\b': 'san jose',
  '\bba\b': '',
  '\bca\b': '',
  '\bclub\b': '',
  '\bsport\b': '',
  '\bdeportivo\b': 'dep',
  '\bdef\b': 'defensa',
};

function normTeam(s) {
  let n = s.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')  // punctuation → space
    .replace(/\s+/g, ' ')
    .trim();
  // Expand abbreviations
  for (const [pat, rep] of Object.entries(ABBREV)) {
    n = n.replace(new RegExp(pat, 'g'), rep);
  }
  return n.replace(/\s+/g, ' ').trim();
}

/** Normalize league name for matching */
function normLeague(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/** Tokenize a normalized team name into a Set of words (≥2 chars) */
function tokenize(norm) {
  return new Set(norm.split(' ').filter(w => w.length >= 2));
}

/**
 * Jaccard similarity between two token sets.
 * Returns 0–1 where 1 = identical.
 */
function jaccard(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / (setA.size + setB.size - inter);
}

/**
 * Returns true if two normalized team names are a fuzzy match.
 * Tries substring containment first, then token Jaccard ≥ 0.5.
 */
function fuzzyTeamMatch(normA, normB) {
  if (!normA || !normB) return false;
  // Substring: one contains the other (handles "Ind. Rivadavia" vs "Independiente Rivadavia")
  if (normA.includes(normB) || normB.includes(normA)) return true;
  // Token overlap
  const tokA = tokenize(normA);
  const tokB = tokenize(normB);
  return jaccard(tokA, tokB) >= 0.5;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DATA MERGING
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Parse raw API response into a flat list of football matches.
 * Returns array of { home, away, leagueName, kickOffTime, live, odds, oddsCount }
 */
function parseMatches(data) {
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

/**
 * Parse SoccerBet API response.
 * SoccerBet uses a nested betMap: { betType: { specifier: { ov: value, … } } }
 * All markets (1X2, over/under, etc.) use the "NULL" specifier.
 * This flattens betMap["N"]["NULL"].ov → odds["N"] to match the flat format
 * used by Merkur/MaxBet, so extractOdds and rendering work unchanged.
 *
 * Bet type IDs are shared with Merkur/MaxBet:
 *  1/2/3  → Home / Draw / Away
 *  22/24  → Under / Over (2.5 goals)
 */
function parseSoccerbetMatches(data) {
  return (data.esMatches || [])
    .filter(m => m.sport === 'S')
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
 * Merge two lists of matches using 3-pass fuzzy matching.
 *
 * Pass 1 — Exact normalized key (home|away), kickoff ±45 min
 * Pass 2 — Fuzzy home+away (substring / token Jaccard ≥ 0.5), kickoff ±45 min
 * Pass 3 — Fuzzy home only OR away only match (one side exact, other fuzzy), kickoff ±30 min
 *
 * matchQuality: 'exact' | 'fuzzy' | 'partial'
 */
/**
 * Merge two lists of matches using 4-pass fuzzy matching.
 *
 * Pass 0 — Alias Match (from aliases.json)
 * Pass 1 — Exact normalized key (home|away), kickoff ±45 min
 * Pass 2 — Fuzzy home+away (substring / token Jaccard ≥ 0.5), kickoff ±45 min
 * Pass 3 — Fuzzy home only OR away only match (one side exact, other fuzzy), kickoff ±30 min
 *
 * matchQuality: 'exact' | 'fuzzy' | 'partial' | 'alias'
 */
function mergeMatches(merkurList, maxbetList) {
  const merged = [];
  const usedMb = new Set();
  const TIME_WIN = 45 * 60 * 1000; // ±45 min
  const TIME_STRICT = 30 * 60 * 1000; // ±30 min for partial

  // Build alias maps for Pass 0
  const teamAliasMap = buildTeamAliasMap(normTeam);
  const leagueAliasMap = buildLeagueAliasMap(normLeague);

  // Pre-compute normalized names for maxbet (avoid re-computing in loops)
  const mbNorm = maxbetList.map(m => ({
    home: normTeam(m.home),
    away: normTeam(m.away),
    league: normLeague(m.leagueName),
  }));

  // ── PASS 0: Alias matching ──────────────────────────────
  function findAlias(mk) {
    const mkH = normTeam(mk.home);
    const mkA = normTeam(mk.away);
    const mkL = normLeague(mk.leagueName);

    // Get the expected MaxBet names from aliases (now Sets)
    const targetHs = teamAliasMap.get(mkH);
    const targetAs = teamAliasMap.get(mkA);

    if (!targetHs && !targetAs) return -1;

    for (let i = 0; i < maxbetList.length; i++) {
      if (usedMb.has(i)) continue;
      const mb = maxbetList[i];
      if (Math.abs(mb.kickOffTime - mk.kickOffTime) > TIME_WIN) continue;

      const homeMatch = targetHs ? targetHs.has(mbNorm[i].home) : (mkH === mbNorm[i].home);
      const awayMatch = targetAs ? targetAs.has(mbNorm[i].away) : (mkA === mbNorm[i].away);

      // League signal: if leagues are also aliased (now Set) or exact, it's a perfect hit
      const targetLs = leagueAliasMap.get(mkL);
      const leagueMatch = (targetLs && targetLs.has(mbNorm[i].league)) || (mkL === mbNorm[i].league);

      if (homeMatch && awayMatch) {
        if (leagueMatch) return i;
      }
    }
    // Fallback pass for aliases without league signal
    for (let i = 0; i < maxbetList.length; i++) {
      if (usedMb.has(i)) continue;
      const mb = maxbetList[i];
      if (Math.abs(mb.kickOffTime - mk.kickOffTime) > TIME_WIN) continue;
      const homeMatch = targetHs ? targetHs.has(mbNorm[i].home) : (mkH === mbNorm[i].home);
      const awayMatch = targetAs ? targetAs.has(mbNorm[i].away) : (mkA === mbNorm[i].away);
      if (homeMatch && awayMatch) return i;
    }
    return -1;
  }

  // ── PASS 1: exact normalized key index ──────────────────────────
  const exactIndex = {};
  maxbetList.forEach((m, i) => {
    const key = `${mbNorm[i].home}|${mbNorm[i].away}`;
    if (!exactIndex[key]) exactIndex[key] = [];
    exactIndex[key].push(i);
  });

  function findExact(mk) {
    const mkH = normTeam(mk.home);
    const mkA = normTeam(mk.away);
    const key = `${mkH}|${mkA}`;
    for (const idx of (exactIndex[key] || [])) {
      if (usedMb.has(idx)) continue;
      if (Math.abs(maxbetList[idx].kickOffTime - mk.kickOffTime) <= TIME_WIN) return idx;
    }
    return -1;
  }

  // ── PASS 2: fuzzy both sides ─────────────────────────────────────
  function findFuzzy(mk) {
    const mkH = normTeam(mk.home);
    const mkA = normTeam(mk.away);
    let bestIdx = -1;
    let bestScore = 0;
    maxbetList.forEach((mb, i) => {
      if (usedMb.has(i)) return;
      if (Math.abs(mb.kickOffTime - mk.kickOffTime) > TIME_WIN) return;
      const homeMatch = fuzzyTeamMatch(mkH, mbNorm[i].home);
      const awayMatch = fuzzyTeamMatch(mkA, mbNorm[i].away);
      if (homeMatch && awayMatch) {
        // Score by time proximity (closer = better)
        const score = 1 - Math.abs(mb.kickOffTime - mk.kickOffTime) / TIME_WIN;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }
    });
    return bestIdx;
  }

  // ── PASS 3: partial match (one side exact, other fuzzy) ──────────
  function findPartial(mk) {
    const mkH = normTeam(mk.home);
    const mkA = normTeam(mk.away);
    let bestIdx = -1;
    let bestScore = 0;
    maxbetList.forEach((mb, i) => {
      if (usedMb.has(i)) return;
      if (Math.abs(mb.kickOffTime - mk.kickOffTime) > TIME_STRICT) return;
      const homeExact = mkH === mbNorm[i].home;
      const awayExact = mkA === mbNorm[i].away;
      const homeFuzz = fuzzyTeamMatch(mkH, mbNorm[i].home);
      const awayFuzz = fuzzyTeamMatch(mkA, mbNorm[i].away);
      // Require at least one exact side + other fuzzy, or both fuzzy with high confidence
      const ok = (homeExact && awayFuzz) || (awayExact && homeFuzz);
      if (ok) {
        const score = 1 - Math.abs(mb.kickOffTime - mk.kickOffTime) / TIME_STRICT;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }
    });
    return bestIdx;
  }

  // ── Main merge loop ──────────────────────────────────────────────
  for (const mk of merkurList) {
    let idx = findAlias(mk);
    let quality = 'alias';

    if (idx === -1) { idx = findExact(mk); quality = 'exact'; }
    if (idx === -1) { idx = findFuzzy(mk); quality = 'fuzzy'; }
    if (idx === -1) { idx = findPartial(mk); quality = 'partial'; }

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
        merkur: { odds: mk.odds, oddsCount: mk.oddsCount },
        maxbet: { odds: mb.odds, oddsCount: mb.oddsCount },
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
        merkur: { odds: mk.odds, oddsCount: mk.oddsCount },
        maxbet: null,
        matched: false,
        matchQuality: null,
      });
    }
  }

  // Add MaxBet-only matches
  maxbetList.forEach((mb, i) => {
    if (!usedMb.has(i)) {
      merged.push({
        home: mb.home,
        away: mb.away,
        leagueName: mb.leagueName,
        kickOffTime: mb.kickOffTime,
        live: mb.live,
        merkur: null,
        maxbet: { odds: mb.odds, oddsCount: mb.oddsCount },
        matched: false,
        matchQuality: null,
      });
    }
  });

  return merged;
}

/**
 * Match SoccerBet matches against the already-merged list (merkur+maxbet).
 * Uses the same 3-pass fuzzy logic (exact → fuzzy → partial).
 * Adds `soccerbet: { odds, oddsCount }` to each merged match, or null if unmatched.
 * Appends soccerbet-only matches at the end.
 */
function matchSoccerbet(mergedList, sbList) {
  const usedSb = new Set();
  const TIME_WIN = 45 * 60 * 1000;
  const TIME_STRICT = 30 * 60 * 1000;

  // Build soccerbet alias maps for Pass 0
  const teamAliasMap   = buildSoccerbetTeamAliasMap(normTeam);
  const leagueAliasMap = buildSoccerbetLeagueAliasMap(normLeague);

  const sbNorm = sbList.map(m => ({
    home:   normTeam(m.home),
    away:   normTeam(m.away),
    league: normLeague(m.leagueName),
  }));

  // Build exact index keyed by norm home|away
  const exactIndex = {};
  sbList.forEach((m, i) => {
    const key = `${sbNorm[i].home}|${sbNorm[i].away}`;
    if (!exactIndex[key]) exactIndex[key] = [];
    exactIndex[key].push(i);
  });

  // ── Pass 0: Alias matching ──────────────────────────────────
  function findAlias(mk) {
    const mkH = normTeam(mk.home);
    const mkA = normTeam(mk.away);
    const mkL = normLeague(mk.leagueName);
    const targetHs = teamAliasMap.get(mkH);
    const targetAs = teamAliasMap.get(mkA);
    if (!targetHs && !targetAs) return -1;

    // With league signal first
    for (let i = 0; i < sbList.length; i++) {
      if (usedSb.has(i)) continue;
      if (Math.abs(sbList[i].kickOffTime - mk.kickOffTime) > TIME_WIN) continue;
      const homeMatch = targetHs ? targetHs.has(sbNorm[i].home) : (mkH === sbNorm[i].home);
      const awayMatch = targetAs ? targetAs.has(sbNorm[i].away) : (mkA === sbNorm[i].away);
      const targetLs  = leagueAliasMap.get(mkL);
      const leagueMatch = (targetLs && targetLs.has(sbNorm[i].league)) || (mkL === sbNorm[i].league);
      if (homeMatch && awayMatch && leagueMatch) return i;
    }
    // Fallback: without league signal
    for (let i = 0; i < sbList.length; i++) {
      if (usedSb.has(i)) continue;
      if (Math.abs(sbList[i].kickOffTime - mk.kickOffTime) > TIME_WIN) continue;
      const homeMatch = targetHs ? targetHs.has(sbNorm[i].home) : (mkH === sbNorm[i].home);
      const awayMatch = targetAs ? targetAs.has(sbNorm[i].away) : (mkA === sbNorm[i].away);
      if (homeMatch && awayMatch) return i;
    }
    return -1;
  }

  // ── Pass 1: Exact normalized key ────────────────────────────
  function findExact(mk) {
    const key = `${normTeam(mk.home)}|${normTeam(mk.away)}`;
    for (const idx of (exactIndex[key] || [])) {
      if (usedSb.has(idx)) continue;
      if (Math.abs(sbList[idx].kickOffTime - mk.kickOffTime) <= TIME_WIN) return idx;
    }
    return -1;
  }

  // ── Pass 2: Fuzzy both sides ────────────────────────────────
  function findFuzzy(mk) {
    const mkH = normTeam(mk.home);
    const mkA = normTeam(mk.away);
    let bestIdx = -1, bestScore = 0;
    sbList.forEach((sb, i) => {
      if (usedSb.has(i)) return;
      if (Math.abs(sb.kickOffTime - mk.kickOffTime) > TIME_WIN) return;
      if (fuzzyTeamMatch(mkH, sbNorm[i].home) && fuzzyTeamMatch(mkA, sbNorm[i].away)) {
        const score = 1 - Math.abs(sb.kickOffTime - mk.kickOffTime) / TIME_WIN;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }
    });
    return bestIdx;
  }

  // ── Pass 3: Partial (one side exact, other fuzzy) ───────────
  function findPartial(mk) {
    const mkH = normTeam(mk.home);
    const mkA = normTeam(mk.away);
    let bestIdx = -1, bestScore = 0;
    sbList.forEach((sb, i) => {
      if (usedSb.has(i)) return;
      if (Math.abs(sb.kickOffTime - mk.kickOffTime) > TIME_STRICT) return;
      const homeExact = mkH === sbNorm[i].home;
      const awayExact = mkA === sbNorm[i].away;
      const homeFuzz = fuzzyTeamMatch(mkH, sbNorm[i].home);
      const awayFuzz = fuzzyTeamMatch(mkA, sbNorm[i].away);
      if ((homeExact && awayFuzz) || (awayExact && homeFuzz)) {
        const score = 1 - Math.abs(sb.kickOffTime - mk.kickOffTime) / TIME_STRICT;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }
    });
    return bestIdx;
  }

  const result = mergedList.map(mk => {
    let idx = findAlias(mk);
    if (idx === -1) idx = findExact(mk);
    if (idx === -1) idx = findFuzzy(mk);
    if (idx === -1) idx = findPartial(mk);

    if (idx !== -1) {
      usedSb.add(idx);
      const sb = sbList[idx];
      return { ...mk, soccerbet: { odds: sb.odds, oddsCount: sb.oddsCount } };
    }
    return { ...mk, soccerbet: null };
  });

  // Append soccerbet-only matches
  sbList.forEach((sb, i) => {
    if (!usedSb.has(i)) {
      result.push({
        home: sb.home,
        away: sb.away,
        leagueName: sb.leagueName,
        kickOffTime: sb.kickOffTime,
        live: sb.live,
        merkur: null,
        maxbet: null,
        soccerbet: { odds: sb.odds, oddsCount: sb.oddsCount },
        matched: false,
        matchQuality: null,
      });
    }
  });

  return result;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DATA PROCESSING
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function getFilteredMatches() {
  let ms = allMatches;

  // View mode filter
  if (viewMode === 'merkur') ms = ms.filter(m => m.merkur !== null);
  if (viewMode === 'maxbet') ms = ms.filter(m => m.maxbet !== null);
  if (viewMode === 'soccerbet') ms = ms.filter(m => m.soccerbet !== null);

  // Tab filter
  if (activeFilter === 'live') ms = ms.filter(m => m.live);
  if (activeFilter === 'upcoming') ms = ms.filter(m => !m.live);

  // Sidebar league filter
  if (selectedLeague) ms = ms.filter(m => m.leagueName === selectedLeague);

  // Search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    ms = ms.filter(m =>
      m.leagueName.toLowerCase().includes(q) ||
      m.home.toLowerCase().includes(q) ||
      m.away.toLowerCase().includes(q)
    );
  }

  return ms;
}

function groupByLeague(matches) {
  const map = {};
  matches.forEach(m => {
    if (!map[m.leagueName]) map[m.leagueName] = { name: m.leagueName, ms: [] };
    map[m.leagueName].ms.push(m);
  });
  return Object.values(map)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(g => ({ ...g, ms: [...g.ms].sort((a, b) => a.kickOffTime - b.kickOffTime) }));
}

function buildSidebarTree() {
  const countries = {};
  allMatches.forEach(m => {
    const c = parseCountry(m.leagueName);
    if (!countries[c]) countries[c] = { name: c, leagues: {}, total: 0, live: 0 };
    if (!countries[c].leagues[m.leagueName]) {
      countries[c].leagues[m.leagueName] = {
        fullName: m.leagueName,
        name: parseLeagueName(m.leagueName),
        count: 0,
        live: 0,
      };
    }
    countries[c].leagues[m.leagueName].count++;
    countries[c].total++;
    if (m.live) {
      countries[c].leagues[m.leagueName].live++;
      countries[c].live++;
    }
  });

  return Object.values(countries)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => ({
      ...c,
      leagues: Object.values(c.leagues).sort((a, b) => b.count - a.count),
    }));
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RENDER — SIDEBAR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderSidebar() {
  const tree = buildSidebarTree();
  const allActive = selectedLeague === null ? 'active' : '';

  let html = `
    <div class="sb-all ${allActive}" data-action="all">
      <span class="sb-all-label">All Matches</span>
      <span class="sb-badge">${allMatches.length}</span>
    </div>`;

  tree.forEach(country => {
    const collapsed = collapsedCountries.has(country.name) ? 'collapsed' : '';
    html += `
      <div class="country-block ${collapsed}" data-country="${esc(country.name)}">
        <div class="country-head">
          <span class="country-flag">${getFlag(country.name)}</span>
          <span class="country-name">${esc(country.name)}</span>
          ${country.live ? `<span class="country-live-dot"></span>` : ''}
          <span class="country-count">${country.total}</span>
          <span class="country-chevron">▾</span>
        </div>
        <div class="country-leagues">
          ${country.leagues.map(lg => {
      const isActive = selectedLeague === lg.fullName ? 'active' : '';
      return `
              <div class="league-item ${isActive}" data-league="${esc(lg.fullName)}">
                ${lg.live ? `<span class="league-live-dot"></span>` : ''}
                <span class="league-item-name" title="${esc(lg.name)}">${esc(lg.name)}</span>
                <span class="league-item-count">${lg.count}</span>
              </div>`;
    }).join('')}
        </div>
      </div>`;
  });

  document.getElementById('sidebar').innerHTML = html;
}

function updateSidebarActive() {
  document.querySelectorAll('.sb-all').forEach(el =>
    el.classList.toggle('active', selectedLeague === null)
  );
  document.querySelectorAll('.league-item').forEach(el =>
    el.classList.toggle('active', el.dataset.league === selectedLeague)
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RENDER — MATCH ROW
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Extract the key odds from a bookmaker's odds object.
 * Returns { h, x, a, ov, un } as raw floats (NaN if missing).
 */
function extractOdds(oddsObj) {
  if (!oddsObj) return { h: NaN, x: NaN, a: NaN, ov: NaN, un: NaN };
  return {
    h: parseFloat(oddsObj['1']),
    x: parseFloat(oddsObj['2']),
    a: parseFloat(oddsObj['3']),
    ov: parseFloat(oddsObj['24']),
    un: parseFloat(oddsObj['22']),
  };
}

function valid(v) { return isFinite(v) && v > 0; }

function getOddClass(val, lo, hi) {
  if (!valid(val)) return 'na';
  if (lo === hi) return 'mid';
  if (val === lo) return 'fav';
  if (val === hi) return 'out';
  return 'mid';
}

/**
 * Render one bookmaker sub-row in compare mode.
 * allOddsArr: array of extractOdds() results for every bookie present on this match.
 * Highlights best (green), worst (red), middle/tied (neutral) across all bookies.
 */
function renderBkRow(bkLabel, bkCls, myOdds, allOddsArr) {
  function cellCls(key) {
    const me = myOdds[key];
    if (!valid(me)) return 'na';
    const allValid = allOddsArr.map(o => o[key]).filter(v => valid(v));
    if (allValid.length <= 1) return 'solo';
    const best = Math.max(...allValid);
    const worst = Math.min(...allValid);
    if (best === worst) return 'equal';
    if (me === best) return 'better';
    if (me === worst) return 'worse';
    return 'equal'; // middle value — neutral
  }

  function cellTxt(key) {
    const v = myOdds[key];
    return valid(v) ? v.toFixed(2) : '—';
  }

  return `
    <div class="bk-row bk-row-${bkCls}">
      <div class="bk-label">${bkLabel}</div>
      <div class="m-odd cmp-odd ${cellCls('h')}" title="Home win">${cellTxt('h')}</div>
      <div class="m-odd cmp-odd ${cellCls('x')}" title="Draw">${cellTxt('x')}</div>
      <div class="m-odd cmp-odd ${cellCls('a')}" title="Away win">${cellTxt('a')}</div>
      <div class="m-line">2.5</div>
      <div class="m-odd cmp-odd ${cellCls('ov')}" title="Over 2.5">${cellTxt('ov')}</div>
      <div class="m-odd cmp-odd ${cellCls('un')}" title="Under 2.5">${cellTxt('un')}</div>
    </div>`;
}

function renderMatch(m) {
  const isLive = Boolean(m.live);
  const timeStr = isLive ? 'LIVE' : fmtTime(m.kickOffTime);

  if (viewMode === 'compare') {
    return renderMatchCompare(m, isLive, timeStr);
  } else {
    const src = viewMode === 'merkur' ? m.merkur
              : viewMode === 'maxbet' ? m.maxbet
              : m.soccerbet;
    return renderMatchSingle(m, src, isLive, timeStr);
  }
}

function renderMatchCompare(m, isLive, timeStr) {
  const mk = extractOdds(m.merkur?.odds);
  const mb = extractOdds(m.maxbet?.odds);
  const sb = extractOdds(m.soccerbet?.odds);
  const hasMk = m.merkur !== null;
  const hasMb = m.maxbet !== null;
  const hasSb = m.soccerbet !== null;

  // Build odds array for all present bookies (used for best/worst highlighting)
  const allOdds = [hasMk && mk, hasMb && mb, hasSb && sb].filter(Boolean);

  const mkRow = hasMk ? renderBkRow('MRK', 'm', mk, allOdds) : '';
  const mbRow = hasMb ? renderBkRow('MAX', 'b', mb, allOdds) : '';
  const sbRow = hasSb ? renderBkRow('SBT', 's', sb, allOdds) : '';

  return `
    <div class="match-group${isLive ? ' is-live' : ''}${m.matched ? ' is-matched' : ''}">
      <div class="mg-header">
        <div class="m-time${isLive ? ' live' : ''}">${esc(timeStr)}</div>
        <div class="m-teams">
          <div class="m-home" title="${esc(m.home)}">${esc(m.home)}</div>
          <div class="m-away" title="${esc(m.away)}">${esc(m.away)}</div>
        </div>
      </div>
      <div class="mg-rows">
        ${mkRow}
        ${mbRow}
        ${sbRow}
      </div>
    </div>`;
}

function renderMatchSingle(m, src, isLive, timeStr) {
  const odds = src?.odds || {};
  const raw = {
    h: parseFloat(odds['1']),
    x: parseFloat(odds['2']),
    a: parseFloat(odds['3']),
    ov: parseFloat(odds['24']),
    un: parseFloat(odds['22']),
  };
  const vals = [raw.h, raw.x, raw.a].filter(v => valid(v));
  const lo = vals.length ? Math.min(...vals) : null;
  const hi = vals.length ? Math.max(...vals) : null;
  const ouVals = [raw.ov, raw.un].filter(v => valid(v));
  const ouLo = ouVals.length ? Math.min(...ouVals) : null;
  const ouHi = ouVals.length ? Math.max(...ouVals) : null;
  const more = (src?.oddsCount || 0) > 5 ? `+${src.oddsCount - 5}` : '';

  return `
    <div class="match-row${isLive ? ' is-live' : ''}">
      <div class="m-time${isLive ? ' live' : ''}">${esc(timeStr)}</div>
      <div class="m-teams">
        <div class="m-home" title="${esc(m.home)}">${esc(m.home)}</div>
        <div class="m-away" title="${esc(m.away)}">${esc(m.away)}</div>
      </div>
      <div class="m-odd ${getOddClass(raw.h, lo, hi)}" title="Home win">${fmtOdd(raw.h)}</div>
      <div class="m-odd ${getOddClass(raw.x, lo, hi)}" title="Draw">${fmtOdd(raw.x)}</div>
      <div class="m-odd ${getOddClass(raw.a, lo, hi)}" title="Away win">${fmtOdd(raw.a)}</div>
      <div class="m-line">2.5</div>
      <div class="m-odd ${getOddClass(raw.ov, ouLo, ouHi)}" title="Over 2.5">${fmtOdd(raw.ov)}</div>
      <div class="m-odd ${getOddClass(raw.un, ouLo, ouHi)}" title="Under 2.5">${fmtOdd(raw.un)}</div>
      <div class="m-more">${esc(more)}</div>
    </div>`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RENDER — LEAGUE BLOCK
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderLeagueBlock(g, idx) {
  const country = parseCountry(g.name);
  const lname = parseLeagueName(g.name);
  const liveN = g.ms.filter(m => m.live).length;
  const delay = Math.min(idx * 16, 480);

  const isCompare = viewMode === 'compare';

  // Column header differs by mode
  const colHead = isCompare
    ? `<div class="match-col-head cmp-col-head">
        <span class="ch-match">Match</span>
        <span class="ch-bk">Bookie</span>
        <span class="ch-1">1</span>
        <span class="ch-x">X</span>
        <span class="ch-2">2</span>
        <span class="ch-line">Line</span>
        <span class="ch-ov">Over</span>
        <span class="ch-un">Under</span>
      </div>`
    : `<div class="match-col-head">
        <span>Time</span>
        <span>Match</span>
        <span class="ch-1">1</span>
        <span class="ch-x">X</span>
        <span class="ch-2">2</span>
        <span class="ch-line">Line</span>
        <span class="ch-ov">Over</span>
        <span class="ch-un">Under</span>
        <span></span>
      </div>`;

  return `
    <div class="league-block" style="animation-delay:${delay}ms">
      <div class="lb-head" onclick="this.closest('.league-block').classList.toggle('collapsed')">
        <span class="lb-flag">${getFlag(country)}</span>
        ${country !== 'Other' ? `<span class="lb-country">${esc(country)}</span>` : ''}
        <span class="lb-name">${esc(lname || g.name)}</span>
        <div class="lb-right">
          ${liveN ? `<span class="lb-live-badge"><span class="lb-live-dot"></span>${liveN} live</span>` : ''}
          <span class="lb-count">${g.ms.length}</span>
        </div>
        <span class="lb-chevron">▾</span>
      </div>
      <div class="lb-matches">
        ${colHead}
        ${g.ms.map(renderMatch).join('')}
      </div>
    </div>`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RENDER — CONTENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderContent() {
  const content = document.getElementById('content');
  const ms = getFilteredMatches();
  const groups = groupByLeague(ms);

  let crumb = 'All Matches';
  if (selectedLeague) {
    const country = parseCountry(selectedLeague);
    const lname = parseLeagueName(selectedLeague);
    crumb = country !== 'Other'
      ? `${esc(country)}<em>›</em>${esc(lname)}`
      : esc(lname);
  }

  const matchedN = ms.filter(m => m.matched).length;
  const countTxt = viewMode === 'compare'
    ? `${groups.length} league${groups.length !== 1 ? 's' : ''} · ${ms.length} match${ms.length !== 1 ? 'es' : ''} · <span class="matched-count">${matchedN} matched</span>`
    : `${groups.length} league${groups.length !== 1 ? 's' : ''} · ${ms.length} match${ms.length !== 1 ? 'es' : ''}`;

  if (!groups.length) {
    content.innerHTML = `
      <div class="content-bar">
        <span class="content-crumb">${crumb}</span>
        <span class="content-count">${countTxt}</span>
      </div>
      <div class="state-center">
        <span class="empty-text">No matches found</span>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="content-bar">
      <span class="content-crumb">${crumb}</span>
      <span class="content-count">${countTxt}</span>
    </div>
    ${groups.map((g, i) => renderLeagueBlock(g, i)).join('')}`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ACTIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function selectLeague(name) {
  selectedLeague = name;
  updateSidebarActive();
  renderContent();
  document.getElementById('content').scrollTop = 0;
}

function selectAll() {
  selectedLeague = null;
  updateSidebarActive();
  renderContent();
  document.getElementById('content').scrollTop = 0;
}

function clearSearch() {
  const input = document.getElementById('search');
  input.value = '';
  searchQuery = '';
  document.getElementById('searchClear').classList.remove('visible');
  renderContent();
  input.focus();
}

function setViewMode(mode) {
  viewMode = mode;
  document.querySelectorAll('.view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === mode)
  );
  renderContent();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FETCH
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function loadData() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');

  document.getElementById('content').innerHTML = `
    <div class="state-center">
      <div class="spinner"></div>
      <div class="loading-text">Loading aliases & fetching odds…</div>
    </div>`;

  try {
    // Load shared aliases FIRST
    await loadAliasDB();
    const [merkurRes, maxbetRes, soccerbetRes] = await Promise.all([
      fetch(APIS.merkur),
      fetch(APIS.maxbet),
      fetch(APIS.soccerbet),
    ]);

    if (!merkurRes.ok) throw new Error(`MerkurXtip HTTP ${merkurRes.status}`);
    if (!maxbetRes.ok) throw new Error(`MaxBet HTTP ${maxbetRes.status}`);
    if (!soccerbetRes.ok) throw new Error(`SoccerBet HTTP ${soccerbetRes.status}`);

    const [merkurData, maxbetData, soccerbetData] = await Promise.all([
      merkurRes.json(),
      maxbetRes.json(),
      soccerbetRes.json(),
    ]);

    const merkurMatches = parseMatches(merkurData);
    const maxbetMatches = parseMatches(maxbetData);
    const soccerbetMatches = parseSoccerbetMatches(soccerbetData);

    // ── LEAGUE ALIAS NORMALIZATION ─────────────────────────
    // If a MaxBet league name is aliased to a Merkur league name,
    // normalize the MaxBet matches to use the Merkur name
    // so they group together in the UI.
    const leagueAliasMap = buildLeagueAliasMap(normLeague);

    // Index by normalized Maxbet name for reverse lookup
    // (Alias DB stores Merkur -> Maxbet)
    // We also peek at the actual names to pick the one with the country
    const revLeagueMap = new Map();
    getLeagueAliases().forEach(a => {
      const best = pickBetterLeagueName(a.merkur, a.maxbet);
      revLeagueMap.set(normLeague(a.maxbet), best);
      // Also ensure Merkur matches in this alias group use the "best" name
      revLeagueMap.set(normLeague(a.merkur), best);
    });

    merkurMatches.forEach(mk => {
      const canonical = revLeagueMap.get(normLeague(mk.leagueName));
      if (canonical) mk.leagueName = canonical;
    });

    maxbetMatches.forEach(mb => {
      const canonical = revLeagueMap.get(normLeague(mb.leagueName));
      if (canonical) mb.leagueName = canonical;
    });

    // For soccerbet leagues: first check soccerbet-specific aliases (merkur→soccerbet),
    // then fall back to the shared merkur/maxbet canonical map.
    const revSbtLeagueMap = new Map();
    getSoccerbetLeagueAliases().forEach(a => {
      const best = pickBetterLeagueName(a.merkur, a.soccerbet);
      revSbtLeagueMap.set(normLeague(a.soccerbet), best);
      revSbtLeagueMap.set(normLeague(a.merkur), best);
    });

    soccerbetMatches.forEach(sb => {
      const canonical = revSbtLeagueMap.get(normLeague(sb.leagueName))
                     || revLeagueMap.get(normLeague(sb.leagueName));
      if (canonical) sb.leagueName = canonical;
    });

    const merged = mergeMatches(merkurMatches, maxbetMatches);
    allMatches = matchSoccerbet(merged, soccerbetMatches);

    // Header stats
    const liveN = allMatches.filter(m => m.live).length;
    const leagueN = new Set(allMatches.map(m => m.leagueName)).size;
    const matchedN = allMatches.filter(m => m.matched).length;

    document.getElementById('sLeagues').textContent = leagueN;
    document.getElementById('sMatches').textContent = allMatches.length;
    document.getElementById('sLive').textContent = liveN;
    document.getElementById('sMatched').textContent = matchedN;

    selectedLeague = null;

    renderSidebar();
    renderContent();

  } catch (err) {
    console.error(err);
    const isCors = err.name === 'TypeError';
    document.getElementById('content').innerHTML = `
      <div class="state-center">
        <div class="error-head">ERR</div>
        <div class="error-body">
          ${isCors
        ? `CORS restriction — open via a local server:<br>
               <code>npx serve .</code> &nbsp;or&nbsp; <code>python -m http.server 8080</code>`
        : esc(err.message)}
        </div>
        <button class="retry-btn" onclick="loadData()">↺ Retry</button>
      </div>`;
  } finally {
    btn.classList.remove('spinning');
  }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EVENT LISTENERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// Tabs
document.getElementById('tabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.f;
  renderContent();
});

// View mode buttons
document.getElementById('viewBtns').addEventListener('click', e => {
  const btn = e.target.closest('.view-btn');
  if (!btn) return;
  setViewMode(btn.dataset.mode);
});

// Search
let searchTimer;
document.getElementById('search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  const val = e.target.value;
  document.getElementById('searchClear').classList.toggle('visible', val.length > 0);
  searchTimer = setTimeout(() => {
    searchQuery = val.trim();
    renderContent();
  }, 180);
});

// Sidebar — event delegation
document.getElementById('sidebar').addEventListener('click', e => {
  const sbAll = e.target.closest('.sb-all');
  if (sbAll) { selectAll(); return; }

  const leagueItem = e.target.closest('.league-item');
  if (leagueItem) {
    selectLeague(leagueItem.dataset.league);
    return;
  }

  const countryHead = e.target.closest('.country-head');
  if (countryHead) {
    const block = countryHead.closest('.country-block');
    const countryName = block.dataset.country;
    block.classList.toggle('collapsed');
    if (block.classList.contains('collapsed')) {
      collapsedCountries.add(countryName);
    } else {
      collapsedCountries.delete(countryName);
    }
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (searchQuery) {
      clearSearch();
    } else if (selectedLeague) {
      selectAll();
    }
  }
  if (e.key === '/' && document.activeElement !== document.getElementById('search')) {
    e.preventDefault();
    document.getElementById('search').focus();
  }
});

// ── INIT ─────────────────────────────────────────────────────────────
loadData();
