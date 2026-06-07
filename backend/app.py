import os
from dotenv import load_dotenv
load_dotenv()  # loads .env for local dev; has no effect in production if env vars are already set

import cloudinary
import cloudinary.uploader
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    create_access_token, get_jwt_identity, get_jwt,
    jwt_required, JWTManager
)
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datetime import timedelta
from models import db, Student, Lecturer, Exam, Question, ExamResult, ProctoringFlag

# ── UPLOAD CONFIG ─────────────────────────────────────────
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# ── APP INIT ──────────────────────────────────────────────
app = Flask(__name__)

# ── SECRETS (all must be set as environment variables) ────
_secret_key     = os.environ.get('SECRET_KEY')
_jwt_secret_key = os.environ.get('JWT_SECRET_KEY')
_database_url   = os.environ.get('DATABASE_URL')

if not _secret_key:
    raise RuntimeError("SECRET_KEY environment variable is not set")
if not _jwt_secret_key:
    raise RuntimeError("JWT_SECRET_KEY environment variable is not set")
if not _database_url:
    raise RuntimeError("DATABASE_URL environment variable is not set")

app.config['SECRET_KEY'] = _secret_key

# ── DATABASE CONFIG ───────────────────────────────────────
# Normalise URL scheme for psycopg3
if _database_url.startswith("postgres://"):
    _database_url = _database_url.replace("postgres://", "postgresql+psycopg://", 1)
elif _database_url.startswith("postgresql://"):
    _database_url = _database_url.replace("postgresql://", "postgresql+psycopg://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = _database_url

# ── JWT CONFIG ───────────────────────────────────────────
app.config['JWT_SECRET_KEY']           = _jwt_secret_key
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# ── UPLOAD FOLDER ─────────────────────────────────────────
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# ── CLOUDINARY CONFIG ─────────────────────────────────────
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET')
)

# ── EXTENSIONS ────────────────────────────────────────────
db.init_app(app)
jwt = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5173",
    "https://proctor-exam-system.vercel.app"
]}})


# ════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_current_user():
    identity = get_jwt_identity()
    claims   = get_jwt()
    return {
        'id':        int(identity),
        'role':      claims.get('role'),
        'courses':   claims.get('courses', []),   # now a list
        'full_name': claims.get('full_name')
    }

def upload_image(file, public_id):
    """Upload image to Cloudinary if configured, else save locally."""
    if os.environ.get('CLOUDINARY_CLOUD_NAME'):
        result = cloudinary.uploader.upload(
            file,
            folder="proctor_passports",
            public_id=public_id,
            overwrite=True
        )
        return result['secure_url']
    # Local fallback
    filename = secure_filename(f"{public_id}.jpg")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    return f"uploads/{filename}"


# ── AUTO MIGRATION ────────────────────────────────────────
def run_migrations():
    try:
        from sqlalchemy import text

        db.session.execute(text("""
            ALTER TABLE students
            ADD COLUMN IF NOT EXISTS course VARCHAR(100)
        """))

        # Add new course_names column to lecturers
        db.session.execute(text("""
            ALTER TABLE lecturers
            ADD COLUMN IF NOT EXISTS course_names TEXT
        """))
        db.session.commit()

        # Migrate existing lecturers: wrap their old course_name into the new JSON array
        lecturers_to_migrate = Lecturer.query.filter(
            Lecturer.course_names == None,
            Lecturer.course_name != None
        ).all()
        for lecturer in lecturers_to_migrate:
            lecturer.set_courses([lecturer.course_name])
        db.session.commit()

        print("✅ Migration complete.")
    except Exception as e:
        db.session.rollback()
        print(f"Migration note: {e}")


# ── DB INIT ───────────────────────────────────────────────
# Runs at module load time so it works under gunicorn as well as
# the dev server (gunicorn never reaches `if __name__ == '__main__'`).
with app.app_context():
    try:
        db.create_all()
        run_migrations()
        print("✅ Database connected and tables ready.")
    except Exception as e:
        print(f"⚠️  Database connection failed at startup: {e}")
        print("   Check that your Supabase project is active and DATABASE_URL is correct.")


# ════════════════════════════════════════════════════════════
# SERVE LOCAL UPLOADS
# ════════════════════════════════════════════════════════════

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# ════════════════════════════════════════════════════════════
# AUTH ROUTES
# ════════════════════════════════════════════════════════════

