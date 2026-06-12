// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  APP CONTROLLER  (app.js)
//
//  The single entry point loaded by index.html.
//  Owns:
//    • Boot sequence   (loading → home OR app based on saved session)
//    • View switching  (#view-loading / #view-home / #view-app)
//    • All button wiring for the home / auth screens
//    • Tab switching inside the app shell
//    • Central app state  { fixtures, picks, liveMap, members, session, now }
//    • Pick saves        (optimistic update + debounced Firestore write)
//    • Header updates    (score, live indicator, progress bar, save badge)
//    • Firestore listener lifecycle  (subscribe on login, unsub on logout)
//
//  Nothing here renders HTML directly — all rendering is delegated to the
//  four ui-*.js modules.
// ═══════════════════════════════════════════════════════════════════════════

// ── Fixtures data ─────────────────────────────────────────────────────────────
import { FIXTURES }            from './fixtures.js';

// ── Constants / helpers ───────────────────────────────────────────────────────
import { calcScore, norm, MAX_PTS } from './constants.js';

// ── Firebase / Firestore layer ────────────────────────────────────────────────
import { savePicks, listenMembers, listenLiveScores } from './db.js';

// ── Auth / session ────────────────────────────────────────────────────────────
import {
  loadSession, saveSession, clearSession,
  handleCreate, handleJoin, handleLogin, handlePickLeague,
  validateSession,
} from './auth.js';

// ── UI modules ────────────────────────────────────────────────────────────────
import {
  initHome, showHomeSubView,
  showHomeError, clearHomeError,
  setLoading, showCreatedCode,
  renderRecentLeagues, renderLeaguePicker,
} from './ui-home.js';

import { initFixtures, renderFixtures } from './ui-fixtures.js';
import { renderPicks }                   from './ui-picks.js';
import { renderLeaderboard }             from './ui-leaderboard.js';


// ═══════════════════════════════════════════════════════════════════════════
//  CENTRAL APP STATE
//  Single object mutated in-place; all renders read from it.
// ═══════════════════════════════════════════════════════════════════════════
const state = {
  fixtures: FIXTURES,   // static — never changes
  picks:    {},         // current user's picks { fixtureId: "H"|"D"|"A" }
  liveMap:  {},         // { fixtureId: { hS,aS,clock,state,done,result,liveResult } }
  members:  [],         // all league members (from Firestore listener)
  session:  null,       // { username, teamName, leagueCode }
  now:      Date.now(), // updated on every render
};

// ── Firestore listener unsubscribe handles ────────────────────────────────────
let _unsubMembers    = null;
let _unsubLiveScores = null;

// ── Active tab ────────────────────────────────────────────────────────────────
let _activeTab = 'sched';

// ── Save-debounce timer ───────────────────────────────────────────────────────
let _saveTimer = null;


// ═══════════════════════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Loading screen is already visible via HTML default state.
  // Try to restore a saved session immediately.
  const saved = loadSession();

  if (saved) {
    // Validate the session against Firestore (member still exists?)
    const member = await validateSession(saved);
    if (member) {
      await _enterApp({ ...saved, ...member });
      return;
    }
    // Stale session — clear it and fall through to home
    clearSession();
  }

  _showHome();
});


// ═══════════════════════════════════════════════════════════════════════════
//  VIEW HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function _showView(id) {
  ['view-loading', 'view-home', 'view-app'].forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.toggle('hidden', v !== id);
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  HOME  —  show and wire all auth screens
// ═══════════════════════════════════════════════════════════════════════════
function _showHome() {
  _showView('view-home');
  initHome();

  // Recent leagues shortcut: clicking a recent card tries auto-login
  renderRecentLeagues(async code => {
    // Pre-fill the login username from the saved session if available
    const saved = loadSession();
    if (saved?.leagueCode === code && saved?.username) {
      try {
        const member = await validateSession(saved);
        if (member) {
          await _enterApp({ ...saved, ...member });
          return;
        }
      } catch { /* fall through to login form */ }
    }
    // Otherwise show the login form with the code in context
    showHomeSubView('home-login');
  });

  // ── Nav buttons on landing ──────────────────────────────────────────────
  _on('btn-go-create', 'click', () => showHomeSubView('home-create'));
  _on('btn-go-join',   'click', () => showHomeSubView('home-join'));
  _on('btn-go-login',  'click', () => showHomeSubView('home-login'));

  // ── Create league ───────────────────────────────────────────────────────
  _on('btn-create', 'click', _doCreate);

  // Enter on last input of create form
  _onKey('ct', 'Enter', _doCreate);
  _onKey('cu', 'Enter', _doCreate);

  // ── Join league ─────────────────────────────────────────────────────────
  _on('btn-join', 'click', _doJoin);
  _onKey('jc', 'Enter', _doJoin);

  // ── Log in ──────────────────────────────────────────────────────────────
  _on('btn-login', 'click', _doLogin);
  _onKey('lu', 'Enter', _doLogin);
}


