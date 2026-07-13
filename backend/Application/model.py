from .database import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin' | 'company' | 'student'
    is_blacklisted = db.Column(db.Boolean, default=False, nullable=False)

    student_profile = db.relationship(
        'StudentProfile', backref='user', uselist=False, cascade='all, delete-orphan'
    )
    company_profile = db.relationship(
        'CompanyProfile', backref='user', uselist=False, cascade='all, delete-orphan'
    )

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password, method='pbkdf2:sha256')

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self):
        base = {
            "id": self.id, "name": self.name, "email": self.email,
            "role": self.role, "is_blacklisted": self.is_blacklisted,
        }
        if self.role == 'student' and self.student_profile:
            base.update(self.student_profile.to_dict())
        elif self.role == 'company' and self.company_profile:
            base.update(self.company_profile.to_dict())
        return base


class StudentProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)

    branch = db.Column(db.String(100))
    cgpa = db.Column(db.Float)
    grad_year = db.Column(db.Integer)
    resume = db.Column(db.String(200))

    def to_dict(self):
        return {
            "branch": self.branch, "cgpa": self.cgpa,
            "grad_year": self.grad_year, "resume": self.resume,
        }


class CompanyProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)

    description = db.Column(db.Text)
    is_approved = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {"description": self.description, "is_approved": self.is_approved}


class Drive(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100))
    job_role = db.Column(db.String(100))
    description = db.Column(db.Text)

    min_cgpa = db.Column(db.Float, default=0)
    eligible_branches = db.Column(db.String(200))   # comma separated; "" / "ANY" = no restriction
    eligible_grad_year = db.Column(db.Integer, nullable=True)

    salary = db.Column(db.Float)
    location = db.Column(db.String(100))
    deadline = db.Column(db.Date)

    status = db.Column(db.String(20), default='Pending', nullable=False)  # Pending/Approved/Rejected/Closed
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    company_id = db.Column(db.Integer, db.ForeignKey('user.id'))  # User row where role='company'
    company = db.relationship('User', foreign_keys=[company_id])

    def is_student_eligible(self, student_user):
        profile = student_user.student_profile
        if not profile or profile.cgpa is None or profile.cgpa < (self.min_cgpa or 0):
            return False
        if self.eligible_branches and self.eligible_branches.upper() != 'ANY':
            allowed = [b.strip().lower() for b in self.eligible_branches.split(',')]
            if (profile.branch or '').strip().lower() not in allowed:
                return False
        if self.eligible_grad_year and profile.grad_year != self.eligible_grad_year:
            return False
        return True

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "job_role": self.job_role,
            "description": self.description, "min_cgpa": self.min_cgpa,
            "eligible_branches": self.eligible_branches,
            "eligible_grad_year": self.eligible_grad_year,
            "salary": self.salary, "location": self.location,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "status": self.status, "is_active": self.is_active,
            "company_id": self.company_id,
            "company_name": self.company.name if self.company else None,
        }


class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(100), default='Applied')
    interview_type = db.Column(db.String(100), nullable=True)
    remark = db.Column(db.String(100), nullable=True)
    applied_date = db.Column(db.DateTime)

    student_id = db.Column(db.Integer, db.ForeignKey('user.id'))  # User row where role='student'
    drive_id = db.Column(db.Integer, db.ForeignKey('drive.id'))

    student = db.relationship('User', foreign_keys=[student_id])
    drive = db.relationship('Drive', backref='applications')

    __table_args__ = (db.UniqueConstraint('student_id', 'drive_id', name='uq_student_drive'),)

    def to_dict(self):
        profile = self.student.student_profile if self.student else None
        return {
            "id": self.id, "status": self.status,
            "interview_type": self.interview_type, "remark": self.remark,
            "applied_date": self.applied_date.isoformat() if self.applied_date else None,
            "student_id": self.student_id, "drive_id": self.drive_id,
            "student_name": self.student.name if self.student else None,
            "student_email": self.student.email if self.student else None,
            "student_branch": profile.branch if profile else None,
            "student_cgpa": profile.cgpa if profile else None,
            "resume_url": f"/static/resumes/{profile.resume}" if profile and profile.resume else None,
            "drive_title": self.drive.title if self.drive else None,
            "company_name": self.drive.company.name if self.drive and self.drive.company else None,
        }