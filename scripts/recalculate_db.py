import json
from backend.database import SessionLocal, engine, Base
from backend.models import Project, Prediction, RiskAssessment, Alert
from backend.ml.cost_overrun_model import cost_model
from backend.ml.delay_prediction_model import delay_model
from backend.ml.risk_engine import risk_engine
from backend.ml.alert_detector import alert_detector

def recalculate():
    db = SessionLocal()
    try:
        projects = db.query(Project).all()
        print(f"Recalculating ML predictions for {len(projects)} projects with Kaggle models...")
        
        for p in projects:
            # 1. Cost model
            cost_res = cost_model.predict(p)
            # 2. Delay model
            delay_res = delay_model.predict(p)
            # 3. Risk engine
            risk_res = risk_engine.calculate_risk(p)
            
            p.risk_score = risk_res["overall_risk_score"]
            p.risk_level = risk_res["risk_level"]
            
            # Update or create Prediction records
            # Clear old predictions for this project
            db.query(Prediction).filter(Prediction.project_id == p.id).delete()
            
            p1 = Prediction(
                project_id=p.id,
                prediction_type="cost_overrun",
                predicted_value=cost_res["predicted_cost_overrun"],
                predicted_percentage=cost_res["predicted_overrun_percentage"],
                risk_level=cost_res["risk_level"],
                confidence_score=cost_res["confidence_score"],
                model_version="v2.0-kaggle-rf",
                feature_importance_json=json.dumps(cost_res["feature_importances"]),
                recommendations_json=json.dumps(cost_res["contributing_factors"])
            )
            p2 = Prediction(
                project_id=p.id,
                prediction_type="schedule_delay",
                predicted_value=delay_res["predicted_delay_days"],
                predicted_percentage=delay_res["delay_percentage"],
                risk_level=delay_res["delay_risk"],
                confidence_score=0.86,
                model_version="v2.0-kaggle-gb",
                recommendations_json=json.dumps(delay_res["recommended_actions"])
            )
            db.add_all([p1, p2])
            
            # Update Risk Assessment
            db.query(RiskAssessment).filter(RiskAssessment.project_id == p.id).delete()
            risk_rec = RiskAssessment(
                project_id=p.id,
                overall_risk_score=risk_res["overall_risk_score"],
                risk_level=risk_res["risk_level"],
                cost_escalation_score=risk_res["cost_escalation_score"],
                schedule_delay_score=risk_res["schedule_delay_score"],
                progress_deviation_score=risk_res["progress_deviation_score"],
                milestone_delay_score=risk_res["milestone_delay_score"],
                expenditure_anomaly_score=risk_res["expenditure_anomaly_score"],
                factors_json=json.dumps(risk_res["factor_breakdown"])
            )
            db.add(risk_rec)
            
            # Recalculate Alerts
            db.query(Alert).filter(Alert.project_id == p.id).delete()
            alerts = alert_detector.evaluate_project(p)
            for a in alerts:
                db.add(Alert(
                    project_id=p.id,
                    alert_category=a["alert_category"],
                    risk_level=a["risk_level"],
                    reason=a["reason"],
                    suggested_action=a["suggested_action"],
                    status="New"
                ))
            
            print(f"Project {p.project_code} ({p.name[:25]}...): Overrun={cost_res['predicted_overrun_percentage']}% (₹{cost_res['predicted_cost_overrun']:.1f} Cr), Delay={delay_res['predicted_delay_days']} days, Risk={p.risk_score:.1f}")

        db.commit()
        print("Database successfully synchronized with Kaggle trained ML models.")
    finally:
        db.close()

if __name__ == "__main__":
    recalculate()
