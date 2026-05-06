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
    const [resetting, setResetting] = useState(null);

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

    useEffect(() => {
        fetchReport();
    }, [examId]);

    const handleResetAttempt = async (studentId, studentName, examId) => {
        const confirmed = window.confirm(
            `Are you sure you want to reset ${studentName}'s attempt?\n\nThey will be able to retake this exam and their current score and flags will be deleted.`
        );
        if (!confirmed) return;

        setResetting(studentId);
        try {
            await api.post('/lecturer/reset-attempt', {
                student_id: studentId,
                exam_id: parseInt(examId)
            });
            alert(`✅ ${studentName}'s attempt has been reset. They can now retake the exam.`);
            await fetchReport(); // refresh
        } catch (err) {
            alert('Failed to reset attempt. Please try again.');
            console.error(err);
        } finally {
            setResetting(null);
        }
    };

    if (loading) return <div className="text-center mt-8 text-lg">Loading report...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{examTitle}</h1>
                <p className="text-gray-500 mt-1">Student Performance & Proctoring Report</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow text-center">
                    <p className="text-3xl font-bold text-indigo-600">{results.length}</p>
                    <p className="text-gray-500 text-sm mt-1">Total Submissions</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow text-center">
                    <p className="text-3xl font-bold text-green-600">
                        {results.filter(r => r.status === 'Completed').length}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">Completed</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow text-center">
                    <p className="text-3xl font-bold text-red-600">
                        {results.filter(r => r.status !== 'Completed').length}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">Force Submitted</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matric No.</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flags</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {results.length > 0 ? (
                                results.map((result, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{result.student_name}</td>
                                        <td className="px-4 py-4 text-sm text-gray-500">{result.matric_number}</td>
                                        <td className="px-4 py-4 text-sm text-gray-500">
                                            {result.score}/{result.total_questions}
                                            <span className="ml-1 text-gray-400">({result.percentage}%)</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                result.status === 'Completed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {result.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm font-bold text-red-600">
                                            {result.flags.length} {result.flags.length > 0 ? '⚠️' : ''}
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <div className="flex gap-3 flex-wrap">
                                                <button
                                                    onClick={() => setSelectedStudent(result)}
                                                    className="text-indigo-600 hover:text-indigo-900 font-medium underline"
                                                >
                                                    View Flags
                                                </button>
                                                <button
                                                    onClick={() => handleResetAttempt(result.student_id, result.student_name, examId)}
                                                    disabled={resetting === result.student_id}
                                                    className="text-red-500 hover:text-red-700 font-medium underline disabled:text-gray-400"
                                                >
                                                    {resetting === result.student_id ? 'Resetting...' : 'Reset Attempt'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                        No students have taken this exam yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6">
                <Link to="/lecturer/dashboard" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                    &larr; Back to Dashboard
                </Link>
            </div>

            {/* Flag Details Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {selectedStudent.student_name}
                                </h2>
                                <p className="text-sm text-gray-500">{selectedStudent.matric_number}</p>
                            </div>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Student summary */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-gray-50 p-3 rounded text-center">
                                <p className="text-lg font-bold text-indigo-600">{selectedStudent.percentage}%</p>
                                <p className="text-xs text-gray-500">Score</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded text-center">
                                <p className="text-lg font-bold text-red-500">{selectedStudent.flags.length}</p>
                                <p className="text-xs text-gray-500">Violations</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded text-center">
                                <p className={`text-sm font-bold ${selectedStudent.status === 'Completed' ? 'text-green-600' : 'text-red-600'}`}>
                                    {selectedStudent.status}
                                </p>
                                <p className="text-xs text-gray-500">Status</p>
                            </div>
                        </div>

                        <h3 className="font-semibold text-gray-700 mb-3">Proctoring Flags</h3>
                        <div className="max-h-72 overflow-y-auto">
                            {selectedStudent.flags.length > 0 ? (
                                <ul className="space-y-2">
                                    {selectedStudent.flags.map((flag, i) => (
                                        <li key={i} className="p-3 bg-red-50 border border-red-200 rounded-md">
                                            <p className="font-semibold text-red-800 text-sm">
                                                Warning #{flag.warning_number}:
                                                <span className="font-normal ml-1">{flag.violation_type}</span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(flag.timestamp).toLocaleString()}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-6 text-gray-500">
                                    <p>✅ No proctoring flags recorded for this student.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-between items-center">
                            <button
                                onClick={() => {
                                    setSelectedStudent(null);
                                    handleResetAttempt(selectedStudent.student_id, selectedStudent.student_name, examId);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded"
                            >
                                Reset This Attempt
                            </button>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2 px-4 rounded"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamReportPage;