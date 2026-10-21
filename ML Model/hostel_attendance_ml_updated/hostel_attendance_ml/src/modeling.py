from __future__ import annotations

from itertools import product
from typing import Dict

import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from xgboost import XGBRegressor

from .config import RANDOM_STATE
from .preprocessing import build_preprocessor, prepare_xy


def make_model(params: Dict) -> XGBRegressor:
    return XGBRegressor(
        objective="count:poisson",
        eval_metric="poisson-nloglik",
        random_state=RANDOM_STATE,
        tree_method="hist",
        n_jobs=-1,
        **params,
    )


def time_series_tune(train_df: pd.DataFrame) -> Dict:
    """
    Small rolling-origin search. Preprocessing is fit separately inside every
    fold to avoid preprocessing leakage.
    """
    X, y = prepare_xy(train_df)

    grid = {
        "n_estimators": [250, 450],
        "max_depth": [3, 4],
        "learning_rate": [0.03, 0.07],
        "subsample": [0.9],
        "colsample_bytree": [0.9],
        "min_child_weight": [3],
        "reg_lambda": [1.0],
        "reg_alpha": [0.0],
    }

    candidates = []
    keys = list(grid.keys())

    for values in product(*(grid[k] for k in keys)):
        params = dict(zip(keys, values))
        candidates.append(params)

    splitter = TimeSeriesSplit(n_splits=3)
    rows = []

    for params in candidates:
        fold_mae = []

        for fold, (tr_idx, va_idx) in enumerate(splitter.split(X), start=1):
            X_tr = X.iloc[tr_idx]
            y_tr = y.iloc[tr_idx]
            X_va = X.iloc[va_idx]
            y_va = y.iloc[va_idx]

            preprocessor = build_preprocessor()
            Xt = preprocessor.fit_transform(X_tr)
            Xv = preprocessor.transform(X_va)

            model = make_model(params)
            model.fit(Xt, y_tr)
            pred = model.predict(Xv)

            fold_mae.append(float(np.mean(np.abs(y_va.to_numpy() - pred))))

        rows.append(
            {
                **params,
                "cv_mae": float(np.mean(fold_mae)),
            }
        )

    result = pd.DataFrame(rows).sort_values("cv_mae", ascending=True)
    best = result.iloc[0].drop(labels=["cv_mae"]).to_dict()

    # pandas converts mixed-type rows to floats when selecting a row. XGBoost
    # expects integer-valued tree parameters such as n_estimators/max_depth.
    for key in ("n_estimators", "max_depth", "min_child_weight"):
        if key in best:
            best[key] = int(best[key])

    return best