@app.route('/api/student/register', methods=['POST'])
def register_student():
    data = request.form

    if 'passport_photo' not in request.files:
        return jsonify({"msg": "No passport photo provided"}), 400

    file = request.files['passport_photo']
    if file.filename == '':
        return jsonify({"msg": "No file selected"}), 400

    if not all(k in data for k in ['full_name', 'matric_number', 'department', 'level', 'course', 'password']):
        return jsonify({"msg": "Missing required fields"}), 400

    if Student.query.filter_by(matric_number=data['matric_number']).first():
        return jsonify({"msg": "Matric number already exists"}), 409

    if not allowed_file(file.filename):
        return jsonify({"msg": "Invalid file type. Only JPG and PNG allowed."}), 400

    try:
        passport_url = upload_image(file, f"student_{data['matric_number']}")
    except Exception as e:
        return jsonify({"msg": f"Image upload failed: {str(e)}"}), 500

    new_student = Student(
        full_name=data['full_name'],
        matric_number=data['matric_number'],
        department=data['department'].strip(),
        level=data['level'].strip(),
        course=data['course'].strip(),
        passport_photo_path=passport_url
    )
    new_student.set_password(data['password'])
    db.session.add(new_student)
    db.session.commit()
    return jsonify({"msg": "Student registered successfully"}), 201


@app.route('/api/student/login', methods=['POST'])
def login_student():
    data         = request.get_json()
    matric_number = data.get('matric_number')
    password     = data.get('password')

    if not matric_number or not password:
        return jsonify({"msg": "Matric number and password are required"}), 400

    student = Student.query.filter_by(matric_number=matric_number).first()
    if student and student.check_password(password):
        student_course = student.course if student.course else f"{student.department} {student.level}"
        access_token   = create_access_token(
            identity=str(student.id),
            additional_claims={
                'role':      'student',
                'course':    student_course,
                'full_name': student.full_name
            }
        )
        return jsonify(access_token=access_token, user=student.to_dict()), 200

    return jsonify({"msg": "Invalid matric number or password"}), 401


@app.route('/api/lecturer/register', methods=['POST'])
def register_lecturer():
    data = request.get_json()

    if not all(k in data for k in ['full_name', 'email', 'password', 'course_names']):
        return jsonify({"msg": "Missing required fields"}), 400

    if not isinstance(data['course_names'], list) or len(data['course_names']) == 0:
        return jsonify({"msg": "course_names must be a non-empty list"}), 400

    # Sanitise: strip whitespace, remove blanks
    courses = [c.strip() for c in data['course_names'] if c.strip()]
    if not courses:
        return jsonify({"msg": "Please provide at least one valid course name"}), 400

    if Lecturer.query.filter_by(email=data['email']).first():
        return jsonify({"msg": "Email already exists"}), 409

    new_lecturer = Lecturer(
        full_name=data['full_name'],
        email=data['email'],
    )
    new_lecturer.set_courses(courses)
    new_lecturer.set_password(data['password'])
    db.session.add(new_lecturer)
    db.session.commit()
    return jsonify({"msg": "Lecturer registered successfully"}), 201


@app.route('/api/lecturer/login', methods=['POST'])
def login_lecturer():
    data     = request.get_json()
    email    = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"msg": "Email and password are required"}), 400

    lecturer = Lecturer.query.filter_by(email=email).first()
    if lecturer and lecturer.check_password(password):
        access_token = create_access_token(
            identity=str(lecturer.id),
            additional_claims={
                'role':      'lecturer',
                'courses':   lecturer.get_courses(),   # list in JWT
                'full_name': lecturer.full_name
            }
        )
        return jsonify(access_token=access_token, user=lecturer.to_dict()), 200

    return jsonify({"msg": "Invalid email or password"}), 401


# ════════════════════════════════════════════════════════════
# STUDENT ROUTES
# ════════════════════════════════════════════════════════════

@app.route('/api/student/profile', methods=['GET'])
@jwt_required()
def get_student_profile():
    current_user = get_current_user()
    if current_user['role'] != 'student':
        return jsonify({"msg": "Students only!"}), 403

    student = db.session.get(Student, current_user['id'])
    if not student:
        return jsonify({"msg": "Student not found"}), 404

    return jsonify(student.to_dict()), 200


