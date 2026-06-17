"""
process_stew.py — Convert STEW .mat files to stew_processed.json for Tokai.

Usage:
    python scripts/process_stew.py --input /path/to/stew/folder --output src/data/stew_processed.json

The STEW dataset (Lim et al. 2018, IEEE TNSRE) is available at:
    https://ieee-dataport.org/open-access/stew-simultaneous-task-eeg-workload-dataset

Each .mat file contains raw EEG for one subject (128 Hz, 14 Emotiv EPOC channels).
This script extracts 2-second epochs from the SIMKAP (multitasking) condition,
computes theta (4-8 Hz) and beta (13-30 Hz) band powers, and normalises them
to Tokai's display scale.

Output JSON shape:
    [
      {
        "id": "S01",
        "label": "Subject 1",
        "description": "...",
        "source": "STEW (Lim et al. 2018)",
        "samples": [
          {
            "theta": 52.3,          // app units [10-180]
            "beta": 61.4,
            "tbRatio": 0.85,
            "focusIndex": 71.7,
            "neuralNoise": 18.2,
            "workingMemoryLoad": 34.1,
            "bioEnergy": 64.0,      // estimated from load profile
            "mentalFatigue": 28.5   // estimated from time-on-task
          },
          ...
        ]
      },
      ...
    ]
"""

import argparse
import json
import math
import os
from pathlib import Path

import numpy as np
from scipy.io import loadmat
from scipy.signal import welch

# ── Constants ─────────────────────────────────────────────────────────────────

FS = 128          # Emotiv EPOC sampling rate (Hz)
EPOCH_SEC = 2     # epoch length in seconds
N_EPOCHS = 180    # 6 minutes of data → loops in 3-min display window

THETA = (4, 8)    # Hz
BETA  = (13, 30)  # Hz

# Emotiv EPOC 14-ch order: AF3 F7 F3 FC5 T7 P7 O1 O2 P8 T8 FC6 F4 F8 AF4
# Frontal channels (frontal theta, WM load): AF3 F7 F3 FC5 F4 F8 AF4
FRONTAL_IDX = [0, 1, 2, 3, 11, 12, 13]
# All channels for general band power
ALL_IDX = list(range(14))

# Target app scale
APP_THETA_LO, APP_THETA_HI = 10, 180
APP_BETA_LO,  APP_BETA_HI  = 10, 180

# ── Utilities ─────────────────────────────────────────────────────────────────

def bandpower(epoch_ch_x_samples: np.ndarray, fs: int, band: tuple, ch_idx: list) -> float:
    """Mean band power across selected channels for one epoch."""
    sub = epoch_ch_x_samples[ch_idx, :]
    freqs, psd = welch(sub, fs=fs, nperseg=fs * EPOCH_SEC, axis=1)
    mask = (freqs >= band[0]) & (freqs <= band[1])
    return float(np.mean(psd[:, mask]))


def log_normalise(values: list[float], lo: float, hi: float) -> list[float]:
    """
    Log-transform (EEG power is log-normal) then linearly map the
    5th–95th percentile range to [lo, hi]. Robust to outliers.
    """
    arr = np.log(np.array(values) + 1e-9)
    p5, p95 = np.percentile(arr, 5), np.percentile(arr, 95)
    if p95 == p5:
        return [round((lo + hi) / 2, 1)] * len(values)
    normed = (arr - p5) / (p95 - p5)
    scaled = lo + normed * (hi - lo)
    return [round(float(np.clip(v, lo, hi)), 1) for v in scaled]


def tb_to_focus(tb: float) -> float:
    """Mirror of the TypeScript tbToFocus() in eeg_dataset.ts."""
    return round(max(5.0, min(95.0, 100 - ((tb - 0.2) / 3.0) * 100)), 1)


def theta_to_wml(theta_app: float, bonus: float = 0.0) -> float:
    return round(max(0.0, min(100.0, (theta_app - 10) / 160 * 100 + bonus)), 1)


def noise_from_variance(epoch_ch_x_samples: np.ndarray, ch_idx: list) -> float:
    """
    Proxy for neural noise: inter-channel variance of the high-frequency
    (> 40 Hz) power, normalised to [0-80].
    """
    sub = epoch_ch_x_samples[ch_idx, :]
    freqs, psd = welch(sub, fs=FS, nperseg=FS * EPOCH_SEC, axis=1)
    hf_mask = freqs > 40
    hf_power = np.mean(psd[:, hf_mask], axis=1)
    return float(np.var(hf_power))


