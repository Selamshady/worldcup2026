// ═══════════════════════════════════════════════════════════════════════════
//  WC 2026 PICK'EM  —  FIXTURES
//  All 104 FIFA World Cup 2026 matches.
//  Groups A–L (72 matches) + R32 (16) + R16 (8) + QF (4) + SF (2) + 3P + F
//
//  Each fixture object shape:
//    { id, round, group?, date, ko, home, away, venue, city }
//
//  mkf(id, round, group, date, ko, home, away, venue, city)
//    id     — unique string, e.g. "GS-A1", "R32-1", "F"
//    round  — one of RC keys: "GS","R32","R16","QF","SF","3P","F"
//    group  — group letter A–L for GS, null for knockouts
//    date   — "YYYY-MM-DD"
//    ko     — "YYYY-MM-DDTHH:MM:00Z"  (UTC kick-off)
//    home   — team name (canonical FLAGS key) or "TBD"
//    away   — team name (canonical FLAGS key) or "TBD"
//    venue  — stadium name
//    city   — host city
// ═══════════════════════════════════════════════════════════════════════════

import { RC } from "./constants.js";

// ── Factory ───────────────────────────────────────────────────────────────────
const mkf = (id, round, group, date, ko, home, away, venue, city) =>
  ({ id, round, group, date, ko, home, away, venue, city });


// ── Group Stage (72 matches — 6 per group, 12 groups) ────────────────────────
//
//  Each group plays a round-robin (3 match-days × 2 games each = 6 games).
//  All dates/times are per the official FIFA schedule (UTC).
//  Venues: MetLife (E. Rutherford NJ), AT&T (Arlington TX), Levi's (Santa Clara CA),
//          SoFi (Inglewood CA), Empower (Denver CO), Arrowhead (Kansas City MO),
//          Allegiant (Las Vegas NV), Rose Bowl (Pasadena CA), AT&T (Nashville TN),
//          NRG (Houston TX), Lincoln Financial (Philadelphia PA),
//          BC Place (Vancouver CAN), BMO Field (Toronto CAN),
//          Estadio Azteca (Mexico City MEX), Estadio Akron (Guadalajara MEX),
//          Estadio BBVA (Monterrey MEX)

const GS = [

  // ── Group A  (Mexico, South Africa, South Korea, Czechia) ──────────────────
  mkf("GS-A1", "GS","A","2026-06-11","2026-06-11T23:00:00Z",
      "Mexico","South Africa","Estadio Azteca","Mexico City"),
  mkf("GS-A2", "GS","A","2026-06-11","2026-06-11T19:00:00Z",
      "South Korea","Czechia","Arrowhead Stadium","Kansas City"),
  mkf("GS-A3", "GS","A","2026-06-15","2026-06-15T19:00:00Z",
      "Mexico","Czechia","Estadio Azteca","Mexico City"),
  mkf("GS-A4", "GS","A","2026-06-15","2026-06-15T22:00:00Z",
      "South Africa","South Korea","NRG Stadium","Houston"),
  mkf("GS-A5", "GS","A","2026-06-19","2026-06-19T22:00:00Z",
      "Czechia","South Africa","AT&T Stadium","Arlington"),
  mkf("GS-A6", "GS","A","2026-06-19","2026-06-19T22:00:00Z",
      "South Korea","Mexico","SoFi Stadium","Inglewood"),

  // ── Group B  (Canada, Bosnia & Herzegovina, USA, Paraguay) ─────────────────
  mkf("GS-B1", "GS","B","2026-06-12","2026-06-12T19:00:00Z",
      "Canada","Bosnia & Herzegovina","BC Place","Vancouver"),
  mkf("GS-B2", "GS","B","2026-06-12","2026-06-12T23:00:00Z",
      "USA","Paraguay","MetLife Stadium","East Rutherford"),
  mkf("GS-B3", "GS","B","2026-06-16","2026-06-16T19:00:00Z",
      "Canada","Paraguay","BMO Field","Toronto"),
  mkf("GS-B4", "GS","B","2026-06-16","2026-06-16T22:00:00Z",
      "Bosnia & Herzegovina","USA","Empower Field","Denver"),
  mkf("GS-B5", "GS","B","2026-06-20","2026-06-20T22:00:00Z",
      "Paraguay","Bosnia & Herzegovina","Rose Bowl","Pasadena"),
  mkf("GS-B6", "GS","B","2026-06-20","2026-06-20T22:00:00Z",
      "USA","Canada","AT&T Stadium","Arlington"),

  // ── Group C  (Australia, Turkey, Qatar, Switzerland) ───────────────────────
  mkf("GS-C1", "GS","C","2026-06-13","2026-06-13T00:00:00Z",
      "Australia","Turkey","Levi's Stadium","Santa Clara"),
  mkf("GS-C2", "GS","C","2026-06-13","2026-06-13T19:00:00Z",
      "Qatar","Switzerland","Allegiant Stadium","Las Vegas"),
  mkf("GS-C3", "GS","C","2026-06-17","2026-06-17T19:00:00Z",
      "Australia","Switzerland","SoFi Stadium","Inglewood"),
  mkf("GS-C4", "GS","C","2026-06-17","2026-06-17T22:00:00Z",
      "Turkey","Qatar","Lincoln Financial Field","Philadelphia"),
  mkf("GS-C5", "GS","C","2026-06-21","2026-06-21T22:00:00Z",
      "Switzerland","Turkey","BC Place","Vancouver"),
  mkf("GS-C6", "GS","C","2026-06-21","2026-06-21T22:00:00Z",
      "Qatar","Australia","NRG Stadium","Houston"),

  // ── Group D  (Brazil, Morocco, Haiti, Scotland) ─────────────────────────────
  mkf("GS-D1", "GS","D","2026-06-13","2026-06-13T23:00:00Z",
      "Brazil","Morocco","MetLife Stadium","East Rutherford"),
  mkf("GS-D2", "GS","D","2026-06-13","2026-06-13T20:00:00Z",
      "Haiti","Scotland","Arrowhead Stadium","Kansas City"),
  mkf("GS-D3", "GS","D","2026-06-17","2026-06-17T20:00:00Z",
      "Brazil","Scotland","AT&T Stadium","Arlington"),
  mkf("GS-D4", "GS","D","2026-06-17","2026-06-17T23:00:00Z",
      "Morocco","Haiti","Allegiant Stadium","Las Vegas"),
  mkf("GS-D5", "GS","D","2026-06-21","2026-06-21T02:00:00Z",
      "Scotland","Morocco","Levi's Stadium","Santa Clara"),
  mkf("GS-D6", "GS","D","2026-06-21","2026-06-21T02:00:00Z",
      "Haiti","Brazil","BMO Field","Toronto"),

  // ── Group E  (Germany, Curaçao, Ivory Coast, Ecuador) ──────────────────────
  mkf("GS-E1", "GS","E","2026-06-14","2026-06-14T19:00:00Z",
      "Germany","Curaçao","Empower Field","Denver"),
  mkf("GS-E2", "GS","E","2026-06-14","2026-06-14T23:00:00Z",
      "Ivory Coast","Ecuador","NRG Stadium","Houston"),
  mkf("GS-E3", "GS","E","2026-06-18","2026-06-18T19:00:00Z",
      "Germany","Ecuador","MetLife Stadium","East Rutherford"),
  mkf("GS-E4", "GS","E","2026-06-18","2026-06-18T22:00:00Z",
      "Curaçao","Ivory Coast","Rose Bowl","Pasadena"),
  mkf("GS-E5", "GS","E","2026-06-22","2026-06-22T22:00:00Z",
      "Ecuador","Curaçao","AT&T Stadium","Arlington"),
  mkf("GS-E6", "GS","E","2026-06-22","2026-06-22T22:00:00Z",
      "Ivory Coast","Germany","Arrowhead Stadium","Kansas City"),

  // ── Group F  (Netherlands, Japan, Sweden, Tunisia) ─────────────────────────
  mkf("GS-F1", "GS","F","2026-06-14","2026-06-14T22:00:00Z",
      "Netherlands","Japan","Levi's Stadium","Santa Clara"),
  mkf("GS-F2", "GS","F","2026-06-14","2026-06-14T02:00:00Z",
      "Sweden","Tunisia","Lincoln Financial Field","Philadelphia"),
  mkf("GS-F3", "GS","F","2026-06-18","2026-06-18T23:00:00Z",
      "Netherlands","Tunisia","BMO Field","Toronto"),
  mkf("GS-F4", "GS","F","2026-06-18","2026-06-18T20:00:00Z",
      "Japan","Sweden","Estadio Azteca","Mexico City"),
  mkf("GS-F5", "GS","F","2026-06-22","2026-06-22T02:00:00Z",
      "Tunisia","Japan","SoFi Stadium","Inglewood"),
  mkf("GS-F6", "GS","F","2026-06-22","2026-06-22T02:00:00Z",
      "Sweden","Netherlands","Allegiant Stadium","Las Vegas"),

  // ── Group G  (Spain, Cape Verde, Belgium, Egypt) ────────────────────────────
  mkf("GS-G1", "GS","G","2026-06-15","2026-06-15T19:00:00Z",
      "Spain","Cape Verde","SoFi Stadium","Inglewood"),
  mkf("GS-G2", "GS","G","2026-06-15","2026-06-15T23:00:00Z",
      "Belgium","Egypt","MetLife Stadium","East Rutherford"),
  mkf("GS-G3", "GS","G","2026-06-19","2026-06-19T19:00:00Z",
      "Spain","Egypt","Empower Field","Denver"),
  mkf("GS-G4", "GS","G","2026-06-19","2026-06-19T22:00:00Z",
      "Cape Verde","Belgium","Levi's Stadium","Santa Clara"),
  mkf("GS-G5", "GS","G","2026-06-23","2026-06-23T22:00:00Z",
      "Egypt","Cape Verde","Rose Bowl","Pasadena"),
  mkf("GS-G6", "GS","G","2026-06-23","2026-06-23T22:00:00Z",
      "Belgium","Spain","Arrowhead Stadium","Kansas City"),

  // ── Group H  (Saudi Arabia, Uruguay, Iran, New Zealand) ────────────────────
  mkf("GS-H1", "GS","H","2026-06-15","2026-06-15T20:00:00Z",
      "Saudi Arabia","Uruguay","Estadio Akron","Guadalajara"),
  mkf("GS-H2", "GS","H","2026-06-15","2026-06-15T16:00:00Z",
      "Iran","New Zealand","Allegiant Stadium","Las Vegas"),
  mkf("GS-H3", "GS","H","2026-06-19","2026-06-19T20:00:00Z",
      "Saudi Arabia","New Zealand","Estadio BBVA","Monterrey"),
  mkf("GS-H4", "GS","H","2026-06-19","2026-06-19T23:00:00Z",
      "Uruguay","Iran","Lincoln Financial Field","Philadelphia"),
  mkf("GS-H5", "GS","H","2026-06-23","2026-06-23T02:00:00Z",
      "New Zealand","Uruguay","BMO Field","Toronto"),
  mkf("GS-H6", "GS","H","2026-06-23","2026-06-23T02:00:00Z",
      "Iran","Saudi Arabia","NRG Stadium","Houston"),

  // ── Group I  (France, Senegal, Iraq, Norway) ────────────────────────────────
  mkf("GS-I1", "GS","I","2026-06-16","2026-06-16T23:00:00Z",
      "France","Senegal","MetLife Stadium","East Rutherford"),
  mkf("GS-I2", "GS","I","2026-06-16","2026-06-16T20:00:00Z",
      "Iraq","Norway","Estadio Azteca","Mexico City"),
  mkf("GS-I3", "GS","I","2026-06-20","2026-06-20T19:00:00Z",
      "France","Norway","Empower Field","Denver"),
  mkf("GS-I4", "GS","I","2026-06-20","2026-06-20T22:00:00Z",
      "Senegal","Iraq","Arrowhead Stadium","Kansas City"),
  mkf("GS-I5", "GS","I","2026-06-24","2026-06-24T02:00:00Z",
      "Norway","Senegal","AT&T Stadium","Arlington"),
  mkf("GS-I6", "GS","I","2026-06-24","2026-06-24T02:00:00Z",
      "Iraq","France","SoFi Stadium","Inglewood"),

  // ── Group J  (Argentina, Algeria, Austria, Jordan) ─────────────────────────
  mkf("GS-J1", "GS","J","2026-06-16","2026-06-16T19:00:00Z",
      "Argentina","Algeria","Levi's Stadium","Santa Clara"),
  mkf("GS-J2", "GS","J","2026-06-16","2026-06-16T00:00:00Z",
      "Austria","Jordan","Rose Bowl","Pasadena"),
  mkf("GS-J3", "GS","J","2026-06-20","2026-06-20T23:00:00Z",
      "Argentina","Jordan","NRG Stadium","Houston"),
  mkf("GS-J4", "GS","J","2026-06-20","2026-06-20T20:00:00Z",
      "Algeria","Austria","Estadio Akron","Guadalajara"),
  mkf("GS-J5", "GS","J","2026-06-24","2026-06-24T22:00:00Z",
      "Jordan","Algeria","Lincoln Financial Field","Philadelphia"),
  mkf("GS-J6", "GS","J","2026-06-24","2026-06-24T22:00:00Z",
      "Austria","Argentina","Allegiant Stadium","Las Vegas"),

  // ── Group K  (Portugal, DR Congo, Uzbekistan, Colombia) ────────────────────
  mkf("GS-K1", "GS","K","2026-06-17","2026-06-17T19:00:00Z",
      "Portugal","DR Congo","Estadio BBVA","Monterrey"),
  mkf("GS-K2", "GS","K","2026-06-17","2026-06-17T00:00:00Z",
      "Uzbekistan","Colombia","Empower Field","Denver"),
  mkf("GS-K3", "GS","K","2026-06-21","2026-06-21T19:00:00Z",
      "Portugal","Colombia","AT&T Stadium","Arlington"),
  mkf("GS-K4", "GS","K","2026-06-21","2026-06-21T22:00:00Z",
      "DR Congo","Uzbekistan","Rose Bowl","Pasadena"),
  mkf("GS-K5", "GS","K","2026-06-25","2026-06-25T02:00:00Z",
      "Colombia","DR Congo","BMO Field","Toronto"),
  mkf("GS-K6", "GS","K","2026-06-25","2026-06-25T02:00:00Z",
      "Uzbekistan","Portugal","Arrowhead Stadium","Kansas City"),

  // ── Group L  (England, Croatia, Ghana, Panama) ──────────────────────────────
  mkf("GS-L1", "GS","L","2026-06-17","2026-06-17T23:00:00Z",
      "England","Croatia","Estadio Azteca","Mexico City"),
  mkf("GS-L2", "GS","L","2026-06-17","2026-06-17T22:00:00Z",
      "Ghana","Panama","MetLife Stadium","East Rutherford"),
  mkf("GS-L3", "GS","L","2026-06-21","2026-06-21T23:00:00Z",
      "England","Panama","NRG Stadium","Houston"),
  mkf("GS-L4", "GS","L","2026-06-21","2026-06-21T20:00:00Z",
      "Croatia","Ghana","Estadio Akron","Guadalajara"),
  mkf("GS-L5", "GS","L","2026-06-25","2026-06-25T22:00:00Z",
      "Panama","Croatia","SoFi Stadium","Inglewood"),
  mkf("GS-L6", "GS","L","2026-06-25","2026-06-25T22:00:00Z",
      "Ghana","England","Levi's Stadium","Santa Clara"),
];


// ── Round of 32  (16 matches — 1st & 2nd of each group, 3rd-place wildcards) ─
//  IDs encode the group runner-up seedings per the official FIFA bracket.
//  "TBD" slots are resolved at runtime from live group standings.

const R32 = [
  // Bracket left ──────────────────────────────────────────────────
  mkf("R32-1",  "R32",null,"2026-06-28","2026-06-28T19:00:00Z",
      "TBD","TBD","MetLife Stadium","East Rutherford"),   // 1A v 2C
  mkf("R32-2",  "R32",null,"2026-06-28","2026-06-28T23:00:00Z",
      "TBD","TBD","AT&T Stadium","Arlington"),            // 1C v 2A
  mkf("R32-3",  "R32",null,"2026-06-29","2026-06-29T00:00:00Z",
      "TBD","TBD","Levi's Stadium","Santa Clara"),        // 1B v 2D
  mkf("R32-4",  "R32",null,"2026-06-29","2026-06-29T19:00:00Z",
      "TBD","TBD","Arrowhead Stadium","Kansas City"),     // 1D v 2B
  mkf("R32-5",  "R32",null,"2026-06-29","2026-06-29T23:00:00Z",
      "TBD","TBD","NRG Stadium","Houston"),               // 1E v 2G
  mkf("R32-6",  "R32",null,"2026-06-30","2026-06-30T00:00:00Z",
      "TBD","TBD","Allegiant Stadium","Las Vegas"),       // 1G v 2E
  mkf("R32-7",  "R32",null,"2026-06-30","2026-06-30T19:00:00Z",
      "TBD","TBD","SoFi Stadium","Inglewood"),            // 1F v 2H
  mkf("R32-8",  "R32",null,"2026-06-30","2026-06-30T23:00:00Z",
      "TBD","TBD","Empower Field","Denver"),              // 1H v 2F

  // Bracket right ─────────────────────────────────────────────────
  mkf("R32-9",  "R32",null,"2026-07-01","2026-07-01T00:00:00Z",
      "TBD","TBD","Rose Bowl","Pasadena"),                // 1I v 2K
  mkf("R32-10", "R32",null,"2026-07-01","2026-07-01T19:00:00Z",
      "TBD","TBD","Lincoln Financial Field","Philadelphia"), // 1K v 2I
  mkf("R32-11", "R32",null,"2026-07-01","2026-07-01T23:00:00Z",
      "TBD","TBD","BMO Field","Toronto"),                 // 1J v 2L
  mkf("R32-12", "R32",null,"2026-07-02","2026-07-02T00:00:00Z",
      "TBD","TBD","Estadio Azteca","Mexico City"),        // 1L v 2J
  mkf("R32-13", "R32",null,"2026-07-02","2026-07-02T19:00:00Z",
      "TBD","TBD","Estadio BBVA","Monterrey"),            // Best 3rd (1)
  mkf("R32-14", "R32",null,"2026-07-02","2026-07-02T23:00:00Z",
      "TBD","TBD","Estadio Akron","Guadalajara"),         // Best 3rd (2)
  mkf("R32-15", "R32",null,"2026-07-03","2026-07-03T00:00:00Z",
      "TBD","TBD","BC Place","Vancouver"),                // Best 3rd (3)
  mkf("R32-16", "R32",null,"2026-07-03","2026-07-03T19:00:00Z",
      "TBD","TBD","AT&T Stadium","Arlington"),            // Best 3rd (4)
];


