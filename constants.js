// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  CONSTANTS & HELPERS
//  All brand colors, round config, team data, and utility functions.
//  Imported by every other JS module.
// ═══════════════════════════════════════════════════════════════════════════


// ── Brand Colors (Official WC 2026) ─────────────────────────────────────────
export const GOLD  = "#C9A84C";
export const RED   = "#E61D25";
export const BLUE  = "#2A398D";
export const GREEN = "#3CAC3B";
export const BG    = "#06080f";
export const CARD  = "#0d1525";


// ── Round Config ─────────────────────────────────────────────────────────────
// pts   = points awarded for a correct prediction in that round
// draw  = whether a draw is a valid pick (only true in Group Stage)
// color = display colour used for this round's UI elements
export const RC = {
  GS:  { label:"Group Stage",    short:"GS",    pts:3,  draw:true,  color:"#4ade80" },
  R32: { label:"Round of 32",    short:"R32",   pts:5,  draw:false, color:"#60a5fa" },
  R16: { label:"Round of 16",    short:"R16",   pts:7,  draw:false, color:"#818cf8" },
  QF:  { label:"Quarter-Finals", short:"QF",    pts:9,  draw:false, color:"#a78bfa" },
  SF:  { label:"Semi-Finals",    short:"SF",    pts:10, draw:false, color:"#f472b6" },
  "3P":{ label:"3rd Place",      short:"3P",    pts:12, draw:false, color:"#fb923c" },
  F:   { label:"Final",          short:"FINAL", pts:15, draw:false, color:"#C9A84C" },
};

// Maximum possible score: 72×3 + 16×5 + 8×7 + 4×9 + 2×10 + 12 + 15 = 435
export const MAX_PTS = 435;


// ── Flags — all 48 WC 2026 teams ─────────────────────────────────────────────
export const FLAGS = {
  Mexico:"🇲🇽",        "South Africa":"🇿🇦",          "South Korea":"🇰🇷",         Czechia:"🇨🇿",
  Canada:"🇨🇦",        "Bosnia & Herzegovina":"🇧🇦",  USA:"🇺🇸",                  Paraguay:"🇵🇾",
  Australia:"🇦🇺",     Turkey:"🇹🇷",                  Qatar:"🇶🇦",                Switzerland:"🇨🇭",
  Brazil:"🇧🇷",        Morocco:"🇲🇦",                  Haiti:"🇭🇹",                Scotland:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Germany:"🇩🇪",       "Curaçao":"🇨🇼",               "Ivory Coast":"🇨🇮",        Ecuador:"🇪🇨",
  Netherlands:"🇳🇱",   Japan:"🇯🇵",                   Sweden:"🇸🇪",               Tunisia:"🇹🇳",
  Spain:"🇪🇸",         "Cape Verde":"🇨🇻",             Belgium:"🇧🇪",              Egypt:"🇪🇬",
  "Saudi Arabia":"🇸🇦",Uruguay:"🇺🇾",                  Iran:"🇮🇷",                 "New Zealand":"🇳🇿",
  France:"🇫🇷",        Senegal:"🇸🇳",                  Iraq:"🇮🇶",                 Norway:"🇳🇴",
  Argentina:"🇦🇷",     Algeria:"🇩🇿",                  Austria:"🇦🇹",              Jordan:"🇯🇴",
  Portugal:"🇵🇹",      "DR Congo":"🇨🇩",               Uzbekistan:"🇺🇿",           Colombia:"🇨🇴",
  England:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",     Croatia:"🇭🇷",                  Ghana:"🇬🇭",                Panama:"🇵🇦",
};

// Flag emoji lookup (returns 🏳 for unknown teams / TBD slots)
export const fl = t => FLAGS[t] || "🏳";


