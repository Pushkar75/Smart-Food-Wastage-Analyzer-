from __future__ import annotations

from pathlib import Path
from typing import Dict

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor

from .config import ARTIFACT_PATH, MODEL_PATH, FEATURE_COLUMNS
from .intervals import SplitConformalInterval


def load_inference_artifacts(
    model_path: Path = MODEL_PATH,
    artifact_path: Path = ARTIFACT_PATH,
):
    artifacts = joblib.load(artifact_path)
    model = XGBRegressor()
    model.load_model(model_path)
    return model, artifacts


def validate_prediction_input(row: Dict) -> None:
    eligible = float(row["eligible_students"])
    registered = float(row["registered_students"])
    leave = float(row["on_leave"])
    yes = float(row["yes_count"])
    no = float(row["no_count"])
    no_response = float(row["no_response_count"])

    if eligible != registered - leave:
        raise ValueError("eligible_students must equal registered_students - on_leave.")
    if yes + no + no_response != eligible:
        raise ValueError(
            "yes_count + no_count + no_response_count must equal eligible_students."
        )
    if min(eligible, yes, no, no_response) < 0:
        raise ValueError("Population and response counts cannot be negative.")
    if max(yes, no, no_response) > eligible:
        raise ValueError("Response counts cannot exceed eligible_students.")


def predict_one(row: Dict, model=None, artifacts=None) -> Dict:
    if model is None or artifacts is None:
        model, artifacts = load_inference_artifacts()

    validate_prediction_input(row)
    X = pd.DataFrame([{c: row[c] for c in FEATURE_COLUMNS}])
    Xt = artifacts["preprocessor"].transform(X)

    raw_pred = float(model.predict(Xt)[0])
    eligible = float(row["eligible_students"])
    point = float(np.clip(raw_pred, 0.0, eligible))

    interval = SplitConformalInterval.from_dict(artifacts["interval"])
    lower, upper = interval.predict(
        np.array([point]),
        np.array([eligible]),
    )

    lower_i = int(np.floor(lower[0]))
    upper_i = int(np.ceil(upper[0]))

    return {
        "predicted_attendance": int(round(point)),
        "lower_bound": lower_i,
        "upper_bound": upper_i,
    }
