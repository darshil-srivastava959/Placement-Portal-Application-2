# Placement-Portal-Application-2

Placement Portal Application (PPA)

A full-stack web application for managing campus recruitment activities between an institute (Admin), companies, and students.

Built for IIT Madras BS Degree — Modern Application Development 2 (MAD-2).


Tech Stack


# Roles

#Admin


Pre-seeded account (no registration)
Approve / reject company registrations
Approve / reject placement drives
Blacklist / reactivate companies and students
View all students, companies, drives, and applications
Search across students and companies
Receives monthly HTML placement report via email


#Company


Self-register (pending admin approval)
Create placement drives (pending admin approval)
View and manage student applications
Shortlist, schedule interviews, select or reject applicants


#Student


Self-register and login
Browse approved drives with eligibility filtering and search
Apply to drives (eligibility validated before applying)
View application status and history
Upload resume (PDF / DOC / DOCX)
Export application history as CSV (async)



# Database Schema

User (id, name, email, password_hash, role, is_blacklisted)
  ├── StudentProfile (user_id, branch, cgpa, grad_year, resume)
  └── CompanyProfile (user_id, description, is_approved)

Drive (id, title, job_role, description, min_cgpa, eligible_branches,
       eligible_grad_year, salary, location, deadline, status, company_id)

Application (id, student_id, drive_id, status, interview_type, remark, applied_date)
  └── UniqueConstraint(student_id, drive_id)  ← prevents duplicate applications


# Setup and Installation

#Prerequisites


Python 3.8+
Redis (running on localhost:6379)


1. Clone the repository

git clone <https://github.com/darshil-srivastava959/Placement-Portal-Application-2.git>
cd Placement-Portal-Application-2

2. Create and activate virtual environment

cd backend
python3 -m venv venv

# Mac / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

3. Install dependencies

pip install -r requirements.txt

4. Set email credentials (optional — for job emails)

# Mac / Linux
export SMTP_USER="youremail@gmail.com"
export SMTP_PASSWORD="your-app-password"
export ADMIN_EMAIL="admin@yourinstitute.com"

#Windows
set SMTP_USER=youremail@gmail.com
set SMTP_PASSWORD=your-app-password
set ADMIN_EMAIL=admin@yourinstitute.com


If not set, background jobs still run but print to the terminal instead of sending email.




# Running the Application

You need 3 terminals, all with the virtual environment activated, all inside backend/.

Terminal 1 — Redis

redis-server

Terminal 2 — Flask

cd backend
source venv/bin/activate
python app.py

This will:


Create the SQLite database automatically
Seed the admin account
Open http://127.0.0.1:5000 in your browser


Terminal 3 — Celery Worker + Beat Scheduler

cd backend
source venv/bin/activate
celery -A celery_worker worker --beat --loglevel=info


# Default Admin Credentials

Email - admin@ppa.local
Password - admin123


## Background Jobs

| Job | Type | Schedule | Description |
|---|---|---|---|
| Daily Reminder | Celery Beat | Every day at 8 AM | Emails students about drives with deadlines in 3 days |

| Monthly Report | Celery Beat | 1st of every month at 9 AM | Sends HTML placement stats report to admin |

| CSV Export | Async (user-triggered) | On demand | Exports student's application history, emails CSV |

##Manually trigger jobs (for testing)

# Monthly report
cd backend
python3 -c "
from app import app
from Application.tasks import send_monthly_report
with app.app_context():
    result = send_monthly_report.delay()
    print('Task queued:', result.id)
"

# Daily reminder
cd backend
python3 -c "
from app import app
from Application.tasks import send_deadline_reminders
with app.app_context():
    result = send_deadline_reminders.delay()
    print('Task queued:', result.id)
"

# Caching

Redis caching is applied to:

| Data | Cache Key | TTL |
|---|---|---|
| Admin dashboard stats | `ppa:admin:stats` | 2 minutes |
| Approved drives list | `ppa:drives:approved` | 3 minutes |
| Individual drive detail | `ppa:drive:<id>` | 3 minutes |

Cache is automatically invalidated when the underlying data changes. If Redis is unavailable the app continues to work — cache misses fall through to the database.


Author
Darshil Srivastava

License
This project is developed for educational purposes.