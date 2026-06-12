// ═══════════════════════════════════════════════════════════════════════════
//  GITHUB ACTIONS STANDALONE CRON WORKER  (functions/cron-update-scores.js)
// ═══════════════════════════════════════════════════════════════════════════
'use strict';

const { initializeApp, cert }      = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { fetchAndStoreLiveScores }  = require('./live.js');
const FIXTURES                     = require('./fixtures-snapshot.json');

// ── Check GitHub Secrets Environment Variables ──────────────────────────────
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('[Error] FIREBASE_SERVICE_ACCOUNT secret is missing.');
  process.exit(1);
}
if (!process.env.API_FOOTBALL_KEY) {
  console.error('[Error] API_FOOTBALL_KEY secret is missing.');
  process.exit(1);
}

// ── Initialize Firebase Admin via Service Account Key ────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// ── Firestore Writer ─────────────────────────────────────────────────────────
async function _writeLiveScores(liveMap) {
  await db.doc('liveScores/current').set({
    data:      liveMap,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ── Schedule Window Guard (±3 Hours around match times) ──────────────────────
const WINDOW_MS = 3 * 60 * 60 * 1000; 
function _matchWindowActive(nowMs) {
  return FIXTURES.some(f => {
    const ko = new Date(f.ko).getTime();
    return nowMs >= ko - WINDOW_MS && nowMs <= ko + WINDOW_MS;
  });
}

// ── Main Pipeline Execution ──────────────────────────────────────────────────
async function run() {
  const nowMs = Date.now();

  // Skip polling outside of active matches to protect your free API quotas
  if (!_matchWindowActive(nowMs)) {
    console.log('[live] Outside match window — skipping API poll to save quota.');
    process.exit(0);
  }

  try {
    console.log('[live] Inside active match window. Fetching live scores...');
    const { matched, total } = await fetchAndStoreLiveScores(
      process.env.API_FOOTBALL_KEY,
      FIXTURES,
      _writeLiveScores
    );
    console.log(`[live] ✓ Sync Complete: ${matched}/${total} active matches pushed to Firestore.`);
    process.exit(0);
  } catch (err) {
    console.error('[live] Sync failed:', err.message);
    process.exit(1);
  }
}

run();