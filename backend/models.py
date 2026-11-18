import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, 
    Text, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from backend.database import Base

class UserRole:
    ADMIN = "Administrator"
    GOV_OFFICER = "Government Monitoring Officer"
    PROJECT_MANAGER = "Project Manager"
    DEPT_OFFICER = "Department Officer"
    ALL = [ADMIN, GOV_OFFICER, PROJECT_MANAGER, DEPT_OFFICER]

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    code = Column(String(30), unique=True, nullable=False)
    ministry = Column(String(150), nullable=False)
    contact_email = Column(String(120), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="department")
    projects = relationship("Project", back_populates="department")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.PROJECT_MANAGER)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    department = relationship("Department", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")
    progress_updates = relationship("ProjectProgressUpdate", back_populates="reporter")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    sector = Column(String(100), index=True, nullable=False)
    ministry = Column(String(150), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    implementing_agency = Column(String(150), nullable=False)
    location_state = Column(String(100), nullable=False)
    location_district = Column(String(100), nullable=True)
    
    # Financial metrics (Values in Crores / Standard millions)
    approved_cost = Column(Float, nullable=False, default=0.0)
    revised_cost = Column(Float, nullable=False, default=0.0)
    actual_expenditure = Column(Float, nullable=False, default=0.0)
    
    # Schedule metrics
    planned_start_date = Column(Date, nullable=False)
    expected_completion_date = Column(Date, nullable=False)
    actual_completion_date = Column(Date, nullable=True)
    
    # Progress metrics (0 - 100)
    planned_progress = Column(Float, nullable=False, default=0.0)
    actual_progress = Column(Float, nullable=False, default=0.0)
    
    # Status & Risk
    status = Column(String(50), nullable=False, default="Ongoing")  # Ongoing, Completed, Delayed, Critical Attention
    risk_level = Column(String(20), nullable=False, default="Low")  # Low, Medium, High
    risk_score = Column(Float, nullable=False, default=0.0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="projects")
    milestones = relationship("ProjectMilestone", back_populates="project", cascade="all, delete-orphan")
    progress_updates = relationship("ProjectProgressUpdate", back_populates="project", cascade="all, delete-orphan")
    expenditures = relationship("ProjectExpenditure", back_populates="project", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="project", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="project", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="project", cascade="all, delete-orphan")

class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    planned_completion_date = Column(Date, nullable=False)
    actual_completion_date = Column(Date, nullable=True)
    status = Column(String(50), default="Pending")  # Completed, In Progress, Pending, Delayed
    weight_percentage = Column(Float, default=10.0)
    is_critical_path = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="milestones")

class ProjectProgressUpdate(Base):
    __tablename__ = "project_progress_updates"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    update_date = Column(Date, default=datetime.date.today, nullable=False)
    physical_progress = Column(Float, nullable=False)
    financial_progress = Column(Float, nullable=False)
    remarks = Column(Text, nullable=True)
    reported_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="progress_updates")
    reporter = relationship("User", back_populates="progress_updates")

class ProjectExpenditure(Base):
    __tablename__ = "project_expenditures"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    fiscal_year = Column(String(20), nullable=False)  # e.g. "2024-25"
    quarter = Column(String(10), nullable=False)      # Q1, Q2, Q3, Q4
    amount = Column(Float, nullable=False)
    expenditure_category = Column(String(100), nullable=False)  # Civil Works, Land Acquisition, Equipment, Clearance
    voucher_ref = Column(String(100), nullable=True)
    recorded_date = Column(Date, default=datetime.date.today, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="expenditures")

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    overall_risk_score = Column(Float, nullable=False)  # 0 to 100
    risk_level = Column(String(20), nullable=False)     # Low, Medium, High
    cost_escalation_score = Column(Float, default=0.0)
    schedule_delay_score = Column(Float, default=0.0)
    progress_deviation_score = Column(Float, default=0.0)
    milestone_delay_score = Column(Float, default=0.0)
    expenditure_anomaly_score = Column(Float, default=0.0)
    factors_json = Column(Text, nullable=True)          # JSON string explaining components
    assessment_date = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="risk_assessments")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    prediction_type = Column(String(50), nullable=False)  # "cost_overrun" or "schedule_delay"
    predicted_value = Column(Float, nullable=False)       # estimated overrun cost or delay days
    predicted_percentage = Column(Float, nullable=True)   # overrun % or delay %
    risk_level = Column(String(20), nullable=False)       # Low, Medium, High
    confidence_score = Column(Float, default=0.85)
    model_version = Column(String(50), default="v1.0-rf-ensemble")
    feature_importance_json = Column(Text, nullable=True)
    recommendations_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="predictions")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    alert_category = Column(String(80), nullable=False)  # Cost Escalation, Schedule Delay, Milestone Delay, etc.
    risk_level = Column(String(20), nullable=False)      # Low, Medium, High, Critical
    alert_date = Column(DateTime, default=datetime.datetime.utcnow)
    reason = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=False)
    status = Column(String(30), default="New")           # New, Under Review, Resolved
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    project = relationship("Project", back_populates="alerts")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="Alert")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
