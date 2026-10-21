from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / "data" / "mess_attendance_synthetic_dataset.csv"

# Versioned model storage.
MODEL_DIR = PROJECT_ROOT / "models"
CURRENT_MODEL_METADATA_PATH = MODEL_DIR / "current_model.json"

# Backward-compatible names are kept as aliases for the currently promoted model.
MODEL_PATH = MODEL_DIR / "xgboost_attendance_model.json"
ARTIFACT_PATH = MODEL_DIR / "inference_artifacts.joblib"

METRICS_PATH = PROJECT_ROOT / "outputs" / "evaluation_metrics.json"
PREDICTIONS_PATH = PROJECT_ROOT / "outputs" / "test_predictions.csv"
IMPORTANCE_PATH = PROJECT_ROOT / "outputs" / "feature_importance.csv"

# New data-collection storage.
PREDICTION_SNAPSHOT_DIR = PROJECT_ROOT / "prediction_snapshots"

RANDOM_STATE = 42
TARGET_COVERAGE = 0.90
TRAIN_FRACTION = 0.70
VALIDATION_FRACTION = 0.15

CORE_COLUMNS = [
    "date",
    "meal",
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

HISTORICAL_FEATURES = [
    "prev_day_attendance",
    "prev_2day_attendance",
    "prev_same_meal_7d",
    "prev_same_meal_14d",
    "rolling_3_attendance",
    "rolling_7_attendance",
    "rolling_14_attendance",
    "historical_same_weekday_attendance",
    "yes_to_attendance_ratio",
]

FEATURE_COLUMNS = [
    "meal",
    "day_of_week",
    "registered_students",
    "on_leave",
    "eligible_students",
    "yes_count",
    "no_count",
    "no_response_count",
    "response_rate",
    "yes_rate",
    *HISTORICAL_FEATURES,
]
