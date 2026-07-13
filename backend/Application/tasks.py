
"""
Three tasks:
  1. send_deadline_reminders  — scheduled daily, emails students about deadlines in 3 days
  2. send_monthly_report      — scheduled 1st of month, emails HTML report to admin
  3. export_student_csv       — user-triggered async, exports application history to CSV
"""
import os
import csv
import smtplib
import io
from datetime import date, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
 
from celery_worker import celery
 
 
# ── Email config — set these via environment variables ──────
SMTP_HOST     = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT     = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER     = os.environ.get('SMTP_USER', '')        # your Gmail / SMTP address
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
ADMIN_EMAIL   = os.environ.get('ADMIN_EMAIL', SMTP_USER)
 
 
def _send_email(to, subject, html_body, attachment=None, attachment_name=None):
    """Helper: send an HTML email via SMTP. Silently logs on failure."""
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[EMAIL SKIP] No SMTP credentials set. Would send to {to}: {subject}")
        return
 
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = SMTP_USER
    msg['To'] = to
    msg.attach(MIMEText(html_body, 'html'))
 
    if attachment and attachment_name:
        part = MIMEBase('application', 'octet-stream')
        part.set_payload(attachment)
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename="{attachment_name}"')
        msg.attach(part)
 
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to, msg.as_string())
        print(f"[EMAIL SENT] {subject} → {to}")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
 
 
# ── Task 1: Daily deadline reminders ────────────────────────
@celery.task(name='Application.tasks.send_deadline_reminders')
def send_deadline_reminders():
    """
    Runs daily at 8 AM.
    Finds drives whose deadline is exactly 3 days away.
    Emails every student who has applied to that drive but is not yet selected/rejected.
    """
    from app import create_app
    flask_app = create_app()
 
    with flask_app.app_context():
        from Application.model import Drive, Application, User
 
        target_date = date.today() + timedelta(days=3)
        upcoming_drives = Drive.query.filter_by(
            status='Approved', is_active=True
        ).filter(Drive.deadline == target_date).all()
 
        notified = 0
        for drive in upcoming_drives:
            apps = Application.query.filter_by(
                drive_id=drive.id
            ).filter(Application.status.notin_(['Selected', 'Rejected'])).all()
 
            for app in apps:
                student = User.query.get(app.student_id)
                if not student:
                    continue
                html = f"""
                <h3>Reminder: Placement deadline in 3 days</h3>
                <p>Hi {student.name},</p>
                <p>This is a reminder that the application deadline for
                <strong>{drive.title}</strong> at <strong>{drive.company.name if drive.company else "a company"}</strong>
                is on <strong>{drive.deadline}</strong>.</p>
                <p>Your current application status: <strong>{app.status}</strong></p>
                <p>Log in to the Placement Portal for updates.</p>
                """
                _send_email(student.email, f"Reminder: {drive.title} deadline in 3 days", html)
                notified += 1
 
    return f"Reminders sent: {notified}"
 
 
