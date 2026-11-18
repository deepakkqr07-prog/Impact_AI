import io
import csv
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import Project, Department, ProjectExpenditure, Alert, RiskAssessment, User
from backend.auth import get_current_user
from backend.ml.cost_overrun_model import cost_model

router = APIRouter(prefix="/analytics", tags=["Analytics & Reports"])

@router.get("/dashboard-summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(Project).all()
    total_projects = len(projects)
    if total_projects == 0:
        return {
            "total_projects": 0, "ongoing_projects": 0, "completed_projects": 0,
            "delayed_projects": 0, "high_risk_projects": 0, "total_approved_cost": 0,
            "total_revised_cost": 0, "total_actual_expenditure": 0, "total_predicted_overrun": 0,
            "avg_physical_progress": 0, "critical_attention_count": 0, "new_alerts_count": 0
        }

    ongoing = sum(1 for p in projects if p.status == "Ongoing")
    completed = sum(1 for p in projects if p.status == "Completed")
    delayed = sum(1 for p in projects if p.status in ["Delayed", "Critical Attention"])
    high_risk = sum(1 for p in projects if p.risk_level == "High")
    critical_attention = sum(1 for p in projects if p.status == "Critical Attention" or p.risk_score >= 70.0)

    total_approved = sum(float(p.approved_cost or 0) for p in projects)
    total_revised = sum(float(p.revised_cost or 0) for p in projects)
    total_spent = sum(float(p.actual_expenditure or 0) for p in projects)
    
    # Calculate predicted overruns across all projects using ML model
    total_predicted_overrun = sum(cost_model.predict(p)["predicted_cost_overrun"] for p in projects)
    avg_progress = sum(float(p.actual_progress or 0) for p in projects) / total_projects

    new_alerts = db.query(Alert).filter(Alert.status == "New").count()

    return {
        "total_projects": total_projects,
        "ongoing_projects": ongoing,
        "completed_projects": completed,
        "delayed_projects": delayed,
        "high_risk_projects": high_risk,
        "critical_attention_count": critical_attention,
        "total_approved_cost": round(total_approved, 2),
        "total_revised_cost": round(total_revised, 2),
        "total_actual_expenditure": round(total_spent, 2),
        "total_predicted_overrun": round(total_predicted_overrun, 2),
        "avg_physical_progress": round(avg_progress, 1),
        "new_alerts_count": new_alerts
    }

@router.get("/charts")
def get_dashboard_charts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(Project).all()

    # 1. Status Distribution
    status_counts = {}
    for p in projects:
        st = p.status
        status_counts[st] = status_counts.get(st, 0) + 1
    status_distribution = [{"name": k, "value": v} for k, v in status_counts.items()]

    # 2. Sector-wise Distribution & Financials
    sector_map = {}
    for p in projects:
        sec = p.sector
        if sec not in sector_map:
            sector_map[sec] = {"sector": sec, "count": 0, "approved": 0.0, "spent": 0.0, "avg_progress": 0.0}
        sector_map[sec]["count"] += 1
        sector_map[sec]["approved"] += float(p.approved_cost or 0)
        sector_map[sec]["spent"] += float(p.actual_expenditure or 0)
        sector_map[sec]["avg_progress"] += float(p.actual_progress or 0)

    for k in sector_map:
        sector_map[k]["avg_progress"] = round(sector_map[k]["avg_progress"] / sector_map[k]["count"], 1)
        sector_map[k]["approved"] = round(sector_map[k]["approved"], 2)
        sector_map[k]["spent"] = round(sector_map[k]["spent"], 2)
    sector_data = list(sector_map.values())

    # 3. Budget vs Actual vs Revised
    budget_comparison = []
    for p in projects[:7]:  # Sample top projects for clear bar chart
        budget_comparison.append({
            "code": p.project_code,
            "name": p.name[:24] + "..." if len(p.name) > 24 else p.name,
            "approved": round(float(p.approved_cost or 0), 1),
            "revised": round(float(p.revised_cost or 0), 1),
            "actual": round(float(p.actual_expenditure or 0), 1)
        })

    # 4. Planned vs Actual Progress
    progress_comparison = []
    for p in projects[:8]:
        progress_comparison.append({
            "code": p.project_code,
            "name": p.name[:20] + "..." if len(p.name) > 20 else p.name,
            "planned": round(float(p.planned_progress or 0), 1),
            "actual": round(float(p.actual_progress or 0), 1),
            "gap": round(max(0, float(p.planned_progress or 0) - float(p.actual_progress or 0)), 1)
        })

    # 5. Risk Distribution
    risk_counts = {"Low": 0, "Medium": 0, "High": 0}
    for p in projects:
        lvl = p.risk_level if p.risk_level in risk_counts else "Low"
        risk_counts[lvl] += 1
    risk_distribution = [{"name": k, "value": v} for k, v in risk_counts.items()]

    # 6. Monthly / Quarterly Performance Trend
    expenditures = db.query(
        ProjectExpenditure.fiscal_year,
        ProjectExpenditure.quarter,
        func.sum(ProjectExpenditure.amount).label("total_amount")
    ).group_by(ProjectExpenditure.fiscal_year, ProjectExpenditure.quarter).all()

    quarterly_trend = []
    for exp in expenditures:
        quarterly_trend.append({
            "period": f"{exp.fiscal_year} {exp.quarter}",
            "expenditure": round(float(exp.total_amount), 2)
        })

    return {
        "status_distribution": status_distribution,
        "sector_data": sector_data,
        "budget_comparison": budget_comparison,
        "progress_comparison": progress_comparison,
        "risk_distribution": risk_distribution,
        "quarterly_trend": quarterly_trend
    }

@router.get("/reports")
def get_reports_data(
    sector: Optional[str] = None,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Project)
    if sector and sector != "All":
        query = query.filter(Project.sector == sector)
    if risk_level and risk_level != "All":
        query = query.filter(Project.risk_level == risk_level)
    if status and status != "All":
        query = query.filter(Project.status == status)

    projects = query.all()
    rows = []
    for p in projects:
        c_pred = cost_model.predict(p)
        rows.append({
            "id": p.id,
            "project_code": p.project_code,
            "name": p.name,
            "sector": p.sector,
            "ministry": p.ministry,
            "implementing_agency": p.implementing_agency,
            "location_state": p.location_state,
            "approved_cost": float(p.approved_cost or 0),
            "revised_cost": float(p.revised_cost or 0),
            "actual_expenditure": float(p.actual_expenditure or 0),
            "planned_start_date": str(p.planned_start_date),
            "expected_completion_date": str(p.expected_completion_date),
            "planned_progress": float(p.planned_progress or 0),
            "actual_progress": float(p.actual_progress or 0),
            "status": p.status,
            "risk_level": p.risk_level,
            "risk_score": float(p.risk_score or 0),
            "predicted_overrun": c_pred["predicted_cost_overrun"],
            "predicted_overrun_pct": c_pred["predicted_overrun_percentage"]
        })

    return rows

@router.get("/export/csv")
def export_projects_csv(
    sector: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Project)
    if sector and sector != "All":
        query = query.filter(Project.sector == sector)
    if risk_level and risk_level != "All":
        query = query.filter(Project.risk_level == risk_level)

    projects = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Project Code", "Project Name", "Sector", "Ministry", "Implementing Agency",
        "State", "Approved Cost (Cr)", "Revised Cost (Cr)", "Actual Spent (Cr)",
        "Planned Start", "Expected Completion", "Planned %", "Actual %",
        "Status", "Risk Level", "Risk Score", "Predicted Overrun (Cr)"
    ])

    for p in projects:
        c_pred = cost_model.predict(p)
        writer.writerow([
            p.project_code,
            p.name,
            p.sector,
            p.ministry,
            p.implementing_agency,
            p.location_state,
            p.approved_cost,
            p.revised_cost,
            p.actual_expenditure,
            p.planned_start_date,
            p.expected_completion_date,
            p.planned_progress,
            p.actual_progress,
            p.status,
            p.risk_level,
            p.risk_score,
            c_pred["predicted_cost_overrun"]
        ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=infrastructure_projects_report.csv"}
    )
