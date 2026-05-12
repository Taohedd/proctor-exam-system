import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const CreateExamPage = () => {
    const [examDetails, setExamDetails] = useState({ title: '', duration_minutes: '' });
    const [questions, setQuestions] = useState([{
        question_text: '',
        options: { a: '', b: '', c: '', d: '' },
        correct_option: 'a'
    }]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [importMode, setImportMode] = useState('manual');
    const navigate = useNavigate();

    const handleExamDetailChange = (e) => {
        setExamDetails({ ...examDetails, [e.target.name]: e.target.value });
    };

    const handleQuestionChange = (index, e) => {
        const newQuestions = [...questions];
        newQuestions[index][e.target.name] = e.target.value;
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex, optionKey, e) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[optionKey] = e.target.value;
        setQuestions(newQuestions);
    };

    const addQuestion = () => {
        setQuestions([...questions, {
            question_text: '',
            options: { a: '', b: '', c: '', d: '' },
            correct_option: 'a'
        }]);
    };

    const removeQuestion = (index) => {
        if (questions.length > 1) {
            setQuestions(questions.filter((_, i) => i !== index));
        }
    };

    // ── EXCEL IMPORT ─────────────────────────────────────
    const handleExcelImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError('');
        setSuccess('');

        try {
            const XLSX = await import('xlsx');
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const workbook = XLSX.read(evt.target.result, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    const dataRows = rows.slice(1).filter(row => row.length >= 6);

                    if (dataRows.length === 0) {
                        setError('No valid questions found. Please check the Excel format.');
                        return;
                    }

                    const imported = dataRows.map(row => ({
                        question_text: String(row[0] || '').trim(),
                        options: {
                            a: String(row[1] || '').trim(),
                            b: String(row[2] || '').trim(),
                            c: String(row[3] || '').trim(),
                            d: String(row[4] || '').trim(),
                        },
                        correct_option: String(row[5] || 'a').trim().toLowerCase()
                    })).filter(q =>
                        q.question_text && q.options.a && q.options.b &&
                        q.options.c && q.options.d &&
                        ['a', 'b', 'c', 'd'].includes(q.correct_option)
                    );

                    if (imported.length === 0) {
                        setError('Could not parse any valid questions. Please check the format.');
                        return;
                    }

                    setQuestions(imported);
                    setSuccess(`✅ Successfully imported ${imported.length} question(s)!`);
                    setImportMode('manual');
                } catch (err) {
                    setError('Failed to read file. Please ensure it is a valid .xlsx file.');
                }
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            setError('Excel library failed to load. Please try again.');
        }
    };

    // ── DOWNLOAD TEMPLATE ────────────────────────────────
    const downloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx');
            const templateData = [
                ['Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer (a/b/c/d)'],
                ['What does CPU stand for?', 'Central Processing Unit', 'Computer Personal Unit', 'Central Peripheral Unit', 'Core Processing Utility', 'a'],
                ['Which is an operating system?', 'Microsoft Word', 'Google Chrome', 'Windows 11', 'VLC Media Player', 'c'],
                ['What does RAM stand for?', 'Read Access Memory', 'Random Access Memory', 'Rapid Application Module', 'Random Application Memory', 'b'],
            ];
            const ws = XLSX.utils.aoa_to_sheet(templateData);
            ws['!cols'] = [
                { wch: 40 }, { wch: 25 }, { wch: 25 },
                { wch: 25 }, { wch: 25 }, { wch: 28 }
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Questions');
            XLSX.writeFile(wb, 'ProctorAI_Questions_Template.xlsx');
        } catch (err) {
            alert('Failed to download template. Please try again.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!examDetails.title || !examDetails.duration_minutes) {
            setError('Please fill out all exam details.');
            return;
        }
        for (const q of questions) {
            if (!q.question_text || !q.options.a || !q.options.b || !q.options.c || !q.options.d) {
                setError('Please fill out all fields for every question.');
                return;
            }
        }

        setSubmitting(true);
        try {
            await api.post('/exam/create', { exam: examDetails, questions });
            navigate('/lecturer/dashboard');
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to create exam.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            {submitting && <LoadingSpinner message="Creating exam..." />}

            <h1 className="text-3xl font-bold text-gray-800 mb-6">Create New Exam</h1>

            {error && <p className="text-red-500 bg-red-50 p-3 rounded mb-4">{error}</p>}
            {success && <p className="text-green-600 bg-green-50 p-3 rounded mb-4">{success}</p>}

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Exam Details */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">Exam Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Exam Title</label>
                            <input
                                type="text" name="title" value={examDetails.title}
                                onChange={handleExamDetailChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                            <input
                                type="number" name="duration_minutes" value={examDetails.duration_minutes}
                                onChange={handleExamDetailChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Import Mode Toggle */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">Add Questions</h2>

                    <div className="flex gap-3 mb-6 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setImportMode('manual')}
                            className={`px-4 py-2 rounded font-medium text-sm transition ${
                                importMode === 'manual'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            ✏️ Type Manually
                        </button>
                        <button
                            type="button"
                            onClick={() => setImportMode('excel')}
                            className={`px-4 py-2 rounded font-medium text-sm transition ${
                                importMode === 'excel'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            📊 Import from Excel
                        </button>
                    </div>

                    {/* Excel Import Panel */}
                    {importMode === 'excel' && (
                        <div className="border-2 border-dashed border-green-300 rounded-lg p-6 bg-green-50">
                            <h3 className="font-semibold text-gray-700 mb-1">Import Questions from Excel</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Upload an <strong>.xlsx</strong> file with columns:
                                <span className="font-mono bg-white px-2 py-0.5 rounded ml-1 text-xs border">
                                    Question | Option A | Option B | Option C | Option D | Correct Answer
                                </span>
                            </p>
                            <div className="flex gap-3 flex-wrap items-center">
                                <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition">
                                    📂 Choose Excel File
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleExcelImport}
                                        className="hidden"
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={downloadTemplate}
                                    className="bg-white border border-green-600 text-green-700 hover:bg-green-50 font-semibold py-2 px-4 rounded transition text-sm"
                                >
                                    ⬇️ Download Template
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-3">
                                💡 Correct Answer must be: a, b, c, or d (lowercase). Row 1 is treated as header and skipped.
                            </p>
                        </div>
                    )}
                </div>

                {/* Questions */}
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-700">Question {qIndex + 1}</h3>
                            {questions.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeQuestion(qIndex)}
                                    className="text-red-500 hover:text-red-700 font-semibold text-sm"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Question Text</label>
                                <textarea
                                    name="question_text"
                                    value={q.question_text}
                                    onChange={(e) => handleQuestionChange(qIndex, e)}
                                    rows="2"
                                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['a', 'b', 'c', 'd'].map(optionKey => (
                                    <div key={optionKey}>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Option {optionKey.toUpperCase()}
                                            {q.correct_option === optionKey && (
                                                <span className="ml-2 text-green-600 text-xs font-bold">✓ Correct</span>
                                            )}
                                        </label>
                                        <input
                                            type="text"
                                            value={q.options[optionKey]}
                                            onChange={(e) => handleOptionChange(qIndex, optionKey, e)}
                                            className={`mt-1 block w-full border rounded-md py-2 px-3 ${
                                                q.correct_option === optionKey
                                                    ? 'border-green-400 bg-green-50'
                                                    : 'border-gray-300'
                                            }`}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                                <select
                                    name="correct_option"
                                    value={q.correct_option}
                                    onChange={(e) => handleQuestionChange(qIndex, e)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3"
                                >
                                    <option value="a">Option A</option>
                                    <option value="b">Option B</option>
                                    <option value="c">Option C</option>
                                    <option value="d">Option D</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="flex justify-between items-center pb-8">
                    <button
                        type="button"
                        onClick={addQuestion}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                    >
                        + Add Question
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{questions.length} question(s)</span>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded disabled:bg-gray-400 flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Creating...
                                </>
                            ) : 'Create Exam'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateExamPage;