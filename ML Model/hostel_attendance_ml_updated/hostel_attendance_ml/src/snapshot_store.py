from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from .config import PREDICTION_SNAPSHOT_DIR


PREDICTION_SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)


def snapshot_path(prediction_id: str) -> Path:
    return PREDICTION_SNAPSHOT_DIR / f"{prediction_id}.json"


def save_snapshot(prediction_id: str, data: Dict[str, Any]) -> None:
    path = snapshot_path(prediction_id)
    payload = dict(data)
    payload.setdefault(
        "saved_at_utc",
        datetime.now(timezone.utc).isoformat(),
    )

    temp_path = path.with_suffix(".json.tmp")
    temp_path.write_text(
        json.dumps(payload, indent=2, default=str),
        encoding="utf-8",
    )
    temp_path.replace(path)


def load_snapshot(prediction_id: str) -> Dict[str, Any]:
    path = snapshot_path(prediction_id)
    if not path.exists():
        raise FileNotFoundError(
            f"No prediction snapshot found for prediction_id={prediction_id}"
        )

    return json.loads(path.read_text(encoding="utf-8"))


def delete_snapshot(prediction_id: str) -> None:
    path = snapshot_path(prediction_id)
    if path.exists():
        path.unlink()
