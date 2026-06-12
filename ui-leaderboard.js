// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  LEADERBOARD TAB  (#tab-board)
//
//  Shows the full standings plus per-player score breakdown.
//
//  Sections rendered:
//    1. Invite card   — league code + copy button
//    2. Stats grid    — total picks / correct / live-correct / accuracy
//    3. Score bar     — my score vs MAX_PTS with per-round breakdown
//    4. Standings     — sorted by score desc, "YOU" chip on current user
//
//  Public API:
//    renderLeaderboard(state)
//
//  state shape:
//    { fixtures, picks, liveMap, members, session, now }
// ═══════════════════════════════════════════════════════════════════════════

import { RC, MAX_PTS, norm, calcScore } from './constants.js';

// ── Element refs ─────────────────────────────────────────────────────────────
const TAB     = () => document.getElementById('tab-board');
const NAV_SUB = () => document.getElementById('nav-sub-board');


// ═══════════════════════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════════════════════
export function renderLeaderboard(state) {
  const tab = TAB();
  if (!tab) return;

  const { fixtures, picks, liveMap, members, session } = state;
  const myNorm  = norm(session.username);
  const myScore = calcScore(picks, liveMap, fixtures);

  // Sort members by score descending (recalculate live for everyone)
  const ranked = [...members]
    .map(m => ({
      ...m,
      liveScore: calcScore(m.picks || {}, liveMap, fixtures),
    }))
    .sort((a, b) => b.liveScore - a.liveScore);

  const anyLive = Object.values(liveMap).some(v => v.state === 'in');
  const leader  = ranked[0]?.liveScore ?? 0;

  let html = `<div class="tab-inner">`;

  html += _inviteCard(session.leagueCode);
  html += _statsGrid(fixtures, picks, liveMap);
  html += _scoreBreakdown(fixtures, picks, liveMap, myScore, anyLive);
  html += _standingsSection(ranked, myNorm, leader, anyLive);

  html += `</div>`;
  tab.innerHTML = html;

  // ── Wire copy button ──
  tab.querySelector('#copy-code-btn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(session.leagueCode);
      const btn = tab.querySelector('#copy-code-btn');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = orig; }, 2000);
      }
    } catch {
      // Clipboard API unavailable — silent fail
    }
  });

  // ── Update nav counter ──
  const navSub = NAV_SUB();
  if (navSub) navSub.textContent = `${leader}pts`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  INVITE CARD
