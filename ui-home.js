// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  HOME / AUTH UI
//
//  Renders all dynamic content on the home screens and manages transitions
//  between sub-views (landing → create / join / login / pick-league).
//
//  Called by app.js — nothing here touches Firebase or auth logic directly.
//
//  FIXES APPLIED vs original:
//    FIX 1  showHomeError / clearHomeError now toggle the CSS `.hidden` class
//           (matching `class="err-box hidden"` in the HTML) instead of the
//           HTML `hidden` attribute, which the element never had.
//    FIX 2  showCreatedCode accepts an `onEnter` callback and wires the
//           injected "Start Making Picks" button immediately after insertion
//           instead of leaving it with no event listener.
// ═══════════════════════════════════════════════════════════════════════════

import { RC, wcBadge, GOLD, GREEN } from './constants.js';
import { getRecentCodes }            from './auth.js';


// ── Element refs (resolved once at module load) ───────────────────────────────
const $      = id => document.getElementById(id);

const ERR    = $('home-err');
const RECENT = $('recent-leagues');
const PICKER = $('league-picker-list');

// All home sub-view IDs — order matches the HTML
const SUB_VIEWS = [
  'home-landing',
  'home-create',
  'home-join',
  'home-login',
  'home-pick-league',
];


// ═══════════════════════════════════════════════════════════════════════════
//  INITIALISE  —  called once when the home view becomes visible
// ═══════════════════════════════════════════════════════════════════════════

/**
 * initHome
 * Seeds the round pills in the hero banner and wires back buttons.
 * Call this once after the DOM is ready (before showing any sub-view).
 */
export function initHome() {
  _renderRoundPills();
  _wireBadges();
  _wireBackButtons();
}


// ── Round scoring pills (GS 3pts → FINAL 15pts) ──────────────────────────────
function _renderRoundPills() {
  const el = $('round-pills');
  // Boot script in index.html may already have rendered these
  if (!el || el.children.length > 0) return;
  el.innerHTML = Object.entries(RC).map(([, c]) =>
    `<span class="round-pill" style="color:${c.color}">${c.short} ${c.pts}pts</span>`
  ).join('');
}

// ── WC badge injection (30 px in header, 60 px in hero) ──────────────────────
function _wireBadges() {
  document.querySelectorAll('.badge-mount[data-size]').forEach(el => {
    // Skip if the boot script or a prior call already populated this mount
    if (el.children.length > 0) return;
    const size = parseInt(el.dataset.size) || 52;
    el.innerHTML = wcBadge(size);
  });
}

// ── Back buttons on every auth sub-view ──────────────────────────────────────
function _wireBackButtons() {
  document.querySelectorAll('.btn-back[data-target]').forEach(btn => {
    btn.addEventListener('click', () => showHomeSubView(btn.dataset.target));
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  SUB-VIEW SWITCHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * showHomeSubView
 * Shows one home sub-view and hides the rest.  Clears the error box and
 * auto-focuses the first input in the revealed form.
 *
 * @param {'home-landing'|'home-create'|'home-join'|'home-login'|'home-pick-league'} id
 */
export function showHomeSubView(id) {
  clearHomeError();
  SUB_VIEWS.forEach(v => {
    const el = $(v);
    if (el) el.classList.toggle('hidden', v !== id);
  });

  // Auto-focus the first text input in the newly visible form
  const first = $(id)?.querySelector('input');
  if (first) setTimeout(() => first.focus(), 80);
}


// ═══════════════════════════════════════════════════════════════════════════
//  ERROR BOX
// ═══════════════════════════════════════════════════════════════════════════

/**
 * showHomeError
 * Displays a red error message in the shared error banner above the landing
 * sub-view.  Uses `.hidden` class (matching the HTML's initial state) so the
 * CSS `display:none !important` rule is correctly lifted.
 *
 * @param {string} msg
 */
export function showHomeError(msg) {
  if (!ERR) return;
  ERR.textContent = msg;
  // FIX 1: toggle CSS class, not the HTML `hidden` attribute
  ERR.classList.remove('hidden');
  ERR.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * clearHomeError
 * Hides and empties the shared error banner.
 */
export function clearHomeError() {
  if (!ERR) return;
  ERR.textContent = '';
  // FIX 1: toggle CSS class, not the HTML `hidden` attribute
  ERR.classList.add('hidden');
}


// ═══════════════════════════════════════════════════════════════════════════
//  BUTTON LOADING STATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * setLoading
 * Disables a button and swaps its label while async work is in flight.
 *
 * @param {HTMLButtonElement} btn
 * @param {boolean}           loading
 * @param {string}            [label='Loading…']  label shown while loading
 */
export function setLoading(btn, loading, label = 'Loading…') {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.textContent = label;
  } else {
    btn.textContent = btn.dataset.origText || btn.textContent;
    delete btn.dataset.origText;
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  CODE DISPLAY  —  shown after a league is successfully created
// ═══════════════════════════════════════════════════════════════════════════

/**
 * showCreatedCode
 * Inserts a "Share this code" card at the bottom of the create form.
 * The injected "Start Making Picks" button fires `onEnter` when clicked.
 *
 * @param {string}   code     — 6-char league code, e.g. "X7K9PQ"
 * @param {function} onEnter  — callback invoked when the user clicks
 *                              "Start Making Picks →"
 */
export function showCreatedCode(code, onEnter) {
  const container = $('home-create');
  if (!container) return;

  // Remove any card left over from a previous call
  container.querySelector('.created-code-card')?.remove();

  const card = document.createElement('div');
  card.className = 'created-code-card';
  card.style.cssText = `
    background: linear-gradient(135deg,#0a1a08,#0a1208);
    border: 2px solid ${GOLD};
    border-radius: 14px;
    padding: 18px 20px;
    text-align: center;
    margin-top: 12px;
    animation: fadeIn .3s ease;
  `;
  card.innerHTML = `
    <p style="margin:0 0 4px;font-size:9px;color:${GOLD};font-weight:800;letter-spacing:2px">
      ✅ LEAGUE CREATED — SHARE THIS CODE
    </p>
    <p style="margin:0 0 10px;font-family:monospace;font-size:38px;font-weight:900;
              letter-spacing:12px;color:#60a5fa">${_esc(code)}</p>
    <p style="margin:0;font-size:11px;color:#6b7280">
      Send this code to friends so they can join your league
    </p>
    <button id="btn-enter-app" style="
      display:block;width:100%;margin-top:14px;
      background:${GREEN};color:#fff;border:none;border-radius:8px;
      padding:13px;font-size:14px;font-weight:700;cursor:pointer;
    ">Start Making Picks →</button>
  `;

  container.appendChild(card);

  // FIX 2: wire the button immediately after it is in the DOM
  const enterBtn = card.querySelector('#btn-enter-app');
  if (enterBtn && typeof onEnter === 'function') {
    enterBtn.addEventListener('click', onEnter);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  RECENT LEAGUES LIST  —  bottom of the landing view
// ═══════════════════════════════════════════════════════════════════════════

/**
 * renderRecentLeagues
 * Shows up to 5 league cards for leagues previously joined on this device.
 * Each card pre-fills the Log In flow with one click.
 *
 * @param {function} onPick  — callback(code: string) when a card is tapped
 */
export function renderRecentLeagues(onPick) {
  if (!RECENT) return;
  const codes = getRecentCodes().slice(0, 5);

  if (codes.length === 0) {
    RECENT.innerHTML = '';
    return;
  }

  RECENT.innerHTML = `
    <div style="margin-top:16px">
      <p style="font-size:9px;color:#374151;font-weight:800;
                letter-spacing:1.5px;margin-bottom:8px">RECENT LEAGUES</p>
      ${codes.map(c => `
        <button class="league-pick-btn" data-code="${_esc(c)}">
          <div class="league-pick-name">WC 2026 Pick'em</div>
          <div class="league-pick-code">${_esc(c)}</div>
        </button>
      `).join('')}
    </div>
  `;

  RECENT.querySelectorAll('.league-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => onPick(btn.dataset.code));
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  LEAGUE PICKER  —  shown when login finds the same username in multiple leagues
// ═══════════════════════════════════════════════════════════════════════════

/**
 * renderLeaguePicker
 * Populates the pick-league sub-view with one card per league.
 * Disables all cards on first click to prevent double-submissions.
 *
 * @param {Array<{code:string, name:string, username:string, teamName:string}>} leagues
 * @param {function} onPick  — callback(code: string, username: string)
 */
export function renderLeaguePicker(leagues, onPick) {
  if (!PICKER) return;

  PICKER.innerHTML = leagues.map(lg => `
    <button class="league-pick-btn" data-code="${_esc(lg.code)}" data-user="${_esc(lg.username)}">
      <div class="league-pick-name">${_esc(lg.name)}</div>
      <div class="league-pick-code">${_esc(lg.code)}</div>
      <div style="margin-top:6px;font-size:10px;color:#9ca3af">
        👤 ${_esc(lg.username)} · 🏆 ${_esc(lg.teamName)}
      </div>
    </button>
  `).join('');

  PICKER.querySelectorAll('.league-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Disable all buttons to prevent double-click / double-submit
      PICKER.querySelectorAll('button').forEach(b => { b.disabled = true; });
      onPick(btn.dataset.code, btn.dataset.user);
    });
  });
}


// ── HTML escape helper — prevents XSS in user-supplied strings ───────────────
const _esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
