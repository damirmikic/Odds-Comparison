const SUPABASE_URL = 'https://bmrbvqnknrbkxbcrgduw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcmJ2cW5rbnJia3hiY3JnZHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDQ1MjcsImV4cCI6MjA4NzAyMDUyN30.wMsYSZKZJ0owLIC58zC6Utr2QShwY-RtP9Sif9WjLXE';

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ALIAS DATABASE (Supabase-backed)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let _db = { teams: [], leagues: [], groups: [], soccerbetTeams: [], soccerbetLeagues: [], cloudbetTeams: [], cloudbetLeagues: [], displayNames: [], mbxSbtTeams: [], mbxSbtLeagues: [], mbxClbTeams: [], mbxClbLeagues: [], sbtClbTeams: [], sbtClbLeagues: [] };
let _dbLoaded = false;

/**
 * Load aliases from Supabase tables.
 */
async function loadAliasDB() {
    if (_dbLoaded) return;
    try {
        const [
            { data: teams,       error: tErr  },
            { data: leagues,     error: lErr  },
            { data: groups,      error: gErr  },
            { data: sbtTeams,    error: stErr },
            { data: sbtLeagues,  error: slErr },
            { data: clbTeams,    error: ctErr },
            { data: clbLeagues,  error: clErr },
        ] = await Promise.all([
            supa.from('team_aliases').select('*'),
            supa.from('league_aliases').select('*'),
            supa.from('league_groups').select('*'),
            supa.from('soccerbet_team_aliases').select('*'),
            supa.from('soccerbet_league_aliases').select('*'),
            supa.from('cloudbet_team_aliases').select('*'),
            supa.from('cloudbet_league_aliases').select('*'),
        ]);

        if (tErr)   throw tErr;
        if (lErr)   throw lErr;
        if (gErr)   throw gErr;
        if (stErr)  throw stErr;
        if (slErr)  throw slErr;
        if (ctErr)  throw ctErr;
        if (clErr)  throw clErr;

        _db.teams            = teams      || [];
        _db.leagues          = leagues    || [];
        _db.groups           = groups     || [];
        _db.soccerbetTeams   = sbtTeams   || [];
        _db.soccerbetLeagues = sbtLeagues || [];
        _db.cloudbetTeams    = clbTeams   || [];
        _db.cloudbetLeagues  = clbLeagues || [];
        _dbLoaded = true;

        // Load display names separately — table may not exist yet
        const { data: displayNames, error: dnErr } = await supa.from('league_display_names').select('*');
        if (dnErr) console.warn('[aliases] league_display_names not available:', dnErr.message);
        else _db.displayNames = displayNames || [];

        // Load cross-bookie tables separately — may not exist until manually created
        const crossNames = [
            'maxbet_soccerbet_team_aliases', 'maxbet_soccerbet_league_aliases',
            'maxbet_cloudbet_team_aliases',  'maxbet_cloudbet_league_aliases',
            'soccerbet_cloudbet_team_aliases', 'soccerbet_cloudbet_league_aliases',
        ];
        const crossKeys = ['mbxSbtTeams', 'mbxSbtLeagues', 'mbxClbTeams', 'mbxClbLeagues', 'sbtClbTeams', 'sbtClbLeagues'];
        const crossResults = await Promise.all(crossNames.map(t => supa.from(t).select('*')));
        crossResults.forEach(({ data, error }, i) => {
            if (error) console.warn(`[aliases] ${crossNames[i]} not available:`, error.message);
            else _db[crossKeys[i]] = data || [];
        });
    } catch (e) {
        console.error('[aliases] Supabase load error:', e.message);
    }
}

async function reloadAliasDB() {
    _dbLoaded = false;
    await loadAliasDB();
}

