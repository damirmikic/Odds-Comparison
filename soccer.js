/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONFIG
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const API = 'https://www.merkurxtip.rs/restapi/offer/en/init';

const FLAGS = {
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Wales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Spain':'🇪🇸', 'Germany':'🇩🇪', 'Italy':'🇮🇹', 'France':'🇫🇷',
  'Portugal':'🇵🇹', 'Netherlands':'🇳🇱', 'Belgium':'🇧🇪', 'Turkey':'🇹🇷',
  'Russia':'🇷🇺', 'Brazil':'🇧🇷', 'Argentina':'🇦🇷', 'USA':'🇺🇸',
  'Mexico':'🇲🇽', 'Austria':'🇦🇹', 'Switzerland':'🇨🇭', 'Poland':'🇵🇱',
  'Czech Republic':'🇨🇿', 'Croatia':'🇭🇷', 'Serbia':'🇷🇸', 'Romania':'🇷🇴',
  'Ukraine':'🇺🇦', 'Greece':'🇬🇷', 'Denmark':'🇩🇰', 'Sweden':'🇸🇪',
  'Norway':'🇳🇴', 'Finland':'🇫🇮', 'Japan':'🇯🇵', 'South Korea':'🇰🇷',
  'China':'🇨🇳', 'Australia':'🇦🇺', 'International':'🌐', 'UEFA':'🇪🇺',
  'CAF':'🌍', 'Africa':'🌍', 'Asia':'🌏', 'South America':'🌎',
  'North America':'🌎', 'CONMEBOL':'🌎', 'Hungary':'🇭🇺', 'Slovakia':'🇸🇰',
  'Bulgaria':'🇧🇬', 'Israel':'🇮🇱', 'Slovenia':'🇸🇮', 'Bosnia':'🇧🇦',
  'Montenegro':'🇲🇪', 'Albania':'🇦🇱', 'Kosovo':'🇽🇰', 'Ireland':'🇮🇪',
  'Cyprus':'🇨🇾', 'Malta':'🇲🇹', 'Morocco':'🇲🇦', 'Egypt':'🇪🇬',
  'Nigeria':'🇳🇬', 'Ghana':'🇬🇭', 'Colombia':'🇨🇴', 'Chile':'🇨🇱',
  'Uruguay':'🇺🇾', 'Peru':'🇵🇪', 'Ecuador':'🇪🇨', 'Venezuela':'🇻🇪',
  'Paraguay':'🇵🇾', 'Bolivia':'🇧🇴', 'Saudi Arabia':'🇸🇦', 'UAE':'🇦🇪',
  'Iran':'🇮🇷', 'India':'🇮🇳', 'Belarus':'🇧🇾', 'Lithuania':'🇱🇹',
  'Latvia':'🇱🇻', 'Estonia':'🇪🇪', 'Georgia':'🇬🇪', 'Armenia':'🇦🇲',
  'Azerbaijan':'🇦🇿', 'Kazakhstan':'🇰🇿', 'Iceland':'🇮🇸', 'Luxembourg':'🇱🇺',
  'Andorra':'🇦🇩', 'Uganda':'🇺🇬', 'Cameroon':'🇨🇲', 'Senegal':'🇸🇳',
  'Tunisia':'🇹🇳', 'Algeria':'🇩🇿', 'South Africa':'🇿🇦', 'Kenya':'🇰🇪',
  'Tanzania':'🇹🇿', 'Zambia':'🇿🇲', 'Zimbabwe':'🇿🇼', 'Angola':'🇦🇴',
  'Mozambique':'🇲🇿', 'Congo':'🇨🇬', 'Ethiopia':'🇪🇹', 'Libya':'🇱🇾',
  'Sudan':'🇸🇩', 'Costa Rica':'🇨🇷', 'Honduras':'🇭🇳', 'Guatemala':'🇬🇹',
  'Panama':'🇵🇦', 'Other':'🏳',
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STATE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
let allMatches     = [];
let activeFilter   = 'all';   // 'all' | 'live' | 'upcoming'
let searchQuery    = '';
let selectedLeague = null;    // leagueName string | null

// Track which countries the user has collapsed
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
  const i = leagueName.indexOf(',');
  return i === -1 ? 'Other' : leagueName.slice(0, i).trim();
}

