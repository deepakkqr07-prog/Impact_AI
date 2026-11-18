import re
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.database import get_db
from backend.models import Project, Alert, RiskAssessment, User
from backend.schemas import AssistantQueryRequest, AssistantQueryResponse
from backend.auth import get_current_user
from backend.ml.cost_overrun_model import cost_model
from backend.ml.delay_prediction_model import delay_model

router = APIRouter(prefix="/assistant", tags=["AI Project Assistant"])

def process_assistant_query(query: str, project_id: Optional[int], db: Session) -> Dict[str, Any]:
    q = query.lower().strip()
    projects = db.query(Project).all()

    # 1. Specific project summary if project_id is given or project name/code is mentioned
    target_project = None
    if project_id:
        target_project = db.query(Project).filter(Project.id == project_id).first()
    else:
        # Check if project code or key words in title appear in query
        for p in projects:
            if p.project_code.lower() in q or (len(p.name) > 8 and p.name.lower()[:15] in q):
                target_project = p
                break

    if target_project and ("summar" in q or "status" in q or "detail" in q or "tell me about" in q or project_id):
        c_pred = cost_model.predict(target_project)
        d_pred = delay_model.predict(target_project)
        alerts_count = db.query(Alert).filter(Alert.project_id == target_project.id, Alert.status == "New").count()

        answer = (
            f"**Comprehensive Project Brief: {target_project.name} ({target_project.project_code})**\n\n"
            f"- **Sector / Ministry:** {target_project.sector} | {target_project.ministry}\n"
            f"- **Location:** {target_project.location_state} ({target_project.location_district or 'Multi-district'})\n"
            f"- **Financial Overview:** Approved Outlay ₹{target_project.approved_cost:,.2f} Cr, Revised Outlay ₹{target_project.revised_cost:,.2f} Cr, Actual Spend to date ₹{target_project.actual_expenditure:,.2f} Cr.\n"
            f"- **Ground Progress:** Currently at **{target_project.actual_progress:.1f}%** versus scheduled target of **{target_project.planned_progress:.1f}%** (Deficit: {max(0, target_project.planned_progress - target_project.actual_progress):.1f}%).\n"
            f"- **Timeline Status:** Planned completion: {target_project.expected_completion_date}. "
            f"Model predicts schedule delay of **{d_pred['predicted_delay_days']} days** ({d_pred['estimated_delay_months']} months).\n"
            f"- **Cost Escalation Risk:** Estimated cost escalation is **₹{c_pred['predicted_cost_overrun']:,.2f} Cr** (+{c_pred['predicted_overrun_percentage']}%).\n"
            f"- **Composite Risk Score:** **{target_project.risk_score:.1f}/100** ({target_project.risk_level} Risk).\n"
            f"- **Pending Alerts:** {alerts_count} active alert(s) requiring review."
        )
        return {
            "answer": answer,
            "intent": "PROJECT_SUMMARY",
            "data": {
                "project_code": target_project.project_code,
                "project_name": target_project.name,
                "approved_cost": target_project.approved_cost,
                "revised_cost": target_project.revised_cost,
                "actual_expenditure": target_project.actual_expenditure,
                "actual_progress": target_project.actual_progress,
                "planned_progress": target_project.planned_progress,
                "risk_score": target_project.risk_score,
                "predicted_overrun": c_pred["predicted_cost_overrun"],
                "predicted_delay_days": d_pred["predicted_delay_days"]
            },
            "suggested_queries": [
                "Which projects have the highest risk?",
                "Which projects are experiencing delays?",
                "Show projects with low physical progress",
                "What are the major reasons for cost escalation?"
            ]
        }

    # 2. "Which projects have the highest risk?"
    if any(k in q for k in ["highest risk", "high risk", "most risky", "risk level", "top risk"]):
        high_risk_projects = sorted(projects, key=lambda x: x.risk_score, reverse=True)[:5]
        items_desc = []
        table_rows = []
        for p in high_risk_projects:
            items_desc.append(f"- **{p.project_code} - {p.name}**: Risk Score **{p.risk_score:.1f}/100** ({p.risk_level} Risk), Sector: {p.sector}, Status: {p.status}")
            table_rows.append({
                "code": p.project_code,
                "name": p.name,
                "risk_score": p.risk_score,
                "risk_level": p.risk_level,
                "sector": p.sector,
                "progress": f"{p.actual_progress}% / {p.planned_progress}%"
            })

        answer = (
            f"Based on real-time multi-indicator risk calculation across all active infrastructure projects, "
            f"the **top {len(high_risk_projects)} highest risk projects** currently in the system are:\n\n"
            + "\n".join(items_desc) + "\n\n"
            f"*Key Risk Indicators Analyzed:* Budget revisions over approved costs, physical progress deficit against planned milestones, and financial disbursement acceleration."
        )
        return {
            "answer": answer,
            "intent": "HIGHEST_RISK_QUERY",
            "data": table_rows,
            "suggested_queries": [
                "Which projects require immediate attention?",
                "Which projects are experiencing delays?",
                "What are the major reasons for cost escalation?"
            ]
        }

    # 3. "Which projects are experiencing delays?"
    if any(k in q for k in ["delay", "schedule", "behind schedule", "late", "timeline"]):
        delayed_projects = [p for p in projects if p.status in ["Delayed", "Critical Attention"] or (p.planned_progress - p.actual_progress) > 10.0]
        delayed_projects.sort(key=lambda x: (x.planned_progress - x.actual_progress), reverse=True)

        items_desc = []
        table_rows = []
        for p in delayed_projects[:5]:
            gap = round(p.planned_progress - p.actual_progress, 1)
            d_pred = delay_model.predict(p)
            items_desc.append(
                f"- **{p.project_code} ({p.name})**: Progress Deficit **{gap}%** (Actual: {p.actual_progress}%, Target: {p.planned_progress}%). "
                f"Estimated delay duration: **{d_pred['predicted_delay_days']} days** ({d_pred['estimated_delay_months']} months)."
            )
            table_rows.append({
                "code": p.project_code,
                "name": p.name,
                "actual_progress": p.actual_progress,
                "planned_progress": p.planned_progress,
                "gap": gap,
                "estimated_delay_days": d_pred["predicted_delay_days"]
            })

        answer = (
            f"Found **{len(delayed_projects)} project(s)** currently experiencing significant schedule delays or substantial progress lag:\n\n"
            + "\n".join(items_desc) + "\n\n"
            f"**Recommendation:** These projects require immediate contractor performance reviews and acceleration measures."
        )
        return {
            "answer": answer,
            "intent": "DELAYED_PROJECTS_QUERY",
            "data": table_rows,
            "suggested_queries": [
                "Which projects require immediate attention?",
                "What are the major reasons for cost escalation?",
                "Which projects have the highest risk?"
            ]
        }

    # 4. "What are the major reasons for cost escalation?"
    if any(k in q for k in ["reason", "cause", "escalation", "overrun", "cost increase", "budget overrun"]):
        total_approved = sum(p.approved_cost for p in projects)
        total_revised = sum(p.revised_cost for p in projects)
        total_overrun = sum(cost_model.predict(p)["predicted_cost_overrun"] for p in projects)

        answer = (
            f"**Major Drivers of Cost Escalation Identified across Infrastructure Portfolio:**\n\n"
            f"1. **Execution Timeline Slippage & Idle Overhead:** Prolonged project durations lead to escalated equipment leasing, supervisory consultancy costs, and inflation in steel, cement, and bituminous inputs.\n"
            f"2. **Right-of-Way (RoW) & Environmental Delays:** Delays in land parcels and statutory tree-felling sanctions defer contractor mobilization while escalation clauses trigger price adjustments.\n"
            f"3. **Scope Creep & Design Revisions:** Post-award geotechnical surprises in tunneling, bridge foundations, or utility shifting requiring major structural redesign.\n"
            f"4. **Disparity in Financial Disbursement:** Projects where cash outflow reached 70%+ while ground physical milestones lagged under 50%.\n\n"
            f"**Portfolio Financial Impact:** Total approved capital outlay of **₹{total_approved:,.2f} Cr** has already seen revised commitments of **₹{total_revised:,.2f} Cr**, with an ML-predicted cumulative overrun risk of **₹{total_overrun:,.2f} Cr**."
        )
        return {
            "answer": answer,
            "intent": "COST_ESCALATION_REASONS",
            "data": {
                "total_approved_cr": round(total_approved, 2),
                "total_revised_cr": round(total_revised, 2),
                "predicted_overrun_cr": round(total_overrun, 2)
            },
            "suggested_queries": [
                "Which projects have the highest risk?",
                "Show projects with low physical progress",
                "Which projects require immediate attention?"
            ]
        }

    # 5. "Show projects with low physical progress"
    if any(k in q for k in ["low progress", "low physical", "slow progress", "least progress", "under 50"]):
        low_progress = sorted(projects, key=lambda x: x.actual_progress)[:5]
        items_desc = []
        table_rows = []
        for p in low_progress:
            items_desc.append(
                f"- **{p.project_code} ({p.name})**: Ground Progress **{p.actual_progress:.1f}%** (Target: {p.planned_progress:.1f}%), Sector: {p.sector}, Status: {p.status}"
            )
            table_rows.append({
                "code": p.project_code,
                "name": p.name,
                "actual_progress": p.actual_progress,
                "planned_progress": p.planned_progress,
                "sector": p.sector
            })

        answer = (
            f"Here are the **5 infrastructure projects with the lowest verified physical ground progress**:\n\n"
            + "\n".join(items_desc) + "\n\n"
            f"*Note:* Some early-stage mega initiatives (e.g. Vadhavan Mega Port) are naturally in preliminary engineering phases, whereas projects with large gaps between actual and planned progress denote operational bottlenecks."
        )
        return {
            "answer": answer,
            "intent": "LOW_PROGRESS_QUERY",
            "data": table_rows,
            "suggested_queries": [
                "Which projects are experiencing delays?",
                "Which projects require immediate attention?",
                "Which projects have the highest risk?"
            ]
        }

    # 6. "Which projects require immediate attention?"
    if any(k in q for k in ["immediate attention", "critical", "attention", "urgent", "escalate"]):
        critical_projects = [p for p in projects if p.status == "Critical Attention" or p.risk_score >= 65.0]
        if not critical_projects:
            critical_projects = sorted(projects, key=lambda x: x.risk_score, reverse=True)[:3]

        items_desc = []
        for p in critical_projects:
            active_alerts = db.query(Alert).filter(Alert.project_id == p.id, Alert.status == "New").count()
            c_pred = cost_model.predict(p)
            items_desc.append(
                f"- **{p.project_code} - {p.name}**\n"
                f"  - Risk Score: **{p.risk_score:.1f}/100** | Sector: {p.sector}\n"
                f"  - Progress Deficit: **{max(0, p.planned_progress - p.actual_progress):.1f}%** (Ground: {p.actual_progress}%, Target: {p.planned_progress}%)\n"
                f"  - Predicted Overrun: **₹{c_pred['predicted_cost_overrun']:,.2f} Cr** (+{c_pred['predicted_overrun_percentage']}%)\n"
                f"  - Active Unresolved Alerts: **{active_alerts}**"
            )

        answer = (
            f"**Projects Requiring Immediate Executive & Departmental Attention:**\n\n"
            + "\n".join(items_desc) + "\n\n"
            f"**Recommended Immediate Interventions:**\n"
            f"1. Convene an expedited inter-departmental task force with the respective implementing agencies.\n"
            f"2. Freeze unverified contractual escalations and mandate a physical site audit.\n"
            f"3. Issue formal milestone compliance directives."
        )
        return {
            "answer": answer,
            "intent": "CRITICAL_ATTENTION_QUERY",
            "data": [{"code": p.project_code, "name": p.name, "risk_score": p.risk_score} for p in critical_projects],
            "suggested_queries": [
                "Which projects have the highest risk?",
                "What are the major reasons for cost escalation?",
                "Which projects are experiencing delays?"
            ]
        }

    # 7. Model training and Kaggle dataset queries
    if any(k in q for k in ["train", "dataset", "kaggle", "algorithm", "accuracy", "mae", "features", "how does ai work", "ml model"]):
        answer = (
            f"**Machine Learning Models & Kaggle Training Architecture:**\n\n"
            f"- **Dataset:** Kaggle Engineering Cost Feasibility Dataset (`Engineering_Cost_Feasibility_Dataset.csv`) comprising **3,245 historical engineering & infrastructure projects** across 5 sectors (Roads, Bridges, Power Plants, Water Infrastructure, and Commercial/Industrial Buildings).\n"
            f"- **Cost Overrun Estimator:** Random Forest Regressor (120 estimators) trained on 9 engineering features, achieving an MAE of **2.617%** on validation.\n"
            f"- **Schedule Delay Forecaster:** Gradient Boosting Regressor trained on duration horizon, scope complexity, and progress deficits (MAE 12.12 days slippage).\n"
            f"- **Feasibility Classifier:** Gradient Boosting Classifier predicting `Feasible`, `Borderline`, or `Not Feasible` outcomes with 56.1% empirical multi-class accuracy.\n"
            f"- **Top Empirical Feature Drivers:**\n"
            f"  1. Capital Expenditure Burn Intensity (14.7%)\n"
            f"  2. Approved Capital Outlay Scale (14.3%)\n"
            f"  3. Environmental & Clearance Footprint (14.0%)\n"
            f"  4. Project Schedule Horizon in Days (13.4%)\n"
            f"  5. Engineering Risk Assessment Score (13.4%)\n"
            f"  6. Resource Allocation Adequacy (11.9%)\n"
            f"  7. Stakeholder & Inter-Agency Priority (11.1%)"
        )
        return {
            "answer": answer,
            "intent": "ML_MODEL_INFO",
            "data": {
                "dataset": "Engineering_Cost_Feasibility_Dataset.csv",
                "sample_count": 3245,
                "cost_model": "Random Forest Regressor (MAE 2.617%)",
                "delay_model": "Gradient Boosting Regressor (MAE 12.12 days)",
                "feasibility_model": "Gradient Boosting Classifier (56.1% accuracy)"
            },
            "suggested_queries": [
                "Which projects have the highest risk?",
                "What are the major reasons for cost escalation?",
                "Which projects are experiencing delays?"
            ]
        }

    # General / Default response with live database statistics
    total = len(projects)
    high_r = sum(1 for p in projects if p.risk_level == "High")
    delayed = sum(1 for p in projects if p.status in ["Delayed", "Critical Attention"])
    active_alerts = db.query(Alert).filter(Alert.status == "New").count()

    answer = (
        f"I am connected directly to the **Infrastructure Project Monitoring Database**.\n\n"
        f"**Current System Portfolio Overview:**\n"
        f"- Total Registered Projects: **{total}**\n"
        f"- Projects in High Risk Category: **{high_r}**\n"
        f"- Projects Experiencing Schedule Delays: **{delayed}**\n"
        f"- Active Early Warning Alerts: **{active_alerts}**\n\n"
        f"You can ask me specific questions such as:\n"
        f"- *Which projects have the highest risk?*\n"
        f"- *Which projects are experiencing delays?*\n"
        f"- *What are the major reasons for cost escalation?*\n"
        f"- *Show projects with low physical progress*\n"
        f"- *Which projects require immediate attention?*\n"
        f"- *Summarize project INFRA-NHAI-01*"
    )
    return {
        "answer": answer,
        "intent": "GENERAL_PORTFOLIO_INFO",
        "data": None,
        "suggested_queries": [
            "Which projects have the highest risk?",
            "Which projects are experiencing delays?",
            "Which projects require immediate attention?",
            "What are the major reasons for cost escalation?"
        ]
    }

@router.post("/query", response_model=AssistantQueryResponse)
def ask_assistant(
    request: AssistantQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = process_assistant_query(request.query, request.project_id, db)
    return AssistantQueryResponse(
        answer=result["answer"],
        intent=result["intent"],
        data=result.get("data"),
        suggested_queries=result.get("suggested_queries", []),
        timestamp=datetime.utcnow()
    )
