/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ALIAS MANAGER v2 — UI LOGIC (Canonical Schema)
   Two modes: Browse (entity list + detail) | Discover (4-col live data)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── Bookie config ─────────────────────────────────────────── */
const CLOUDBET_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IkhKcDkyNnF3ZXBjNnF3LU9rMk4zV05pXzBrRFd6cEdwTzAxNlRJUjdRWDAiLCJ0eXAiOiJKV1QifQ.eyJhY2Nlc3NfdGllciI6InRyYWRpbmciLCJleHAiOjIwNjE1Mzc1MDIsImlhdCI6MTc0NjE3NzUwMiwianRpIjoiNTU1ODk0NjgtZjJhZi00ZGQ3LWE3MTQtZjNiNjgyMWU4OGRkIiwic3ViIjoiOGYwYTk5YTEtNTFhZi00YzJlLWFlNDUtY2MxNjgwNDVjZTc3IiwidGVuYW50IjoiY2xvdWRiZXQiLCJ1dWlkIjoiOGYwYTk5YTEtNTFhZi00YzJlLWFlNDUtY2MxNjgwNDVjZTc3In0.BW_nXSwTkxTI7C-1UzgxWLnNzo9Bo1Ed8hI9RfVLnrJa6sfsMyvQ1NrtT5t6i_emwhkRHU1hY-9i6c2c5AI4fc2mRLSNBujvrfbVHX67uB58E8TeSOZUBRi0eqfLBL7sYl1JNPZzhFkDBCBNFJZJpn40FIjIrtIiPd-G5ClaaSMRWrFUDiwA1NmyxHSfkfRpeRSnfk15qck7zSIeNeITzPbD7kZGDIeStmcHuiHfcQX3NaHaI0gyw60wmDgan83NpYQYRVLQ9C4icbNhel4n5H5FGFAxQS8IcvynqV8f-vz2t4BRGuYXBU8uhdYKgezhyQrSvX6NpwNPBJC8CWo2fA';

const APIS = {
    merkur:    'https://www.merkurxtip.rs/restapi/offer/en/init',
    maxbet:    'https://www.maxbet.rs/restapi/offer/en/init',
    soccerbet: 'https://www.soccerbet.rs/restapi/offer/en/init',
};

function getCloudbetUrl() {
    const now = Math.floor(Date.now() / 1000);
    return `https://sports-api.cloudbet.com/pub/v2/odds/events?sport=soccer&live=false&from=${now}&to=${now + 7 * 24 * 3600}&markets=soccer.match_odds&players=false&limit=2000`;
}

const BK_META = {
    merkur:    { dotCls: 'am-bk-m',  pillCls: 'am-bk-m',  label: 'MerkurXtip', shortLabel: 'MRK' },
    maxbet:    { dotCls: 'am-bk-b',  pillCls: 'am-bk-b',  label: 'MaxBet',      shortLabel: 'MAX' },
    soccerbet: { dotCls: 'am-bk-s',  pillCls: 'am-bk-s',  label: 'SoccerBet',   shortLabel: 'SBT' },
    cloudbet:  { dotCls: 'am-bk-cl', pillCls: 'am-bk-cl', label: 'Cloudbet',    shortLabel: 'CLB' },
};
const BK_KEYS = ['merkur', 'maxbet', 'soccerbet', 'cloudbet'];

/* ── Parse helpers ─────────────────────────────────────────── */
function isSbtOutright(m) {
    const lg = (m.leagueName || '').toLowerCase(), h = (m.home || '').toLowerCase(), a = (m.away || '').toLowerCase();
    return lg.includes('pobednik') || /\d{4}\/\d{2}/.test(lg) || h.includes('pobednik') || a.includes('pobednik');
}
function isMaxbetBonus(m) { return (m.leagueName || '').toLowerCase().includes('bonus'); }

function resolveCloudbetLeagueName(comp) {
    const rest = (comp.key || '').replace(/^soccer-/, '');
    if (!rest || !comp.name) return comp.name || '';
    const compSlug = comp.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let countrySlug = compSlug && rest.endsWith('-' + compSlug)
        ? rest.slice(0, -(compSlug.length + 1))
        : rest.split('-')[0];
    if (!countrySlug) return comp.name;
    return `${countrySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}: ${comp.name}`;
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

function parseForBookie(key, data) {
    if (key === 'cloudbet') return parseCloudbetRaw(data);
    const matches = (data.esMatches || []).filter(m => m.sport === 'S');
    if (key === 'soccerbet') return matches.filter(m => !isSbtOutright(m));
    if (key === 'maxbet') return matches.filter(m => !isMaxbetBonus(m));
    return matches;
}

/* ── State ─────────────────────────────────────────────────── */
let mode             = 'browse';
let entityType       = 'teams';
let browseSearch     = '';
let browsePartialOnly = false;
let browseActiveOnly  = false;
let selectedId       = null;
let addAliasBk       = 'merkur';

let discEntityType    = 'teams';
let discLoaded        = false;
let discGlobalSearch  = '';
let discColSearch     = { merkur: '', maxbet: '', soccerbet: '', cloudbet: '' }; // per-column search filter
let discUnmappedOnly = false;
let discPartialOnly  = false; // partially mapped only filter
let discLeagueFilter = ''; // league filter for teams mode
let discData         = { merkur: [], maxbet: [], soccerbet: [], cloudbet: [] };
let discSel          = { merkur: null, maxbet: null, soccerbet: null, cloudbet: null };
let discAutoSel      = { merkur: null, maxbet: null, soccerbet: null, cloudbet: null }; // auto-suggested (not manually confirmed)
let discAssignSearch = '';
let discAssignSelId  = null;   // canonical id chosen in assign panel
let discSaving       = false;

/* ── Cached mappings for discover mode (avoid repeated API calls) ── */
let _discAliasCache = null;      // Map<"bk:rawName", alias object>
let _discCanonicalCache = null;  // Map<canonical_id, canonical name>

let _nameCacheLoaded = false;
let _liveMatchesCache = null; // Cache for live matches by bookie

/* ── Utils ─────────────────────────────────────────────────── */
function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function normName(s) {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokenJaccard(a, b) {
    const tA = new Set(a.split(' ').filter(Boolean)), tB = new Set(b.split(' ').filter(Boolean));
    let inter = 0;
    for (const t of tA) if (tB.has(t)) inter++;
    const union = tA.size + tB.size - inter;
    return union === 0 ? 0 : inter / union;
}
function nameSim(a, b) {
    const na = normName(a), nb = normName(b);
    if (na === nb) return 1;
    const jac = tokenJaccard(na, nb);
    return Math.min(1, jac + ((na.includes(nb) || nb.includes(na)) ? 0.25 : 0));
}

/* ── Toast ─────────────────────────────────────────────────── */
let _toastTimer;
function toast(msg, type = 'ok') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `am-toast show am-toast-${type}`;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MODE SWITCHING
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function setMode(m) {
    mode = m;
    document.querySelectorAll('.am-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    document.querySelectorAll('.am-mode-panel').forEach(p => p.classList.toggle('active', p.id === `mode${m.charAt(0).toUpperCase() + m.slice(1)}`));
}
document.querySelectorAll('.am-mode-btn').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BROWSE MODE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── Entity type toggle ────────────────────────────────────── */
document.querySelectorAll('.am-ent-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
        entityType = btn.dataset.type;
        selectedId = null;
        browseSearch = '';
        browsePartialOnly = false;
        browseActiveOnly  = false;
        document.getElementById('browseSearch').value = '';
        document.getElementById('chkBrowsePartial').checked = false;
        document.getElementById('chkBrowseActive').checked = false;
        document.querySelectorAll('.am-ent-btn[data-type]').forEach(b => b.classList.toggle('active', b.dataset.type === entityType));
        renderBrowseList();
        renderBrowseDetail();
    });
});

document.getElementById('browseSearch').addEventListener('input', e => {
    browseSearch = e.target.value.toLowerCase();
    renderBrowseList();
});

document.getElementById('chkBrowsePartial').addEventListener('change', e => {
    browsePartialOnly = e.target.checked;
    renderBrowseList();
});

document.getElementById('chkBrowseActive').addEventListener('change', async e => {
    browseActiveOnly = e.target.checked;
    if (browseActiveOnly && !_liveMatchesCache) await ensureNameCache();
    renderBrowseList();
});

/* ── Browse list ───────────────────────────────────────────── */
function getEnrichedList() {
    const entities  = entityType === 'teams' ? getCanonicalTeams() : getCanonicalLeagues();
    const allAliases = entityType === 'teams' ? getBookieTeamAliases() : getBookieLeagueAliases();
    const q = browseSearch;
    return entities
        .filter(e => !q || e.name.toLowerCase().includes(q))
        .map(e => {
            const aliases = allAliases.filter(a => a.canonical_id === e.id);
            const cov = {};
            BK_KEYS.forEach(bk => { cov[bk] = aliases.some(a => a.bookie_key === bk); });
            return { ...e, aliases, cov };
        })
        .filter(e => {
            if (!browsePartialOnly) return true;
            const covCount = BK_KEYS.filter(bk => e.cov[bk]).length;
            return covCount > 0 && covCount < BK_KEYS.length;
        })
        .filter(e => {
            if (!browseActiveOnly || !_liveMatchesCache) return true;
            return e.aliases.some(a => {
                const matches = _liveMatchesCache[a.bookie_key];
                if (!matches) return false;
                if (entityType === 'leagues') return matches.some(m => m.leagueName === a.raw_name);
                return matches.some(m => m.home === a.raw_name || m.away === a.raw_name);
            });
        });
}

function renderBrowseList() {
    const teams   = getCanonicalTeams();
    const leagues = getCanonicalLeagues();
    document.getElementById('browseTeamCount').textContent   = teams.length;
    document.getElementById('browseLeagueCount').textContent = leagues.length;

    const list = getEnrichedList();
    const el   = document.getElementById('browseList');
    if (!list.length) {
        el.innerHTML = `<div class="am-empty">${browseSearch ? `No results for "${esc(browseSearch)}"` : 'No entities yet — click + New to create one.'}</div>`;
        return;
    }
    el.innerHTML = list.map(e => {
        // Build tooltip with mapped aliases for this entity
        const aliasByBk = {};
        BK_KEYS.forEach(bk => {
            const bkAliases = e.aliases.filter(a => a.bookie_key === bk);
            if (bkAliases.length) {
                aliasByBk[bk] = bkAliases.map(a => a.raw_name).join('\n  • ');
            }
        });
        const tooltipParts = [];
        BK_KEYS.forEach(bk => {
            if (aliasByBk[bk]) {
                tooltipParts.push(`${BK_META[bk].label}:\n  • ${aliasByBk[bk]}`);
            }
        });
        const tooltip = tooltipParts.length ? tooltipParts.join('\n') : 'No aliases mapped';
        
        return `<div class="am-browse-item${selectedId === e.id ? ' selected' : ''}" data-id="${e.id}" title="${esc(tooltip)}">
            <div class="am-browse-name">${esc(e.name)}</div>
            <div class="am-browse-bks">
                ${BK_KEYS.map(bk => `<span class="am-bk-dot ${BK_META[bk].dotCls}${e.cov[bk] ? '' : ' am-dot-dim'}" title="${BK_META[bk].label}"></span>`).join('')}
            </div>
        </div>`;
    }).join('');
}

document.getElementById('browseList').addEventListener('click', e => {
    const item = e.target.closest('.am-browse-item');
    if (!item) return;
    selectedId = parseInt(item.dataset.id, 10);
    renderBrowseList();
    renderBrowseDetail();
});

