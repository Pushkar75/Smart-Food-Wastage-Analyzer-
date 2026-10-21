from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_poisson_deviance, mean_squared_error


def regression_metrics(y_true, y_pred) -> Dict[str, float]:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    y_pred_for_poisson = np.clip(y_pred, 1e-9, None)

    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mean_poisson_deviance": float(
            mean_poisson_deviance(y_true, y_pred_for_poisson)
        ),
    }


def interval_metrics(
    y_true,
    lower,
    upper,
    point_pred,
) -> Dict[str, float]:
    y_true = np.asarray(y_true, dtype=float)
    lower = np.asarray(lower, dtype=float)
    upper = np.asarray(upper, dtype=float)

    covered = (y_true >= lower) & (y_true <= upper)
    outside = ~covered

    return {
        "coverage": float(covered.mean()),
        "outside_rate": float(outside.mean()),
        "mean_interval_width": float(np.mean(upper - lower)),
        "point_mae": float(mean_absolute_error(y_true, point_pred)),
    }


def save_metrics(metrics: Dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")


def feature_importance_frame(model, preprocessor) -> pd.DataFrame:
    names = preprocessor.get_feature_names_out()
    values = model.feature_importances_
    result = pd.DataFrame(
        {"feature": names, "importance": values}
    ).sort_values("importance", ascending=False)

    # Aggregate one-hot meal columns into a single business feature for easier
    # presentation while retaining the raw transformed features in the file.
    result["business_feature"] = result["feature"].where(
        ~result["feature"].str.startswith("meal_"),
        "meal",
    )
    return result.reset_index(drop=True)


def try_shap(model, transformed_X, feature_names, output_path: Path, max_rows=1000):
    """Optional SHAP export. The core pipeline does not require shap."""
    try:
        import shap
    except ImportError:
        return False

    X_sample = transformed_X[:max_rows]
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)

    mean_abs = np.mean(np.abs(shap_values), axis=0)
    shap_df = pd.DataFrame(
        {"feature": feature_names, "mean_abs_shap": mean_abs}
    ).sort_values("mean_abs_shap", ascending=False)
    shap_df.to_csv(output_path, index=False)
    return True