// ═══════════════════════════════════════════════════════════════════════════
function _inviteCard(code) {
  return `<div class="invite-card">
    <div class="invite-top">
      <p class="invite-label">YOUR LEAGUE CODE</p>
      <button id="copy-code-btn" style="
        background:transparent;border:1px solid #C9A84C55;
        border-radius:6px;padding:3px 10px;color:#C9A84C;
        font-size:10px;font-weight:700;cursor:pointer;">📋 Copy</button>
    </div>
    <p class="invite-code">${_esc(code)}</p>
    <p class="invite-hint">Share this code so friends can join your league</p>
  </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  STATS GRID  —  4 quick numbers
// ═══════════════════════════════════════════════════════════════════════════
function _statsGrid(fixtures, picks, liveMap) {
  const total   = Object.keys(picks).length;
  const decided = fixtures.filter(f => liveMap[f.id]?.done);

  let correct = 0;
  let livePts = 0;

  for (const f of fixtures) {
    const p  = picks[f.id];
    const lv = liveMap[f.id];
    if (!p || !lv) continue;
    if (lv.done   && lv.result      && p === lv.result)      correct++;
    if (lv.state === 'in' && lv.liveResult && p === lv.liveResult) livePts++;
  }

  const accuracy = decided.length > 0
    ? Math.round((correct / decided.filter(f => picks[f.id]).length || 0) * 100)
    : 0;

  const cards = [
    { val: total,    unit: '/104',  label: 'PICKS MADE',   live: false },
    { val: correct,  unit: 'correct', label: 'CORRECT',    live: false },
    { val: livePts,  unit: 'live',  label: 'LIVE WINNING', live: livePts > 0 },
    { val: `${accuracy}%`, unit: '',label: 'ACCURACY',     live: false },
  ];

  return `<div class="stats-grid">
    ${cards.map(c => `
      <div class="stat-card ${c.live ? 'stat-card--live' : ''}">
        <div class="stat-val">${c.val}</div>
        <div class="stat-unit">${c.unit}</div>
        <div class="stat-label">${c.label}</div>
      </div>`).join('')}
  </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  SCORE BREAKDOWN  — per-round pts + progress bar
// ═══════════════════════════════════════════════════════════════════════════
function _scoreBreakdown(fixtures, picks, liveMap, myScore, anyLive) {
  // Build per-round earned / max-possible
  const rndData = Object.entries(RC).map(([key, rc]) => {
    const rFixtures = fixtures.filter(f => f.round === key);
    let earned = 0;
    let maxPossible = 0;

    for (const f of rFixtures) {
      const p  = picks[f.id];
      const lv = liveMap[f.id];
      if (lv?.done && p) {
        maxPossible += rc.pts;
        if (p === lv.result) earned += rc.pts;
      }
    }

    return { key, rc, earned, maxPossible, count: rFixtures.length };
  });

  const pct  = Math.round((myScore / MAX_PTS) * 100);
  const live = anyLive
    ? `<div class="live-warning">⚠ Live matches in progress — score may change</div>`
    : '';

  const cells = rndData.map(d => `
    <div class="rnd-cell">
      <div class="rnd-cell-lbl" style="color:${d.rc.color}">${d.rc.short}</div>
      <div class="rnd-cell-pts" style="color:${d.earned > 0 ? d.rc.color : '#374151'}">
        ${d.earned}
      </div>
      <div class="rnd-cell-sub">${d.maxPossible > 0 ? `/${d.maxPossible}` : `${d.count}m`}</div>
    </div>`).join('');

  return `<div class="rnd-breakdown">
    <div class="rnd-breakdown-title">MY SCORE BREAKDOWN</div>
    <div class="rnd-grid">${cells}</div>
    <div class="score-bar-track">
      <div class="score-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="score-bar-meta">
      <span>${myScore} pts</span>
      <span>${pct}% of ${MAX_PTS}</span>
    </div>
    ${live}
  </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  STANDINGS
// ═══════════════════════════════════════════════════════════════════════════
function _standingsSection(ranked, myNorm, leader, anyLive) {
  const medals = ['🥇', '🥈', '🥉'];

  const rows = ranked.map((m, i) => {
    const isMe     = norm(m.username) === myNorm;
    const rowCls   = isMe ? 'standing-row standing-row--me' : 'standing-row';
    const rankEl   = i < 3
      ? `<div class="standing-rank standing-rank--medal">${medals[i]}</div>`
      : `<div class="standing-rank">${i + 1}</div>`;
    const scoreCls = isMe ? 'standing-score--me' : 'standing-score--other';
    const barCls   = isMe ? 'standing-bar-fill--me' : 'standing-bar-fill--other';
    const barPct   = leader > 0 ? Math.round((m.liveScore / leader) * 100) : 0;

    // Picks made / correct count for this member
    const madeCount   = Object.keys(m.picks || {}).length;

    const ptsCls = anyLive ? 'standing-pts-label--live' : '';

    return `<div class="${rowCls}">
      ${rankEl}
      <div class="standing-info">
        <div class="standing-name-row">
          <span class="standing-name">${_esc(m.teamName)}</span>
          ${isMe ? '<span class="you-chip">YOU</span>' : ''}
        </div>
        <div class="standing-bar-track">
          <div class="standing-bar-fill ${barCls}" style="width:${barPct}%"></div>
        </div>
        <div class="standing-picks-meta">${madeCount} picks made</div>
      </div>
      <div class="standing-score-wrap">
        <div class="standing-score ${scoreCls}">${m.liveScore}</div>
        <div class="standing-pts-label ${ptsCls}">${anyLive ? '~live' : 'pts'}</div>
      </div>
    </div>`;
  });

  return `<div>
    <div class="standings-label">LEADERBOARD — ${ranked.length} PLAYER${ranked.length !== 1 ? 'S' : ''}</div>
    ${rows.join('')}
  </div>`;
}


// ── HTML escape helper ────────────────────────────────────────────────────────
const _esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
