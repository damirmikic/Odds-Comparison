/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UTILS — pure utility functions, no dependencies on other modules.
   parseCountry() reads getLeagueGroups() from the global aliases.js.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { FLAGS, ABBREV, CONFIG } from './config.js';

/* ── HTML escaping ──────────────────────────────────────────── */

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── League / country helpers ───────────────────────────────── */

export function parseCountry(leagueName) {
  // 1. Check manual group overrides (global from aliases.js)
  const groups = getLeagueGroups();
  const override = groups.find(g => g.league_name === leagueName);
  if (override) return override.group_name;

  // 2. Special hardcoded case for International Clubs
  if (leagueName.toLowerCase().startsWith('international clubs')) return 'International';

  // 3. Default comma-split logic
  const i = leagueName.indexOf(',');
  return i === -1 ? 'Other' : leagueName.slice(0, i).trim();
}

export function hasCountry(name) { return name && name.includes(','); }

export function pickBetterLeagueName(n1, n2) {
  if (hasCountry(n1) && !hasCountry(n2)) return n1;
  if (hasCountry(n2) && !hasCountry(n1)) return n2;
  return n1 || n2;
}

export function parseLeagueName(leagueName) {
  const i = leagueName.indexOf(',');
  return i === -1 ? leagueName : leagueName.slice(i + 1).trim();
}

export function getFlag(country) { return FLAGS[country] || '🏳'; }

/* ── Formatting ─────────────────────────────────────────────── */

export function fmtTime(ts) {
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

export function fmtOdd(v) {
  return (v == null || !isFinite(v) || v <= 0) ? '—' : parseFloat(v).toFixed(2);
}

export function fmtTimeAgo(isoStr) {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins   = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

/* ── Odds helpers ───────────────────────────────────────────── */

export function valid(v) { return isFinite(v) && v > 0; }

/**
 * Extract the key odds from a bookmaker's odds object.
 * Returns { h, x, a, ov, un } as raw floats (NaN if missing).
 */
export function extractOdds(oddsObj) {
  if (!oddsObj) return { h: NaN, x: NaN, a: NaN, ov: NaN, un: NaN };
  return {
    h: parseFloat(oddsObj['1']),
    x: parseFloat(oddsObj['2']),
    a: parseFloat(oddsObj['3']),
    ov: parseFloat(oddsObj['24']),
    un: parseFloat(oddsObj['22']),
  };
}

/* ── Normalization ──────────────────────────────────────────── */

export function normTeam(s) {
  let n = s.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')  // punctuation → space
    .replace(/\s+/g, ' ')
    .trim();
  for (const [pat, rep] of Object.entries(ABBREV)) {
    n = n.replace(new RegExp(pat, 'g'), rep);
  }
  return n.replace(/\s+/g, ' ').trim();
}

export function normLeague(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/* ── Fuzzy matching ─────────────────────────────────────────── */

export function tokenize(norm) {
  return new Set(norm.split(' ').filter(w => w.length >= 2));
}

export function jaccard(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / (setA.size + setB.size - inter);
}

export function fuzzyTeamMatch(normA, normB) {
  if (!normA || !normB) return false;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  const tokA = tokenize(normA);
  const tokB = tokenize(normB);
  return jaccard(tokA, tokB) >= CONFIG.JACCARD_THRESHOLD;
}
