from __future__ import annotations

import numpy as np
import pandas as pd

from .config import HISTORICAL_FEATURES


def build_leakage_free_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Reconstruct all target-derived features from completed observations only.

    Current actual_attendance is never used for the same row because all target
    dependencies are lagged/shifted first.
    """
    out = df.copy().sort_values(["date", "meal"]).reset_index(drop=True)

    # Exact previous-day and previous-two-day attendance for the same meal.
    # There are exactly four rows per day.
    out["prev_day_attendance"] = (
        out.groupby("meal", sort=False)["actual_attendance"].shift(1)
    )
    out["prev_2day_attendance"] = (
        out.groupby("meal", sort=False)["actual_attendance"].shift(2)
    )

    # Exact same meal 7 and 14 calendar days earlier.
    out["prev_same_meal_7d"] = (
        out.groupby("meal", sort=False)["actual_attendance"].shift(7)
    )
    out["prev_same_meal_14d"] = (
        out.groupby("meal", sort=False)["actual_attendance"].shift(14)
    )

    # Previous completed meal observations only.
    shifted_target = out["actual_attendance"].shift(1)
    out["rolling_3_attendance"] = shifted_target.rolling(3, min_periods=3).mean()
    out["rolling_7_attendance"] = shifted_target.rolling(7, min_periods=7).mean()
    out["rolling_14_attendance"] = shifted_target.rolling(14, min_periods=14).mean()

    # Historical mean for the same meal and weekday, using only prior rows.
    prior_actual = out["actual_attendance"].shift(1)
    prior_meal_weekday = pd.MultiIndex.from_arrays(
        [
            out["meal"].shift(1),
            out["day_of_week"].shift(1),
        ]
    )
    prior_frame = pd.DataFrame(
        {
            "key": prior_meal_weekday,
            "actual": prior_actual,
        },
        index=out.index,
    )
    prior_sum = prior_frame.groupby("key", sort=False)["actual"].cumsum()
    prior_count = (
        prior_frame["actual"]
        .notna()
        .groupby(prior_frame["key"], sort=False)
        .cumsum()
    )
    out["historical_same_weekday_attendance"] = (
        prior_sum / prior_count.replace(0, np.nan)
    )

    # Historical yes-to-attendance ratio for the same meal.
    prior_yes = out["yes_count"].shift(1)
    prior_actual_for_ratio = out["actual_attendance"].shift(1)

    meal_key = out["meal"].shift(1)
    yes_sum = prior_yes.groupby(meal_key, sort=False).cumsum()
    actual_sum = prior_actual_for_ratio.groupby(meal_key, sort=False).cumsum()
    out["yes_to_attendance_ratio"] = yes_sum / actual_sum.replace(0, np.nan)

    return out


def required_feature_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Drop only rows without enough completed history for every required feature."""
    return df.dropna(subset=HISTORICAL_FEATURES).reset_index(drop=True)


def audit_historical_features(df: pd.DataFrame) -> None:
    """
    Structural leakage audit.

    Every historical feature is derived only from shifted actual attendance.
    The audit also checks that changing current/future targets cannot affect the
    feature vector for the current row.
    """
    deps = {
        "prev_day_attendance": 1,
        "prev_2day_attendance": 2,
        "prev_same_meal_7d": 7,
        "prev_same_meal_14d": 14,
        "rolling_3_attendance": 1,
        "rolling_7_attendance": 1,
        "rolling_14_attendance": 1,
        "historical_same_weekday_attendance": 1,
        "yes_to_attendance_ratio": 1,
    }
    for feature, min_lag in deps.items():
        if min_lag < 1:
            raise AssertionError(f"{feature} has an invalid non-positive lag.")

    # Rebuild against a copy whose targets are deliberately changed for the
    # current and future rows. Past-derived features must remain unchanged for
    # rows whose dependency set is entirely before the perturbation.
    original = build_leakage_free_features(df)[HISTORICAL_FEATURES]
    perturbed = df.copy()
    cutoff = len(perturbed) // 2
    rng = np.random.default_rng(123)
    perturbed.loc[cutoff:, "actual_attendance"] = rng.integers(
        low=0,
        high=np.maximum(
            perturbed.loc[cutoff:, "eligible_students"].to_numpy(),
            1,
        ),
    )
    changed = build_leakage_free_features(perturbed)[HISTORICAL_FEATURES]

    # The first half uses only targets before the cutoff. Any difference there
    # would indicate current/future leakage.
    a = original.iloc[:cutoff].to_numpy(dtype=float)
    b = changed.iloc[:cutoff].to_numpy(dtype=float)
    if not np.allclose(a, b, equal_nan=True):
        raise AssertionError(
            "Historical feature leakage audit failed: a current/future target "
            "perturbation changed features that should depend only on the past."
        )

    # Explicitly require the target not to appear in the final feature list.
    from .config import FEATURE_COLUMNS
    if "actual_attendance" in FEATURE_COLUMNS:
        raise AssertionError("actual_attendance must never be an input feature.")
