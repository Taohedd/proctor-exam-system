import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CreateExamPage = () => {
    const [examDetails, setExamDetails] = useState({ title: '', duration_minutes: '' });
    const [questions, setQuestions] = useState([{
        question_text: '',
        options: { a: '', b: '', c: '', d: '' },
        correct_option: 'a'
    }]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
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
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Create New Exam</h1>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">Exam Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Exam Title</label>
                            <input type="text" name="title" value={examDetails.title} onChange={handleExamDetailChange} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                            <input type="number" name="duration_minutes" value={examDetails.duration_minutes} onChange={handleExamDetailChange} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                        </div>
                    </div>
                </div>

                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Question {qIndex + 1}</h3>
                            {questions.length > 1 && (
                                <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:text-red-700 font-semibold">Remove</button>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Question Text</label>
                                <textarea name="question_text" value={q.question_text} onChange={(e) => handleQuestionChange(qIndex, e)} rows="3" className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required></textarea>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['a', 'b', 'c', 'd'].map(optionKey => (
                                    <div key={optionKey}>
                                        <label className="block text-sm font-medium text-gray-700">Option {optionKey.toUpperCase()}</label>
                                        <input type="text" value={q.options[optionKey]} onChange={(e) => handleOptionChange(qIndex, optionKey, e)} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                                <select name="correct_option" value={q.correct_option} onChange={(e) => handleQuestionChange(qIndex, e)} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3">
                                    <option value="a">Option A</option>
                                    <option value="b">Option B</option>
                                    <option value="c">Option C</option>
                                    <option value="d">Option D</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="flex justify-between items-center">
                    <button type="button" onClick={addQuestion} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                        + Add Question
                    </button>
                    <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded disabled:bg-gray-400">
                        {submitting ? 'Creating...' : 'Create Exam'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateExamPage;