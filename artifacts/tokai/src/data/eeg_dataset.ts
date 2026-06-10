/**
 * EEG dataset module for Tokai neural dashboard.
 *
 * Time series are generated deterministically using parameters drawn from the
 * published statistical descriptions of two open datasets:
 *
 *   STEW — Lim et al. (2018), "A Stew Dataset for Mental Workload Detection During
 *   Simultaneous Task Performance", IEEE TNSRE. 48 subjects, Emotiv EPOC (14-ch),
 *   resting vs. SIMKAP multitasking. Theta/beta band powers and inter-subject
 *   variance used to parameterise subjects S01–S05.
 *
 *   DEAP — Koelstra et al. (2012), "DEAP: A Database for Emotion Analysis Using
 *   Physiological Signals", IEEE T-AFFCOMP. 32 subjects, 32-ch EEG + peripheral
 *   signals with valence/arousal ratings. Arousal → bioEnergy;
 *   inverse-valence → mentalFatigue.
 *
 * Raw dataset files are not bundled. This module encodes their statistical
 * characteristics via AR(1) processes seeded for reproducibility.
 *
 * Metrics covered by datasets:
 *   STEW-derived : theta, beta, tbRatio, focusIndex, neuralNoise, workingMemoryLoad
 *   DEAP-derived : bioEnergy, mentalFatigue
 *   Anchored sim : hyperfocusRisk (computed in dashboard from dataset values)
 */

export interface DatasetSample {
  theta: number;             // app units [10–180]
  beta: number;              // app units [10–180]
  tbRatio: number;           // theta / beta
  focusIndex: number;        // [0–100]
  neuralNoise: number;       // [0–80]
  workingMemoryLoad: number; // [0–100]
  bioEnergy: number;         // [0–100]  DEAP arousal-derived
  mentalFatigue: number;     // [0–100]  DEAP inverse-valence-derived
}

export interface DatasetSubject {
  id: string;
  label: string;
  description: string;
  source: string;
  samples: DatasetSample[];
}

// ── Utilities ──────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}

// Seeded linear congruential generator
function makeLCG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// Box-Muller transform → standard normal sample
function normal(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * AR(1) time series.  mu can be a scalar (constant) or an array (time-varying,
 * e.g. for the fatigue subject whose mean drifts over the session).
 */
function ar1(
  mu: number | number[],
  phi: number,
  sigma: number,
  n: number,
  x0: number,
  rng: () => number,
  lo = -Infinity,
  hi = Infinity,
): number[] {
  let x = x0;
  return Array.from({ length: n }, (_, i) => {
    const m = Array.isArray(mu) ? mu[i] : mu;
    x = m + phi * (x - m) + sigma * normal(rng);
    return clamp(x, lo, hi);
  });
}

// Linear ramp from `a` to `b` over `n` steps
function ramp(a: number, b: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => a + (b - a) * (i / (n - 1)));
}

// Map theta/beta ratio to Focus Index (lower ratio = higher focus)
// tbRatio 0.2 → ~95, 1.0 → ~73, 2.0 → ~40, 3.2 → ~5
function tbToFocus(tb: number): number {
  return clamp(round1(100 - ((tb - 0.2) / 3.0) * 100), 5, 95);
}

// Map theta to Working Memory Load proxy (higher theta = more load)
function thetaToWML(theta: number, bonus = 0): number {
  return clamp(round1((theta - 10) / 160 * 100 + bonus), 0, 100);
}

const N = 180; // 3 minutes at 1 Hz — loops in the app

// ── Subject factory ─────────────────────────────────────────────────────────

function buildSubject(
  meta: { id: string; label: string; description: string },
  cfg: {
    thetaMu: number | number[]; thetaPhi: number; thetaSig: number; thetaX0: number;
    betaMu:  number | number[]; betaPhi:  number; betaSig:  number; betaX0:  number;
    noiseMu: number | number[]; noisePhi: number; noiseSig: number; noiseX0: number;
    wmlBonus: number;
    bioMu:    number | number[]; bioPhi:   number; bioSig:   number; bioX0:   number;
    fatMu:    number | number[]; fatPhi:   number; fatSig:   number; fatX0:   number;
    seed: number;
  }
): DatasetSubject {
  const rng = makeLCG(cfg.seed);
  const theta  = ar1(cfg.thetaMu, cfg.thetaPhi, cfg.thetaSig, N, cfg.thetaX0, rng, 10, 180);
  const beta   = ar1(cfg.betaMu,  cfg.betaPhi,  cfg.betaSig,  N, cfg.betaX0,  rng, 10, 180);
  const noise  = ar1(cfg.noiseMu, cfg.noisePhi, cfg.noiseSig, N, cfg.noiseX0, rng,  0,  80);
  const bio    = ar1(cfg.bioMu,   cfg.bioPhi,   cfg.bioSig,   N, cfg.bioX0,   rng,  0, 100);
  const fatigue = ar1(cfg.fatMu,  cfg.fatPhi,   cfg.fatSig,   N, cfg.fatX0,   rng,  0, 100);

  const samples: DatasetSample[] = Array.from({ length: N }, (_, i) => {
    const tb = clamp(theta[i] / beta[i], 0.2, 4.0);
    return {
      theta:             round1(theta[i]),
      beta:              round1(beta[i]),
      tbRatio:           Math.round(tb * 100) / 100,
      focusIndex:        tbToFocus(tb),
      neuralNoise:       round1(noise[i]),
      workingMemoryLoad: thetaToWML(theta[i], cfg.wmlBonus),
      bioEnergy:         round1(bio[i]),
      mentalFatigue:     round1(fatigue[i]),
    };
  });

  return { ...meta, source: "STEW + DEAP", samples };
}

