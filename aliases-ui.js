/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ALIAS MANAGER — UI LOGIC (Supabase Edition)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const APIS = {
    merkur: 'https://www.merkurxtip.rs/restapi/offer/en/init',
    maxbet: 'https://www.maxbet.rs/restapi/offer/en/init',
    soccerbet: 'https://www.soccerbet.rs/restapi/offer/en/init',
};

/* ── State ─────────────────────────────────────────────────── */
let unmatchedMrk = [];
let unmatchedMbx = [];
let leagueMode = false;
let pickerTarget = 'max'; // 'max' | 'sbt'
let selMrk = null;
let selMbx = null;
let filterQuery = '';

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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TEAMS TAB
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderTeamList() {
    const aliases = getTeamAliases();
    document.getElementById('tabTeamCount').textContent = aliases.length;
    const list = document.getElementById('listTeams');

    if (!aliases.length) {
        list.innerHTML = `<div class="am-empty">No team aliases in Supabase yet.</div>`;
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
    const aliases = getLeagueAliases();
    document.getElementById('tabLeagueCount').textContent = aliases.length;
    const list = document.getElementById('listLeagues');

    if (!aliases.length) {
        list.innerHTML = `<div class="am-empty">No league aliases in Supabase yet.</div>`;
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
    const aliases = getSoccerbetTeamAliases();
    const list = document.getElementById('listSbtTeams');

    if (!aliases.length) {
        list.innerHTML = `<div class="am-empty">No SoccerBet team aliases yet.</div>`;
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
    const aliases = getSoccerbetLeagueAliases();
    const list = document.getElementById('listSbtLeagues');

    if (!aliases.length) {
        list.innerHTML = `<div class="am-empty">No SoccerBet league aliases yet.</div>`;
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
        const mbxMatches = (dMbx.esMatches || []).filter(m => m.sport === 'S');
        const sbtMatches = (dSbt.esMatches || []).filter(m => m.sport === 'S');

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

document.getElementById('btnLoadUnmatched').addEventListener('click', loadUnmatched);
document.getElementById('pickerTargetSel').addEventListener('change', e => {
    pickerTarget = e.target.value;
    selMrk = selMbx = null;
    unmatchedMrk = [];
    unmatchedMbx = [];
    renderPicker();
});
document.getElementById('chkLeagueMode').addEventListener('change', e => {
    leagueMode = e.target.checked;
    selMrk = selMbx = null;
    renderPicker();
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
        const targetApi = pickerTarget === 'sbt' ? APIS.soccerbet : APIS.maxbet;
        const [rMrk, rOther] = await Promise.all([
            fetch(APIS.merkur),
            fetch(targetApi),
        ]);
        const [dMrk, dOther] = await Promise.all([rMrk.json(), rOther.json()]);

        const mrkMatches = (dMrk.esMatches || []).filter(m => m.sport === 'S');
        const otherMatches = (dOther.esMatches || []).filter(m => m.sport === 'S');

        if (leagueMode) buildLeagueUnmatched(mrkMatches, otherMatches);
        else buildTeamUnmatched(mrkMatches, otherMatches);

        renderPicker();
        toast(`Loaded live data from APIs`);
    } catch (err) {
        toast('Failed to load: ' + err.message, 'err');
    } finally {
        btn.textContent = '⟳ Load Live Data';
        btn.disabled = false;
    }
}

function buildTeamUnmatched(mrkMatches, otherMatches) {
    const mrkTeams = new Map();
    const otherTeams = new Map();

    mrkMatches.forEach(m => {
        [m.home, m.away].forEach(t => {
            const n = normName(t);
            if (!mrkTeams.has(n)) mrkTeams.set(n, { original: t, leagues: new Set() });
            mrkTeams.get(n).leagues.add(m.leagueName);
        });
    });
    otherMatches.forEach(m => {
        [m.home, m.away].forEach(t => {
            const n = normName(t);
            if (!otherTeams.has(n)) otherTeams.set(n, { original: t, leagues: new Set() });
            otherTeams.get(n).leagues.add(m.leagueName);
        });
    });

    let aliasedMrk, aliasedOther;
    if (pickerTarget === 'sbt') {
        aliasedMrk = new Set(getSoccerbetTeamAliases().map(a => normName(a.merkur)));
        aliasedOther = new Set(getSoccerbetTeamAliases().map(a => normName(a.soccerbet)));
    } else {
        aliasedMrk = new Set(getTeamAliases().map(a => normName(a.merkur)));
        aliasedOther = new Set(getTeamAliases().map(a => normName(a.maxbet)));
    }

    unmatchedMrk = [...mrkTeams.entries()]
        .filter(([n]) => !otherTeams.has(n) && !aliasedMrk.has(n))
        .map(([, v]) => ({ name: v.original, leagues: [...v.leagues] }))
        .sort((a, b) => a.name.localeCompare(b.name));

    unmatchedMbx = [...otherTeams.entries()]
        .filter(([n]) => !mrkTeams.has(n) && !aliasedOther.has(n))
        .map(([, v]) => ({ name: v.original, leagues: [...v.leagues] }))
        .sort((a, b) => a.name.localeCompare(b.name));

    document.getElementById('tabUnmatchedCount').textContent =
        unmatchedMrk.length + unmatchedMbx.length;
}

function buildLeagueUnmatched(mrkMatches, otherMatches) {
    const mrkLeagues = new Map();
    const otherLeagues = new Map();

    mrkMatches.forEach(m => {
        if (!mrkLeagues.has(m.leagueName))
            mrkLeagues.set(m.leagueName, { original: m.leagueName, count: 0 });
        mrkLeagues.get(m.leagueName).count++;
    });
    otherMatches.forEach(m => {
        if (!otherLeagues.has(m.leagueName))
            otherLeagues.set(m.leagueName, { original: m.leagueName, count: 0 });
        otherLeagues.get(m.leagueName).count++;
    });

    let aliasedMrk, aliasedOther;
    if (pickerTarget === 'sbt') {
        aliasedMrk = new Set(getSoccerbetLeagueAliases().map(a => a.merkur));
        aliasedOther = new Set(getSoccerbetLeagueAliases().map(a => a.soccerbet));
    } else {
        aliasedMrk = new Set(getLeagueAliases().map(a => a.merkur));
        aliasedOther = new Set(getLeagueAliases().map(a => a.maxbet));
    }

    unmatchedMrk = [...mrkLeagues.values()]
        .filter(v => !otherLeagues.has(v.original) && !aliasedMrk.has(v.original))
        .sort((a, b) => a.original.localeCompare(b.original))
        .map(v => ({ name: v.original, leagues: [`${v.count} matches`] }));

    unmatchedMbx = [...otherLeagues.values()]
        .filter(v => !mrkLeagues.has(v.original) && !aliasedOther.has(v.original))
        .sort((a, b) => a.original.localeCompare(b.original))
        .map(v => ({ name: v.original, leagues: [`${v.count} matches`] }));

    document.getElementById('tabUnmatchedCount').textContent =
        unmatchedMrk.length + unmatchedMbx.length;
}

function renderPicker() {
    const q = filterQuery;

    // Update right column header to reflect current target
    const isSbt = pickerTarget === 'sbt';
    document.getElementById('pickerOtherDot').className = isSbt ? 'am-bk-dot am-bk-s' : 'am-bk-dot am-bk-b';
    document.getElementById('pickerOtherLabel').textContent = isSbt ? 'SoccerBet' : 'MaxBet';

    const filteredMrk = unmatchedMrk.filter(t =>
        !q || t.name.toLowerCase().includes(q) ||
        t.leagues.some(l => l.toLowerCase().includes(q))
    );
    const filteredMbx = unmatchedMbx.filter(t =>
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
        : `<div class="am-picker-empty">All matched ✓</div>`;

    document.getElementById('listMbx').innerHTML = filteredMbx.length
        ? filteredMbx.map(t => `
        <div class="am-pick-item${selMbx === t.name ? ' selected' : ''}"
             data-name="${esc(t.name)}" data-side="mbx">
          <div class="am-pick-name">${esc(t.name)}</div>
          <div class="am-pick-leagues">${t.leagues.slice(0, 2).map(l => esc(l)).join(' · ')}</div>
        </div>`).join('')
        : `<div class="am-picker-empty">All matched ✓</div>`;

    document.getElementById('pendingMrk').textContent = selMrk || '—';
    document.getElementById('pendingMbx').textContent = selMbx || '—';
    document.getElementById('btnSavePair').disabled = !(selMrk && selMbx);
}

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
        if (pickerTarget === 'sbt') {
            if (leagueMode) {
                await addSoccerbetLeagueAlias(mrk, mbx);
                renderSbtLeagueList();
            } else {
                await addSoccerbetTeamAlias(mrk, mbx);
                renderSbtTeamList();
            }
        } else {
            if (leagueMode) {
                await addLeagueAlias(mrk, mbx);
                renderLeagueList();
            } else {
                await addTeamAlias(mrk, mbx);
                renderTeamList();
            }
        }
        unmatchedMrk = unmatchedMrk.filter(t => t.name !== mrk);
        unmatchedMbx = unmatchedMbx.filter(t => t.name !== mbx);
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

async function init() {
    await loadAliasDB();
    renderTeamList();
    renderSbtTeamList();
    renderLeagueList();
    renderSbtLeagueList();
    renderGroupList();
}

init();