/* ── Browse detail ─────────────────────────────────────────── */
function renderBrowseDetail() {
    const el = document.getElementById('browseDetail');
    if (!selectedId) {
        el.innerHTML = `<div class="am-detail-empty">Select an entity from the left</div>`;
        return;
    }
    const entities  = entityType === 'teams' ? getCanonicalTeams() : getCanonicalLeagues();
    const entity    = entities.find(e => e.id === selectedId);
    if (!entity) { el.innerHTML = `<div class="am-detail-empty">Entity not found</div>`; return; }

    const aliases    = (entityType === 'teams' ? getBookieTeamAliases() : getBookieLeagueAliases())
        .filter(a => a.canonical_id === selectedId);

    // Alias rows grouped by bookie
    const aliasRows = BK_KEYS.map(bk => {
        const bkAliases = aliases.filter(a => a.bookie_key === bk);
        if (!bkAliases.length) return `
            <div class="am-detail-bk-row am-detail-bk-empty">
                <span class="am-bk-dot ${BK_META[bk].dotCls} am-dot-dim"></span>
                <span class="am-detail-no-alias">${BK_META[bk].label} — no alias</span>
            </div>`;
        return bkAliases.map(a => {
            // For leagues, get matches from live data for tooltip
            let tooltip = '';
            if (entityType === 'leagues') {
                const matches = getMatchesForLeague(bk, a.raw_name);
                if (matches.length > 0) {
                    tooltip = `Matches:\n${matches.map(m => `  • ${m}`).join('\n')}`;
                } else {
                    tooltip = 'No current matches';
                }
            }
            return `<div class="am-detail-bk-row${entityType === 'leagues' ? ' am-detail-row-hover' : ''}" ${tooltip ? `title="${esc(tooltip)}"` : ''}>
                <span class="am-bk-pill ${BK_META[bk].pillCls}">${BK_META[bk].shortLabel}</span>
                <span class="am-detail-alias-name">${esc(a.raw_name)}</span>
                <span class="am-detail-alias-date">${fmtDate(a.created_at)}</span>
                <button class="am-alias-del" data-alias-id="${a.id}" title="Remove">✕</button>
            </div>`;
        }).join('');
    }).join('');

    // League-only fields
    const leagueFields = entityType === 'leagues' ? `
        <div class="am-detail-section">
            <div class="am-detail-section-title">League settings</div>
            <div class="am-detail-field">
                <label class="am-label">Display name</label>
                <div class="am-detail-field-row">
                    <input class="am-input" id="fldDisplayName" value="${esc(entity.display_name || '')}" placeholder="Custom UI label…" />
                    <button class="am-btn am-btn-ghost am-field-save" data-field="display_name">Save</button>
                </div>
            </div>
            <div class="am-detail-field">
                <label class="am-label">Country</label>
                <div class="am-detail-field-row">
                    <input class="am-input" id="fldCountry" value="${esc(entity.country || '')}" placeholder="e.g. England" />
                    <button class="am-btn am-btn-ghost am-field-save" data-field="country">Save</button>
                </div>
            </div>
            <div class="am-detail-field">
                <label class="am-label">Group</label>
                <div class="am-detail-field-row">
                    <input class="am-input" id="fldGroupName" value="${esc(entity.group_name || '')}" placeholder="e.g. International" />
                    <button class="am-btn am-btn-ghost am-field-save" data-field="group_name">Save</button>
                </div>
            </div>
        </div>` : '';

    const dlMap = {
        merkur:    entityType === 'teams' ? 'dlMrkTeams' : 'dlMrkLeagues',
        maxbet:    entityType === 'teams' ? 'dlMaxTeams' : 'dlMaxLeagues',
        soccerbet: entityType === 'teams' ? 'dlSbtTeams' : 'dlSbtLeagues',
        cloudbet:  entityType === 'teams' ? 'dlClbTeams' : 'dlClbLeagues',
    };

    el.innerHTML = `
        <div class="am-detail-inner">
            <div class="am-detail-header">
                <div class="am-detail-title">${esc(entity.name)}</div>
                <button class="am-btn am-btn-danger am-detail-delete" data-id="${entity.id}">✕ Delete</button>
            </div>

            <div class="am-detail-aliases">${aliasRows}</div>

            <div class="am-detail-add-form">
                <select class="am-input am-detail-bk-sel" id="addAliasBkSel">
                    ${BK_KEYS.map(bk => `<option value="${bk}"${bk === addAliasBk ? ' selected' : ''}>${BK_META[bk].label}</option>`).join('')}
                </select>
                <input class="am-input" id="addAliasRaw" list="${dlMap[addAliasBk]}"
                       placeholder="Raw name on bookie…" autocomplete="off" />
                <button class="am-btn am-btn-primary" id="btnAddAlias">+ Add</button>
            </div>

            ${leagueFields}
        </div>`;

    // Bookie selector → update datalist
    document.getElementById('addAliasBkSel').addEventListener('change', e => {
        addAliasBk = e.target.value;
        document.getElementById('addAliasRaw').setAttribute('list', dlMap[addAliasBk]);
    });

    // Save league field
    el.querySelectorAll('.am-field-save').forEach(btn => {
        btn.addEventListener('click', async () => {
            const field = btn.dataset.field;
            const inputMap = { display_name: 'fldDisplayName', country: 'fldCountry', group_name: 'fldGroupName' };
            const val = document.getElementById(inputMap[field])?.value.trim() || null;
            try {
                await updateCanonical('leagues', selectedId, { [field]: val || null });
                toast(`Saved: ${field.replace('_', ' ')}`);
                renderBrowseList();
            } catch (e) { toast('Save failed: ' + e.message, 'err'); }
        });
    });

    // Delete alias
    el.querySelector('.am-detail-aliases').addEventListener('click', async e => {
        const btn = e.target.closest('.am-alias-del');
        if (!btn) return;
        if (!confirm('Remove this alias?')) return;
        try {
            await removeBookieAlias(entityType, parseInt(btn.dataset.aliasId, 10));
            renderBrowseList();
            renderBrowseDetail();
            toast('Alias removed', 'warn');
        } catch (e) { toast('Remove failed: ' + e.message, 'err'); }
    });

    // Delete entity
    el.querySelector('.am-detail-delete').addEventListener('click', async () => {
        if (!confirm(`Delete canonical entity "${entity.name}" and all its aliases? This cannot be undone.`)) return;
        try {
            await deleteCanonical(entityType, entity.id);
            selectedId = null;
            renderBrowseList();
            renderBrowseDetail();
            toast('Entity deleted', 'warn');
        } catch (e) { toast('Delete failed: ' + e.message, 'err'); }
    });

    // Add alias button
    document.getElementById('btnAddAlias').addEventListener('click', async () => {
        const bk  = document.getElementById('addAliasBkSel').value;
        const raw = document.getElementById('addAliasRaw').value.trim();
        if (!raw) { toast('Enter a name first', 'err'); return;  }
        try {
            await addBookieAlias(entityType, bk, raw, selectedId);
            document.getElementById('addAliasRaw').value = '';
            renderBrowseList();
            renderBrowseDetail();
            toast(`Added: [${BK_META[bk].shortLabel}] ${raw}`);
        } catch (e) { toast('Add failed: ' + e.message, 'err'); }
    });

    ensureNameCache();
}

