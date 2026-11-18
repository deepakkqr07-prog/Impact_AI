import os
import json
import joblib
from datetime import datetime
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support

def train_dialogue_models():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "..", "data", "dailydialog")
    saved_dir = os.path.join(base_dir, "saved_models")
    os.makedirs(saved_dir, exist_ok=True)

    print("=" * 70)
    print("TRAINING NLP DIALOGUE & QUESTION CLASSIFICATION MODEL")
    print("Source: Kaggle DailyDialog Dataset (dailydialog-dataset-1st-january-2024)")
    print("=" * 70)

    # 1. Load Training Data
    train_txt_path = os.path.join(data_dir, "dialogues_train.txt")
    train_act_path = os.path.join(data_dir, "dialogues_act_train.txt")
    train_emo_path = os.path.join(data_dir, "dialogues_emotion_train.txt")

    if not os.path.exists(train_txt_path) or not os.path.exists(train_act_path):
        raise FileNotFoundError(f"DailyDialog training files not found in {data_dir}")

    with open(train_txt_path, "r", encoding="utf-8") as f:
        dialogues = f.readlines()
    with open(train_act_path, "r", encoding="utf-8") as f:
        acts = f.readlines()
    with open(train_emo_path, "r", encoding="utf-8") as f:
        emotions = f.readlines()

    act_map = {
        "1": "inform",
        "2": "question",
        "3": "directive",
        "4": "commissive"
    }

    X_train, y_act_train, y_emo_train = [], [], []
    for d, a, e in zip(dialogues, acts, emotions):
        turns = [t.strip() for t in d.split("__eou__") if t.strip()]
        turn_acts = a.strip().split()
        turn_emos = e.strip().split()
        for i, turn in enumerate(turns):
            if i < len(turn_acts) and turn_acts[i] in act_map:
                X_train.append(turn)
                y_act_train.append(act_map[turn_acts[i]])
                emo_val = turn_emos[i] if i < len(turn_emos) else "0"
                y_emo_train.append(emo_val)

    print(f"Loaded {len(X_train)} training utterances from {len(dialogues)} DailyDialog conversations.")
    q_count = sum(1 for y in y_act_train if y == "question")
    print(f"Total Daily Questions identified: {q_count} ({q_count/len(y_act_train)*100:.1f}%)")

    # 2. Load Validation Data
    val_txt_path = os.path.join(data_dir, "dialogues_validation.txt")
    val_act_path = os.path.join(data_dir, "dialogues_act_validation.txt")

    X_val, y_act_val = [], []
    if os.path.exists(val_txt_path) and os.path.exists(val_act_path):
        with open(val_txt_path, "r", encoding="utf-8") as f:
            v_dialogues = f.readlines()
        with open(val_act_path, "r", encoding="utf-8") as f:
            v_acts = f.readlines()

        for d, a in zip(v_dialogues, v_acts):
            turns = [t.strip() for t in d.split("__eou__") if t.strip()]
            turn_acts = a.strip().split()
            for i, turn in enumerate(turns):
                if i < len(turn_acts) and turn_acts[i] in act_map:
                    X_val.append(turn)
                    y_act_val.append(act_map[turn_acts[i]])

    print(f"Loaded {len(X_val)} validation utterances.")

    # 3. Train Speech Act & Question Classifier Pipeline
    print("\nFitting TF-IDF Vectorizer + Multinomial Logistic Regressor for Dialogue Speech Acts...")
    act_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(max_features=15000, ngram_range=(1, 2), sublinear_tf=True)),
        ("clf", LogisticRegression(max_iter=350, C=2.5, solver="lbfgs"))
    ])

    act_pipeline.fit(X_train, y_act_train)

    # 4. Evaluate on Validation Set
    val_preds = act_pipeline.predict(X_val)
    val_acc = float(accuracy_score(y_act_val, val_preds))
    prec, rec, f1, _ = precision_recall_fscore_support(y_act_val, val_preds, labels=["question"], average="micro")
    
    print("\nValidation Performance on DailyDialog:")
    print(f"  Overall Speech Act Accuracy: {val_acc * 100:.2f}%")
    print(f"  Question Class Precision:   {prec * 100:.2f}%")
    print(f"  Question Class Recall:      {rec * 100:.2f}%")
    print(f"  Question Class F1-Score:    {f1 * 100:.2f}%")

    # 5. Train Domain-Specific Infrastructure Intent Classifier
    # Synthesize rich question query variations mapped to AI Assistant intents
    intent_data = [
        # HIGHEST_RISK_QUERY
        ("Which projects have the highest risk?", "HIGHEST_RISK_QUERY"),
        ("What are the most risky infrastructure projects right now?", "HIGHEST_RISK_QUERY"),
        ("Show top high risk projects across all ministries", "HIGHEST_RISK_QUERY"),
        ("List projects with high risk score", "HIGHEST_RISK_QUERY"),
        ("Which project is in the high risk category?", "HIGHEST_RISK_QUERY"),
        ("Give me the highest risk score projects", "HIGHEST_RISK_QUERY"),
        ("What projects have high vulnerability or severe risks?", "HIGHEST_RISK_QUERY"),
        
        # EXPERIENCING_DELAYS_QUERY
        ("Which projects are experiencing delays?", "EXPERIENCING_DELAYS_QUERY"),
        ("Show delayed infrastructure projects", "EXPERIENCING_DELAYS_QUERY"),
        ("Which projects have schedule slippage or timeline delay?", "EXPERIENCING_DELAYS_QUERY"),
        ("What projects are behind their completion dates?", "EXPERIENCING_DELAYS_QUERY"),
        ("Show me projects with deadline breach and schedule lag", "EXPERIENCING_DELAYS_QUERY"),
        ("Which project has the highest delay in days?", "EXPERIENCING_DELAYS_QUERY"),
        ("Show timeline delays across all departments", "EXPERIENCING_DELAYS_QUERY"),

        # COST_ESCALATION_REASONS
        ("What are the major reasons for cost escalation?", "COST_ESCALATION_REASONS"),
        ("Why are infrastructure projects exceeding their budget?", "COST_ESCALATION_REASONS"),
        ("What causes budget overruns in highway and rail projects?", "COST_ESCALATION_REASONS"),
        ("Explain cost escalation factors and expenditure anomalies", "COST_ESCALATION_REASONS"),
        ("What drives the revised outlay higher than approved cost?", "COST_ESCALATION_REASONS"),
        ("Why are we facing cost overruns?", "COST_ESCALATION_REASONS"),

        # LOW_PROGRESS_QUERY
        ("Show projects with low physical progress", "LOW_PROGRESS_QUERY"),
        ("Which projects have the slowest progress on ground?", "LOW_PROGRESS_QUERY"),
        ("List projects with lowest physical completion rate", "LOW_PROGRESS_QUERY"),
        ("Which project has ground progress below 50%?", "LOW_PROGRESS_QUERY"),
        ("Show low progress initiatives", "LOW_PROGRESS_QUERY"),
        ("What projects are progressing slowest?", "LOW_PROGRESS_QUERY"),

        # CRITICAL_ATTENTION_QUERY
        ("Which projects require immediate attention?", "CRITICAL_ATTENTION_QUERY"),
        ("What are the urgent critical projects needing executive review?", "CRITICAL_ATTENTION_QUERY"),
        ("Show critical projects with unresolved alerts", "CRITICAL_ATTENTION_QUERY"),
        ("Which project needs urgent departmental intervention?", "CRITICAL_ATTENTION_QUERY"),
        ("List all critical attention and escalation items", "CRITICAL_ATTENTION_QUERY"),
        ("What requires immediate action?", "CRITICAL_ATTENTION_QUERY"),

        # PROJECT_SUMMARY
        ("Summarize the current status of project INFRA-NHAI-01", "PROJECT_SUMMARY"),
        ("Give me a brief summary of Western Dedicated Freight Corridor", "PROJECT_SUMMARY"),
        ("Show details and ground status for Bhadla Solar Park", "PROJECT_SUMMARY"),
        ("Tell me about project INFRA-METRO-04", "PROJECT_SUMMARY"),
        ("What is the status of Rishikesh Karnaprayag railway line?", "PROJECT_SUMMARY"),
        ("Project summary and financial overview for Vadhavan Port", "PROJECT_SUMMARY"),

        # ML_MODEL_INFO
        ("How was the AI model trained and what dataset is used?", "ML_MODEL_INFO"),
        ("What is the machine learning architecture and algorithm?", "ML_MODEL_INFO"),
        ("Tell me about the Kaggle dataset training and accuracy", "ML_MODEL_INFO"),
        ("How does the cost overrun prediction model work?", "ML_MODEL_INFO"),
        ("Explain the regression model and feature importances", "ML_MODEL_INFO"),
        ("What dataset was used to train the AI assistant and models?", "ML_MODEL_INFO")
    ]

    intent_X = [item[0] for item in intent_data]
    intent_y = [item[1] for item in intent_data]

    intent_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
        ("clf", LogisticRegression(C=5.0, max_iter=200))
    ])
    intent_pipeline.fit(intent_X, intent_y)
    print(f"Trained domain intent classifier on {len(intent_data)} infrastructure question patterns.")

    # 6. Save Model Artifacts
    act_model_file = os.path.join(saved_dir, "dialogue_act_model.joblib")
    intent_model_file = os.path.join(saved_dir, "intent_classifier_model.joblib")
    metadata_file = os.path.join(saved_dir, "dialogue_metadata.json")

    joblib.dump(act_pipeline, act_model_file)
    joblib.dump(intent_pipeline, intent_model_file)

    meta_info = {
        "dataset_name": "DailyDialog Dataset (dailydialog-dataset-1st-january-2024.ipynb)",
        "total_conversations": len(dialogues),
        "total_utterances": len(X_train),
        "total_questions": q_count,
        "validation_samples": len(X_val),
        "accuracy": round(val_acc, 4),
        "question_precision": round(float(prec), 4),
        "question_recall": round(float(rec), 4),
        "question_f1": round(float(f1), 4),
        "speech_acts": ["inform", "question", "directive", "commissive"],
        "domain_intents": list(set(intent_y)),
        "trained_at": datetime.utcnow().isoformat()
    }

    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(meta_info, f, indent=2)

    print(f"\nSaved models successfully to {saved_dir}:")
    print(f"  - {os.path.basename(act_model_file)}")
    print(f"  - {os.path.basename(intent_model_file)}")
    print(f"  - {os.path.basename(metadata_file)}")
    print("=" * 70)

if __name__ == "__main__":
    train_dialogue_models()
