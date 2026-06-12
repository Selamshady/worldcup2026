// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  FIREBASE CLOUD FUNCTIONS  (functions/index.js)
//
//  Exports two functions:
//
//    scheduledLiveScores  (Scheduled, every 2 min)
//      Polls api-football.com and writes live scores to Firestore.
//      Uses _matchWindowActive() to skip the API call outside match hours,
//      conserving the free-tier quota (100 req/day).
//
//    manualLiveScores  (HTTP POST, dev/testing only)
//      Lets you trigger a fetch manually from the Firebase console or curl.
//      Secured with a simple bearer-token check against a second secret.
//
//  ─────────────────────────────────────────────────────────────────────────
//  SETUP CHECKLIST (do this once before first deploy)
//  ─────────────────────────────────────────────────────────────────────────
//
//  1. Install Firebase CLI (if not installed):
//       npm install -g firebase-tools
//       firebase login
//
//  2. Enable required Google Cloud APIs in your project:
//       firebase init functions          (choose JavaScript, Node 20)
//       gcloud services enable cloudscheduler.googleapis.com  \
//                              secretmanager.googleapis.com
//
//  3. Store your api-football key as a Firebase secret:
//       firebase functions:secrets:set API_FOOTBALL_KEY
//       → paste your key from https://dashboard.api-football.com
//
//  4. Store a manual-trigger token (any random string you choose):
//       firebase functions:secrets:set MANUAL_TRIGGER_TOKEN
//       → this is the bearer token you'll use to call manualLiveScores
//
//  5. Copy fixtures-snapshot.json into this functions/ folder:
//       cp ../public/js/fixtures-snapshot.json ./
//       (or regenerate it with: node ../scripts/gen-snapshot.js)
//
//  6. Install dependencies and deploy:
//       npm install
//       firebase deploy --only functions
//
//  7. Check logs after a few minutes:
//       firebase functions:log --only scheduledLiveScores
//
//  ─────────────────────────────────────────────────────────────────────────
//  COST ESTIMATE
//  ─────────────────────────────────────────────────────────────────────────
//  Cloud Functions free tier : 2M invocations/month
//  This function (every 2 min): 720/day × 39 days = ~28 000 invocations
//  → well within free tier.
//
//  api-football free tier    : 100 requests/day
//  Group Stage has ~8 matches/day across ~5h.  With the ±3h window guard
//  that's at most ~8h active / day → 240 req/day on the busiest day.
//  Upgrade to Starter ($10/mo, 7 500 req/day) for full tournament coverage.
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

// ── All requires at the top ───────────────────────────────────────────────────
const { onSchedule }               = require('firebase-functions/v2/scheduler');
const { onRequest }                = require('firebase-functions/v2/https');
const { initializeApp }            = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { defineSecret }             = require('firebase-functions/params');
const { fetchAndStoreLiveScores }  = require('./live.js');


// ── Firebase Admin init (idempotent) ─────────────────────────────────────────
initializeApp();
const db = getFirestore();


// ── Secrets ───────────────────────────────────────────────────────────────────
const apiFootballKey    = defineSecret('API_FOOTBALL_KEY');
const manualTriggerToken = defineSecret('MANUAL_TRIGGER_TOKEN');


// ── Fixtures snapshot  (CJS-safe JSON, lives in functions/ folder) ────────────
// Contains { id, round, home, away, ko } for all 104 WC 2026 matches.
// Used by buildLiveMap() (team matching) and _matchWindowActive() (schedule guard).
const FIXTURES = require('./fixtures-snapshot.json');


