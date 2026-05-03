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
        const totalPercentage = results.reduce((acc, result) => acc + result.percentage, 0);
        return (totalPercentage / results.length).toFixed(2);
    };

    if (loading) return <div className="text-center mt-8">Loading results...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">My Exam Results</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold">Performance Summary</h2>
                <p className="text-lg text-gray-700 mt-2">
                    Average Score: <span className="font-bold text-indigo-600">{calculateAverage()}%</span>
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Detailed Results</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Submitted</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {results.length > 0 ? (
                                results.map((result, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{result.exam_title}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{result.score} / {result.total_questions}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{result.percentage}%</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${result.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {result.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(result.submitted_at).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No results found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="mt-8 text-center">
                <Link to="/student/dashboard" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                    &larr; Back to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default StudentResultsPage;