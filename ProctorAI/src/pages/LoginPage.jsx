import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import footer from '../components/footer';
const LoginPage = () => {
    const [role, setRole] = useState('student');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const loginUrl = role === 'student' ? '/student/login' : '/lecturer/login';
        const payload = role === 'student'
            ? { matric_number: identifier, password }
            : { email: identifier, password };

        try {
            const response = await api.post(loginUrl, payload);
            const { access_token, user } = response.data;
            const userData = { ...user, role };
            login(access_token, userData);
            navigate(role === 'student' ? '/student/dashboard' : '/lecturer/dashboard');
        } catch (err) {
            setError(err.response?.data?.msg || 'An error occurred during login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center mt-10">
            {loading && <LoadingSpinner message="Signing you in..." />}

            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">Login</h2>

                {error && <p className="text-red-500 text-center bg-red-50 p-3 rounded">{error}</p>}

                <div className="flex justify-center border-b-2">
                    <button
                        className={`px-4 py-2 text-sm font-medium transition ${role === 'student' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                        onClick={() => setRole('student')}
                    >
                        Student
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium transition ${role === 'lecturer' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                        onClick={() => setRole('lecturer')}
                    >
                        Lecturer
                    </button>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
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
                        <div className="relative mt-1">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? (
                                    // Eye-off icon
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    // Eye icon
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 font-semibold transition flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Signing in...
                            </>
                        ) : 'Login'}
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