function parseLeagueName(leagueName) {
  const i = leagueName.indexOf(',');
  return i === -1 ? leagueName : leagueName.slice(i + 1).trim();
}

function getFlag(country) { return FLAGS[country] || '🏳'; }

function fmtTime(ts) {
  const d   = new Date(ts);
  const now = new Date();
  const tom = new Date(now); tom.setDate(now.getDate() + 1);
  const hh  = String(d.getHours()).padStart(2, '0');
  const mm  = String(d.getMinutes()).padStart(2, '0');
  const t   = `${hh}:${mm}`;
  if (d.toDateString() === now.toDateString()) return t;
  if (d.toDateString() === tom.toDateString()) return `TMW ${t}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${t}`;
}

function fmtOdd(v) {
  return (v == null) ? '—' : parseFloat(v).toFixed(2);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DATA PROCESSING
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function getFilteredMatches() {
  let ms = allMatches;

  // Tab filter
  if (activeFilter === 'live')     ms = ms.filter(m => m.live);
  if (activeFilter === 'upcoming') ms = ms.filter(m => !m.live);

  // Sidebar league filter
  if (selectedLeague) ms = ms.filter(m => m.leagueName === selectedLeague);

  // Search filter (applies on top of everything)
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

// Build sidebar hierarchy from ALL matches (not filtered, so sidebar is always complete)
function buildSidebarTree() {
  const countries = {};
  allMatches.forEach(m => {
    const c = parseCountry(m.leagueName);
    if (!countries[c]) countries[c] = { name: c, leagues: {}, total: 0, live: 0 };
    if (!countries[c].leagues[m.leagueName]) {
      countries[c].leagues[m.leagueName] = {
        fullName: m.leagueName,
        name:     parseLeagueName(m.leagueName),
        count:    0,
        live:     0,
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
    .sort((a, b) => b.total - a.total)
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

// Lightweight update: just toggle active classes, no full re-render
function updateSidebarActive() {
  document.querySelectorAll('.sb-all').forEach(el =>
    el.classList.toggle('active', selectedLeague === null)
  );
  document.querySelectorAll('.league-item').forEach(el =>
    el.classList.toggle('active', el.dataset.league === selectedLeague)
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RENDER — CONTENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderMatch(m) {
  const odds = m.odds || {};

  // 1X2 — parse raw float values for comparison
  const raw = {
    h: parseFloat(odds['1']),
    x: parseFloat(odds['2']),
    a: parseFloat(odds['3']),
  };
  const valid = Object.values(raw).filter(v => isFinite(v) && v > 0);
  const lo = valid.length ? Math.min(...valid) : null;
  const hi = valid.length ? Math.max(...valid) : null;

  function oddCls(key) {
    const v = raw[key];
    if (!isFinite(v) || v <= 0) return 'na';
    if (lo === hi)   return 'mid';
    if (v === lo)    return 'fav';
    if (v === hi)    return 'out';
    return 'mid';
  }

  // O/U 2.5 — ID 24 = Over 2.5, ID 22 = Under 2.5
  const rawOu = {
    ov: parseFloat(odds['24']),
    un: parseFloat(odds['22']),
  };
  const ouValid = Object.values(rawOu).filter(v => isFinite(v) && v > 0);
  const ouLo = ouValid.length ? Math.min(...ouValid) : null;
  const ouHi = ouValid.length ? Math.max(...ouValid) : null;

  function ouCls(key) {
    const v = rawOu[key];
    if (!isFinite(v) || v <= 0) return 'na';
    if (ouLo === ouHi) return 'mid';
    if (v === ouLo)    return 'fav';
    if (v === ouHi)    return 'out';
    return 'mid';
  }

  const o1  = fmtOdd(odds['1']);
  const oX  = fmtOdd(odds['2']);
  const o2  = fmtOdd(odds['3']);
  const oOv = fmtOdd(odds['24']);
  const oUn = fmtOdd(odds['22']);
  const isLive  = Boolean(m.live);
  const timeStr = isLive ? 'LIVE' : fmtTime(m.kickOffTime);
  const more    = m.oddsCount > 5 ? `+${m.oddsCount - 5}` : '';

  return `
    <div class="match-row${isLive ? ' is-live' : ''}">
      <div class="m-time${isLive ? ' live' : ''}">${esc(timeStr)}</div>
      <div class="m-teams">
        <div class="m-home" title="${esc(m.home)}">${esc(m.home)}</div>
        <div class="m-away" title="${esc(m.away)}">${esc(m.away)}</div>
      </div>
      <div class="m-odd ${oddCls('h')}" title="Home win">${o1}</div>
      <div class="m-odd ${oddCls('x')}" title="Draw">${oX}</div>
      <div class="m-odd ${oddCls('a')}" title="Away win">${o2}</div>
      <div class="m-line">2.5</div>
      <div class="m-odd ${ouCls('ov')}" title="Over 2.5 goals">${oOv}</div>
      <div class="m-odd ${ouCls('un')}" title="Under 2.5 goals">${oUn}</div>
      <div class="m-more">${esc(more)}</div>
    </div>`;
}

function renderLeagueBlock(g, idx) {
  const country = parseCountry(g.name);
  const lname   = parseLeagueName(g.name);
  const liveN   = g.ms.filter(m => m.live).length;
  const delay   = Math.min(idx * 16, 480);

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
        <div class="match-col-head">
          <span>Time</span>
          <span>Match</span>
          <span class="ch-1">1</span>
          <span class="ch-x">X</span>
          <span class="ch-2">2</span>
          <span class="ch-line">Line</span>
          <span class="ch-ov">Over</span>
          <span class="ch-un">Under</span>
          <span></span>
        </div>
        ${g.ms.map(renderMatch).join('')}
      </div>
    </div>`;
}

function renderContent() {
  const content = document.getElementById('content');
  const ms      = getFilteredMatches();
  const groups  = groupByLeague(ms);

  // Build breadcrumb title
  let crumb = 'All Matches';
  if (selectedLeague) {
    const country = parseCountry(selectedLeague);
    const lname   = parseLeagueName(selectedLeague);
    crumb = country !== 'Other'
      ? `${esc(country)}<em>›</em>${esc(lname)}`
      : esc(lname);
  }

  const countTxt = `${groups.length} league${groups.length !== 1 ? 's' : ''} · ${ms.length} match${ms.length !== 1 ? 'es' : ''}`;

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
  // Scroll content to top
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
  input.value  = '';
  searchQuery  = '';
  document.getElementById('searchClear').classList.remove('visible');
  renderContent();
  input.focus();
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
      <div class="loading-text">Fetching matches…</div>
    </div>`;

  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allMatches = (data.esMatches || []).filter(m => m.sport === 'S');

    // Header stats
    const liveN   = allMatches.filter(m => m.live).length;
    const leagueN = new Set(allMatches.map(m => m.leagueName)).size;
    document.getElementById('sLeagues').textContent = leagueN;
    document.getElementById('sMatches').textContent = allMatches.length;
    document.getElementById('sLive').textContent    = liveN;

    // Reset selection to avoid stale state after refresh
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

// Sidebar — event delegation (click league or toggle country)
document.getElementById('sidebar').addEventListener('click', e => {
  // "All matches" row
  const sbAll = e.target.closest('.sb-all');
  if (sbAll) { selectAll(); return; }

  // League item
  const leagueItem = e.target.closest('.league-item');
  if (leagueItem) {
    selectLeague(leagueItem.dataset.league);
    return;
  }

  // Country head — toggle collapse (but NOT the league items inside it)
  const countryHead = e.target.closest('.country-head');
  if (countryHead) {
    const block       = countryHead.closest('.country-block');
    const countryName = block.dataset.country;
    block.classList.toggle('collapsed');
    if (block.classList.contains('collapsed')) {
      collapsedCountries.add(countryName);
    } else {
      collapsedCountries.delete(countryName);
    }
  }
});

// Keyboard shortcut: Escape clears search or selection
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (searchQuery) {
      clearSearch();
    } else if (selectedLeague) {
      selectAll();
    }
  }
  // Focus search on "/"
  if (e.key === '/' && document.activeElement !== document.getElementById('search')) {
    e.preventDefault();
    document.getElementById('search').focus();
  }
});

// ── INIT ─────────────────────────────────────────────────────────────
loadData();
