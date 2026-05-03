import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const ExamReportPage = () => {
    const { examId } = useParams();
    const [results, setResults] = useState([]);
    const [examTitle, setExamTitle] = useState('Exam Report');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await api.get(`/exam/${examId}/results`);
                setResults(response.data);
                if (response.data.length > 0) {
                    setExamTitle(response.data[0].exam_title);
                }
            } catch (err) {
                setError('Failed to fetch exam report.');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [examId]);

    if (loading) return <div className="text-center mt-8">Loading report...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{examTitle}</h1>
            <p className="text-xl text-gray-600 mb-6">Student Performance & Proctoring Report</p>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matric No.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flags</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {results.length > 0 ? (
                                results.map((result, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{result.student_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{result.matric_number}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{result.score} / {result.total_questions} ({result.percentage}%)</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${result.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {result.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-red-600">{result.flags.length}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <button onClick={() => setSelectedStudent(result)} className="text-indigo-600 hover:text-indigo-900">
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No students have taken this exam yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8">
                <Link to="/lecturer/dashboard" className="text-indigo-600 hover:text-indigo-800 font-semibold">&larr; Back to Dashboard</Link>
            </div>

            {selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Report for {selectedStudent.student_name}</h2>
                            <button onClick={() => setSelectedStudent(null)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {selectedStudent.flags.length > 0 ? (
                                <ul className="space-y-3">
                                    {selectedStudent.flags.map((flag, i) => (
                                        <li key={i} className="p-3 bg-red-50 border border-red-200 rounded-md">
                                            <p className="font-semibold text-red-800">Warning #{flag.warning_number}: <span className="font-normal">{flag.violation_type}</span></p>
                                            <p className="text-sm text-gray-600">{new Date(flag.timestamp).toLocaleString()}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-600 text-center py-4">No proctoring flags recorded.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamReportPage;