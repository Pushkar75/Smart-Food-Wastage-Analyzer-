from __future__ import annotations

from pathlib import Path

import pandas as pd


def append_completed_prediction(
    csv_path: Path,
    snapshot: dict,
    actual_attendance: int,
) -> None:
    """
    Append exactly one completed prediction.

    prediction_id and model_version are audit fields, not model features.
    The historical feature values are the values that were available at
    prediction time and are preserved exactly in the completed row.
    """
    csv_path.parent.mkdir(parents=True, exist_ok=True)

    row = dict(snapshot)
    row["actual_attendance"] = int(actual_attendance)

    # Internal snapshot metadata should not become dataset columns.
    row.pop("saved_at_utc", None)
    row.pop("recorded_at_utc", None)

    new_row = pd.DataFrame([row])

    if csv_path.exists() and csv_path.stat().st_size > 0:
        existing = pd.read_csv(csv_path)

        if "prediction_id" in existing.columns:
            duplicate = existing["prediction_id"].astype(str).eq(
                str(snapshot["prediction_id"])
            )
            if duplicate.any():
                raise ValueError(
                    f"Prediction {snapshot['prediction_id']} has already been recorded."
                )

        combined = pd.concat([existing, new_row], ignore_index=True, sort=False)
    else:
        combined = new_row

    # Stable chronological ordering is important for leakage-free feature
    # reconstruction during the next training run.
    if "date" in combined.columns:
        combined["date"] = pd.to_datetime(combined["date"], errors="raise")
        combined = combined.sort_values(
            ["date", "meal"], kind="stable"
        ).reset_index(drop=True)

    combined.to_csv(
        csv_path,
        index=False,
        lineterminator="\n",
        float_format="%.10g",
    )
