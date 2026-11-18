from datetime import date
from typing import Dict, Any, Tuple
from backend.config import settings

class ProjectRiskEngine:
    def __init__(
        self,
        weight_cost: float = settings.WEIGHT_COST,
        weight_schedule: float = settings.WEIGHT_SCHEDULE,
        weight_progress: float = settings.WEIGHT_PROGRESS,
        weight_milestone: float = settings.WEIGHT_MILESTONE,
        weight_expenditure: float = settings.WEIGHT_EXPENDITURE
    ):
        self.w_cost = weight_cost
        self.w_schedule = weight_schedule
        self.w_progress = weight_progress
        self.w_milestone = weight_milestone
        self.w_expenditure = weight_expenditure

    def calculate_risk(self, project) -> Dict[str, Any]:
        """
        Calculates a calibrated composite risk score between 0 and 100
        with individual sub-scores and human-understandable factor contributions.
        """
        # 1. Cost Escalation Score (0 - 100)
        approved = float(project.approved_cost or 1.0)
        revised = float(project.revised_cost or approved)
        actual_spent = float(project.actual_expenditure or 0.0)

        cost_escalation_pct = max(0.0, ((revised - approved) / approved) * 100.0)
        # 30% cost increase corresponds to max risk score
        cost_score = min(100.0, (cost_escalation_pct / 30.0) * 100.0)

        # 2. Schedule Delay Score (0 - 100)
        start = project.planned_start_date
        expected_end = project.expected_completion_date
        today = date.today()
        duration_days = max(1, (expected_end - start).days)
        elapsed_days = max(1, (today - start).days)

        if today > expected_end and project.status != "Completed":
            overdue_days = (today - expected_end).days
            schedule_score = min(100.0, 50.0 + (overdue_days / 90.0) * 50.0)
        else:
            time_consumed_ratio = min(1.0, elapsed_days / duration_days)
            planned_p = float(project.planned_progress or (time_consumed_ratio * 100.0))
            actual_p = float(project.actual_progress or 0.0)
            if time_consumed_ratio > 0.5 and actual_p < 25.0:
                schedule_score = 75.0
            else:
                schedule_score = max(0.0, min(100.0, (planned_p - actual_p) * 2.0))

        # 3. Progress Deviation Score (0 - 100)
        planned_p = float(project.planned_progress or 0.0)
        actual_p = float(project.actual_progress or 0.0)
        progress_gap = max(0.0, planned_p - actual_p)
        # Gap of 25% or more reaches 100 progress risk score
        progress_score = min(100.0, (progress_gap / 25.0) * 100.0)

        # 4. Missed Milestones Score (0 - 100)
        milestones = getattr(project, "milestones", [])
        if milestones:
            total_m = len(milestones)
            missed_or_delayed = sum(
                1 for m in milestones 
                if m.status in ["Delayed", "Pending"] and m.planned_completion_date < today
            )
            critical_missed = sum(
                1 for m in milestones
                if m.is_critical_path and m.status in ["Delayed", "Pending"] and m.planned_completion_date < today
            )
            milestone_ratio = (missed_or_delayed + critical_missed * 1.5) / max(1, total_m)
            milestone_score = min(100.0, milestone_ratio * 100.0)
        else:
            # Synthetic proxy from progress gap
            milestone_score = min(100.0, (progress_gap / 30.0) * 100.0)

        # 5. Expenditure Anomaly Score (0 - 100)
        # If money is spent much faster than physical work completed
        financial_pct = min(100.0, (actual_spent / approved) * 100.0)
        spend_progress_gap = max(0.0, financial_pct - actual_p)
        # If financial progress exceeds physical by > 25%, high anomaly
        expenditure_score = min(100.0, (spend_progress_gap / 25.0) * 100.0)

        # Weighted Composite Score
        total_weight = self.w_cost + self.w_schedule + self.w_progress + self.w_milestone + self.w_expenditure
        composite_score = (
            (cost_score * self.w_cost) +
            (schedule_score * self.w_schedule) +
            (progress_score * self.w_progress) +
            (milestone_score * self.w_milestone) +
            (expenditure_score * self.w_expenditure)
        ) / total_weight

        composite_score = round(max(0.0, min(100.0, composite_score)), 1)

        # Level determination
        if composite_score >= 65.0:
            level = "High"
        elif composite_score >= 35.0:
            level = "Medium"
        else:
            level = "Low"

        # Factor contributions breakdown
        breakdown = [
            {
                "indicator": "Cost Escalation",
                "weight_pct": round(self.w_cost * 100),
                "score": round(cost_score, 1),
                "weighted_contribution": round((cost_score * self.w_cost) / total_weight, 1),
                "detail": f"Budget escalated by {cost_escalation_pct:.1f}% over approved cost."
            },
            {
                "indicator": "Schedule Delay",
                "weight_pct": round(self.w_schedule * 100),
                "score": round(schedule_score, 1),
                "weighted_contribution": round((schedule_score * self.w_schedule) / total_weight, 1),
                "detail": f"Timeline lag against planned completion timeline."
            },
            {
                "indicator": "Physical Progress Deviation",
                "weight_pct": round(self.w_progress * 100),
                "score": round(progress_score, 1),
                "weighted_contribution": round((progress_score * self.w_progress) / total_weight, 1),
                "detail": f"Ground progress deficit of {progress_gap:.1f}%."
            },
            {
                "indicator": "Milestone Slippage",
                "weight_pct": round(self.w_milestone * 100),
                "score": round(milestone_score, 1),
                "weighted_contribution": round((milestone_score * self.w_milestone) / total_weight, 1),
                "detail": f"Pending/delayed project deliverable milestones."
            },
            {
                "indicator": "Expenditure Disparity",
                "weight_pct": round(self.w_expenditure * 100),
                "score": round(expenditure_score, 1),
                "weighted_contribution": round((expenditure_score * self.w_expenditure) / total_weight, 1),
                "detail": f"Financial disbursement gap of {spend_progress_gap:.1f}% relative to physical progress."
            }
        ]

        return {
            "overall_risk_score": composite_score,
            "risk_level": level,
            "cost_escalation_score": round(cost_score, 1),
            "schedule_delay_score": round(schedule_score, 1),
            "progress_deviation_score": round(progress_score, 1),
            "milestone_delay_score": round(milestone_score, 1),
            "expenditure_anomaly_score": round(expenditure_score, 1),
            "factor_breakdown": breakdown
        }

risk_engine = ProjectRiskEngine()
