"""
process_stew.py — Convert STEW TXT files to stew_processed.json for Tokai.

Usage:
    python scripts/process_stew.py --input /path/to/stew/folder --output src/data/stew_processed.json

The STEW dataset (Lim et al. 2018, IEEE TNSRE) contains pairs of files per subject:
    sub{N}_lo.txt  —  low workload (resting / easy task)
    sub{N}_hi.txt  —  high workload (SIMKAP multitasking)

Each file: whitespace-delimited, 14 columns (Emotiv EPOC channels), 128 Hz.
Raw values are ADC counts (~4000–5000); band powers are log-normalised so the
exact scale does not matter.

We include both conditions as separate subjects so the app shows a wider range
of profiles (e.g. same person at rest vs. under cognitive load).

Output JSON shape (same interface as before):
    [ { "id", "label", "description", "source", "samples": [ { theta, beta,
        tbRatio, focusIndex, neuralNoise, workingMemoryLoad, bioEnergy,
        mentalFatigue }, ... ] }, ... ]
"""

import argparse
import json
import re
from pathlib import Path

import numpy as np
from scipy.signal import welch

# ── Constants ─────────────────────────────────────────────────────────────────

FS         = 128    # Emotiv EPOC sampling rate (Hz)
EPOCH_SEC  = 2      # epoch length
N_EPOCHS   = 180    # target samples per subject (3 min at 1 Hz after epoching)

THETA = (4,  8)
BETA  = (13, 30)

# Emotiv EPOC 14-ch order: AF3 F7 F3 FC5 T7 P7 O1 O2 P8 T8 FC6 F4 F8 AF4
FRONTAL_IDX = [0, 1, 2, 3, 11, 12, 13]   # for frontal theta / WM load
ALL_IDX     = list(range(14))

APP_LO, APP_HI = 10, 180   # app display range for theta / beta

# ── Signal processing ─────────────────────────────────────────────────────────

def bandpower(epoch: np.ndarray, band: tuple, ch_idx: list) -> float:
    """Mean band power over selected channels for one [channels × samples] epoch."""
    sub = epoch[ch_idx, :]
    freqs, psd = welch(sub, fs=FS, nperseg=FS * EPOCH_SEC, axis=1)
    mask = (freqs >= band[0]) & (freqs <= band[1])
    return float(np.mean(psd[:, mask]))


def hf_noise(epoch: np.ndarray) -> float:
    """High-frequency (>40 Hz) inter-channel variance — proxy for neural noise."""
    freqs, psd = welch(epoch, fs=FS, nperseg=FS * EPOCH_SEC, axis=1)
    return float(np.var(np.mean(psd[:, freqs > 40], axis=1)))


def log_normalise(values: list, lo: float, hi: float) -> list:
    """
    Log-transform then map the 5th–95th-percentile range to [lo, hi].
    Robust to outliers; consistent scale across subjects.
    """
    arr = np.log(np.array(values, dtype=float) + 1e-9)
    p5, p95 = np.percentile(arr, 5), np.percentile(arr, 95)
    if p95 == p5:
        return [round((lo + hi) / 2, 1)] * len(values)
    normed = (arr - p5) / (p95 - p5)
    return [round(float(np.clip(lo + v * (hi - lo), lo, hi)), 1) for v in normed]


# ── Metric derivation ─────────────────────────────────────────────────────────

def tb_to_focus(tb: float) -> float:
    return round(max(5.0, min(95.0, 100 - ((tb - 0.2) / 3.0) * 100)), 1)


def theta_to_wml(theta_app: float) -> float:
    return round(max(0.0, min(100.0, (theta_app - 10) / 160 * 100)), 1)


def estimate_bio_energy(wml_series: list, mean_focus: float, n: int) -> list:
    base = 30 + mean_focus * 0.5
    return [round(max(5.0, min(95.0, base - (i / n) * 20 - (w - 50) * 0.2)), 1)
            for i, w in enumerate(wml_series)]


def estimate_mental_fatigue(wml_series: list, n: int) -> list:
    return [round(max(0.0, min(100.0, 10 + (i / n) * 35 + (w - 50) * 0.25)), 1)
            for i, w in enumerate(wml_series)]


# ── File loading ──────────────────────────────────────────────────────────────

def load_txt(path: Path) -> np.ndarray:
    """Load a STEW TXT file → [14 channels × samples]."""
    raw = np.loadtxt(path)          # shape: [samples × 14]
    if raw.ndim != 2:
        raise ValueError(f"{path.name}: expected 2-D array, got shape {raw.shape}")
    if raw.shape[1] == 14:
        return raw.T                # → [14 × samples]
    elif raw.shape[0] == 14:
        return raw                  # already [14 × samples]
    else:
        raise ValueError(f"{path.name}: expected 14 channels, got shape {raw.shape}")


def extract_epochs(data: np.ndarray, n_epochs: int) -> list:
    """Slice data into 2-second epochs; return list of [14 × epoch_samples]."""
    ep = EPOCH_SEC * FS
    available = data.shape[1] // ep
    count = min(n_epochs, available)
    return [data[:, i * ep:(i + 1) * ep] for i in range(count)]


# ── Subject processing ────────────────────────────────────────────────────────

