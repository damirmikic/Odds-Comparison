/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONFIG
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const BOOKIES = [
  {
    key: 'merkur', label: 'MRK', cls: 'm',
    url: 'https://www.merkurxtip.rs/restapi/offer/en/init',
    parse: data => parseMatches(data),
    getTeamAliasMap: () => new Map(),
    getLeagueAliasMap: () => new Map(),
    rawLeagueAliases: () => [],
  },
  {
    key: 'maxbet', label: 'MAX', cls: 'b',
    url: 'https://www.maxbet.rs/restapi/offer/en/init',
    parse: data => parseMatches(data).filter(m => !isMaxbetBonus(m)),
    getTeamAliasMap: () => buildTeamAliasMap(normTeam),
    getLeagueAliasMap: () => buildLeagueAliasMap(normLeague),
    rawLeagueAliases: () => getLeagueAliases(),
  },
  {
    key: 'soccerbet', label: 'SBT', cls: 's',
    url: 'https://www.soccerbet.rs/restapi/offer/en/init',
    parse: data => parseSoccerbetMatches(data),
    getTeamAliasMap: () => buildSoccerbetTeamAliasMap(normTeam),
    getLeagueAliasMap: () => buildSoccerbetLeagueAliasMap(normLeague),
    rawLeagueAliases: () => getSoccerbetLeagueAliases(),
    getCrossAliasMaps: () => ({
      maxbet: { team: buildMaxbetSbtTeamAliasMap(normTeam), league: buildMaxbetSbtLeagueAliasMap(normLeague) },
    }),
  },
  {
    key: 'cloudbet', label: 'CLB', cls: 'cl',
    url: () => {
      const now = Math.floor(Date.now() / 1000);
      const to = now + 7 * 24 * 3600;
      return `https://sports-api.cloudbet.com/pub/v2/odds/events?sport=soccer&live=false&from=${now}&to=${to}&markets=soccer.match_odds&markets=soccer.total_goals&players=false&limit=2000`;
    },
    headers: { 'X-API-Key': 'eyJhbGciOiJSUzI1NiIsImtpZCI6IkhKcDkyNnF3ZXBjNnF3LU9rMk4zV05pXzBrRFd6cEdwTzAxNlRJUjdRWDAiLCJ0eXAiOiJKV1QifQ.eyJhY2Nlc3NfdGllciI6InRyYWRpbmciLCJleHAiOjIwNjE1Mzc1MDIsImlhdCI6MTc0NjE3NzUwMiwianRpIjoiNTU1ODk0NjgtZjJhZi00ZGQ3LWE3MTQtZjNiNjgyMWU4OGRkIiwic3ViIjoiOGYwYTk5YTEtNTFhZi00YzJlLWFlNDUtY2MxNjgwNDVjZTc3IiwidGVuYW50IjoiY2xvdWRiZXQiLCJ1dWlkIjoiOGYwYTk5YTEtNTFhZi00YzJlLWFlNDUtY2MxNjgwNDVjZTc3In0.BW_nXSwTkxTI7C-1UzgxWLnNzo9Bo1Ed8hI9RfVLnrJa6sfsMyvQ1NrtT5t6i_emwhkRHU1hY-9i6c2c5AI4fc2mRLSNBujvrfbVHX67uB58E8TeSOZUBRi0eqfLBL7sYl1JNPZzhFkDBCBNFJZJpn40FIjIrtIiPd-G5ClaaSMRWrFUDiwA1NmyxHSfkfRpeRSnfk15qck7zSIeNeITzPbD7kZGDIeStmcHuiHfcQX3NaHaI0gyw60wmDgan83NpYQYRVLQ9C4icbNhel4n5H5FGFAxQS8IcvynqV8f-vz2t4BRGuYXBU8uhdYKgezhyQrSvX6NpwNPBJC8CWo2fA' },
    parse: data => parseCloudbetMatches(data),
    getTeamAliasMap: () => buildCloudbetTeamAliasMap(normTeam),
    getLeagueAliasMap: () => buildCloudbetLeagueAliasMap(normLeague),
    rawLeagueAliases: () => getCloudbetLeagueAliases(),
    getCrossAliasMaps: () => ({
      maxbet: { team: buildMaxbetClbTeamAliasMap(normTeam), league: buildMaxbetClbLeagueAliasMap(normLeague) },
      soccerbet: { team: buildSbtClbTeamAliasMap(normTeam), league: buildSbtClbLeagueAliasMap(normLeague) },
    }),
  },
];

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

let autoRefreshInterval = null;
let autoRefreshSeconds = 60;

const prevOddsMap      = new Map(); // key: home|away|leagueName|bkKey → { h, x, a, ov, un }
let pendingFlash       = false;

const openingOddsCache = new Map(); // match_key|bk_key → opening odds row
const loggedDropKeys   = new Set(); // match_key|bk_key|outcome|level — session dedup
let   dropsData        = [];        // rows from odds_drops table

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

function valid(v) { return isFinite(v) && v > 0; }

/**
 * Calculate fair (margin-free) probabilities from bookmaker odds.
 * Uses simple normalization (Equal Margin removal).
 */
function getFairProbs(h, x, a) {
  if (!valid(h) || !valid(x) || !valid(a)) return null;
  const sum = (1 / h) + (1 / x) + (1 / a);
  return {
    h: (1 / h) / sum,
    x: (1 / x) / sum,
    a: (1 / a) / sum,
    margin: sum - 1
  };
}

/**
 * Perform trader-specific calculations for a match:
 * 1. Arbitrage detection across all bookmakers.
 * 2. Value detection using Cloudbet as the sharp reference.
 */
function calculateTraderSpecs(m) {
  const bks = m.bookmakers;
  const allParsed = BOOKIES
    .map(bk => bks[bk.key] ? extractOdds(bks[bk.key].odds) : null)
    .filter(Boolean);

  // 1. ARBITRAGE (across all bookmakers)
  const maxH = Math.max(...allParsed.map(o => o.h).filter(valid), 0);
  const maxX = Math.max(...allParsed.map(o => o.x).filter(valid), 0);
  const maxA = Math.max(...allParsed.map(o => o.a).filter(valid), 0);

  if (maxH > 0 && maxX > 0 && maxA > 0) {
    const arbProb = (1 / maxH) + (1 / maxX) + (1 / maxA);
    if (arbProb < 0.999) { // Using 0.999 to avoid float precision issues with perfect markets
      m.arb = {
        roi: (1 / arbProb) - 1,
        h: maxH, x: maxX, a: maxA
      };
    }
  }

  // 2. VALUE (Sharp reference = Cloudbet)
  const sharpOdds = bks.cloudbet ? extractOdds(bks.cloudbet.odds) : null;
  if (sharpOdds && valid(sharpOdds.h) && valid(sharpOdds.x) && valid(sharpOdds.a)) {
    const fair = getFairProbs(sharpOdds.h, sharpOdds.x, sharpOdds.a);
    if (fair) {
      m.valueBets = [];
      // Compare Merkur, Maxbet, Soccerbet against Cloudbet fair prices
      ['merkur', 'maxbet', 'soccerbet'].forEach(bkKey => {
        const bkData = bks[bkKey];
        if (!bkData) return;
        const bkOdds = extractOdds(bkData.odds);

        ['h', 'x', 'a'].forEach(outcome => {
          if (valid(bkOdds[outcome])) {
            const ev = bkOdds[outcome] * fair[outcome];
            if (ev > 1.01) { // 1% minimum edge
              m.valueBets.push({
                bk: bkKey,
                outcome,
                odd: bkOdds[outcome],
                fair: 1 / fair[outcome],
                ev: ev - 1
              });
            }
          }
        });
      });
      if (m.valueBets.length > 0) {
        m.valueBets.sort((a, b) => b.ev - a.ev);
      }
    }
  }
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
function isSbtOutright(m) {
  const league = (m.leagueName || '').toLowerCase();
  const home = (m.home || '').toLowerCase();
  const away = (m.away || '').toLowerCase();
  return league.includes('pobednik') || /\d{4}\/\d{2}/.test(league)
    || home.includes('pobednik') || away.includes('pobednik');
}

function isMaxbetBonus(m) {
  return (m.leagueName || '').toLowerCase().includes('bonus');
}

function parseSoccerbetMatches(data) {
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
 * Only includes SELECTION_ENABLED outcomes; prices are already decimal.
 *
 * League names are built from comp.key ("soccer-england-premier-league")
 * by matching the country slug against FLAGS, yielding "England: Premier League".
 * Competitions whose key has no recognized country fall back to comp.name.
 */
function parseCloudbetMatches(data) {
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
    return comp.name; // international / regional competitions
  }

  const matches = [];
  for (const comp of (data.competitions || [])) {
    const leagueName = resolveLeagueName(comp);
    for (const event of (comp.events || [])) {
      if (event.type !== 'EVENT_TYPE_EVENT') continue;
      if (!['TRADING', 'TRADING_LIVE'].includes(event.status)) continue;

      const markets = event.markets || {};
      const odds = {};

      // 1X2
      const ftMatch = markets['soccer.match_odds']?.submarkets?.['period=ft'];
      if (ftMatch) {
        for (const sel of (ftMatch.selections || [])) {
          if (sel.status !== 'SELECTION_ENABLED') continue;
          if (sel.outcome === 'home') odds['1'] = sel.price;
          if (sel.outcome === 'draw') odds['2'] = sel.price;
          if (sel.outcome === 'away') odds['3'] = sel.price;
        }
      }

      // Over/Under 2.5
      const ftGoals = markets['soccer.total_goals']?.submarkets?.['period=ft'];
      if (ftGoals) {
        for (const sel of (ftGoals.selections || [])) {
          if (sel.status !== 'SELECTION_ENABLED' || sel.params !== 'total=2.5') continue;
          if (sel.outcome === 'over') odds['24'] = sel.price;
          if (sel.outcome === 'under') odds['22'] = sel.price;
        }
      }

      matches.push({
        home: event.home.name,
        away: event.away.name,
        leagueName,
        kickOffTime: new Date(event.cutoffTime).getTime(),
        live: event.status === 'TRADING_LIVE',
        odds,
        oddsCount: Object.keys(markets).length,
      });
    }
  }
  return matches;
}

/**
 * Merge merkur (canonical) and maxbet lists using 4-pass fuzzy matching.
 * teamAliasMap / leagueAliasMap come from BOOKIES[1] config.
 *
 * Pass 0 — Alias match (from Supabase alias DB)
 * Pass 1 — Exact normalized key (home|away), kickoff ±45 min
 * Pass 2 — Fuzzy home+away (substring / token Jaccard ≥ 0.5), kickoff ±45 min
 * Pass 3 — Fuzzy home only OR away only match (one side exact, other fuzzy), kickoff ±30 min
 *
 * matchQuality: 'alias' | 'exact' | 'fuzzy' | 'partial'
 */
function mergeMatches(merkurList, maxbetList, teamAliasMap, leagueAliasMap) {
  const merged = [];
  const usedMb = new Set();
  const TIME_WIN = 45 * 60 * 1000; // ±45 min
  const TIME_STRICT = 30 * 60 * 1000; // ±30 min for partial

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
        bookmakers: {
          merkur: { odds: mk.odds, oddsCount: mk.oddsCount },
          maxbet: { odds: mb.odds, oddsCount: mb.oddsCount },
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
          merkur: { odds: mk.odds, oddsCount: mk.oddsCount },
          maxbet: null,
        },
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
        bookmakers: {
          merkur: null,
          maxbet: { odds: mb.odds, oddsCount: mb.oddsCount },
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
 * Uses the same 4-pass fuzzy logic (alias → exact → fuzzy → partial).
 * Sets m.bookmakers[bookieKey] = { odds, oddsCount } on each matched entry,
 * null on unmatched. Appends bookmaker-only matches at the end.
 */
function mergeBookmaker(mergedList, newList, bookieKey, teamAliasMap, leagueAliasMap, crossAliasMaps = {}) {
  const used = new Set();
  const TIME_WIN = 45 * 60 * 1000;
  const TIME_STRICT = 30 * 60 * 1000;

  const newNorm = newList.map(m => ({
    home: normTeam(m.home),
    away: normTeam(m.away),
    league: normLeague(m.leagueName),
  }));

  // Build exact index keyed by norm home|away
  const exactIndex = {};
  newList.forEach((m, i) => {
    const key = `${newNorm[i].home}|${newNorm[i].away}`;
    if (!exactIndex[key]) exactIndex[key] = [];
    exactIndex[key].push(i);
  });

  // ── Pass 0: Alias matching ──────────────────────────────────
  function findAlias(mk) {
    const mkH = normTeam(mk.home);
    const mkA = normTeam(mk.away);
    const mkL = normLeague(mk.leagueName);

    // When merkur is absent, check cross-bookie maps for the first other present bookie
    let activeTeamMap = teamAliasMap;
    let activeLeagueMap = leagueAliasMap;
    if (!mk.bookmakers.merkur) {
      for (const [bk, maps] of Object.entries(crossAliasMaps)) {
        if (mk.bookmakers[bk] !== null) {
          activeTeamMap = maps.team;
          activeLeagueMap = maps.league;
          break;
        }
      }
    }

    const targetHs = activeTeamMap.get(mkH);
    const targetAs = activeTeamMap.get(mkA);
    if (!targetHs && !targetAs) return -1;

    // With league signal first
    for (let i = 0; i < newList.length; i++) {
      if (used.has(i)) continue;
      if (Math.abs(newList[i].kickOffTime - mk.kickOffTime) > TIME_WIN) continue;
      const homeMatch = targetHs ? targetHs.has(newNorm[i].home) : (mkH === newNorm[i].home);
      const awayMatch = targetAs ? targetAs.has(newNorm[i].away) : (mkA === newNorm[i].away);
      const targetLs = activeLeagueMap.get(mkL);
      const leagueMatch = (targetLs && targetLs.has(newNorm[i].league)) || (mkL === newNorm[i].league);
      if (homeMatch && awayMatch && leagueMatch) return i;
    }
    // Fallback: without league signal
    for (let i = 0; i < newList.length; i++) {
      if (used.has(i)) continue;
      if (Math.abs(newList[i].kickOffTime - mk.kickOffTime) > TIME_WIN) continue;
      const homeMatch = targetHs ? targetHs.has(newNorm[i].home) : (mkH === newNorm[i].home);
      const awayMatch = targetAs ? targetAs.has(newNorm[i].away) : (mkA === newNorm[i].away);
      if (homeMatch && awayMatch) return i;
    }
    return -1;
  }

  // ── Pass 1: Exact normalized key ────────────────────────────
  function findExact(mk) {
    const key = `${normTeam(mk.home)}|${normTeam(mk.away)}`;
    for (const idx of (exactIndex[key] || [])) {
      if (used.has(idx)) continue;
      if (Math.abs(newList[idx].kickOffTime - mk.kickOffTime) <= TIME_WIN) return idx;
    }
    return -1;
  }

  // ── Pass 2: Fuzzy both sides ────────────────────────────────
  function findFuzzy(mk) {
    const mkH = normTeam(mk.home);
    const mkA = normTeam(mk.away);
    let bestIdx = -1, bestScore = 0;
    newList.forEach((entry, i) => {
      if (used.has(i)) return;
      if (Math.abs(entry.kickOffTime - mk.kickOffTime) > TIME_WIN) return;
      if (fuzzyTeamMatch(mkH, newNorm[i].home) && fuzzyTeamMatch(mkA, newNorm[i].away)) {
        const score = 1 - Math.abs(entry.kickOffTime - mk.kickOffTime) / TIME_WIN;
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
    newList.forEach((entry, i) => {
      if (used.has(i)) return;
      if (Math.abs(entry.kickOffTime - mk.kickOffTime) > TIME_STRICT) return;
      const homeExact = mkH === newNorm[i].home;
      const awayExact = mkA === newNorm[i].away;
      const homeFuzz = fuzzyTeamMatch(mkH, newNorm[i].home);
      const awayFuzz = fuzzyTeamMatch(mkA, newNorm[i].away);
      if ((homeExact && awayFuzz) || (awayExact && homeFuzz)) {
        const score = 1 - Math.abs(entry.kickOffTime - mk.kickOffTime) / TIME_STRICT;
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
      used.add(idx);
      const entry = newList[idx];
      return { ...mk, bookmakers: { ...mk.bookmakers, [bookieKey]: { odds: entry.odds, oddsCount: entry.oddsCount } } };
    }
    return { ...mk, bookmakers: { ...mk.bookmakers, [bookieKey]: null } };
  });

  // Append bookmaker-only matches
  const emptyBks = Object.fromEntries(BOOKIES.map(b => [b.key, null]));
  newList.forEach((entry, i) => {
    if (!used.has(i)) {
      result.push({
        home: entry.home,
        away: entry.away,
        leagueName: entry.leagueName,
        kickOffTime: entry.kickOffTime,
        live: entry.live,
        bookmakers: { ...emptyBks, [bookieKey]: { odds: entry.odds, oddsCount: entry.oddsCount } },
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
  if (viewMode !== 'compare') ms = ms.filter(m => m.bookmakers[viewMode] !== null);

  // Tab filter
  if (activeFilter === 'live') ms = ms.filter(m => m.live);
  if (activeFilter === 'upcoming') ms = ms.filter(m => !m.live);
  if (activeFilter === 'value') {
    ms = ms.filter(m => m.valueBets && m.valueBets.length > 0)
      .sort((a, b) => b.valueBets[0].ev - a.valueBets[0].ev);
  }
  if (activeFilter === 'arbs') {
    ms = ms.filter(m => m.arb)
      .sort((a, b) => b.arb.roi - a.arb.roi);
  }

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
function getOddMovement(matchKey, bkKey, outcomeKey, currentVal) {
  const prev = prevOddsMap.get(`${matchKey}|${bkKey}`);
  if (!prev || !valid(currentVal) || !valid(prev[outcomeKey])) return null;
  if (currentVal > prev[outcomeKey]) return 'up';
  if (currentVal < prev[outcomeKey]) return 'down';
  return null;
}

function renderBkRow(bkLabel, bkCls, myOdds, allOddsArr, valueBets, bkKey, matchKey) {
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
    return 'equal';
  }

  function cellTxt(key) {
    const v = myOdds[key];
    return valid(v) ? v.toFixed(2) : '—';
  }

  function extraCls(key) {
    const vbet = (valueBets || []).find(vb => vb.bk === bkKey && vb.outcome === key);
    return vbet ? ' value-highlight' : '';
  }

  function moveMeta(key) {
    const dir = matchKey ? getOddMovement(matchKey, bkKey, key, myOdds[key]) : null;
    if (!dir) return { cls: '', el: '', attr: '' };
    return {
      cls: ` odd-${dir}`,
      el: `<span class="odd-arrow">${dir === 'up' ? '▲' : '▼'}</span>`,
      attr: ` data-moved="${dir}"`,
    };
  }

  const mH = moveMeta('h'), mX = moveMeta('x'), mA = moveMeta('a');
  const mOv = moveMeta('ov'), mUn = moveMeta('un');

  return `
    <div class="bk-row bk-row-${bkCls}">
      <div class="bk-label">${bkLabel}</div>
      <div class="m-odd cmp-odd ${cellCls('h')}${extraCls('h')}${mH.cls}" title="Home win"${mH.attr}>${mH.el}${cellTxt('h')}</div>
      <div class="m-odd cmp-odd ${cellCls('x')}${extraCls('x')}${mX.cls}" title="Draw"${mX.attr}>${mX.el}${cellTxt('x')}</div>
      <div class="m-odd cmp-odd ${cellCls('a')}${extraCls('a')}${mA.cls}" title="Away win"${mA.attr}>${mA.el}${cellTxt('a')}</div>
      <div class="m-line">2.5</div>
      <div class="m-odd cmp-odd ${cellCls('ov')}${extraCls('ov')}${mOv.cls}" title="Over 2.5"${mOv.attr}>${mOv.el}${cellTxt('ov')}</div>
      <div class="m-odd cmp-odd ${cellCls('un')}${extraCls('un')}${mUn.cls}" title="Under 2.5"${mUn.attr}>${mUn.el}${cellTxt('un')}</div>
    </div>`;
}

function renderMatch(m) {
  const isLive = Boolean(m.live);
  const timeStr = isLive ? 'LIVE' : fmtTime(m.kickOffTime);

  if (viewMode === 'compare') {
    return renderMatchCompare(m, isLive, timeStr);
  } else {
    return renderMatchSingle(m, m.bookmakers[viewMode], isLive, timeStr);
  }
}

function renderMatchCompare(m, isLive, timeStr) {
  const matchKey = `${m.home}|${m.away}|${m.leagueName}`;
  const oddsPerBk = BOOKIES.map(bk => ({
    bk,
    data: m.bookmakers[bk.key],
    parsed: extractOdds(m.bookmakers[bk.key]?.odds),
  }));
  const allOdds = oddsPerBk.filter(o => o.data !== null).map(o => o.parsed);
  const rows = oddsPerBk
    .map(({ bk, data, parsed }) => data !== null ? renderBkRow(bk.label, bk.cls, parsed, allOdds, m.valueBets, bk.key, matchKey) : '')
    .join('');

  let badges = '';
  if (m.arb) {
    badges += `<span class="vbet-badge vbet-badge-arb">⚖ Arb ${(m.arb.roi * 100).toFixed(1)}%</span>`;
  }
  if (m.valueBets && m.valueBets.length > 0) {
    const topEv = Math.max(...m.valueBets.map(v => v.ev));
    badges += `<span class="vbet-badge vbet-badge-value">💎 Value ${(topEv * 100).toFixed(1)}%</span>`;
  }

  return `
    <div class="match-group${isLive ? ' is-live' : ''}${m.matched ? ' is-matched' : ''}">
      <div class="mg-header">
        <div class="m-time${isLive ? ' live' : ''}">${esc(timeStr)}</div>
        <div class="m-teams">
          <div class="m-home" title="${esc(m.home)}">${esc(m.home)}</div>
          <div class="m-away" title="${esc(m.away)}">${esc(m.away)}</div>
        </div>
        <div class="mg-badges">${badges}</div>
      </div>
      <div class="mg-rows">${rows}</div>
    </div>`;
}

function renderMatchSingle(m, src, isLive, timeStr) {
  const matchKey = `${m.home}|${m.away}|${m.leagueName}`;
  const bkKey = viewMode;
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

  function moveMeta(key) {
    const dir = getOddMovement(matchKey, bkKey, key, raw[key]);
    if (!dir) return { cls: '', el: '', attr: '' };
    return {
      cls: ` odd-${dir}`,
      el: `<span class="odd-arrow">${dir === 'up' ? '▲' : '▼'}</span>`,
      attr: ` data-moved="${dir}"`,
    };
  }

  const mH = moveMeta('h'), mX = moveMeta('x'), mA = moveMeta('a');
  const mOv = moveMeta('ov'), mUn = moveMeta('un');

  return `
    <div class="match-row${isLive ? ' is-live' : ''}">
      <div class="m-time${isLive ? ' live' : ''}">${esc(timeStr)}</div>
      <div class="m-teams">
        <div class="m-home" title="${esc(m.home)}">${esc(m.home)}</div>
        <div class="m-away" title="${esc(m.away)}">${esc(m.away)}</div>
      </div>
      <div class="m-odd ${getOddClass(raw.h, lo, hi)}${mH.cls}" title="Home win"${mH.attr}>${mH.el}${fmtOdd(raw.h)}</div>
      <div class="m-odd ${getOddClass(raw.x, lo, hi)}${mX.cls}" title="Draw"${mX.attr}>${mX.el}${fmtOdd(raw.x)}</div>
      <div class="m-odd ${getOddClass(raw.a, lo, hi)}${mA.cls}" title="Away win"${mA.attr}>${mA.el}${fmtOdd(raw.a)}</div>
      <div class="m-line">2.5</div>
      <div class="m-odd ${getOddClass(raw.ov, ouLo, ouHi)}${mOv.cls}" title="Over 2.5"${mOv.attr}>${mOv.el}${fmtOdd(raw.ov)}</div>
      <div class="m-odd ${getOddClass(raw.un, ouLo, ouHi)}${mUn.cls}" title="Under 2.5"${mUn.attr}>${mUn.el}${fmtOdd(raw.un)}</div>
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
   RENDER — RANKED LIST (Value / Arbs tabs)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderRankedList(ms) {
  const isValue = activeFilter === 'value';
  const isCompare = viewMode === 'compare';

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

  const rows = ms.map((m, i) => {
    const rank = i + 1;
    const isLive = Boolean(m.live);
    const timeStr = isLive ? 'LIVE' : fmtTime(m.kickOffTime);
    const matchHtml = isCompare
      ? renderMatchCompare(m, isLive, timeStr)
      : renderMatchSingle(m, m.bookmakers[viewMode], isLive, timeStr);

    const metricVal = isValue
      ? Math.max(...m.valueBets.map(v => v.ev)) * 100
      : m.arb.roi * 100;
    const metricHtml = isValue
      ? `<span class="rank-metric rank-ev">EV +${metricVal.toFixed(2)}%</span>`
      : `<span class="rank-metric rank-roi">ROI +${metricVal.toFixed(2)}%</span>`;

    const country = parseCountry(m.leagueName);
    const lname = parseLeagueName(m.leagueName);
    const leagueLabel = country !== 'Other'
      ? `${getFlag(country)} ${esc(country)} · ${esc(lname)}`
      : `${getFlag(country)} ${esc(lname)}`;

    return `
      <div class="ranked-item" style="animation-delay:${Math.min(i * 16, 480)}ms">
        <div class="ranked-header">
          <span class="ranked-num">#${rank}</span>
          <span class="ranked-league">${leagueLabel}</span>
          ${metricHtml}
        </div>
        ${matchHtml}
      </div>`;
  }).join('');

  return `<div class="ranked-list">${colHead}${rows}</div>`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RENDER — DROPS TAB
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function fmtTimeAgo(isoStr) {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins   = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function renderDropsTab() {
  if (!dropsData.length) {
    return `<div class="state-center"><span class="empty-text">No drops detected yet — monitoring…</span></div>`;
  }

  const severityLabel = { weak: 'Steam', strong: 'Sharp', extreme: 'Alert' };
  const outcomeLabel  = { h: 'Home', x: 'Draw', a: 'Away', ov: 'Over 2.5', un: 'Under 2.5' };
  const bkLabel       = { merkur: 'MRK', maxbet: 'MAX', soccerbet: 'SBT', cloudbet: 'CLB' };

  const rows = dropsData.map((r, i) => {
    const country = parseCountry(r.league || '');
    const lname   = parseLeagueName(r.league || '');
    const leagueLabel = country !== 'Other'
      ? `${getFlag(country)} ${esc(country)} · ${esc(lname)}`
      : `${getFlag(country)} ${esc(lname || r.league || '—')}`;

    return `
      <div class="drop-item" style="animation-delay:${Math.min(i * 12, 400)}ms">
        <div class="drop-header drop-sev-${r.severity}">
          <span class="drop-rank">#${i + 1}</span>
          <span class="drop-league">${leagueLabel}</span>
          <span class="drop-sev-badge drop-sev-${r.severity}">${severityLabel[r.severity]}</span>
        </div>
        <div class="drop-body">
          <div class="drop-match">
            <span class="drop-home">${esc(r.home)}</span>
            <span class="drop-vs">vs</span>
            <span class="drop-away">${esc(r.away)}</span>
          </div>
          <div class="drop-detail">
            <span class="drop-bk">${esc(bkLabel[r.bk_key] || r.bk_key)}</span>
            <span class="drop-outcome">${esc(outcomeLabel[r.outcome] || r.outcome)}</span>
            <span class="drop-odds">
              <span class="drop-open">${r.opening_val.toFixed(2)}</span>
              <span class="drop-arrow-icon">→</span>
              <span class="drop-cur">${r.current_val.toFixed(2)}</span>
            </span>
            <span class="drop-pct drop-sev-${r.severity}">▼ ${r.drop_pct.toFixed(1)}%</span>
            <span class="drop-time">${fmtTimeAgo(r.detected_at)}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  return `<div class="drops-list">${rows}</div>`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RENDER — CONTENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderContent() {
  const content = document.getElementById('content');
  const ms = getFilteredMatches();
  const isRanked = activeFilter === 'value' || activeFilter === 'arbs';

  let crumb = 'All Matches';
  if (selectedLeague) {
    const country = parseCountry(selectedLeague);
    const lname = parseLeagueName(selectedLeague);
    crumb = country !== 'Other'
      ? `${esc(country)}<em>›</em>${esc(lname)}`
      : esc(lname);
  }

  const cdSecs = autoRefreshSeconds > 0 ? autoRefreshSeconds : 60;
  const cdUrgent = autoRefreshSeconds <= 10 && autoRefreshSeconds > 0 ? ' urgent' : '';
  const cdHtml = `<span id="autoRefreshCountdown" class="content-countdown${cdUrgent}" title="Next auto-refresh">↺ ${cdSecs}s</span>`;

  if (activeFilter === 'drops') {
    content.innerHTML = `
      <div class="content-bar">
        <span class="content-crumb">Dropping Odds</span>
        ${cdHtml}
      </div>
      ${renderDropsTab()}`;
    return;
  }

  if (!ms.length) {
    content.innerHTML = `
      <div class="content-bar">
        <span class="content-crumb">${crumb}</span>
        ${cdHtml}
      </div>
      <div class="state-center">
        <span class="empty-text">No matches found</span>
      </div>`;
    return;
  }

  if (isRanked) {
    content.innerHTML = `
      <div class="content-bar">
        <span class="content-crumb">${crumb}</span>
        ${cdHtml}
      </div>
      ${renderRankedList(ms)}`;
    triggerOddFlash(content);
    return;
  }

  const groups = groupByLeague(ms);
  content.innerHTML = `
    <div class="content-bar">
      <span class="content-crumb">${crumb}</span>
      ${cdHtml}
    </div>
    ${groups.map((g, i) => renderLeagueBlock(g, i)).join('')}`;
  triggerOddFlash(content);
}

function triggerOddFlash(container) {
  if (!pendingFlash) return;
  pendingFlash = false;
  requestAnimationFrame(() => {
    container.querySelectorAll('[data-moved]').forEach(el => {
      el.classList.add('odd-flash');
      el.addEventListener('animationend', () => el.classList.remove('odd-flash'), { once: true });
    });
  });
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DROPPING ODDS — SUPABASE PIPELINE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

async function cleanupStaleData() {
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const nowSec = Math.floor(Date.now() / 1000);
  await supa.from('odds_drops').delete().lt('detected_at', cutoff);
  await supa.from('opening_odds').delete().lt('kickoff_at', nowSec);
}

async function loadOpeningOddsCache() {
  openingOddsCache.clear();
  const { data } = await supa.from('opening_odds').select('*');
  (data || []).forEach(r => openingOddsCache.set(`${r.match_key}|${r.bk_key}`, r));
}

async function saveOpeningOdds() {
  const rows = [];
  allMatches.forEach(m => {
    const matchKey = `${m.home}|${m.away}|${m.leagueName}`;
    BOOKIES.forEach(bk => {
      if (openingOddsCache.has(`${matchKey}|${bk.key}`)) return;
      const data = m.bookmakers[bk.key];
      if (!data) return;
      const o = extractOdds(data.odds);
      if (!valid(o.h) && !valid(o.x) && !valid(o.a)) return;
      rows.push({
        match_key: matchKey, bk_key: bk.key,
        h: o.h, x: o.x, a: o.a, ov: o.ov, un: o.un,
        home: m.home, away: m.away, league: m.leagueName,
        kickoff_at: m.kickOffTime,
      });
    });
  });
  if (!rows.length) return;
  await supa.from('opening_odds')
    .upsert(rows, { onConflict: 'match_key,bk_key', ignoreDuplicates: true });
  // Add newly saved rows to cache so the same refresh can detect drops
  rows.forEach(r => openingOddsCache.set(`${r.match_key}|${r.bk_key}`, r));
}

async function detectAndLogDrops() {
  const outcomes = ['h', 'x', 'a', 'ov', 'un'];
  const outcomeLabel = { h: 'Home', x: 'Draw', a: 'Away', ov: 'Over 2.5', un: 'Under 2.5' };
  const rows = [];

  allMatches.forEach(m => {
    if (m.live) return;
    const matchKey = `${m.home}|${m.away}|${m.leagueName}`;
    BOOKIES.forEach(bk => {
      const opening = openingOddsCache.get(`${matchKey}|${bk.key}`);
      if (!opening) return;
      const cur = extractOdds(m.bookmakers[bk.key]?.odds);
      outcomes.forEach(outcome => {
        const openVal = parseFloat(opening[outcome]);
        const curVal  = cur[outcome];
        if (!valid(openVal) || !valid(curVal) || curVal >= openVal) return;
        const dropPct  = (openVal - curVal) / openVal * 100;
        if (dropPct < 3) return;
        const level    = Math.floor(dropPct / 2) * 2;
        const dedupKey = `${matchKey}|${bk.key}|${outcome}|${level}`;
        if (loggedDropKeys.has(dedupKey)) return;
        loggedDropKeys.add(dedupKey);
        const severity = dropPct >= 15 ? 'extreme' : dropPct >= 7 ? 'strong' : 'weak';
        rows.push({
          match_key: matchKey, bk_key: bk.key, outcome,
          drop_level: level, opening_val: openVal, current_val: curVal,
          drop_pct: dropPct, severity,
          home: m.home, away: m.away, league: m.leagueName,
          kickoff_at: m.kickOffTime,
        });
        if (severity !== 'weak') {
          showToast('drop', m, { bkLabel: bk.label, outcome: outcomeLabel[outcome], dropPct, severity });
          sendDropBrowserNotification(m, bk.label, outcomeLabel[outcome], dropPct);
        }
      });
    });
  });

  if (!rows.length) return;
  await supa.from('odds_drops')
    .upsert(rows, { onConflict: 'match_key,bk_key,outcome,drop_level', ignoreDuplicates: true });
}

async function loadDropsData() {
  const { data } = await supa.from('odds_drops')
    .select('*')
    .order('detected_at', { ascending: false });
  return data || [];
}

function sendDropBrowserNotification(m, bkLabel, outcomeLabel, dropPct) {
  if (document.visibilityState === 'visible') return;
  if (Notification.permission !== 'granted') return;
  new Notification(`📉 DROP ${bkLabel} ${outcomeLabel} −${dropPct.toFixed(1)}%`, {
    body: `${m.home} vs ${m.away}\n${m.leagueName}`,
  });
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
   ALERTS & NOTIFICATIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function showToast(type, match, metric) {
  const container = document.getElementById('toastContainer');
  const div = document.createElement('div');

  let label, cls;
  if (type === 'arb') {
    label = `ARB +${(metric * 100).toFixed(2)}%`;
    cls   = 'toast-arb';
  } else if (type === 'value') {
    label = `VALUE  EV +${(metric * 100).toFixed(2)}%`;
    cls   = 'toast-value';
  } else if (type === 'drop') {
    label = `📉 ${esc(metric.bkLabel)}  ${esc(metric.outcome)}  −${metric.dropPct.toFixed(1)}%`;
    cls   = `toast-drop-${metric.severity}`;
  }

  div.className = `toast ${cls}`;
  div.innerHTML = `
    <div class="toast-label">${label}</div>
    <div class="toast-match">${esc(match.home)} vs ${esc(match.away)}</div>
    <div class="toast-league">${esc(match.leagueName)}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  container.prepend(div);
  setTimeout(() => div.classList.add('toast-fade'), 7000);
  setTimeout(() => div.remove(), 7500);
}

function sendBrowserNotification(type, match, metric) {
  if (document.visibilityState === 'visible') return;
  if (Notification.permission !== 'granted') return;
  const title = type === 'arb'
    ? `New ARB +${(metric * 100).toFixed(2)}%`
    : `New Value Bet  EV +${(metric * 100).toFixed(2)}%`;
  new Notification(title, {
    body: `${match.home} vs ${match.away}\n${match.leagueName}`
  });
}

function notifyNewOpportunities(prevArbKeys, prevValueKeys) {
  // Skip on first load when there was no previous data
  if (prevArbKeys.size === 0 && prevValueKeys.size === 0) return;
  allMatches.forEach(m => {
    const key = `${m.home}|${m.away}|${m.leagueName}`;
    if (m.arb && !prevArbKeys.has(key)) {
      showToast('arb', m, m.arb.roi);
      sendBrowserNotification('arb', m, m.arb.roi);
    }
    if (m.valueBets && m.valueBets.length > 0 && !prevValueKeys.has(key)) {
      const topEV = Math.max(...m.valueBets.map(v => v.ev));
      showToast('value', m, topEV);
      sendBrowserNotification('value', m, topEV);
    }
  });
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FETCH
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function loadData() {
  // Snapshot current opportunities before fetching new data (for diffing)
  const prevArbKeys = new Set(
    allMatches.filter(m => m.arb).map(m => `${m.home}|${m.away}|${m.leagueName}`)
  );
  const prevValueKeys = new Set(
    allMatches.filter(m => m.valueBets && m.valueBets.length > 0).map(m => `${m.home}|${m.away}|${m.leagueName}`)
  );

  // Snapshot current odds for movement detection
  prevOddsMap.clear();
  allMatches.forEach(m => {
    const matchKey = `${m.home}|${m.away}|${m.leagueName}`;
    BOOKIES.forEach(bk => {
      const data = m.bookmakers[bk.key];
      if (data) prevOddsMap.set(`${matchKey}|${bk.key}`, extractOdds(data.odds));
    });
  });

  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');

  // Only blank the screen on the very first load — subsequent refreshes keep odds visible
  if (allMatches.length === 0) {
    document.getElementById('content').innerHTML = `
      <div class="state-center">
        <div class="spinner"></div>
        <div class="loading-text">Loading aliases & fetching odds…</div>
      </div>`;
  }

  try {
    // Load shared aliases FIRST
    await loadAliasDB();

    // ── FETCH all bookmakers in parallel ───────────────────
    const responses = await Promise.all(BOOKIES.map(b => {
      const url = typeof b.url === 'function' ? b.url() : b.url;
      const opts = b.headers ? { headers: b.headers } : {};
      return fetch(url, opts);
    }));
    BOOKIES.forEach((b, i) => {
      if (!responses[i].ok) throw new Error(`${b.key} HTTP ${responses[i].status}`);
    });
    const rawData = await Promise.all(responses.map(r => r.json()));
    const parsed = BOOKIES.map((b, i) => b.parse(rawData[i]));

    // ── LEAGUE ALIAS NORMALIZATION ─────────────────────────
    // Build display name override map (highest priority — user-defined canonical names)
    const displayNameOverrides = new Map();
    getLeagueDisplayNames().forEach(d => {
      displayNameOverrides.set(normLeague(d.merkur_name), d.display_name);
    });

    // Generic helper: build a reverse-lookup map from any bookie's league aliases.
    // Maps normBookieName → canonical and normMerkurName → canonical.
    function buildRevMap(rawAliases, bookieKey) {
      const map = new Map();
      rawAliases.forEach(a => {
        const normMrk = normLeague(a.merkur);
        const best = displayNameOverrides.get(normMrk) ?? pickBetterLeagueName(a.merkur, a[bookieKey]);
        map.set(normLeague(a[bookieKey]), best);
        map.set(normMrk, best);
      });
      return map;
    }

    // Base rev map built from BOOKIES[1] (maxbet) — shared canonical reference
    const baseRevMap = buildRevMap(BOOKIES[1].rawLeagueAliases(), BOOKIES[1].key);
    displayNameOverrides.forEach((dn, normMrk) => {
      if (!baseRevMap.has(normMrk)) baseRevMap.set(normMrk, dn);
    });

    // Normalize merkur and maxbet matches with the base map
    parsed[0].forEach(m => { const c = baseRevMap.get(normLeague(m.leagueName)); if (c) m.leagueName = c; });
    parsed[1].forEach(m => { const c = baseRevMap.get(normLeague(m.leagueName)); if (c) m.leagueName = c; });

    // For each additional bookie: build its own rev map, normalize with baseRevMap fallback
    for (let i = 2; i < BOOKIES.length; i++) {
      const bk = BOOKIES[i];
      const bookieRevMap = buildRevMap(bk.rawLeagueAliases(), bk.key);
      parsed[i].forEach(m => {
        const c = bookieRevMap.get(normLeague(m.leagueName)) || baseRevMap.get(normLeague(m.leagueName));
        if (c) m.leagueName = c;
      });
    }

    // ── MERGE ──────────────────────────────────────────────
    let merged = mergeMatches(parsed[0], parsed[1], BOOKIES[1].getTeamAliasMap(), BOOKIES[1].getLeagueAliasMap());
    for (let i = 2; i < BOOKIES.length; i++) {
      const bk = BOOKIES[i];
      const cross = bk.getCrossAliasMaps ? bk.getCrossAliasMaps() : {};
      merged = mergeBookmaker(merged, parsed[i], bk.key, bk.getTeamAliasMap(), bk.getLeagueAliasMap(), cross);
    }
    allMatches = merged;
    allMatches.forEach(calculateTraderSpecs);

    // Dropping odds pipeline
    await cleanupStaleData();
    await loadOpeningOddsCache();
    await saveOpeningOdds();
    await detectAndLogDrops();
    dropsData = await loadDropsData();
    if (loggedDropKeys.size === 0) {
      dropsData.forEach(r =>
        loggedDropKeys.add(`${r.match_key}|${r.bk_key}|${r.outcome}|${r.drop_level}`)
      );
    }

    // Header stats
    const liveN = allMatches.filter(m => m.live).length;
    const leagueN = new Set(allMatches.map(m => m.leagueName)).size;
    const matchedN = allMatches.filter(m => m.matched).length;
    const valueN = allMatches.filter(m => m.valueBets && m.valueBets.length > 0).length;
    const arbN = allMatches.filter(m => m.arb).length;

    document.getElementById('sLeagues').textContent = leagueN;
    document.getElementById('sMatches').textContent = allMatches.length;
    document.getElementById('sLive').textContent = liveN;
    document.getElementById('sMatched').textContent = matchedN;
    document.getElementById('sValue').textContent = valueN;
    document.getElementById('sArbs').textContent = arbN;
    // We can potentially repurpose or add more stat display here later.

    selectedLeague = null;

    renderSidebar();
    pendingFlash = true;
    renderContent();
    notifyNewOpportunities(prevArbKeys, prevValueKeys);

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

    // Restart 60-second auto-refresh countdown
    clearInterval(autoRefreshInterval);
    autoRefreshSeconds = 60;
    autoRefreshInterval = setInterval(() => {
      autoRefreshSeconds--;
      const el = document.getElementById('autoRefreshCountdown');
      if (el) {
        el.textContent = `↺ ${autoRefreshSeconds}s`;
        el.classList.toggle('urgent', autoRefreshSeconds <= 10);
      }
      if (autoRefreshSeconds <= 0) {
        clearInterval(autoRefreshInterval);
        loadData();
      }
    }, 1000);
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
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
loadData();
