import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

const LecturerDashboard = () => {
    const [exams, setExams] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examsResponse, studentsResponse] = await Promise.all([
                    api.get('/lecturer/exams'),
                    api.get('/lecturer/students')
                ]);
                setExams(examsResponse.data);
                setStudents(studentsResponse.data);
            } catch (err) {
                setError('Failed to fetch data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="text-center mt-10">Loading...</div>;
    if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Lecturer Dashboard</h1>
                <Link to="/lecturer/create-exam" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-300">
                    + Create New Exam
                </Link>
            </div>
            <p className="text-lg text-gray-600 mb-8">
                Welcome, {user?.full_name}! Course: <span className="font-semibold">{user?.course_name}</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">My Exams ({exams.length})</h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {exams.length > 0 ? (
                            exams.map((exam) => (
                                <div key={exam.id} className="p-4 border rounded-lg flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">{exam.title}</h3>
                                        <p className="text-sm text-gray-500">Duration: {exam.duration_minutes} mins</p>
                                    </div>
                                    <Link
                                        to={`/lecturer/exam/${exam.id}/report`}
                                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded text-sm"
                                    >
                                        View Report
                                    </Link>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">You have not created any exams yet.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">Students in Course ({students.length})</h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {students.length > 0 ? (
                            students.map((student) => (
                                <div key={student.id} className="p-4 border rounded-lg flex items-center space-x-4">
                                    <img
                                        src={
    student.passport_photo_path?.startsWith('http')
        ? student.passport_photo_path
        : `https://proctor-exam-system.onrender.com/${student.passport_photo_path}`
}
                                        alt={student.full_name}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">{student.full_name}</h3>
                                        <p className="text-sm text-gray-500">{student.matric_number}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No students registered for this course yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LecturerDashboard;