/* ── Accessors ─────────────────────────────────────────────── */
function getTeamAliases()            { return [..._db.teams]; }
function getLeagueAliases()          { return [..._db.leagues]; }
function getLeagueGroups()           { return [..._db.groups]; }
function getSoccerbetTeamAliases()   { return [..._db.soccerbetTeams]; }
function getSoccerbetLeagueAliases() { return [..._db.soccerbetLeagues]; }
function getCloudbetTeamAliases()    { return [..._db.cloudbetTeams]; }
function getCloudbetLeagueAliases()  { return [..._db.cloudbetLeagues]; }
function getLeagueDisplayNames()     { return [..._db.displayNames]; }
function getMaxbetSbtTeamAliases()   { return [..._db.mbxSbtTeams]; }
function getMaxbetSbtLeagueAliases() { return [..._db.mbxSbtLeagues]; }
function getMaxbetClbTeamAliases()   { return [..._db.mbxClbTeams]; }
function getMaxbetClbLeagueAliases() { return [..._db.mbxClbLeagues]; }
function getSbtClbTeamAliases()      { return [..._db.sbtClbTeams]; }
function getSbtClbLeagueAliases()    { return [..._db.sbtClbLeagues]; }

/* ── Mutators (Async Supabase calls) ───────────────────────── */

async function setLeagueGroup(leagueName, groupName) {
    const { data, error } = await supa
        .from('league_groups')
        .upsert([{ league_name: leagueName, group_name: groupName }], { onConflict: 'league_name' })
        .select();

    if (error) throw error;

    // Update local cache
    const idx = _db.groups.findIndex(g => g.league_name === leagueName);
    if (idx !== -1) _db.groups[idx] = data[0];
    else _db.groups.push(data[0]);
}

async function removeLeagueGroup(leagueName) {
    const { error } = await supa
        .from('league_groups')
        .delete()
        .match({ league_name: leagueName });

    if (error) throw error;
    _db.groups = _db.groups.filter(g => g.league_name !== leagueName);
}

async function addTeamAlias(merkurName, maxbetName) {
    if (_db.teams.some(a => a.merkur === merkurName && a.maxbet === maxbetName)) return;

    const { data, error } = await supa
        .from('team_aliases')
        .insert([{ merkur: merkurName, maxbet: maxbetName }])
        .select();

    if (error) {
        console.error('[aliases] Add team error:', error.message);
        throw error;
    }

    _db.teams.push(data[0]);
}

async function removeTeamAlias(merkurName, maxbetName) {
    const { error } = await supa
        .from('team_aliases')
        .delete()
        .match({ merkur: merkurName, maxbet: maxbetName });

    if (error) {
        console.error('[aliases] Remove team error:', error.message);
        throw error;
    }

    _db.teams = _db.teams.filter(
        a => !(a.merkur === merkurName && a.maxbet === maxbetName)
    );
}

async function addLeagueAlias(merkurLeague, maxbetLeague) {
    if (_db.leagues.some(a => a.merkur === merkurLeague && a.maxbet === maxbetLeague)) return;

    const { data, error } = await supa
        .from('league_aliases')
        .insert([{ merkur: merkurLeague, maxbet: maxbetLeague }])
        .select();

    if (error) {
        console.error('[aliases] Add league error:', error.message);
        throw error;
    }

    _db.leagues.push(data[0]);
}

async function removeLeagueAlias(merkurLeague, maxbetLeague) {
    const { error } = await supa
        .from('league_aliases')
        .delete()
        .match({ merkur: merkurLeague, maxbet: maxbetLeague });

    if (error) {
        console.error('[aliases] Remove league error:', error.message);
        throw error;
    }

    _db.leagues = _db.leagues.filter(
        a => !(a.merkur === merkurLeague && a.maxbet === maxbetLeague)
    );
}

/* ── League Display Name Mutators ──────────────────────────── */

async function setLeagueDisplayName(merkurName, displayName) {
    const { data, error } = await supa
        .from('league_display_names')
        .upsert([{ merkur_name: merkurName, display_name: displayName }], { onConflict: 'merkur_name' })
        .select();

    if (error) throw error;

    const idx = _db.displayNames.findIndex(d => d.merkur_name === merkurName);
    if (idx !== -1) _db.displayNames[idx] = data[0];
    else _db.displayNames.push(data[0]);
}

async function removeLeagueDisplayName(merkurName) {
    const { error } = await supa
        .from('league_display_names')
        .delete()
        .match({ merkur_name: merkurName });

    if (error) throw error;
    _db.displayNames = _db.displayNames.filter(d => d.merkur_name !== merkurName);
}

