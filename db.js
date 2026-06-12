// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  FIRESTORE DATABASE LAYER
//
//  Every read / write the app ever does goes through this file.
//  All other files import from here — nothing else touches Firestore directly.
//
//  Firestore structure:
//
//    leagues/{code}                       ← league document
//      .name        "WC 2026 Pick'em"
//      .creator     "selam"
//      .code        "X7K9PQ"
//      .createdAt   timestamp
//
//      members/{username_lower}           ← subcollection
//        .username   "Selam"
//        .teamName   "Golden Lions"
//        .picks      { "ga1_1":"H", "gc1_1":"A", ... }
//        .score      42
//        .joinedAt   timestamp
//
//    liveScores/current                   ← single shared document
//      .data        { "ga1_1": { hS:2, aS:1, clock:"FT", state:"post",
//                                done:true, result:"H", liveResult:"H" } }
//      .updatedAt   timestamp
// ═══════════════════════════════════════════════════════════════════════════

import {
  collection, doc,
  getDoc, getDocs, setDoc, updateDoc,
  onSnapshot,
  serverTimestamp,
  query, orderBy,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { db } from './firebase-init.js';


// ── Internal path helpers ─────────────────────────────────────────────────────
const leagueDoc  = code       => doc(db, "leagues", code.toUpperCase());
const memberDoc  = (code, un) => doc(db, "leagues", code.toUpperCase(), "members", un.toLowerCase());
const membersCol = code       => collection(db, "leagues", code.toUpperCase(), "members");
const liveDoc    = ()         => doc(db, "liveScores", "current");


// ═══════════════════════════════════════════════════════════════════════════
//  LEAGUE  —  create / get
// ═══════════════════════════════════════════════════════════════════════════

/**
 * createLeague
 * Creates the league document AND the creator's member document in one go.
 *
 * @param {string} code      — 6-char code (from gc() in constants.js)
 * @param {string} username  — display username
 * @param {string} teamName  — public team name
 * @returns {Promise<void>}
 */
export async function createLeague(code, username, teamName) {
  const upper = code.toUpperCase();
  const lower = username.toLowerCase();

  // League root document
  await setDoc(leagueDoc(upper), {
    name:      "WC 2026 Pick'em",
    creator:   username,
    code:      upper,
    createdAt: serverTimestamp(),
  });

  // Creator's member document
  await setDoc(memberDoc(upper, lower), {
    username,
    teamName,
    picks:     {},
    score:     0,
    joinedAt:  serverTimestamp(),
  });
}


/**
 * getLeague
 * Returns the league root document data, or null if not found.
 *
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export async function getLeague(code) {
  const snap = await getDoc(leagueDoc(code.toUpperCase()));
  return snap.exists() ? snap.data() : null;
}


/**
 * leagueExists
 * Quick check — does a league with this code exist?
 *
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export async function leagueExists(code) {
  const snap = await getDoc(leagueDoc(code.toUpperCase()));
  return snap.exists();
}


// ═══════════════════════════════════════════════════════════════════════════
//  MEMBERS  —  join / get / list
// ═══════════════════════════════════════════════════════════════════════════

/**
 * joinLeague
 * Adds a new member document to an existing league.
 * Throws an error if the username is already taken (case-insensitive).
 *
 * @param {string} code
 * @param {string} username
 * @param {string} teamName
 * @returns {Promise<void>}
 */
export async function joinLeague(code, username, teamName) {
  const upper = code.toUpperCase();
  const lower = username.toLowerCase();
  const snap  = await getDoc(memberDoc(upper, lower));

  if (snap.exists()) {
    throw new Error(`Username "${username}" is already taken in this league.`);
  }

  await setDoc(memberDoc(upper, lower), {
    username,
    teamName,
    picks:    {},
    score:    0,
    joinedAt: serverTimestamp(),
  });
}


/**
 * getMember
 * Returns a single member's data, or null if not found.
 *
 * @param {string} code
 * @param {string} username
 * @returns {Promise<object|null>}
 */
export async function getMember(code, username) {
  const snap = await getDoc(memberDoc(code.toUpperCase(), username.toLowerCase()));
  return snap.exists() ? snap.data() : null;
}


/**
 * getLeaguesByUsername
 * Finds all leagues where a username exists as a member.
 * Used by the "Log In" flow to let returning users pick their league.
 * Returns an array of { code, name, username, teamName } objects.
 *
 * Note: Firestore doesn't support cross-collection queries without
 * a collection-group index, so we rely on the codes saved in localStorage
 * (auth.js → RECENT_KEY) to scope the lookup.
 *
 * @param {string}   username
 * @param {string[]} codes    — league codes to check (from localStorage)
 * @returns {Promise<Array>}
 */
export async function getLeaguesByUsername(username, codes = []) {
  const lower   = username.toLowerCase();
  const results = [];

  await Promise.all(codes.map(async code => {
    try {
      const mSnap = await getDoc(memberDoc(code.toUpperCase(), lower));
      if (!mSnap.exists()) return;

      const lSnap = await getDoc(leagueDoc(code.toUpperCase()));
      if (!lSnap.exists()) return;

      results.push({
        code:     code.toUpperCase(),
        name:     lSnap.data().name,
        username: mSnap.data().username,
        teamName: mSnap.data().teamName,
      });
    } catch { /* league may have been deleted */ }
  }));

  return results;
}


/**
 * getAllMembers
 * One-time fetch of all member documents in a league.
 * Returns an array of member data objects (unsorted).
 *
 * @param {string} code
 * @returns {Promise<Array>}
 */
export async function getAllMembers(code) {
  const snap = await getDocs(membersCol(code.toUpperCase()));
  return snap.docs.map(d => d.data());
}


// ═══════════════════════════════════════════════════════════════════════════
//  PICKS  —  save
// ═══════════════════════════════════════════════════════════════════════════

/**
 * savePicks
 * Merges the current picks map + recalculated score into the member document.
 * Uses updateDoc (not setDoc) so other fields are preserved.
 *
 * @param {string} code
 * @param {string} username
 * @param {object} picks   — { fixtureId: "H"|"D"|"A", ... }
 * @param {number} score   — recalculated score (pass 0 if no live data yet)
 * @returns {Promise<void>}
 */
export async function savePicks(code, username, picks, score = 0) {
  await updateDoc(memberDoc(code.toUpperCase(), username.toLowerCase()), {
    picks,
    score,
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  REAL-TIME LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * listenMembers
 * Subscribes to real-time updates for ALL members in a league.
 * Calls onUpdate(members[]) whenever any member's data changes.
 * Returns an unsubscribe function — call it to stop listening.
 *
 * @param {string}   code
 * @param {function} onUpdate  — callback(members: Array)
 * @returns {function}  unsubscribe
 */
export function listenMembers(code, onUpdate) {
  return onSnapshot(
    membersCol(code.toUpperCase()),
    snap => onUpdate(snap.docs.map(d => d.data())),
    err  => console.error("listenMembers error:", err)
  );
}


/**
 * listenLiveScores
 * Subscribes to real-time updates on the shared liveScores/current document.
 * Calls onUpdate(liveMap) whenever scores change.
 * Returns an unsubscribe function.
 *
 * @param {function} onUpdate  — callback(liveMap: object)
 * @returns {function}  unsubscribe
 */
export function listenLiveScores(onUpdate) {
  return onSnapshot(
    liveDoc(),
    snap => {
      if (!snap.exists()) { onUpdate({}); return; }
      onUpdate(snap.data().data || {});
    },
    err => console.error("listenLiveScores error:", err)
  );
}


/**
 * updateLiveScores
 * Called by the Cloud Function to write fresh live data.
 * Also called directly during dev/testing from the browser.
 * The `data` object must match the live score map schema.
 *
 * @param {object} data  — { fixtureId: { hS, aS, clock, state, done, result, liveResult } }
 * @returns {Promise<void>}
 */
export async function updateLiveScores(data) {
  await setDoc(liveDoc(), {
    data,
    updatedAt: serverTimestamp(),
  });
}


/**
 * getLastLiveUpdate
 * Returns the timestamp of the most recent live score update, or null.
 *
 * @returns {Promise<Date|null>}
 */
export async function getLastLiveUpdate() {
  const snap = await getDoc(liveDoc());
  if (!snap.exists()) return null;
  const ts = snap.data().updatedAt;
  return ts ? ts.toDate() : null;
}
