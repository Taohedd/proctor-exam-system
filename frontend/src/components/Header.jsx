import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

const Header = () => {
    const { isAuthenticated, logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getUserInfo = () => {
        if (user) return { name: user.full_name, role: user.role };
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                return { name: decoded.sub.full_name, role: decoded.sub.role };
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    const userInfo = getUserInfo();
    const dashboardLink = userInfo?.role === 'student' ? '/student/dashboard' : '/lecturer/dashboard';

    return (
        <header className="bg-white shadow-md">
            <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
                <Link to={isAuthenticated ? dashboardLink : "/login"} className="text-2xl font-bold text-indigo-600">
                    ProctorAI
                </Link>
                <div className="flex items-center space-x-4">
                    {isAuthenticated ? (
                        <>
                            <span className="text-gray-700">Welcome, {userInfo?.name || 'User'}!</span>
                            <button
                                onClick={handleLogout}
                                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md transition duration-300"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-gray-600 hover:text-indigo-600">Login</Link>
                            <Link to="/register/student" className="text-gray-600 hover:text-indigo-600">Register</Link>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
};

export default Header;