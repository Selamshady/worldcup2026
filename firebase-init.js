// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  FIREBASE INITIALISATION
//
//  ⚠  BEFORE DEPLOYING:
//     1. Go to console.firebase.google.com → your project → Project Settings
//     2. Under "Your apps" click the web app (</>)
//     3. Copy the firebaseConfig object and paste it below, replacing every
//        placeholder value.
//
//  This module exports:
//    db   — the Firestore database instance (used by db.js)
//    app  — the Firebase app instance (rarely needed directly)
// ═══════════════════════════════════════════════════════════════════════════

// ── Firebase SDK  (v10 modular, loaded from Google CDN — no build step) ──────
import { initializeApp }           from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore, enableNetwork }
                                   from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';


// ── Your Firebase project config ─────────────────────────────────────────────
// ⬇  Replace ALL values below with the ones from your Firebase console  ⬇
const firebaseConfig = {
  apiKey:            "AIzaSyCwE2G2NOA372cizqav3FTDLmrnxCff7N8",
  authDomain:        "worldcup2026-a1eec.firebaseapp.com",
  projectId:         "worldcup2026-a1eec",
  storageBucket:     "worldcup2026-a1eec.firebasestorage.app",
  messagingSenderId: "899369018347",
  appId:             "1:899369018347:web:09e3e2f9c5a169546f6fae",
};
// ⬆  ─────────────────────────────────────────────────────────────────────── ⬆


// ── Validate config at startup (shows a clear error instead of a cryptic one) ─
const MISSING = Object.entries(firebaseConfig)
  .filter(([, v]) => v.startsWith("PASTE_"))
  .map(([k]) => k);

if (MISSING.length > 0) {
  console.error(
    `%c⚠ Firebase config incomplete!\nMissing: ${MISSING.join(", ")}\n` +
    "Open js/firebase-init.js and paste your real config values.",
    "color:#f87171;font-size:13px;font-weight:bold"
  );
}


// ── Initialise ────────────────────────────────────────────────────────────────
export const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);


// ── Re-enable network if browser came back online ────────────────────────────
window.addEventListener("online", () => {
  enableNetwork(db).catch(() => {});
});


// ── Dev helper — logs the Firestore project to the console ───────────────────
// Remove this line before going to production if you prefer a clean console.
console.log(`🔥 Firestore connected → project: ${firebaseConfig.projectId}`);
