from datetime import datetime, date
from typing import List, Dict, Any
from backend.models import Alert, Project

class EarlyWarningAlertDetector:
    @staticmethod
    def evaluate_project(project: Project) -> List[Dict[str, Any]]:
        """
        Evaluates project metrics and returns any triggered early warning alerts.
        """
        alerts = []
        today = date.today()

        approved = float(project.approved_cost or 1.0)
        revised = float(project.revised_cost or approved)
        actual_exp = float(project.actual_expenditure or 0.0)
        planned_p = float(project.planned_progress or 0.0)
        actual_p = float(project.actual_progress or 0.0)
        risk_score = float(project.risk_score or 0.0)

        # 1. Significant Cost Increase Alert
        cost_growth = ((revised - approved) / approved) * 100.0
        if cost_growth >= 20.0:
            alerts.append({
                "alert_category": "Cost Escalation",
                "risk_level": "Critical" if cost_growth >= 35.0 else "High",
                "reason": f"Project budget revised upward by {cost_growth:.1f}% (₹{revised - approved:.2f} Cr increase over approved outlay).",
                "suggested_action": "Mandate an expedited financial audit and value engineering review before releasing subsequent tranches."
            })
        elif cost_growth >= 10.0:
            alerts.append({
                "alert_category": "Cost Escalation",
                "risk_level": "Medium",
                "reason": f"Project budget revised upward by {cost_growth:.1f}% over approved estimate.",
                "suggested_action": "Seek detailed cost variance justification report from the implementing agency."
            })

        # 2. Schedule & Physical Progress Lag
        progress_lag = planned_p - actual_p
        if progress_lag >= 20.0:
            alerts.append({
                "alert_category": "Progress Deviation",
                "risk_level": "High",
                "reason": f"Ground physical progress is lagging target by {progress_lag:.1f}% (Target: {planned_p:.1f}%, Actual: {actual_p:.1f}%).",
                "suggested_action": "Convene an inter-departmental review meeting to clear contractor bottlenecks and expedite clearances."
            })
        elif progress_lag >= 10.0:
            alerts.append({
                "alert_category": "Progress Deviation",
                "risk_level": "Medium",
                "reason": f"Physical execution trailing scheduled baseline by {progress_lag:.1f}%.",
                "suggested_action": "Issue formal milestone cure notice to EPC contractor."
            })

        # 3. Target Deadline Overrun
        if today > project.expected_completion_date and project.status != "Completed":
            days_overdue = (today - project.expected_completion_date).days
            alerts.append({
                "alert_category": "Schedule Delay",
                "risk_level": "High" if days_overdue > 60 else "Medium",
                "reason": f"Project has exceeded planned completion deadline by {days_overdue} days.",
                "suggested_action": "Establish revised enforceable project completion timeline and review liquidated damages clauses."
            })

        # 4. Expenditure Disparity (Unusual burn pattern)
        financial_pct = min(100.0, (actual_exp / approved) * 100.0)
        if financial_pct - actual_p >= 20.0 and financial_pct > 30.0:
            alerts.append({
                "alert_category": "Expenditure Disparity",
                "risk_level": "High",
                "reason": f"Financial expenditure ({financial_pct:.1f}%) significantly outpacing verified physical progress ({actual_p:.1f}%).",
                "suggested_action": "Perform physical site verification of measurement books (MB) and inspect on-site inventory."
            })

        # 5. Composite Risk Threshold Exceeded
        if risk_score >= 70.0:
            alerts.append({
                "alert_category": "Risk Threshold Breached",
                "risk_level": "Critical",
                "reason": f"Composite predictive risk score reached {risk_score:.1f}/100, entering critical monitoring zone.",
                "suggested_action": "Escalate to Apex Monitoring Committee for priority intervention."
            })

        return alerts

alert_detector = EarlyWarningAlertDetector()
