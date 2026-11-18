import os
import json
import datetime
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score
import joblib

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "Engineering_Cost_Feasibility_Dataset.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
METADATA_PATH = os.path.join(MODEL_DIR, "training_metadata.json")

TYPE_MAP = {
    "Road": 1,
    "Bridge": 2,
    "Power Plant": 3,
    "Water Infra": 4,
    "Building": 5
}

COST_FEATURES = [
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

FEATURE_LABELS = {
    "Estimated_Cost_USD": "Approved Capital Outlay Scale",
    "Time_Estimate_Days": "Project Schedule Horizon (Days)",
    "Scope_Complexity_Numeric": "Scope & Engineering Complexity",
    "Risk_Assessment_Score": "Engineering Risk Assessment Score",
    "Resource_Allocation_Score": "Resource Allocation Adequacy",
    "Environmental_Impact_Score": "Environmental & Clearance Footprint",
    "Stakeholder_Priority_Score": "Stakeholder & Inter-Agency Priority",
    "Project_Type_Num": "Infrastructure Sector Classification",
    "Burn_Intensity": "Capital Expenditure Burn Intensity"
}

def train_all_models():
    print(f"Loading Kaggle dataset from: {DATA_PATH}")
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Kaggle dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    n_samples = len(df)
    print(f"Dataset successfully loaded with {n_samples} project records.")

    # Feature Engineering
    df["Project_Type_Num"] = df["Project_Type"].map(TYPE_MAP).fillna(1)
    df["Burn_Intensity"] = df["Estimated_Cost_USD"] / df["Time_Estimate_Days"]
    
    # 1. Cost Overrun Regressor Training
    X = df[COST_FEATURES]
    y_cost_pct = df["Historical_Cost_Deviation_%"]

    X_train, X_test, y_cost_train, y_cost_test = train_test_split(X, y_cost_pct, test_size=0.2, random_state=42)

    cost_rf = RandomForestRegressor(
        n_estimators=120,
        max_depth=8,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    cost_rf.fit(X_train, y_cost_train)
    y_cost_pred = cost_rf.predict(X_test)
    cost_mae = float(mean_absolute_error(y_cost_test, y_cost_pred))
    cost_r2 = float(r2_score(y_cost_test, y_cost_pred))

    print(f"Cost Overrun Model: MAE = {cost_mae:.3f}%, R² = {cost_r2:.3f}")

    # Calculate Feature Importances
    cost_importances = []
    for feat, imp in zip(COST_FEATURES, cost_rf.feature_importances_):
        cost_importances.append({
            "feature": feat,
            "label": FEATURE_LABELS.get(feat, feat),
            "importance_percentage": round(float(imp) * 100.0, 1)
        })
    cost_importances.sort(key=lambda x: x["importance_percentage"], reverse=True)

    # 2. Schedule Delay Model Training
    # Ground target for schedule slippage days derived from duration, risk index and cost deviation
    df["Target_Delay_Days"] = (
        df["Time_Estimate_Days"] * (df["Historical_Cost_Deviation_%"] / 100.0) * (df["Risk_Assessment_Score"] / 50.0) +
        (df["Scope_Complexity_Numeric"] * 12.0)
    ).clip(lower=0)

    y_delay = df["Target_Delay_Days"]
    _, _, y_delay_train, y_delay_test = train_test_split(X, y_delay, test_size=0.2, random_state=42)

    delay_gbr = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.08,
        max_depth=5,
        random_state=42
    )
    delay_gbr.fit(X_train, y_delay_train)
    y_delay_pred = delay_gbr.predict(X_test)
    delay_mae = float(mean_absolute_error(y_delay_test, y_delay_pred))
    delay_r2 = float(r2_score(y_delay_test, y_delay_pred))

    print(f"Schedule Delay Model: MAE = {delay_mae:.2f} days, R² = {delay_r2:.3f}")

    # 3. Project Feasibility / Risk Classifier
    y_feasibility = df["Feasibility_Label"]
    _, _, y_feas_train, y_feas_test = train_test_split(X, y_feasibility, test_size=0.2, random_state=42)

    feas_clf = GradientBoostingClassifier(
        n_estimators=80,
        max_depth=4,
        random_state=42
    )
    feas_clf.fit(X_train, y_feas_train)
    y_feas_pred = feas_clf.predict(X_test)
    feas_acc = float(accuracy_score(y_feas_test, y_feas_pred))

    print(f"Feasibility Classifier: Accuracy = {feas_acc*100:.1f}%")

    # Save Models to saved_models/
    os.makedirs(MODEL_DIR, exist_ok=True)
    cost_model_path = os.path.join(MODEL_DIR, "cost_overrun_model.joblib")
    delay_model_path = os.path.join(MODEL_DIR, "delay_prediction_model.joblib")
    feas_model_path = os.path.join(MODEL_DIR, "feasibility_model.joblib")

    joblib.dump(cost_rf, cost_model_path)
    joblib.dump(delay_gbr, delay_model_path)
    joblib.dump(feas_clf, feas_model_path)

    metadata = {
        "dataset_name": "Engineering_Cost_Feasibility_Dataset.csv (Kaggle)",
        "sample_count": n_samples,
        "features_trained": COST_FEATURES,
        "cost_model": {
            "algorithm": "Random Forest Regressor",
            "n_estimators": 120,
            "mae_pct": round(cost_mae, 3),
            "r2_score": round(cost_r2, 3),
            "top_features": cost_importances[:5]
        },
        "delay_model": {
            "algorithm": "Gradient Boosting Regressor",
            "n_estimators": 100,
            "mae_days": round(delay_mae, 2),
            "r2_score": round(delay_r2, 3)
        },
        "feasibility_model": {
            "algorithm": "Gradient Boosting Classifier",
            "accuracy": round(feas_acc, 3),
            "classes": list(feas_clf.classes_)
        },
        "trained_at": datetime.datetime.utcnow().isoformat()
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nAll models trained and saved to {MODEL_DIR} successfully!")
    return metadata

if __name__ == "__main__":
    train_all_models()
