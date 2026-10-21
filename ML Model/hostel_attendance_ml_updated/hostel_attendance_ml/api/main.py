from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.config import DATA_PATH
from src.csv_store import append_completed_prediction
from src.predict import load_inference_artifacts, predict_one
from src.snapshot_store import delete_snapshot, load_snapshot, save_snapshot


app = FastAPI(
    title="Hostel Mess Attendance Prediction API",
    version="1.1.0",
    description=(
        "XGBoost Poisson attendance forecasting API with prediction snapshots "
        "and post-meal ground-truth recording."
    ),
)

try:
    model, artifacts = load_inference_artifacts()
except Exception as exc:
    model = None
    artifacts = None
    LOAD_ERROR = str(exc)
else:
    LOAD_ERROR = None


class PredictionRequest(BaseModel):
    # prediction_date is optional for backward compatibility. For scheduled
    # future predictions, the backend should send the actual meal date.
    prediction_date: Optional[date] = None

    meal: str
    registered_students: int = Field(ge=0)
    on_leave: int = Field(ge=0)
    eligible_students: int = Field(ge=0)

    yes_count: int = Field(ge=0)
    no_count: int = Field(ge=0)
    no_response_count: int = Field(ge=0)
    response_rate: float = Field(ge=0, le=1)
    yes_rate: float = Field(ge=0, le=1)

    prev_day_attendance: float = Field(ge=0)
    prev_2day_attendance: float = Field(ge=0)
    prev_same_meal_7d: float = Field(ge=0)
    prev_same_meal_14d: float = Field(ge=0)

    rolling_3_attendance: float = Field(ge=0)
    rolling_7_attendance: float = Field(ge=0)
    rolling_14_attendance: float = Field(ge=0)

    day_of_week: int = Field(ge=0, le=6)
    historical_same_weekday_attendance: float = Field(ge=0)
    yes_to_attendance_ratio: float = Field(ge=0)


class AttendanceRecord(BaseModel):
    prediction_id: str = Field(min_length=1)
    actual_attendance: int = Field(ge=0)


@app.get("/health")
def health():
    return {
        "status": "ok" if LOAD_ERROR is None else "model_not_loaded",
        "model": "XGBoost Poisson",
        "model_version": artifacts.get("model_version") if artifacts else None,
        "load_error": LOAD_ERROR,
    }


@app.post("/predict")
def predict(request: PredictionRequest):
    if model is None or artifacts is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model artifacts could not be loaded: {LOAD_ERROR}",
        )

    payload = request.model_dump()
    prediction_date = payload.pop("prediction_date") or date.today()

    try:
        result = predict_one(payload, model=model, artifacts=artifacts)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    prediction_id = (
        f"{prediction_date.isoformat()}_"
        f"{payload['meal'].strip().lower()}_"
        f"{uuid4().hex[:8]}"
    )

    snapshot = {
        **payload,
        "date": prediction_date.isoformat(),
        "prediction_id": prediction_id,
        "model_version": artifacts.get("model_version"),
        "predicted_attendance": result["predicted_attendance"],
        "lower_bound": result["lower_bound"],
        "upper_bound": result["upper_bound"],
        "prediction_created_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    save_snapshot(prediction_id, snapshot)

    return {
        "prediction_id": prediction_id,
        "model_version": snapshot["model_version"],
        **result,
    }


@app.post("/record-attendance")
def record_attendance(request: AttendanceRecord):
    try:
        snapshot = load_snapshot(request.prediction_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    eligible = int(snapshot["eligible_students"])
    if request.actual_attendance > eligible:
        raise HTTPException(
            status_code=422,
            detail="actual_attendance cannot exceed eligible_students.",
        )

    try:
        append_completed_prediction(
            DATA_PATH,
            snapshot,
            request.actual_attendance,
        )
    except ValueError as exc:
        # A duplicate is a client/data-integrity error.
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    # Only remove the snapshot after the CSV write succeeds.
    snapshot["recorded_at_utc"] = datetime.now(timezone.utc).isoformat()
    delete_snapshot(request.prediction_id)

    return {
        "status": "recorded",
        "prediction_id": request.prediction_id,
        "actual_attendance": request.actual_attendance,
        "model_version": snapshot.get("model_version"),
    }
