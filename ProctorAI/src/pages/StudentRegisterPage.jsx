import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const LEVELS = ['100L', '200L', '300L', '400L', '500L', 'ND 1', 'ND 2', 'HND 1', 'HND 2'];

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
);

const StudentRegisterPage = () => {
    const [formData, setFormData] = useState({
        full_name: '',
        matric_number: '',
        department: '',
        level: '',
        course: '',
        password: '',
    });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passportPhoto, setPassportPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setPassportPhoto(file);
        if (file) setPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!passportPhoto) {
            setError('Please upload a passport photo.');
            return;
        }
        if (!formData.level) {
            setError('Please select your level.');
            return;
        }
        if (formData.password !== confirmPassword) {
            setError('Passwords do not match. Please check and try again.');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        data.append('passport_photo', passportPhoto);

        try {
            await api.post('/student/register', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const passwordsMatch = confirmPassword && formData.password === confirmPassword;
    const passwordsMismatch = confirmPassword && formData.password !== confirmPassword;

    return (
        <div className="flex items-center justify-center mt-10 pb-10">
            {loading && <LoadingSpinner message="Creating your account..." />}

            <div className="w-full max-w-lg p-8 space-y-5 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">Student Registration</h2>

                {error && <p className="text-red-500 text-center bg-red-50 p-3 rounded">{error}</p>}
                {success && <p className="text-green-600 text-center bg-green-50 p-3 rounded">{success}</p>}

                <form className="space-y-4" onSubmit={handleSubmit}>

                    {/* Full Name */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <input
                            name="full_name" type="text" required
                            onChange={handleChange}
                            placeholder="e.g. John Doe"
                            className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Matric Number */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">Matric Number</label>
                        <input
                            name="matric_number" type="text" required
                            onChange={handleChange}
                            placeholder="e.g. 20200705010043"
                            className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Department & Level */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Department</label>
                            <input
                                name="department" type="text" required
                                onChange={handleChange}
                                placeholder="e.g. UI/UX Design"
                                className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Level</label>
                            <select
                                name="level" required
                                onChange={handleChange}
                                value={formData.level}
                                className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            >
                                <option value="">Select level</option>
                                {LEVELS.map(l => (
                                    <option key={l} value={l}>{l} </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Course */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Course <span className="text-gray-400 text-xs font-normal">(exam you are taking)</span>
                        </label>
                        <input
                            name="course" type="text" required
                            onChange={handleChange}
                            placeholder="e.g. UI/UX Design 100"
                            className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            ⚠️ Must match your lecturer's course name exactly.
                        </p>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <div className="relative mt-1">
                            <input
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                onChange={handleChange}
                                className="w-full px-3 py-2 pr-10 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Minimum 6 characters.</p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                        <div className="relative mt-1">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                                    passwordsMismatch ? 'border-red-400 bg-red-50' :
                                    passwordsMatch ? 'border-green-400 bg-green-50' : ''
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        {passwordsMismatch && (
                            <p className="text-xs text-red-500 mt-1">❌ Passwords do not match.</p>
                        )}
                        {passwordsMatch && (
                            <p className="text-xs text-green-600 mt-1">✅ Passwords match.</p>
                        )}
                    </div>

                    {/* Passport Photo */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">Passport Photo</label>
                        <input
                            type="file" accept="image/png, image/jpeg" required
                            onChange={handleFileChange}
                            className="w-full px-3 py-1.5 mt-1 border rounded-md"
                        />
                        {preview && (
                            <div className="mt-2 flex items-center gap-3">
                                <img
                                    src={preview} alt="Preview"
                                    className="w-16 h-16 rounded-full object-cover border-2 border-indigo-300"
                                />
                                <p className="text-xs text-gray-400">Photo preview</p>
                            </div>
                        )}
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
                    <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default StudentRegisterPage;