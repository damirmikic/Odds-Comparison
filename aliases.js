const SUPABASE_URL = 'https://bmrbvqnknrbkxbcrgduw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcmJ2cW5rbnJia3hiY3JnZHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDQ1MjcsImV4cCI6MjA4NzAyMDUyN30.wMsYSZKZJ0owLIC58zC6Utr2QShwY-RtP9Sif9WjLXE';

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ALIAS DATABASE (Supabase-backed)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let _db = { teams: [], leagues: [], groups: [], soccerbetTeams: [], soccerbetLeagues: [] };
let _dbLoaded = false;

/**
 * Load aliases from Supabase tables.
 */
async function loadAliasDB() {
    if (_dbLoaded) return;
    try {
        const [
            { data: teams,          error: tErr  },
            { data: leagues,        error: lErr  },
            { data: groups,         error: gErr  },
            { data: sbtTeams,       error: stErr },
            { data: sbtLeagues,     error: slErr },
        ] = await Promise.all([
            supa.from('team_aliases').select('*'),
            supa.from('league_aliases').select('*'),
            supa.from('league_groups').select('*'),
            supa.from('soccerbet_team_aliases').select('*'),
            supa.from('soccerbet_league_aliases').select('*'),
        ]);

        if (tErr)  throw tErr;
        if (lErr)  throw lErr;
        if (gErr)  throw gErr;
        if (stErr) throw stErr;
        if (slErr) throw slErr;

        _db.teams           = teams       || [];
        _db.leagues         = leagues     || [];
        _db.groups          = groups      || [];
        _db.soccerbetTeams   = sbtTeams   || [];
        _db.soccerbetLeagues = sbtLeagues || [];
        _dbLoaded = true;
    } catch (e) {
        console.error('[aliases] Supabase load error:', e.message);
    }
}

/* ── Accessors ─────────────────────────────────────────────── */
function getTeamAliases()            { return [..._db.teams]; }
function getLeagueAliases()          { return [..._db.leagues]; }
function getLeagueGroups()           { return [..._db.groups]; }
function getSoccerbetTeamAliases()   { return [..._db.soccerbetTeams]; }
function getSoccerbetLeagueAliases() { return [..._db.soccerbetLeagues]; }

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

/* ── SoccerBet Mutators ────────────────────────────────────── */

async function addSoccerbetTeamAlias(merkurName, soccerbetName) {
    if (_db.soccerbetTeams.some(a => a.merkur === merkurName && a.soccerbet === soccerbetName)) return;

    const { data, error } = await supa
        .from('soccerbet_team_aliases')
        .insert([{ merkur: merkurName, soccerbet: soccerbetName }])
        .select();

    if (error) { console.error('[aliases] Add soccerbet team error:', error.message); throw error; }
    _db.soccerbetTeams.push(data[0]);
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
