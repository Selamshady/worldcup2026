// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  LIVE SCORE FETCHER  (functions/live.js)
//
//  Shared logic used by:
//    • The Firebase Cloud Function  (functions/index.js)  — Node 20
//    • The browser debug panel (manual refresh) — same fetch() interface
//
//  Pipeline:
//    1. GET all WC 2026 fixtures from api-football.com
//    2. Resolve each API team name → canonical name via resolveTeam()
//    3. Match home|away pair → our fixture ID (O(1) Map lookup)
//    4. Build the liveMap object Firestore + calcScore() expect
//    5. Write to liveScores/current via injected updateLiveScores()
//
//  liveMap entry schema  (must stay in sync with db.js + calcScore()):
//    {
//      hS:         number,             home score (goals)
//      aS:         number,             away score (goals)
//      clock:      string,             "45'", "HT", "FT", "AET", "PEN"
//      state:      "pre"|"in"|"post",
//      done:       boolean,            true when result is final
//      result:     "H"|"D"|"A"|null,   null until done
//      liveResult: "H"|"D"|"A"|null,   provisional winner while live
//    }
//
//  API: api-football.com  (direct — no RapidAPI wrapper needed)
//    Base URL : https://v3.football.api-sports.io
//    Header   : x-apisports-key: <YOUR_KEY>
//    Endpoint : GET /fixtures?league=1&season=2026
//    League 1 = FIFA World Cup
//    Free tier: 100 req/day → enough for testing + light use.
//               Upgrade to Starter ($10/mo, 7 500 req/day) for live polling.
//
//  ⚠  BEFORE DEPLOYING:
//     1. Sign up at https://dashboard.api-football.com
//     2. Copy your key
//     3. firebase functions:secrets:set API_FOOTBALL_KEY
//        (paste key when prompted — stored encrypted in Google Secret Manager)
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

// ── API constants ─────────────────────────────────────────────────────────────
const API_BASE  = 'https://v3.football.api-sports.io';
const WC_LEAGUE = 1;     // FIFA World Cup on api-football.com
const WC_SEASON = 2026;

// Status codes → match state  (api-football v3 documented values)
const IN_PROGRESS = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const FINISHED    = new Set(['FT', 'AET', 'PEN']);
// NS / TBD / PST / CANC → "pre" (not started / postponed / cancelled)


// ═══════════════════════════════════════════════════════════════════════════
//  TEAM NAME RESOLVER
//  Self-contained copy of constants.js logic so this file runs in Node
//  without an ES-module import chain.
// ═══════════════════════════════════════════════════════════════════════════

// Canonical names — must stay in sync with FLAGS in constants.js
const CANONICAL_TEAMS = [
  'Mexico','South Africa','South Korea','Czechia',
  'Canada','Bosnia & Herzegovina','USA','Paraguay',
  'Australia','Turkey','Qatar','Switzerland',
  'Brazil','Morocco','Haiti','Scotland',
  'Germany','Curaçao','Ivory Coast','Ecuador',
  'Netherlands','Japan','Sweden','Tunisia',
  'Spain','Cape Verde','Belgium','Egypt',
  'Saudi Arabia','Uruguay','Iran','New Zealand',
  'France','Senegal','Iraq','Norway',
  'Argentina','Algeria','Austria','Jordan',
  'Portugal','DR Congo','Uzbekistan','Colombia',
  'England','Croatia','Ghana','Panama',
];

const ALIASES = {
  'korea republic'               : 'South Korea',
  'republic of korea'            : 'South Korea',
  'cote d ivoire'                : 'Ivory Coast',
  'ivory coast'                  : 'Ivory Coast',
  'cote divoire'                 : 'Ivory Coast',
  'bosnia-herzegovina'           : 'Bosnia & Herzegovina',
  'bosnia and herzegovina'       : 'Bosnia & Herzegovina',
  'dr congo'                     : 'DR Congo',
  'democratic republic of congo' : 'DR Congo',
  'congo dr'                     : 'DR Congo',
  'drc'                          : 'DR Congo',
  'turkiye'                      : 'Turkey',
  'united states'                : 'USA',
  'united states of america'     : 'USA',
  'czech republic'               : 'Czechia',
  'cabo verde'                   : 'Cape Verde',
  'cape verde'                   : 'Cape Verde',
  'new zealand'                  : 'New Zealand',
  'nz'                           : 'New Zealand',
  'saudi arabia'                 : 'Saudi Arabia',
  'ksa'                          : 'Saudi Arabia',
};