/* ── SoccerBet Mutators ────────────────────────────────────── */

async function addSoccerbetTeamAlias(merkurName, soccerbetName) {
    if (_db.soccerbetTeams.some(a => a.merkur === merkurName && a.soccerbet === soccerbetName)) return;

    const { data, error } = await supa
        .from('soccerbet_team_aliases')
        .upsert([{ merkur: merkurName, soccerbet: soccerbetName }], { onConflict: 'merkur,soccerbet', ignoreDuplicates: true })
        .select();

    if (error) { console.error('[aliases] Add soccerbet team error:', error.message); throw error; }
    if (data && data[0]) _db.soccerbetTeams.push(data[0]);
}

async function removeSoccerbetTeamAlias(merkurName, soccerbetName) {
    const { error } = await supa
        .from('soccerbet_team_aliases')
        .delete()
        .match({ merkur: merkurName, soccerbet: soccerbetName });

    if (error) { console.error('[aliases] Remove soccerbet team error:', error.message); throw error; }
    _db.soccerbetTeams = _db.soccerbetTeams.filter(
        a => !(a.merkur === merkurName && a.soccerbet === soccerbetName)
    );
}

async function addSoccerbetLeagueAlias(merkurLeague, soccerbetLeague) {
    if (_db.soccerbetLeagues.some(a => a.merkur === merkurLeague && a.soccerbet === soccerbetLeague)) return;

    const { data, error } = await supa
        .from('soccerbet_league_aliases')
        .insert([{ merkur: merkurLeague, soccerbet: soccerbetLeague }])
        .select();

    if (error) { console.error('[aliases] Add soccerbet league error:', error.message); throw error; }
    _db.soccerbetLeagues.push(data[0]);
}

async function removeSoccerbetLeagueAlias(merkurLeague, soccerbetLeague) {
    const { error } = await supa
        .from('soccerbet_league_aliases')
        .delete()
        .match({ merkur: merkurLeague, soccerbet: soccerbetLeague });

    if (error) { console.error('[aliases] Remove soccerbet league error:', error.message); throw error; }
    _db.soccerbetLeagues = _db.soccerbetLeagues.filter(
        a => !(a.merkur === merkurLeague && a.soccerbet === soccerbetLeague)
    );
}

/* ── Cloudbet Mutators ─────────────────────────────────────── */

async function addCloudbetTeamAlias(merkurName, cloudbetName) {
    if (_db.cloudbetTeams.some(a => a.merkur === merkurName && a.cloudbet === cloudbetName)) return;

    const { data, error } = await supa
        .from('cloudbet_team_aliases')
        .insert([{ merkur: merkurName, cloudbet: cloudbetName }])
        .select();

    if (error) { console.error('[aliases] Add cloudbet team error:', error.message); throw error; }
    _db.cloudbetTeams.push(data[0]);
}

async function removeCloudbetTeamAlias(merkurName, cloudbetName) {
    const { error } = await supa
        .from('cloudbet_team_aliases')
        .delete()
        .match({ merkur: merkurName, cloudbet: cloudbetName });

    if (error) { console.error('[aliases] Remove cloudbet team error:', error.message); throw error; }
    _db.cloudbetTeams = _db.cloudbetTeams.filter(
        a => !(a.merkur === merkurName && a.cloudbet === cloudbetName)
    );
}

async function addCloudbetLeagueAlias(merkurLeague, cloudbetLeague) {
    if (_db.cloudbetLeagues.some(a => a.merkur === merkurLeague && a.cloudbet === cloudbetLeague)) return;

    const { data, error } = await supa
        .from('cloudbet_league_aliases')
        .insert([{ merkur: merkurLeague, cloudbet: cloudbetLeague }])
        .select();

    if (error) { console.error('[aliases] Add cloudbet league error:', error.message); throw error; }
    _db.cloudbetLeagues.push(data[0]);
}