def process_file(path: Path, n_epochs: int):
    """Returns (theta_raw, beta_raw, noise_raw) — one float per epoch."""
    data   = load_txt(path)
    epochs = extract_epochs(data, n_epochs)
    if len(epochs) < 10:
        raise ValueError(f"{path.name}: only {len(epochs)} epochs available (need ≥10)")

    thetas = [bandpower(e, THETA, FRONTAL_IDX) for e in epochs]
    betas  = [bandpower(e, BETA,  ALL_IDX)     for e in epochs]
    noises = [hf_noise(e)                       for e in epochs]
    return thetas, betas, noises


def make_label(sid: str, condition: str, mean_focus: float, mean_wml: float):
    cond_str = "· Rest" if condition == "lo" else "· Hi Load"
    if condition == "lo" and mean_focus >= 65:
        profile, desc = "High Focus", f"Resting state. Focus avg {mean_focus:.0f}. Beta-dominant, low T/B."
    elif condition == "hi" and mean_wml >= 60:
        profile, desc = "High WM Load", f"Multitasking condition. WM load avg {mean_wml:.0f}. Elevated frontal theta."
    elif mean_focus <= 40:
        profile, desc = "Low Focus", f"Theta-dominant. Focus avg {mean_focus:.0f}. Mind-wandering or fatigue pattern."
    else:
        profile, desc = "Moderate Load", f"Focus avg {mean_focus:.0f}, WM load avg {mean_wml:.0f}."
    return f"{sid.upper()} {cond_str} — {profile}", desc


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Process STEW TXT files → Tokai JSON")
    parser.add_argument("--input",    required=True, help="Folder containing STEW _lo.txt / _hi.txt files")
    parser.add_argument("--output",   default="src/data/stew_processed.json")
    parser.add_argument("--subjects", default=5, type=int,
                        help="Number of subjects to include (default 5). Each subject contributes"
                             " one _lo and one _hi entry, so 5 subjects → up to 10 dataset profiles.")
    parser.add_argument("--condition", default="both", choices=["lo", "hi", "both"],
                        help="Which condition to include (default: both)")
    args = parser.parse_args()

    folder = Path(args.input)

    # Discover subjects by finding _lo files and sorting numerically
    lo_files = sorted(folder.glob("*_lo.txt"),
                      key=lambda p: int(re.search(r"\d+", p.stem).group()))

    if not lo_files:
        print(f"No *_lo.txt files found in {args.input}")
        print(f"Files present: {[f.name for f in folder.iterdir()][:10]}")
        return

    selected = lo_files[:args.subjects]
    print(f"Found {len(lo_files)} subjects. Processing {len(selected)}...")

    # ── First pass: collect all raw values for cross-subject normalisation
    all_thetas, all_betas, all_noises = [], [], []
    per_file_raw = []   # (sid, condition, thetas, betas, noises)

    for lo_path in selected:
        sid = re.sub(r"_lo$", "", lo_path.stem)
        hi_path = folder / lo_path.name.replace("_lo.txt", "_hi.txt")

        files_to_process = []
        if args.condition in ("lo", "both"):
            files_to_process.append((sid, "lo", lo_path))
        if args.condition in ("hi", "both") and hi_path.exists():
            files_to_process.append((sid, "hi", hi_path))

        for sid_, cond, path in files_to_process:
            try:
                t, b, n = process_file(path, N_EPOCHS)
                all_thetas.extend(t)
                all_betas.extend(b)
                all_noises.extend(n)
                per_file_raw.append((sid_, cond, t, b, n))
                print(f"  OK{path.name}  ({len(t)} epochs)")
            except Exception as e:
                print(f"  !!{path.name}: {e}")

    if not per_file_raw:
        print("No files processed successfully.")
        return

    # ── Cross-subject normalisation
    theta_norm = log_normalise(all_thetas, APP_LO, APP_HI)
    beta_norm  = log_normalise(all_betas,  APP_LO, APP_HI)
    noise_norm = log_normalise(all_noises, 0,       80)

    # ── Build output subjects
    subjects_out = []
    idx = 0
    for sid, cond, t_raw, b_raw, n_raw in per_file_raw:
        n = len(t_raw)
        theta_s = theta_norm[idx:idx + n]
        beta_s  = beta_norm [idx:idx + n]
        noise_s = noise_norm [idx:idx + n]
        idx += n

        tb_s   = [round(max(0.2, min(4.0, th / be)), 2) for th, be in zip(theta_s, beta_s)]
        focus  = [tb_to_focus(tb) for tb in tb_s]
        wml    = [theta_to_wml(th) for th in theta_s]
        bio    = estimate_bio_energy(wml, float(np.mean(focus)), n)
        fat    = estimate_mental_fatigue(wml, n)

        mean_focus = round(float(np.mean(focus)), 1)
        mean_wml   = round(float(np.mean(wml)),   1)
        label, desc = make_label(sid, cond, mean_focus, mean_wml)

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
            "id":          f"{sid.upper()}_{cond.upper()}",
            "label":       label,
            "description": desc,
            "source":      "STEW (Lim et al. 2018, IEEE TNSRE)",
            "samples":     samples,
        })

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(subjects_out, f, separators=(",", ":"))

    total = sum(len(s["samples"]) for s in subjects_out)
    print(f"\nWrote {len(subjects_out)} profiles, {total} total samples -> {out_path}")
    for s in subjects_out:
        print(f"  {s['id']:15s}  {s['label']}")


if __name__ == "__main__":
    main()
