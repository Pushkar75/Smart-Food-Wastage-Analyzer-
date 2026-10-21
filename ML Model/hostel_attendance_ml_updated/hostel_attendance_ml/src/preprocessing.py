from __future__ import annotations

from typing import Tuple

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .config import FEATURE_COLUMNS


CATEGORICAL_FEATURES = ["meal"]
NUMERIC_FEATURES = [c for c in FEATURE_COLUMNS if c not in CATEGORICAL_FEATURES]


def build_preprocessor() -> ColumnTransformer:
    categorical = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                    dtype=float,
                ),
            ),
        ]
    )

    numeric = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("categorical", categorical, CATEGORICAL_FEATURES),
            ("numeric", numeric, NUMERIC_FEATURES),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def prepare_xy(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    missing = [c for c in FEATURE_COLUMNS + ["actual_attendance"] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing model columns: {missing}")

    X = df[FEATURE_COLUMNS].copy()
    y = df["actual_attendance"].astype(float).copy()
    return X, y


def transformed_feature_names(preprocessor: ColumnTransformer) -> list[str]:
    return list(preprocessor.get_feature_names_out())