# ── File loading ──────────────────────────────────────────────────────────────

SIMKAP_KEYS = ["SIMKAP", "simkap", "task", "Task", "rest", "REST",
               "data", "EEG", "eeg", "raw"]

def load_simkap(mat_path: Path) -> np.ndarray:
    """
    Load SIMKAP (multitasking) condition from a STEW .mat file.
    Returns array shaped [14 channels × samples].
    Raises ValueError with available key names if nothing matches.
    """
    mat = loadmat(str(mat_path), simplify_cells=True)
    user_keys = {k: v for k, v in mat.items() if not k.startswith("_")}

    # Try known key names for the task condition
    raw = None
    for key in SIMKAP_KEYS:
        if key in user_keys:
            raw = np.array(user_keys[key], dtype=float)
            break

    if raw is None:
        raise ValueError(
            f"{mat_path.name}: none of {SIMKAP_KEYS} found.\n"
            f"  Available keys: {list(user_keys.keys())}\n"
            f"  Re-run with --inspect to dump the file structure."
        )

    # Ensure [channels × samples]
    if raw.ndim == 1:
        raise ValueError(f"{mat_path.name}: data is 1-D, expected 2-D.")
    if raw.shape[0] > raw.shape[1]:
        raw = raw.T   # was [samples × channels]

    if raw.shape[0] < 14:
        raise ValueError(f"{mat_path.name}: expected ≥14 channels, got {raw.shape[0]}.")

    return raw[:14, :]   # keep first 14 channels (standard Emotiv EPOC order)


# ── Per-subject processing ────────────────────────────────────────────────────

def process_subject(mat_path: Path, n_epochs: int) -> tuple[list[float], list[float], list[float]]:
    """
    Returns (theta_raw, beta_raw, noise_raw) lists — one value per epoch.
    """
    raw = load_simkap(mat_path)
    ep = EPOCH_SEC * FS
    max_epochs = raw.shape[1] // ep
    actual = min(n_epochs, max_epochs)

    if actual < 10:
        raise ValueError(f"{mat_path.name}: only {max_epochs} epochs available (need ≥10).")

    thetas, betas, noises = [], [], []
    for i in range(actual):
        epoch = raw[:, i * ep : (i + 1) * ep]
        thetas.append(bandpower(epoch, FS, THETA, FRONTAL_IDX))
        betas.append( bandpower(epoch, FS, BETA,  ALL_IDX))
        noises.append(noise_from_variance(epoch, ALL_IDX))

    return thetas, betas, noises


# ── Profile labels ────────────────────────────────────────────────────────────

def describe_subject(sid: str, mean_focus: float, mean_wml: float) -> tuple[str, str]:
    """Generate a human-readable label and description from derived stats."""
    if mean_focus >= 70:
        label = f"{sid} — High Focus"
        desc  = f"Beta-dominant profile. Focus index avg {mean_focus:.0f}. Low T/B ratio."
    elif mean_wml >= 60:
        label = f"{sid} — High WM Load"
        desc  = f"Elevated frontal theta (WM load avg {mean_wml:.0f}). Sustained cognitive demand."
    elif mean_focus <= 40:
        label = f"{sid} — Low Focus"
        desc  = f"Theta-dominant. Focus avg {mean_focus:.0f}, consistent with mind-wandering or fatigue."
    else:
        label = f"{sid} — Moderate Load"
        desc  = f"Mid-range focus ({mean_focus:.0f}) and WM load ({mean_wml:.0f}). Typical multitasking state."
    return label, desc


# ── Soft metric estimation ────────────────────────────────────────────────────

def estimate_bio_energy(wml_series: list[float], mean_focus: float) -> list[float]:
    """
    bioEnergy proxy: starts higher when focus is high, depletes slightly over
    time (time-on-task effect), anti-correlated with WM load.
    """
    n = len(wml_series)
    base = 30 + mean_focus * 0.5          # anchor: higher focus → more energy
    depletion = [base - (i / n) * 20 for i in range(n)]   # slow drain
    result = [round(max(5.0, min(95.0, d - (w - 50) * 0.2)), 1)
              for d, w in zip(depletion, wml_series)]
    return result