async function removeCloudbetLeagueAlias(merkurLeague, cloudbetLeague) {
    const { error } = await supa
        .from('cloudbet_league_aliases')
        .delete()
        .match({ merkur: merkurLeague, cloudbet: cloudbetLeague });

    if (error) { console.error('[aliases] Remove cloudbet league error:', error.message); throw error; }
    _db.cloudbetLeagues = _db.cloudbetLeagues.filter(
        a => !(a.merkur === merkurLeague && a.cloudbet === cloudbetLeague)
    );
}

/* ── Cross-bookie Mutators (MaxBet↔SoccerBet, MaxBet↔Cloudbet, SoccerBet↔Cloudbet) ── */

async function addMaxbetSbtTeamAlias(maxbetName, sbtName) {
    if (_db.mbxSbtTeams.some(a => a.maxbet === maxbetName && a.soccerbet === sbtName)) return;
    const { data, error } = await supa.from('maxbet_soccerbet_team_aliases').upsert([{ maxbet: maxbetName, soccerbet: sbtName }], { onConflict: 'maxbet,soccerbet', ignoreDuplicates: true }).select();
    if (error) { console.error('[aliases] Add mbx-sbt team error:', error.message); throw error; }
    if (data && data[0]) _db.mbxSbtTeams.push(data[0]);
}

async function removeMaxbetSbtTeamAlias(maxbetName, sbtName) {
    const { error } = await supa.from('maxbet_soccerbet_team_aliases').delete().match({ maxbet: maxbetName, soccerbet: sbtName });
    if (error) { console.error('[aliases] Remove mbx-sbt team error:', error.message); throw error; }
    _db.mbxSbtTeams = _db.mbxSbtTeams.filter(a => !(a.maxbet === maxbetName && a.soccerbet === sbtName));
}

async function addMaxbetSbtLeagueAlias(maxbetLeague, sbtLeague) {
    if (_db.mbxSbtLeagues.some(a => a.maxbet === maxbetLeague && a.soccerbet === sbtLeague)) return;
    const { data, error } = await supa.from('maxbet_soccerbet_league_aliases').insert([{ maxbet: maxbetLeague, soccerbet: sbtLeague }]).select();
    if (error) { console.error('[aliases] Add mbx-sbt league error:', error.message); throw error; }
    _db.mbxSbtLeagues.push(data[0]);
}

async function removeMaxbetSbtLeagueAlias(maxbetLeague, sbtLeague) {
    const { error } = await supa.from('maxbet_soccerbet_league_aliases').delete().match({ maxbet: maxbetLeague, soccerbet: sbtLeague });
    if (error) { console.error('[aliases] Remove mbx-sbt league error:', error.message); throw error; }
    _db.mbxSbtLeagues = _db.mbxSbtLeagues.filter(a => !(a.maxbet === maxbetLeague && a.soccerbet === sbtLeague));
}

async function addMaxbetClbTeamAlias(maxbetName, clbName) {
    if (_db.mbxClbTeams.some(a => a.maxbet === maxbetName && a.cloudbet === clbName)) return;
    const { data, error } = await supa.from('maxbet_cloudbet_team_aliases').upsert([{ maxbet: maxbetName, cloudbet: clbName }], { onConflict: 'maxbet,cloudbet', ignoreDuplicates: true }).select();
    if (error) { console.error('[aliases] Add mbx-clb team error:', error.message); throw error; }
    if (data && data[0]) _db.mbxClbTeams.push(data[0]);
}

async function removeMaxbetClbTeamAlias(maxbetName, clbName) {
    const { error } = await supa.from('maxbet_cloudbet_team_aliases').delete().match({ maxbet: maxbetName, cloudbet: clbName });
    if (error) { console.error('[aliases] Remove mbx-clb team error:', error.message); throw error; }
    _db.mbxClbTeams = _db.mbxClbTeams.filter(a => !(a.maxbet === maxbetName && a.cloudbet === clbName));
}

async function addMaxbetClbLeagueAlias(maxbetLeague, clbLeague) {
    if (_db.mbxClbLeagues.some(a => a.maxbet === maxbetLeague && a.cloudbet === clbLeague)) return;
    const { data, error } = await supa.from('maxbet_cloudbet_league_aliases').insert([{ maxbet: maxbetLeague, cloudbet: clbLeague }]).select();
    if (error) { console.error('[aliases] Add mbx-clb league error:', error.message); throw error; }
    _db.mbxClbLeagues.push(data[0]);
}