// Strip accents → lowercase → collapse whitespace
const _normT = s => s
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')   // remove combining diacritics
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * resolveTeam
 * Maps any API team-name variant to its canonical FLAGS key.
 * Falls back to the original string if nothing matches.
 *
 * @param {string} name  — raw name from API (e.g. "Korea Republic")
 * @returns {string}     — canonical name (e.g. "South Korea")
 */
function resolveTeam(name) {
  if (!name) return '';
  const k = _normT(name);
  if (ALIASES[k]) return ALIASES[k];
  for (const t of CANONICAL_TEAMS) {
    if (_normT(t) === k) return t;
  }
  // Partial-match fallback (handles "Netherlands" ↔ "Netherlands (Holland)")
  for (const t of CANONICAL_TEAMS) {
    if (k.includes(_normT(t)) || _normT(t).includes(k)) return t;
  }
  return name; // unresolved — caller will log a warning
}


// ═══════════════════════════════════════════════════════════════════════════
//  FIXTURE INDEX
//  Map  "CanonicalHome|CanonicalAway"  →  fixture  for O(1) lookups.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * buildFixtureIndex
 * @param {Array} fixtures  — from fixtures-snapshot.json (or FIXTURES array)
 * @returns {Map<string, object>}
 */
function buildFixtureIndex(fixtures) {
  const idx = new Map();
  for (const f of fixtures) {
    if (f.home !== 'TBD' && f.away !== 'TBD') {
      idx.set(`${f.home}|${f.away}`, f);
    }
  }
  return idx;
}


// ═══════════════════════════════════════════════════════════════════════════
//  RESULT ENCODING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * encodeResult
 * Returns "H", "D", "A", or null.
 *
 * Group Stage: level score → "D" (draws are valid picks).
 * Knockout   : level score → null while live, null when done too — the API
 *   will update the score to reflect the penalty winner, so the final
 *   lopsided score is what we encode. If the score is still level at FT
 *   (before AET/PEN is done) we return null and wait.
 *
 * @param {number|null} hS
 * @param {number|null} aS
 * @param {string}      round  — RC key e.g. "GS", "QF"
 * @returns {"H"|"D"|"A"|null}
 */
function encodeResult(hS, aS, round) {
  if (hS == null || aS == null) return null;
  if (hS > aS) return 'H';
  if (aS > hS) return 'A';
  // Level score
  return round === 'GS' ? 'D' : null;
}


// ═══════════════════════════════════════════════════════════════════════════
//  CLOCK DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * formatClock
 * Converts an API status short-code + elapsed minutes to a display string.
 *
 * @param {string}      short    — e.g. "2H", "HT", "FT", "AET"
 * @param {number|null} elapsed  — minutes elapsed (null if not available)
 * @returns {string}
 */