// ═══════════════════════════════════════════════════════════════════════════
//  FIRESTORE WRITER  (injected into live.js — keeps db logic here)
// ═══════════════════════════════════════════════════════════════════════════
async function _writeLiveScores(liveMap) {
  await db.doc('liveScores/current').set({
    data:      liveMap,
    updatedAt: FieldValue.serverTimestamp(),
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  SCHEDULE GUARD
//  Returns true if any fixture has a kick-off within ±3 hours of nowMs.
//  The function still runs every 2 min, but we skip the API call outside
//  match windows to protect the free-tier quota.
// ═══════════════════════════════════════════════════════════════════════════
const WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours in ms

function _matchWindowActive(nowMs) {
  return FIXTURES.some(f => {
    const ko = new Date(f.ko).getTime();
    return nowMs >= ko - WINDOW_MS && nowMs <= ko + WINDOW_MS;
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  SCHEDULED FUNCTION  —  every 2 minutes
// ═══════════════════════════════════════════════════════════════════════════
exports.scheduledLiveScores = onSchedule(
  {
    schedule:       'every 2 minutes',
    timeZone:       'UTC',
    secrets:        [apiFootballKey],
    memory:         '256MiB',
    timeoutSeconds: 60,
    region:         'us-central1',
  },
  async () => {
    const nowMs = Date.now();

    // Skip outside match windows — no-op, costs nothing
    if (!_matchWindowActive(nowMs)) {
      console.log('[live] Outside match window — skipping poll');
      return;
    }

    const key = apiFootballKey.value();
    if (!key) {
      console.error('[live] API_FOOTBALL_KEY secret missing — aborting');
      return;
    }

    try {
      const { matched, total } = await fetchAndStoreLiveScores(
        key,
        FIXTURES,
        _writeLiveScores,
      );
      console.log(`[live] ✓ polled api-football: ${matched}/${total} fixtures active`);
    } catch (err) {
      // Catch rather than throw — an uncaught error triggers Cloud Functions
      // automatic retry, which would hammer the API on network failures.
      console.error('[live] poll failed:', err.message);
    }
  }
);


// ═══════════════════════════════════════════════════════════════════════════
//  MANUAL TRIGGER  —  HTTP POST  (dev + emergency refresh)
//
//  Usage:
//    curl -X POST \
//      https://us-central1-worldcup2026-a1eec.cloudfunctions.net/manualLiveScores \
//      -H "Authorization: Bearer <MANUAL_TRIGGER_TOKEN>"
//
//  The bearer token is the value you stored via:
//    firebase functions:secrets:set MANUAL_TRIGGER_TOKEN
//
//  To allow only your own account to invoke this function without a token,
//  restrict IAM access in the Firebase console instead and remove the
//  Authorization check below.
// ═══════════════════════════════════════════════════════════════════════════
exports.manualLiveScores = onRequest(
  {
    secrets:        [apiFootballKey, manualTriggerToken],
    memory:         '256MiB',
    timeoutSeconds: 60,
    region:         'us-central1',
    // Cloud Run v2 default: requires authenticated IAM caller.
    // Adding invoker: 'allUsers' would make this public — don't do that.
  },
  async (req, res) => {
    // ── Method guard ──
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST required' });
      return;
    }

    // ── Bearer-token auth ──
    const expected = manualTriggerToken.value();
    const authHdr  = req.headers.authorization || '';
    const provided = authHdr.startsWith('Bearer ') ? authHdr.slice(7).trim() : '';

    if (!expected || provided !== expected) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // ── API key check ──
    const key = apiFootballKey.value();
    if (!key) {
      res.status(500).json({ error: 'API_FOOTBALL_KEY secret not set' });
      return;
    }

    // ── Run pipeline ──
    try {
      const { matched, total, liveMap } = await fetchAndStoreLiveScores(
        key,
        FIXTURES,
        _writeLiveScores,
      );
      res.json({
        ok:      true,
        matched,
        total,
        ts:      new Date().toISOString(),
        // Include a summary of active fixtures for easy debugging
        active:  Object.entries(liveMap).map(([id, v]) => ({
          id,
          score: `${v.hS}–${v.aS}`,
          clock: v.clock,
          state: v.state,
        })),
      });
    } catch (err) {
      console.error('[live] manualLiveScores failed:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);
