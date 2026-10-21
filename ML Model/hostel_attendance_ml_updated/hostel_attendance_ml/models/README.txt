# Model versions

Training is automatic.

- `xgboost_attendance_model_v1.json`, `inference_artifacts_v1.joblib`, and `evaluation_metrics_v1.json` are immutable versioned artifacts.
- `current_model.json` identifies the current version.
- `xgboost_attendance_model.json` and `inference_artifacts.joblib` are compatibility copies of the current version used by the existing API configuration.

Run:

```powershell
python -m src.train
```

to create the next version. Existing `*_vN.*` files are not overwritten.
