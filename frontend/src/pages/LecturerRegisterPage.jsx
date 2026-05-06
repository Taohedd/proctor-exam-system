import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const LecturerRegisterPage = () => {
    const [formData, setFormData] = useState({
        full_name: '', email: '', password: '', course_name: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await api.post('/lecturer/register', formData);
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center mt-10">
            {loading && <LoadingSpinner message="Creating your account..." />}

            <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">Lecturer Registration</h2>

                {error && <p className="text-red-500 text-center bg-red-50 p-3 rounded">{error}</p>}
                {success && <p className="text-green-600 text-center bg-green-50 p-3 rounded">{success}</p>}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <input name="full_name" type="text" required onChange={handleChange}
                            className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <input name="email" type="email" required onChange={handleChange}
                            className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input name="password" type="password" required onChange={handleChange}
                            className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Course Name <span className="text-gray-400 text-xs">(e.g. Computer Science 100)</span>
                        </label>
                        <input name="course_name" type="text" required onChange={handleChange}
                            placeholder="e.g. Computer Science 100"
                            className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 font-semibold transition flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Registering...
                            </>
                        ) : 'Register'}
                    </button>
                </form>

                <p className="text-sm text-center text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Login here</Link>
                </p>
            </div>
        </div>
    );
};

export default LecturerRegisterPage;