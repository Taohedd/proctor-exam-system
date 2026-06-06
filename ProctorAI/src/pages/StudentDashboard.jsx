import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/footer';

const StudentDashboard = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await api.get('/exams');
                setExams(response.data);
            } catch (err) {
                setError('Failed to fetch exams. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    if (loading) return <div className="text-center mt-10 text-lg">Loading...</div>;
    if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Student Dashboard</h1>
                <Link
                    to="/student/results"
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300"
                >
                    View My Results
                </Link>
            </div>

            <p className="text-lg text-gray-600 mb-8">
                Welcome, <span className="font-semibold">{user?.full_name}</span>! Here are your available exams.
            </p>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Available Exams</h2>
                {exams.length > 0 ? (
                    <div className="space-y-4">
                        {exams.map((exam) => (
                            <div key={exam.id} className="p-4 border rounded-lg flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-indigo-700">{exam.title}</h3>
                                    <p className="text-gray-600">{exam.course_name}</p>
                                    <p className="text-sm text-gray-500">Duration: {exam.duration_minutes} minutes</p>
                                    {exam.already_taken && (
                                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                                exam.status === 'Completed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {exam.status}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                Score: {exam.score}/{exam.total_questions} &nbsp;|&nbsp;
                                                {exam.total_questions > 0
                                                    ? `${Math.round((exam.score / exam.total_questions) * 100)}%`
                                                    : '0%'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {exam.already_taken ? (
                                    <div className="text-right">
                                        <span className="inline-block bg-gray-200 text-gray-500 font-semibold py-2 px-4 rounded cursor-not-allowed">
                                            Already Taken
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Contact your lecturer to reset
                                        </p>
                                    </div>
                                ) : (
                                    <Link
                                        to={`/student/exam/${exam.id}`}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                                    >
                                        Start Exam
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No exams are currently available for your course.</p>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;