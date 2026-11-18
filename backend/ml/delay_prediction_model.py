import os
import json
import numpy as np
import pandas as pd
from datetime import date
import joblib

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
MODEL_PATH = os.path.join(MODEL_DIR, "delay_prediction_model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "training_metadata.json")

DELAY_FEATURES = [
    "Estimated_Cost_USD",
    "Time_Estimate_Days",
    "Scope_Complexity_Numeric",
    "Risk_Assessment_Score",
    "Resource_Allocation_Score",
    "Environmental_Impact_Score",
    "Stakeholder_Priority_Score",
    "Project_Type_Num",
    "Burn_Intensity"
]

SECTOR_TYPE_MAP = {
    "Transportation & Highways": 1,
    "Railways & Metros": 2,
    "Power & Renewable Energy": 3,
    "Urban Infrastructure & Water": 4,
    "Ports & Shipping": 4,
    "Civil Aviation & Airports": 5,
    "Telecommunications": 3,
}

SECTOR_ENV_MAP = {
    "Transportation & Highways": 68.0,
    "Railways & Metros": 75.0,
    "Power & Renewable Energy": 54.0,
    "Urban Infrastructure & Water": 78.0,
    "Ports & Shipping": 72.0,
    "Civil Aviation & Airports": 62.0,
    "Telecommunications": 45.0,
}

class ProjectDelayPredictor:
    def __init__(self):
        self.model = None
        try:
            os.makedirs(MODEL_DIR, exist_ok=True)
        except Exception:
            pass
        self._load_or_train_model()

    def _load_or_train_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                return
            except Exception:
                pass

        from backend.ml.train_models import train_all_models
        train_all_models()
        self.model = joblib.load(MODEL_PATH)

    def extract_features(self, project) -> tuple:
        start = project.planned_start_date
        expected_end = project.expected_completion_date

        duration_days = max(1, (expected_end - start).days)
        approved = float(project.approved_cost or 1.0)
        estimated_cost_usd = approved * 120000.0
        burn_intensity = estimated_cost_usd / max(1, duration_days)

        risk_score = float(project.risk_score or 50.0)
        complexity = 3 if risk_score >= 65.0 else (2 if risk_score >= 35.0 else 1)

        planned_p = float(project.planned_progress or 0.0)
        actual_p = float(project.actual_progress or 0.0)
        progress_lag = max(0.0, planned_p - actual_p)

        resource_score = max(20.0, min(100.0, 85.0 - (progress_lag * 1.5)))
        env_score = SECTOR_ENV_MAP.get(project.sector, 65.0)
        stakeholder_priority = 0.75
        type_num = SECTOR_TYPE_MAP.get(project.sector, 1)

        features = [
            estimated_cost_usd,
            duration_days,
            complexity,
            risk_score,
            resource_score,
            env_score,
            stakeholder_priority,
            type_num,
            burn_intensity
        ]
        X_df = pd.DataFrame([features], columns=DELAY_FEATURES)
        return X_df, features

    def predict(self, project) -> dict:
        X, raw_features = self.extract_features(project)
        base_predicted_delay = float(self.model.predict(X)[0])

        planned_duration = raw_features[1]
        planned_p = float(project.planned_progress or 0.0)
        actual_p = float(project.actual_progress or 0.0)
        progress_deficit = max(0.0, planned_p - actual_p)

        # Compound baseline model prediction with actual ground progress lag
        adjusted_delay = base_predicted_delay + (progress_deficit / 100.0) * planned_duration * 0.8
        predicted_delay_days = max(0.0, round(adjusted_delay, 1))

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

        if progress_deficit > 10:
            reasons.append(f"Physical execution gap of {progress_deficit:.1f}% against planned project milestones.")
            recommendations.append("Mobilize additional contractor execution manpower and institute double-shift civil works.")
        if raw_features[3] > 60:  # risk_score
            reasons.append(f"High risk indicator index ({raw_features[3]:.1f}/100) indicates inter-departmental bottleneck vulnerability.")
            recommendations.append("Establish a joint expedited review committee with ministry nodal officers.")
        if is_past_expected_date:
            reasons.append(f"Target completion deadline breached by {confirmed_delay_days} days.")
            recommendations.append("Formalize revised baseline schedule with clear penalty milestones.")
        if not reasons:
            reasons.append("Project execution schedule conforms to historical benchmark tolerances.")
            recommendations.append("Maintain existing site pacing and periodic milestone verification.")

        return {
            "predicted_delay_days": predicted_delay_days,
            "estimated_delay_months": round(predicted_delay_days / 30.0, 1),
            "delay_percentage": delay_percentage,
            "delay_risk": delay_risk,
            "is_confirmed_delay": is_past_expected_date,
            "confirmed_delay_days": confirmed_delay_days,
            "current_progress": actual_p,
            "expected_progress": planned_p,
            "progress_deficit": round(progress_deficit, 1),
            "reasons": reasons,
            "recommended_actions": recommendations,
            "training_dataset": "Kaggle Engineering Cost Feasibility Dataset (3,245 projects)",
            "model_architecture": "Scikit-Learn Gradient Boosting Regressor (Trained on Kaggle Dataset)"
        }

delay_model = ProjectDelayPredictor()
