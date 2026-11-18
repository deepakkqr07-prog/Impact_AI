import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Project, RiskAssessment, User, UserRole
from backend.auth import get_current_user, require_roles
from backend.ml.risk_engine import risk_engine

router = APIRouter(prefix="/risk", tags=["Risk Assessment"])

class RiskThresholdsUpdate(BaseModel):
    weight_cost: float
    weight_schedule: float
    weight_progress: float
    weight_milestone: float
    weight_expenditure: float

@router.get("/assessments")
def get_risk_assessments(
    risk_level: Optional[str] = None,
    sector: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Project)
    if sector and sector != "All":
        query = query.filter(Project.sector == sector)
    if risk_level and risk_level != "All":
        query = query.filter(Project.risk_level == risk_level)

    projects = query.all()
    results = []
    for p in projects:
        risk_data = risk_engine.calculate_risk(p)
        results.append({
            "project_id": p.id,
            "project_code": p.project_code,
            "project_name": p.name,
            "sector": p.sector,
            "status": p.status,
            "overall_risk_score": risk_data["overall_risk_score"],
            "risk_level": risk_data["risk_level"],
            "cost_escalation_score": risk_data["cost_escalation_score"],
            "schedule_delay_score": risk_data["schedule_delay_score"],
            "progress_deviation_score": risk_data["progress_deviation_score"],
            "milestone_delay_score": risk_data["milestone_delay_score"],
            "expenditure_anomaly_score": risk_data["expenditure_anomaly_score"],
            "factor_breakdown": risk_data["factor_breakdown"]
        })

    # Sort descending by overall risk score
    results.sort(key=lambda x: x["overall_risk_score"], reverse=True)
    return results

@router.get("/summary")
def get_risk_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    projects = db.query(Project).all()
    total = len(projects)
    if total == 0:
        return {"total": 0, "high": 0, "medium": 0, "low": 0}

    high = sum(1 for p in projects if p.risk_level == "High")
    medium = sum(1 for p in projects if p.risk_level == "Medium")
    low = sum(1 for p in projects if p.risk_level == "Low")

    return {
        "total_assessed": total,
        "high_risk_count": high,
        "high_risk_percentage": round((high / total) * 100, 1),
        "medium_risk_count": medium,
        "medium_risk_percentage": round((medium / total) * 100, 1),
        "low_risk_count": low,
        "low_risk_percentage": round((low / total) * 100, 1),
        "average_risk_score": round(sum(p.risk_score for p in projects) / total, 1)
    }

@router.get("/thresholds")
def get_risk_thresholds(current_user: User = Depends(get_current_user)):
    return {
        "weight_cost": risk_engine.w_cost,
        "weight_schedule": risk_engine.w_schedule,
        "weight_progress": risk_engine.w_progress,
        "weight_milestone": risk_engine.w_milestone,
        "weight_expenditure": risk_engine.w_expenditure,
        "high_risk_threshold": 65.0,
        "medium_risk_threshold": 35.0
    }

@router.put("/thresholds")
def update_risk_thresholds(
    thresholds: RiskThresholdsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    # Update engine weights
    risk_engine.w_cost = thresholds.weight_cost
    risk_engine.w_schedule = thresholds.weight_schedule
    risk_engine.w_progress = thresholds.weight_progress
    risk_engine.w_milestone = thresholds.weight_milestone
    risk_engine.w_expenditure = thresholds.weight_expenditure

    # Recalculate all projects with new calibrated weights
    projects = db.query(Project).all()
    for p in projects:
        res = risk_engine.calculate_risk(p)
        p.risk_score = res["overall_risk_score"]
        p.risk_level = res["risk_level"]
    db.commit()

    return {"message": "Risk weights updated and all project risk scores recalibrated successfully"}
