/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SOCCER.JS — orchestrator
   Imports all modules, owns loadData(), event listeners, and init.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { CONFIG } from './config.js';
import { state, loadFavs, loadCollapsed, saveCollapsed, toggleFavMatch, toggleFavLeague } from './state.js';
import { normLeague, pickBetterLeagueName, extractOdds } from './utils.js';
import { BOOKIES } from './api/bookies.js';
import { mergeMatches, mergeBookmaker, resolveKickOffTime } from './merge.js';
import { calculateTraderSpecs, updateOddsHistory } from './calculations.js';
import { renderSidebar, renderContent, updateSidebarActive } from './render.js';
import { cleanupStaleData, loadOpeningOddsCache, saveOpeningOdds, detectAndLogDrops, loadDropsData } from './drops.js';
import { notifyNewOpportunities } from './notifications.js';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ACTIONS — UI state mutations that trigger re-renders
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function selectLeague(name) {
  state.selectedLeague = name;
  updateSidebarActive();
  renderContent();
  document.getElementById('content').scrollTop = 0;
}

function selectAll() {
  state.selectedLeague = null;
  updateSidebarActive();
  renderContent();
  document.getElementById('content').scrollTop = 0;
}

function clearSearch() {
  const input = document.getElementById('search');
  input.value = '';
  state.searchQuery = '';
  document.getElementById('searchClear').classList.remove('visible');
  renderContent();
  input.focus();
}

function setDropsSearch(val) {
  state.dropsSearchQuery = val.toLowerCase();
  renderContent();
  requestAnimationFrame(() => {
    const inp = document.querySelector('.drops-search-input');
    if (inp) { inp.focus(); inp.value = val; }
  });
}

function setRankedSearch(val) {
  state.searchQuery = val.trim();
  const hdr = document.getElementById('search');
  if (hdr) {
    hdr.value = val;
    document.getElementById('searchClear').classList.toggle('visible', val.length > 0);
  }
  renderContent();
  requestAnimationFrame(() => {
    const inp = document.querySelector('.ranked-search-input');
    if (inp) { inp.focus(); inp.value = val; }
  });
}

function switchTab(filter) {
  state.activeFilter = filter;
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.f === filter)
  );
  renderContent();
}

function setViewMode(mode) {
  state.viewMode = mode;
  document.querySelectorAll('.view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === mode)
  );
  renderContent();
}

