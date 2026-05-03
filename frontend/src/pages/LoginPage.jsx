import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const LoginPage = () => {
    const [role, setRole] = useState('student');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const loginUrl = role === 'student' ? '/student/login' : '/lecturer/login';
        const payload = role === 'student'
            ? { matric_number: identifier, password }
            : { email: identifier, password };

        try {
            const response = await api.post(loginUrl, payload);
            const { access_token, user } = response.data;
            const userData = { ...user, role };
            login(access_token, userData);

            if (role === 'student') {
                navigate('/student/dashboard');
            } else {
                navigate('/lecturer/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.msg || 'An error occurred during login.');
        }
    };

    return (
        <div className="flex items-center justify-center mt-10">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">Login</h2>

                {error && <p className="text-red-500 text-center">{error}</p>}

                <div className="flex justify-center border-b-2">
                    <button
                        className={`px-4 py-2 text-sm font-medium ${role === 'student' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                        onClick={() => setRole('student')}
                    >
                        Student
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium ${role === 'lecturer' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                        onClick={() => setRole('lecturer')}
                    >
                        Lecturer
                    </button>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            {role === 'student' ? 'Matric Number' : 'Email Address'}
                        </label>
                        <input
                            type={role === 'student' ? 'text' : 'email'}
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                        Login
                    </button>
                </form>

                <p className="text-sm text-center text-gray-600">
                    Don't have an account?{' '}
                    <Link to={role === 'student' ? "/register/student" : "/register/lecturer"} className="font-medium text-indigo-600 hover:text-indigo-500">
                        Register here
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;