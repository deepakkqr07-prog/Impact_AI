import datetime
import json
from datetime import date, timedelta
from sqlalchemy.orm import Session
from backend.auth import get_password_hash
from backend.models import (
    User, UserRole, Department, Project, ProjectMilestone, 
    ProjectExpenditure, ProjectProgressUpdate, RiskAssessment,
    Prediction, Alert
)
from backend.ml.cost_overrun_model import cost_model
from backend.ml.delay_prediction_model import delay_model
from backend.ml.risk_engine import risk_engine
from backend.ml.alert_detector import alert_detector

def seed_database(db: Session):
    # Check if already seeded
    if db.query(User).count() > 0:
        return

    print("Seeding initial infrastructure departments and roles...")
    
    # 1. Departments
    dept_highway = Department(
        name="National Highways & Logistics",
        code="NHAI-RD",
        ministry="Ministry of Road Transport and Highways",
        contact_email="highways.monitoring@gov.in",
        description="National arterial expressways, economic corridors and port connectivity routes."
    )
    dept_railways = Department(
        name="Rail Infrastructure & Dedicated Freight",
        code="MOR-DFCC",
        ministry="Ministry of Railways",
        contact_email="rail.projects@gov.in",
        description="High-speed rail corridors, track doubling, dedicated freight lines."
    )
    dept_power = Department(
        name="Renewable Power & Grid Transmission",
        code="MNRE-PWR",
        ministry="Ministry of Power & New Renewable Energy",
        contact_email="grid.monitoring@gov.in",
        description="Ultra-mega solar parks, green energy corridors and hydro-pumped storage."
    )
    dept_urban = Department(
        name="Urban Transit & Water Infra",
        code="MOHUA-URB",
        ministry="Ministry of Housing and Urban Affairs",
        contact_email="urban.infra@gov.in",
        description="Metro rail transit networks, smart city stormwater drainage, sewage treatment."
    )
    dept_ports = Department(
        name="Maritime & Inland Waterways",
        code="MSW-SAGAR",
        ministry="Ministry of Ports, Shipping and Waterways",
        contact_email="sagarmala.cell@gov.in",
        description="Deepwater terminal expansion, inland national waterways and logistics hubs."
    )
    
    db.add_all([dept_highway, dept_railways, dept_power, dept_urban, dept_ports])
    db.commit()

    # 2. Users (all 4 roles from specification)
    users = [
        User(
            username="admin",
            email="admin.infra@gov.in",
            full_name="Rajesh Verma (System Administrator)",
            hashed_password=get_password_hash("Admin@123"),
            role=UserRole.ADMIN,
            department_id=dept_highway.id,
            is_active=True
        ),
        User(
            username="gov_officer",
            email="officer.niti@gov.in",
            full_name="Dr. Sunita Deshmukh (Monitoring Officer)",
            hashed_password=get_password_hash("Gov@123"),
            role=UserRole.GOV_OFFICER,
            department_id=dept_railways.id,
            is_active=True
        ),
        User(
            username="pm_sharma",
            email="alok.sharma@nhai.gov.in",
            full_name="Alok Sharma (Project Manager)",
            hashed_password=get_password_hash("Pm@123"),
            role=UserRole.PROJECT_MANAGER,
            department_id=dept_highway.id,
            is_active=True
        ),
        User(
            username="dept_officer",
            email="dept.officer@mohua.gov.in",
            full_name="Pooja Kulkarni (Department Officer)",
            hashed_password=get_password_hash("Dept@123"),
            role=UserRole.DEPT_OFFICER,
            department_id=dept_urban.id,
            is_active=True
        )
    ]
    db.add_all(users)
    db.commit()

    # 3. Comprehensive Sample Infrastructure Projects (10 Diverse Projects)
    today = date.today()
    projects_data = [
        {
            "code": "INFRA-NHAI-01",
            "name": "Delhi-Mumbai Expressway Spur (Package 4)",
            "desc": "Eight-lane access-controlled greenfield expressway link connecting multimodal logistics parks with smart tolling.",
            "sector": "Transportation & Highways",
            "ministry": "Ministry of Road Transport and Highways",
            "dept_id": dept_highway.id,
            "agency": "National Highways Authority of India (NHAI)",
            "state": "Rajasthan",
            "district": "Dausa",
            "approved_cost": 4200.0,
            "revised_cost": 4950.0,
            "actual_spent": 3820.0,
            "start": today - timedelta(days=650),
            "end": today + timedelta(days=180),
            "planned_p": 85.0,
            "actual_p": 68.0,
            "status": "Delayed"
        },
        {
            "code": "INFRA-DFCC-02",
            "name": "Western Dedicated Freight Corridor (Vaitarna-JNPT Section)",
            "desc": "Electrified double-line freight rail track designed for 25-tonne axle load and double-stack container operations.",
            "sector": "Railways & Metros",
            "ministry": "Ministry of Railways",
            "dept_id": dept_railways.id,
            "agency": "Dedicated Freight Corridor Corp (DFCCIL)",
            "state": "Maharashtra",
            "district": "Palghar",
            "approved_cost": 7450.0,
            "revised_cost": 9180.0,
            "actual_spent": 7650.0,
            "start": today - timedelta(days=900),
            "end": today - timedelta(days=45),  # Overdue
            "planned_p": 100.0,
            "actual_p": 79.5,
            "status": "Critical Attention"
        },
        {
            "code": "INFRA-SOLAR-03",
            "name": "Bhadla Ultra-Mega Solar Park Phase IV",
            "desc": "1,200 MW grid-connected photovoltaic solar park with robotic dry-cleaning arrays and 220kV pooling substations.",
            "sector": "Power & Renewable Energy",
            "ministry": "Ministry of Power & New Renewable Energy",
            "dept_id": dept_power.id,
            "agency": "Solar Energy Corporation of India (SECI)",
            "state": "Rajasthan",
            "district": "Jodhpur",
            "approved_cost": 3100.0,
            "revised_cost": 3120.0,
            "actual_spent": 2790.0,
            "start": today - timedelta(days=480),
            "end": today + timedelta(days=120),
            "planned_p": 90.0,
            "actual_p": 88.0,
            "status": "Ongoing"
        },
        {
            "code": "INFRA-METRO-04",
            "name": "Bengaluru Metro Phase 2A (Silk Board to KR Puram Outer Ring Road)",
            "desc": "19.8 km elevated metro viaduct with 13 elevated stations running along Bengaluru's major technology corridor.",
            "sector": "Urban Infrastructure & Water",
            "ministry": "Ministry of Housing and Urban Affairs",
            "dept_id": dept_urban.id,
            "agency": "Bangalore Metro Rail Corporation (BMRCL)",
            "state": "Karnataka",
            "district": "Bengaluru Urban",
            "approved_cost": 5600.0,
            "revised_cost": 6450.0,
            "actual_spent": 3980.0,
            "start": today - timedelta(days=580),
            "end": today + timedelta(days=320),
            "planned_p": 72.0,
            "actual_p": 51.0,
            "status": "Delayed"
        },
        {
            "code": "INFRA-PORT-05",
            "name": "Vadhavan Mega Deepwater Port Terminal Development",
            "desc": "All-weather deep draft container port with 18-meter natural draft capable of handling 24,000 TEU container vessels.",
            "sector": "Ports & Shipping",
            "ministry": "Ministry of Ports, Shipping and Waterways",
            "dept_id": dept_ports.id,
            "agency": "Jawaharlal Nehru Port Authority (JNPA)",
            "state": "Maharashtra",
            "district": "Palghar",
            "approved_cost": 16200.0,
            "revised_cost": 16200.0,
            "actual_spent": 2450.0,
            "start": today - timedelta(days=220),
            "end": today + timedelta(days=1200),
            "planned_p": 22.0,
            "actual_p": 21.0,
            "status": "Ongoing"
        },
        {
            "code": "INFRA-AIRPORT-06",
            "name": "Noida International Airport (Jewar Phase 1)",
            "desc": "Single-runway greenfield international gateway with integrated cargo terminal and multimodal passenger interchange.",
            "sector": "Civil Aviation & Airports",
            "ministry": "Ministry of Civil Aviation",
            "dept_id": dept_highway.id,
            "agency": "Yamuna International Airport Pvt Ltd (YIAPL)",
            "state": "Uttar Pradesh",
            "district": "Gautam Buddha Nagar",
            "approved_cost": 5730.0,
            "revised_cost": 6150.0,
            "actual_spent": 5420.0,
            "start": today - timedelta(days=700),
            "end": today + timedelta(days=90),
            "planned_p": 94.0,
            "actual_p": 91.5,
            "status": "Ongoing"
        },
        {
            "code": "INFRA-WATER-07",
            "name": "Kaveri-Vaigai River Basin Modernization & Canal Lining",
            "desc": "Concrete lining of main distribution canals and telemetry automation across 180 km command area.",
            "sector": "Urban Infrastructure & Water",
            "ministry": "Ministry of Jal Shakti",
            "dept_id": dept_urban.id,
            "agency": "Water Resources Department (WRD)",
            "state": "Tamil Nadu",
            "district": "Thanjavur",
            "approved_cost": 1850.0,
            "revised_cost": 2350.0,
            "actual_spent": 1920.0,
            "start": today - timedelta(days=400),
            "end": today + timedelta(days=150),
            "planned_p": 78.0,
            "actual_p": 59.0,
            "status": "Delayed"
        },
        {
            "code": "INFRA-POWER-08",
            "name": "Inter-Regional High Voltage Direct Current (HVDC) Link (Raigarh-Pugalur)",
            "desc": "800 kV, 6,000 MW bi-pole HVDC transmission system transferring bulk thermal and solar power between Central and Southern grids.",
            "sector": "Power & Renewable Energy",
            "ministry": "Ministry of Power & New Renewable Energy",
            "dept_id": dept_power.id,
            "agency": "Power Grid Corporation of India (POWERGRID)",
            "state": "Chhattisgarh to Tamil Nadu",
            "district": "Multi-State",
            "approved_cost": 9200.0,
            "revised_cost": 9200.0,
            "actual_spent": 9180.0,
            "start": today - timedelta(days=1200),
            "end": today - timedelta(days=100),
            "planned_p": 100.0,
            "actual_p": 100.0,
            "status": "Completed"
        },
        {
            "code": "INFRA-TELE-09",
            "name": "BharatNet Phase III Fiber to Gram Panchayats (Odisha & Jharkhand)",
            "desc": "Underground optical fiber cable rollout across 12,500 rural village administrative clusters with GPON access nodes.",
            "sector": "Telecommunications",
            "ministry": "Ministry of Communications",
            "dept_id": dept_urban.id,
            "agency": "Bharat Broadband Network Limited (BBNL)",
            "state": "Odisha",
            "district": "Mayurbhanj",
            "approved_cost": 2900.0,
            "revised_cost": 3480.0,
            "actual_spent": 2650.0,
            "start": today - timedelta(days=500),
            "end": today + timedelta(days=200),
            "planned_p": 80.0,
            "actual_p": 62.0,
            "status": "Delayed"
        },
        {
            "code": "INFRA-RAIL-10",
            "name": "Rishikesh-Karnaprayag Mountain Railway Link (Tunnel Package 3)",
            "desc": "Himalayan rail route spanning 125 km through fragile terrain with 16 deep tunnels and 12 major bridges.",
            "sector": "Railways & Metros",
            "ministry": "Ministry of Railways",
            "dept_id": dept_railways.id,
            "agency": "Rail Vikas Nigam Limited (RVNL)",
            "state": "Uttarakhand",
            "district": "Rudraprayag",
            "approved_cost": 8900.0,
            "revised_cost": 11400.0,
            "actual_spent": 6800.0,
            "start": today - timedelta(days=820),
            "end": today + timedelta(days=450),
            "planned_p": 68.0,
            "actual_p": 44.0,
            "status": "Critical Attention"
        }
    ]

    for p_info in projects_data:
        proj = Project(
            project_code=p_info["code"],
            name=p_info["name"],
            description=p_info["desc"],
            sector=p_info["sector"],
            ministry=p_info["ministry"],
            department_id=p_info["dept_id"],
            implementing_agency=p_info["agency"],
            location_state=p_info["state"],
            location_district=p_info["district"],
            approved_cost=p_info["approved_cost"],
            revised_cost=p_info["revised_cost"],
            actual_expenditure=p_info["actual_spent"],
            planned_start_date=p_info["start"],
            expected_completion_date=p_info["end"],
            actual_completion_date=p_info["end"] if p_info["status"] == "Completed" else None,
            planned_progress=p_info["planned_p"],
            actual_progress=p_info["actual_p"],
            status=p_info["status"]
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)

        # Seed Milestones
        m1 = ProjectMilestone(
            project_id=proj.id,
            title="Land Acquisition & Environmental Clearances",
            description="Statutory environmental sanction and 90% contiguous Right of Way handoff.",
            planned_completion_date=proj.planned_start_date + timedelta(days=90),
            actual_completion_date=proj.planned_start_date + timedelta(days=110),
            status="Completed",
            weight_percentage=20.0,
            is_critical_path=True
        )
        m2 = ProjectMilestone(
            project_id=proj.id,
            title="Substructure Foundation & Earthworks",
            description="Geotechnical stabilization, piling works and structural base slabs.",
            planned_completion_date=proj.planned_start_date + timedelta(days=240),
            actual_completion_date=proj.planned_start_date + timedelta(days=260) if proj.actual_progress > 40 else None,
            status="Completed" if proj.actual_progress > 40 else ("In Progress" if proj.actual_progress > 20 else "Pending"),
            weight_percentage=30.0,
            is_critical_path=True
        )
        m3 = ProjectMilestone(
            project_id=proj.id,
            title="Superstructure Erection & Systems Integration",
            description="Pre-cast girder launching, electrical conduits, signaling and utility mains.",
            planned_completion_date=proj.planned_start_date + timedelta(days=450),
            actual_completion_date=None,
            status="Delayed" if proj.planned_progress > 60 and proj.actual_progress < 50 else "In Progress",
            weight_percentage=30.0,
            is_critical_path=True
        )
        m4 = ProjectMilestone(
            project_id=proj.id,
            title="Safety Trial Runs & Final Commissioning",
            description="Comprehensive safety compliance, load testing and statutory certificate issuance.",
            planned_completion_date=proj.expected_completion_date,
            actual_completion_date=proj.actual_completion_date,
            status="Completed" if proj.status == "Completed" else "Pending",
            weight_percentage=20.0,
            is_critical_path=True
        )
        db.add_all([m1, m2, m3, m4])

        # Seed Quarterly Expenditures
        exp1 = ProjectExpenditure(
            project_id=proj.id,
            fiscal_year="2023-24",
            quarter="Q3",
            amount=round(proj.actual_expenditure * 0.35, 2),
            expenditure_category="Civil Works",
            voucher_ref=f"VOUCH-{proj.id}-001",
            recorded_date=today - timedelta(days=200)
        )
        exp2 = ProjectExpenditure(
            project_id=proj.id,
            fiscal_year="2023-24",
            quarter="Q4",
            amount=round(proj.actual_expenditure * 0.40, 2),
            expenditure_category="Land Acquisition & Clearances",
            voucher_ref=f"VOUCH-{proj.id}-002",
            recorded_date=today - timedelta(days=110)
        )
        exp3 = ProjectExpenditure(
            project_id=proj.id,
            fiscal_year="2024-25",
            quarter="Q1",
            amount=round(proj.actual_expenditure * 0.25, 2),
            expenditure_category="Equipment & Technology",
            voucher_ref=f"VOUCH-{proj.id}-003",
            recorded_date=today - timedelta(days=30)
        )
        db.add_all([exp1, exp2, exp3])

        # Seed Progress Update
        pup = ProjectProgressUpdate(
            project_id=proj.id,
            update_date=today - timedelta(days=15),
            physical_progress=proj.actual_progress,
            financial_progress=round((proj.actual_expenditure / max(1.0, proj.approved_cost)) * 100.0, 1),
            remarks="Monthly field measurement book reconciliation and milestone review.",
            reported_by_id=users[2].id
        )
        db.add(pup)
        db.commit()
        db.refresh(proj)

        # Run Real ML Predictions & Risk Engine to seed AI results
        risk_res = risk_engine.calculate_risk(proj)
        proj.risk_score = risk_res["overall_risk_score"]
        proj.risk_level = risk_res["risk_level"]

        risk_rec = RiskAssessment(
            project_id=proj.id,
            overall_risk_score=risk_res["overall_risk_score"],
            risk_level=risk_res["risk_level"],
            cost_escalation_score=risk_res["cost_escalation_score"],
            schedule_delay_score=risk_res["schedule_delay_score"],
            progress_deviation_score=risk_res["progress_deviation_score"],
            milestone_delay_score=risk_res["milestone_delay_score"],
            expenditure_anomaly_score=risk_res["expenditure_anomaly_score"],
            factors_json=json.dumps(risk_res["factor_breakdown"])
        )
        db.add(risk_rec)

        cost_pred = cost_model.predict(proj)
        pred_cost_rec = Prediction(
            project_id=proj.id,
            prediction_type="cost_overrun",
            predicted_value=cost_pred["predicted_cost_overrun"],
            predicted_percentage=cost_pred["predicted_overrun_percentage"],
            risk_level=cost_pred["risk_level"],
            confidence_score=cost_pred["confidence_score"],
            model_version="v1.0-rf-ensemble",
            feature_importance_json=json.dumps(cost_pred["feature_importances"]),
            recommendations_json=json.dumps(cost_pred["contributing_factors"])
        )
        db.add(pred_cost_rec)

        del_pred = delay_model.predict(proj)
        pred_del_rec = Prediction(
            project_id=proj.id,
            prediction_type="schedule_delay",
            predicted_value=del_pred["predicted_delay_days"],
            predicted_percentage=del_pred["delay_percentage"],
            risk_level=del_pred["delay_risk"],
            confidence_score=0.86,
            model_version="v1.0-gb-delay",
            recommendations_json=json.dumps(del_pred["recommended_actions"])
        )
        db.add(pred_del_rec)

        # Run Alert Detector to populate genuine alerts
        alert_items = alert_detector.evaluate_project(proj)
        for a in alert_items:
            alert_obj = Alert(
                project_id=proj.id,
                alert_category=a["alert_category"],
                risk_level=a["risk_level"],
                reason=a["reason"],
                suggested_action=a["suggested_action"],
                status="New"
            )
            db.add(alert_obj)

        db.commit()

    print("Database seeding completed with 10 infrastructure projects, ML predictions, risk scores and alerts!")