// ── CREATE ────────────────────────────────────────────────────────────────────
async function _doCreate() {
  const btn      = document.getElementById('btn-create');
  const username = document.getElementById('cu')?.value?.trim() || '';
  const teamName = document.getElementById('ct')?.value?.trim() || '';

  clearHomeError();
  setLoading(btn, true, 'Creating…');

  try {
    const { code } = await handleCreate(username, teamName);

    // Show the code card with a callback to enter the app
    showCreatedCode(code, async () => {
      const saved = loadSession();
      if (saved) await _enterApp(saved);
    });

  } catch (err) {
    showHomeError(err.message);
  } finally {
    setLoading(btn, false);
  }
}


// ── JOIN ──────────────────────────────────────────────────────────────────────
async function _doJoin() {
  const btn      = document.getElementById('btn-join');
  const username = document.getElementById('ju')?.value?.trim() || '';
  const teamName = document.getElementById('jt')?.value?.trim() || '';
  const code     = document.getElementById('jc')?.value?.trim() || '';

  clearHomeError();
  setLoading(btn, true, 'Joining…');

  try {
    await handleJoin(username, teamName, code);
    const saved = loadSession();
    if (saved) await _enterApp(saved);
  } catch (err) {
    showHomeError(err.message);
    setLoading(btn, false);
  }
}


// ── LOGIN ─────────────────────────────────────────────────────────────────────
async function _doLogin() {
  const btn      = document.getElementById('btn-login');
  const username = document.getElementById('lu')?.value?.trim() || '';

  clearHomeError();
  setLoading(btn, true, 'Looking up…');

  try {
    const result = await handleLogin(username);

    if (result.type === 'single') {
      await _enterApp(result.session);
    } else {
      // Multiple leagues — show picker
      renderLeaguePicker(result.leagues, async (code, user) => {
        try {
          const session = await handlePickLeague(user, code);
          await _enterApp(session);
        } catch (err) {
          showHomeError(err.message);
        }
      });
      showHomeSubView('home-pick-league');
    }
  } catch (err) {
    showHomeError(err.message);
  } finally {
    setLoading(btn, false);
  }
}


// ── LOGOUT ────────────────────────────────────────────────────────────────────
function _doLogout() {
  // Stop Firestore listeners immediately
  _unsubMembers?.();
  _unsubLiveScores?.();
  _unsubMembers    = null;
  _unsubLiveScores = null;

  // Cancel any pending save
  clearTimeout(_saveTimer);

  // Reset state
  state.picks   = {};
  state.liveMap = {};
  state.members = [];
  state.session = null;

  clearSession();
  _showHome();
}


// ═══════════════════════════════════════════════════════════════════════════
//  ENTER APP
//  Transitions from loading/home into the main 3-tab shell.
// ═══════════════════════════════════════════════════════════════════════════
async function _enterApp(session) {
  state.session = session;

  // Seed picks from the member document we already have
  state.picks = { ...(session.picks || {}) };

  _showView('view-app');

  // ── Wire app-level buttons (only once per session) ──────────────────────
  _on('btn-logout', 'click', _doLogout);

  // Tab nav
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => _switchTab(btn.dataset.tab));
  });

  // ── Init fixtures UI (registers pick callback) ──────────────────────────
  initFixtures(_onPick);

  // ── Subscribe to real-time Firestore data ────────────────────────────────
  _unsubMembers = listenMembers(session.leagueCode, members => {
    state.members = members;

    // Keep our own picks in sync with what Firestore says
    // (handles multi-device edits and post-refresh reconciliation)
    const me = members.find(m => norm(m.username) === norm(session.username));
    if (me?.picks) state.picks = { ...me.picks };

    _render();
  });

  _unsubLiveScores = listenLiveScores(liveMap => {
    state.liveMap = liveMap;
    _render();
  });

  // Initial render with whatever state we have (listeners will re-render)
  _render();
}


