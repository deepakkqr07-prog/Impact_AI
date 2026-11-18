import csv
import io
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Project, User, AuditLog, UserRole
from backend.auth import get_current_user, require_roles
from backend.routers.projects import refresh_project_analytics

router = APIRouter(prefix="/import", tags=["Data Import"])

REQUIRED_COLUMNS = [
    "project_code",
    "name",
    "sector",
    "ministry",
    "implementing_agency",
    "location_state",
    "approved_cost",
    "revised_cost",
    "actual_expenditure",
    "planned_start_date",
    "expected_completion_date",
    "planned_progress",
    "actual_progress",
    "status"
]

@router.get("/template")
def download_sample_template():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(REQUIRED_COLUMNS)
    # Write 2 demo sample rows clearly labelled
    writer.writerow([
        "INFRA-DEMO-01",
        "Coastal Expressway Marine Drive Link (DEMO DATA)",
        "Transportation & Highways",
        "Ministry of Road Transport and Highways",
        "National Highways Authority of India",
        "Gujarat",
        "3450.0",
        "3680.0",
        "1850.0",
        "2023-01-15",
        "2025-12-31",
        "75.0",
        "62.5",
        "Delayed"
    ])
    writer.writerow([
        "INFRA-DEMO-02",
        "Central Solar Transmission Feeder 400kV (DEMO DATA)",
        "Power & Renewable Energy",
        "Ministry of Power & New Renewable Energy",
        "Power Grid Corporation of India",
        "Madhya Pradesh",
        "1280.0",
        "1280.0",
        "920.0",
        "2023-06-01",
        "2025-06-30",
        "85.0",
        "82.0",
        "Ongoing"
    ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=infrastructure_projects_import_template.csv"}
    )

@router.post("/preview")
async def preview_csv_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are currently supported")

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except Exception:
        decoded = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    headers = [h.strip() for h in (reader.fieldnames or [])]

    # Validate header presence
    missing_headers = [col for col in REQUIRED_COLUMNS if col not in headers]
    if missing_headers:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns in CSV header: {', '.join(missing_headers)}"
        )

    valid_rows = []
    error_rows = []
    existing_codes = {p.project_code for p in db.query(Project.project_code).all()}

    row_index = 2  # 1-based, row 1 is header
    for raw in reader:
        row = {k.strip(): v.strip() if isinstance(v, str) else v for k, v in raw.items() if k}
        errors = []

        code = row.get("project_code")
        if not code:
            errors.append("project_code is required")
        elif code in existing_codes:
            errors.append(f"Project code '{code}' already exists in database")

        name = row.get("name")
        if not name:
            errors.append("name is required")

        # Validate numeric fields
        for num_field in ["approved_cost", "revised_cost", "actual_expenditure", "planned_progress", "actual_progress"]:
            val = row.get(num_field)
            try:
                f_val = float(val) if val else 0.0
                row[num_field] = f_val
                if num_field in ["planned_progress", "actual_progress"] and not (0 <= f_val <= 100):
                    errors.append(f"{num_field} must be between 0 and 100")
            except (ValueError, TypeError):
                errors.append(f"{num_field} must be a valid numeric value")

        # Validate dates
        for date_field in ["planned_start_date", "expected_completion_date"]:
            val = row.get(date_field)
            try:
                d_val = datetime.strptime(val, "%Y-%m-%d").date()
                row[date_field] = str(d_val)
            except (ValueError, TypeError):
                errors.append(f"{date_field} must be formatted as YYYY-MM-DD")

        if errors:
            error_rows.append({
                "row_number": row_index,
                "project_code": code or "N/A",
                "name": name or "N/A",
                "errors": errors
            })
        else:
            valid_rows.append(row)

        row_index += 1

    return {
        "filename": file.filename,
        "total_rows_found": len(valid_rows) + len(error_rows),
        "valid_rows_count": len(valid_rows),
        "error_rows_count": len(error_rows),
        "valid_preview": valid_rows[:10],
        "all_valid_rows": valid_rows,
        "errors": error_rows
    }

class ConfirmImportRequest(BaseModel):
    rows: List[Dict[str, Any]]

@router.post("/confirm")
def confirm_csv_import(
    request: ConfirmImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.GOV_OFFICER, UserRole.PROJECT_MANAGER]))
):
    if not request.rows:
        raise HTTPException(status_code=400, detail="No rows provided for import")

    imported_count = 0
    for row in request.rows:
        # Final safety check against duplicates
        if db.query(Project).filter(Project.project_code == row["project_code"]).first():
            continue

        p = Project(
            project_code=row["project_code"],
            name=row["name"],
            description=row.get("description", "Imported historical infrastructure record (Demo Dataset)"),
            sector=row.get("sector", "General Infrastructure"),
            ministry=row.get("ministry", "Ministry of Infrastructure"),
            implementing_agency=row.get("implementing_agency", "National Infrastructure Division"),
            location_state=row.get("location_state", "National"),
            location_district=row.get("location_district"),
            approved_cost=float(row["approved_cost"]),
            revised_cost=float(row.get("revised_cost") or row["approved_cost"]),
            actual_expenditure=float(row.get("actual_expenditure") or 0.0),
            planned_start_date=datetime.strptime(row["planned_start_date"], "%Y-%m-%d").date(),
            expected_completion_date=datetime.strptime(row["expected_completion_date"], "%Y-%m-%d").date(),
            planned_progress=float(row.get("planned_progress") or 0.0),
            actual_progress=float(row.get("actual_progress") or 0.0),
            status=row.get("status", "Ongoing")
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        # Trigger AI predictions and risk scoring
        refresh_project_analytics(p, db)
        imported_count += 1

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="IMPORT_PROJECTS",
        entity_type="Project",
        entity_id=f"count_{imported_count}",
        details=f"{imported_count} projects imported via CSV batch upload by {current_user.username}."
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "imported_count": imported_count,
        "message": f"Successfully imported and analyzed {imported_count} infrastructure project(s)."
    }
