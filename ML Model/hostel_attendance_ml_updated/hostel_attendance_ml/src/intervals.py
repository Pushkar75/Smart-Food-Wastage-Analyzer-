from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Any

import numpy as np


@dataclass
class SplitConformalInterval:
    target_coverage: float
    residual_quantile: float = 0.0

    def fit(self, y_true, y_pred) -> "SplitConformalInterval":
        y_true = np.asarray(y_true, dtype=float)
        y_pred = np.asarray(y_pred, dtype=float)

        if not 0 < self.target_coverage < 1:
            raise ValueError("target_coverage must be between 0 and 1.")

        residuals = np.abs(y_true - y_pred)
        n = len(residuals)
        if n < 20:
            raise ValueError("At least 20 calibration rows are recommended.")

        # Finite-sample split-conformal quantile:
        # q = ceil((n+1)*coverage)-quantile order statistic.
        rank = int(np.ceil((n + 1) * self.target_coverage))
        rank = min(max(rank, 1), n)
        self.residual_quantile = float(np.sort(residuals)[rank - 1])
        return self

    def predict(self, point_prediction, eligible_students):
        point = np.asarray(point_prediction, dtype=float)
        eligible = np.asarray(eligible_students, dtype=float)

        lower = np.maximum(0.0, point - self.residual_quantile)
        upper = np.minimum(eligible, point + self.residual_quantile)
        return lower, upper

    def to_dict(self) -> Dict[str, Any]:
        return {
            "method": "split_conformal_absolute_residual",
            "target_coverage": self.target_coverage,
            "residual_quantile": self.residual_quantile,
        }

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "SplitConformalInterval":
        return cls(
            target_coverage=float(payload["target_coverage"]),
            residual_quantile=float(payload["residual_quantile"]),
        )
