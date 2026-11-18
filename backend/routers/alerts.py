from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Alert, Project, User, AuditLog, UserRole
from backend.schemas import AlertOut, AlertStatusUpdate
from backend.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["Early Warning Alerts"])

@router.get("", response_model=List[AlertOut])
def get_alerts(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    category: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert).join(Project, Alert.project_id == Project.id)

    if current_user.role == UserRole.DEPT_OFFICER and current_user.department_id:
        query = query.filter(Project.department_id == current_user.department_id)

    if status and status != "All":
        query = query.filter(Alert.status == status)
    if risk_level and risk_level != "All":
        query = query.filter(Alert.risk_level == risk_level)
    if category and category != "All":
        query = query.filter(Alert.alert_category == category)
    if project_id:
        query = query.filter(Alert.project_id == project_id)

    alerts = query.order_by(Alert.alert_date.desc()).all()

    # Attach project name for frontend display
    output = []
    for a in alerts:
        a_dict = {
            "id": a.id,
            "project_id": a.project_id,
            "project_name": a.project.name if a.project else "Unknown Project",
            "alert_category": a.alert_category,
            "risk_level": a.risk_level,
            "alert_date": a.alert_date,
            "reason": a.reason,
            "suggested_action": a.suggested_action,
            "status": a.status,
            "resolved_at": a.resolved_at,
            "resolution_notes": a.resolution_notes
        }
        output.append(AlertOut(**a_dict))

    return output

@router.put("/{alert_id}/status", response_model=AlertOut)
def update_alert_status(
    alert_id: int,
    status_update: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if status_update.status not in ["New", "Under Review", "Resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be New, Under Review, or Resolved")

    old_status = alert.status
    alert.status = status_update.status
    alert.resolution_notes = status_update.resolution_notes

    if status_update.status == "Resolved":
        alert.resolved_at = datetime.utcnow()
        alert.resolved_by_id = current_user.id
    else:
        alert.resolved_at = None

    db.commit()
    db.refresh(alert)

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        action="ALERT_STATUS_UPDATE",
        entity_type="Alert",
        entity_id=str(alert.id),
        details=f"Alert #{alert.id} status changed from {old_status} to {alert.status} by {current_user.username}."
    )
    db.add(audit)
    db.commit()

    return AlertOut(
        id=alert.id,
        project_id=alert.project_id,
        project_name=alert.project.name if alert.project else "Unknown Project",
        alert_category=alert.alert_category,
        risk_level=alert.risk_level,
        alert_date=alert.alert_date,
        reason=alert.reason,
        suggested_action=alert.suggested_action,
        status=alert.status,
        resolved_at=alert.resolved_at,
        resolution_notes=alert.resolution_notes
    )
