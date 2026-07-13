
from flask import jsonify, request
from datetime import datetime, date
from flask_jwt_extended import create_access_token
 
from .model import User, StudentProfile, CompanyProfile, Drive, Application
from .database import db
from .auth import role_required, get_current_user
from .cache import cache, TTL_STATS, TTL_DRIVES, TTL_DRIVE_DETAIL, KEY_ADMIN_STATS, KEY_APPROVED_DRIVES, key_drive
 
def init_routes(app):
 
    # ============================================================
    # AUTH
    # ============================================================
 
    @app.route('/api/register', methods=['POST'])
    def register():
        data = request.get_json(force=True) or {}
        role = data.get('role')
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
 
        if not all([role, name, email, password]):
            return jsonify({"error": "name, email, password, role are required"}), 400
        if role not in ('student', 'company'):
            return jsonify({"error": "role must be 'student' or 'company' (admin cannot self-register)"}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 409
 
        user = User(name=name, email=email, role=role)
        user.set_password(password)
        db.session.add(user)
        db.session.flush()  # get user.id before commit, for the profile FK
 
        if role == 'student':
            profile = StudentProfile(
                user_id=user.id, branch=data.get('branch'),
                cgpa=data.get('cgpa'), grad_year=data.get('grad_year'),
            )
            db.session.add(profile)
            db.session.commit()
            return jsonify({"message": "Registered successfully", "id": user.id}), 201
 
        else:  # company
            profile = CompanyProfile(
                user_id=user.id, description=data.get('description'), is_approved=False,
            )
            db.session.add(profile)
            db.session.commit()
            return jsonify({"message": "Registered. Awaiting admin approval.", "id": user.id}), 201
 
    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.get_json(force=True) or {}
        role = data.get('role')
        email_or_username = data.get('email') or data.get('username')
        password = data.get('password')
 
        user = User.query.filter_by(email=email_or_username, role=role).first()
        if not user or not user.check_password(password):
            return jsonify({"error": "Invalid credentials"}), 401
        if user.is_blacklisted:
            return jsonify({"error": "Account blacklisted"}), 403
        if role == 'company':
            if not user.company_profile or not user.company_profile.is_approved:
                return jsonify({"error": "Company not approved by admin yet"}), 403
 
        token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": token, "role": role, "user": user.to_dict()})
 
    @app.route('/api/me', methods=['GET'])
    @role_required('admin', 'student', 'company')
    def me():
        user = get_current_user()
        return jsonify(user.to_dict())
 
    # ============================================================
    # ADMIN
    # ============================================================
 
    @app.route('/api/admin/dashboard', methods=['GET'])
    @role_required('admin')
    def admin_dashboard():
        search = request.args.get('search')
 
        companies_q = User.query.join(CompanyProfile).filter(
            User.role == 'company', CompanyProfile.is_approved == True
        )
        pending_companies_q = User.query.join(CompanyProfile).filter(
            User.role == 'company', CompanyProfile.is_approved == False
        )
        students_q = User.query.filter(User.role == 'student')
 
        if search:
            companies_q = companies_q.filter(User.name.ilike(f'%{search}%'))
            pending_companies_q = pending_companies_q.filter(User.name.ilike(f'%{search}%'))
            students_q = students_q.filter(User.name.ilike(f'%{search}%'))
 
        # Stats are cached; lists are not (search param makes them dynamic)
        stats = cache.get(KEY_ADMIN_STATS)
        if stats is None:
            stats = {
                "total_students": User.query.filter_by(role='student').count(),
                "total_companies": User.query.filter_by(role='company').count(),
                "total_drives": Drive.query.count(),
                "total_applications": Application.query.count(),
            }
            cache.set(KEY_ADMIN_STATS, stats, ttl=TTL_STATS)
 
        return jsonify({
            "stats": stats,
            "companies": [u.to_dict() for u in companies_q.all()],
            "pending_companies": [u.to_dict() for u in pending_companies_q.all()],
            "students": [u.to_dict() for u in students_q.all()],
            "drives": [d.to_dict() for d in Drive.query.all()],
            "applications": [a.to_dict() for a in Application.query.order_by(Application.applied_date.desc()).limit(50).all()],
        })
 
    @app.route('/api/admin/companies/<int:company_id>/approve', methods=['POST'])
    @role_required('admin')
    def approve_company(company_id):
        user = User.query.filter_by(id=company_id, role='company').first_or_404()
        user.company_profile.is_approved = True
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS)
        return jsonify({"message": "Company approved", "company": user.to_dict()})
 
    @app.route('/api/admin/companies/<int:company_id>/reject', methods=['POST'])
    @role_required('admin')
    def reject_company(company_id):
        user = User.query.filter_by(id=company_id, role='company').first_or_404()
        db.session.delete(user)  # cascades to CompanyProfile
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS)
        return jsonify({"message": "Company registration rejected"})
 
    @app.route('/api/admin/companies/<int:company_id>/blacklist', methods=['POST'])
    @role_required('admin')
    def blacklist_company(company_id):
        user = User.query.filter_by(id=company_id, role='company').first_or_404()
        user.is_blacklisted = True
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS)
        return jsonify({"message": "Company blacklisted", "company": user.to_dict()})
 
    @app.route('/api/admin/students/<int:student_id>/blacklist', methods=['POST'])
    @role_required('admin')
    def blacklist_student(student_id):
        user = User.query.filter_by(id=student_id, role='student').first_or_404()
        user.is_blacklisted = True
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS)
        return jsonify({"message": "Student blacklisted", "student": user.to_dict()})
 
    @app.route('/api/admin/drives/<int:drive_id>/approve', methods=['POST'])
    @role_required('admin')
    def approve_drive(drive_id):
        drive = Drive.query.get_or_404(drive_id)
        drive.status = 'Approved'
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS, KEY_APPROVED_DRIVES, key_drive(drive_id))
        return jsonify({"message": "Drive approved", "drive": drive.to_dict()})
 
    @app.route('/api/admin/drives/<int:drive_id>/reject', methods=['POST'])
    @role_required('admin')
    def reject_drive(drive_id):
        drive = Drive.query.get_or_404(drive_id)
        drive.status = 'Rejected'
        drive.is_active = False
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS, KEY_APPROVED_DRIVES, key_drive(drive_id))
        return jsonify({"message": "Drive rejected", "drive": drive.to_dict()})
 
    @app.route('/api/admin/drives/<int:drive_id>', methods=['GET'])
    @role_required('admin')
    def admin_view_drive(drive_id):
        drive = Drive.query.get_or_404(drive_id)
        return jsonify(drive.to_dict())
    
    @app.route('/api/admin/drives/<int:drive_id>/applications', methods=['GET'])
    @role_required('admin')
    def admin_view_drive_applications(drive_id):
        drive = Drive.query.get_or_404(drive_id)
        applications = Application.query.filter_by(drive_id=drive_id).all()
        return jsonify({
            "drive": drive.to_dict(),
            "applications": [a.to_dict() for a in applications],
        })
 
    @app.route('/api/admin/applications/<int:app_id>', methods=['GET'])
    @role_required('admin')
    def admin_view_application(app_id):
        application = Application.query.get_or_404(app_id)
        return jsonify(application.to_dict())
 
    # ============================================================
    # COMPANY
    # ============================================================
 
    @app.route('/api/company/dashboard', methods=['GET'])
    @role_required('company')
    def company_dashboard():
        company = get_current_user()
        upcoming = Drive.query.filter_by(company_id=company.id, is_active=True).all()
        closed = Drive.query.filter_by(company_id=company.id, is_active=False).all()
        return jsonify({
            "company": company.to_dict(),
            "upcoming_drives": [d.to_dict() for d in upcoming],
            "closed_drives": [d.to_dict() for d in closed],
        })
 
    @app.route('/api/company/profile', methods=['PUT'])
    @role_required('company')
    def update_company_description():
        company = get_current_user()
        data = request.get_json(force=True) or {}
        company.company_profile.description = data.get('description', company.company_profile.description)
        db.session.commit()
        return jsonify({"message": "Updated", "company": company.to_dict()})
 
    @app.route('/api/company/drives', methods=['POST'])
    @role_required('company')
    def create_drive():
        company = get_current_user()
        if not company.company_profile.is_approved:
            return jsonify({"error": "Company not yet approved by admin"}), 403
 
        data = request.get_json(force=True) or {}
        required = ['title', 'job_role', 'deadline']
        if not all(data.get(f) for f in required):
            return jsonify({"error": f"Required fields: {required}"}), 400
 
        try:
            deadline = datetime.strptime(data['deadline'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "deadline must be YYYY-MM-DD"}), 400
 
        drive = Drive(
            title=data['title'],
            job_role=data['job_role'],
            description=data.get('description'),
            min_cgpa=data.get('min_cgpa', 0),
            eligible_branches=data.get('eligible_branches', 'ANY'),
            eligible_grad_year=data.get('eligible_grad_year'),
            salary=data.get('salary'),
            location=data.get('location'),
            deadline=deadline,
            company_id=company.id,
            status='Pending',
            is_active=True,
        )
        db.session.add(drive)
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS)
        return jsonify({"message": "Drive submitted for admin approval", "drive": drive.to_dict()}), 201
 
    @app.route('/api/company/drives/<int:drive_id>/close', methods=['POST'])
    @role_required('company')
    def mark_complete(drive_id):
        company = get_current_user()
        drive = Drive.query.get_or_404(drive_id)
        if drive.company_id != company.id:
            return jsonify({"error": "Not your drive"}), 403
        drive.is_active = False
        drive.status = 'Closed'
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS, KEY_APPROVED_DRIVES, key_drive(drive_id))
        return jsonify({"message": "Drive closed", "drive": drive.to_dict()})
 
    @app.route('/api/company/drives/<int:drive_id>/applications', methods=['GET'])
    @role_required('company')
    def view_applications(drive_id):
        company = get_current_user()
        drive = Drive.query.get_or_404(drive_id)
        if drive.company_id != company.id:
            return jsonify({"error": "Not your drive"}), 403
        applications = Application.query.filter_by(drive_id=drive_id).all()
        return jsonify({
            "drive": drive.to_dict(),
            "applications": [a.to_dict() for a in applications],
        })
 
    @app.route('/api/company/applications/<int:app_id>', methods=['GET'])
    @role_required('company')
    def company_review_application(app_id):
        company = get_current_user()
        application = Application.query.get_or_404(app_id)
        if application.drive.company_id != company.id:
            return jsonify({"error": "Not your application to view"}), 403
        return jsonify(application.to_dict())
 
    @app.route('/api/company/applications/<int:app_id>', methods=['PUT'])
    @role_required('company')
    def update_application_status(app_id):
        company = get_current_user()
        application = Application.query.get_or_404(app_id)
        if application.drive.company_id != company.id:
            return jsonify({"error": "Not your application to update"}), 403
 
        data = request.get_json(force=True) or {}
        status = data.get('status')
        valid_statuses = {'Applied', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'}
        if status not in valid_statuses:
            return jsonify({"error": f"status must be one of {sorted(valid_statuses)}"}), 400
 
        application.status = status
        if 'interview_type' in data:
            application.interview_type = data['interview_type']
        if 'remark' in data:
            application.remark = data['remark']
        db.session.commit()
        return jsonify({"message": "Application updated", "application": application.to_dict()})
 
    # ============================================================
    # STUDENT
    # ============================================================
 
    @app.route('/api/student/dashboard', methods=['GET'])
    @role_required('student')
    def student_dashboard():
        student = get_current_user()
        # Cache the raw approved drives list; eligibility is computed per-student after
        drives_data = cache.get(KEY_APPROVED_DRIVES)
        if drives_data is None:
            drives = Drive.query.filter_by(status='Approved', is_active=True).all()
            drives_data = [d.to_dict() for d in drives]
            cache.set(KEY_APPROVED_DRIVES, drives_data, ttl=TTL_DRIVES)
 
        applications = Application.query.filter_by(student_id=student.id).all()
        applied_drive_ids = {a.drive_id for a in applications}
 
        # Re-fetch drive objects only to run eligibility check (lightweight by id)
        drive_objs = {d.id: d for d in Drive.query.filter(
            Drive.id.in_([d['id'] for d in drives_data])
        ).all()}
 
        eligible_drives = []
        for entry in drives_data:
            e = dict(entry)
            drive_obj = drive_objs.get(e['id'])
            e['eligible'] = drive_obj.is_student_eligible(student) if drive_obj else False
            e['already_applied'] = e['id'] in applied_drive_ids
            eligible_drives.append(e)
 
        return jsonify({
            "student": student.to_dict(),
            "drives": eligible_drives,
            "applications": [a.to_dict() for a in applications],
        })
 
    @app.route('/api/student/profile', methods=['PUT'])
    @role_required('student')
    def edit_student_profile():
        student = get_current_user()
        data = request.get_json(force=True) or {}
        student.name = data.get('name', student.name)
        profile = student.student_profile
        profile.branch = data.get('branch', profile.branch)
        profile.cgpa = data.get('cgpa', profile.cgpa)
        profile.grad_year = data.get('grad_year', profile.grad_year)
        if data.get('password'):
            student.set_password(data['password'])
        db.session.commit()
        return jsonify({"message": "Profile updated", "student": student.to_dict()})
 
    @app.route('/api/student/history', methods=['GET'])
    @role_required('student')
    def student_history():
        student = get_current_user()
        applications = Application.query.filter_by(student_id=student.id).all()
        return jsonify({"applications": [a.to_dict() for a in applications]})
 
    @app.route('/api/student/companies', methods=['GET'])
    @role_required('student')
    def student_list_companies():
        companies = User.query.join(CompanyProfile).filter(
            User.role == 'company', CompanyProfile.is_approved == True
        ).all()
        result = []
        for c in companies:
            d = c.to_dict()
            d['open_drives'] = Drive.query.filter_by(
                company_id=c.id, status='Approved', is_active=True
            ).count()
            result.append(d)
        return jsonify({"companies": result})
 
    @app.route('/api/student/companies/<int:company_id>', methods=['GET'])
    @role_required('student')
    def student_view_company(company_id):
        company = User.query.filter_by(id=company_id, role='company').first_or_404()
        if not company.company_profile.is_approved:
            return jsonify({"error": "Company not approved"}), 404
        drives = Drive.query.filter_by(company_id=company_id, status='Approved', is_active=True).all()
        return jsonify({"company": company.to_dict(), "drives": [d.to_dict() for d in drives]})
 
    @app.route('/api/student/drives/<int:drive_id>', methods=['GET'])
    @role_required('student')
    def student_drive_detail(drive_id):
        student = get_current_user()
        cached = cache.get(key_drive(drive_id))
        if cached is None:
            drive = Drive.query.get_or_404(drive_id)
            cached = drive.to_dict()
            cache.set(key_drive(drive_id), cached, ttl=TTL_DRIVE_DETAIL)
        else:
            drive = Drive.query.get_or_404(drive_id)   # still need obj for eligibility
 
        existing = Application.query.filter_by(drive_id=drive_id, student_id=student.id).first()
        entry = dict(cached)
        entry['eligible'] = drive.is_student_eligible(student)
        entry['already_applied'] = existing is not None
        return jsonify(entry)
 
    @app.route('/api/student/drives/<int:drive_id>/apply', methods=['POST'])
    @role_required('student')
    def apply_drive(drive_id):
        student = get_current_user()
        drive = Drive.query.get_or_404(drive_id)
 
        if drive.status != 'Approved' or not drive.is_active:
            return jsonify({"error": "This drive is not open for applications"}), 400
 
        if drive.deadline and drive.deadline < date.today():
            return jsonify({"error": "Application deadline has passed"}), 400
 
        if not drive.is_student_eligible(student):
            return jsonify({"error": "You do not meet the eligibility criteria for this drive"}), 403
 
        existing = Application.query.filter_by(drive_id=drive_id, student_id=student.id).first()
        if existing:
            return jsonify({"error": "You have already applied to this drive"}), 409
 
        new_app = Application(
            drive_id=drive_id,
            student_id=student.id,
            status='Applied',
            applied_date=datetime.utcnow(),
        )
        db.session.add(new_app)
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS)
        return jsonify({"message": "Applied successfully", "application": new_app.to_dict()}), 201
 
    # ============================================================
    # MISSING ROUTES — added in audit
    # ============================================================
 
    @app.route('/api/company/drives', methods=['GET'])
    @role_required('company')
    def list_company_drives():
        """Company: list all their own drives (any status)."""
        company = get_current_user()
        drives = Drive.query.filter_by(company_id=company.id).order_by(Drive.id.desc()).all()
        return jsonify({"drives": [d.to_dict() for d in drives]})
 
    @app.route('/api/admin/companies/<int:company_id>/reactivate', methods=['POST'])
    @role_required('admin')
    def reactivate_company(company_id):
        user = User.query.filter_by(id=company_id, role='company').first_or_404()
        user.is_blacklisted = False
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS)
        return jsonify({"message": "Company reactivated", "company": user.to_dict()})
 
    @app.route('/api/admin/students/<int:student_id>/reactivate', methods=['POST'])
    @role_required('admin')
    def reactivate_student(student_id):
        user = User.query.filter_by(id=student_id, role='student').first_or_404()
        user.is_blacklisted = False
        db.session.commit()
        cache.delete(KEY_ADMIN_STATS)
        return jsonify({"message": "Student reactivated", "student": user.to_dict()})
 
    @app.route('/api/student/resume', methods=['POST'])
    @role_required('student')
    def upload_resume():
        """Student: upload resume file. Saved to static/resumes/<user_id>_<filename>."""
        import os
        from werkzeug.utils import secure_filename
        student = get_current_user()
        if 'resume' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        file = request.files['resume']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        allowed = {'.pdf', '.doc', '.docx'}
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed:
            return jsonify({"error": "Only PDF/DOC/DOCX allowed"}), 400
        filename = secure_filename(f"{student.id}_{file.filename}")
        upload_dir = os.path.join('static', 'resumes')
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)
        student.student_profile.resume = filename
        db.session.commit()
        return jsonify({"message": "Resume uploaded", "resume": filename})
 
    # ── CSV export (async, user-triggered) ──────────────────
    @app.route('/api/student/export', methods=['POST'])
    @role_required('student')
    def trigger_csv_export():
        """Kick off async Celery task. Returns task_id immediately."""
        student = get_current_user()
        from Application.tasks import export_student_csv
        task = export_student_csv.delay(student.id)
        return jsonify({"message": "Export started", "task_id": task.id}), 202
 
    @app.route('/api/student/export/<task_id>', methods=['GET'])
    @role_required('student')
    def poll_csv_export(task_id):
        """Poll task status. When done returns download URL."""
        from celery.result import AsyncResult
        from celery_worker import celery as celery_app
        result = AsyncResult(task_id, app=celery_app)
        if result.state == 'PENDING':
            return jsonify({"state": "pending"})
        elif result.state == 'SUCCESS':
            data = result.result or {}
            url = f"/static/exports/{data.get('file', '')}" if data.get('file') else None
            return jsonify({"state": "done", "file": data.get('file'), "url": url, "count": data.get('count')})
        elif result.state == 'FAILURE':
            return jsonify({"state": "failed", "error": str(result.result)}), 500
        return jsonify({"state": result.state.lower()})
 