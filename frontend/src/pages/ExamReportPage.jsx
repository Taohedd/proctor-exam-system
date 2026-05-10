import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const ExamReportPage = () => {
    const { examId } = useParams();
    const [results, setResults] = useState([]);
    const [examTitle, setExamTitle] = useState('Exam Report');
    const [examCourse, setExamCourse] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [resetting, setResetting] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [showQuestions, setShowQuestions] = useState(false);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [downloadingReport, setDownloadingReport] = useState(null);

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

    useEffect(() => { fetchReport(); }, [examId]);

    // ── VIEW QUESTIONS ────────────────────────────────────
    const handleViewQuestions = async () => {
        if (questions.length > 0) {
            setShowQuestions(true);
            return;
        }
        setLoadingQuestions(true);
        try {
            const response = await api.get(`/exam/${examId}/questions/full`);
            const data = response.data;
            if (!data.questions || data.questions.length === 0) {
                alert('No questions found for this exam.');
                return;
            }
            setQuestions(data.questions);
            setExamTitle(data.exam_title || examTitle);
            setExamCourse(data.course_name || '');
            setShowQuestions(true);
        } catch (err) {
            console.error('Failed to load questions:', err);
            const msg = err.response?.data?.msg || 'Failed to load questions. Please try again.';
            alert(msg);
        } finally {
            setLoadingQuestions(false);
        }
    };

    // ── RESET ATTEMPT ─────────────────────────────────────
    const handleResetAttempt = async (studentId, studentName, eId) => {
        const confirmed = window.confirm(
            `Reset ${studentName}'s attempt?\n\nTheir score and flags will be deleted and they can retake the exam.`
        );
        if (!confirmed) return;
        setResetting(studentId);
        try {
            await api.post('/lecturer/reset-attempt', {
                student_id: studentId,
                exam_id: parseInt(eId)
            });
            alert(`✅ ${studentName}'s attempt has been reset.`);
            await fetchReport();
        } catch (err) {
            alert('Failed to reset attempt. Please try again.');
        } finally {
            setResetting(null);
        }
    };

    // ── DOWNLOAD INDIVIDUAL STUDENT REPORT ───────────────
    const handleDownloadStudentReport = async (studentId, studentName) => {
        if (!studentId) {
            alert('Student ID is missing. Please refresh the page and try again.');
            return;
        }

        setDownloadingReport(studentId);
        try {
            const XLSX = await import('xlsx');
            const response = await api.get(`/lecturer/student/${studentId}/full-report`);
            const data = response.data;
            const student = data.student;
            const allResults = data.results;

            if (!student || !allResults) {
                alert('No report data found for this student.');
                return;
            }

            const wb = XLSX.utils.book_new();

            // ── Sheet 1: Summary ──────────────────────────
            const summaryData = [
                ['STUDENT PERFORMANCE REPORT — ProctorAI'],
                [],
                ['Student Name', student.full_name],
                ['Matric Number', student.matric_number],
                ['Department', student.department],
                ['Level', student.level],
                ['Course', `${student.department} ${student.level}`],
                [],
                ['OVERALL SUMMARY'],
                ['Total Exams Taken', data.total_exams_taken],
                ['Average Score', `${data.average_score}%`],
                ['Report Generated', new Date().toLocaleString()],
                [],
                ['ALL EXAM RESULTS'],
                ['Exam Title', 'Course', 'Score', 'Total', 'Percentage', 'Status', 'Time Taken (s)', 'Submitted At', 'Flags'],
                ...allResults.map(r => [
                    r.exam_title,
                    r.course_name,
                    r.score,
                    r.total_questions,
                    `${r.percentage}%`,
                    r.status,
                    r.time_taken,
                    new Date(r.submitted_at).toLocaleString(),
                    r.flags.length
                ])
            ];

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            wsSummary['!cols'] = [
                { wch: 28 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
                { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 8 }
            ];
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // ── One sheet per exam ────────────────────────
            allResults.forEach((result, idx) => {
                const examData = [
                    [`EXAM: ${result.exam_title}`],
                    ['Course', result.course_name],
                    ['Score', `${result.score} / ${result.total_questions}`],
                    ['Percentage', `${result.percentage}%`],
                    ['Status', result.status],
                    ['Time Taken', `${result.time_taken} seconds`],
                    ['Submitted At', new Date(result.submitted_at).toLocaleString()],
                    [],
                    ['PROCTORING FLAGS'],
                ];

                if (result.flags.length === 0) {
                    examData.push(['No violations recorded for this exam.']);
                } else {
                    examData.push(['Warning #', 'Violation Type', 'Timestamp']);
                    result.flags.forEach(f => {
                        examData.push([
                            `Warning #${f.warning_number}`,
                            f.violation_type,
                            new Date(f.timestamp).toLocaleString()
                        ]);
                    });
                }

                const wsExam = XLSX.utils.aoa_to_sheet(examData);
                wsExam['!cols'] = [{ wch: 15 }, { wch: 42 }, { wch: 26 }];
                const sheetName = `Exam ${idx + 1}`.substring(0, 31);
                XLSX.utils.book_append_sheet(wb, wsExam, sheetName);
            });

            const fileName = `${student.full_name.replace(/\s+/g, '_')}_Full_Report.xlsx`;
            XLSX.writeFile(wb, fileName);

        } catch (err) {
            console.error('Report download failed:', err);
            const msg = err.response?.data?.msg || err.message || 'Failed to generate student report.';
            alert(`Error: ${msg}`);
        } finally {
            setDownloadingReport(null);
        }
    };

    // ── DOWNLOAD ALL STUDENTS ─────────────────────────────
    const handleDownloadAllReport = async () => {
        if (results.length === 0) {
            alert('No results to download yet.');
            return;
        }
        try {
            const XLSX = await import('xlsx');
            const allData = [
                [`Exam Report: ${examTitle}`],
                ['Generated', new Date().toLocaleString()],
                [],
                ['Student Name', 'Matric No.', 'Score', 'Total', 'Percentage', 'Status', 'Time (s)', 'Flags', 'Submitted'],
                ...results.map(r => [
                    r.student_name,
                    r.matric_number,
                    r.score,
                    r.total_questions,
                    `${r.percentage}%`,
                    r.status,
                    r.time_taken,
                    r.flags.length,
                    new Date(r.submitted_at).toLocaleString()
                ])
            ];
            const ws = XLSX.utils.aoa_to_sheet(allData);
            ws['!cols'] = [
                { wch: 25 }, { wch: 18 }, { wch: 8 }, { wch: 8 },
                { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 8 }, { wch: 24 }
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'All Results');
            XLSX.writeFile(wb, `${examTitle.replace(/\s+/g, '_')}_Results.xlsx`);
        } catch (err) {
            console.error('Download all failed:', err);
            alert('Failed to download report. Please try again.');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center mt-20">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                <p className="mt-3 text-gray-500">Loading report...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="text-center mt-8 text-red-500 bg-red-50 p-4 rounded max-w-lg mx-auto">
            <p className="font-semibold">{error}</p>
            <button onClick={fetchReport} className="mt-3 text-sm text-indigo-600 underline">Try again</button>
        </div>
    );

    return (
        <div className="container mx-auto p-4">

            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-3 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{examTitle}</h1>
                    {examCourse && <p className="text-gray-500 mt-1">{examCourse}</p>}
                    <p className="text-gray-400 text-sm mt-1">Student Performance & Proctoring Report</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={handleViewQuestions}
                        disabled={loadingQuestions}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded text-sm transition flex items-center gap-2 disabled:bg-indigo-400"
                    >
                        {loadingQuestions ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Loading...
                            </>
                        ) : '📋 View Questions'}
                    </button>
                    <button
                        onClick={handleDownloadAllReport}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded text-sm transition"
                    >
                        ⬇️ Download All Results
                    </button>
                </div>
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

            {/* Results Table */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matric No.</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flags</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {results.length > 0 ? (
                                results.map((result, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{result.student_name}</td>
                                        <td className="px-4 py-4 text-sm text-gray-500">{result.matric_number}</td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            <span className="font-semibold">{result.score}/{result.total_questions}</span>
                                            <span className="ml-1 text-gray-400 text-xs">({result.percentage}%)</span>
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
                                        <td className="px-4 py-4 text-sm font-semibold">
                                            <span className={result.flags.length > 0 ? 'text-red-600' : 'text-gray-400'}>
                                                {result.flags.length} {result.flags.length > 0 ? '⚠️' : ''}
                                            </span>
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
                                                    onClick={() => handleDownloadStudentReport(result.student_id, result.student_name)}
                                                    disabled={downloadingReport === result.student_id}
                                                    className="text-green-600 hover:text-green-800 font-medium underline disabled:text-gray-400 flex items-center gap-1"
                                                >
                                                    {downloadingReport === result.student_id ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                                            Generating...
                                                        </>
                                                    ) : '⬇️ Report'}
                                                </button>
                                                <button
                                                    onClick={() => handleResetAttempt(result.student_id, result.student_name, examId)}
                                                    disabled={resetting === result.student_id}
                                                    className="text-red-500 hover:text-red-700 font-medium underline disabled:text-gray-400"
                                                >
                                                    {resetting === result.student_id ? 'Resetting...' : 'Reset'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-4 py-12 text-center text-gray-400">
                                        <p className="text-lg">No students have taken this exam yet.</p>
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

            {/* ── VIEW QUESTIONS MODAL ──────────────────── */}
            {showQuestions && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">{examTitle}</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {examCourse && <span className="mr-3">{examCourse}</span>}
                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold">
                                        {questions.length} Questions
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowQuestions(false)}
                                className="text-gray-400 hover:text-gray-700 text-3xl leading-none font-light"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6 space-y-4">
                            {questions.map((q, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-white transition">
                                    <p className="font-semibold text-gray-800 mb-3 flex items-start gap-2">
                                        <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded shrink-0 mt-0.5">
                                            Q{idx + 1}
                                        </span>
                                        <span>{q.question_text}</span>
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-8">
                                        {Object.entries(q.options).map(([key, value]) => (
                                            <div
                                                key={key}
                                                className={`p-2 rounded-lg text-sm flex items-center gap-2 border ${
                                                    q.correct_option === key
                                                        ? 'bg-green-50 border-green-400 text-green-800 font-semibold'
                                                        : 'bg-white border-gray-200 text-gray-700'
                                                }`}
                                            >
                                                <span className={`font-bold text-xs px-1.5 py-0.5 rounded ${
                                                    q.correct_option === key
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {key.toUpperCase()}
                                                </span>
                                                <span className="flex-1">{value}</span>
                                                {q.correct_option === key && (
                                                    <span className="text-green-600 text-xs ml-auto">✓</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setShowQuestions(false)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── FLAG DETAILS MODAL ────────────────────── */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{selectedStudent.student_name}</h2>
                                <p className="text-sm text-gray-500">{selectedStudent.matric_number}</p>
                            </div>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="bg-indigo-50 p-3 rounded-lg text-center">
                                <p className="text-xl font-bold text-indigo-600">{selectedStudent.percentage}%</p>
                                <p className="text-xs text-gray-500 mt-1">Score</p>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg text-center">
                                <p className="text-xl font-bold text-red-500">{selectedStudent.flags.length}</p>
                                <p className="text-xs text-gray-500 mt-1">Violations</p>
                            </div>
                            <div className={`p-3 rounded-lg text-center ${
                                selectedStudent.status === 'Completed' ? 'bg-green-50' : 'bg-orange-50'
                            }`}>
                                <p className={`text-sm font-bold ${
                                    selectedStudent.status === 'Completed' ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                    {selectedStudent.status}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Status</p>
                            </div>
                        </div>

                        <h3 className="font-semibold text-gray-700 mb-3">Proctoring Flags</h3>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {selectedStudent.flags.length > 0 ? (
                                selectedStudent.flags.map((flag, i) => (
                                    <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="font-semibold text-red-800 text-sm">
                                            Warning #{flag.warning_number}:
                                            <span className="font-normal ml-1">{flag.violation_type}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {new Date(flag.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-400">
                                    <p className="text-2xl mb-1">✅</p>
                                    <p>No proctoring flags recorded.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 flex justify-between gap-2">
                            <button
                                onClick={() => {
                                    const student = selectedStudent;
                                    setSelectedStudent(null);
                                    handleResetAttempt(student.student_id, student.student_name, examId);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded transition"
                            >
                                Reset Attempt
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDownloadStudentReport(selectedStudent.student_id, selectedStudent.student_name)}
                                    disabled={downloadingReport === selectedStudent.student_id}
                                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-4 rounded transition disabled:bg-gray-400 flex items-center gap-2"
                                >
                                    {downloadingReport === selectedStudent.student_id ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Generating...
                                        </>
                                    ) : '⬇️ Download Report'}
                                </button>
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2 px-4 rounded transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamReportPage;