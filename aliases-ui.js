/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ALIAS MANAGER — UI LOGIC (Supabase Edition)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const APIS = {
    merkur: 'https://www.merkurxtip.rs/restapi/offer/en/init',
    maxbet: 'https://www.maxbet.rs/restapi/offer/en/init',
    soccerbet: 'https://www.soccerbet.rs/restapi/offer/en/init',
};

const CLOUDBET_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IkhKcDkyNnF3ZXBjNnF3LU9rMk4zV05pXzBrRFd6cEdwTzAxNlRJUjdRWDAiLCJ0eXAiOiJKV1QifQ.eyJhY2Nlc3NfdGllciI6InRyYWRpbmciLCJleHAiOjIwNjE1Mzc1MDIsImlhdCI6MTc0NjE3NzUwMiwianRpIjoiNTU1ODk0NjgtZjJhZi00ZGQ3LWE3MTQtZjNiNjgyMWU4OGRkIiwic3ViIjoiOGYwYTk5YTEtNTFhZi00YzJlLWFlNDUtY2MxNjgwNDVjZTc3IiwidGVuYW50IjoiY2xvdWRiZXQiLCJ1dWlkIjoiOGYwYTk5YTEtNTFhZi00YzJlLWFlNDUtY2MxNjgwNDVjZTc3In0.BW_nXSwTkxTI7C-1UzgxWLnNzo9Bo1Ed8hI9RfVLnrJa6sfsMyvQ1NrtT5t6i_emwhkRHU1hY-9i6c2c5AI4fc2mRLSNBujvrfbVHX67uB58E8TeSOZUBRi0eqfLBL7sYl1JNPZzhFkDBCBNFJZJpn40FIjIrtIiPd-G5ClaaSMRWrFUDiwA1NmyxHSfkfRpeRSnfk15qck7zSIeNeITzPbD7kZGDIeStmcHuiHfcQX3NaHaI0gyw60wmDgan83NpYQYRVLQ9C4icbNhel4n5H5FGFAxQS8IcvynqV8f-vz2t4BRGuYXBU8uhdYKgezhyQrSvX6NpwNPBJC8CWo2fA';

function getCloudbetUrl() {
    const now = Math.floor(Date.now() / 1000);
    const to  = now + 7 * 24 * 3600;
    return `https://sports-api.cloudbet.com/pub/v2/odds/events?sport=soccer&live=false&from=${now}&to=${to}&markets=soccer.match_odds&markets=soccer.total_goals&players=false&limit=2000`;
}

// Country names mirrored from soccer.js FLAGS — used to resolve Cloudbet comp.key
// into "Country: League Name" format (e.g. "soccer-england-premier-league" → "England: Premier League").
const _CLB_COUNTRY_SLUGS = [
    'England', 'Scotland', 'Wales', 'Spain', 'Germany', 'Italy', 'France',
    'Portugal', 'Netherlands', 'Belgium', 'Turkey', 'Russia', 'Brazil',
    'Argentina', 'USA', 'Mexico', 'Austria', 'Switzerland', 'Poland',
    'Czech Republic', 'Croatia', 'Serbia', 'Romania', 'Ukraine', 'Greece',
    'Denmark', 'Sweden', 'Norway', 'Finland', 'Japan', 'South Korea',
    'China', 'Australia', 'International', 'UEFA', 'CAF', 'Africa', 'Asia',
    'South America', 'North America', 'CONMEBOL', 'Hungary', 'Slovakia',
    'Bulgaria', 'Israel', 'Slovenia', 'Bosnia', 'Montenegro', 'Albania',
    'Kosovo', 'Ireland', 'Cyprus', 'Malta', 'Morocco', 'Egypt', 'Nigeria',
    'Ghana', 'Colombia', 'Chile', 'Uruguay', 'Peru', 'Ecuador', 'Venezuela',
    'Paraguay', 'Bolivia', 'Saudi Arabia', 'UAE', 'Iran', 'India', 'Belarus',
    'Lithuania', 'Latvia', 'Estonia', 'Georgia', 'Armenia', 'Azerbaijan',
    'Kazakhstan', 'Iceland', 'Luxembourg', 'Andorra', 'Uganda', 'Cameroon',
    'Senegal', 'Tunisia', 'Algeria', 'South Africa', 'Kenya', 'Tanzania',
    'Zambia', 'Zimbabwe', 'Angola', 'Mozambique', 'Congo', 'Ethiopia',
    'Libya', 'Sudan', 'Costa Rica', 'Honduras', 'Guatemala', 'Panama',
    'El Salvador', 'Nicaragua',
].map(n => [n.toLowerCase().replace(/\s+/g, '-'), n])
 .sort((a, b) => b[0].length - a[0].length); // longest slug first

function resolveCloudbetLeagueName(comp) {
    const rest = (comp.key || '').replace(/^soccer-/, '');
    for (const [slug, country] of _CLB_COUNTRY_SLUGS) {
        if (rest === slug || rest.startsWith(slug + '-')) {
            return `${country}: ${comp.name}`;
        }
    }
    return comp.name;
}

function parseCloudbetRaw(data) {
    const matches = [];
    for (const comp of (data.competitions || [])) {
        const leagueName = resolveCloudbetLeagueName(comp);
        for (const ev of (comp.events || [])) {
            if (ev.type !== 'EVENT_TYPE_EVENT') continue;
            if (!['TRADING', 'TRADING_LIVE'].includes(ev.status)) continue;
            matches.push({ home: ev.home.name, away: ev.away.name, leagueName });
        }
    }
    return matches;
}

/* ── State ─────────────────────────────────────────────────── */
let unmatchedMrk = [];
let unmatchedMbx = [];
let allMrkItems = [];
let allOtherItems = [];
let cachedSuggestions = [];
let leagueMode = false;
let browseAll = false;
let pickerSource = 'mrk'; // 'mrk' | 'max' | 'sbt'
let pickerTarget = 'max'; // 'max' | 'sbt' | 'clb'
let selMrk = null;
let selMbx = null;
let filterQuery = '';
let teamSearchQuery = '';
let leagueSearchQuery = '';

/* ── Bookie metadata ───────────────────────────────────────── */
const BK_META = {
    mrk: { dotCls: 'am-bk-m',  label: 'MerkurXtip', api: () => fetch(APIS.merkur) },
    max: { dotCls: 'am-bk-b',  label: 'MaxBet',      api: () => fetch(APIS.maxbet) },
    sbt: { dotCls: 'am-bk-s',  label: 'SoccerBet',   api: () => fetch(APIS.soccerbet) },
    clb: { dotCls: 'am-bk-cl', label: 'Cloudbet',    api: () => fetch(getCloudbetUrl(), { headers: { 'X-API-Key': CLOUDBET_KEY } }) },
};

function parseForBookie(key, data) {
    if (key === 'clb') return parseCloudbetRaw(data);
    const matches = (data.esMatches || []).filter(m => m.sport === 'S');
    if (key === 'sbt') return matches.filter(m => !isSbtOutright(m));
    if (key === 'max') return matches.filter(m => !isMaxbetBonus(m));
    return matches; // mrk
}

// Supabase is real-time, so we don't need the unsaved changes logic anymore.
// However, we'll keep the import/clear-all buttons.

/* ── Toast ─────────────────────────────────────────────────── */
let toastTimer;
function toast(msg, type = 'ok') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `am-toast show am-toast-${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

/* ── Tab switching ─────────────────────────────────────────── */
document.querySelectorAll('.am-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.am-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.am-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`panel${capitalize(btn.dataset.tab)}`).classList.add('active');
    });
});

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ── Tab search inputs ─────────────────────────────────────── */
document.getElementById('teamSearch').addEventListener('input', e => {
    teamSearchQuery = e.target.value.toLowerCase();
    renderTeamList();
    renderSbtTeamList();
    renderClbTeamList();
    renderMbxSbtTeamList();
    renderMbxClbTeamList();
    renderSbtClbTeamList();
});
document.getElementById('leagueSearch').addEventListener('input', e => {
    leagueSearchQuery = e.target.value.toLowerCase();
    renderLeagueList();
    renderSbtLeagueList();
    renderClbLeagueList();
    renderMbxSbtLeagueList();
    renderMbxClbLeagueList();
    renderSbtClbLeagueList();
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TEAMS TAB
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderTeamList() {
    const all = getTeamAliases();
    document.getElementById('tabTeamCount').textContent = all.length;
    const q = teamSearchQuery;
    const aliases = q ? all.filter(a =>
        a.merkur.toLowerCase().includes(q) || a.maxbet.toLowerCase().includes(q)
    ) : all;
    updateTeamSearchCount();
    const list = document.getElementById('listTeams');

    if (!all.length) {
        list.innerHTML = `<div class="am-empty">No team aliases in Supabase yet.</div>`;
        return;
    }
    if (!aliases.length) {
        list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`;
        return;
    }

    list.innerHTML = aliases.map((a) => `
    <div class="am-alias-row">
      <div class="am-alias-mrk">
        <span class="am-bk-pill am-bk-m">MRK</span>
        <span class="am-alias-name">${esc(a.merkur)}</span>
      </div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx">
        <span class="am-bk-pill am-bk-b">MAX</span>
        <span class="am-alias-name">${esc(a.maxbet)}</span>
      </div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-mrk="${esc(a.merkur)}" data-mbx="${esc(a.maxbet)}" title="Delete">✕</button>
    </div>`).join('');
}

function updateTeamSearchCount() {
    const el = document.getElementById('teamSearchCount');
    if (!el) return;
    const q = teamSearchQuery;
    const maxAll    = getTeamAliases();
    const sbtAll    = getSoccerbetTeamAliases();
    const clbAll    = getCloudbetTeamAliases();
    const mbxSbtAll = getMaxbetSbtTeamAliases();
    const mbxClbAll = getMaxbetClbTeamAliases();
    const sbtClbAll = getSbtClbTeamAliases();
    const total = maxAll.length + sbtAll.length + clbAll.length + mbxSbtAll.length + mbxClbAll.length + sbtClbAll.length;
    if (!q) { el.textContent = total ? `${total} total` : ''; return; }
    const shown = maxAll.filter(a => a.merkur.toLowerCase().includes(q) || a.maxbet.toLowerCase().includes(q)).length
                + sbtAll.filter(a => a.merkur.toLowerCase().includes(q) || a.soccerbet.toLowerCase().includes(q)).length
                + clbAll.filter(a => a.merkur.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)).length
                + mbxSbtAll.filter(a => a.maxbet.toLowerCase().includes(q) || a.soccerbet.toLowerCase().includes(q)).length
                + mbxClbAll.filter(a => a.maxbet.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)).length
                + sbtClbAll.filter(a => a.soccerbet.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)).length;
    el.textContent = `${shown} / ${total}`;
}

document.getElementById('btnAddTeam').addEventListener('click', async () => {
    const mrk = document.getElementById('inTeamMrk').value.trim();
    const mbx = document.getElementById('inTeamMbx').value.trim();
    if (!mrk || !mbx) { toast('Both fields are required', 'err'); return; }

    try {
        await addTeamAlias(mrk, mbx);
        document.getElementById('inTeamMrk').value = '';
        document.getElementById('inTeamMbx').value = '';
        renderTeamList();
        toast(`Synced to Supabase: "${mrk}" → "${mbx}"`);
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

document.getElementById('listTeams').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeTeamAlias(btn.dataset.mrk, btn.dataset.mbx);
        renderTeamList();
        toast('Removed from Supabase', 'warn');
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LEAGUES TAB
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderLeagueList() {
    const all = getLeagueAliases();
    document.getElementById('tabLeagueCount').textContent = all.length;
    const q = leagueSearchQuery;
    const aliases = q ? all.filter(a =>
        a.merkur.toLowerCase().includes(q) || a.maxbet.toLowerCase().includes(q)
    ) : all;
    updateLeagueSearchCount();
    const list = document.getElementById('listLeagues');

    if (!all.length) {
        list.innerHTML = `<div class="am-empty">No league aliases in Supabase yet.</div>`;
        return;
    }
    if (!aliases.length) {
        list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`;
        return;
    }

    list.innerHTML = aliases.map((a) => `
    <div class="am-alias-row">
      <div class="am-alias-mrk">
        <span class="am-bk-pill am-bk-m">MRK</span>
        <span class="am-alias-name">${esc(a.merkur)}</span>
      </div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx">
        <span class="am-bk-pill am-bk-b">MAX</span>
        <span class="am-alias-name">${esc(a.maxbet)}</span>
      </div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-mrk="${esc(a.merkur)}" data-mbx="${esc(a.maxbet)}" title="Delete">✕</button>
    </div>`).join('');
}

function updateLeagueSearchCount() {
    const el = document.getElementById('leagueSearchCount');
    if (!el) return;
    const q = leagueSearchQuery;
    const maxAll    = getLeagueAliases();
    const sbtAll    = getSoccerbetLeagueAliases();
    const clbAll    = getCloudbetLeagueAliases();
    const mbxSbtAll = getMaxbetSbtLeagueAliases();
    const mbxClbAll = getMaxbetClbLeagueAliases();
    const sbtClbAll = getSbtClbLeagueAliases();
    const total = maxAll.length + sbtAll.length + clbAll.length + mbxSbtAll.length + mbxClbAll.length + sbtClbAll.length;
    if (!q) { el.textContent = total ? `${total} total` : ''; return; }
    const shown = maxAll.filter(a => a.merkur.toLowerCase().includes(q) || a.maxbet.toLowerCase().includes(q)).length
                + sbtAll.filter(a => a.merkur.toLowerCase().includes(q) || a.soccerbet.toLowerCase().includes(q)).length
                + clbAll.filter(a => a.merkur.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)).length
                + mbxSbtAll.filter(a => a.maxbet.toLowerCase().includes(q) || a.soccerbet.toLowerCase().includes(q)).length
                + mbxClbAll.filter(a => a.maxbet.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)).length
                + sbtClbAll.filter(a => a.soccerbet.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)).length;
    el.textContent = `${shown} / ${total}`;
}

document.getElementById('btnAddLeague').addEventListener('click', async () => {
    const mrk = document.getElementById('inLeagueMrk').value.trim();
    const mbx = document.getElementById('inLeagueMbx').value.trim();
    if (!mrk || !mbx) { toast('Both fields are required', 'err'); return; }

    try {
        await addLeagueAlias(mrk, mbx);
        document.getElementById('inLeagueMrk').value = '';
        document.getElementById('inLeagueMbx').value = '';
        renderLeagueList();
        toast(`Synced to Supabase: "${mrk}" → "${mbx}"`);
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

document.getElementById('listLeagues').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeLeagueAlias(btn.dataset.mrk, btn.dataset.mbx);
        renderLeagueList();
        toast('Removed from Supabase', 'warn');
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SOCCERBET TEAM ALIASES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderSbtTeamList() {
    const all = getSoccerbetTeamAliases();
    const q = teamSearchQuery;
    const aliases = q ? all.filter(a =>
        a.merkur.toLowerCase().includes(q) || a.soccerbet.toLowerCase().includes(q)
    ) : all;
    updateTeamSearchCount();
    const list = document.getElementById('listSbtTeams');

    if (!all.length) {
        list.innerHTML = `<div class="am-empty">No SoccerBet team aliases yet.</div>`;
        return;
    }
    if (!aliases.length) {
        list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`;
        return;
    }

    list.innerHTML = aliases.map((a) => `
    <div class="am-alias-row">
      <div class="am-alias-mrk">
        <span class="am-bk-pill am-bk-m">MRK</span>
        <span class="am-alias-name">${esc(a.merkur)}</span>
      </div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx">
        <span class="am-bk-pill am-bk-s">SBT</span>
        <span class="am-alias-name">${esc(a.soccerbet)}</span>
      </div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-mrk="${esc(a.merkur)}" data-sbt="${esc(a.soccerbet)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddSbtTeam').addEventListener('click', async () => {
    const mrk = document.getElementById('inSbtTeamMrk').value.trim();
    const sbt = document.getElementById('inSbtTeamSbt').value.trim();
    if (!mrk || !sbt) { toast('Both fields are required', 'err'); return; }

    try {
        await addSoccerbetTeamAlias(mrk, sbt);
        document.getElementById('inSbtTeamMrk').value = '';
        document.getElementById('inSbtTeamSbt').value = '';
        renderSbtTeamList();
        toast(`Synced: "${mrk}" → "${sbt}"`);
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

document.getElementById('listSbtTeams').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeSoccerbetTeamAlias(btn.dataset.mrk, btn.dataset.sbt);
        renderSbtTeamList();
        toast('Removed from Supabase', 'warn');
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SOCCERBET LEAGUE ALIASES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderSbtLeagueList() {
    const all = getSoccerbetLeagueAliases();
    const q = leagueSearchQuery;
    const aliases = q ? all.filter(a =>
        a.merkur.toLowerCase().includes(q) || a.soccerbet.toLowerCase().includes(q)
    ) : all;
    updateLeagueSearchCount();
    const list = document.getElementById('listSbtLeagues');

    if (!all.length) {
        list.innerHTML = `<div class="am-empty">No SoccerBet league aliases yet.</div>`;
        return;
    }
    if (!aliases.length) {
        list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`;
        return;
    }

    list.innerHTML = aliases.map((a) => `
    <div class="am-alias-row">
      <div class="am-alias-mrk">
        <span class="am-bk-pill am-bk-m">MRK</span>
        <span class="am-alias-name">${esc(a.merkur)}</span>
      </div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx">
        <span class="am-bk-pill am-bk-s">SBT</span>
        <span class="am-alias-name">${esc(a.soccerbet)}</span>
      </div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-mrk="${esc(a.merkur)}" data-sbt="${esc(a.soccerbet)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddSbtLeague').addEventListener('click', async () => {
    const mrk = document.getElementById('inSbtLeagueMrk').value.trim();
    const sbt = document.getElementById('inSbtLeagueSbt').value.trim();
    if (!mrk || !sbt) { toast('Both fields are required', 'err'); return; }

    try {
        await addSoccerbetLeagueAlias(mrk, sbt);
        document.getElementById('inSbtLeagueMrk').value = '';
        document.getElementById('inSbtLeagueSbt').value = '';
        renderSbtLeagueList();
        toast(`Synced: "${mrk}" → "${sbt}"`);
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

document.getElementById('listSbtLeagues').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeSoccerbetLeagueAlias(btn.dataset.mrk, btn.dataset.sbt);
        renderSbtLeagueList();
        toast('Removed from Supabase', 'warn');
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CLOUDBET TEAM ALIASES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderClbTeamList() {
    const all = getCloudbetTeamAliases();
    const q = teamSearchQuery;
    const aliases = q ? all.filter(a =>
        a.merkur.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)
    ) : all;
    updateTeamSearchCount();
    const list = document.getElementById('listClbTeams');

    if (!all.length) {
        list.innerHTML = `<div class="am-empty">No Cloudbet team aliases yet.</div>`;
        return;
    }
    if (!aliases.length) {
        list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`;
        return;
    }

    list.innerHTML = aliases.map((a) => `
    <div class="am-alias-row">
      <div class="am-alias-mrk">
        <span class="am-bk-pill am-bk-m">MRK</span>
        <span class="am-alias-name">${esc(a.merkur)}</span>
      </div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx">
        <span class="am-bk-pill am-bk-cl">CLB</span>
        <span class="am-alias-name">${esc(a.cloudbet)}</span>
      </div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-mrk="${esc(a.merkur)}" data-clb="${esc(a.cloudbet)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddClbTeam').addEventListener('click', async () => {
    const mrk = document.getElementById('inClbTeamMrk').value.trim();
    const clb = document.getElementById('inClbTeamClb').value.trim();
    if (!mrk || !clb) { toast('Both fields are required', 'err'); return; }

    try {
        await addCloudbetTeamAlias(mrk, clb);
        document.getElementById('inClbTeamMrk').value = '';
        document.getElementById('inClbTeamClb').value = '';
        renderClbTeamList();
        toast(`Synced: "${mrk}" → "${clb}"`);
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

document.getElementById('listClbTeams').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeCloudbetTeamAlias(btn.dataset.mrk, btn.dataset.clb);
        renderClbTeamList();
        toast('Removed from Supabase', 'warn');
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CLOUDBET LEAGUE ALIASES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderClbLeagueList() {
    const all = getCloudbetLeagueAliases();
    const q = leagueSearchQuery;
    const aliases = q ? all.filter(a =>
        a.merkur.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)
    ) : all;
    updateLeagueSearchCount();
    const list = document.getElementById('listClbLeagues');

    if (!all.length) {
        list.innerHTML = `<div class="am-empty">No Cloudbet league aliases yet.</div>`;
        return;
    }
    if (!aliases.length) {
        list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`;
        return;
    }

    list.innerHTML = aliases.map((a) => `
    <div class="am-alias-row">
      <div class="am-alias-mrk">
        <span class="am-bk-pill am-bk-m">MRK</span>
        <span class="am-alias-name">${esc(a.merkur)}</span>
      </div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx">
        <span class="am-bk-pill am-bk-cl">CLB</span>
        <span class="am-alias-name">${esc(a.cloudbet)}</span>
      </div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-mrk="${esc(a.merkur)}" data-clb="${esc(a.cloudbet)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddClbLeague').addEventListener('click', async () => {
    const mrk = document.getElementById('inClbLeagueMrk').value.trim();
    const clb = document.getElementById('inClbLeagueClb').value.trim();
    if (!mrk || !clb) { toast('Both fields are required', 'err'); return; }

    try {
        await addCloudbetLeagueAlias(mrk, clb);
        document.getElementById('inClbLeagueMrk').value = '';
        document.getElementById('inClbLeagueClb').value = '';
        renderClbLeagueList();
        toast(`Synced: "${mrk}" → "${clb}"`);
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

document.getElementById('listClbLeagues').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeCloudbetLeagueAlias(btn.dataset.mrk, btn.dataset.clb);
        renderClbLeagueList();
        toast('Removed from Supabase', 'warn');
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CROSS-BOOKIE ALIAS SECTIONS (MAX↔SBT, MAX↔CLB, SBT↔CLB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function renderMbxSbtTeamList() {
    const all = getMaxbetSbtTeamAliases();
    const q = teamSearchQuery;
    const aliases = q ? all.filter(a => a.maxbet.toLowerCase().includes(q) || a.soccerbet.toLowerCase().includes(q)) : all;
    updateTeamSearchCount();
    const list = document.getElementById('listMbxSbtTeams');
    if (!all.length) { list.innerHTML = `<div class="am-empty">No MaxBet↔SoccerBet team aliases yet.</div>`; return; }
    if (!aliases.length) { list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`; return; }
    list.innerHTML = aliases.map(a => `
    <div class="am-alias-row">
      <div class="am-alias-mrk"><span class="am-bk-pill am-bk-b">MAX</span><span class="am-alias-name">${esc(a.maxbet)}</span></div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx"><span class="am-bk-pill am-bk-s">SBT</span><span class="am-alias-name">${esc(a.soccerbet)}</span></div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-max="${esc(a.maxbet)}" data-sbt="${esc(a.soccerbet)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddMbxSbtTeam').addEventListener('click', async () => {
    const max = document.getElementById('inMbxSbtTeamMax').value.trim();
    const sbt = document.getElementById('inMbxSbtTeamSbt').value.trim();
    if (!max || !sbt) { toast('Both fields are required', 'err'); return; }
    try {
        await addMaxbetSbtTeamAlias(max, sbt);
        document.getElementById('inMbxSbtTeamMax').value = '';
        document.getElementById('inMbxSbtTeamSbt').value = '';
        renderMbxSbtTeamList();
        toast(`Synced: "${max}" → "${sbt}"`);
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

document.getElementById('listMbxSbtTeams').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeMaxbetSbtTeamAlias(btn.dataset.max, btn.dataset.sbt);
        renderMbxSbtTeamList();
        toast('Removed from Supabase', 'warn');
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

function renderMbxClbTeamList() {
    const all = getMaxbetClbTeamAliases();
    const q = teamSearchQuery;
    const aliases = q ? all.filter(a => a.maxbet.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)) : all;
    updateTeamSearchCount();
    const list = document.getElementById('listMbxClbTeams');
    if (!all.length) { list.innerHTML = `<div class="am-empty">No MaxBet↔Cloudbet team aliases yet.</div>`; return; }
    if (!aliases.length) { list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`; return; }
    list.innerHTML = aliases.map(a => `
    <div class="am-alias-row">
      <div class="am-alias-mrk"><span class="am-bk-pill am-bk-b">MAX</span><span class="am-alias-name">${esc(a.maxbet)}</span></div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx"><span class="am-bk-pill am-bk-cl">CLB</span><span class="am-alias-name">${esc(a.cloudbet)}</span></div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-max="${esc(a.maxbet)}" data-clb="${esc(a.cloudbet)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddMbxClbTeam').addEventListener('click', async () => {
    const max = document.getElementById('inMbxClbTeamMax').value.trim();
    const clb = document.getElementById('inMbxClbTeamClb').value.trim();
    if (!max || !clb) { toast('Both fields are required', 'err'); return; }
    try {
        await addMaxbetClbTeamAlias(max, clb);
        document.getElementById('inMbxClbTeamMax').value = '';
        document.getElementById('inMbxClbTeamClb').value = '';
        renderMbxClbTeamList();
        toast(`Synced: "${max}" → "${clb}"`);
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

document.getElementById('listMbxClbTeams').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeMaxbetClbTeamAlias(btn.dataset.max, btn.dataset.clb);
        renderMbxClbTeamList();
        toast('Removed from Supabase', 'warn');
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

function renderSbtClbTeamList() {
    const all = getSbtClbTeamAliases();
    const q = teamSearchQuery;
    const aliases = q ? all.filter(a => a.soccerbet.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)) : all;
    updateTeamSearchCount();
    const list = document.getElementById('listSbtClbTeams');
    if (!all.length) { list.innerHTML = `<div class="am-empty">No SoccerBet↔Cloudbet team aliases yet.</div>`; return; }
    if (!aliases.length) { list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`; return; }
    list.innerHTML = aliases.map(a => `
    <div class="am-alias-row">
      <div class="am-alias-mrk"><span class="am-bk-pill am-bk-s">SBT</span><span class="am-alias-name">${esc(a.soccerbet)}</span></div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx"><span class="am-bk-pill am-bk-cl">CLB</span><span class="am-alias-name">${esc(a.cloudbet)}</span></div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-sbt="${esc(a.soccerbet)}" data-clb="${esc(a.cloudbet)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddSbtClbTeam').addEventListener('click', async () => {
    const sbt = document.getElementById('inSbtClbTeamSbt').value.trim();
    const clb = document.getElementById('inSbtClbTeamClb').value.trim();
    if (!sbt || !clb) { toast('Both fields are required', 'err'); return; }
    try {
        await addSbtClbTeamAlias(sbt, clb);
        document.getElementById('inSbtClbTeamSbt').value = '';
        document.getElementById('inSbtClbTeamClb').value = '';
        renderSbtClbTeamList();
        toast(`Synced: "${sbt}" → "${clb}"`);
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

document.getElementById('listSbtClbTeams').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeSbtClbTeamAlias(btn.dataset.sbt, btn.dataset.clb);
        renderSbtClbTeamList();
        toast('Removed from Supabase', 'warn');
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

function renderMbxSbtLeagueList() {
    const all = getMaxbetSbtLeagueAliases();
    const q = leagueSearchQuery;
    const aliases = q ? all.filter(a => a.maxbet.toLowerCase().includes(q) || a.soccerbet.toLowerCase().includes(q)) : all;
    updateLeagueSearchCount();
    const list = document.getElementById('listMbxSbtLeagues');
    if (!all.length) { list.innerHTML = `<div class="am-empty">No MaxBet↔SoccerBet league aliases yet.</div>`; return; }
    if (!aliases.length) { list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`; return; }
    list.innerHTML = aliases.map(a => `
    <div class="am-alias-row">
      <div class="am-alias-mrk"><span class="am-bk-pill am-bk-b">MAX</span><span class="am-alias-name">${esc(a.maxbet)}</span></div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx"><span class="am-bk-pill am-bk-s">SBT</span><span class="am-alias-name">${esc(a.soccerbet)}</span></div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-max="${esc(a.maxbet)}" data-sbt="${esc(a.soccerbet)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddMbxSbtLeague').addEventListener('click', async () => {
    const max = document.getElementById('inMbxSbtLeagueMax').value.trim();
    const sbt = document.getElementById('inMbxSbtLeagueSbt').value.trim();
    if (!max || !sbt) { toast('Both fields are required', 'err'); return; }
    try {
        await addMaxbetSbtLeagueAlias(max, sbt);
        document.getElementById('inMbxSbtLeagueMax').value = '';
        document.getElementById('inMbxSbtLeagueSbt').value = '';
        renderMbxSbtLeagueList();
        toast(`Synced: "${max}" → "${sbt}"`);
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

document.getElementById('listMbxSbtLeagues').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeMaxbetSbtLeagueAlias(btn.dataset.max, btn.dataset.sbt);
        renderMbxSbtLeagueList();
        toast('Removed from Supabase', 'warn');
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

function renderMbxClbLeagueList() {
    const all = getMaxbetClbLeagueAliases();
    const q = leagueSearchQuery;
    const aliases = q ? all.filter(a => a.maxbet.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)) : all;
    updateLeagueSearchCount();
    const list = document.getElementById('listMbxClbLeagues');
    if (!all.length) { list.innerHTML = `<div class="am-empty">No MaxBet↔Cloudbet league aliases yet.</div>`; return; }
    if (!aliases.length) { list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`; return; }
    list.innerHTML = aliases.map(a => `
    <div class="am-alias-row">
      <div class="am-alias-mrk"><span class="am-bk-pill am-bk-b">MAX</span><span class="am-alias-name">${esc(a.maxbet)}</span></div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx"><span class="am-bk-pill am-bk-cl">CLB</span><span class="am-alias-name">${esc(a.cloudbet)}</span></div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-max="${esc(a.maxbet)}" data-clb="${esc(a.cloudbet)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddMbxClbLeague').addEventListener('click', async () => {
    const max = document.getElementById('inMbxClbLeagueMax').value.trim();
    const clb = document.getElementById('inMbxClbLeagueClb').value.trim();
    if (!max || !clb) { toast('Both fields are required', 'err'); return; }
    try {
        await addMaxbetClbLeagueAlias(max, clb);
        document.getElementById('inMbxClbLeagueMax').value = '';
        document.getElementById('inMbxClbLeagueClb').value = '';
        renderMbxClbLeagueList();
        toast(`Synced: "${max}" → "${clb}"`);
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

document.getElementById('listMbxClbLeagues').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeMaxbetClbLeagueAlias(btn.dataset.max, btn.dataset.clb);
        renderMbxClbLeagueList();
        toast('Removed from Supabase', 'warn');
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

function renderSbtClbLeagueList() {
    const all = getSbtClbLeagueAliases();
    const q = leagueSearchQuery;
    const aliases = q ? all.filter(a => a.soccerbet.toLowerCase().includes(q) || a.cloudbet.toLowerCase().includes(q)) : all;
    updateLeagueSearchCount();
    const list = document.getElementById('listSbtClbLeagues');
    if (!all.length) { list.innerHTML = `<div class="am-empty">No SoccerBet↔Cloudbet league aliases yet.</div>`; return; }
    if (!aliases.length) { list.innerHTML = `<div class="am-empty">No results for "${esc(q)}"</div>`; return; }
    list.innerHTML = aliases.map(a => `
    <div class="am-alias-row">
      <div class="am-alias-mrk"><span class="am-bk-pill am-bk-s">SBT</span><span class="am-alias-name">${esc(a.soccerbet)}</span></div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx"><span class="am-bk-pill am-bk-cl">CLB</span><span class="am-alias-name">${esc(a.cloudbet)}</span></div>
      <div class="am-alias-meta">${fmtDate(a.created_at)}</div>
      <button class="am-alias-del" data-sbt="${esc(a.soccerbet)}" data-clb="${esc(a.cloudbet)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddSbtClbLeague').addEventListener('click', async () => {
    const sbt = document.getElementById('inSbtClbLeagueSbt').value.trim();
    const clb = document.getElementById('inSbtClbLeagueClb').value.trim();
    if (!sbt || !clb) { toast('Both fields are required', 'err'); return; }
    try {
        await addSbtClbLeagueAlias(sbt, clb);
        document.getElementById('inSbtClbLeagueSbt').value = '';
        document.getElementById('inSbtClbLeagueClb').value = '';
        renderSbtClbLeagueList();
        toast(`Synced: "${sbt}" → "${clb}"`);
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

document.getElementById('listSbtClbLeagues').addEventListener('click', async e => {
    const btn = e.target.closest('.am-alias-del');
    if (!btn) return;
    try {
        await removeSbtClbLeagueAlias(btn.dataset.sbt, btn.dataset.clb);
        renderSbtClbLeagueList();
        toast('Removed from Supabase', 'warn');
    } catch (e) { toast('Database error: ' + e.message, 'err'); }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GROUPS TAB
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderGroupList() {
    const groups = getLeagueGroups();
    document.getElementById('tabGroupCount').textContent = groups.length;
    const list = document.getElementById('listGroups');

    if (!groups.length) {
        list.innerHTML = `<div class="am-empty">No manual league groups set.</div>`;
        return;
    }

    list.innerHTML = groups.sort((a, b) => a.league_name.localeCompare(b.league_name)).map((a) => `
    <div class="am-alias-row">
      <div class="am-alias-mrk">
        <span class="am-bk-pill am-bk-m">LG</span>
        <span class="am-alias-name">${esc(a.league_name)}</span>
      </div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx">
        <span class="am-bk-pill am-bk-b">GRP</span>
        <span class="am-alias-name">${esc(a.group_name)}</span>
      </div>
      <button class="am-alias-del am-group-del" data-name="${esc(a.league_name)}" title="Delete">✕</button>
    </div>`).join('');

    updateGroupSuggestions();
}

function updateGroupSuggestions() {
    const groups = getLeagueGroups();
    const uniqueGroups = new Set();

    // Add "International" by default
    uniqueGroups.add('International');

    // Add existing manual groups
    groups.forEach(g => uniqueGroups.add(g.group_name));

    // Also look into existing aliases for country prefixes
    getLeagueAliases().forEach(a => {
        const c1 = a.merkur.includes(',') ? a.merkur.split(',')[0].trim() : null;
        const c2 = a.maxbet.includes(',') ? a.maxbet.split(',')[0].trim() : null;
        if (c1) uniqueGroups.add(c1);
        if (c2) uniqueGroups.add(c2);
    });

    const datalist = document.getElementById('groupSuggestions');
    if (!datalist) return;

    datalist.innerHTML = [...uniqueGroups].sort().map(g => `<option value="${esc(g)}">`).join('');
}

document.getElementById('btnAddGroup').addEventListener('click', async () => {
    const league = document.getElementById('inGroupLeague').value.trim();
    const target = document.getElementById('inGroupTarget').value.trim();
    if (!league || !target) { toast('Both fields are required', 'err'); return; }

    try {
        await setLeagueGroup(league, target);
        document.getElementById('inGroupLeague').value = '';
        document.getElementById('inGroupTarget').value = '';
        renderGroupList();
        toast(`Set: "${league}" in "${target}"`);
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

document.getElementById('listGroups').addEventListener('click', async e => {
    const btn = e.target.closest('.am-group-del');
    if (!btn) return;
    try {
        await removeLeagueGroup(btn.dataset.name);
        renderGroupList();
        toast('Removed grouping override', 'warn');
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

/* ── LEAGUE DISPLAY NAMES ──────────────────────────────────── */

function renderDisplayNameList() {
    const items = getLeagueDisplayNames();
    const list = document.getElementById('listDisplayNames');

    if (!items.length) {
        list.innerHTML = `<div class="am-empty">No display name overrides set.</div>`;
        return;
    }

    list.innerHTML = items
        .sort((a, b) => a.merkur_name.localeCompare(b.merkur_name))
        .map(d => `
    <div class="am-alias-row">
      <div class="am-alias-mrk">
        <span class="am-bk-pill am-bk-m">MRK</span>
        <span class="am-alias-name">${esc(d.merkur_name)}</span>
      </div>
      <div class="am-alias-arrow">→</div>
      <div class="am-alias-mbx">
        <span class="am-bk-pill" style="background:var(--clr-accent);color:#000;">DSP</span>
        <span class="am-alias-name">${esc(d.display_name)}</span>
      </div>
      <button class="am-alias-del am-dn-del" data-mrk="${esc(d.merkur_name)}" title="Delete">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddDisplayName').addEventListener('click', async () => {
    const merkur = document.getElementById('inDisplayMrk').value.trim();
    const display = document.getElementById('inDisplayName').value.trim();
    if (!merkur || !display) { toast('Both fields are required', 'err'); return; }

    try {
        await setLeagueDisplayName(merkur, display);
        document.getElementById('inDisplayMrk').value = '';
        document.getElementById('inDisplayName').value = '';
        renderDisplayNameList();
        toast(`Display name set: "${merkur}" → "${display}"`);
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

document.getElementById('listDisplayNames').addEventListener('click', async e => {
    const btn = e.target.closest('.am-dn-del');
    if (!btn) return;
    try {
        await removeLeagueDisplayName(btn.dataset.mrk);
        renderDisplayNameList();
        toast('Display name override removed', 'warn');
    } catch (e) {
        toast('Database error: ' + e.message, 'err');
    }
});

/* ── UNGROUPED FINDER ──────────────────────────────── */
document.getElementById('btnLoadUngrouped').addEventListener('click', async () => {
    const btn = document.getElementById('btnLoadUngrouped');
    btn.textContent = '🔍 Scanning…';
    btn.disabled = true;

    try {
        const [rMrk, rMbx, rSbt] = await Promise.all([
            fetch(APIS.merkur),
            fetch(APIS.maxbet),
            fetch(APIS.soccerbet),
        ]);
        const [dMrk, dMbx, dSbt] = await Promise.all([rMrk.json(), rMbx.json(), rSbt.json()]);

        const mrkMatches = (dMrk.esMatches || []).filter(m => m.sport === 'S');
        const mbxMatches = (dMbx.esMatches || []).filter(m => m.sport === 'S' && !isMaxbetBonus(m));
        const sbtMatches = (dSbt.esMatches || []).filter(m => m.sport === 'S' && !isSbtOutright(m));

        const allLgs = new Set();
        mrkMatches.forEach(m => allLgs.add(m.leagueName));
        mbxMatches.forEach(m => allLgs.add(m.leagueName));
        sbtMatches.forEach(m => allLgs.add(m.leagueName));

        // Get normalized map of all aliased "canonical" names 
        // that already provide a country prefix.
        const aliasedWithCountry = new Set();
        getLeagueAliases().forEach(a => {
            if (a.merkur.includes(',') || a.maxbet.includes(',')) {
                aliasedWithCountry.add(a.merkur);
                aliasedWithCountry.add(a.maxbet);
            }
        });

        // Filter for those that would fall into "Other"
        const ungrouped = [...allLgs].filter(name => {
            // Already manually grouped in Groups table?
            if (getLeagueGroups().some(g => g.league_name === name)) return false;
            // Has an alias that already provides a country?
            if (aliasedWithCountry.has(name)) return false;
            // Has a country comma in its own name?
            if (name.includes(',')) return false;
            // Hardcoded international?
            if (name.toLowerCase().startsWith('international clubs')) return false;
            return true;
        }).sort();

        const list = document.getElementById('listUngrouped');
        if (!ungrouped.length) {
            list.innerHTML = `<div class="am-empty">No ungrouped leagues found! 🎉</div>`;
        } else {
            list.innerHTML = ungrouped.map(name => `
                <div class="am-alias-row" style="cursor:pointer" onclick="document.getElementById('inGroupLeague').value='${esc(name)}'; document.getElementById('inGroupTarget').focus()">
                    <div class="am-alias-name">${esc(name)}</div>
                    <div class="am-alias-meta">Click to assign</div>
                </div>
            `).join('');
        }
        toast(`Found ${ungrouped.length} ungrouped leagues`);
    } catch (err) {
        toast('Scan failed: ' + err.message, 'err');
    } finally {
        btn.textContent = '🔍 Scan for Ungrouped';
        btn.disabled = false;
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UNMATCHED TAB — LIVE DATA PICKER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function normName(s) {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isSbtOutright(m) {
    const league = (m.leagueName || '').toLowerCase();
    const home   = (m.home || '').toLowerCase();
    const away   = (m.away || '').toLowerCase();
    return league.includes('pobednik') || /\d{4}\/\d{2}/.test(league)
        || home.includes('pobednik')   || away.includes('pobednik');
}

function isMaxbetBonus(m) {
    return (m.leagueName || '').toLowerCase().includes('bonus');
}

/* ── Similarity / Suggestion Engine ──────────────────────── */
function tokenJaccard(a, b) {
    const tokA = new Set(a.split(' ').filter(Boolean));
    const tokB = new Set(b.split(' ').filter(Boolean));
    let inter = 0;
    for (const t of tokA) if (tokB.has(t)) inter++;
    const union = tokA.size + tokB.size - inter;
    return union === 0 ? 0 : inter / union;
}

function nameSim(a, b) {
    const na = normName(a);
    const nb = normName(b);
    if (na === nb) return 1;
    const jac = tokenJaccard(na, nb);
    const subBonus = (na.includes(nb) || nb.includes(na)) ? 0.25 : 0;
    return Math.min(1, jac + subBonus);
}

function computeSuggestions(fromList, toList) {
    const THRESHOLD = 0.25;
    const MAX_ITEMS = 300; // cap to avoid O(n²) on large datasets
    const MAX_RESULTS = 10;
    const from = fromList.slice(0, MAX_ITEMS);
    const to = toList.slice(0, MAX_ITEMS);
    const scored = [];
    for (const m of from) {
        let best = null;
        for (const o of to) {
            const score = nameSim(m.name, o.name);
            if (score >= THRESHOLD && (!best || score > best.score)) {
                best = { mrk: m.name, other: o.name, score };
            }
        }
        if (best) scored.push(best);
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
}

// Recompute suggestions from current lists and re-render.
// Call this after loading new data or changing modes.
function refreshSuggestions() {
    const fromList = browseAll ? allMrkItems : unmatchedMrk;
    const toList = browseAll ? allOtherItems : unmatchedMbx;
    cachedSuggestions = computeSuggestions(fromList, toList);
    renderSuggestions();
}

// Render from cachedSuggestions only — does NOT recompute.
function renderSuggestions() {
    const container = document.getElementById('listSuggestions');
    if (!container) return;
    const bulkBtn = document.getElementById('btnBulkSaveSuggestions');

    const fromList = browseAll ? allMrkItems : unmatchedMrk;
    const toList = browseAll ? allOtherItems : unmatchedMbx;

    if (!fromList.length || !toList.length) {
        container.innerHTML = '<div class="am-sug-empty">Load data to see suggestions</div>';
        if (bulkBtn) bulkBtn.disabled = true;
        return;
    }

    if (!cachedSuggestions.length) {
        container.innerHTML = '<div class="am-sug-empty">No close matches found</div>';
        if (bulkBtn) bulkBtn.disabled = true;
        return;
    }

    if (bulkBtn) bulkBtn.disabled = false;
    const otherClass = pickerTarget === 'sbt' ? 'am-sug-sbt' : pickerTarget === 'clb' ? 'am-sug-clb' : 'am-sug-mbx';
    container.innerHTML = cachedSuggestions.map(s => `
        <div class="am-sug-item" data-mrk="${esc(s.mrk)}" data-other="${esc(s.other)}">
            <div class="am-sug-score">${Math.round(s.score * 100)}%</div>
            <div class="am-sug-names">
                <div class="am-sug-name am-sug-mrk">${esc(s.mrk)}</div>
                <div class="am-sug-name ${otherClass}">${esc(s.other)}</div>
            </div>
        </div>`).join('');
}

document.getElementById('btnBulkSaveSuggestions').addEventListener('click', async () => {
    const btn = document.getElementById('btnBulkSaveSuggestions');
    const pairs = [...cachedSuggestions];
    if (!pairs.length) return;

    btn.disabled = true;
    btn.textContent = '…';
    let saved = 0, failed = 0;

    const cfg = ALIAS_CONFIG[`${pickerSource}-${pickerTarget}`];
    for (const { mrk, other } of pairs) {
        try {
            if (leagueMode) await cfg.addLeagueAlias(mrk, other);
            else await cfg.addTeamAlias(mrk, other);
            unmatchedMrk = unmatchedMrk.filter(t => t.name !== mrk);
            unmatchedMbx = unmatchedMbx.filter(t => t.name !== other);
            cachedSuggestions = cachedSuggestions.filter(s => s.mrk !== mrk || s.other !== other);
            saved++;
        } catch {
            failed++;
        }
    }

    if (leagueMode) cfg.renderLeagueList(); else cfg.renderTeamList();

    selMrk = selMbx = null;
    document.getElementById('tabUnmatchedCount').textContent =
        unmatchedMrk.length + unmatchedMbx.length;
    renderPicker();

    if (failed > 0) toast(`Saved ${saved}, ${failed} failed`, 'warn');
    else toast(`Bulk saved ${saved} aliases`);
});

document.getElementById('listSuggestions').addEventListener('click', e => {
    const item = e.target.closest('.am-sug-item');
    if (!item) return;
    selMrk = item.dataset.mrk;
    selMbx = item.dataset.other;
    renderPicker();
    // Scroll selected items into view
    setTimeout(() => {
        const mrkEl = document.querySelector(`[data-name="${CSS.escape(selMrk)}"][data-side="mrk"]`);
        const mbxEl = document.querySelector(`[data-name="${CSS.escape(selMbx)}"][data-side="mbx"]`);
        if (mrkEl) mrkEl.scrollIntoView({ block: 'nearest' });
        if (mbxEl) mbxEl.scrollIntoView({ block: 'nearest' });
    }, 0);
});

document.getElementById('btnLoadUnmatched').addEventListener('click', loadUnmatched);
document.getElementById('pickerPairSel').addEventListener('change', e => {
    [pickerSource, pickerTarget] = e.target.value.split('-');
    selMrk = selMbx = null;
    unmatchedMrk = [];
    unmatchedMbx = [];
    allMrkItems = [];
    allOtherItems = [];
    cachedSuggestions = [];
    renderPicker();
});
document.getElementById('chkLeagueMode').addEventListener('change', e => {
    leagueMode = e.target.checked;
    selMrk = selMbx = null;
    allMrkItems = [];
    allOtherItems = [];
    cachedSuggestions = [];
    renderPicker();
});
document.getElementById('chkBrowseAll').addEventListener('change', e => {
    browseAll = e.target.checked;
    selMrk = selMbx = null;
    cachedSuggestions = [];
    renderPicker();
    if (allMrkItems.length || allOtherItems.length) refreshSuggestions();
});
document.getElementById('unmatchedSearch').addEventListener('input', e => {
    filterQuery = e.target.value.toLowerCase();
    renderPicker();
});

async function loadUnmatched() {
    const btn = document.getElementById('btnLoadUnmatched');
    btn.textContent = '⟳ Loading…';
    btn.disabled = true;

    try {
        const [srcResp, tgtResp] = await Promise.all([
            BK_META[pickerSource].api(),
            BK_META[pickerTarget].api(),
        ]);
        const [srcData, tgtData] = await Promise.all([srcResp.json(), tgtResp.json()]);
        const srcMatches = parseForBookie(pickerSource, srcData);
        const tgtMatches = parseForBookie(pickerTarget, tgtData);

        if (leagueMode) buildLeagueUnmatched(srcMatches, tgtMatches);
        else buildTeamUnmatched(srcMatches, tgtMatches);

        renderPicker();
        refreshSuggestions();
        toast(`Loaded live data from APIs`);
    } catch (err) {
        toast('Failed to load: ' + err.message, 'err');
    } finally {
        btn.textContent = '⟳ Load Live Data';
        btn.disabled = false;
    }
}

/* Lookup table for all 6 bookie pairs — drives unmatched build, save, and render. */
const ALIAS_CONFIG = {
    'mrk-max': { getTeamAliases: getTeamAliases,            srcKey: 'merkur',    tgtKey: 'maxbet',
                 getLeagueAliases: getLeagueAliases,
                 addTeamAlias: addTeamAlias,                addLeagueAlias: addLeagueAlias,
                 renderTeamList: renderTeamList,            renderLeagueList: renderLeagueList },
    'mrk-sbt': { getTeamAliases: getSoccerbetTeamAliases,   srcKey: 'merkur',    tgtKey: 'soccerbet',
                 getLeagueAliases: getSoccerbetLeagueAliases,
                 addTeamAlias: addSoccerbetTeamAlias,       addLeagueAlias: addSoccerbetLeagueAlias,
                 renderTeamList: renderSbtTeamList,         renderLeagueList: renderSbtLeagueList },
    'mrk-clb': { getTeamAliases: getCloudbetTeamAliases,    srcKey: 'merkur',    tgtKey: 'cloudbet',
                 getLeagueAliases: getCloudbetLeagueAliases,
                 addTeamAlias: addCloudbetTeamAlias,        addLeagueAlias: addCloudbetLeagueAlias,
                 renderTeamList: renderClbTeamList,         renderLeagueList: renderClbLeagueList },
    'max-sbt': { getTeamAliases: getMaxbetSbtTeamAliases,   srcKey: 'maxbet',    tgtKey: 'soccerbet',
                 getLeagueAliases: getMaxbetSbtLeagueAliases,
                 addTeamAlias: addMaxbetSbtTeamAlias,       addLeagueAlias: addMaxbetSbtLeagueAlias,
                 renderTeamList: renderMbxSbtTeamList,      renderLeagueList: renderMbxSbtLeagueList },
    'max-clb': { getTeamAliases: getMaxbetClbTeamAliases,   srcKey: 'maxbet',    tgtKey: 'cloudbet',
                 getLeagueAliases: getMaxbetClbLeagueAliases,
                 addTeamAlias: addMaxbetClbTeamAlias,       addLeagueAlias: addMaxbetClbLeagueAlias,
                 renderTeamList: renderMbxClbTeamList,      renderLeagueList: renderMbxClbLeagueList },
    'sbt-clb': { getTeamAliases: getSbtClbTeamAliases,      srcKey: 'soccerbet', tgtKey: 'cloudbet',
                 getLeagueAliases: getSbtClbLeagueAliases,
                 addTeamAlias: addSbtClbTeamAlias,          addLeagueAlias: addSbtClbLeagueAlias,
                 renderTeamList: renderSbtClbTeamList,      renderLeagueList: renderSbtClbLeagueList },
};

function buildTeamUnmatched(srcMatches, otherMatches) {
    const srcTeams   = new Map();
    const otherTeams = new Map();

    srcMatches.forEach(m => {
        [m.home, m.away].forEach(t => {
            const n = normName(t);
            if (!srcTeams.has(n)) srcTeams.set(n, { original: t, leagues: new Set() });
            srcTeams.get(n).leagues.add(m.leagueName);
        });
    });
    otherMatches.forEach(m => {
        [m.home, m.away].forEach(t => {
            const n = normName(t);
            if (!otherTeams.has(n)) otherTeams.set(n, { original: t, leagues: new Set() });
            otherTeams.get(n).leagues.add(m.leagueName);
        });
    });

    const cfg = ALIAS_CONFIG[`${pickerSource}-${pickerTarget}`];
    const aliasedSrc   = new Set(cfg.getTeamAliases().map(a => normName(a[cfg.srcKey])));
    const aliasedOther = new Set(cfg.getTeamAliases().map(a => normName(a[cfg.tgtKey])));

    allMrkItems = [...srcTeams.entries()]
        .map(([, v]) => ({ name: v.original, leagues: [...v.leagues] }))
        .sort((a, b) => a.name.localeCompare(b.name));

    allOtherItems = [...otherTeams.entries()]
        .map(([, v]) => ({ name: v.original, leagues: [...v.leagues] }))
        .sort((a, b) => a.name.localeCompare(b.name));

    unmatchedMrk = [...srcTeams.entries()]
        .filter(([n]) => !otherTeams.has(n) && !aliasedSrc.has(n))
        .map(([, v]) => ({ name: v.original, leagues: [...v.leagues] }))
        .sort((a, b) => a.name.localeCompare(b.name));

    unmatchedMbx = [...otherTeams.entries()]
        .filter(([n]) => !srcTeams.has(n) && !aliasedOther.has(n))
        .map(([, v]) => ({ name: v.original, leagues: [...v.leagues] }))
        .sort((a, b) => a.name.localeCompare(b.name));

    document.getElementById('tabUnmatchedCount').textContent =
        unmatchedMrk.length + unmatchedMbx.length;
}

function buildLeagueUnmatched(srcMatches, otherMatches) {
    const srcLeagues   = new Map();
    const otherLeagues = new Map();

    srcMatches.forEach(m => {
        if (!srcLeagues.has(m.leagueName))
            srcLeagues.set(m.leagueName, { original: m.leagueName, count: 0 });
        srcLeagues.get(m.leagueName).count++;
    });
    otherMatches.forEach(m => {
        if (!otherLeagues.has(m.leagueName))
            otherLeagues.set(m.leagueName, { original: m.leagueName, count: 0 });
        otherLeagues.get(m.leagueName).count++;
    });

    const cfg = ALIAS_CONFIG[`${pickerSource}-${pickerTarget}`];
    const aliasedSrc   = new Set(cfg.getLeagueAliases().map(a => a[cfg.srcKey]));
    const aliasedOther = new Set(cfg.getLeagueAliases().map(a => a[cfg.tgtKey]));

    allMrkItems = [...srcLeagues.values()]
        .sort((a, b) => a.original.localeCompare(b.original))
        .map(v => ({ name: v.original, leagues: [`${v.count} matches`] }));

    allOtherItems = [...otherLeagues.values()]
        .sort((a, b) => a.original.localeCompare(b.original))
        .map(v => ({ name: v.original, leagues: [`${v.count} matches`] }));

    unmatchedMrk = [...srcLeagues.values()]
        .filter(v => !otherLeagues.has(v.original) && !aliasedSrc.has(v.original))
        .sort((a, b) => a.original.localeCompare(b.original))
        .map(v => ({ name: v.original, leagues: [`${v.count} matches`] }));

    unmatchedMbx = [...otherLeagues.values()]
        .filter(v => !srcLeagues.has(v.original) && !aliasedOther.has(v.original))
        .sort((a, b) => a.original.localeCompare(b.original))
        .map(v => ({ name: v.original, leagues: [`${v.count} matches`] }));

    document.getElementById('tabUnmatchedCount').textContent =
        unmatchedMrk.length + unmatchedMbx.length;
}

function renderPicker() {
    const q = filterQuery;

    // Update both column headers to reflect current pair
    document.getElementById('pickerSrcDot').className    = `am-bk-dot ${BK_META[pickerSource].dotCls}`;
    document.getElementById('pickerSrcLabel').textContent = BK_META[pickerSource].label;
    document.getElementById('pickerOtherDot').className  = `am-bk-dot ${BK_META[pickerTarget].dotCls}`;
    document.getElementById('pickerOtherLabel').textContent = BK_META[pickerTarget].label;

    // Choose source lists based on browseAll toggle
    const currentMrk = browseAll ? allMrkItems : unmatchedMrk;
    const currentMbx = browseAll ? allOtherItems : unmatchedMbx;

    const filteredMrk = currentMrk.filter(t =>
        !q || t.name.toLowerCase().includes(q) ||
        t.leagues.some(l => l.toLowerCase().includes(q))
    );
    const filteredMbx = currentMbx.filter(t =>
        !q || t.name.toLowerCase().includes(q) ||
        t.leagues.some(l => l.toLowerCase().includes(q))
    );

    document.getElementById('pickerMrkCount').textContent = filteredMrk.length;
    document.getElementById('pickerMbxCount').textContent = filteredMbx.length;

    document.getElementById('listMrk').innerHTML = filteredMrk.length
        ? filteredMrk.map(t => `
        <div class="am-pick-item${selMrk === t.name ? ' selected' : ''}"
             data-name="${esc(t.name)}" data-side="mrk">
          <div class="am-pick-name">${esc(t.name)}</div>
          <div class="am-pick-leagues">${t.leagues.slice(0, 2).map(l => esc(l)).join(' · ')}</div>
        </div>`).join('')
        : `<div class="am-picker-empty">${browseAll ? 'No items found' : 'All matched ✓'}</div>`;

    document.getElementById('listMbx').innerHTML = filteredMbx.length
        ? filteredMbx.map(t => `
        <div class="am-pick-item${selMbx === t.name ? ' selected' : ''}"
             data-name="${esc(t.name)}" data-side="mbx">
          <div class="am-pick-name">${esc(t.name)}</div>
          <div class="am-pick-leagues">${t.leagues.slice(0, 2).map(l => esc(l)).join(' · ')}</div>
        </div>`).join('')
        : `<div class="am-picker-empty">${browseAll ? 'No items found' : 'All matched ✓'}</div>`;

    document.getElementById('pendingMrk').textContent = selMrk || '—';
    document.getElementById('pendingMbx').textContent = selMbx || '—';
    document.getElementById('btnSavePair').disabled = !(selMrk && selMbx);

    renderSuggestions();
}

document.getElementById('btnClearSel').addEventListener('click', () => {
    selMrk = selMbx = null;
    renderPicker();
});

document.getElementById('picker').addEventListener('click', e => {
    const item = e.target.closest('.am-pick-item');
    if (!item) return;
    const { name, side } = item.dataset;
    if (side === 'mrk') selMrk = selMrk === name ? null : name;
    else selMbx = selMbx === name ? null : name;
    renderPicker();
});

document.getElementById('btnSavePair').addEventListener('click', async () => {
    const mrk = selMrk;
    const mbx = selMbx;
    if (!mrk || !mbx) return;

    try {
        const cfg = ALIAS_CONFIG[`${pickerSource}-${pickerTarget}`];
        if (leagueMode) {
            await cfg.addLeagueAlias(mrk, mbx);
            cfg.renderLeagueList();
        } else {
            await cfg.addTeamAlias(mrk, mbx);
            cfg.renderTeamList();
        }
        unmatchedMrk = unmatchedMrk.filter(t => t.name !== mrk);
        unmatchedMbx = unmatchedMbx.filter(t => t.name !== mbx);
        cachedSuggestions = cachedSuggestions.filter(s => s.mrk !== mrk || s.other !== mbx);
        selMrk = selMbx = null;
        renderPicker();
        toast('Saved & Synced');
    } catch (e) {
        toast('Sync failed: ' + e.message, 'err');
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LEGACY / MIGRATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

document.getElementById('btnImportConfirm').addEventListener('click', async () => {
    try {
        const text = document.getElementById('importText').value;
        await importAliasesFromJSON(text);
        document.getElementById('importModal').classList.remove('open');
        renderTeamList();
        renderLeagueList();
        toast('Migration complete! All data uploaded to Supabase.');
    } catch (e) {
        toast('Import failed: ' + e.message, 'err');
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UTILS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ── League name datalists ──────────────────────────────────── */
let _nameCacheLoaded = false;

function populateDatalist(id, names) {
    const dl = document.getElementById(id);
    if (!dl) return;
    dl.innerHTML = names.map(n => `<option value="${esc(n)}"></option>`).join('');
}

async function ensureNameCache() {
    if (_nameCacheLoaded) return;
    _nameCacheLoaded = true; // mark early to prevent double-fetch
    try {
        const [rMrk, rMbx, rSbt, rClb] = await Promise.all([
            fetch(APIS.merkur),
            fetch(APIS.maxbet),
            fetch(APIS.soccerbet),
            fetch(getCloudbetUrl(), { headers: { 'X-API-Key': CLOUDBET_KEY } }),
        ]);
        const [dMrk, dMbx, dSbt, dClb] = await Promise.all([rMrk.json(), rMbx.json(), rSbt.json(), rClb.json()]);

        const mrkMatches = (dMrk.esMatches || []).filter(m => m.sport === 'S');
        const mbxMatches = (dMbx.esMatches || []).filter(m => m.sport === 'S' && !isMaxbetBonus(m));
        const sbtMatches = (dSbt.esMatches || []).filter(m => m.sport === 'S' && !isSbtOutright(m));
        const clbMatches = parseCloudbetRaw(dClb);

        const mrkLeagues = [...new Set(mrkMatches.map(m => m.leagueName))].sort();
        const mbxLeagues = [...new Set(mbxMatches.map(m => m.leagueName))].sort();
        const sbtLeagues = [...new Set(sbtMatches.map(m => m.leagueName))].sort();
        const clbLeagues = [...new Set(clbMatches.map(m => m.leagueName))].sort();

        const teamNames = ms => [...new Set(ms.flatMap(m => [m.home, m.away]))].sort();
        const mrkTeams = teamNames(mrkMatches);
        const mbxTeams = teamNames(mbxMatches);
        const sbtTeams = teamNames(sbtMatches);
        const clbTeams = teamNames(clbMatches);

        populateDatalist('dlMrkLeagues', mrkLeagues);
        populateDatalist('dlMaxLeagues', mbxLeagues);
        populateDatalist('dlSbtLeagues', sbtLeagues);
        populateDatalist('dlClbLeagues', clbLeagues);
        populateDatalist('dlMrkTeams', mrkTeams);
        populateDatalist('dlMaxTeams', mbxTeams);
        populateDatalist('dlSbtTeams', sbtTeams);
        populateDatalist('dlClbTeams', clbTeams);
    } catch (e) {
        _nameCacheLoaded = false; // allow retry on next page visit
        console.warn('[aliases] Name cache load failed:', e.message);
    }
}

function wireSectionToggles() {
    document.querySelectorAll('.am-panel-head').forEach(head => {
        let el = head.nextElementSibling;
        while (el) {
            if (el.classList.contains('am-list')) {
                const list = el;
                const h2 = head.querySelector('h2');
                if (h2) {
                    const btn = document.createElement('button');
                    btn.className = 'am-section-toggle';
                    btn.textContent = '▼ Hide';
                    btn.addEventListener('click', () => {
                        const collapsed = list.classList.toggle('am-collapsed');
                        btn.textContent = collapsed ? '▶ Show' : '▼ Hide';
                    });
                    h2.appendChild(btn);
                }
                break;
            }
            if (el.classList.contains('am-panel-head')) break;
            el = el.nextElementSibling;
        }
    });
}

async function init() {
    wireSectionToggles();
    await loadAliasDB();
    renderTeamList();
    renderSbtTeamList();
    renderClbTeamList();
    renderMbxSbtTeamList();
    renderMbxClbTeamList();
    renderSbtClbTeamList();
    renderLeagueList();
    renderSbtLeagueList();
    renderClbLeagueList();
    renderMbxSbtLeagueList();
    renderMbxClbLeagueList();
    renderSbtClbLeagueList();
    renderGroupList();
    renderDisplayNameList();
    ensureNameCache(); // background — no await
}

init();