async function removeMaxbetClbLeagueAlias(maxbetLeague, clbLeague) {
    const { error } = await supa.from('maxbet_cloudbet_league_aliases').delete().match({ maxbet: maxbetLeague, cloudbet: clbLeague });
    if (error) { console.error('[aliases] Remove mbx-clb league error:', error.message); throw error; }
    _db.mbxClbLeagues = _db.mbxClbLeagues.filter(a => !(a.maxbet === maxbetLeague && a.cloudbet === clbLeague));
}

async function addSbtClbTeamAlias(sbtName, clbName) {
    if (_db.sbtClbTeams.some(a => a.soccerbet === sbtName && a.cloudbet === clbName)) return;
    const { data, error } = await supa.from('soccerbet_cloudbet_team_aliases').upsert([{ soccerbet: sbtName, cloudbet: clbName }], { onConflict: 'soccerbet,cloudbet', ignoreDuplicates: true }).select();
    if (error) { console.error('[aliases] Add sbt-clb team error:', error.message); throw error; }
    if (data && data[0]) _db.sbtClbTeams.push(data[0]);
}

async function removeSbtClbTeamAlias(sbtName, clbName) {
    const { error } = await supa.from('soccerbet_cloudbet_team_aliases').delete().match({ soccerbet: sbtName, cloudbet: clbName });
    if (error) { console.error('[aliases] Remove sbt-clb team error:', error.message); throw error; }
    _db.sbtClbTeams = _db.sbtClbTeams.filter(a => !(a.soccerbet === sbtName && a.cloudbet === clbName));
}

async function addSbtClbLeagueAlias(sbtLeague, clbLeague) {
    if (_db.sbtClbLeagues.some(a => a.soccerbet === sbtLeague && a.cloudbet === clbLeague)) return;
    const { data, error } = await supa.from('soccerbet_cloudbet_league_aliases').insert([{ soccerbet: sbtLeague, cloudbet: clbLeague }]).select();
    if (error) { console.error('[aliases] Add sbt-clb league error:', error.message); throw error; }
    _db.sbtClbLeagues.push(data[0]);
}

async function removeSbtClbLeagueAlias(sbtLeague, clbLeague) {
    const { error } = await supa.from('soccerbet_cloudbet_league_aliases').delete().match({ soccerbet: sbtLeague, cloudbet: clbLeague });
    if (error) { console.error('[aliases] Remove sbt-clb league error:', error.message); throw error; }
    _db.sbtClbLeagues = _db.sbtClbLeagues.filter(a => !(a.soccerbet === sbtLeague && a.cloudbet === clbLeague));
}

/* ── Export / Import (Legacy support & migration) ─────────── */

function exportAliasesJSON() {
    return JSON.stringify({
        teams: _db.teams,
        leagues: _db.leagues,
        _comment: 'Migrated to Supabase.',
    }, null, 2);
}

async function importAliasesFromJSON(jsonStr) {
    const data = JSON.parse(jsonStr);

    // Batch insert teams
    if (Array.isArray(data.teams) && data.teams.length > 0) {
        const teamsToInsert = data.teams.map(a => ({ merkur: a.merkur, maxbet: a.maxbet }));
        const { error } = await supa.from('team_aliases').upsert(teamsToInsert, { onConflict: 'merkur,maxbet' });
        if (error) console.error('Team migration error:', error);
    }

    // Batch insert leagues
    if (Array.isArray(data.leagues) && data.leagues.length > 0) {
        const leaguesToInsert = data.leagues.map(a => ({ merkur: a.merkur, maxbet: a.maxbet }));
        const { error } = await supa.from('league_aliases').upsert(leaguesToInsert, { onConflict: 'merkur,maxbet' });
        if (error) console.error('League migration error:', error);
    }

    _dbLoaded = false;
    await loadAliasDB();
}

/**
 * Trigger a browser download (can still be used for backups)
 */
