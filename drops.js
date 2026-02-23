/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DROPS — Supabase odds-drop detection pipeline
   Uses `supa` from the global aliases.js script.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { CONFIG } from './config.js';
import { valid, extractOdds } from './utils.js';
import { state } from './state.js';
import { BOOKIES } from './api/bookies.js';
import { showToast } from './notifications.js';

export async function cleanupStaleData() {
  const cutoff = new Date(Date.now() - CONFIG.STALE_DATA_HOURS * 60 * 60 * 1000).toISOString();
  const nowSec = Math.floor(Date.now() / 1000);
  await supa.from('odds_drops').delete().lt('detected_at', cutoff);
  await supa.from('opening_odds').delete().lt('kickoff_at', nowSec);
}

export async function loadOpeningOddsCache() {
  state.openingOddsCache.clear();
  const { data } = await supa.from('opening_odds').select('*');
  (data || []).forEach(r => state.openingOddsCache.set(`${r.match_key}|${r.bk_key}`, r));
}

export async function saveOpeningOdds() {
  const rows = [];
  state.allMatches.forEach(m => {
    const matchKey = `${m.home}|${m.away}|${m.leagueName}`;
    BOOKIES.forEach(bk => {
      if (state.openingOddsCache.has(`${matchKey}|${bk.key}`)) return;
      const data = m.bookmakers[bk.key];
      if (!data) return;
      const o = extractOdds(data.odds);
      if (!valid(o.h) && !valid(o.x) && !valid(o.a)) return;
      rows.push({
        match_key: matchKey, bk_key: bk.key,
        h: o.h, x: o.x, a: o.a, ov: o.ov, un: o.un,
        home: m.home, away: m.away, league: m.leagueName,
        kickoff_at: m.kickOffTime,
      });
    });
  });
  if (!rows.length) return;
  await supa.from('opening_odds')
    .upsert(rows, { onConflict: 'match_key,bk_key', ignoreDuplicates: true });
  rows.forEach(r => state.openingOddsCache.set(`${r.match_key}|${r.bk_key}`, r));
}

export async function detectAndLogDrops() {
  const outcomes = ['h', 'x', 'a', 'ov', 'un'];
  const outcomeLabel = { h: 'Home', x: 'Draw', a: 'Away', ov: 'Over 2.5', un: 'Under 2.5' };
  const rows = [];

  state.allMatches.forEach(m => {
    if (m.live) return;
    const matchKey = `${m.home}|${m.away}|${m.leagueName}`;
    BOOKIES.forEach(bk => {
      const opening = state.openingOddsCache.get(`${matchKey}|${bk.key}`);
      if (!opening) return;
      const cur = extractOdds(m.bookmakers[bk.key]?.odds);
      outcomes.forEach(outcome => {
        const openVal = parseFloat(opening[outcome]);
        const curVal  = cur[outcome];
        if (!valid(openVal) || !valid(curVal) || curVal >= openVal) return;
        const dropPct  = (openVal - curVal) / openVal * 100;
        if (dropPct < CONFIG.DROP_MIN_PCT) return;
        const level    = Math.floor(dropPct / 2) * 2;
        const dedupKey = `${matchKey}|${bk.key}|${outcome}|${level}`;
        if (state.loggedDropKeys.has(dedupKey)) return;
        state.loggedDropKeys.add(dedupKey);
        const severity = dropPct >= CONFIG.DROP_EXTREME_PCT ? 'extreme' : dropPct >= CONFIG.DROP_STRONG_PCT ? 'strong' : 'weak';
        rows.push({
          match_key: matchKey, bk_key: bk.key, outcome,
          drop_level: level, opening_val: openVal, current_val: curVal,
          drop_pct: dropPct, severity,
          home: m.home, away: m.away, league: m.leagueName,
          kickoff_at: m.kickOffTime,
        });
        if (severity !== 'weak') {
          showToast('drop', m, { bkLabel: bk.label, outcome: outcomeLabel[outcome], dropPct, severity });
          sendDropBrowserNotification(m, bk.label, outcomeLabel[outcome], dropPct);
        }
      });
    });
  });

  if (!rows.length) return;
  await supa.from('odds_drops')
    .upsert(rows, { onConflict: 'match_key,bk_key,outcome,drop_level', ignoreDuplicates: true });
}

export async function loadDropsData() {
  const { data } = await supa.from('odds_drops')
    .select('*')
    .order('detected_at', { ascending: false });
  return data || [];
}

export function sendDropBrowserNotification(m, bkLabel, outcomeLabel, dropPct) {
  if (document.visibilityState === 'visible') return;
  if (Notification.permission !== 'granted') return;
  new Notification(`📉 DROP ${bkLabel} ${outcomeLabel} −${dropPct.toFixed(1)}%`, {
    body: `${m.home} vs ${m.away}\n${m.leagueName}`,
  });
}