function setMissingSource(src) {
  state.missingSource = src;
  renderContent();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN DATA FETCH
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

async function loadData() {
  const prevArbKeys = new Set(
    state.allMatches.filter(m => m.arb).map(m => `${m.home}|${m.away}|${m.leagueName}`)
  );
  const prevValueKeys = new Set(
    state.allMatches.filter(m => m.valueBets && m.valueBets.length > 0).map(m => `${m.home}|${m.away}|${m.leagueName}`)
  );

  // Snapshot current odds for movement detection
  state.prevOddsMap.clear();
  state.allMatches.forEach(m => {
    const matchKey = `${m.home}|${m.away}|${m.leagueName}`;
    BOOKIES.forEach(bk => {
      const data = m.bookmakers[bk.key];
      if (data) state.prevOddsMap.set(`${matchKey}|${bk.key}`, extractOdds(data.odds));
    });
  });

  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');

  if (state.allMatches.length === 0) {
    document.getElementById('content').innerHTML = `
      <div class="state-center">
        <div class="spinner"></div>
        <div class="loading-text">Loading aliases & fetching odds…</div>
      </div>`;
  }

  try {
    await loadAliasDB();

    // ── Fetch all bookmakers in parallel ───────────────────
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

    // ── League alias normalization ─────────────────────────
    const displayNameOverrides = new Map();
    getLeagueDisplayNames().forEach(d => {
      displayNameOverrides.set(normLeague(d.merkur_name), d.display_name);
    });

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

    const baseRevMap = buildRevMap(BOOKIES[1].rawLeagueAliases(), BOOKIES[1].key);
    displayNameOverrides.forEach((dn, normMrk) => {
      if (!baseRevMap.has(normMrk)) baseRevMap.set(normMrk, dn);
    });

    parsed[0].forEach(m => { const c = baseRevMap.get(normLeague(m.leagueName)); if (c) m.leagueName = c; });
    parsed[1].forEach(m => { const c = baseRevMap.get(normLeague(m.leagueName)); if (c) m.leagueName = c; });

    for (let i = 2; i < BOOKIES.length; i++) {
      const bk = BOOKIES[i];
      const bookieRevMap = buildRevMap(bk.rawLeagueAliases(), bk.key);
      parsed[i].forEach(m => {
        const c = bookieRevMap.get(normLeague(m.leagueName)) || baseRevMap.get(normLeague(m.leagueName));
        if (c) m.leagueName = c;
      });
    }

    // ── Merge ──────────────────────────────────────────────
    let merged = mergeMatches(parsed[0], parsed[1], BOOKIES[1].getTeamAliasMap(), BOOKIES[1].getLeagueAliasMap());
    for (let i = 2; i < BOOKIES.length; i++) {
      const bk = BOOKIES[i];
      const cross = bk.getCrossAliasMaps ? bk.getCrossAliasMaps() : {};
      merged = mergeBookmaker(merged, parsed[i], bk.key, bk.getTeamAliasMap(), bk.getLeagueAliasMap(), cross);
    }
    merged.forEach(m => { m.kickOffTime = resolveKickOffTime(m); });

    state.allMatches = merged;
    state.allMatches.forEach(calculateTraderSpecs);
    updateOddsHistory();

    // ── Dropping odds pipeline ─────────────────────────────
    await cleanupStaleData();
    await loadOpeningOddsCache();
    await saveOpeningOdds();
    await detectAndLogDrops();
    state.dropsData = await loadDropsData();
    if (state.loggedDropKeys.size === 0) {
      state.dropsData.forEach(r =>
        state.loggedDropKeys.add(`${r.match_key}|${r.bk_key}|${r.outcome}|${r.drop_level}`)
      );
    }

    // ── Header stats ───────────────────────────────────────
    const leagueN  = new Set(state.allMatches.map(m => m.leagueName)).size;
    const matchedN = state.allMatches.filter(m => m.matched).length;
    const valueN   = state.allMatches.filter(m => m.valueBets && m.valueBets.length > 0).length;
    const arbN     = state.allMatches.filter(m => m.arb).length;

    document.getElementById('sLeagues').textContent = leagueN;
    document.getElementById('sMatches').textContent = state.allMatches.length;
    document.getElementById('sMatched').textContent = matchedN;
    document.getElementById('sValue').textContent   = valueN;
    document.getElementById('sArbs').textContent    = arbN;

    renderSidebar();
    state.pendingFlash = true;
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
        : String(err.message).replace(/&/g, '&amp;').replace(/</g, '&lt;')}
        </div>
        <button class="retry-btn" onclick="loadData()">↺ Retry</button>
      </div>`;
  } finally {
    btn.classList.remove('spinning');

    clearInterval(state.autoRefreshInterval);
    state.autoRefreshSeconds = CONFIG.AUTO_REFRESH_SECS;
    state.autoRefreshInterval = setInterval(() => {
      state.autoRefreshSeconds--;
      const el = document.getElementById('autoRefreshCountdown');
      if (el) {
        el.textContent = `↺ ${state.autoRefreshSeconds}s`;
        el.classList.toggle('urgent', state.autoRefreshSeconds <= 10);
      }
      if (state.autoRefreshSeconds <= 0) {
        clearInterval(state.autoRefreshInterval);
        loadData();
      }
    }, 1000);
  }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   WINDOW EXPORTS — needed by inline onclick="..." in rendered HTML
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

Object.assign(window, {
  loadData,
  switchTab,
  setViewMode,
  selectLeague,
  selectAll,
  clearSearch,
  setDropsSearch,
  setRankedSearch,
  setMissingSource,
  // toggleFavMatch and toggleFavLeague need re-render after the state mutation
  toggleFavMatch: (key) => { toggleFavMatch(key); renderContent(); },
  toggleFavLeague: (name) => { toggleFavLeague(name); renderSidebar(); renderContent(); },
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EVENT LISTENERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// Tabs
document.getElementById('tabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  state.activeFilter = btn.dataset.f;
  renderContent();
});

// View mode buttons
document.getElementById('viewBtns').addEventListener('click', e => {
  const btn = e.target.closest('.view-btn');
  if (!btn) return;
  setViewMode(btn.dataset.mode);
});

// Search (debounced 180ms)
let searchTimer;
document.getElementById('search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  const val = e.target.value;
  document.getElementById('searchClear').classList.toggle('visible', val.length > 0);
  searchTimer = setTimeout(() => {
    state.searchQuery = val.trim();
    renderContent();
  }, 180);
});

// Content — fav button delegation
document.getElementById('content').addEventListener('click', e => {
  const btn = e.target.closest('.fav-btn');
  if (!btn) return;
  e.stopPropagation();
  if (btn.dataset.favMatch) window.toggleFavMatch(btn.dataset.favMatch);
  else if (btn.dataset.favLeague) window.toggleFavLeague(btn.dataset.favLeague);
});

// Sidebar — event delegation
document.getElementById('sidebar').addEventListener('click', e => {
  const sbFav = e.target.closest('.sb-fav-btn');
  if (sbFav) {
    e.stopPropagation();
    window.toggleFavLeague(sbFav.dataset.favLeague);
    return;
  }

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
      state.collapsedCountries.add(countryName);
    } else {
      state.collapsedCountries.delete(countryName);
    }
    saveCollapsed();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (state.searchQuery) {
      clearSearch();
    } else if (state.selectedLeague) {
      selectAll();
    }
  }
  if (e.key === '/' && document.activeElement !== document.getElementById('search')) {
    e.preventDefault();
    document.getElementById('search').focus();
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   INIT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

loadFavs();
loadCollapsed();
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
loadData();
