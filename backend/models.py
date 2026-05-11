from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class Student(db.Model):
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    matric_number = db.Column(db.String(50), unique=True, nullable=False)
    department = db.Column(db.String(100), nullable=False)
    level = db.Column(db.String(10), nullable=False)
    course = db.Column(db.String(100), nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    passport_photo_path = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    results = db.relationship('ExamResult', backref='student', lazy=True, cascade="all, delete-orphan")
    flags = db.relationship('ProctoringFlag', backref='student', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'matric_number': self.matric_number,
            'department': self.department,
            'level': self.level,
            'course': self.course or f"{self.department} {self.level}",
            'passport_photo_path': self.passport_photo_path,
            'created_at': self.created_at.isoformat()
        }


class Lecturer(db.Model):
    __tablename__ = 'lecturers'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    course_name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    exams = db.relationship('Exam', backref='lecturer', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'course_name': self.course_name,
            'created_at': self.created_at.isoformat()
        }


class Exam(db.Model):
    __tablename__ = 'exams'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    course_name = db.Column(db.String(100), nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    lecturer_id = db.Column(db.Integer, db.ForeignKey('lecturers.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    questions = db.relationship('Question', backref='exam', lazy=True, cascade="all, delete-orphan")
    results = db.relationship('ExamResult', backref='exam', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'course_name': self.course_name,
            'duration_minutes': self.duration_minutes,
            'lecturer_id': self.lecturer_id,
            'total_questions': len(self.questions),
            'created_at': self.created_at.isoformat()
        }


class Question(db.Model):
    __tablename__ = 'questions'

    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(255), nullable=False)
    option_b = db.Column(db.String(255), nullable=False)
    option_c = db.Column(db.String(255), nullable=False)
    option_d = db.Column(db.String(255), nullable=False)
    correct_option = db.Column(db.String(1), nullable=False)

    def to_dict(self, include_answer=False):
        data = {
            'id': self.id,
            'exam_id': self.exam_id,
            'question_text': self.question_text,
            'options': {
                'a': self.option_a,
                'b': self.option_b,
                'c': self.option_c,
                'd': self.option_d,
            }
        }
        if include_answer:
            data['correct_option'] = self.correct_option
        return data


class ExamResult(db.Model):
    __tablename__ = 'exam_results'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id'), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    time_taken = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), nullable=False, default='Completed')
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.full_name,
            'matric_number': self.student.matric_number,
            'exam_id': self.exam_id,
            'exam_title': self.exam.title,
            'score': self.score,
            'total_questions': self.total_questions,
            'percentage': round((self.score / self.total_questions) * 100, 2) if self.total_questions > 0 else 0,
            'time_taken': self.time_taken,
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat()
        }


class ProctoringFlag(db.Model):
    __tablename__ = 'proctoring_flags'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id'), nullable=False)
    violation_type = db.Column(db.String(100), nullable=False)
    warning_number = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'exam_id': self.exam_id,
            'violation_type': self.violation_type,
            'warning_number': self.warning_number,
            'timestamp': self.timestamp.isoformat()
        }