// ── Team Colors ───────────────────────────────────────────────────────────────
export const TC = {
  Mexico:"#006233",             "South Africa":"#007A4D",  "South Korea":"#C60C30",  Czechia:"#D7141A",
  Canada:"#FF0000",             "Bosnia & Herzegovina":"#002395", USA:"#002868",    Paraguay:"#D52B1E",
  Australia:"#C8A400",          Turkey:"#E30A17",           Qatar:"#8D1B3D",         Switzerland:"#E30A17",
  Brazil:"#009C3B",             Morocco:"#C1272D",           Haiti:"#00209F",         Scotland:"#003DA5",
  Germany:"#1c1c1c",            "Curaçao":"#002B7F",         "Ivory Coast":"#F77F00", Ecuador:"#FFD100",
  Netherlands:"#FF4713",        Japan:"#BC002D",             Sweden:"#006AA7",        Tunisia:"#E70013",
  Spain:"#C60B1E",              "Cape Verde":"#003893",      Belgium:"#EF3340",       Egypt:"#CE1126",
  "Saudi Arabia":"#006C35",     Uruguay:"#5AAAFF",           Iran:"#239F40",          "New Zealand":"#000000",
  France:"#002395",             Senegal:"#00853F",           Iraq:"#007A3D",          Norway:"#EF2B2D",
  Argentina:"#74ACDF",          Algeria:"#006233",           Austria:"#ED2939",       Jordan:"#007A3D",
  Portugal:"#006600",           "DR Congo":"#007FFF",        Uzbekistan:"#1EB53A",    Colombia:"#FCD116",
  England:"#012169",            Croatia:"#E30A17",           Ghana:"#006B3F",         Panama:"#DA121A",
};


// ── Team Name Aliases ─────────────────────────────────────────────────────────
// Used by resolveTeam() when matching live score API responses to fixture data
export const ALIASES = {
  "korea republic":"South Korea",     "republic of korea":"South Korea",
  "cote d ivoire":"Ivory Coast",      "ivory coast":"Ivory Coast",
  "côte d ivoire":"Ivory Coast",      "cote divoire":"Ivory Coast",
  "bosnia-herzegovina":"Bosnia & Herzegovina",
  "bosnia and herzegovina":"Bosnia & Herzegovina",
  "dr congo":"DR Congo",              "democratic republic of congo":"DR Congo",
  "congo dr":"DR Congo",              "drc":"DR Congo",
  "türkiye":"Turkey",                 "turkiye":"Turkey",
  "united states":"USA",              "united states of america":"USA",  "us":"USA",
  "czech republic":"Czechia",
  "cape verde":"Cape Verde",          "cabo verde":"Cape Verde",
  "new zealand":"New Zealand",        "nz":"New Zealand",
  "saudi arabia":"Saudi Arabia",      "ksa":"Saudi Arabia",
};

// Internal normaliser for team name matching (strips diacritics, lowercases)
const normT = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Resolve any team name variant to the canonical FLAGS key
export const resolveTeam = name => {
  if (!name) return null;
  const k = normT(name);
  if (ALIASES[k]) return ALIASES[k];
  for (const t of Object.keys(FLAGS)) { if (normT(t) === k) return t; }
  // Partial match fallback
  for (const t of Object.keys(FLAGS)) {
    if (k.includes(normT(t)) || normT(t).includes(k)) return t;
  }
  return name; // unresolved — return as-is
};


// ── Tiered Scoring ────────────────────────────────────────────────────────────
// picks   = { fixtureId: "H"|"D"|"A" }
// lm      = live-score map from Firestore  { fixtureId: { done, result, state, liveResult } }
// fixtures = FIXTURES array (passed in to avoid circular imports)
export const calcScore = (picks = {}, lm = {}, fixtures = []) =>
  fixtures.reduce((total, f) => {
    const pick   = picks[f.id];
    const result = lm[f.id];
    if (!pick || !result) return total;

    const pts = RC[f.round].pts;

    // Final result
    if (result.done && result.result)
      return total + (pick === result.result ? pts : 0);

    // In-progress (live result is provisional)
    if (result.state === "in" && result.liveResult)
      return total + (pick === result.liveResult ? pts : 0);

    return total;
  }, 0);


// ── Username / Team Name Validation ──────────────────────────────────────────
// norm  — lowercases + trims; used to compare usernames case-insensitively
export const norm  = s => s.trim().toLowerCase();