// ═══════════════════════════════════════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════════
function _switchTab(tab) {
  _activeTab = tab;

  // Panel visibility
  ['sched', 'picks', 'board'].forEach(t => {
    const panel = document.getElementById(`tab-${t}`);
    if (panel) panel.classList.toggle('hidden', t !== tab);
  });

  // Nav button active state
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  // Scroll the newly visible tab back to top
  document.getElementById('tab-content')?.scrollTo({ top: 0 });
}


// ═══════════════════════════════════════════════════════════════════════════
//  PICK HANDLER  —  called by ui-fixtures on every pick button click
// ═══════════════════════════════════════════════════════════════════════════
function _onPick(fixtureId, pick) {
  // 1. Optimistic update
  state.picks[fixtureId] = pick;

  // 2. Immediate re-render so the button lights up instantly
  _render();

  // 3. Show saving indicator
  _setSaveBadge('💾 Saving…', '#fbbf24');

  // 4. Debounced Firestore write (800ms — batches rapid picks)
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      const score = calcScore(state.picks, state.liveMap, state.fixtures);
      await savePicks(
        state.session.leagueCode,
        state.session.username,
        state.picks,
        score,
      );
      _setSaveBadge('✓ Saved', '#4ade80');
      setTimeout(() => _setSaveBadge('', ''), 2000);
    } catch (err) {
      console.error('savePicks failed:', err);
      _setSaveBadge('⚠ Save failed', '#f87171');
      setTimeout(() => _setSaveBadge('', ''), 4000);
    }
  }, 800);
}


// ═══════════════════════════════════════════════════════════════════════════
//  RENDER  —  update all three tabs + header
// ═══════════════════════════════════════════════════════════════════════════
function _render() {
  state.now = Date.now();

  renderFixtures(state);
  renderPicks(state);
  renderLeaderboard(state);
  _updateHeader();
}


// ═══════════════════════════════════════════════════════════════════════════
//  HEADER UPDATE
// ═══════════════════════════════════════════════════════════════════════════
function _updateHeader() {
  const { session, picks, liveMap, fixtures, members } = state;
  if (!session) return;

  const myScore  = calcScore(picks, liveMap, fixtures);
  const anyLive  = Object.values(liveMap).some(v => v.state === 'in');
  const pickedCt = Object.keys(picks).length;
  const progPct  = Math.round((pickedCt / 104) * 100);

  // Identity
  _setText('hdr-code',     session.leagueCode);
  _setText('hdr-teamname', session.teamName);
  _setText('hdr-username', `(${session.username})`);

  // Score
  const scoreEl = document.getElementById('hdr-score-val');
  if (scoreEl) {
    scoreEl.textContent = myScore;
    scoreEl.classList.toggle('nonzero', myScore > 0);
  }

  // Live indicator
  _setText('hdr-live-icon', anyLive ? '🔴' : '');

  // API / live status line
  const statusEl = document.getElementById('hdr-live-status');
  if (statusEl) {
    const doneCount = fixtures.filter(f => liveMap[f.id]?.done).length;
    if (anyLive) {
      const liveCount = Object.values(liveMap).filter(v => v.state === 'in').length;
      statusEl.textContent = `● ${liveCount} live`;
      statusEl.className   = 'hdr-api-status ok';
    } else if (doneCount > 0) {
      statusEl.textContent = `✓ ${doneCount} results`;
      statusEl.className   = 'hdr-api-status ok';
    } else {
      statusEl.textContent = '○ pre-tournament';
      statusEl.className   = 'hdr-api-status';
    }
  }

  // Progress bar (picks made out of 104)
  const bar = document.getElementById('hdr-prog-bar');
  if (bar) bar.style.width = `${progPct}%`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  SAVE BADGE
// ═══════════════════════════════════════════════════════════════════════════
function _setSaveBadge(text, color = '') {
  const el = document.getElementById('save-badge');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}


// ═══════════════════════════════════════════════════════════════════════════
//  SMALL DOM UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

// Wire a click handler to an element by ID (ignores missing elements)
function _on(id, event, handler) {
  document.getElementById(id)?.addEventListener(event, handler);
}

// Wire a keydown Enter handler to an input by ID
function _onKey(id, key, handler) {
  document.getElementById(id)?.addEventListener('keydown', e => {
    if (e.key === key) handler();
  });
}

// Set textContent safely
function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}