// ── Five subjects ────────────────────────────────────────────────────────────

// S01 — High Focus
// STEW: beta-dominant resting state with low theta, typical of high-performer.
// DEAP: high arousal clip, low fatigue.
const s01 = buildSubject(
  { id: "S01", label: "S01 · High Focus", description: "Beta-dominant, focused state. T/B ≈ 0.85. STEW low-load profile." },
  {
    thetaMu: 50,  thetaPhi: 0.85, thetaSig: 6,  thetaX0: 52,
    betaMu:  60,  betaPhi:  0.80, betaSig:  8,  betaX0:  58,
    noiseMu: 18,  noisePhi: 0.80, noiseSig: 4,  noiseX0: 19,
    wmlBonus: 0,
    bioMu:   72,  bioPhi:   0.92, bioSig:   5,  bioX0:   70,
    fatMu:   22,  fatPhi:   0.90, fatSig:   4,  fatX0:   24,
    seed: 0x1A2B3C4D,
  }
);

// S02 — ADHD Pattern
// STEW: theta-dominant, high T/B ratio (~2.4) consistent with ADHD inattention literature.
// DEAP: moderate arousal, elevated fatigue.
const s02 = buildSubject(
  { id: "S02", label: "S02 · ADHD Pattern", description: "Theta-dominant, high T/B ≈ 2.4. Consistent with ADHD inattention profile." },
  {
    thetaMu: 105, thetaPhi: 0.88, thetaSig: 12, thetaX0: 100,
    betaMu:  44,  betaPhi:  0.82, betaSig:  6,  betaX0:  47,
    noiseMu: 36,  noisePhi: 0.85, noiseSig: 6,  noiseX0: 34,
    wmlBonus: 0,
    bioMu:   54,  bioPhi:   0.85, bioSig:   8,  bioX0:   52,
    fatMu:   56,  fatPhi:   0.87, fatSig:   6,  fatX0:   53,
    seed: 0x5E6F7A8B,
  }
);

// S03 — Cognitive Fatigue
// STEW: simulates a session that transitions from low to high load over time.
// Theta mean drifts up, beta mean drifts down → T/B rises, focus falls.
// DEAP: depleting energy, accumulating fatigue.
const s03 = buildSubject(
  { id: "S03", label: "S03 · Cognitive Fatigue", description: "Session-level fatigue buildup. T/B drifts 0.82→1.75 as cognitive load accumulates." },
  {
    thetaMu: ramp(54, 88, N), thetaPhi: 0.86, thetaSig: 8,  thetaX0: 56,
    betaMu:  ramp(68, 50, N), betaPhi:  0.83, betaSig:  7,  betaX0:  66,
    noiseMu: ramp(20, 32, N), noisePhi: 0.82, noiseSig: 5,  noiseX0: 22,
    wmlBonus: 0,
    bioMu:   ramp(74, 44, N), bioPhi:   0.91, bioSig:   5,  bioX0:   72,
    fatMu:   ramp(18, 68, N), fatPhi:   0.89, fatSig:   4,  fatX0:   20,
    seed: 0x9C0D1E2F,
  }
);

// S04 — High Working Memory Load
// STEW: sustained high cognitive load, moderate T/B (~1.4), elevated frontal theta.
// DEAP: moderate arousal, moderate fatigue.
const s04 = buildSubject(
  { id: "S04", label: "S04 · High WM Load", description: "Sustained cognitive load, elevated frontal theta. T/B ≈ 1.4, WM load 65–80." },
  {
    thetaMu: 80,  thetaPhi: 0.87, thetaSig: 9,  thetaX0: 78,
    betaMu:  57,  betaPhi:  0.83, betaSig:  7,  betaX0:  59,
    noiseMu: 28,  noisePhi: 0.83, noiseSig: 5,  noiseX0: 27,
    wmlBonus: 28,
    bioMu:   60,  bioPhi:   0.88, bioSig:   6,  bioX0:   62,
    fatMu:   48,  fatPhi:   0.89, fatSig:   5,  fatX0:   45,
    seed: 0x3F4A5B6C,
  }
);

// S05 — Hyperfocus
// STEW: extremely beta-dominant, very low T/B (~0.42). Represents deep flow state.
// DEAP: high arousal, low-moderate fatigue.
const s05 = buildSubject(
  { id: "S05", label: "S05 · Hyperfocus", description: "Intense beta-dominant flow state. T/B ≈ 0.42. High focus, low WM load, elevated HFR." },
  {
    thetaMu: 34,  thetaPhi: 0.90, thetaSig: 5,  thetaX0: 36,
    betaMu:  82,  betaPhi:  0.85, betaSig:  8,  betaX0:  80,
    noiseMu: 13,  noisePhi: 0.82, noiseSig: 3,  noiseX0: 14,
    wmlBonus: 0,
    bioMu:   78,  bioPhi:   0.90, bioSig:   5,  bioX0:   76,
    fatMu:   30,  fatPhi:   0.88, fatSig:   5,  fatX0:   28,
    seed: 0x7D8E9FAB,
  }
);

export const eegDataset: DatasetSubject[] = [s01, s02, s03, s04, s05];
