"""
engine/zuhut.py
Ctypes wrapper untuk libzuhri_engine.so
Mengekspos dua fungsi ke Python:
  - run_unp(features: np.ndarray) -> dict   (Engine 2b: scan_all)
  - run_l1(features: np.ndarray)  -> dict   (Engine 1: verify)
"""

import ctypes
import os
import numpy as np
from pathlib import Path

# ── Lokasi .so ──────────────────────────────────────────────────────────────
_ENGINE_DIR = Path(__file__).parent
_SO_PATH    = _ENGINE_DIR / "libzuhri_engine.so"

if not _SO_PATH.exists():
    raise FileNotFoundError(
        f"libzuhri_engine.so tidak ditemukan di {_SO_PATH}\n"
        "Pastikan sudah compile Rust dan copy .so ke folder engine/"
    )

_lib = ctypes.CDLL(str(_SO_PATH))

# ── Signature Engine 1: core_sys_verify_f64 ─────────────────────────────────
# pub extern "C" fn core_sys_verify_f64(
#     data_ptr          : *const f64,
#     len               : usize,
#     target_fase       : f64,
#     tingkat_kekuatan  : f64,
#     toleransi_prefilter: f64,
#     ambang_batas      : f64,
# ) -> isize
#
# Return:  >= 0  → index posisi resonan pertama yang ditemukan
#          -1    → tidak ditemukan (no resonance)
# ─────────────────────────────────────────────────────────────────────────────
_lib.core_sys_verify_f64.restype  = ctypes.c_ssize_t
_lib.core_sys_verify_f64.argtypes = [
    ctypes.POINTER(ctypes.c_double),  # data_ptr
    ctypes.c_size_t,                  # len
    ctypes.c_double,                  # target_fase
    ctypes.c_double,                  # tingkat_kekuatan
    ctypes.c_double,                  # toleransi_prefilter
    ctypes.c_double,                  # ambang_batas
]

# ── Signature Engine 2b: core_sys_scan_all_f64 ──────────────────────────────
# pub extern "C" fn core_sys_scan_all_f64(
#     data_ptr           : *const f64,
#     len                : usize,
#     target_fase        : f64,
#     tingkat_kekuatan   : f64,
#     toleransi_prefilter: f64,
#     ambang_batas       : f64,
#     out_indices        : *mut usize,
#     max_results        : usize,
# ) -> usize
#
# Return: jumlah posisi yang ditemukan (ditulis ke out_indices)
# ─────────────────────────────────────────────────────────────────────────────
_lib.core_sys_scan_all_f64.restype  = ctypes.c_size_t
_lib.core_sys_scan_all_f64.argtypes = [
    ctypes.POINTER(ctypes.c_double),  # data_ptr
    ctypes.c_size_t,                  # len
    ctypes.c_double,                  # target_fase
    ctypes.c_double,                  # tingkat_kekuatan
    ctypes.c_double,                  # toleransi_prefilter
    ctypes.c_double,                  # ambang_batas
    ctypes.POINTER(ctypes.c_size_t),  # out_indices
    ctypes.c_size_t,                  # max_results
]

# ── Parameter default ZUHUT ──────────────────────────────────────────────────
# Nilai ini bisa di-tune; untuk hackathon pakai baseline ini dulu.
DEFAULT_TARGET_FASE         = 0.5    # midpoint phase target
DEFAULT_TINGKAT_KEKUATAN    = 0.95    # kekuatan minimum yang diterima
DEFAULT_TOLERANSI_PREFILTER = 0.10   # toleransi prefilter
DEFAULT_AMBANG_BATAS        = 0.88    # ambang batas keputusan

MAX_RESULTS = 2048  # buffer out_indices untuk scan_all

# ── UNP score helper ─────────────────────────────────────────────────────────
def _unp_score_from_count(n_matches: int, total_windows: int) -> float:
    """
    Konversi jumlah match → skor 0–100.
    Makin sedikit match (kondisi makin langka), makin tinggi skor UNP.
    Pakai skala log-invers agar tidak terlalu sensitif di angka kecil.
    """
    if total_windows <= 0:
        return 0.0
    ratio = n_matches / total_windows          # 0.0 – 1.0
    # inversi: ratio 0 → score 100, ratio 1 → score 0
    # log dampening: skor lebih smooth
    import math
    score = 100.0 * (1.0 - math.log1p(ratio * 9) / math.log1p(9))
    return round(max(0.0, min(100.0, score)), 1)

def _unp_label(score: float) -> str:
    if score >= 50:   return "unprecedented"
    if score >= 38:   return "rare"
    if score >= 25:   return "uncommon"
    return "common"

def _combo_verdict(unp_score: float, bias: str, confidence: float) -> str:
    if unp_score >= 50 and bias == "buy"  and confidence >= 65: return "strong"
    if unp_score >= 50 and bias == "sell" and confidence >= 65: return "caution"
    if unp_score >= 38:                                          return "watch"
    if unp_score >= 25:                                          return "normal"
    return "skip"

