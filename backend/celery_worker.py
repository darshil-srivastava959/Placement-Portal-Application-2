import os
import sys
# Ensure this directory (backend/) is always importable, regardless of how
# Celery's worker/forked child processes resolve sys.path.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
 
from celery import Celery
from celery.schedules import crontab
 
celery = Celery(
    'ppa',
    broker='redis://localhost:6379/1',
    backend='redis://localhost:6379/2',
    # Tell Celery where to find tasks — avoids circular import
    include=['Application.tasks'],
)
 
celery.conf.update(
    timezone='Asia/Kolkata',
    enable_utc=True,
 
    beat_schedule={
        'daily-deadline-reminders': {
            'task': 'Application.tasks.send_deadline_reminders',
            'schedule': crontab(hour=8, minute=0),
        },
        'monthly-placement-report': {
            'task': 'Application.tasks.send_monthly_report',
            'schedule': crontab(day_of_month=1, hour=9, minute=0),
        },
    }
)
# No manual import here — 'include' above handles task discovery safely
 