import os
import numpy as np
import pandas as pd
from datetime import date
from sklearn.ensemble import GradientBoostingRegressor
import joblib

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
MODEL_PATH = os.path.join(MODEL_DIR, "delay_prediction_model.joblib")

DELAY_FEATURES = [
    "planned_duration_days",
    "elapsed_days",
    "planned_progress",
    "actual_progress",
    "progress_deficit",
    "milestones_missed_ratio",
    "expenditure_rate_ratio",
    "remaining_duration_days"
]

class ProjectDelayPredictor:
    def __init__(self):
        self.model = None
        try:
            os.makedirs(MODEL_DIR, exist_ok=True)
        except Exception:
            pass
        self._load_or_train_model()

    def _generate_synthetic_historical_data(self, n_samples=600):
        np.random.seed(101)
        records = []
        for _ in range(n_samples):
            planned_duration = int(np.random.uniform(300, 2000))
            elapsed = int(np.random.uniform(60, planned_duration + 200))
            remaining = max(0, planned_duration - elapsed)

            expected_p = min(100.0, max(5.0, (elapsed / planned_duration) * 100.0))
            deficit = float(np.random.uniform(0, 30.0) if np.random.rand() > 0.35 else 0)
            actual_p = max(0.0, min(100.0, expected_p - deficit))
            progress_deficit = max(0.0, expected_p - actual_p)

            milestones_missed_ratio = min(1.0, (progress_deficit / 100.0) * 1.5 + np.random.uniform(0, 0.2))
            exp_rate = (actual_p / max(1.0, expected_p)) + np.random.normal(0, 0.1)

            # Delay in days target calculation
            estimated_delay_days = (
                (progress_deficit / 100.0) * planned_duration * 0.9 +
                (milestones_missed_ratio * 90.0) +
                np.random.normal(0, 15)
            )
            estimated_delay_days = max(0.0, estimated_delay_days)

            records.append({
                "planned_duration_days": planned_duration,
                "elapsed_days": elapsed,
                "planned_progress": expected_p,
                "actual_progress": actual_p,
                "progress_deficit": progress_deficit,
                "milestones_missed_ratio": milestones_missed_ratio,
                "expenditure_rate_ratio": exp_rate,
                "remaining_duration_days": remaining,
                "target_delay_days": estimated_delay_days
            })
        return pd.DataFrame(records)

    def _load_or_train_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                return
            except Exception:
                pass

        df = self._generate_synthetic_historical_data()
        X = df[DELAY_FEATURES]
        y = df["target_delay_days"]

        regressor = GradientBoostingRegressor(
            n_estimators=120,
            learning_rate=0.08,
            max_depth=5,
            random_state=42
        )
        regressor.fit(X, y)
        self.model = regressor
        try:
            joblib.dump(self.model, MODEL_PATH)
        except Exception:
            pass

    def extract_features(self, project) -> np.ndarray:
        start = project.planned_start_date
        expected_end = project.expected_completion_date
        today = date.today()

        planned_duration = max(1, (expected_end - start).days)
        elapsed = max(1, (today - start).days)
        remaining = max(0, (expected_end - today).days)

        planned_p = float(project.planned_progress or 0.0)
        actual_p = float(project.actual_progress or 0.0)
        progress_deficit = max(0.0, planned_p - actual_p)

        # Milestone missed ratio calculation from attached milestones if any
        milestones = getattr(project, "milestones", [])
        if milestones:
            missed_count = sum(1 for m in milestones if m.status in ["Delayed", "Pending"] and m.planned_completion_date < today)
            milestones_missed_ratio = missed_count / len(milestones)
        else:
            milestones_missed_ratio = min(1.0, (progress_deficit / 80.0))

        approved = float(project.approved_cost or 1.0)
        spent = float(project.actual_expenditure or 0.0)
        exp_rate = (spent / approved) / max(0.05, (elapsed / planned_duration))

        features = [
            planned_duration,
            elapsed,
            planned_p,
            actual_p,
            progress_deficit,
            milestones_missed_ratio,
            exp_rate,
            remaining
        ]
        X_df = pd.DataFrame([features], columns=DELAY_FEATURES)
        return X_df, features

    def predict(self, project) -> dict:
        X, raw_features = self.extract_features(project)
        predicted_delay_days = float(self.model.predict(X)[0])
        predicted_delay_days = max(0.0, round(predicted_delay_days, 1))

        planned_duration = raw_features[0]
        delay_percentage = round((predicted_delay_days / max(1, planned_duration)) * 100.0, 1)

        # Classify Delay Risk Level
        if predicted_delay_days > 90 or delay_percentage > 20:
            delay_risk = "High"
        elif predicted_delay_days > 30 or delay_percentage > 8:
            delay_risk = "Medium"
        else:
            delay_risk = "Low"

        # Check if project is already past expected completion date (confirmed delay)
        today = date.today()
        is_past_expected_date = today > project.expected_completion_date and project.status != "Completed"
        confirmed_delay_days = (today - project.expected_completion_date).days if is_past_expected_date else 0

        # Construct specific reasons and actionable recommendations
        reasons = []
        recommendations = []

        if raw_features[4] > 10:  # progress_deficit
            reasons.append(f"Physical execution gap of {raw_features[4]:.1f}% against planned progress milestones.")
            recommendations.append("Mobilize additional sub-contractor resources and establish double-shift civil works.")
        if raw_features[5] > 0.2:  # milestones_missed_ratio
            reasons.append(f"{round(raw_features[5]*100)}% of critical path milestones are overdue or delayed.")
            recommendations.append("Conduct an immediate joint milestone audit with implementing agency and PMC.")
        if is_past_expected_date:
            reasons.append(f"Target completion deadline breached by {confirmed_delay_days} days.")
            recommendations.append("Formalize revised baseline schedule with clear penalty milestones.")
        if not reasons:
            reasons.append("Progress tracking closely matches expected baseline schedule.")
            recommendations.append("Maintain current operational cadence and supply-chain buffer monitoring.")

        return {
            "predicted_delay_days": predicted_delay_days,
            "estimated_delay_months": round(predicted_delay_days / 30.0, 1),
            "delay_percentage": delay_percentage,
            "delay_risk": delay_risk,
            "is_confirmed_delay": is_past_expected_date,
            "confirmed_delay_days": confirmed_delay_days,
            "current_progress": raw_features[3],
            "expected_progress": raw_features[2],
            "progress_deficit": round(raw_features[4], 1),
            "reasons": reasons,
            "recommended_actions": recommendations,
            "model_architecture": "Gradient Boosting Regressor (Scikit-learn)"
        }

delay_model = ProjectDelayPredictor()
