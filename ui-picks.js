// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  ALL PICKS TAB  (#tab-picks)
//
//  Shows every league member's picks per fixture.
//  Behaviour:
//    • Before kick-off  → shows only YOUR pick + "N others locked" count.
//                         Other people's picks are hidden to prevent copying.
//    • After kick-off   → all picks are revealed in a grid.
//    • Result known     → pick dots are green (correct) or red (wrong).
//
//  Public API:
//    renderPicks(state)   — call whenever state changes
//
//  state shape:
//    { fixtures, picks, liveMap, members, session, now }
// ═══════════════════════════════════════════════════════════════════════════

import { RC, fl, fmtKO, hasStarted, norm } from './constants.js';

// ── Element refs ─────────────────────────────────────────────────────────────
const TAB     = () => document.getElementById('tab-picks');
const NAV_SUB = () => document.getElementById('nav-sub-picks');


// ═══════════════════════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════════════════════
export function renderPicks(state) {
  const tab = TAB();
  if (!tab) return;

  const { fixtures, members, session, liveMap, now } = state;

  // Only show fixtures where at least one member has made a pick
  const active = fixtures.filter(f => members.some(m => m.picks?.[f.id]));

  // Count fixtures with results known (done)
  const doneCount = fixtures.filter(f => liveMap[f.id]?.done).length;

  let html = `<div class="tab-inner tab-inner--wide">`;

  // ── Top bar ──
  html += `<div class="picks-tab-bar">
    <span class="picks-tab-info">
      ${active.length} fixture${active.length !== 1 ? 's' : ''} with picks
      · ${doneCount} decided
    </span>
    <button class="export-btn" id="picks-export-btn">⬇ Export CSV</button>
  </div>`;

  if (active.length === 0) {
    html += `<div class="no-fixtures">
      No picks yet — head to the Fixtures tab to make your first prediction.
    </div>`;
  } else {
    for (const f of active) {
      html += _fixtureBlock(f, members, session, liveMap, now);
    }
  }

  html += `</div>`;
  tab.innerHTML = html;

  // ── Wire export button ──
  tab.querySelector('#picks-export-btn')?.addEventListener('click', () => {
    _exportCSV(fixtures, members, liveMap);
  });

  // ── Update nav counter ──
  const navSub = NAV_SUB();
  if (navSub) navSub.textContent = `${doneCount} done`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  FIXTURE BLOCK
// ═══════════════════════════════════════════════════════════════════════════
function _fixtureBlock(f, members, session, liveMap, now) {
  const live      = liveMap[f.id] || null;
  const started   = hasStarted(f.ko, now);
  const rc        = RC[f.round];
  const myNorm    = norm(session.username);

  // Title line
  const title = f.home === 'TBD' || f.away === 'TBD'
    ? rc.label
    : `${fl(f.home)} ${f.home} vs ${fl(f.away)} ${f.away}`;

  // Right badge: LIVE / FT / KO time
  let badge = '';
  if (live?.state === 'in') {
    badge = `<span class="picks-fix-live">LIVE ${live.clock || ''}</span>`;
  } else if (live?.done) {
    const score = (live.hS !== undefined && live.aS !== undefined)
      ? ` ${live.hS}–${live.aS}` : '';
    badge = `<span class="picks-fix-ft">FT${score}</span>`;
  } else {
    badge = `<span style="font-size:8px;color:#6b7280">${fmtKO(f.ko)}</span>`;
  }

  let html = `<div class="fix-card" style="margin-bottom:12px">
    <div class="picks-fix-hdr">
      <div>
        <div class="picks-fix-title">${title}</div>
        <div class="picks-fix-ko">${rc.label} · ${rc.pts}pts</div>
      </div>
      ${badge}
    </div>`;

  if (!started) {
    // ── Before kick-off: show only my pick ──
    html += _preKORows(f, members, session, myNorm, live, rc);
  } else {
    // ── After kick-off: show everyone ──
    html += _postKORows(f, members, myNorm, live, rc);
  }

  html += `</div>`;
  return html;
}


// ── Before KO — my pick visible, others hidden ───────────────────────────────
function _preKORows(f, members, session, myNorm, live, rc) {
  const me        = members.find(m => norm(m.username) === myNorm);
  const myPick    = me?.picks?.[f.id] || null;
  const othersCt  = members.filter(m =>
    norm(m.username) !== myNorm && m.picks?.[f.id]
  ).length;

  let html = '';

  // My row
  html += `<div class="picks-my-row">
    <div class="picks-my-dot"></div>
    <div class="picks-my-name">${_esc(session.teamName)}</div>
    ${myPick
      ? `<span class="picks-my-pick">${_pickLabel(myPick, f)}</span>`
      : `<span class="picks-my-none">No pick yet</span>`
    }
  </div>`;

  // Hidden count
  if (othersCt > 0) {
    html += `<div class="picks-hidden">
      🔒 ${othersCt} other pick${othersCt !== 1 ? 's' : ''} hidden until kick-off
    </div>`;
  }

  return html;
}


// ── After KO — all picks visible ─────────────────────────────────────────────
function _postKORows(f, members, myNorm, live, rc) {
  // Sort: me first, then by team name
  const sorted = [...members].sort((a, b) => {
    if (norm(a.username) === myNorm) return -1;
    if (norm(b.username) === myNorm) return  1;
    return a.teamName.localeCompare(b.teamName);
  });

  const result  = live?.done   ? live.result     : null;
  const livePick= live?.state === 'in' ? live.liveResult : null;
  const hasDraw = rc.draw;

  // Column header
  let html = `<div class="picks-row" style="padding-top:4px;padding-bottom:4px;border-bottom:2px solid #1f2937">
    <div style="font-size:8px;color:#6b7280;font-weight:700">MEMBER</div>
    <div class="picks-cell" style="font-size:8px;color:#6b7280;font-weight:700">
      ${fl(f.home)} ${f.home === 'TBD' ? 'Home' : f.home.split(' ')[0]}
    </div>
    ${hasDraw ? `<div class="picks-cell" style="font-size:8px;color:#6b7280;font-weight:700">DRAW</div>` : ''}
    <div class="picks-cell" style="font-size:8px;color:#6b7280;font-weight:700">
      ${fl(f.away)} ${f.away === 'TBD' ? 'Away' : f.away.split(' ')[0]}
    </div>
  </div>`;

  for (const m of sorted) {
    const isMe   = norm(m.username) === myNorm;
    const mPick  = m.picks?.[f.id] || null;
    const nameCls= isMe ? 'picks-name--me' : 'picks-name--other';

    // Dot colour = team colour of picked team (or neutral)
    const dotColor = mPick === 'H' ? '#3CAC3B'
                   : mPick === 'A' ? '#2A398D'
                   : mPick === 'D' ? '#C9A84C'
                   : '#374151';

    html += `<div class="picks-row">
      <div class="picks-member">
        <div class="picks-dot" style="background:${dotColor}"></div>
        <span class="picks-name ${nameCls}">${_esc(m.teamName)}</span>
        ${isMe ? '<span class="you-chip">YOU</span>' : ''}
      </div>
      ${_pickCell('H', mPick, result, livePick, f, hasDraw)}
      ${hasDraw ? _pickCell('D', mPick, result, livePick, f, hasDraw) : ''}
      ${_pickCell('A', mPick, result, livePick, f, hasDraw)}
    </div>`;
  }

  return html;
}


// ── A single pick column cell ─────────────────────────────────────────────────
function _pickCell(outcome, mPick, result, livePick, f, hasDraw) {
  const chosen = mPick === outcome;
  if (!chosen) return `<div class="picks-cell">–</div>`;

  // Determine dot colour
  let bg = '#374151'; // neutral (no result yet)
  if (result) {
    bg = result === outcome ? '#14532d' : '#450a0a';
  } else if (livePick) {
    bg = livePick === outcome ? '#1a3a1a' : '#2a1a1a';
  } else {
    bg = outcome === 'H' ? '#1e3a1e'
       : outcome === 'A' ? '#1a1e3a'
       : '#2a2a1a';
  }

  const icon = result
    ? (result === outcome ? '✓' : '✗')
    : outcome === 'H' ? fl(f.home)
    : outcome === 'A' ? fl(f.away)
    : '=';

  return `<div class="picks-cell">
    <span class="pick-dot" style="background:${bg}">${icon}</span>
  </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  CSV EXPORT
// ═══════════════════════════════════════════════════════════════════════════
function _exportCSV(fixtures, members, liveMap) {
  const memberList = [...members].sort((a, b) =>
    a.teamName.localeCompare(b.teamName)
  );

  // Header row
  const headers = ['Fixture', 'Round', 'Home', 'Away', 'Result',
    ...memberList.map(m => m.teamName)];

  const rows = fixtures.map(f => {
    const live   = liveMap[f.id];
    const result = live?.done ? live.result : live?.state === 'in' ? `~${live.liveResult}` : '';
    return [
      f.id,
      RC[f.round].short,
      f.home,
      f.away,
      result,
      ...memberList.map(m => m.picks?.[f.id] || ''),
    ];
  });

  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'wc2026-pickem.csv';
  a.click();
  URL.revokeObjectURL(url);
}


// ── Helpers ───────────────────────────────────────────────────────────────────
function _pickLabel(pick, f) {
  if (pick === 'H') return `${fl(f.home)} ${f.home}`;
  if (pick === 'A') return `${fl(f.away)} ${f.away}`;
  return 'Draw';
}

const _esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