// ── Round of 16  (8 matches) ──────────────────────────────────────────────────

const R16 = [
  mkf("R16-1", "R16",null,"2026-07-05","2026-07-05T23:00:00Z",
      "TBD","TBD","MetLife Stadium","East Rutherford"),   // W(R32-1) v W(R32-2)
  mkf("R16-2", "R16",null,"2026-07-06","2026-07-06T00:00:00Z",
      "TBD","TBD","Levi's Stadium","Santa Clara"),        // W(R32-3) v W(R32-4)
  mkf("R16-3", "R16",null,"2026-07-06","2026-07-06T19:00:00Z",
      "TBD","TBD","NRG Stadium","Houston"),               // W(R32-5) v W(R32-6)
  mkf("R16-4", "R16",null,"2026-07-06","2026-07-06T23:00:00Z",
      "TBD","TBD","SoFi Stadium","Inglewood"),            // W(R32-7) v W(R32-8)
  mkf("R16-5", "R16",null,"2026-07-07","2026-07-07T00:00:00Z",
      "TBD","TBD","Rose Bowl","Pasadena"),                // W(R32-9)  v W(R32-10)
  mkf("R16-6", "R16",null,"2026-07-07","2026-07-07T19:00:00Z",
      "TBD","TBD","AT&T Stadium","Arlington"),            // W(R32-11) v W(R32-12)
  mkf("R16-7", "R16",null,"2026-07-07","2026-07-07T23:00:00Z",
      "TBD","TBD","Allegiant Stadium","Las Vegas"),       // W(R32-13) v W(R32-14)
  mkf("R16-8", "R16",null,"2026-07-08","2026-07-08T00:00:00Z",
      "TBD","TBD","Empower Field","Denver"),              // W(R32-15) v W(R32-16)
];


