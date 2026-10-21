from __future__ import annotations

import pandas as pd

from .config import CORE_COLUMNS


def load_dataset(path) -> pd.DataFrame:
    df = pd.read_csv(path)

    missing = [c for c in CORE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(
            "Dataset is missing required columns: "
            f"{missing}\nFound columns: {list(df.columns)}"
        )

    df = df.copy()
    df["date"] = pd.to_datetime(df["date"], errors="raise")
    df["meal"] = df["meal"].astype(str).str.strip().str.lower()

    numeric_cols = [
        "day_of_week",
        "registered_students",
        "on_leave",
        "eligible_students",
        "yes_count",
        "no_count",
        "no_response_count",
        "response_rate",
        "yes_rate",
        "actual_attendance",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df.sort_values(["date", "meal"]).reset_index(drop=True)


def validate_dataset(df: pd.DataFrame) -> None:
    if df.empty:
        raise ValueError("Dataset is empty.")

    missing = df[CORE_COLUMNS].isna().sum()
    missing = missing[missing > 0]
    if not missing.empty:
        raise ValueError(f"Missing values found in required columns:\n{missing}")

    if (df["registered_students"] < 0).any():
        raise ValueError("registered_students cannot be negative.")
    if (df["on_leave"] < 0).any():
        raise ValueError("on_leave cannot be negative.")
    if (df["eligible_students"] < 0).any():
        raise ValueError("eligible_students cannot be negative.")
    if (df["actual_attendance"] < 0).any():
        raise ValueError("actual_attendance cannot be negative.")

    expected_eligible = df["registered_students"] - df["on_leave"]
    if not (expected_eligible == df["eligible_students"]).all():
        bad = df.index[expected_eligible != df["eligible_students"]].tolist()[:10]
        raise ValueError(
            "eligible_students must equal registered_students - on_leave. "
            f"Example bad rows: {bad}"
        )

    response_sum = df["yes_count"] + df["no_count"] + df["no_response_count"]
    if not (response_sum == df["eligible_students"]).all():
        bad = df.index[response_sum != df["eligible_students"]].tolist()[:10]
        raise ValueError(
            "yes_count + no_count + no_response_count must equal "
            f"eligible_students. Example bad rows: {bad}"
        )

    for col in ["yes_count", "no_count", "no_response_count"]:
        if (df[col] < 0).any():
            raise ValueError(f"{col} cannot be negative.")
        if (df[col] > df["eligible_students"]).any():
            raise ValueError(f"{col} cannot exceed eligible_students.")

    if (df["actual_attendance"] > df["eligible_students"]).any():
        bad = df.index[df["actual_attendance"] > df["eligible_students"]].tolist()[:10]
        raise ValueError(
            "actual_attendance cannot exceed eligible_students. "
            f"Example bad rows: {bad}"
        )

    # Exactly four meal observations per date is part of the v1 business definition.
    daily_counts = df.groupby("date")["meal"].nunique()
    if not (daily_counts == 4).all():
        bad_dates = daily_counts.index[daily_counts != 4].astype(str).tolist()[:10]
        raise ValueError(
            "Each date must contain exactly four distinct meal rows. "
            f"Example bad dates: {bad_dates}"
        )

    if df["meal"].nunique() != 4:
        raise ValueError(
            f"Expected 4 meals in v1; found {sorted(df['meal'].unique().tolist())}"
        )
