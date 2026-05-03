import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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

    if (loading) return <div className="text-center mt-10">Loading...</div>;
    if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Student Dashboard</h1>
                <Link to="/student/results" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300">
                    View My Results
                </Link>
            </div>
            <p className="text-lg text-gray-600 mb-8">Welcome, {user?.full_name}! Here are your available exams.</p>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Available Exams</h2>
                {exams.length > 0 ? (
                    <div className="space-y-4">
                        {exams.map((exam) => (
                            <div key={exam.id} className="p-4 border rounded-lg flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-indigo-700">{exam.title}</h3>
                                    <p className="text-gray-600">{exam.course_name}</p>
                                    <p className="text-sm text-gray-500">Duration: {exam.duration_minutes} minutes</p>
                                </div>
                                <Link
                                    to={`/student/exam/${exam.id}`}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                                >
                                    Start Exam
                                </Link>
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