def estimate_mental_fatigue(wml_series: list[float], n: int) -> list[float]:
    """
    mentalFatigue proxy: builds with time-on-task, amplified by high WM load.
    """
    base_drift = [10 + (i / n) * 35 for i in range(n)]
    result = [round(max(0.0, min(100.0, d + (w - 50) * 0.25)), 1)
              for d, w in zip(base_drift, wml_series)]
    return result


# ── Main ──────────────────────────────────────────────────────────────────────

def inspect_mat(path: Path) -> None:
    mat = loadmat(str(path), simplify_cells=True)
    print(f"\n── {path.name} ──")
    for k, v in mat.items():
        if k.startswith("_"):
            continue
        shape = np.array(v).shape if hasattr(v, "__len__") else "scalar"
        print(f"  {k!r:30s}  shape={shape}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Process STEW dataset → Tokai JSON")
    parser.add_argument("--input",   required=True, help="Folder containing STEW .mat files")
    parser.add_argument("--output",  default="src/data/stew_processed.json")
    parser.add_argument("--subjects",default=5, type=int, help="How many subjects to include (default 5)")
    parser.add_argument("--inspect", action="store_true", help="Print .mat file structure and exit")
    args = parser.parse_args()

    mat_files = sorted(Path(args.input).glob("*.mat"))
    if not mat_files:
        print(f"No .mat files found in {args.input}")
        return

    if args.inspect:
        for f in mat_files[:3]:
            inspect_mat(f)
        return

    print(f"Found {len(mat_files)} .mat files. Processing {args.subjects} subjects...")

    # ── First pass: collect raw band powers for cross-subject normalisation
    all_thetas, all_betas, all_noises = [], [], []
    per_subject_raw = []

    selected = mat_files[:args.subjects]
    for f in selected:
        try:
            t, b, n = process_subject(f, N_EPOCHS)
            all_thetas.extend(t)
            all_betas.extend(b)
            all_noises.extend(n)
            per_subject_raw.append((f.stem, t, b, n))
            print(f"  ✓ {f.name}  ({len(t)} epochs)")
        except ValueError as e:
            print(f"  ✗ {f.name}: {e}")

    if not per_subject_raw:
        print("No subjects processed successfully. Run with --inspect to debug.")
        return

    # ── Cross-subject normalisation (consistent scale across all subjects)
    theta_norm_all = log_normalise(all_thetas, APP_THETA_LO, APP_THETA_HI)
    beta_norm_all  = log_normalise(all_betas,  APP_BETA_LO,  APP_BETA_HI)
    noise_vals     = log_normalise(all_noises, 0, 80)

    subjects_out = []
    idx = 0
    for sid, t_raw, b_raw, n_raw in per_subject_raw:
        n = len(t_raw)
        theta_s = theta_norm_all[idx:idx+n]
        beta_s  = beta_norm_all[idx:idx+n]
        noise_s = noise_vals[idx:idx+n]
        idx += n

        tb_s   = [round(max(0.2, min(4.0, th / be)), 2) for th, be in zip(theta_s, beta_s)]
        focus  = [tb_to_focus(tb) for tb in tb_s]
        wml    = [theta_to_wml(th) for th in theta_s]
        bio    = estimate_bio_energy(wml, float(np.mean(focus)))
        fat    = estimate_mental_fatigue(wml, n)

        mean_focus = round(float(np.mean(focus)), 1)
        mean_wml   = round(float(np.mean(wml)), 1)
        label, desc = describe_subject(sid.upper(), mean_focus, mean_wml)

        samples = [
            {
                "theta":             theta_s[i],
                "beta":              beta_s[i],
                "tbRatio":           tb_s[i],
                "focusIndex":        focus[i],
                "neuralNoise":       noise_s[i],
                "workingMemoryLoad": wml[i],
                "bioEnergy":         bio[i],
                "mentalFatigue":     fat[i],
            }
            for i in range(n)
        ]

        subjects_out.append({
            "id":          sid.upper(),
            "label":       label,
            "description": desc,
            "source":      "STEW (Lim et al. 2018, IEEE TNSRE)",
            "samples":     samples,
        })

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(subjects_out, f, separators=(",", ":"))

    total_samples = sum(len(s["samples"]) for s in subjects_out)
    print(f"\nWrote {len(subjects_out)} subjects, {total_samples} total samples → {out_path}")


if __name__ == "__main__":
    main()
