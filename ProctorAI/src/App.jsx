import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import StudentRegisterPage from './pages/StudentRegisterPage';
import LecturerRegisterPage from './pages/LecturerRegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import LecturerDashboard from './pages/LecturerDashboard';
import ExamPage from './pages/ExamPage';
import CreateExamPage from './pages/CreateExamPage';
import ExamReportPage from './pages/ExamReportPage';
import StudentResultsPage from './pages/StudentResultsPage';
import Header from './components/Header';

const ProtectedRoute = ({ children, role }) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (role && user?.role !== role) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

function App() {
    return (
        <AuthProvider>
            <div className="bg-gray-100 min-h-screen">
                <Header />
                <main className="container mx-auto p-4">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register/student" element={<StudentRegisterPage />} />
                        <Route path="/register/lecturer" element={<LecturerRegisterPage />} />

                        <Route path="/student/dashboard" element={
                            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
                        } />
                        <Route path="/student/exam/:examId" element={
                            <ProtectedRoute role="student"><ExamPage /></ProtectedRoute>
                        } />
                        <Route path="/student/results" element={
                            <ProtectedRoute role="student"><StudentResultsPage /></ProtectedRoute>
                        } />

                        <Route path="/lecturer/dashboard" element={
                            <ProtectedRoute role="lecturer"><LecturerDashboard /></ProtectedRoute>
                        } />
                        <Route path="/lecturer/create-exam" element={
                            <ProtectedRoute role="lecturer"><CreateExamPage /></ProtectedRoute>
                        } />
                        <Route path="/lecturer/exam/:examId/report" element={
                            <ProtectedRoute role="lecturer"><ExamReportPage /></ProtectedRoute>
                        } />

                        <Route path="/" element={<Navigate to="/login" />} />
                    </Routes>
                </main>
            </div>
        </AuthProvider>
    );
}

export default App;