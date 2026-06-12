// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  FIXTURES TAB  (#tab-sched)
//
//  Renders the complete fixture list with filter bar, pick buttons,
//  live scoreboards, and result badges.
//
//  Public API:
//    initFixtures(onPick)     — wire the tab once; pass the pick callback
//    renderFixtures(state)    — call whenever state changes
//
//  state shape:
//    { fixtures, picks, liveMap, session, now }
//      fixtures  — FIXTURES array from fixtures.js
//      picks     — { fixtureId: "H"|"D"|"A" }   (current user's picks)
//      liveMap   — { fixtureId: { hS,aS,clock,state,done,result,liveResult } }
//      session   — { username, teamName, leagueCode }
//      now       — Date.now() milliseconds (passed in so caller controls clock)
// ═══════════════════════════════════════════════════════════════════════════

import {
  RC, fl, TC,
  fmtDate, fmtKO, cdown,
  isLocked, hasStarted,
  MAX_PTS,
} from './constants.js';

// ── Element refs ─────────────────────────────────────────────────────────────
const TAB      = () => document.getElementById('tab-sched');
const NAV_SUB  = () => document.getElementById('nav-sub-sched');

// ── Module-level state ───────────────────────────────────────────────────────
let _onPick    = null;   // callback(fixtureId, "H"|"D"|"A")
let _filter    = 'ALL';  // active filter key
let _lastState = null;   // last rendered state (for diffing)


// ═══════════════════════════════════════════════════════════════════════════
//  INIT  —  call once after the DOM is ready
// ═══════════════════════════════════════════════════════════════════════════
export function initFixtures(onPick) {
  _onPick = onPick;
}


// ═══════════════════════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════════════════════
export function renderFixtures(state) {
  const tab = TAB();
  if (!tab) return;
  _lastState = state;

  const { fixtures, picks, liveMap, now } = state;

  // ── Apply active filter ──
  const visible = _applyFilter(fixtures, _filter);

  // ── Build HTML ──
  let html = `<div class="tab-inner">`;
  html += _filterBar(fixtures);

  if (visible.length === 0) {
    html += `<div class="no-fixtures">No fixtures match this filter.</div>`;
  } else {
    let lastDate = null;
    for (const f of visible) {
      // Date separator
      if (f.date !== lastDate) {
        html += _dateSep(f.date);
        lastDate = f.date;
      }
      html += _fixtureCard(f, picks, liveMap, now);
    }
  }

  html += `</div>`;
  tab.innerHTML = html;

  // ── Wire filter buttons ──
  tab.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _filter = btn.dataset.filter;
      renderFixtures(_lastState);
      // Scroll back to top of tab on filter change
      tab.closest('#tab-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // ── Wire pick buttons ──
  tab.querySelectorAll('.pick-btn[data-fid]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const { fid, pick } = btn.dataset;
      if (_onPick) _onPick(fid, pick);
    });
  });

  // ── Update nav counter ──
  const picked  = fixtures.filter(f => picks[f.id]).length;
  const navSub  = NAV_SUB();
  if (navSub) navSub.textContent = `${picked}/104`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  FILTER BAR