/* ── New entity ────────────────────────────────────────────── */
document.getElementById('btnNewEntity').addEventListener('click', () => {
    document.getElementById('newEntityModalTitle').textContent = entityType === 'teams' ? 'New Team' : 'New League';
    document.getElementById('newEntityLeagueFields').style.display = entityType === 'leagues' ? '' : 'none';
    document.getElementById('newEntityName').value = '';
    document.getElementById('newEntityCountry').value = '';
    document.getElementById('newEntityGroup').value = '';
    document.getElementById('newEntityDisplay').value = '';
    document.getElementById('newEntityModal').classList.add('open');
    document.getElementById('newEntityName').focus();
});

document.getElementById('btnNewEntityCancel').addEventListener('click', () => {
    document.getElementById('newEntityModal').classList.remove('open');
});

document.getElementById('newEntityName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btnNewEntityConfirm').click();
});

document.getElementById('btnNewEntityConfirm').addEventListener('click', async () => {
    const name = document.getElementById('newEntityName').value.trim();
    if (!name) { toast('Name is required', 'err'); return; }
    try {
        const extras = {
            country:      document.getElementById('newEntityCountry')?.value.trim() || null,
            group_name:   document.getElementById('newEntityGroup')?.value.trim() || null,
            display_name: document.getElementById('newEntityDisplay')?.value.trim() || null,
        };
        const entity = await addCanonical(entityType, name, extras);
        document.getElementById('newEntityModal').classList.remove('open');
        selectedId = entity.id;
        browseSearch = '';
        document.getElementById('browseSearch').value = '';
        renderBrowseList();
        renderBrowseDetail();
        toast(`Created: ${name}`);
        // Scroll new item into view
        setTimeout(() => {
            const el = document.querySelector(`.am-browse-item[data-id="${entity.id}"]`);
            if (el) el.scrollIntoView({ block: 'nearest' });
        }, 50);
    } catch (e) { toast('Create failed: ' + e.message, 'err'); }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DISCOVER MODE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── Entity type toggle ────────────────────────────────────── */
document.querySelectorAll('.am-ent-btn[data-disc-type]').forEach(btn => {
    btn.addEventListener('click', () => {
        discEntityType = btn.dataset.discType;
        discSel       = { merkur: null, maxbet: null, soccerbet: null, cloudbet: null };
        discAutoSel   = { merkur: null, maxbet: null, soccerbet: null, cloudbet: null };
        discColSearch = { merkur: '', maxbet: '', soccerbet: '', cloudbet: '' };
        discGlobalSearch = '';
        discAssignSelId = null;
        discLeagueFilter = '';
        discPartialOnly = false;
        // Clear cache when switching entity type
        _discAliasCache = null;
        _discCanonicalCache = null;
        document.getElementById('discGlobalSearch').value = '';
        BK_KEYS.forEach(bk => {
            const inp = document.getElementById(`discSearch_${bk}`);
            if (inp) inp.value = '';
        });
        // Show/hide league filter based on entity type
        document.getElementById('discLeagueFilterWrap').style.display = discEntityType === 'teams' ? '' : 'none';
        document.getElementById('discLeagueFilter').value = '';
        document.getElementById('chkDiscPartial').checked = false;
        document.querySelectorAll('.am-ent-btn[data-disc-type]').forEach(b => b.classList.toggle('active', b.dataset.discType === discEntityType));
        if (discLoaded) renderDiscoverColumns();
        renderDiscoverAssign();
    });
});

/* ── Global search ──────────────────────────────────────────── */
document.getElementById('discGlobalSearch').addEventListener('input', e => {
    discGlobalSearch = e.target.value.toLowerCase();
    if (discLoaded) renderDiscoverColumns();
});

/* ── League filter dropdown ─────────────────────────────────── */
document.getElementById('discLeagueFilter').addEventListener('change', e => {
    discLeagueFilter = e.target.value;
    if (discLoaded) renderDiscoverColumns();
});

document.getElementById('chkDiscUnmapped').addEventListener('change', e => {
    discUnmappedOnly = e.target.checked;
    if (discUnmappedOnly && discPartialOnly) {
        discPartialOnly = false;
        document.getElementById('chkDiscPartial').checked = false;
    }
    if (discLoaded) renderDiscoverColumns();
});

document.getElementById('chkDiscPartial').addEventListener('change', e => {
    discPartialOnly = e.target.checked;
    if (discPartialOnly && discUnmappedOnly) {
        discUnmappedOnly = false;
        document.getElementById('chkDiscUnmapped').checked = false;
    }
    if (discLoaded) renderDiscoverColumns();
});

/* ── Per-column search inputs ──────────────────────────────── */
BK_KEYS.forEach(bk => {
    document.getElementById(`discSearch_${bk}`).addEventListener('input', e => {
        discColSearch[bk] = e.target.value.toLowerCase();
        if (discLoaded) renderDiscoverColumns();
    });
});

/* ── Load live data ────────────────────────────────────────── */
document.getElementById('btnDiscLoad').addEventListener('click', loadDiscoverData);

async function loadDiscoverData() {
    const btn = document.getElementById('btnDiscLoad');
    btn.disabled = true; btn.textContent = '⟳ Loading…';
    try {
        const responses = await Promise.all([
            fetch(APIS.merkur),
            fetch(APIS.maxbet),
            fetch(APIS.soccerbet),
            fetch(getCloudbetUrl(), { headers: { 'X-API-Key': CLOUDBET_KEY } }),
        ]);
        const jsons = await Promise.all(responses.map(r => r.json()));

        BK_KEYS.forEach((bk, i) => {
            const matches = parseForBookie(bk, jsons[i]);
            if (discEntityType === 'leagues') {
                const byLeague = new Map();
                matches.forEach(m => {
                    if (!byLeague.has(m.leagueName)) byLeague.set(m.leagueName, []);
                    byLeague.get(m.leagueName).push(`${m.home} vs ${m.away}`);
                });
                discData[bk] = [...byLeague.entries()].map(([name, games]) => ({ 
                    name, 
                    info: `${games.length} matches`,
                    matches: games
                })).sort((a, b) => a.name.localeCompare(b.name));
            } else {
                const byTeam = new Map();
                matches.forEach(m => {
                    [m.home, m.away].forEach(t => {
                        if (!byTeam.has(t)) byTeam.set(t, []);
                        byTeam.get(t).push({ league: m.leagueName, opponent: t === m.home ? m.away : m.home });
                    });
                });
                discData[bk] = [...byTeam.entries()].map(([name, teamMatches]) => ({ 
                    name, 
                    info: teamMatches.slice(0, 2).map(m => m.league).join(' · '),
                    matches: teamMatches.map(m => `${m.league}: vs ${m.opponent}`)
                })).sort((a, b) => a.name.localeCompare(b.name));
            }
        });

        discLoaded    = true;
        discSel       = { merkur: null, maxbet: null, soccerbet: null, cloudbet: null };
        discAutoSel   = { merkur: null, maxbet: null, soccerbet: null, cloudbet: null };
        discColSearch = { merkur: '', maxbet: '', soccerbet: '', cloudbet: '' };
        discGlobalSearch = '';
        discAssignSelId = null;
        discLeagueFilter = '';
        discPartialOnly = false;
        document.getElementById('discGlobalSearch').value = '';
        document.getElementById('chkDiscPartial').checked = false;

        // Build cached mappings for fast lookup
        _discAliasCache = buildDiscAliasCache();
        _discCanonicalCache = buildDiscCanonicalCache();

        // Populate league filter dropdown with canonical leagues (only for teams mode)
        const leagueFilterEl = document.getElementById('discLeagueFilter');
        const leagueFilterWrap = document.getElementById('discLeagueFilterWrap');
        if (discEntityType === 'teams') {
            const canonicalLeagues = getCanonicalLeagues();
            const leagueAliases = getBookieLeagueAliases();
            
            // Build a map: canonical_id -> set of raw league names across all bookies
            const canonicalToRawLeagues = new Map();
            canonicalLeagues.forEach(l => {
                canonicalToRawLeagues.set(l.id, new Set());
            });
            leagueAliases.forEach(a => {
                const set = canonicalToRawLeagues.get(a.canonical_id);
                if (set) set.add(a.raw_name);
            });
            
            // Store for filtering use
            window._canonicalToRawLeagues = canonicalToRawLeagues;
            
            // Sort canonical leagues by name
            const sortedLeagues = [...canonicalLeagues].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            leagueFilterEl.innerHTML = '<option value="">All leagues</option>' +
                sortedLeagues.map(lg => `<option value="${lg.id}">${esc(lg.name)}</option>`).join('');
            leagueFilterWrap.style.display = '';
        } else {
            leagueFilterWrap.style.display = 'none';
        }

        // Clear search inputs and populate datalists
        BK_KEYS.forEach(bk => {
            const inp = document.getElementById(`discSearch_${bk}`);
            if (inp) inp.value = '';
            const dl = document.getElementById(`dlDisc_${bk}`);
            if (dl) dl.innerHTML = (discData[bk] || []).map(item => `<option value="${esc(item.name)}"></option>`).join('');
        });
        renderDiscoverColumns();
        renderDiscoverAssign();
        toast(`Loaded: ${discData.merkur.length} MRK · ${discData.maxbet.length} MAX · ${discData.soccerbet.length} SBT · ${discData.cloudbet.length} CLB items`);
    } catch (e) {
        toast('Load failed: ' + e.message, 'err');
    } finally {
        btn.disabled = false; btn.textContent = '⟳ Load Live Data';
    }
}

/* ── Cached mappings for discover mode (avoid repeated API calls) ── */
function buildDiscAliasCache() {
    const aliases = discEntityType === 'teams' ? getBookieTeamAliases() : getBookieLeagueAliases();
    const map = new Map();
    aliases.forEach(a => map.set(`${a.bookie_key}:${a.raw_name}`, a));
    return map;
}

function buildDiscCanonicalCache() {
    const entities = discEntityType === 'teams' ? getCanonicalTeams() : getCanonicalLeagues();
    const map = new Map();
    entities.forEach(e => map.set(e.id, e.name));
    return map;
}

/* ── Render discover columns ───────────────────────────────── */
function hasCanonicalAlias(bk, rawName) {
    if (!_discAliasCache) _discAliasCache = buildDiscAliasCache();
    return _discAliasCache.has(`${bk}:${rawName}`);
}

/* For each other bookie column that has no manual selection, pick the best
   name match and store it in discAutoSel. Threshold 0.45 catches things like
   "Arsenal" vs "Arsenal FC" (0.75) while filtering random false positives. */
function autoSelectCrossColumn(sourceBk, sourceName) {
    BK_KEYS.forEach(bk => {
        if (bk === sourceBk) return;
        if (discSel[bk]) return; // don't overwrite a manual selection
        const items = discData[bk] || [];
        if (!items.length) { discAutoSel[bk] = null; return; }
        const best = items
            .map(item => ({ name: item.name, score: nameSim(sourceName, item.name) }))
            .filter(item => item.score >= 0.45)
            .sort((a, b) => b.score - a.score)[0];
        discAutoSel[bk] = best?.name ?? null;
    });
}

function getCanonicalForAlias(bk, rawName) {
    if (!_discAliasCache) _discAliasCache = buildDiscAliasCache();
    if (!_discCanonicalCache) _discCanonicalCache = buildDiscCanonicalCache();
    const alias = _discAliasCache.get(`${bk}:${rawName}`);
    if (!alias) return null;
    return _discCanonicalCache.get(alias.canonical_id) || null;
}

function renderDiscoverColumns() {
    // Get the set of raw league names for the selected canonical league
    let filterLeagueNames = null;
    if (discEntityType === 'teams' && discLeagueFilter && window._canonicalToRawLeagues) {
        filterLeagueNames = window._canonicalToRawLeagues.get(parseInt(discLeagueFilter, 10));
    }
    
    BK_KEYS.forEach(bk => {
        const q = discColSearch[bk];

        // Keep datalist in sync with current entity type filter
        const dl = document.getElementById(`dlDisc_${bk}`);
        if (dl && discLoaded) {
            const src = discData[bk] || [];
            const names = src.filter(i => {
                const n = i.name.toLowerCase();
                return q ? n.includes(q) : (!discGlobalSearch || n.includes(discGlobalSearch));
            });
            dl.innerHTML = names.map(i => `<option value="${esc(i.name)}"></option>`).join('');
        }

        const items = discData[bk] || [];
        const filtered = items.filter(item => {
            const nameLC = item.name.toLowerCase();
            // Per-column search overrides global search for this column
            if (q) { if (!nameLC.includes(q)) return false; }
            else if (discGlobalSearch && !nameLC.includes(discGlobalSearch)) return false;
            
            const mapped = hasCanonicalAlias(bk, item.name);
            
            if (discUnmappedOnly && mapped) return false;
            
            // Partial mapped filter: show only items that are mapped but not across all bookies
            if (discPartialOnly) {
                if (!mapped) return false; // must be mapped in at least one bookie
                // Check if the canonical entity has aliases for all bookies
                const canonName = getCanonicalForAlias(bk, item.name);
                if (!canonName) return false;
                // Find the canonical entity and check its coverage
                const entities = discEntityType === 'teams' ? getCanonicalTeams() : getCanonicalLeagues();
                const canonEntity = entities.find(e => e.name === canonName);
                if (!canonEntity) return false;
                const allAliases = discEntityType === 'teams' ? getBookieTeamAliases() : getBookieLeagueAliases();
                const entityAliases = allAliases.filter(a => a.canonical_id === canonEntity.id);
                const coveredBookies = new Set(entityAliases.map(a => a.bookie_key));
                // Partial means not all 4 bookies are covered
                if (coveredBookies.size >= BK_KEYS.length) return false;
            }
            
            // Apply league filter for teams mode using canonical league mapping
            if (discEntityType === 'teams' && filterLeagueNames && filterLeagueNames.size > 0) {
                // Check if any of the team's matches are in a league that maps to the selected canonical league
                const hasLeague = item.matches && item.matches.some(m => {
                    // Extract league name from match string (format: "league: vs opponent")
                    const leagueName = m.split(': ')[0];
                    // Check if this raw league name is mapped to the selected canonical league
                    return filterLeagueNames.has(leagueName);
                });
                if (!hasLeague) return false;
            }
            return true;
        });

        document.getElementById(`discCount_${bk}`).textContent = filtered.length;
        const list = document.getElementById(`discList_${bk}`);

        if (!filtered.length) {
            list.innerHTML = `<div class="am-picker-empty">${discLoaded ? (discUnmappedOnly ? 'All mapped ✓' : (discPartialOnly ? 'No partial mapped' : 'No items')) : 'Click "Load Live Data" to start'}</div>`;
            return;
        }

        list.innerHTML = filtered.map(item => {
            const mapped      = hasCanonicalAlias(bk, item.name);
            const canonName   = mapped ? getCanonicalForAlias(bk, item.name) : null;
            const isManual    = discSel[bk] === item.name;
            const isAuto      = !isManual && discAutoSel[bk] === item.name;
            const cls         = isManual ? ' selected' : isAuto ? ' am-disc-item-auto' : '';
            const infoHtml    = mapped
                ? `<span class="am-disc-mapped-label">↳ ${esc(canonName || '?')}</span>`
                : isAuto
                    ? `<span class="am-disc-auto-label">≈ auto-suggested</span>`
                    : esc(item.info);
            const tooltip     = item.matches ? item.matches.slice(0, 10).join('\n') + (item.matches.length > 10 ? `\n... and ${item.matches.length - 10} more` : '') : '';
            return `<div class="am-disc-item${cls}${mapped ? ' am-disc-item-mapped' : ''}"
                        data-bk="${bk}" data-name="${esc(item.name)}" title="${esc(tooltip)}">
                <div class="am-disc-item-name">${esc(item.name)}</div>
                <div class="am-disc-item-info">${infoHtml}</div>
            </div>`;
        }).join('');
    });
}

/* ── Column click delegation ───────────────────────────────── */
document.getElementById('discColumns').addEventListener('click', e => {
    const item = e.target.closest('.am-disc-item');
    if (!item) return;
    const { bk, name } = item.dataset;

    if (discSel[bk] === name) {
        // Deselect manual → clear manual + all auto-suggestions
        discSel[bk] = null;
        discAutoSel[bk] = null;
        if (!BK_KEYS.some(k => discSel[k])) {
            BK_KEYS.forEach(k => { discAutoSel[k] = null; });
        }
    } else if (discAutoSel[bk] === name) {
        // Confirm auto-suggestion → promote to manual (no new auto-suggests needed)
        discAutoSel[bk] = null;
        discSel[bk] = name;
    } else {
        // New manual selection → auto-suggest remaining columns
        discSel[bk] = name;
        discAutoSel[bk] = null;
        autoSelectCrossColumn(bk, name);
    }

    discAssignSearch = '';
    discAssignSelId  = null;
    renderDiscoverColumns();
    renderDiscoverAssign();
});

/* ── Render assign panel ───────────────────────────────────── */
function computeDiscoverSuggestions() {
    const entities = discEntityType === 'teams' ? getCanonicalTeams() : getCanonicalLeagues();
    if (!entities.length) return [];
    // Use all selected names (manual + auto) — score = best match across any of them
    const selectedNames = BK_KEYS.map(bk => discSel[bk] || discAutoSel[bk]).filter(Boolean);
    if (!selectedNames.length) return [];
    return entities
        .map(e => ({ ...e, score: Math.max(...selectedNames.map(n => nameSim(n, e.name))) }))
        .filter(e => e.score >= 0.25)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
}

function renderDiscoverAssign() {
    const el = document.getElementById('discAssign');
    // Collect manual + auto selections for display
    const selected = BK_KEYS
        .map(bk => ({ bk, name: discSel[bk] || discAutoSel[bk], isAuto: !discSel[bk] && !!discAutoSel[bk] }))
        .filter(s => s.name);
    if (!selected.length) {
        el.innerHTML = `<div class="am-assign-empty">Select names from the columns to map them</div>`;
        return;
    }

    const selectedChips = selected.map(({ bk, name, isAuto }) => `
        <div class="am-assign-sel-item${isAuto ? ' am-assign-sel-auto' : ''}">
            <span class="am-bk-pill ${BK_META[bk].pillCls}">${BK_META[bk].shortLabel}</span>
            <span class="am-assign-sel-name">${esc(name)}${isAuto ? ' <em class="am-sel-auto-badge">auto</em>' : ''}</span>
            <button class="am-assign-sel-del" data-bk="${bk}" title="Deselect">✕</button>
        </div>`).join('');

    const suggestions = computeDiscoverSuggestions();
    const entities    = discEntityType === 'teams' ? getCanonicalTeams() : getCanonicalLeagues();
    const q = discAssignSearch.toLowerCase();
    const filtered = q
        ? entities.filter(e => e.name.toLowerCase().includes(q))
        : suggestions;

    const canonList = filtered.map(e => `
        <div class="am-assign-canon-item${discAssignSelId === e.id ? ' selected' : ''}" data-can-id="${e.id}">
            <div class="am-assign-canon-name">${esc(e.name)}</div>
            ${e.score !== undefined ? `<div class="am-assign-canon-score">${Math.round(e.score * 100)}%</div>` : ''}
        </div>`).join('') || `<div class="am-sug-empty">${q ? `No canonicals match "${esc(discAssignSearch)}"` : 'No suggestions'}</div>`;

    const canCreate = discAssignSearch.trim() && !entities.some(e => e.name.toLowerCase() === discAssignSearch.trim().toLowerCase());

    el.innerHTML = `
        <div class="am-assign-inner">
            <div class="am-assign-section-title">Selected</div>
            <div class="am-assign-selected">${selectedChips}</div>

            <div class="am-assign-section-title" style="margin-top:12px;">Assign to canonical</div>
            <div class="am-assign-search-row">
                <input class="am-input" id="discAssignSearch" value="${esc(discAssignSearch)}" placeholder="Search or type new name…" autocomplete="off" />
            </div>

            <div class="am-assign-canon-list">${canonList}</div>

            ${canCreate ? `<button class="am-btn am-btn-ghost am-assign-create-btn">+ Create "${esc(discAssignSearch.trim())}"</button>` : ''}

            <div class="am-assign-actions">
                <button class="am-btn am-btn-primary" id="btnDiscSave"${discAssignSelId ? '' : ' disabled'}>Save Mapping</button>
                <button class="am-btn am-btn-ghost" id="btnDiscClear">Clear</button>
            </div>
        </div>`;

    // Search input
    document.getElementById('discAssignSearch').addEventListener('input', e => {
        discAssignSearch = e.target.value;
        discAssignSelId  = null;
        const cursorPos = e.target.selectionStart;
        renderDiscoverAssign();
        const input = document.getElementById('discAssignSearch');
        if (input) {
            input.focus();
            input.setSelectionRange(cursorPos, cursorPos);
        }
    });

    // Select canonical
    el.querySelectorAll('.am-assign-canon-item').forEach(item => {
        item.addEventListener('click', () => {
            discAssignSelId = parseInt(item.dataset.canId, 10);
            renderDiscoverAssign();
        });
    });

    // Create new canonical
    el.querySelector('.am-assign-create-btn')?.addEventListener('click', async () => {
        const name = discAssignSearch.trim();
        if (!name) return;
        try {
            const entity = await addCanonical(discEntityType, name);
            discAssignSelId  = entity.id;
            discAssignSearch = '';
            renderDiscoverAssign();
            toast(`Created: ${name}`);
        } catch (e) { toast('Create failed: ' + e.message, 'err'); }
    });

    // Save mapping
    document.getElementById('btnDiscSave')?.addEventListener('click', saveDiscoverMapping);

    // Clear selection
    document.getElementById('btnDiscClear')?.addEventListener('click', () => {
        discSel     = { merkur: null, maxbet: null, soccerbet: null, cloudbet: null };
        discAutoSel = { merkur: null, maxbet: null, soccerbet: null, cloudbet: null };
        discAssignSelId  = null;
        discAssignSearch = '';
        renderDiscoverColumns();
        renderDiscoverAssign();
    });

    // Deselect individual
    el.querySelectorAll('.am-assign-sel-del').forEach(btn => {
        btn.addEventListener('click', () => {
            discSel[btn.dataset.bk]     = null;
            discAutoSel[btn.dataset.bk] = null;
            discAssignSelId = null;
            discAssignSearch = '';
            renderDiscoverColumns();
            renderDiscoverAssign();
        });
    });
}

async function saveDiscoverMapping() {
    if (!discAssignSelId || discSaving) return;
    discSaving = true;
    const btn = document.getElementById('btnDiscSave');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    const selected = BK_KEYS
        .map(bk => ({ bk, name: discSel[bk] || discAutoSel[bk] }))
        .filter(s => s.name);
    
    let saved = 0, failed = 0;
    for (const { bk, name } of selected) {
        try {
            await addBookieAlias(discEntityType, bk, name, discAssignSelId);
            saved++;
        } catch (e) {
            console.error('[aliases] Failed to save alias:', bk, name, e.message);
            failed++;
        }
    }

    // Remove saved items from selections
    selected.forEach(({ bk }) => { discSel[bk] = null; discAutoSel[bk] = null; });
    discAssignSelId  = null;
    discAssignSearch = '';
    discSaving       = false;

    // Invalidate cache after saving new mappings
    _discAliasCache = null;
    _discCanonicalCache = null;

    // Clear search input field
    const searchInput = document.getElementById('discAssignSearch');
    if (searchInput) searchInput.value = '';

    renderDiscoverColumns();
    renderDiscoverAssign();
    if (mode === 'browse') renderBrowseList();

    if (failed) toast(`Saved ${saved}, ${failed} failed`, 'warn');
    else toast(`Saved ${saved} alias${saved !== 1 ? 'es' : ''}`);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   IMPORT / CLEAR ALL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('importModal').classList.add('open');
});
document.getElementById('btnImportCancel').addEventListener('click', () => {
    document.getElementById('importModal').classList.remove('open');
});
document.getElementById('btnImportConfirm').addEventListener('click', async () => {
    try {
        const text = document.getElementById('importText').value;
        await importAliasesFromJSON(text);
        document.getElementById('importModal').classList.remove('open');
        renderBrowseList();
        renderBrowseDetail();
        toast('Import complete. Data uploaded to Supabase.');
    } catch (e) {
        toast('Import failed: ' + e.message, 'err');
    }
});

document.getElementById('btnClearAll').addEventListener('click', async () => {
    const teams   = getCanonicalTeams().length;
    const leagues = getCanonicalLeagues().length;
    const aliases = getBookieTeamAliases().length + getBookieLeagueAliases().length;
    if (!confirm(`Delete ALL ${teams + leagues} canonical entities and ${aliases} aliases? This cannot be undone.`)) return;
    try {
        await Promise.all([
            supa.from('bookie_team_aliases').delete().not('id', 'is', null),
            supa.from('bookie_league_aliases').delete().not('id', 'is', null),
        ]);
        await Promise.all([
            supa.from('canonical_teams').delete().not('id', 'is', null),
            supa.from('canonical_leagues').delete().not('id', 'is', null),
        ]);
        await reloadCanonicalDB();
        selectedId = null;
        renderBrowseList();
        renderBrowseDetail();
        toast('All aliases cleared', 'warn');
    } catch (e) {
        toast('Clear failed: ' + e.message, 'err');
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    NAME CACHE (background datalist population)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function ensureNameCache() {
    if (_nameCacheLoaded) return;
    _nameCacheLoaded = true;
    try {
        const [rMrk, rMax, rSbt, rClb] = await Promise.all([
            fetch(APIS.merkur),
            fetch(APIS.maxbet),
            fetch(APIS.soccerbet),
            fetch(getCloudbetUrl(), { headers: { 'X-API-Key': CLOUDBET_KEY } }),
        ]);
        const [dMrk, dMax, dSbt, dClb] = await Promise.all([rMrk.json(), rMax.json(), rSbt.json(), rClb.json()]);

        const mrkM = (dMrk.esMatches || []).filter(m => m.sport === 'S');
        const maxM = (dMax.esMatches || []).filter(m => m.sport === 'S' && !isMaxbetBonus(m));
        const sbtM = (dSbt.esMatches || []).filter(m => m.sport === 'S' && !isSbtOutright(m));
        const clbM = parseCloudbetRaw(dClb);

        // Cache live matches by bookie for tooltip use
        _liveMatchesCache = {
            merkur: mrkM,
            maxbet: maxM,
            soccerbet: sbtM,
            cloudbet: clbM
        };

        const teams  = ms => [...new Set(ms.flatMap(m => [m.home, m.away]))].sort();
        const leagues = ms => [...new Set(ms.map(m => m.leagueName))].sort();
        const fill   = (id, names) => {
            const dl = document.getElementById(id);
            if (dl) dl.innerHTML = names.map(n => `<option value="${esc(n)}"></option>`).join('');
        };

        fill('dlMrkTeams',   teams(mrkM));   fill('dlMaxTeams',   teams(maxM));
        fill('dlSbtTeams',   teams(sbtM));   fill('dlClbTeams',   teams(clbM));
        fill('dlMrkLeagues', leagues(mrkM)); fill('dlMaxLeagues', leagues(maxM));
        fill('dlSbtLeagues', leagues(sbtM)); fill('dlClbLeagues', leagues(clbM));
    } catch (e) {
        _nameCacheLoaded = false;
        console.warn('[aliases] Name cache load failed:', e.message);
    }
}

/* ── Get matches for a specific league from cache ─────────────── */
function getMatchesForLeague(bk, leagueName) {
    if (!_liveMatchesCache || !_liveMatchesCache[bk]) return [];
    const matches = _liveMatchesCache[bk];
    return matches
        .filter(m => m.leagueName === leagueName)
        .map(m => `${m.home} vs ${m.away}`)
        .slice(0, 8); // Limit to 8 matches for tooltip
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   INIT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function init() {
    try {
        await loadCanonicalDB();
        renderBrowseList();
        renderBrowseDetail();
        ensureNameCache(); // background
    } catch (e) {
        console.error('[aliases] Init failed:', e.message);
        toast('Failed to load data: ' + e.message, 'err');
    }
}

init();
