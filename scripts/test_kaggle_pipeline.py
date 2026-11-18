import json
from backend.database import SessionLocal
from backend.models import Project, Prediction, User
from backend.ml.cost_overrun_model import cost_model
from backend.ml.delay_prediction_model import delay_model
from backend.routers.assistant import process_assistant_query, get_assistant_model_info
from backend.routers.predictions import get_model_info

def test_pipeline():
    print("=" * 60)
    print("1. Testing get_model_info() [Kaggle Engineering Feasibility]...")
    meta = get_model_info()
    print(f"  Dataset: {meta.get('dataset_name')}")
    print(f"  Sample count: {meta.get('sample_count')}")
    print(f"  Cost model MAE: {meta.get('cost_model', {}).get('mae_pct')}%")
    print(f"  Delay model MAE: {meta.get('delay_model', {}).get('mae_days')} days")
    
    print("\n2. Testing get_assistant_model_info() [Kaggle DailyDialog]...")
    nlp_meta = get_assistant_model_info()
    print(f"  Dataset: {nlp_meta.get('dataset_name')}")
    print(f"  Utterances: {nlp_meta.get('total_utterances')}")
    print(f"  Questions: {nlp_meta.get('total_questions')}")
    print(f"  Accuracy: {nlp_meta.get('accuracy') * 100:.2f}%")
    print(f"  Question Precision: {nlp_meta.get('question_precision') * 100:.2f}%")
    print(f"  Question F1: {nlp_meta.get('question_f1') * 100:.2f}%")

    db = SessionLocal()
    try:
        print("\n3. Testing predictions on registered projects...")
        projects = db.query(Project).all()
        for p in projects[:2]:
            cost_res = cost_model.predict(p)
            delay_res = delay_model.predict(p)
            print(f"  [{p.project_code}] {p.name}: Overrun={cost_res['predicted_overrun_percentage']}%, Delay={delay_res['predicted_delay_days']} days")

        print("\n4. Testing AI Assistant daily questions with NLP Act Classifier...")
        test_queries = [
            "Which projects have the highest risk?",
            "Which projects are experiencing delays?",
            "What are the major reasons for cost escalation?",
            "How was the model trained with DailyDialog data?"
        ]
        for q in test_queries:
            res = process_assistant_query(q, None, db)
            print(f"  Query: '{q}'")
            print(f"    -> Intent: {res.get('intent')} | Act: {res.get('speech_act')} (Conf: {res.get('act_confidence')*100:.1f}%)")
            assert res.get('answer'), "Answer should not be empty"

        print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
        print("=" * 60)
    finally:
        db.close()

if __name__ == "__main__":
    test_pipeline()
