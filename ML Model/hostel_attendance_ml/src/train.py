from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from .baseline import historical_baseline
from .config import (
    ARTIFACT_PATH,
    DATA_PATH,
    FEATURE_COLUMNS,
    IMPORTANCE_PATH,
    METRICS_PATH,
    MODEL_PATH,
    PREDICTIONS_PATH,
    RANDOM_STATE,
    TARGET_COVERAGE,
    TRAIN_FRACTION,
    VALIDATION_FRACTION,
)
from .data_loader import load_dataset, validate_dataset
from .evaluate import (
    feature_importance_frame,
    interval_metrics,
    regression_metrics,
    save_metrics,
    try_shap,
)
from .feature_engineering import (
    audit_historical_features,
    build_leakage_free_features,
    required_feature_rows,
)
from .intervals import SplitConformalInterval
from .modeling import make_model, time_series_tune
from .preprocessing import build_preprocessor, prepare_xy


def chronological_split(df: pd.DataFrame):
    n = len(df)
    train_end = int(n * TRAIN_FRACTION)
    val_end = train_end + int(n * VALIDATION_FRACTION)

    train = df.iloc[:train_end].copy()
    valid = df.iloc[train_end:val_end].copy()
    test = df.iloc[val_end:].copy()

    if min(len(train), len(valid), len(test)) < 20:
        raise ValueError("Chronological splits are too small.")

    return train, valid, test