@app.route('/api/exams', methods=['GET'])
@jwt_required()
def get_student_exams():
    current_user = get_current_user()
    if current_user['role'] != 'student':
        return jsonify({"msg": "Access forbidden"}), 403

    student = db.session.get(Student, current_user['id'])
    student_course = (student.course if student.course else f"{student.department} {student.level}").strip()

    exams = Exam.query.filter(
        db.func.lower(Exam.course_name) == student_course.lower()
    ).all()

    result = []
    for exam in exams:
        existing_result = ExamResult.query.filter_by(
            student_id=current_user['id'],
            exam_id=exam.id
        ).first()
        exam_dict                    = exam.to_dict()
        exam_dict['already_taken']   = existing_result is not None
        exam_dict['score']           = existing_result.score           if existing_result else None
        exam_dict['total_questions'] = existing_result.total_questions if existing_result else None
        exam_dict['status']          = existing_result.status          if existing_result else None
        result.append(exam_dict)

    return jsonify(result), 200


@app.route('/api/exam/<int:exam_id>/questions', methods=['GET'])
@jwt_required()
def get_exam_questions(exam_id):
    current_user = get_current_user()

    if current_user['role'] == 'student':
        existing = ExamResult.query.filter_by(
            student_id=current_user['id'],
            exam_id=exam_id
        ).first()
        if existing:
            return jsonify({"msg": "You have already taken this exam."}), 403

    questions = Question.query.filter_by(exam_id=exam_id).all()

    if current_user['role'] == 'student':
        return jsonify([q.to_dict(include_answer=False) for q in questions]), 200
    if current_user['role'] == 'lecturer':
        return jsonify([q.to_dict(include_answer=True) for q in questions]), 200

    return jsonify({"msg": "Unauthorized"}), 403


@app.route('/api/exam/<int:exam_id>/submit', methods=['POST'])
@jwt_required()
def submit_exam(exam_id):
    current_user = get_current_user()
    if current_user['role'] != 'student':
        return jsonify({"msg": "Students only!"}), 403

    if ExamResult.query.filter_by(
        student_id=current_user['id'], exam_id=exam_id
    ).first():
        return jsonify({"msg": "You have already submitted this exam."}), 400

    data      = request.get_json()
    answers   = data.get('answers', {})
    time_taken = data.get('time_taken', 0)
    status    = data.get('status', 'Completed')

    questions = Question.query.filter_by(exam_id=exam_id).all()
    score     = sum(
        1 for q in questions
        if str(q.id) in answers and answers[str(q.id)] == q.correct_option
    )

    exam_result = ExamResult(
        student_id=current_user['id'],
        exam_id=exam_id,
        score=score,
        total_questions=len(questions),
        time_taken=time_taken,
        status=status
    )
    db.session.add(exam_result)
    db.session.commit()

    return jsonify({
        "msg":   "Exam submitted successfully",
        "score": score,
        "total": len(questions)
    }), 200


@app.route('/api/student/results', methods=['GET'])
@jwt_required()
def get_student_results():
    current_user = get_current_user()
    if current_user['role'] != 'student':
        return jsonify({"msg": "Students only!"}), 403

    results = ExamResult.query.filter_by(student_id=current_user['id']).all()
    return jsonify([result.to_dict() for result in results]), 200


# ════════════════════════════════════════════════════════════
# LECTURER ROUTES
# ════════════════════════════════════════════════════════════

@app.route('/api/exam/create', methods=['POST'])
@jwt_required()
def create_exam():
    current_user = get_current_user()
    if current_user['role'] != 'lecturer':
        return jsonify({"msg": "Lecturers only!"}), 403

    data           = request.get_json()
    exam_data      = data.get('exam')
    questions_data = data.get('questions')

    if not exam_data or not questions_data:
        return jsonify({"msg": "Missing exam or questions data"}), 400

    # Validate the chosen course belongs to this lecturer
    selected_course  = exam_data.get('course_name', '').strip()
    lecturer_courses = [c.lower() for c in current_user['courses']]
    if not selected_course or selected_course.lower() not in lecturer_courses:
        return jsonify({"msg": "Invalid course. Please select one of your registered courses."}), 400

    new_exam = Exam(
        title=exam_data['title'],
        course_name=selected_course,
        duration_minutes=exam_data['duration_minutes'],
        lecturer_id=current_user['id']
    )
    db.session.add(new_exam)
    db.session.commit()

    for q_data in questions_data:
        new_question = Question(
            exam_id=new_exam.id,
            question_text=q_data['question_text'],
            option_a=q_data['options']['a'],
            option_b=q_data['options']['b'],
            option_c=q_data['options']['c'],
            option_d=q_data['options']['d'],
            correct_option=q_data['correct_option']
        )
        db.session.add(new_question)

    db.session.commit()
    return jsonify(new_exam.to_dict()), 201