function downloadAliasesJSON() {
    const blob = new Blob([exportAliasesJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aliases_backup.json';
    a.click();
    URL.revokeObjectURL(url);
}

/* ── Fast lookup maps ──── */
function buildTeamAliasMap(normFn) {
    const map = new Map(); // Map<normMerkur, Set<normMaxbet>>
    _db.teams.forEach(a => {
        const m = normFn(a.merkur);
        const b = normFn(a.maxbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(b);
    });
    return map;
}

function buildLeagueAliasMap(normFn) {
    const map = new Map(); // Map<normMerkur, Set<normMaxbet>>
    _db.leagues.forEach(a => {
        const m = normFn(a.merkur);
        const b = normFn(a.maxbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(b);
    });
    return map;
}

function buildSoccerbetTeamAliasMap(normFn) {
    const map = new Map(); // Map<normMerkur, Set<normSoccerbet>>
    _db.soccerbetTeams.forEach(a => {
        const m = normFn(a.merkur);
        const s = normFn(a.soccerbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(s);
    });
    return map;
}

function buildSoccerbetLeagueAliasMap(normFn) {
    const map = new Map(); // Map<normMerkur, Set<normSoccerbet>>
    _db.soccerbetLeagues.forEach(a => {
        const m = normFn(a.merkur);
        const s = normFn(a.soccerbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(s);
    });
    return map;
}

function buildCloudbetTeamAliasMap(normFn) {
    const map = new Map(); // Map<normMerkur, Set<normCloudbet>>
    _db.cloudbetTeams.forEach(a => {
        const m = normFn(a.merkur);
        const c = normFn(a.cloudbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(c);
    });
    return map;
}

function buildCloudbetLeagueAliasMap(normFn) {
    const map = new Map(); // Map<normMerkur, Set<normCloudbet>>
    _db.cloudbetLeagues.forEach(a => {
        const m = normFn(a.merkur);
        const c = normFn(a.cloudbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(c);
    });
    return map;
}

function buildMaxbetSbtTeamAliasMap(normFn) {
    const map = new Map(); // Map<normMaxbet, Set<normSbt>>
    _db.mbxSbtTeams.forEach(a => {
        const m = normFn(a.maxbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(normFn(a.soccerbet));
    });
    return map;
}

function buildMaxbetSbtLeagueAliasMap(normFn) {
    const map = new Map(); // Map<normMaxbet, Set<normSbt>>
    _db.mbxSbtLeagues.forEach(a => {
        const m = normFn(a.maxbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(normFn(a.soccerbet));
    });
    return map;
}

function buildMaxbetClbTeamAliasMap(normFn) {
    const map = new Map(); // Map<normMaxbet, Set<normCloudbet>>
    _db.mbxClbTeams.forEach(a => {
        const m = normFn(a.maxbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(normFn(a.cloudbet));
    });
    return map;
}

function buildMaxbetClbLeagueAliasMap(normFn) {
    const map = new Map(); // Map<normMaxbet, Set<normCloudbet>>
    _db.mbxClbLeagues.forEach(a => {
        const m = normFn(a.maxbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(normFn(a.cloudbet));
    });
    return map;
}

function buildSbtClbTeamAliasMap(normFn) {
    const map = new Map(); // Map<normSbt, Set<normCloudbet>>
    _db.sbtClbTeams.forEach(a => {
        const m = normFn(a.soccerbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(normFn(a.cloudbet));
    });
    return map;
}

function buildSbtClbLeagueAliasMap(normFn) {
    const map = new Map(); // Map<normSbt, Set<normCloudbet>>
    _db.sbtClbLeagues.forEach(a => {
        const m = normFn(a.soccerbet);
        if (!map.has(m)) map.set(m, new Set());
        map.get(m).add(normFn(a.cloudbet));
    });
    return map;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CANONICAL SCHEMA v2
   Tables: canonical_teams, canonical_leagues,
           bookie_team_aliases, bookie_league_aliases
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let _v2 = { teams: [], leagues: [], teamAliases: [], leagueAliases: [] };
let _v2Loaded = false;

async function loadCanonicalDB() {
    if (_v2Loaded) return;
    
    // Fetch all team aliases using pagination (Supabase limits to 1000 per query)
    async function fetchAllAliases(table) {
        const allData = [];
        let from = 0;
        const batchSize = 1000;
        while (true) {
            const { data, error } = await supa.from(table).select('*').range(from, from + batchSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            allData.push(...data);
            if (data.length < batchSize) break; // Last batch
            from += batchSize;
        }
        return allData;
    }
    
    const [t, l, ta, la] = await Promise.all([
        supa.from('canonical_teams').select('*').order('name').then(r => { if (r.error) throw r.error; return r.data; }),
        supa.from('canonical_leagues').select('*').order('name').then(r => { if (r.error) throw r.error; return r.data; }),
        fetchAllAliases('bookie_team_aliases'),
        fetchAllAliases('bookie_league_aliases'),
    ]);
    
    _v2.teams = t || []; _v2.leagues = l || [];
    // Normalize canonical_id to number — Supabase may return it as a string
    const normId = a => ({ ...a, canonical_id: Number(a.canonical_id) });
    _v2.teamAliases   = (ta || []).map(normId);
    _v2.leagueAliases = (la || []).map(normId);
    _v2Loaded = true;
}

async function reloadCanonicalDB() { _v2Loaded = false; await loadCanonicalDB(); }

function getCanonicalTeams()      { return [..._v2.teams]; }
function getCanonicalLeagues()    { return [..._v2.leagues]; }
function getBookieTeamAliases()   { return [..._v2.teamAliases]; }
function getBookieLeagueAliases() { return [..._v2.leagueAliases]; }

async function addCanonical(type, name, extras = {}) {
    const table = type === 'teams' ? 'canonical_teams' : 'canonical_leagues';
    const row = type === 'leagues'
        ? { name, country: extras.country || null, display_name: extras.display_name || null, group_name: extras.group_name || null, sort_order: extras.sort_order || null }
        : { name };
    const { data, error } = await supa.from(table).insert([row]).select().single();
    if (error) throw error;
    (type === 'teams' ? _v2.teams : _v2.leagues).push(data);
    return data;
}

async function updateCanonical(type, id, updates) {
    const table = type === 'teams' ? 'canonical_teams' : 'canonical_leagues';
    const { data, error } = await supa.from(table).update(updates).eq('id', id).select().single();
    if (error) throw error;
    const arr = type === 'teams' ? _v2.teams : _v2.leagues;
    const idx = arr.findIndex(r => r.id === id);
    if (idx !== -1) arr[idx] = data;
    return data;
}

async function deleteCanonical(type, id) {
    const table = type === 'teams' ? 'canonical_teams' : 'canonical_leagues';
    const { error } = await supa.from(table).delete().eq('id', id);
    if (error) throw error;
    if (type === 'teams') {
        _v2.teams = _v2.teams.filter(r => r.id !== id);
        _v2.teamAliases = _v2.teamAliases.filter(a => a.canonical_id !== id);
    } else {
        _v2.leagues = _v2.leagues.filter(r => r.id !== id);
        _v2.leagueAliases = _v2.leagueAliases.filter(a => a.canonical_id !== id);
    }
}

async function addBookieAlias(type, bookie_key, raw_name, canonical_id) {
    const table = type === 'teams' ? 'bookie_team_aliases' : 'bookie_league_aliases';
    const { data, error } = await supa.from(table)
        .upsert([{ bookie_key, raw_name, canonical_id }], { onConflict: 'bookie_key,raw_name' })
        .select().single();
    if (error) throw error;
    const arr = type === 'teams' ? _v2.teamAliases : _v2.leagueAliases;
    const idx = arr.findIndex(a => a.bookie_key === bookie_key && a.raw_name === raw_name);
    if (idx !== -1) arr[idx] = data; else arr.push(data);
    return data;
}

async function removeBookieAlias(type, id) {
    const table = type === 'teams' ? 'bookie_team_aliases' : 'bookie_league_aliases';
    const { error } = await supa.from(table).delete().eq('id', id);
    if (error) throw error;
    if (type === 'teams') _v2.teamAliases = _v2.teamAliases.filter(a => a.id !== id);
    else _v2.leagueAliases = _v2.leagueAliases.filter(a => a.id !== id);
}
