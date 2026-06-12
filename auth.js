// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  AUTH & SESSION
//
//  Handles everything between the home screen and entering the app:
//    • localStorage session  (persist login across page refreshes)
//    • Recent league codes   (power the "Log In" returning-user flow)
//    • Create / Join / Login  handlers called by app.js on button click
//
//  Nothing here touches the DOM — all UI feedback is done in app.js.
// ═══════════════════════════════════════════════════════════════════════════

import { norm, valid, gc, SESS_KEY } from './constants.js';
import {
  createLeague, joinLeague,
  leagueExists, getMember,
  getLeaguesByUsername,
} from './db.js';


// ── Storage keys ─────────────────────────────────────────────────────────────
const RECENT_KEY = "wc26_recent_codes";   // JSON array of up to 10 league codes
const MAX_RECENT = 10;


// ═══════════════════════════════════════════════════════════════════════════
//  SESSION  —  save / load / clear
// ═══════════════════════════════════════════════════════════════════════════

/**
 * saveSession
 * Persists the logged-in user to localStorage so the app survives a refresh.
 *
 * @param {string} username
 * @param {string} teamName
 * @param {string} leagueCode
 */
export function saveSession(username, teamName, leagueCode) {
  localStorage.setItem(SESS_KEY, JSON.stringify({
    username,
    teamName,
    leagueCode: leagueCode.toUpperCase(),
  }));
}


/**
 * loadSession
 * Returns the saved session object, or null if none exists.
 *
 * @returns {{ username: string, teamName: string, leagueCode: string } | null}
 */
export function loadSession() {
  try {
    const raw = localStorage.getItem(SESS_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.username && s.teamName && s.leagueCode) return s;
    return null;
  } catch {
    return null;
  }
}


/**
 * clearSession
 * Logs the user out (removes session from localStorage).
 * Does NOT remove recent codes so the Log In list stays populated.
 */
export function clearSession() {
  localStorage.removeItem(SESS_KEY);
}


// ═══════════════════════════════════════════════════════════════════════════
//  RECENT CODES  —  power the "Log In" returning-user lookup
// ═══════════════════════════════════════════════════════════════════════════

/**
 * addRecentCode
 * Adds a league code to the front of the recent list (deduped, max 10).
 *
 * @param {string} code
 */
export function addRecentCode(code) {
  const upper = code.toUpperCase();
  const list  = getRecentCodes().filter(c => c !== upper);
  list.unshift(upper);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}


/**
 * getRecentCodes
 * Returns the array of recently used league codes.
 *
 * @returns {string[]}
 */
export function getRecentCodes() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  CREATE LEAGUE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * handleCreate
 * Validates inputs, generates a code, creates the league in Firestore,
 * saves the session, and returns the new code.
 *
 * @param {string} username
 * @param {string} teamName
 * @returns {Promise<{ code: string }>}
 * @throws {Error}  user-readable message
 */
export async function handleCreate(username, teamName) {
  // ── Validate ──
  if (!valid(username)) throw new Error("Username must be 2–24 chars (letters, numbers, spaces, _ ' ! -).");
  if (!valid(teamName)) throw new Error("Team name must be 2–24 chars (letters, numbers, spaces, _ ' ! -).");

  // ── Generate a unique code (retry up to 5 times if collision) ──
  let code;
  let tries = 0;
  do {
    code = gc();
    tries++;
    if (tries > 5) throw new Error("Could not generate a unique code. Please try again.");
  } while (await leagueExists(code));

  // ── Write to Firestore ──
  await createLeague(code, username.trim(), teamName.trim());

  // ── Persist session + recent code ──
  saveSession(username.trim(), teamName.trim(), code);
  addRecentCode(code);

  return { code };
}


// ═══════════════════════════════════════════════════════════════════════════
//  JOIN LEAGUE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * handleJoin
 * Validates inputs, checks the league exists, joins it, and saves the session.
 *
 * @param {string} username
 * @param {string} teamName
 * @param {string} code
 * @returns {Promise<void>}
 * @throws {Error}  user-readable message
 */
export async function handleJoin(username, teamName, code) {
  // ── Validate inputs ──
  if (!valid(username)) throw new Error("Username must be 2–24 chars (letters, numbers, spaces, _ ' ! -).");
  if (!valid(teamName)) throw new Error("Team name must be 2–24 chars (letters, numbers, spaces, _ ' ! -).");
  if (!code || code.trim().length !== 6) throw new Error("League code must be exactly 6 characters.");

  const upper = code.trim().toUpperCase();

  // ── League must exist ──
  const exists = await leagueExists(upper);
  if (!exists) throw new Error(`No league found with code "${upper}". Double-check with the creator.`);

  // ── joinLeague throws if username is already taken ──
  await joinLeague(upper, username.trim(), teamName.trim());

  // ── Persist session + recent code ──
  saveSession(username.trim(), teamName.trim(), upper);
  addRecentCode(upper);
}


// ═══════════════════════════════════════════════════════════════════════════
//  LOG IN  (returning user)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * handleLogin
 * Looks up all leagues where this username appears (from recent codes).
 *
 * Returns one of:
 *   { type: "single",   session: { username, teamName, leagueCode } }
 *     → app.js should go straight to the app view
 *
 *   { type: "multiple", leagues: [{ code, name, username, teamName }, ...] }
 *     → app.js should show the pick-league sub-view
 *
 *   Throws an Error with a user-readable message if nothing is found.
 *
 * @param {string} username
 * @returns {Promise<object>}
 * @throws {Error}
 */
export async function handleLogin(username) {
  if (!username || username.trim().length < 2) {
    throw new Error("Please enter your username.");
  }

  const codes   = getRecentCodes();
  if (codes.length === 0) {
    throw new Error("No recent leagues found on this device. Try joining with your code.");
  }

  const leagues = await getLeaguesByUsername(username.trim(), codes);

  if (leagues.length === 0) {
    throw new Error(`No league found for "${username.trim()}" on this device. Make sure you're using the same browser you used to join.`);
  }

  if (leagues.length === 1) {
    const { code, username: u, teamName } = leagues[0];
    saveSession(u, teamName, code);
    return { type: "single", session: { username: u, teamName, leagueCode: code } };
  }

  // Multiple leagues — let the user pick
  return { type: "multiple", leagues };
}


/**
 * handlePickLeague
 * Called when a returning user picks one league from the list.
 * Verifies the member still exists in that league, then saves the session.
 *
 * @param {string} username
 * @param {string} code
 * @returns {Promise<{ username: string, teamName: string, leagueCode: string }>}
 * @throws {Error}
 */
export async function handlePickLeague(username, code) {
  const member = await getMember(code, username);
  if (!member) {
    throw new Error(`Could not find "${username}" in league ${code}. The league may have been deleted.`);
  }

  saveSession(member.username, member.teamName, code.toUpperCase());
  return {
    username:    member.username,
    teamName:    member.teamName,
    leagueCode:  code.toUpperCase(),
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  VALIDATE SESSION AGAINST FIRESTORE
//  Called once on app load to make sure a saved session is still valid.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * validateSession
 * Checks that the session's league + member still exist in Firestore.
 * Returns the member data if valid, or null if the session is stale.
 *
 * @param {{ username: string, leagueCode: string }} session
 * @returns {Promise<object|null>}
 */
export async function validateSession(session) {
  if (!session) return null;
  try {
    const member = await getMember(session.leagueCode, session.username);
    return member || null;
  } catch {
    return null;
  }
}