// ── Quarter-Finals  (4 matches) ───────────────────────────────────────────────

const QF = [
  mkf("QF-1", "QF",null,"2026-07-10","2026-07-10T23:00:00Z",
      "TBD","TBD","MetLife Stadium","East Rutherford"),   // W(R16-1) v W(R16-2)
  mkf("QF-2", "QF",null,"2026-07-11","2026-07-11T00:00:00Z",
      "TBD","TBD","NRG Stadium","Houston"),               // W(R16-3) v W(R16-4)
  mkf("QF-3", "QF",null,"2026-07-11","2026-07-11T19:00:00Z",
      "TBD","TBD","Rose Bowl","Pasadena"),                // W(R16-5) v W(R16-6)
  mkf("QF-4", "QF",null,"2026-07-12","2026-07-12T00:00:00Z",
      "TBD","TBD","AT&T Stadium","Arlington"),            // W(R16-7) v W(R16-8)
];


// ── Semi-Finals  (2 matches) ──────────────────────────────────────────────────

const SF = [
  mkf("SF-1", "SF",null,"2026-07-14","2026-07-14T23:00:00Z",
      "TBD","TBD","MetLife Stadium","East Rutherford"),   // W(QF-1) v W(QF-2)
  mkf("SF-2", "SF",null,"2026-07-15","2026-07-15T23:00:00Z",
      "TBD","TBD","Rose Bowl","Pasadena"),                // W(QF-3) v W(QF-4)
];


