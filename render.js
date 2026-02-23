/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RENDER — all DOM rendering functions
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { state } from './state.js';
import {
  esc, valid, extractOdds, fmtTime, fmtOdd, fmtTimeAgo,
  parseCountry, parseLeagueName, getFlag,
} from './utils.js';
import { BOOKIES } from './api/bookies.js';
import { getOddClass, getOddMovement } from './calculations.js';

/* ── Data processing helpers (used only by render) ──────────── */

export function getFilteredMatches() {
  let ms = state.allMatches;

  ms = ms.filter(m => m.kickOffTime > Date.now());

  if (state.viewMode !== 'compare' && state.activeFilter !== 'missing') {
    ms = ms.filter(m => m.bookmakers[state.viewMode] !== null);
  }

  if (state.activeFilter === 'missing') {
    ms = ms.filter(m =>
      m.bookmakers[state.missingSource] === null &&
      Object.values(m.bookmakers).some(b => b !== null)
    );
    ms.sort((a, b) => a.kickOffTime - b.kickOffTime);
  }
  if (state.activeFilter === 'value') {
    ms = ms.filter(m => m.valueBets && m.valueBets.length > 0)
      .sort((a, b) => b.valueBets[0].ev - a.valueBets[0].ev);
  }
  if (state.activeFilter === 'arbs') {
    ms = ms.filter(m => m.arb).sort((a, b) => b.arb.roi - a.arb.roi);
  }
  if (state.activeFilter === 'favs') {
    ms = ms.filter(m => {
      const key = `${m.home}|${m.away}|${m.leagueName}`;
      return state.favMatches.has(key) || state.favLeagues.has(m.leagueName);
    });
  }

  if (state.selectedLeague) ms = ms.filter(m => m.leagueName === state.selectedLeague);

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    ms = ms.filter(m =>
      m.leagueName.toLowerCase().includes(q) ||
      m.home.toLowerCase().includes(q) ||
      m.away.toLowerCase().includes(q)
    );
  }

  return ms;
}

export function groupByLeague(matches) {
  const map = {};
  matches.forEach(m => {
    if (!map[m.leagueName]) map[m.leagueName] = { name: m.leagueName, ms: [] };
    map[m.leagueName].ms.push(m);
  });
  return Object.values(map)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(g => ({ ...g, ms: [...g.ms].sort((a, b) => a.kickOffTime - b.kickOffTime) }));
}

export function buildSidebarTree() {
  const countries = {};
  state.allMatches.forEach(m => {
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
    if (m.kickOffTime <= Date.now()) {
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

/* ── Sidebar ────────────────────────────────────────────────── */

export function renderSidebar() {
  const tree = buildSidebarTree();
  const allActive = state.selectedLeague === null ? 'active' : '';

  let html = `
    <div class="sb-all ${allActive}" data-action="all">
      <span class="sb-all-label">All Matches</span>
      <span class="sb-badge">${state.allMatches.length}</span>
    </div>`;

  tree.forEach(country => {
    const collapsed = state.collapsedCountries.has(country.name) ? 'collapsed' : '';
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
          ${[...country.leagues]
      .sort((a, b) => {
        const af = state.favLeagues.has(a.fullName) ? 0 : 1;
        const bf = state.favLeagues.has(b.fullName) ? 0 : 1;
        return af !== bf ? af - bf : b.count - a.count;
      })
      .map(lg => {
        const isActive = state.selectedLeague === lg.fullName ? 'active' : '';
        const isFav = state.favLeagues.has(lg.fullName);
        return `
              <div class="league-item ${isActive}${isFav ? ' fav-league' : ''}" data-league="${esc(lg.fullName)}">
                ${lg.live ? `<span class="league-live-dot"></span>` : ''}
                <span class="league-item-name" title="${esc(lg.name)}">${esc(lg.name)}</span>
                <span class="league-item-count">${lg.count}</span>
                <button class="sb-fav-btn${isFav ? ' fav-on' : ''}" data-fav-league="${esc(lg.fullName)}" title="${isFav ? 'Unfavorite' : 'Favorite'}">★</button>
              </div>`;
      }).join('')}
        </div>
      </div>`;
  });

  document.getElementById('sidebar').innerHTML = html;
}

export function updateSidebarActive() {
  document.querySelectorAll('.sb-all').forEach(el =>
    el.classList.toggle('active', state.selectedLeague === null)
  );
  document.querySelectorAll('.league-item').forEach(el =>
    el.classList.toggle('active', el.dataset.league === state.selectedLeague)
  );
}

/* ── Sparklines ─────────────────────────────────────────────── */

export function renderSparkline(matchKey, bkKey) {
  const hist = state.oddsHistory.get(`${matchKey}|${bkKey}`);
  if (!hist) return '';
  const series = [
    { vals: hist.h, color: '#4ADE80' },
    { vals: hist.x, color: '#94A3B8' },
    { vals: hist.a, color: '#F87171' },
  ].filter(s => s.vals.length >= 2);
  if (series.length === 0) return '';

  const W = 60, H = 12;
  function poly(vals, color) {
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const span = hi - lo || 1;
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * W;
      const y = H - 1 - ((v - lo) / span) * (H - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
  }

  const polys = series.map(s => poly(s.vals, s.color)).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">${polys}</svg>`;
}

/* ── Bookmaker row (compare mode) ───────────────────────────── */

export function renderBkRow(bkLabel, bkCls, myOdds, allOddsArr, valueBets, bkKey, matchKey) {
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
      <div class="bk-spark-cell">${renderSparkline(matchKey, bkKey)}</div>
    </div>`;
}

/* ── Match rows ─────────────────────────────────────────────── */

export function renderMatch(m) {
  const isLive = m.kickOffTime <= Date.now();
  const timeStr = isLive ? 'LIVE' : fmtTime(m.kickOffTime);

  if (state.viewMode === 'compare' || state.activeFilter === 'missing') {
    return renderMatchCompare(m, isLive, timeStr);
  } else {
    return renderMatchSingle(m, m.bookmakers[state.viewMode], isLive, timeStr);
  }
}

export function renderMatchCompare(m, isLive, timeStr) {
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

  let fairRow = '';
  const cbFairOdds = m.bookmakers.cloudbet?.fairOdds;
  if (cbFairOdds) {
    const fmt = k => (cbFairOdds[k] > 0) ? cbFairOdds[k].toFixed(2) : '—';
    fairRow = `
    <div class="bk-row bk-row-fair">
      <div class="bk-label">FAIR</div>
      <div class="m-odd cmp-odd fair-odd" title="Fair Home">${fmt('1')}</div>
      <div class="m-odd cmp-odd fair-odd" title="Fair Draw">${fmt('2')}</div>
      <div class="m-odd cmp-odd fair-odd" title="Fair Away">${fmt('3')}</div>
      <div class="m-line">2.5</div>
      <div class="m-odd cmp-odd fair-odd" title="Fair Over 2.5">${fmt('24')}</div>
      <div class="m-odd cmp-odd fair-odd" title="Fair Under 2.5">${fmt('22')}</div>
    </div>`;
  }

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
        <button class="fav-btn${state.favMatches.has(matchKey) ? ' fav-on' : ''}" data-fav-match="${esc(matchKey)}" title="${state.favMatches.has(matchKey) ? 'Remove from favorites' : 'Add to favorites'}">★</button>
      </div>
      <div class="mg-rows">${rows}${fairRow}</div>
    </div>`;
}

export function renderMatchSingle(m, src, isLive, timeStr) {
  const matchKey = `${m.home}|${m.away}|${m.leagueName}`;
  const bkKey = state.viewMode;
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
      <button class="fav-btn${state.favMatches.has(matchKey) ? ' fav-on' : ''}" data-fav-match="${esc(matchKey)}" title="${state.favMatches.has(matchKey) ? 'Remove from favorites' : 'Add to favorites'}">★</button>
    </div>`;
}

/* ── League blocks ──────────────────────────────────────────── */

export function renderLeagueBlock(g, idx) {
  const country = parseCountry(g.name);
  const lname = parseLeagueName(g.name);
  const liveN = g.ms.filter(m => m.live).length;
  const delay = Math.min(idx * 16, 480);

  const isCompare = state.viewMode === 'compare';
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
        <button class="fav-btn league-fav-btn${state.favLeagues.has(g.name) ? ' fav-on' : ''}" data-fav-league="${esc(g.name)}" title="${state.favLeagues.has(g.name) ? 'Unfavorite league' : 'Favorite league'}">★</button>
        <span class="lb-chevron">▾</span>
      </div>
      <div class="lb-matches">
        ${colHead}
        ${g.ms.map(renderMatch).join('')}
      </div>
    </div>`;
}

/* ── Ranked list (Value / Arbs tabs) ────────────────────────── */

export function renderRankedList(ms) {
  const isValue = state.activeFilter === 'value';
  const isCompare = state.viewMode === 'compare';

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
    const isLive = m.kickOffTime <= Date.now();
    const timeStr = isLive ? 'LIVE' : fmtTime(m.kickOffTime);
    const matchHtml = isCompare
      ? renderMatchCompare(m, isLive, timeStr)
      : renderMatchSingle(m, m.bookmakers[state.viewMode], isLive, timeStr);

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

/* ── Drops tab ──────────────────────────────────────────────── */

export function renderDropsTab() {
  if (!state.dropsData.length) {
    return `<div class="state-center"><span class="empty-text">No drops detected yet — monitoring…</span></div>`;
  }

  const filtered = state.dropsSearchQuery
    ? state.dropsData.filter(r =>
        (r.home   || '').toLowerCase().includes(state.dropsSearchQuery) ||
        (r.away   || '').toLowerCase().includes(state.dropsSearchQuery) ||
        (r.league || '').toLowerCase().includes(state.dropsSearchQuery)
      )
    : state.dropsData;

  if (!filtered.length) {
    return `<div class="state-center"><span class="empty-text">No drops match "${esc(state.dropsSearchQuery)}"</span></div>`;
  }

  const severityLabel = { weak: 'Steam', strong: 'Sharp', extreme: 'Alert' };
  const outcomeLabel  = { h: 'Home', x: 'Draw', a: 'Away', ov: 'Over 2.5', un: 'Under 2.5' };
  const bkLabel       = { merkur: 'MRK', maxbet: 'MAX', soccerbet: 'SBT', cloudbet: 'CLB' };

  const rows = filtered.map((r, i) => {
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

/* ── Main content renderer ──────────────────────────────────── */

export function renderContent() {
  const content = document.getElementById('content');
  const ms = getFilteredMatches();
  const isRanked = state.activeFilter === 'value' || state.activeFilter === 'arbs';

  let crumb = 'All Matches';
  if (state.activeFilter === 'favs') crumb = '★ Favorites';
  else if (state.selectedLeague) {
    const country = parseCountry(state.selectedLeague);
    const lname = parseLeagueName(state.selectedLeague);
    crumb = country !== 'Other'
      ? `${esc(country)}<em>›</em>${esc(lname)}`
      : esc(lname);
  }

  const cdSecs = state.autoRefreshSeconds > 0 ? state.autoRefreshSeconds : 60;
  const cdUrgent = state.autoRefreshSeconds <= 10 && state.autoRefreshSeconds > 0 ? ' urgent' : '';
  const cdHtml = `<span id="autoRefreshCountdown" class="content-countdown${cdUrgent}" title="Next auto-refresh">↺ ${cdSecs}s</span>`;

  if (state.activeFilter === 'missing') {
    const bkLabelStr = BOOKIES.find(b => b.key === state.missingSource)?.label ?? state.missingSource;
    const srcBtns = BOOKIES.map(bk => `
      <button class="msrc-btn${state.missingSource === bk.key ? ' active' : ''}"
        onclick="setMissingSource('${bk.key}')"
        title="${bk.key}"><span class="bk-dot bk-dot-${bk.cls}"></span>${bk.label}</button>`).join('');
    const cntHtml = ms.length ? `<span class="content-count">${ms.length}</span>` : '';
    if (!ms.length) {
      content.innerHTML = `
        <div class="content-bar">
          <span class="content-crumb">Missing from <span class="missing-bk-name">${bkLabelStr}</span> ${cntHtml}</span>
          <div class="missing-source-btns">${srcBtns}</div>
          ${cdHtml}
        </div>
        <div class="state-center"><span class="empty-text">No missing matches found</span></div>`;
      return;
    }
    const groups = groupByLeague(ms);
    content.innerHTML = `
      <div class="content-bar">
        <span class="content-crumb">Missing from <span class="missing-bk-name">${bkLabelStr}</span> ${cntHtml}</span>
        <div class="missing-source-btns">${srcBtns}</div>
        ${cdHtml}
      </div>
      ${groups.map((g, i) => renderLeagueBlock(g, i)).join('')}`;
    triggerOddFlash(content);
    return;
  }

  if (state.activeFilter === 'drops') {
    const dropsCntHtml = state.dropsSearchQuery
      ? `<span class="content-count">${state.dropsData.filter(r =>
          (r.home   || '').toLowerCase().includes(state.dropsSearchQuery) ||
          (r.away   || '').toLowerCase().includes(state.dropsSearchQuery) ||
          (r.league || '').toLowerCase().includes(state.dropsSearchQuery)
        ).length} of ${state.dropsData.length}</span>`
      : state.dropsData.length ? `<span class="content-count">${state.dropsData.length}</span>` : '';
    content.innerHTML = `
      <div class="content-bar">
        <span class="content-crumb">Dropping Odds ${dropsCntHtml}</span>
        <div class="content-tab-search">
          <span class="cts-icon">⌕</span>
          <input class="drops-search-input cts-input" type="text"
            placeholder="Filter team or league…"
            oninput="setDropsSearch(this.value)"
            value="${esc(state.dropsSearchQuery)}"
            autocomplete="off" spellcheck="false" />
          ${state.dropsSearchQuery ? `<button class="cts-clear" onclick="setDropsSearch('')" title="Clear">✕</button>` : ''}
        </div>
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
        <span class="empty-text">${state.activeFilter === 'favs'
          ? 'No favorites yet — star a match ★ or league ★'
          : 'No matches found'}</span>
      </div>`;
    return;
  }

  if (isRanked) {
    const rankedLabel = state.activeFilter === 'value'
      ? `${ms.length} Value Bet${ms.length !== 1 ? 's' : ''}`
      : `${ms.length} Arb Opportunit${ms.length !== 1 ? 'ies' : 'y'}`;
    content.innerHTML = `
      <div class="content-bar">
        <span class="content-crumb">${rankedLabel}</span>
        <div class="content-tab-search">
          <span class="cts-icon">⌕</span>
          <input class="ranked-search-input cts-input" type="text"
            placeholder="Filter team or league…"
            oninput="setRankedSearch(this.value)"
            value="${esc(state.searchQuery)}"
            autocomplete="off" spellcheck="false" />
          ${state.searchQuery ? `<button class="cts-clear" onclick="setRankedSearch('')" title="Clear">✕</button>` : ''}
        </div>
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

export function triggerOddFlash(container) {
  if (!state.pendingFlash) return;
  state.pendingFlash = false;
  requestAnimationFrame(() => {
    container.querySelectorAll('[data-moved]').forEach(el => {
      el.classList.add('odd-flash');
      el.addEventListener('animationend', () => el.classList.remove('odd-flash'), { once: true });
    });
  });
}
