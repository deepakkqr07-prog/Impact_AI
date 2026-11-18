from typing import List, Optional, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field

# ----------------- AUTH & USER -----------------
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str = "Project Manager"
    department_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    department_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdateRole(BaseModel):
    role: str
    is_active: Optional[bool] = None

# ----------------- DEPARTMENT -----------------
class DepartmentOut(BaseModel):
    id: int
    name: str
    code: str
    ministry: str
    contact_email: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- MILESTONES -----------------
class MilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    planned_completion_date: date
    actual_completion_date: Optional[date] = None
    status: str = "Pending"
    weight_percentage: float = 10.0
    is_critical_path: bool = False

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneOut(MilestoneBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- PROGRESS & EXPENDITURE -----------------
class ProgressUpdateCreate(BaseModel):
    physical_progress: float
    financial_progress: float
    remarks: Optional[str] = None

class ProgressUpdateOut(BaseModel):
    id: int
    project_id: int
    update_date: date
    physical_progress: float
    financial_progress: float
    remarks: Optional[str] = None
    reported_by_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenditureCreate(BaseModel):
    fiscal_year: str
    quarter: str
    amount: float
    expenditure_category: str
    voucher_ref: Optional[str] = None
    recorded_date: Optional[date] = None

class ExpenditureOut(BaseModel):
    id: int
    project_id: int
    fiscal_year: str
    quarter: str
    amount: float
    expenditure_category: str
    voucher_ref: Optional[str] = None
    recorded_date: date
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- PROJECT -----------------
class ProjectBase(BaseModel):
    project_code: str
    name: str
    description: Optional[str] = None
    sector: str
    ministry: str
    department_id: Optional[int] = None
    implementing_agency: str
    location_state: str
    location_district: Optional[str] = None
    approved_cost: float = Field(..., ge=0)
    revised_cost: float = Field(..., ge=0)
    actual_expenditure: float = Field(0.0, ge=0)
    planned_start_date: date
    expected_completion_date: date
    actual_completion_date: Optional[date] = None
    planned_progress: float = Field(0.0, ge=0, le=100)
    actual_progress: float = Field(0.0, ge=0, le=100)
    status: str = "Ongoing"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sector: Optional[str] = None
    ministry: Optional[str] = None
    department_id: Optional[int] = None
    implementing_agency: Optional[str] = None
    location_state: Optional[str] = None
    location_district: Optional[str] = None
    approved_cost: Optional[float] = None
    revised_cost: Optional[float] = None
    actual_expenditure: Optional[float] = None
    planned_start_date: Optional[date] = None
    expected_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    planned_progress: Optional[float] = None
    actual_progress: Optional[float] = None
    status: Optional[str] = None

class ProjectOut(ProjectBase):
    id: int
    risk_level: str
    risk_score: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- PREDICTIONS -----------------
class PredictionOut(BaseModel):
    id: int
    project_id: int
    prediction_type: str
    predicted_value: float
    predicted_percentage: Optional[float] = None
    risk_level: str
    confidence_score: float
    model_version: str
    feature_importance_json: Optional[str] = None
    recommendations_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- RISK ASSESSMENT -----------------
class RiskAssessmentOut(BaseModel):
    id: int
    project_id: int
    overall_risk_score: float
    risk_level: str
    cost_escalation_score: float
    schedule_delay_score: float
    progress_deviation_score: float
    milestone_delay_score: float
    expenditure_anomaly_score: float
    factors_json: Optional[str] = None
    assessment_date: datetime

    class Config:
        from_attributes = True

# ----------------- ALERTS -----------------
class AlertBase(BaseModel):
    alert_category: str
    risk_level: str
    reason: str
    suggested_action: str

class AlertCreate(AlertBase):
    project_id: int

class AlertStatusUpdate(BaseModel):
    status: str  # "New", "Under Review", "Resolved"
    resolution_notes: Optional[str] = None

class AlertOut(AlertBase):
    id: int
    project_id: int
    project_name: Optional[str] = None
    alert_date: datetime
    status: str
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- DETAILED PROJECT -----------------
class ProjectDetailOut(ProjectOut):
    milestones: List[MilestoneOut] = []
    progress_updates: List[ProgressUpdateOut] = []
    expenditures: List[ExpenditureOut] = []
    risk_assessments: List[RiskAssessmentOut] = []
    predictions: List[PredictionOut] = []
    alerts: List[AlertOut] = []

# ----------------- DASHBOARD SUMMARY -----------------
class DashboardSummary(BaseModel):
    total_projects: int
    ongoing_projects: int
    completed_projects: int
    delayed_projects: int
    high_risk_projects: int
    medium_risk_projects: int
    low_risk_projects: int
    total_approved_cost: float
    total_revised_cost: float
    total_actual_expenditure: float
    total_predicted_overrun: float
    avg_physical_progress: float
    critical_alerts_count: int
    new_alerts_count: int

# ----------------- ASSISTANT -----------------
class AssistantQueryRequest(BaseModel):
    query: str
    project_id: Optional[int] = None

class AssistantQueryResponse(BaseModel):
    answer: str
    intent: str
    data: Optional[Any] = None
    suggested_queries: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