@app.route('/api/lecturer/exams', methods=['GET'])
@jwt_required()
def get_lecturer_exams():
    current_user = get_current_user()
    if current_user['role'] != 'lecturer':
        return jsonify({"msg": "Lecturers only!"}), 403

    exams = Exam.query.filter_by(lecturer_id=current_user['id']).all()
    return jsonify([exam.to_dict() for exam in exams]), 200


@app.route('/api/exam/<int:exam_id>/results', methods=['GET'])
@jwt_required()
def get_exam_results(exam_id):
    current_user = get_current_user()
    if current_user['role'] != 'lecturer':
        return jsonify({"msg": "Lecturers only!"}), 403

    exam = db.session.get(Exam, exam_id)
    if not exam:
        return jsonify({"msg": "Exam not found"}), 404

    results      = ExamResult.query.filter_by(exam_id=exam_id).all()
    results_data = []

    for result in results:
        try:
            student = db.session.get(Student, result.student_id)
            flags   = ProctoringFlag.query.filter_by(
                student_id=result.student_id,
                exam_id=exam_id
            ).all()
            results_data.append({
                'student_id':      result.student_id,
                'student_name':    student.full_name    if student else 'Unknown',
                'matric_number':   student.matric_number if student else 'Unknown',
                'department':      student.department   if student else 'Unknown',
                'level':           student.level        if student else 'Unknown',
                'exam_id':         result.exam_id,
                'exam_title':      exam.title,
                'score':           result.score,
                'total_questions': result.total_questions,
                'percentage':      round((result.score / result.total_questions) * 100, 2) if result.total_questions > 0 else 0,
                'time_taken':      result.time_taken,
                'status':          result.status,
                'submitted_at':    result.submitted_at.isoformat(),
                'flags':           [flag.to_dict() for flag in flags]
            })
        except Exception as e:
            print(f"Error processing result: {e}")
            continue

    return jsonify(results_data), 200


@app.route('/api/exam/<int:exam_id>/questions/full', methods=['GET'])
@jwt_required()
def get_exam_questions_full(exam_id):
    current_user = get_current_user()
    if current_user['role'] != 'lecturer':
        return jsonify({"msg": "Lecturers only!"}), 403

    exam = db.session.get(Exam, exam_id)
    if not exam:
        return jsonify({"msg": "Exam not found"}), 404

    questions = Question.query.filter_by(exam_id=exam_id).all()
    return jsonify({
        'exam_title':       exam.title,
        'course_name':      exam.course_name,
        'duration_minutes': exam.duration_minutes,
        'total_questions':  len(questions),
        'questions':        [q.to_dict(include_answer=True) for q in questions]
    }), 200


@app.route('/api/lecturer/students', methods=['GET'])
@jwt_required()
def get_lecturer_students():
    current_user = get_current_user()
    if current_user['role'] != 'lecturer':
        return jsonify({"msg": "Lecturers only!"}), 403

    lecturer_courses = [c.strip().lower() for c in current_user['courses']]
    all_students     = Student.query.all()
    matched = [
        s.to_dict() for s in all_students
        if (s.course if s.course else f"{s.department} {s.level}").strip().lower() in lecturer_courses
    ]
    return jsonify(matched), 200


