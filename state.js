/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STATE — mutable singleton + localStorage persistence
   No render calls here — callers are responsible for re-rendering.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { CONFIG } from './config.js';

export const state = {
  allMatches: [],
  activeFilter: 'all',
  searchQuery: '',
  selectedLeague: null,
  viewMode: 'compare',       // 'compare' | 'merkur' | 'maxbet' | 'soccerbet' | 'cloudbet'
  missingSource: 'merkur',   // bookmaker key to check for missing matches

  autoRefreshInterval: null,
  autoRefreshSeconds: CONFIG.AUTO_REFRESH_SECS,
  pendingFlash: false,

  dropsData: [],
  dropsSearchQuery: '',

  collapsedCountries: new Set(),
  prevOddsMap:        new Map(), // key: home|away|leagueName|bkKey → { h, x, a, ov, un }
  oddsHistory:        new Map(), // key: matchKey|bkKey → { h:[], x:[], a:[] } rolling window
  openingOddsCache:   new Map(), // match_key|bk_key → opening odds row
  loggedDropKeys:     new Set(), // match_key|bk_key|outcome|level — session dedup

  favMatches: new Set(), // "home|away|leagueName" keys
  favLeagues: new Set(), // leagueName strings
};

/* ── localStorage ───────────────────────────────────────────── */

export function loadFavs() {
  try {
    const m = JSON.parse(localStorage.getItem('favMatches') || '[]');
    const l = JSON.parse(localStorage.getItem('favLeagues') || '[]');
    m.forEach(k => state.favMatches.add(k));
    l.forEach(k => state.favLeagues.add(k));
  } catch { /* ignore corrupt storage */ }
}

export function saveFavs() {
  localStorage.setItem('favMatches', JSON.stringify([...state.favMatches]));
  localStorage.setItem('favLeagues', JSON.stringify([...state.favLeagues]));
}

export function loadCollapsed() {
  try {
    const saved = JSON.parse(localStorage.getItem('collapsedCountries') || '[]');
    saved.forEach(c => state.collapsedCountries.add(c));
  } catch { /* ignore corrupt storage */ }
}

export function saveCollapsed() {
  localStorage.setItem('collapsedCountries', JSON.stringify([...state.collapsedCountries]));
}

/* ── Favorites mutations (no render — caller handles that) ─── */

export function toggleFavMatch(key) {
  if (state.favMatches.has(key)) state.favMatches.delete(key);
  else state.favMatches.add(key);
  saveFavs();
}

export function toggleFavLeague(name) {
  if (state.favLeagues.has(name)) state.favLeagues.delete(name);
  else state.favLeagues.add(name);
  saveFavs();
}
