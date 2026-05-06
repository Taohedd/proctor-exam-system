import os
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

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-very-secret-key-that-no-one-can-guess'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'another-super-secret-key'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

db.init_app(app)
jwt = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5173",
    "https://proctor-exam-system.vercel.app"
]}})
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_current_user():
    identity = get_jwt_identity()
    claims = get_jwt()
    return {
        'id': int(identity),
        'role': claims.get('role'),
        'course': claims.get('course'),
        'full_name': claims.get('full_name')
    }

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/')
def home():
    return {"status": "Backend is running successfully"}, 200


# ─── AUTHENTICATION ROUTES ───────────────────────────────────────

@app.route('/api/student/register', methods=['POST'])
def register_student():
    data = request.form
    if 'passport_photo' not in request.files:
        return jsonify({"msg": "No passport photo provided"}), 400

    file = request.files['passport_photo']
    if file.filename == '':
        return jsonify({"msg": "No file selected"}), 400

    if not all(k in data for k in ['full_name', 'matric_number', 'course', 'password']):
        return jsonify({"msg": "Missing required fields"}), 400

    if Student.query.filter_by(matric_number=data['matric_number']).first():
        return jsonify({"msg": "Matric number already exists"}), 409

    # Split course into department and level
    # e.g. "Computer Science 100" -> department="Computer Science", level="100"
    course = data['course'].strip()
    try:
        department, level = course.rsplit(' ', 1)
    except ValueError:
        return jsonify({"msg": "Course format must be e.g. 'Computer Science 100'"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(f"student_{data['matric_number']}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        new_student = Student(
            full_name=data['full_name'],
            matric_number=data['matric_number'],
            department=department,
            level=level,
            passport_photo_path=f'uploads/{filename}'
        )
        new_student.set_password(data['password'])
        db.session.add(new_student)
        db.session.commit()
        return jsonify({"msg": "Student registered successfully"}), 201
    else:
        return jsonify({"msg": "Invalid file type"}), 400


@app.route('/api/student/login', methods=['POST'])
def login_student():
    data = request.get_json()
    matric_number = data.get('matric_number')
    password = data.get('password')

    student = Student.query.filter_by(matric_number=matric_number).first()
    if student and student.check_password(password):
        access_token = create_access_token(
            identity=str(student.id),
            additional_claims={
                'role': 'student',
                'course': f"{student.department} {student.level}",
                'full_name': student.full_name
            }
        )
        return jsonify(access_token=access_token, user=student.to_dict()), 200

    return jsonify({"msg": "Bad matric number or password"}), 401


@app.route('/api/lecturer/register', methods=['POST'])
def register_lecturer():
    data = request.get_json()
    if not all(k in data for k in ['full_name', 'email', 'password', 'course_name']):
        return jsonify({"msg": "Missing required fields"}), 400

    if Lecturer.query.filter_by(email=data['email']).first():
        return jsonify({"msg": "Email already exists"}), 409

    new_lecturer = Lecturer(
        full_name=data['full_name'],
        email=data['email'],
        course_name=data['course_name']
    )
    new_lecturer.set_password(data['password'])
    db.session.add(new_lecturer)
    db.session.commit()
    return jsonify({"msg": "Lecturer registered successfully"}), 201


@app.route('/api/lecturer/login', methods=['POST'])
def login_lecturer():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    lecturer = Lecturer.query.filter_by(email=email).first()
    if lecturer and lecturer.check_password(password):
        access_token = create_access_token(
            identity=str(lecturer.id),
            additional_claims={
                'role': 'lecturer',
                'course': lecturer.course_name,
                'full_name': lecturer.full_name
            }
        )
        return jsonify(access_token=access_token, user=lecturer.to_dict()), 200

    return jsonify({"msg": "Bad email or password"}), 401


# ─── STUDENT ROUTES ──────────────────────────────────────────────

@app.route('/api/student/profile', methods=['GET'])
@jwt_required()
def get_student_profile():
    current_user = get_current_user()
    if current_user['role'] != 'student':
        return jsonify({"msg": "Students only!"}), 403

    student = Student.query.get(current_user['id'])
    if not student:
        return jsonify({"msg": "Student not found"}), 404

    return jsonify(student.to_dict()), 200


@app.route('/api/exams', methods=['GET'])
@jwt_required()
def get_student_exams():
    current_user = get_current_user()
    if current_user['role'] != 'student':
        return jsonify({"msg": "Access forbidden"}), 403

    student = Student.query.get(current_user['id'])
    student_course = f"{student.department} {student.level}"

    exams = Exam.query.filter_by(course_name=student_course).all()
    return jsonify([exam.to_dict() for exam in exams]), 200


@app.route('/api/exam/<int:exam_id>/questions', methods=['GET'])
@jwt_required()
def get_exam_questions(exam_id):
    current_user = get_current_user()
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

    data = request.get_json()
    answers = data.get('answers', {})
    time_taken = data.get('time_taken', 0)
    status = data.get('status', 'Completed')

    if ExamResult.query.filter_by(
        student_id=current_user['id'], exam_id=exam_id
    ).first():
        return jsonify({"msg": "You have already submitted this exam."}), 400

    questions = Question.query.filter_by(exam_id=exam_id).all()
    score = 0
    for q in questions:
        if str(q.id) in answers and answers[str(q.id)] == q.correct_option:
            score += 1

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
        "msg": "Exam submitted successfully",
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


# ─── LECTURER ROUTES ─────────────────────────────────────────────

@app.route('/api/exam/create', methods=['POST'])
@jwt_required()
def create_exam():
    current_user = get_current_user()
    if current_user['role'] != 'lecturer':
        return jsonify({"msg": "Lecturers only!"}), 403

    data = request.get_json()
    exam_data = data.get('exam')
    questions_data = data.get('questions')

    if not exam_data or not questions_data:
        return jsonify({"msg": "Missing exam or questions data"}), 400

    new_exam = Exam(
        title=exam_data['title'],
        course_name=current_user['course'],
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

    exam = Exam.query.filter_by(
        id=exam_id, lecturer_id=current_user['id']
    ).first()
    if not exam:
        return jsonify({"msg": "Exam not found or not authorized."}), 404

    results = ExamResult.query.filter_by(exam_id=exam_id).all()
    results_data = []
    for result in results:
        flags = ProctoringFlag.query.filter_by(
            student_id=result.student_id, exam_id=exam_id
        ).all()
        result_dict = result.to_dict()
        result_dict['flags'] = [flag.to_dict() for flag in flags]
        results_data.append(result_dict)

    return jsonify(results_data), 200


@app.route('/api/lecturer/students', methods=['GET'])
@jwt_required()
def get_lecturer_students():
    current_user = get_current_user()
    if current_user['role'] != 'lecturer':
        return jsonify({"msg": "Lecturers only!"}), 403

    lecturer_course = current_user['course']
    try:
        department, level = lecturer_course.rsplit(' ', 1)
    except ValueError:
        return jsonify({"msg": "Could not parse course name"}), 500

    students = Student.query.filter_by(
        department=department, level=level
    ).all()
    return jsonify([student.to_dict() for student in students]), 200


# ─── PROCTORING ROUTE ────────────────────────────────────────────

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


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    import os
port = int(os.environ.get("PORT", 5000))
app.run(host="0.0.0.0", port=port)