# ── Task 2: Monthly placement activity report ────────────────
@celery.task(name='Application.tasks.send_monthly_report')
def send_monthly_report():
    """
    Runs on the 1st of every month at 9 AM.
    Generates an HTML report of the previous month's activity and emails it to admin.
    """
    from app import create_app
    flask_app = create_app()
 
    with flask_app.app_context():
        from Application.model import Drive, Application, User
        from sqlalchemy import func
        import calendar
 
        today = date.today()
        # previous month
        first_of_this = today.replace(day=1)
        last_month_end = first_of_this - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        month_name = calendar.month_name[last_month_end.month]
        year = last_month_end.year
 
        # Drives created last month
        drives = Drive.query.filter(
            Drive.deadline >= last_month_start,
            Drive.deadline <= last_month_end,
        ).all()
 
        # Applications last month
        apps = Application.query.filter(
            Application.applied_date >= last_month_start,
            Application.applied_date <= last_month_end,
        ).all()
 
        selected = [a for a in apps if a.status == 'Selected']
        total_students = User.query.filter_by(role='student').count()
        total_companies = User.query.filter_by(role='company').count()
 
        # Build drive rows
        drive_rows = ''.join(
            f"<tr><td>{d.title}</td><td>{d.company.name if d.company else '-'}</td>"
            f"<td>{d.status}</td><td>{d.deadline}</td></tr>"
            for d in drives
        ) or '<tr><td colspan="4" style="color:#888">No drives this month</td></tr>'
 
        html = f"""
        <html><body style="font-family:sans-serif; color:#222; max-width:700px; margin:auto">
        <h2>Placement Portal — Monthly Report</h2>
        <h3>{month_name} {year}</h3>
 
        <table style="border-collapse:collapse; width:100%; margin-bottom:24px">
          <tr>
            <td style="padding:12px; background:#f0f4ff; border-radius:8px; text-align:center; width:25%">
              <div style="font-size:2rem; font-weight:700">{len(drives)}</div>
              <div style="color:#555">Drives conducted</div>
            </td>
            <td style="width:4%"></td>
            <td style="padding:12px; background:#f0fff4; border-radius:8px; text-align:center; width:25%">
              <div style="font-size:2rem; font-weight:700">{len(apps)}</div>
              <div style="color:#555">Applications received</div>
            </td>
            <td style="width:4%"></td>
            <td style="padding:12px; background:#fff0f0; border-radius:8px; text-align:center; width:25%">
              <div style="font-size:2rem; font-weight:700">{len(selected)}</div>
              <div style="color:#555">Students selected</div>
            </td>
            <td style="width:4%"></td>
            <td style="padding:12px; background:#fffff0; border-radius:8px; text-align:center; width:25%">
              <div style="font-size:2rem; font-weight:700">{total_students}</div>
              <div style="color:#555">Total students</div>
            </td>
          </tr>
        </table>
 
        <h4>Drives this month</h4>
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd">Drive</th>
              <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd">Company</th>
              <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd">Status</th>
              <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd">Deadline</th>
            </tr>
          </thead>
          <tbody>{drive_rows}</tbody>
        </table>
 
        <p style="color:#888; font-size:0.85rem; margin-top:24px">
          Generated automatically on {today} by Placement Portal.
          Total registered companies: {total_companies}.
        </p>
        </body></html>
        """
 
        _send_email(ADMIN_EMAIL, f"Placement Portal — Monthly Report ({month_name} {year})", html)
 
    return f"Monthly report sent for {month_name} {year}"
 
 
# ── Task 3: Student CSV export (user-triggered) ──────────────
@celery.task(bind=True, name='Application.tasks.export_student_csv')
def export_student_csv(self, student_id):
    """
    Triggered by student from the dashboard.
    Generates a CSV of their application history, saves to static/exports/,
    and emails it to the student.
    """
    from app import create_app
    flask_app = create_app()
 
    with flask_app.app_context():
        from Application.model import Application, User
 
        student = User.query.get(student_id)
        if not student:
            return {"error": "Student not found"}
 
        apps = Application.query.filter_by(student_id=student_id).all()
 
        # Build CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Application ID', 'Student ID', 'Company Name',
                         'Drive Title', 'Job Role', 'Applied Date', 'Status'])
 
        for a in apps:
            writer.writerow([
                a.id,
                a.student_id,
                a.drive.company.name if a.drive and a.drive.company else '-',
                a.drive.title if a.drive else '-',
                a.drive.job_role if a.drive else '-',
                a.applied_date.strftime('%Y-%m-%d') if a.applied_date else '-',
                a.status,
            ])
 
        csv_bytes = output.getvalue().encode('utf-8')
 
        # Save file to disk so student can also download it.
        # Must match Flask's actual static_folder (frontend/static/), which is
        # an absolute path anchored to the backend/ directory — not a relative
        # 'static/' path, which would resolve wherever Celery's cwd happens to be.
        BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        export_dir = os.path.join(BACKEND_DIR, '..', 'frontend', 'static', 'exports')
        export_dir = os.path.abspath(export_dir)
        os.makedirs(export_dir, exist_ok=True)
        filename = f"applications_{student_id}_{date.today()}.csv"
        filepath = os.path.join(export_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(csv_bytes)
        # Email it to the student
        html = f"""
        <p>Hi {student.name},</p>
        <p>Your placement application history export is attached.</p>
        <p>It contains {len(apps)} application(s) as of {date.today()}.</p>
        """
        _send_email(
            student.email,
            "Your placement application history — export ready",
            html,
            attachment=csv_bytes,
            attachment_name=filename,
        )
 
    return {"status": "done", "file": filename, "count": len(apps)}
 