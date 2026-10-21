from __future__ import annotations

import numpy as np
import pandas as pd


BASELINE_WEIGHTS = {
    "prev_same_meal_7d": 0.50,
    "rolling_7_attendance": 0.30,
    "historical_same_weekday_attendance": 0.20,
}


def historical_baseline(df: pd.DataFrame) -> np.ndarray:
    values = np.column_stack(
        [
            df["prev_same_meal_7d"].to_numpy(dtype=float),
            df["rolling_7_attendance"].to_numpy(dtype=float),
            df["historical_same_weekday_attendance"].to_numpy(dtype=float),
        ]
    )
    weights = np.array(
        [
            BASELINE_WEIGHTS["prev_same_meal_7d"],
            BASELINE_WEIGHTS["rolling_7_attendance"],
            BASELINE_WEIGHTS["historical_same_weekday_attendance"],
        ],
        dtype=float,
    )

    pred = values @ weights
    pred = np.clip(pred, 0.0, df["eligible_students"].to_numpy(dtype=float))
    return pred
