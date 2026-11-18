import json
from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.database import get_db
from backend.models import (
    Project, ProjectMilestone, ProjectProgressUpdate, ProjectExpenditure,
    RiskAssessment, Prediction, Alert, AuditLog, User, UserRole
)
from backend.schemas import (
    ProjectCreate, ProjectUpdate, ProjectOut, ProjectDetailOut,
    MilestoneCreate, MilestoneOut, ProgressUpdateCreate, ProgressUpdateOut,
    ExpenditureCreate, ExpenditureOut
)
from backend.auth import get_current_user, require_roles
from backend.ml.cost_overrun_model import cost_model
from backend.ml.delay_prediction_model import delay_model
from backend.ml.risk_engine import risk_engine
from backend.ml.alert_detector import alert_detector

router = APIRouter(prefix="/projects", tags=["Projects"])

def refresh_project_analytics(project: Project, db: Session):
    """Recalculates risk score and alerts whenever project attributes change."""
    # 1. Update Risk
    risk_data = risk_engine.calculate_risk(project)
    project.risk_score = risk_data["overall_risk_score"]
    project.risk_level = risk_data["risk_level"]

    # Save risk assessment record
    assessment = RiskAssessment(
        project_id=project.id,
        overall_risk_score=risk_data["overall_risk_score"],
        risk_level=risk_data["risk_level"],
        cost_escalation_score=risk_data["cost_escalation_score"],
        schedule_delay_score=risk_data["schedule_delay_score"],
        progress_deviation_score=risk_data["progress_deviation_score"],
        milestone_delay_score=risk_data["milestone_delay_score"],
        expenditure_anomaly_score=risk_data["expenditure_anomaly_score"],
        factors_json=json.dumps(risk_data["factor_breakdown"])
    )
    db.add(assessment)

    # 2. Update ML Predictions
    c_pred = cost_model.predict(project)
    cost_prediction = Prediction(
        project_id=project.id,
        prediction_type="cost_overrun",
        predicted_value=c_pred["predicted_cost_overrun"],
        predicted_percentage=c_pred["predicted_overrun_percentage"],
        risk_level=c_pred["risk_level"],
        confidence_score=c_pred["confidence_score"],
        feature_importance_json=json.dumps(c_pred["feature_importances"]),
        recommendations_json=json.dumps(c_pred["contributing_factors"])
    )
    db.add(cost_prediction)

    d_pred = delay_model.predict(project)
    delay_prediction = Prediction(
        project_id=project.id,
        prediction_type="schedule_delay",
        predicted_value=d_pred["predicted_delay_days"],
        predicted_percentage=d_pred["delay_percentage"],
        risk_level=d_pred["delay_risk"],
        confidence_score=0.86,
        recommendations_json=json.dumps(d_pred["recommended_actions"])
    )
    db.add(delay_prediction)

    # 3. Check for New Early Warning Alerts
    new_alerts = alert_detector.evaluate_project(project)
    for a in new_alerts:
        # Avoid duplicate pending alerts
        existing = db.query(Alert).filter(
            Alert.project_id == project.id,
            Alert.alert_category == a["alert_category"],
            Alert.status == "New"
        ).first()
        if not existing:
            alert_obj = Alert(
                project_id=project.id,
                alert_category=a["alert_category"],
                risk_level=a["risk_level"],
                reason=a["reason"],
                suggested_action=a["suggested_action"],
                status="New"
            )
            db.add(alert_obj)

    db.commit()
    db.refresh(project)

@router.get("", response_model=List[ProjectOut])
def get_projects(
    search: Optional[str] = None,
    sector: Optional[str] = None,
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Project)

    # Role-based filtering: Department Officers only see their department
    if current_user.role == UserRole.DEPT_OFFICER and current_user.department_id:
        query = query.filter(Project.department_id == current_user.department_id)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Project.name.ilike(term),
                Project.project_code.ilike(term),
                Project.implementing_agency.ilike(term),
                Project.location_state.ilike(term)
            )
        )
    if sector and sector != "All":
        query = query.filter(Project.sector == sector)
    if department_id:
        query = query.filter(Project.department_id == department_id)
    if status and status != "All":
        query = query.filter(Project.status == status)
    if risk_level and risk_level != "All":
        query = query.filter(Project.risk_level == risk_level)

    return query.order_by(Project.created_at.desc()).all()

@router.get("/{project_id}", response_model=ProjectDetailOut)
def get_project_detail(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check department officer access
    if current_user.role == UserRole.DEPT_OFFICER and current_user.department_id:
        if project.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="Not authorized to view other department's projects")

    return project

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Admin, Gov Officer, and Project Manager can create projects
    if current_user.role not in [UserRole.ADMIN, UserRole.GOV_OFFICER, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions to create projects")

    # Check for existing code
    existing = db.query(Project).filter(Project.project_code == project_in.project_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Project with code {project_in.project_code} already exists")

    # If revised cost is 0, default to approved cost
    data = project_in.dict()
    if not data.get("revised_cost"):
        data["revised_cost"] = data["approved_cost"]

    project = Project(**data)
    db.add(project)
    db.commit()
    db.refresh(project)

    # Initial risk and prediction run
    refresh_project_analytics(project, db)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_PROJECT",
        entity_type="Project",
        entity_id=str(project.id),
        details=f"Project {project.project_code} ({project.name}) created by {current_user.username}."
    )
    db.add(audit)
    db.commit()

    return project

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.role == UserRole.DEPT_OFFICER and current_user.department_id != project.department_id:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = project_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)

    # Recalculate analytics
    refresh_project_analytics(project, db)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_PROJECT",
        entity_type="Project",
        entity_id=str(project.id),
        details=f"Project {project.project_code} updated by {current_user.username}."
    )
    db.add(audit)
    db.commit()

    return project

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.GOV_OFFICER]))
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    p_code = project.project_code
    p_name = project.name
    db.delete(project)
    db.commit()

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="DELETE_PROJECT",
        entity_type="Project",
        entity_id=str(project_id),
        details=f"Project {p_code} ({p_name}) deleted by {current_user.username}."
    )
    db.add(audit)
    db.commit()

    return {"message": f"Project {p_code} deleted successfully"}

# ----------------- Milestones Sub-resource -----------------
@router.post("/{project_id}/milestones", response_model=MilestoneOut)
def add_milestone(
    project_id: int,
    milestone_in: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    milestone = ProjectMilestone(
        project_id=project_id,
        **milestone_in.dict()
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)

    # Refresh analytics with updated milestone count
    refresh_project_analytics(project, db)
    return milestone

# ----------------- Expenditures Sub-resource -----------------
@router.post("/{project_id}/expenditures", response_model=ExpenditureOut)
def add_expenditure(
    project_id: int,
    exp_in: ExpenditureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    data = exp_in.dict()
    if not data.get("recorded_date"):
        data["recorded_date"] = date.today()

    exp = ProjectExpenditure(
        project_id=project_id,
        **data
    )
    db.add(exp)
    
    # Increment actual expenditure on project
    project.actual_expenditure = float(project.actual_expenditure or 0.0) + exp.amount
    db.commit()
    db.refresh(exp)

    refresh_project_analytics(project, db)
    return exp

# ----------------- Progress Updates Sub-resource -----------------
@router.post("/{project_id}/progress", response_model=ProgressUpdateOut)
def add_progress_update(
    project_id: int,
    prog_in: ProgressUpdateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pup = ProjectProgressUpdate(
        project_id=project_id,
        physical_progress=prog_in.physical_progress,
        financial_progress=prog_in.financial_progress,
        remarks=prog_in.remarks,
        reported_by_id=current_user.id
    )
    db.add(pup)

    # Update project physical progress
    project.actual_progress = prog_in.physical_progress
    db.commit()
    db.refresh(pup)

    refresh_project_analytics(project, db)
    return pup
