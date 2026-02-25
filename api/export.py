# api/export.py

from __future__ import annotations

import json
from typing import Dict, Any, List, Optional
import pandas as pd

# PDF (ReportLab)
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors


def export_roster_json(roster: Dict[str, Any], out_path: str) -> None:
    """Export the roster dict to JSON."""
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(roster, f, indent=2)


def export_roster_csv(
    roster: Dict[str, Any],
    out_assignments_csv: str,
    out_staff_csv: Optional[str] = None,
) -> None:
    """Export Assignments (and optionally Staff) to CSV."""
    assignments_df = pd.DataFrame(roster["assignments"]).sort_values(["date", "shift", "slot"])
    assignments_df.to_csv(out_assignments_csv, index=False)

    if out_staff_csv:
        staff_rows = []
        for sid, info in roster["staff"].items():
            staff_rows.append({
                "staff_id": sid,
                "name": info.get("name", ""),
                "role": info.get("role", ""),
                "specializations": ";".join(info.get("specializations", [])),
                "fte": info.get("fte", 1.0),
            })
        pd.DataFrame(staff_rows).to_csv(out_staff_csv, index=False)


def export_roster_pdf_report(
    roster: Dict[str, Any],
    metrics: Dict[str, Any],
    change_log: List[Dict[str, Any]],
    out_path: str,
    max_days: int = 14,
) -> None:
    """
    Create a clean PDF report:
    - Title + date range
    - Key metrics
    - Change log (audit trail)
    - Schedule preview grouped by date & shift (first max_days)
    """
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(out_path, pagesize=A4, rightMargin=28, leftMargin=28, topMargin=28, bottomMargin=28)

    story = []
    title = Paragraph("Nurse Rostering Report", styles["Title"])
    story.append(title)
    story.append(Spacer(1, 8))

    date_range = f"Date range: {roster.get('start_date')} to {roster.get('end_date')}"
    story.append(Paragraph(date_range, styles["Normal"]))
    story.append(Spacer(1, 12))

    # ---- Metrics ----
    story.append(Paragraph("Summary Metrics", styles["Heading2"]))
    metric_table_data = [
        ["Metric", "Value"],
        ["Total Overtime Hours", f"{float(metrics.get('total_overtime_hours', 0.0)):.2f}"],
        ["Burnout Risk Score", str(int(metrics.get("burnout_risk_score", 0)))],
        ["Skill Match Rate", f"{float(metrics.get('skill_match_rate', 0.0)):.4f}"],
        ["Assignments", str(int(metrics.get("assignment_count", 0)))],
        ["Staff Count", str(int(metrics.get("staff_count", len(roster.get("staff", {})))))],
    ]
    t = Table(metric_table_data, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    # ---- Change Log ----
    story.append(Paragraph("Edit History (Change Log)", styles["Heading2"]))

    if change_log:
        log_data = [["timestamp", "action", "date", "shift", "details"]]
        for row in change_log[-50:]:  # keep last 50 so PDF stays readable
            log_data.append([
                str(row.get("timestamp", "")),
                str(row.get("action", "")),
                str(row.get("date", "")),
                str(row.get("shift", "")),
                str(row.get("details", ""))[:120],  # trim long lines
            ])

        log_table = Table(log_data, hAlign="LEFT", colWidths=[90, 55, 70, 45, 230])
        log_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(log_table)
    else:
        story.append(Paragraph("No edits have been applied yet.", styles["Normal"]))

    story.append(PageBreak())

    # ---- Schedule Preview ----
    story.append(Paragraph("Schedule Preview", styles["Heading2"]))
    story.append(Paragraph(f"Showing up to first {max_days} day(s).", styles["Normal"]))
    story.append(Spacer(1, 10))

    # build lookup staff name
    staff = roster.get("staff", {})
    def staff_label(sid: str) -> str:
        info = staff.get(sid, {})
        nm = info.get("name", sid)
        role = info.get("role", "")
        specs = ",".join(info.get("specializations", []))
        bits = [nm]
        if role:
            bits.append(role)
        if specs:
            bits.append(specs)
        return f"{sid} - " + " / ".join(bits)

    # group assignments by date then shift
    assignments = sorted(roster.get("assignments", []), key=lambda a: (a["date"], a["shift"], int(a.get("slot", 0))))
    dates = sorted({a["date"] for a in assignments})
    dates = dates[:max_days]

    for d in dates:
        story.append(Paragraph(f"Date: {d}", styles["Heading3"]))

        for shift in ["AM", "PM", "NIGHT"]:
            rows = [a for a in assignments if a["date"] == d and a["shift"] == shift]
            if not rows:
                continue

            story.append(Paragraph(f"{shift} Shift", styles["Heading4"]))
            table_data = [["slot", "staff"]]
            for a in rows:
                table_data.append([str(int(a.get("slot", 0))), staff_label(a["staff_id"])])

            sched_table = Table(table_data, hAlign="LEFT", colWidths=[40, 480])
            sched_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(sched_table)
            story.append(Spacer(1, 10))

        story.append(Spacer(1, 6))

    doc.build(story)