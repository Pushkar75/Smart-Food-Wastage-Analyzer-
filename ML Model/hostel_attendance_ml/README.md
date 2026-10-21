# Hostel Mess Attendance Prediction — XGBoost Poisson

This project implements the requested v1 attendance forecasting pipeline for a university hostel mess.

## Business definition

There is one hostel with approximately 1,200 registered students and four meals per day:

- breakfast
- lunch
- snacks
- dinner

`eligible_students = registered_students - on_leave`

Students submit YES/NO/no-response intent in the application. Their responses are available at the T-2 hour cutoff. Fingerprint attendance is collected later and is the ground-truth `actual_attendance`.

The model predicts `actual_attendance` using only T-2 information and historical information from completed observations.

## Model

The primary model is one global XGBoost regressor with:

```text
objective = count:poisson
```

There is no model-per-hostel, model-per-meal, or model-per-day design.

Meal is encoded with a reliable preprocessing pipeline using one-hot encoding. This is deliberately chosen for compatibility and easy save/reload rather than relying on native categorical behavior.

## Leakage prevention

All target-derived historical features are rebuilt in `src/feature_engineering.py`.

Important examples:

- `prev_day_attendance`: previous occurrence of the same meal.
- `prev_2day_attendance`: two same-meal occurrences ago.
- `prev_same_meal_7d`: exactly seven same-meal occurrences ago.
- `prev_same_meal_14d`: exactly fourteen same-meal occurrences ago.
- rolling attendance features operate on `actual_attendance.shift(1)`, so today's target is never included.
- `historical_same_weekday_attendance` uses prior rows only.
- `yes_to_attendance_ratio` uses prior YES counts and prior attendance only.

Rows without enough completed history are removed as warm-up rows.

`src/feature_engineering.py` also contains a perturbation-based leakage audit: it deliberately changes current/future target values and verifies that earlier feature vectors remain unchanged.

## Why not random train/test splitting?

This is a temporal forecasting problem. Random splitting can put observations from later dates into training while earlier observations are placed in the test set. That gives the model information about future distributions and makes evaluation less representative of deployment.

The implementation uses:

```text
earliest 70%  -> train
next 15%      -> validation
latest 15%    -> final test
```

Hyperparameter selection uses `TimeSeriesSplit` on the training portion only.

## Baseline

The baseline is a fixed, leakage-free weighted historical predictor using:

```text
0.50 * previous same-meal attendance
0.30 * rolling 7-meal attendance
0.20 * historical same-weekday attendance
```

It is reported beside the XGBoost model on the untouched chronological test set.

## Prediction intervals

The point model predicts the expected attendance count.

Prediction intervals use split-conformal absolute residuals calibrated on the held-out validation set. They are not arbitrary percentage bands.

The target coverage is 90%.

At inference:

```text
lower = max(0, prediction - calibrated_residual_quantile)
upper = min(eligible_students, prediction + calibrated_residual_quantile)
```

The final report includes:

- empirical coverage
- outside-interval rate
- mean interval width
- point MAE

Because calibration is performed before looking at the final test labels, the test set remains the final evaluation set.

## Install

Use Python 3.11+.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Dataset

Put the provided file here:

```text
data/mess_attendance_synthetic_dataset.csv
```

The project does not regenerate the dataset.

The training script validates these required source columns:

```text
date
meal
day_of_week
registered_students
on_leave
eligible_students
yes_count
no_count
no_response_count
response_rate
yes_rate
actual_attendance
```

Any existing historical-feature columns in the CSV are not blindly trusted; the implementation reconstructs them from the ground-truth history using leakage-safe shifts.

## Train

From the project root:

```bash
python -m src.train
```

Expected outputs:

```text
models/xgboost_attendance_model.json
models/inference_artifacts.joblib
outputs/test_predictions.csv
outputs/evaluation_metrics.json
outputs/feature_importance.csv
outputs/shap_importance.csv   # only when shap is installed
```

The script prints the actual calculated:

- test MAE
- test RMSE
- test Mean Poisson Deviance
- baseline MAE
- XGBoost MAE
- empirical interval coverage
- mean interval width
- outside-interval rate

No evaluation numbers are hard-coded or fabricated.

## API

After training:

```bash
uvicorn api.main:app --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Prediction endpoint:

```text
POST /predict
```

Example body:

```json
{
  "meal": "breakfast",
  "registered_students": 1200,
  "on_leave": 64,
  "eligible_students": 1136,
  "yes_count": 720,
  "no_count": 130,
  "no_response_count": 286,
  "response_rate": 0.748,
  "yes_rate": 0.634,
  "prev_day_attendance": 780,
  "prev_2day_attendance": 771,
  "prev_same_meal_7d": 792,
  "prev_same_meal_14d": 785,
  "rolling_3_attendance": 781,
  "rolling_7_attendance": 779,
  "rolling_14_attendance": 776,
  "day_of_week": 1,
  "historical_same_weekday_attendance": 784,
  "yes_to_attendance_ratio": 1.08
}
```

The numerical prediction in the project specification is only an example. The API returns values generated by the trained model and the calibrated interval.

## Real-time architecture

```text
Student App
   |
   | YES / NO responses
   v
Backend Database
   |
   | T-2 hours
   v
Feature Construction
   |
   v
XGBoost Poisson
   |
   +--> predicted_attendance
   +--> lower_bound
   +--> upper_bound
   |
   v
Kitchen Dashboard

After meal:
Fingerprint Scanner
   |
   v
actual_attendance
   |
   v
Database
   |
   v
Future retraining
```

The model does not retrain every time a student changes a response. The prediction is generated at the T-2 cutoff from the latest response snapshot.

## Count constraints

The pipeline validates:

```text
eligible_students = registered_students - on_leave

yes + no + no_response = eligible_students

0 <= predicted_attendance <= eligible_students
0 <= lower_bound <= predicted_attendance <= upper_bound <= eligible_students
```

The final point prediction is clipped to the eligible population after inference. This is a business safety constraint, not a substitute for debugging an invalid model output.

## Interpretability

`outputs/feature_importance.csv` contains XGBoost feature importance measured from the trained model.

If SHAP is installed:

```bash
pip install shap
python -m src.train
```

then `outputs/shap_importance.csv` is generated as an additional explanation artifact.

The project intentionally does not claim that any particular feature is the most important until the trained model's measured importance is available.

## Retraining

When new fingerprint-labelled observations arrive, append them to the historical source dataset and rerun:

```bash
python -m src.train
```

The architecture remains the same. The new observations become additional labelled history.

For multiple future hostels, keep one global model and add `hostel_id` as a training feature after the real multi-hostel dataset is available. Do not create separate models per hostel.

## v1 excluded features

The model intentionally does not add:

- festival
- Diwali
- Holi
- Christmas
- exam period
- holiday
- weather
- special event

Those can be added later through a controlled, automated calendar/event source.

## Files

```text
hostel_attendance_ml/
├── data/
│   └── mess_attendance_synthetic_dataset.csv   # place supplied CSV here
├── models/
│   ├── xgboost_attendance_model.json
│   └── inference_artifacts.joblib
├── outputs/
├── src/
│   ├── config.py
│   ├── data_loader.py
│   ├── feature_engineering.py
│   ├── preprocessing.py
│   ├── train.py
│   ├── evaluate.py
│   ├── baseline.py
│   ├── intervals.py
│   ├── modeling.py
│   └── predict.py
├── api/
│   └── main.py
├── requirements.txt
└── README.md
```