def main() -> None:
    print(f"Loading dataset: {DATA_PATH}")
    df = load_dataset(DATA_PATH)
    validate_dataset(df)

    print(f"Raw rows: {len(df):,}")
    print(f"Date range: {df['date'].min().date()} -> {df['date'].max().date()}")
    print(f"Meals: {sorted(df['meal'].unique().tolist())}")
    print(f"Target mean: {df['actual_attendance'].mean():.2f}")
    print(f"Target std: {df['actual_attendance'].std():.2f}")

    enriched = build_leakage_free_features(df)
    audit_historical_features(df)

    warm = required_feature_rows(enriched)
    print(f"Rows after historical warmup: {len(warm):,}")
    print(f"Rows removed for warmup: {len(enriched) - len(warm):,}")

    # Drop the original precomputed history columns, if present, and use the
    # freshly reconstructed leakage-free versions.
    train, valid, test = chronological_split(warm)

    print(
        f"Split sizes: train={len(train)}, validation={len(valid)}, test={len(test)}"
    )
    print(
        "Chronological split dates: "
        f"{train['date'].min().date()} -> {train['date'].max().date()} | "
        f"{valid['date'].min().date()} -> {valid['date'].max().date()} | "
        f"{test['date'].min().date()} -> {test['date'].max().date()}"
    )

    baseline_pred = historical_baseline(test)
    baseline_metrics = regression_metrics(test["actual_attendance"], baseline_pred)

    print("Running small time-aware hyperparameter search...")
    best_params = time_series_tune(train)
    print("Best parameters:", best_params)

    # Fit on train only for validation and interval calibration.
    X_train, y_train = prepare_xy(train)
    X_valid, y_valid = prepare_xy(valid)

    preprocessor = build_preprocessor()
    Xt = preprocessor.fit_transform(X_train)
    Xv = preprocessor.transform(X_valid)

    tuning_model = make_model(best_params)
    tuning_model.fit(Xt, y_train)
    valid_pred = np.clip(
        tuning_model.predict(Xv),
        0.0,
        valid["eligible_students"].to_numpy(dtype=float),
    )

    validation_metrics = regression_metrics(y_valid, valid_pred)

    # Calibration is done strictly on the held-out validation set.
    interval = SplitConformalInterval(
        target_coverage=TARGET_COVERAGE
    ).fit(y_valid, valid_pred)

    # Refit the selected point model on train + validation before final test.
    fit_df = pd.concat([train, valid], ignore_index=True)
    X_fit, y_fit = prepare_xy(fit_df)

    final_preprocessor = build_preprocessor()
    Xf = final_preprocessor.fit_transform(X_fit)
    Xtest, ytest = prepare_xy(test)
    Xte = final_preprocessor.transform(Xtest)

    final_model = make_model(best_params)
    final_model.fit(Xf, y_fit)

    test_point_raw = final_model.predict(Xte)
    test_point = np.clip(
        test_point_raw,
        0.0,
        test["eligible_students"].to_numpy(dtype=float),
    )

    lower, upper = interval.predict(
        test_point,
        test["eligible_students"].to_numpy(dtype=float),
    )

    test_metrics = regression_metrics(ytest, test_point)
    pi_metrics = interval_metrics(ytest, lower, upper, test_point)

    comparison = {
        "baseline": baseline_metrics,
        "xgboost_poisson": test_metrics,
        "xgboost_mae_minus_baseline_mae": (
            test_metrics["mae"] - baseline_metrics["mae"]
        ),
    }

    metrics = {
        "model": "XGBoost Poisson",
        "objective": "count:poisson",
        "target_coverage": TARGET_COVERAGE,
        "raw_rows": int(len(df)),
        "warmup_rows_removed": int(len(enriched) - len(warm)),
        "train_rows": int(len(train)),
        "validation_rows": int(len(valid)),
        "test_rows": int(len(test)),
        "train_start": str(train["date"].min().date()),
        "train_end": str(train["date"].max().date()),
        "validation_start": str(valid["date"].min().date()),
        "validation_end": str(valid["date"].max().date()),
        "test_start": str(test["date"].min().date()),
        "test_end": str(test["date"].max().date()),
        "validation_metrics": validation_metrics,
        "test_metrics": test_metrics,
        "baseline_metrics": baseline_metrics,
        "comparison": comparison,
        "prediction_interval": pi_metrics,
        "interval_calibration": interval.to_dict(),
        "best_parameters": best_params,
    }

    # Test prediction artifact.
    prediction_output = test[
        ["date", "meal", "eligible_students", "actual_attendance"]
    ].copy()
    prediction_output["predicted_attendance"] = test_point
    prediction_output["lower_bound"] = lower
    prediction_output["upper_bound"] = upper
    prediction_output["absolute_error"] = np.abs(
        prediction_output["actual_attendance"]
        - prediction_output["predicted_attendance"]
    )
    prediction_output.to_csv(PREDICTIONS_PATH, index=False)

    # Feature importance from final model.
    importance = feature_importance_frame(final_model, final_preprocessor)
    importance.to_csv(IMPORTANCE_PATH, index=False)

    # Optional SHAP output.
    shap_path = IMPORTANCE_PATH.with_name("shap_importance.csv")
    shap_available = try_shap(
        final_model,
        Xte,
        final_preprocessor.get_feature_names_out(),
        shap_path,
    )
    metrics["shap_exported"] = bool(shap_available)

    # Save raw XGBoost JSON plus preprocessing and calibration state separately.
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    final_model.save_model(MODEL_PATH)

    import joblib

    joblib.dump(
        {
            "preprocessor": final_preprocessor,
            "feature_columns": FEATURE_COLUMNS,
            "interval": interval.to_dict(),
            "random_state": RANDOM_STATE,
            "best_parameters": best_params,
        },
        ARTIFACT_PATH,
    )

    save_metrics(metrics, METRICS_PATH)

    print("\n================ EVALUATION REPORT ================")
    print("MODEL: XGBoost Poisson")
    print(f"Test MAE: {test_metrics['mae']:.3f} students")
    print(f"Test RMSE: {test_metrics['rmse']:.3f} students")
    print(
        "Test Mean Poisson Deviance: "
        f"{test_metrics['mean_poisson_deviance']:.3f}"
    )
    print()
    print(f"Baseline MAE: {baseline_metrics['mae']:.3f}")
    print(f"XGBoost MAE: {test_metrics['mae']:.3f}")
    print()
    print(f"Target interval coverage: {TARGET_COVERAGE:.0%}")
    print(f"Actual interval coverage: {pi_metrics['coverage']:.3%}")
    print(f"Mean interval width: {pi_metrics['mean_interval_width']:.3f} students")
    print(f"Outside interval rate: {pi_metrics['outside_rate']:.3%}")
    print()
    print("Top measured features:")
    print(importance.head(10).to_string(index=False))
    print("====================================================")
    print(f"Saved model: {MODEL_PATH}")
    print(f"Saved inference artifacts: {ARTIFACT_PATH}")
    print(f"Saved test predictions: {PREDICTIONS_PATH}")
    print(f"Saved metrics: {METRICS_PATH}")
    print(f"Saved feature importance: {IMPORTANCE_PATH}")


if __name__ == "__main__":
    main()
