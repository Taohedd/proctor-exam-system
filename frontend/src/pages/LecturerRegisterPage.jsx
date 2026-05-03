import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const LecturerRegisterPage = () => {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        course_name: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post('/lecturer/register', formData);
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Registration failed.');
        }
    };

    return (
        <div className="flex items-center justify-center mt-10">
            <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">Lecturer Registration</h2>

                {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded">{error}</p>}
                {success && <p className="text-green-500 text-center bg-green-100 p-3 rounded">{success}</p>}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <input name="full_name" type="text" required onChange={handleChange} className="w-full px-3 py-2 mt-1 border rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <input name="email" type="email" required onChange={handleChange} className="w-full px-3 py-2 mt-1 border rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input name="password" type="password" required onChange={handleChange} className="w-full px-3 py-2 mt-1 border rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Course Name (e.g., Computer Science 100)</label>
                        <input name="course_name" type="text" required onChange={handleChange} className="w-full px-3 py-2 mt-1 border rounded-md" />
                    </div>
                    <button type="submit" className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                        Register
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