// valid — 2–24 chars, alphanumeric + space _ ' ! -
export const valid = s =>
  s.trim().length >= 2 &&
  s.trim().length <= 24 &&
  /^[a-zA-Z0-9 _'!-]+$/.test(s.trim());


// ── Date / Time Helpers ───────────────────────────────────────────────────────
// fmtDate  — "Thu, 11 Jun 2026"  (from ISO date string like "2026-06-11")
export const fmtDate = d =>
  new Date(d + "T12:00:00Z").toLocaleDateString([], {
    weekday:"short", day:"numeric", month:"short", year:"numeric",
  });

// fmtKO  — "15:00 UTC"  (from ISO datetime string)
export const fmtKO = ko => {
  try {
    return new Date(ko).toLocaleTimeString([], {
      hour:"2-digit", minute:"2-digit", timeZoneName:"short",
    });
  } catch { return "KO"; }
};

// cdown  — "2d 3h" / "45m" / null if already past
export const cdown = (ko, now) => {
  const ms = new Date(ko) - now;
  if (ms <= 0) return null;
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 60000);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
};


// ── Pick Locking / Match State ────────────────────────────────────────────────
// isLocked  — picks are locked 10 minutes before kick-off
export const isLocked   = (ko, now) => now >= new Date(ko).getTime() - 600_000;

// hasStarted — match has already kicked off
export const hasStarted = (ko, now) => now >= new Date(ko).getTime();


// ── League Code Generator ─────────────────────────────────────────────────────
// Produces a random 6-character alphanumeric code, e.g. "X7K9PQ"
export const gc = () => Math.random().toString(36).slice(2, 8).toUpperCase();


// ── localStorage Session Key ──────────────────────────────────────────────────
// The session object stored here: { username, teamName, leagueCode }
export const SESS_KEY = "wc26_session";


// ── WC Badge SVG ─────────────────────────────────────────────────────────────
// Returns the full SVG string at any size.
// Identical to the React <WcBadge size={x}/> component in the original.
export const wcBadge = (size = 52) => `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg26" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#141e38"/>
      <stop offset="100%" stop-color="#060810"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="49" fill="url(#bg26)"/>
  <circle cx="50" cy="50" r="48" fill="none" stroke="#C9A84C" stroke-width="1.5"/>
  <text x="50" y="72" text-anchor="middle" font-size="60" font-weight="900"
        fill="#C9A84C" fill-opacity="0.094" font-family="Arial Black,sans-serif">26</text>
  <path d="M28 36 Q26 20 50 16 Q74 20 72 36 Q70 52 50 56 Q30 52 28 36Z" fill="#C9A84C"/>
  <path d="M28 30 Q18 30 18 42 Q18 54 28 56"
        fill="none" stroke="#C9A84C" stroke-width="4" stroke-linecap="round"/>
  <path d="M72 30 Q82 30 82 42 Q82 54 72 56"
        fill="none" stroke="#C9A84C" stroke-width="4" stroke-linecap="round"/>
  <rect x="44" y="56" width="12" height="10" fill="#C9A84C"/>
  <rect x="36" y="66" width="28" height="5" rx="1" fill="#C9A84C"/>
  <rect x="31" y="71" width="38" height="5" rx="2" fill="#C9A84C"/>
  <rect x="27" y="76" width="46" height="7" rx="3" fill="#C9A84C"/>
  <circle cx="50" cy="30" r="11" fill="#3CAC3B" opacity="0.9"/>
  <ellipse cx="50" cy="30" rx="11" ry="4"
           fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
  <line x1="50" y1="19" x2="50" y2="41"
        stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
  <path d="M43 26 Q47 22 52 24 Q56 28 53 33 Q49 36 45 34 Q41 30 43 26Z"
        fill="#1a6e3a" opacity="0.9"/>
  <circle cx="46" cy="27" r="3" fill="rgba(255,255,255,0.12)"/>
  <rect x="2"  y="87" width="31" height="11" fill="#E61D25" opacity="0.9"/>
  <rect x="35" y="87" width="30" height="11" fill="white"   opacity="0.9"/>
  <rect x="67" y="87" width="31" height="11" fill="#3CAC3B" opacity="0.9"/>
  <text x="17" y="95" text-anchor="middle" font-size="6.5" font-weight="800"
        fill="white" font-family="Arial">USA</text>
  <text x="50" y="95" text-anchor="middle" font-size="6.5" font-weight="800"
        fill="#222" font-family="Arial">CAN</text>
  <text x="83" y="95" text-anchor="middle" font-size="6.5" font-weight="800"
        fill="white" font-family="Arial">MEX</text>
</svg>`;
