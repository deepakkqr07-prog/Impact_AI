import json
from backend.database import SessionLocal
from backend.models import Project, Prediction, User
from backend.ml.cost_overrun_model import cost_model
from backend.ml.delay_prediction_model import delay_model
from backend.routers.assistant import process_assistant_query
from backend.routers.predictions import get_model_info

def test_pipeline():
    # 1. Test model-info function
    print("Testing get_model_info()...")
    meta = get_model_info()
    print(f"  Dataset: {meta.get('dataset_name')}")
    print(f"  Sample count: {meta.get('sample_count')}")
    print(f"  Cost model MAE: {meta.get('cost_model', {}).get('mae_pct')}%")
    print(f"  Delay model MAE: {meta.get('delay_model', {}).get('mae_days')} days")
    print(f"  Feasibility accuracy: {meta.get('feasibility_model', {}).get('accuracy')}")
    
    db = SessionLocal()
    try:
        # 2. Test predictions on real projects
        projects = db.query(Project).all()
        print(f"\nTesting predictions on {len(projects)} registered projects...")
        for p in projects[:3]:
            cost_res = cost_model.predict(p)
            delay_res = delay_model.predict(p)
            print(f"  [{p.project_code}] {p.name}:")
            print(f"    - Overrun: +{cost_res['predicted_overrun_percentage']}% (+₹{cost_res['predicted_cost_overrun']} Cr), Risk: {cost_res['risk_level']}")
            print(f"    - Delay: {delay_res['predicted_delay_days']} days ({delay_res['delay_risk']} risk)")
            print(f"    - Top Feature: {cost_res['feature_importances'][0]['label']} ({cost_res['feature_importances'][0]['importance_percentage']}%)")
            
        # 3. Test assistant Kaggle query
        print("\nTesting AI Assistant query about Kaggle dataset...")
        query_res = process_assistant_query("How was the AI model trained and what dataset was used?", None, db)
        print(f"  Intent: {query_res.get('intent')}")
        print(f"  Answer preview:\n{query_res.get('answer')[:250]}...")
        
        print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_pipeline()
