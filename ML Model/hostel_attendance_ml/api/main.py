from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.predict import load_inference_artifacts, predict_one


app = FastAPI(
    title="Hostel Mess Attendance Prediction API",
    version="1.0.0",
    description=(
        "XGBoost Poisson attendance forecasting API. "
        "Predictions are made from T-2 hour features only."
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


@app.get("/health")
def health():
    return {
        "status": "ok" if LOAD_ERROR is None else "model_not_loaded",
        "model": "XGBoost Poisson",
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
    try:
        result = predict_one(payload, model=model, artifacts=artifacts)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return result
