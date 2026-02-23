/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   NOTIFICATIONS — in-page toasts + browser push alerts
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { esc } from './utils.js';
import { state } from './state.js';

export function showToast(type, match, metric) {
  const container = document.getElementById('toastContainer');
  const div = document.createElement('div');

  let label, cls;
  if (type === 'arb') {
    label = `ARB +${(metric * 100).toFixed(2)}%`;
    cls   = 'toast-arb';
  } else if (type === 'value') {
    label = `VALUE  EV +${(metric * 100).toFixed(2)}%`;
    cls   = 'toast-value';
  } else if (type === 'drop') {
    label = `📉 ${esc(metric.bkLabel)}  ${esc(metric.outcome)}  −${metric.dropPct.toFixed(1)}%`;
    cls   = `toast-drop-${metric.severity}`;
  }

  div.className = `toast ${cls}`;
  div.innerHTML = `
    <div class="toast-label">${label}</div>
    <div class="toast-match">${esc(match.home)} vs ${esc(match.away)}</div>
    <div class="toast-league">${esc(match.leagueName)}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  container.prepend(div);
  setTimeout(() => div.classList.add('toast-fade'), 7000);
  setTimeout(() => div.remove(), 7500);
}

export function sendBrowserNotification(type, match, metric) {
  if (document.visibilityState === 'visible') return;
  if (Notification.permission !== 'granted') return;
  const title = type === 'arb'
    ? `New ARB +${(metric * 100).toFixed(2)}%`
    : `New Value Bet  EV +${(metric * 100).toFixed(2)}%`;
  new Notification(title, {
    body: `${match.home} vs ${match.away}\n${match.leagueName}`,
  });
}

export function notifyNewOpportunities(prevArbKeys, prevValueKeys) {
  if (prevArbKeys.size === 0 && prevValueKeys.size === 0) return;
  state.allMatches.forEach(m => {
    const key = `${m.home}|${m.away}|${m.leagueName}`;
    if (m.arb && !prevArbKeys.has(key)) {
      showToast('arb', m, m.arb.roi);
      sendBrowserNotification('arb', m, m.arb.roi);
    }
    if (m.valueBets && m.valueBets.length > 0 && !prevValueKeys.has(key)) {
      const topEV = Math.max(...m.valueBets.map(v => v.ev));
      showToast('value', m, topEV);
      sendBrowserNotification('value', m, topEV);
    }
  });
}