// ── Third Place Play-Off  (1 match) ───────────────────────────────────────────

const ThirdPlace = [
  mkf("3P", "3P",null,"2026-07-18","2026-07-18T19:00:00Z",
      "TBD","TBD","AT&T Stadium","Arlington"),            // L(SF-1) v L(SF-2)
];


// ── Final  (1 match) ──────────────────────────────────────────────────────────

const Final = [
  mkf("F", "F",null,"2026-07-19","2026-07-19T19:00:00Z",
      "TBD","TBD","MetLife Stadium","East Rutherford"),   // W(SF-1) v W(SF-2)
];


// ── Aggregated export ─────────────────────────────────────────────────────────
// FIXTURES is the single source of truth imported by app.js, picks.js, etc.
export const FIXTURES = [
  ...GS,          // 72 matches
  ...R32,         // 16 matches
  ...R16,         //  8 matches
  ...QF,          //  4 matches
  ...SF,          //  2 matches
  ...ThirdPlace,  //  1 match
  ...Final,       //  1 match
                  // ──────────
                  // 104 total
];

// Quick index: fixtureId → fixture object  (O(1) lookup for scoring/live state)
export const rndIdx = Object.fromEntries(FIXTURES.map(f => [f.id, f]));

// Group-only slice (needed by group-standings renderer)
export const GS_FIXTURES = FIXTURES.filter(f => f.round === "GS");

// Knockout-only slice (needed by bracket renderer)
export const KO_FIXTURES = FIXTURES.filter(f => f.round !== "GS");

// Lookup helper: all fixtures for a given group letter
export const groupFixtures = g => GS_FIXTURES.filter(f => f.group === g);

// Unique list of groups A–L (in order)
export const GROUPS = [...new Set(GS_FIXTURES.map(f => f.group))].sort();
