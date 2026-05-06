import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

const StudentResultsPage = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await api.get('/student/results');
                setResults(response.data);
            } catch (err) {
                setError('Failed to fetch results.');
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, []);

    const calculateAverage = () => {
        if (results.length === 0) return 0;
        const total = results.reduce((acc, r) => acc + r.percentage, 0);
        return (total / results.length).toFixed(2);
    };

    const formatTime = (seconds) => {
        if (!seconds) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    if (loading) return <div className="text-center mt-8 text-lg">Loading results...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

    const average = calculateAverage();

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">My Exam Results</h1>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 rounded-lg shadow text-center">
                    <p className="text-4xl font-bold text-indigo-600">{results.length}</p>
                    <p className="text-gray-500 mt-1">Exams Taken</p>
                </div>
                <div className="bg-white p-5 rounded-lg shadow text-center">
                    <p className="text-4xl font-bold text-green-600">{average}%</p>
                    <p className="text-gray-500 mt-1">Average Score</p>
                </div>
                <div className="bg-white p-5 rounded-lg shadow text-center">
                    <p className="text-4xl font-bold text-red-500">
                        {results.filter(r => r.status !== 'Completed').length}
                    </p>
                    <p className="text-gray-500 mt-1">Force Submitted</p>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Detailed Results</h2>
                {results.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Taken</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {results.map((result, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{result.exam_title}</td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {result.score} / {result.total_questions}
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <span className={`font-semibold ${
                                                result.percentage >= 50 ? 'text-green-600' : 'text-red-500'
                                            }`}>
                                                {result.percentage}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-500">
                                            {formatTime(result.time_taken)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                                                result.status === 'Completed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {result.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-500">
                                            {new Date(result.submitted_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-lg">You have not taken any exams yet.</p>
                        <Link to="/student/dashboard" className="text-indigo-600 hover:underline mt-2 inline-block">
                            Go to Dashboard
                        </Link>
                    </div>
                )}
            </div>

            <div className="mt-6">
                <Link to="/student/dashboard" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                    &larr; Back to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default StudentResultsPage;