// ═══════════════════════════════════════════════════════════════════════════
function _filterBar(fixtures) {
  // Build group list from GS fixtures
  const groups = [...new Set(
    fixtures.filter(f => f.round === 'GS').map(f => f.group)
  )].sort();

  const rounds = [
    { key: 'ALL',  label: 'All' },
    { key: 'GS',   label: 'Groups' },
    { key: 'R32',  label: 'R32',   color: RC.R32.color },
    { key: 'R16',  label: 'R16',   color: RC.R16.color },
    { key: 'QF',   label: 'QF',    color: RC.QF.color  },
    { key: 'SF',   label: 'SF',    color: RC.SF.color  },
    { key: '3P',   label: '3rd',   color: RC['3P'].color },
    { key: 'F',    label: 'Final', color: RC.F.color   },
  ];

  const mainBtns = rounds.map(r => {
    const active = _filter === r.key;
    const style  = active && r.color
      ? `background:${r.color};border-color:${r.color};`
      : active
        ? 'background:#C9A84C;border-color:#C9A84C;'
        : '';
    return `<button class="filter-btn${active ? ' active' : ''}"
      data-filter="${r.key}" style="${style}">${r.label}</button>`;
  }).join('');

  // Group sub-filters shown only when Groups is active
  let subRow = '';
  if (_filter === 'GS' || groups.some(g => `GRP-${g}` === _filter)) {
    subRow = `<div class="filter-sub-row">
      <div class="filter-sub-group">
        ${groups.map(g => {
          const key    = `GRP-${g}`;
          const active = _filter === key;
          const style  = active ? 'background:#C9A84C;border-color:#C9A84C;' : '';
          return `<button class="filter-btn${active ? ' active' : ''}"
            data-filter="${key}" style="${style}">Grp ${g}</button>`;
        }).join('')}
      </div>
    </div>`;
  }

  return `<div class="filter-bar">
    <div class="filter-row">${mainBtns}</div>
    ${subRow}
  </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  APPLY FILTER
// ═══════════════════════════════════════════════════════════════════════════
function _applyFilter(fixtures, filter) {
  if (filter === 'ALL') return fixtures;
  if (filter === 'GS')  return fixtures.filter(f => f.round === 'GS');
  if (filter.startsWith('GRP-')) {
    const g = filter.slice(4);
    return fixtures.filter(f => f.round === 'GS' && f.group === g);
  }
  return fixtures.filter(f => f.round === filter);
}


// ═══════════════════════════════════════════════════════════════════════════
//  DATE SEPARATOR
// ═══════════════════════════════════════════════════════════════════════════
function _dateSep(dateStr) {
  return `
    <div class="date-sep">
      <div class="date-sep-line date-sep-line--l"></div>
      <span class="date-sep-text">${fmtDate(dateStr)}</span>
      <div class="date-sep-line date-sep-line--r"></div>
    </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  FIXTURE CARD
// ═══════════════════════════════════════════════════════════════════════════
function _fixtureCard(f, picks, liveMap, now) {
  const live   = liveMap[f.id] || null;
  const locked = isLocked(f.ko, now);
  const started = hasStarted(f.ko, now);
  const myPick = picks[f.id] || null;
  const rc     = RC[f.round];
  const isTBD  = f.home === 'TBD' || f.away === 'TBD';

  return `<div class="fix-card">
    ${_statusBar(f, live, locked, started, myPick, rc, now)}
    ${isTBD ? _tbdBody(f, rc) : (live && (live.state === 'in' || live.done))
        ? _scoreboard(f, live)
        : _teamsRow(f)}
    ${!isTBD ? _pickButtons(f, picks, liveMap, locked, rc) : ''}
  </div>`;
}


// ── Status bar (top strip of every card) ─────────────────────────────────────
function _statusBar(f, live, locked, started, myPick, rc, now) {
  const roundBadge = `<span class="badge-rnd"
    style="background:${rc.color}">${rc.short}</span>`;

  const groupBadge = f.group
    ? `<span class="badge-grp">GROUP ${f.group}</span>` : '';

  let stateBadge = '';
  if (live?.state === 'in') {
    stateBadge = `<span class="badge-live">LIVE ${live.clock || ''}</span>`;
  } else if (live?.done) {
    stateBadge = `<span class="badge-result badge-result--pending">FT</span>`;
  }

  // Pick result badge
  let resultBadge = '';
  if (myPick && live?.done && live?.result) {
    const correct = myPick === live.result;
    resultBadge = correct
      ? `<span class="badge-result badge-result--correct">✓ +${rc.pts}pts</span>`
      : `<span class="badge-result badge-result--wrong">✗ ${_pickLabel(myPick, f)}</span>`;
  } else if (myPick && live?.state === 'in' && live?.liveResult) {
    const winning = myPick === live.liveResult;
    resultBadge = winning
      ? `<span class="badge-result badge-result--live-ok">~${rc.pts}pts</span>`
      : `<span class="badge-result badge-result--live-bad">losing</span>`;
  }

  // Right side — lock status or KO time
  let right = '';
  if (!live?.done) {
    if (locked) {
      right = `<span class="fix-lock-status">🔒 Locked</span>`;
    } else {
      const cd = cdown(f.ko, now);
      right = cd
        ? `<span class="fix-ko-time">⏰ ${cd} · ${fmtKO(f.ko)}</span>`
        : `<span class="fix-ko-time">${fmtKO(f.ko)}</span>`;
    }
  } else {
    right = `<span class="fix-ko-time">${f.venue}, ${f.city}</span>`;
  }

  return `<div class="fix-status-bar">
    <div class="fix-status-left">
      ${roundBadge}${groupBadge}${stateBadge}${resultBadge}
    </div>
    <div class="fix-status-right">${right}</div>
  </div>`;
}


// ── Scoreboard (live or FT) ───────────────────────────────────────────────────
function _scoreboard(f, live) {
  const isLiveNow = live.state === 'in';
  const cls       = isLiveNow ? 'scoreboard--live' : 'scoreboard--done';
  const scoreCls  = isLiveNow ? 'sb-score--live'   : 'sb-score--done';
  const clockCls  = isLiveNow ? 'sb-clock--live'   : 'sb-clock--done';

  // Determine winner for name colouring
  const hWin = live.hS > live.aS;
  const aWin = live.aS > live.hS;

  return `<div class="scoreboard ${cls}">
    <div class="sb-team sb-team--home">
      <div class="sb-flag">${fl(f.home)}</div>
      <div class="sb-name ${hWin ? 'sb-name--win' : 'sb-name--lose'}">${f.home}</div>
    </div>
    <div class="sb-score-wrap">
      <div class="sb-score ${scoreCls}">${live.hS ?? '–'} · ${live.aS ?? '–'}</div>
      <div class="sb-clock ${clockCls}">${live.clock || (live.done ? 'Full Time' : '')}</div>
    </div>
    <div class="sb-team sb-team--away">
      <div class="sb-flag">${fl(f.away)}</div>
      <div class="sb-name ${aWin ? 'sb-name--win' : 'sb-name--lose'}">${f.away}</div>
    </div>
  </div>`;
}


// ── Teams row (pre-match) ─────────────────────────────────────────────────────
function _teamsRow(f) {
  const hColor = TC[f.home] || '#374151';
  const aColor = TC[f.away] || '#374151';
  return `<div class="teams-row">
    <div class="team-side team-side--home">
      <div class="team-flag">${fl(f.home)}</div>
      <div class="team-name" style="color:${hColor}">${f.home}</div>
    </div>
    <span class="vs-chip">VS</span>
    <div class="team-side team-side--away">
      <div class="team-flag">${fl(f.away)}</div>
      <div class="team-name" style="color:${aColor}">${f.away}</div>
    </div>
  </div>`;
}


// ── TBD placeholder ───────────────────────────────────────────────────────────
function _tbdBody(f, rc) {
  return `<div class="tbd-wrap">
    <div class="tbd-icon">🏆</div>
    <div class="tbd-label">${rc.label}</div>
    <div class="tbd-sub">${f.venue}, ${f.city}</div>
    <div class="tbd-pts">Worth ${rc.pts} pts · Teams TBD</div>
  </div>`;
}


// ── Pick buttons ──────────────────────────────────────────────────────────────
function _pickButtons(f, picks, liveMap, locked, rc) {
  const myPick  = picks[f.id] || null;
  const live    = liveMap[f.id] || null;
  const done    = live?.done || false;
  const hasDraw = rc.draw;                          // only Group Stage

  const opts = hasDraw
    ? [
        { val: 'H', label: `${fl(f.home)} ${f.home}` },
        { val: 'D', label: '– Draw –' },
        { val: 'A', label: `${fl(f.away)} ${f.away}` },
      ]
    : [
        { val: 'H', label: `${fl(f.home)} ${f.home}` },
        { val: 'A', label: `${fl(f.away)} ${f.away}` },
      ];

  const gridCls = hasDraw ? 'picks-grid--3' : 'picks-grid--2';

  const btns = opts.map(o => {
    const selected = myPick === o.val;
    const correct  = done && live?.result === o.val;
    const wrong    = done && myPick === o.val && live?.result !== o.val;
    const color    = o.val === 'H' ? (TC[f.home] || '#374151')
                   : o.val === 'A' ? (TC[f.away] || '#374151')
                   : '#374151';

    let style = '';
    if (selected && !done)    style = `border-color:${color};color:${color};background:${color}22;`;
    if (selected && correct)  style = `border-color:#4ade80;color:#4ade80;background:#14532d;`;
    if (selected && wrong)    style = `border-color:#f87171;color:#f87171;background:#450a0a;`;
    if (!selected && correct) style = `border-color:#4ade8066;color:#4ade8066;`;

    return `<button class="pick-btn" data-fid="${f.id}" data-pick="${o.val}"
      style="${style}" ${locked || done ? 'disabled' : ''}>${o.label}</button>`;
  }).join('');

  const etNote = (!hasDraw && !done)
    ? `<p class="et-note">Draws go to extra time / penalties — pick the team you think wins.</p>`
    : '';

  return `<div class="picks-wrap">
    <div class="picks-grid ${gridCls}">${btns}</div>
    ${etNote}
  </div>`;
}


// ── Helper: human label for a pick outcome ────────────────────────────────────
function _pickLabel(pick, f) {
  if (pick === 'H') return f.home;
  if (pick === 'A') return f.away;
  return 'Draw';
}