function formatClock(short, elapsed) {
  switch (short) {
    case 'HT' : return 'HT';
    case 'FT' : return 'FT';
    case 'AET': return 'AET';
    case 'PEN': return 'PEN';
    case 'ET' : return elapsed != null ? `ET ${elapsed}'` : 'ET';
    case 'P'  : return 'PENS';
    case 'BT' : return 'BT';       // break time (between ET halves)
    case 'INT': return 'INT';      // interrupted
    default   : return elapsed != null ? `${elapsed}'` : (short || '–');
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  BUILD LIVE MAP  (pure — no I/O, fully unit-testable)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * buildLiveMap
 * Converts the raw api-football response array into our liveMap schema.
 * Only entries where state is "in" or "post" are included — pre-match
 * fixtures have no data worth storing.
 *
 * @param {Array} apiMatches   — response[] from /fixtures endpoint
 * @param {Array} fixtures     — fixtures-snapshot.json array
 * @returns {object}           — { [fixtureId]: { hS,aS,clock,state,done,result,liveResult } }
 */
function buildLiveMap(apiMatches, fixtures) {
  const idx     = buildFixtureIndex(fixtures);
  const liveMap = {};

  for (const m of apiMatches) {
    const apiHome = m.teams?.home?.name;
    const apiAway = m.teams?.away?.name;
    if (!apiHome || !apiAway) continue;

    const home    = resolveTeam(apiHome);
    const away    = resolveTeam(apiAway);
    const fixture = idx.get(`${home}|${away}`);

    if (!fixture) {
      // Unmatched — log so we can add an alias if needed
      console.warn(
        `[live] No fixture for: "${apiHome}" → "${home}" vs "${apiAway}" → "${away}"`
      );
      continue;
    }

    const statusShort = m.fixture?.status?.short ?? 'NS';
    const elapsed     = m.fixture?.status?.elapsed ?? null;
    const hS          = m.goals?.home  ?? null;
    const aS          = m.goals?.away  ?? null;

    // Determine state
    let state = 'pre';
    if (IN_PROGRESS.has(statusShort)) state = 'in';
    if (FINISHED.has(statusShort))    state = 'post';

    // Don't write pre-match entries — saves Firestore space
    if (state === 'pre') continue;

    const done       = state === 'post';
    const result     = done ? encodeResult(hS, aS, fixture.round) : null;
    const liveResult = encodeResult(hS, aS, fixture.round);
    const clock      = formatClock(statusShort, elapsed);

    liveMap[fixture.id] = {
      hS:         hS ?? 0,
      aS:         aS ?? 0,
      clock,
      state,
      done,
      result,
      liveResult,
    };
  }

  return liveMap;
}


// ═══════════════════════════════════════════════════════════════════════════
//  API FETCH  (Node 20 has native fetch — no node-fetch needed)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * fetchWCMatches
 * Fetches every WC 2026 match from api-football.com.
 *
 * @param {string} apiKey
 * @returns {Promise<Array>}  — raw response[] array
 * @throws {Error}            — on HTTP error or malformed response
 */
async function fetchWCMatches(apiKey) {
  const url = `${API_BASE}/fixtures?league=${WC_LEAGUE}&season=${WC_SEASON}`;

  const res = await fetch(url, {
    headers: {
      'x-apisports-key': apiKey,
      'Accept':          'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`api-football HTTP ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  // api-football wraps errors in json.errors (object or array)
  if (json.errors) {
    const errs = Array.isArray(json.errors)
      ? json.errors
      : Object.values(json.errors);
    if (errs.length > 0) {
      throw new Error(`api-football error: ${errs.join('; ')}`);
    }
  }

  if (!Array.isArray(json.response)) {
    throw new Error('api-football: no response array in reply');
  }

  return json.response;
}


// ═══════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT  —  full fetch → map → store pipeline
// ═══════════════════════════════════════════════════════════════════════════

/**
 * fetchAndStoreLiveScores
 * Runs the complete pipeline. Called by the Cloud Function and optionally
 * by a browser debug button (pass a browser-compatible updateLiveScores).
 *
 * @param {string}   apiKey           — api-football key
 * @param {Array}    fixtures         — fixtures-snapshot.json array
 * @param {function} updateLiveScores — async (liveMap) => void  (injected)
 * @returns {Promise<{ matched:number, total:number, liveMap:object }>}
 */
async function fetchAndStoreLiveScores(apiKey, fixtures, updateLiveScores) {
  const apiMatches = await fetchWCMatches(apiKey);
  const liveMap    = buildLiveMap(apiMatches, fixtures);

  const total   = apiMatches.length;
  const matched = Object.keys(liveMap).length;

  // Write whenever the API returned data (persists FT results permanently)
  if (total > 0) {
    await updateLiveScores(liveMap);
  }

  return { matched, total, liveMap };
}


// ── CommonJS exports (Node 20 CJS — firebase-functions requires CJS) ─────────
module.exports = {
  fetchAndStoreLiveScores,  // main entry point
  buildLiveMap,             // unit-testable
  resolveTeam,              // unit-testable
  buildFixtureIndex,        // unit-testable
  encodeResult,             // unit-testable
  formatClock,              // unit-testable
};