@app.route('/api/lecturer/reset-attempt', methods=['POST'])
@jwt_required()
def reset_student_attempt():
    current_user = get_current_user()
    if current_user['role'] != 'lecturer':
        return jsonify({"msg": "Lecturers only!"}), 403

    data       = request.get_json()
    student_id = data.get('student_id')
    exam_id    = data.get('exam_id')

    if not student_id or not exam_id:
        return jsonify({"msg": "student_id and exam_id are required"}), 400

    result = ExamResult.query.filter_by(
        student_id=student_id, exam_id=exam_id
    ).first()
    if result:
        db.session.delete(result)

    ProctoringFlag.query.filter_by(
        student_id=student_id, exam_id=exam_id
    ).delete()

    db.session.commit()
    return jsonify({"msg": "Student attempt reset successfully"}), 200


@app.route('/api/lecturer/student/<int:student_id>/full-report', methods=['GET'])
@jwt_required()
def get_student_full_report(student_id):
    current_user = get_current_user()
    if current_user['role'] != 'lecturer':
        return jsonify({"msg": "Lecturers only!"}), 403

    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"msg": "Student not found"}), 404

    results          = ExamResult.query.filter_by(student_id=student_id).all()
    report           = []
    total_percentage = 0

    for result in results:
        try:
            exam  = db.session.get(Exam, result.exam_id)
            flags = ProctoringFlag.query.filter_by(
                student_id=student_id,
                exam_id=result.exam_id
            ).all()
            percentage        = round((result.score / result.total_questions) * 100, 2) if result.total_questions > 0 else 0
            total_percentage += percentage
            report.append({
                'exam_id':         result.exam_id,
                'exam_title':      exam.title       if exam else 'Unknown',
                'course_name':     exam.course_name if exam else 'Unknown',
                'score':           result.score,
                'total_questions': result.total_questions,
                'percentage':      percentage,
                'time_taken':      result.time_taken,
                'status':          result.status,
                'submitted_at':    result.submitted_at.isoformat(),
                'flags':           [f.to_dict() for f in flags]
            })
        except Exception as e:
            print(f"Error processing student result: {e}")
            continue

    average = round(total_percentage / len(report), 2) if report else 0

    return jsonify({
        'student':           student.to_dict(),
        'total_exams_taken': len(report),
        'average_score':     average,
        'results':           report
    }), 200


# ════════════════════════════════════════════════════════════
# PROCTORING ROUTE
# ════════════════════════════════════════════════════════════

@app.route('/api/proctor/flag', methods=['POST'])
@jwt_required()
def log_proctoring_flag():
    current_user = get_current_user()
    if current_user['role'] != 'student':
        return jsonify({"msg": "Students only!"}), 403

    data = request.get_json()
    if not all(k in data for k in ['exam_id', 'violation_type', 'warning_number']):
        return jsonify({"msg": "Missing required fields"}), 400

    flag = ProctoringFlag(
        student_id=current_user['id'],
        exam_id=data['exam_id'],
        violation_type=data['violation_type'],
        warning_number=data['warning_number']
    )
    db.session.add(flag)
    db.session.commit()
    return jsonify({"msg": "Violation logged successfully"}), 201


# ════════════════════════════════════════════════════════════
# ADMIN ROUTES
# ════════════════════════════════════════════════════════════

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    students  = Student.query.all()
    lecturers = Lecturer.query.all()
    return jsonify({
        'total_students':  len(students),
        'total_lecturers': len(lecturers),
        'students':        [s.to_dict() for s in students],
        'lecturers':       [l.to_dict() for l in lecturers]
    }), 200


@app.route('/api/admin/exams', methods=['GET'])
def get_all_exams():
    exams   = Exam.query.all()
    results = ExamResult.query.all()
    flags   = ProctoringFlag.query.all()
    return jsonify({
        'total_exams':        len(exams),
        'total_submissions':  len(results),
        'total_flags':        len(flags),
        'exams':              [e.to_dict() for e in exams],
        'results':            [r.to_dict() for r in results],
        'flags':              [f.to_dict() for f in flags]
    }), 200


@app.route('/api/admin/debug-students', methods=['GET'])
def debug_students():
    students = Student.query.all()
    return jsonify([{
        'id':             s.id,
        'full_name':      s.full_name,
        'matric_number':  s.matric_number,
        'department':     s.department,
        'level':          s.level,
        'course':         s.course,
        'computed_course': s.course if s.course else f"{s.department} {s.level}"
    } for s in students]), 200


# ════════════════════════════════════════════════════════════
# RUN (local dev only — gunicorn does not use this block)
# ════════════════════════════════════════════════════════════

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)