# ── L1 helper ────────────────────────────────────────────────────────────────
def _l1_bias_from_index(index: int, features: np.ndarray) -> dict:
    """
    Engine 1 mengembalikan index posisi resonan pertama.
    Dari posisi itu kita lihat forward return (apakah harga naik/turun
    setelah kondisi tersebut terjadi di masa lalu).

    features[-1] adalah kondisi HARI INI (target).
    features[index] adalah kondisi historis yang paling resonan.

    Forward return: kita bandingkan features[index+1] vs features[index]
    menggunakan kolom pertama (normalised close, indeks 0).
    Jika tidak ada index+1, pakai sentimen flat.
    """
    if index < 0:
        return {"bias": "neutral", "confidence": 0.0}

    # Cari forward movement dari historical analog
    # Kolom 0 diasumsikan = normalized price / close proxy
    n = len(features)
    if index + 1 < n:
        fwd = float(features[index + 1, 0]) - float(features[index, 0])
        # Normalisasi confidence berdasarkan magnitude
        abs_fwd = abs(fwd)
        confidence = round(min(abs_fwd * 1000, 99.9), 1)   # scale kasar
        if fwd > 0.001:
            bias = "buy"
        elif fwd < -0.001:
            bias = "sell"
        else:
            bias = "neutral"
    else:
        bias, confidence = "neutral", 0.0

    return {"bias": bias, "confidence": confidence}

# ── Public API ────────────────────────────────────────────────────────────────

def run_unp(
    features: np.ndarray,
    target_fase         : float = DEFAULT_TARGET_FASE,
    tingkat_kekuatan    : float = DEFAULT_TINGKAT_KEKUATAN,
    toleransi_prefilter : float = DEFAULT_TOLERANSI_PREFILTER,
    ambang_batas        : float = DEFAULT_AMBANG_BATAS,
) -> dict:
    """
    Jalankan Engine 2b (scan_all) untuk menghitung UNP score.

    Parameters
    ----------
    features : np.ndarray shape (n_days, n_features), dtype float64
        Baris terakhir = kondisi hari ini.
        Baris sebelumnya = riwayat historis.
        Array harus sudah di-normalize (z-score atau min-max) per kolom.

    Returns
    -------
    {
        "unp_score"       : float,   # 0–100, makin tinggi makin langka
        "unp_label"       : str,     # unprecedented / rare / uncommon / common
        "pattern_matches" : int,     # jumlah kondisi historis yang mirip
        "total_windows"   : int,     # total window yang di-scan
    }
    """
    arr = np.ascontiguousarray(features, dtype=np.float64).flatten()
    n   = len(arr)

    out_buf = (ctypes.c_size_t * MAX_RESULTS)()

    count = _lib.core_sys_scan_all_f64(
        arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        ctypes.c_size_t(n),
        ctypes.c_double(target_fase),
        ctypes.c_double(tingkat_kekuatan),
        ctypes.c_double(toleransi_prefilter),
        ctypes.c_double(ambang_batas),
        out_buf,
        ctypes.c_size_t(MAX_RESULTS),
    )

    # total_windows ≈ jumlah hari historis (exclude hari ini = baris terakhir)
    total_windows = max(len(features) - 1, 1)
    n_matches     = int(count)
    score         = _unp_score_from_count(n_matches, total_windows)

    return {
        "unp_score"      : score,
        "unp_label"      : _unp_label(score),
        "pattern_matches": n_matches,
        "total_windows"  : total_windows,
    }


def run_l1(
    features: np.ndarray,
    target_fase         : float = DEFAULT_TARGET_FASE,
    tingkat_kekuatan    : float = DEFAULT_TINGKAT_KEKUATAN,
    toleransi_prefilter : float = DEFAULT_TOLERANSI_PREFILTER,
    ambang_batas        : float = DEFAULT_AMBANG_BATAS,
) -> dict:
    """
    Jalankan Engine 1 (verify, early-exit) untuk L1 directional bias.

    Parameters
    ----------
    features : np.ndarray shape (n_days, n_features), dtype float64
        Sama dengan run_unp; baris terakhir = hari ini.

    Returns
    -------
    {
        "l1_bias"       : str,    # "buy" | "sell" | "neutral"
        "l1_confidence" : float,  # 0–100
        "analog_index"  : int,    # index historis yang paling resonan (-1 = none)
    }
    """
    arr = np.ascontiguousarray(features, dtype=np.float64).flatten()
    n   = len(arr)

    idx = _lib.core_sys_verify_f64(
        arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        ctypes.c_size_t(n),
        ctypes.c_double(target_fase),
        ctypes.c_double(tingkat_kekuatan),
        ctypes.c_double(toleransi_prefilter),
        ctypes.c_double(ambang_batas),
    )

    result = _l1_bias_from_index(int(idx), features)
    return {
        "l1_bias"       : result["bias"],
        "l1_confidence" : result["confidence"],
        "analog_index"  : int(idx),
    }


def run_combined(features: np.ndarray, **kwargs) -> dict:
    """
    Jalankan UNP + L1 sekaligus dan hasilkan combo verdict.

    Combo logic:
      STRONG  = UNP >= 70 AND l1_bias == "buy"  AND l1_confidence >= 65
      CAUTION = UNP >= 70 AND l1_bias == "sell" AND l1_confidence >= 65
      NORMAL  = UNP 30–70 (kondisi tidak terlalu langka)
      SKIP    = UNP < 30  (kondisi terlalu umum, tidak informatif)
      WATCH   = UNP >= 70 AND l1_bias == "neutral" ATAU confidence < 65

    Returns
    -------
    Merged dict dengan semua field UNP + L1 + combo.
    """
    unp = run_unp(features, **kwargs)
    l1  = run_l1(features, **kwargs)

    score      = unp["unp_score"]
    bias       = l1["l1_bias"]
    confidence = l1["l1_confidence"]

    if score >= 50 and bias == "buy" and confidence >= 65:
        combo = "strong"
    elif score >= 50 and bias == "sell" and confidence >= 65:
        combo = "caution"
    elif score >= 38:
        combo = "watch"
    elif score >= 25:
        combo = "normal"
    else:
        combo = "skip"

    return {
        **unp,
        **l1,
        "combo": combo,
    }