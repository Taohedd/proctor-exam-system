import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { enterFullscreen, exitFullscreen } from '../utils/fullscreen';

const VIOLATION_LIMIT = 5;

const ExamPage = () => {
    const { examId } = useParams();
    const navigate = useNavigate();

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isExamStarted, setIsExamStarted] = useState(false);
    const [warnings, setWarnings] = useState([]);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [lastWarning, setLastWarning] = useState(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

    const videoRef = useRef(null);
    const examContainerRef = useRef(null);
    const faceLandmarkerRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);
    const requestAnimFrameRef = useRef(null);
    const warningsRef = useRef([]);
    const isExamStartedRef = useRef(false);
    const examRef = useRef(null);
    const timeLeftRef = useRef(null);
    const lastViolationTimeRef = useRef(0);

    useEffect(() => { warningsRef.current = warnings; }, [warnings]);
    useEffect(() => { isExamStartedRef.current = isExamStarted; }, [isExamStarted]);
    useEffect(() => { examRef.current = exam; }, [exam]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    // ── LOAD MEDIAPIPE MODEL ──────────────────────────────────
    useEffect(() => {
        const createFaceLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );
                const landmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "VIDEO",
                    numFaces: 1
                });
                faceLandmarkerRef.current = landmarker;
            } catch (e) {
                console.error("Error loading FaceLandmarker:", e);
                setError("Failed to load AI proctoring model. Check your internet connection.");
            }
        };
        createFaceLandmarker();
    }, []);

    // ── FETCH EXAM DATA ───────────────────────────────────────
    useEffect(() => {
        const fetchExamData = async () => {
            try {
                const [examsRes, questionsRes] = await Promise.all([
                    api.get('/exams'),
                    api.get(`/exam/${examId}/questions`)
                ]);
                const foundExam = examsRes.data.find(e => e.id.toString() === examId);
                if (!foundExam) throw new Error("Exam not found.");
                setExam(foundExam);
                setQuestions(questionsRes.data);
                setTimeLeft(foundExam.duration_minutes * 60);
            } catch (err) {
                setError('Failed to load exam data. ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchExamData();
    }, [examId]);

    // ── SUBMIT EXAM ───────────────────────────────────────────
    const submitExam = useCallback(async (status = 'Completed') => {
        if (requestAnimFrameRef.current) {
            cancelAnimationFrame(requestAnimFrameRef.current);
        }
        setIsExamStarted(false);
        exitFullscreen();

        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }

        const currentExam = examRef.current;
        const currentTimeLeft = timeLeftRef.current;
        const timeTaken = currentExam ? (currentExam.duration_minutes * 60 - currentTimeLeft) : 0;

        try {
            await api.post(`/exam/${examId}/submit`, {
                answers,
                time_taken: timeTaken,
                status
            });
            alert(`Exam submitted! Status: ${status}`);
            navigate('/student/results');
        } catch (err) {
            console.error("Submission failed:", err);
            setError("Failed to submit exam. Please contact your lecturer.");
        }
    }, [examId, answers, navigate]);

    // ── AUDIO WARNING BEEP ────────────────────────────────────
    const playWarningBeep = useCallback(() => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.8);
        } catch (e) {
            console.warn("Audio warning failed:", e);
        }
    }, []);

    // ── HANDLE VIOLATION ──────────────────────────────────────
    const handleViolation = useCallback((violationType) => {
        const now = Date.now();
        if (now - lastViolationTimeRef.current < 5000) return;
        lastViolationTimeRef.current = now;

        const currentWarnings = warningsRef.current;
        const newWarningCount = currentWarnings.length + 1;
        const newWarning = { type: violationType, number: newWarningCount, timestamp: new Date() };

        setWarnings(prev => [...prev, newWarning]);
        setLastWarning(newWarning);
        setShowWarningModal(true);
        playWarningBeep();

        api.post('/proctor/flag', {
            exam_id: parseInt(examId),
            violation_type: violationType,
            warning_number: newWarningCount
        }).catch(err => console.error("Failed to log flag:", err));

        if (newWarningCount >= VIOLATION_LIMIT) {
            submitExam('Force-Submitted');
        } else {
            setTimeout(() => setShowWarningModal(false), 4000);
        }
    }, [examId, submitExam, playWarningBeep]);

    // ── FRAME ANALYSIS ────────────────────────────────────────
    const analyzeFrame = useCallback((video) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 64, 64);
            const imageData = ctx.getImageData(0, 0, 64, 64);
            const data = imageData.data;
            const samples = data.length / 4;

            let totalBrightness = 0;
            for (let i = 0; i < data.length; i += 4) {
                totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
            }
            const avgBrightness = totalBrightness / samples;

            let variance = 0;
            for (let i = 0; i < data.length; i += 4) {
                const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
                variance += Math.pow(b - avgBrightness, 2);
            }
            variance = variance / samples;

            return { avgBrightness, variance };
        } catch (e) {
            return { avgBrightness: 128, variance: 500 };
        }
    }, []);

    // ── PROCTORING LOOP ───────────────────────────────────────
    const predictWebcam = useCallback(() => {
        if (!isExamStartedRef.current || !faceLandmarkerRef.current || !videoRef.current) return;

        const video = videoRef.current;
        if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            try {
                const { avgBrightness, variance } = analyzeFrame(video);

                if (avgBrightness < 15 || variance < 20) {
                    handleViolation("Camera is blocked or covered");
                    requestAnimFrameRef.current = requestAnimationFrame(predictWebcam);
                    return;
                }

                const results = faceLandmarkerRef.current.detectForVideo(video, Date.now());

                if (results.faceLandmarks) {
                    if (results.faceLandmarks.length === 0) {
                        if (avgBrightness > 40 && variance > 100) {
                            handleViolation("Object or phone detected in front of camera");
                        } else {
                            handleViolation("No face detected");
                        }
                        let lookAwayStartTime = null; 
                        const LOOK_AWAY_THRESHOLD_MS = 3000;
                    } else if (results.faceLandmarks.length > 1) {
                        handleViolation("Multiple faces detected");
                    } else if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                        const blendshapes = results.faceBlendshapes[0].categories;
                        const eyeLookLeft = blendshapes.find(s => s.categoryName === 'eyeLookOutLeft')?.score || 0;
                        const eyeLookRight = blendshapes.find(s => s.categoryName === 'eyeLookOutRight')?.score || 0;
                        const eyeLookDown = blendshapes.find(s => s.categoryName === 'eyeLookDownLeft')?.score || 0;
                        const eyeLookUp = blendshapes.find(s => s.categoryName === 'eyeLookUpLeft')?.score || 0;

                        if (eyeLookLeft > 0.6 || eyeLookRight > 0.6 || eyeLookDown > 0.7 || eyeLookUp > 0.7) {
                            handleViolation("Looking away from screen");
                        }
                    }
                }
            } catch (e) {
                console.error("Detection error:", e);
            }
        }
        requestAnimFrameRef.current = requestAnimationFrame(predictWebcam);
    }, [handleViolation, analyzeFrame]);

    // ── SETUP PROCTORING LISTENERS ────────────────────────────
    useEffect(() => {
        if (!isExamStarted) return;

        requestAnimFrameRef.current = requestAnimationFrame(predictWebcam);

        // 1. Visibility API — tab switch
        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleViolation("Switched tabs or minimized window");
            }
        };

        // 2. Window blur — alt+tab, clicking away
        const handleWindowBlur = () => {
            if (isExamStartedRef.current) {
                handleViolation("Window lost focus — possible tab switch");
            }
        };

        // 3. Block keyboard shortcuts
        const handleKeyDown = (e) => {
            const blocked = (
                (e.altKey && e.key === 'Tab') ||
                (e.ctrlKey && e.key === 'Tab') ||
                (e.ctrlKey && (e.key === 'w' || e.key === 'W')) ||
                (e.ctrlKey && (e.key === 't' || e.key === 'T')) ||
                (e.ctrlKey && (e.key === 'n' || e.key === 'N')) ||
                (e.ctrlKey && (e.key === 'l' || e.key === 'L')) ||
                (e.ctrlKey && (e.key === 'r' || e.key === 'R')) ||
                e.key === 'Meta' ||
                e.key === 'F5'
            );
            if (blocked) {
                e.preventDefault();
                e.stopPropagation();
                handleViolation("Attempted to use restricted keyboard shortcut");
            }
        };

        // 4. Block copy, paste, cut, right-click
        const preventAction = (e) => {
            e.preventDefault();
            handleViolation("Copy/Paste/Right-click attempted");
        };

        // 5. Fullscreen change — re-enter if exited
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen =
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement;

            if (!isCurrentlyFullscreen && isExamStartedRef.current) {
                handleViolation("Exited fullscreen mode");
                setTimeout(() => {
                    enterFullscreen(document.documentElement).catch(() => {});
                }, 1000);
            }
        };

        

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('copy', preventAction);
        document.addEventListener('paste', preventAction);
        document.addEventListener('cut', preventAction);
        document.addEventListener('contextmenu', preventAction);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            if (requestAnimFrameRef.current) cancelAnimationFrame(requestAnimFrameRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('copy', preventAction);
            document.removeEventListener('paste', preventAction);
            document.removeEventListener('cut', preventAction);
            document.removeEventListener('contextmenu', preventAction);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, [isExamStarted, predictWebcam, handleViolation]);

    // ── TIMER ─────────────────────────────────────────────────
    useEffect(() => {
        if (!isExamStarted || timeLeft === null) return;
        if (timeLeft <= 0) { submitExam('Time Expired'); return; }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [isExamStarted, timeLeft, submitExam]);

    // ── START EXAM ────────────────────────────────────────────
    const startExam = async () => {
        setIsExamStarted(true);

        try {
            await enterFullscreen(document.documentElement);
        } catch (err) {
            console.warn("Fullscreen failed:", err);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: 'user' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadeddata = () => setIsCameraReady(true);
                setTimeout(() => setIsCameraReady(true), 3000);
            }
        } catch (err) {
            console.error("Camera access failed:", err);
            if (err.name === 'NotAllowedError') {
                setError("Camera access was denied. Please click the camera icon in your browser's address bar, allow access, then refresh and try again.");
            } else if (err.name === 'NotFoundError') {
                setError("No camera found on this device. A webcam is required to take this exam.");
            } else {
                setError("Failed to access camera. Please ensure your camera is not in use by another app.");
            }
            setIsExamStarted(false);
            exitFullscreen();
        }
    };

    const handleAnswerSelect = (questionId, optionKey) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionKey }));
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="text-center p-8 text-xl">Loading Exam...</div>;
    if (error) return <div className="text-center p-8 text-red-500 bg-red-100 rounded">{error}</div>;

    // ── PRE-EXAM SCREEN ───────────────────────────────────────
    if (!isExamStarted) {
        return (
            <div className="text-center p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-xl mt-10">
                <h1 className="text-3xl font-bold mb-2">{exam?.title}</h1>
                <p className="text-lg text-gray-600 mb-2">Course: {exam?.course_name}</p>
                <p className="text-lg text-gray-600 mb-6">Duration: {exam?.duration_minutes} minutes</p>

                <h2 className="text-xl font-semibold mb-4 text-red-600">⚠️ Exam Rules & Proctoring Notice</h2>
                <ul className="list-disc list-inside text-left mx-auto max-w-md space-y-2 mb-8 text-gray-700">
                    <li>This exam is proctored by an AI system using your webcam.</li>
                    <li>You must remain in fullscreen mode throughout the exam.</li>
                    <li>Do not switch tabs or minimize the browser.</li>
                    <li>Ensure only you are visible to the camera.</li>
                    <li>Do not cover or block the camera at any time.</li>
                    <li>Do not place any object or phone in front of the camera.</li>
                    <li>Do not look away from the screen for extended periods.</li>
                    <li>Copy, paste, and right-clicking are disabled.</li>
                    <li><strong>You will be automatically submitted after 5 warnings.</strong></li>
                </ul>
                <button
                    onClick={startExam}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-300"
                >
                    I Understand, Start Exam
                </button>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    // ── EXAM SCREEN ───────────────────────────────────────────
    return (
        <div ref={examContainerRef} className="bg-white h-screen w-screen overflow-y-auto flex flex-col">

            {/* Warning Modal */}
            {showWarningModal && lastWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl text-center w-full max-w-md">
                        <h2 className="text-4xl font-bold text-red-600 mb-4">⚠️ Warning #{lastWarning.number}</h2>
                        <p className="text-xl text-gray-800 mb-2">Violation Detected:</p>
                        <p className="text-2xl font-semibold text-gray-900 mb-6">{lastWarning.type}</p>
                        <p className="text-lg text-red-700">
                            {VIOLATION_LIMIT - lastWarning.number} warning(s) remaining before auto-submission.
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex justify-between items-center p-4 border-b bg-white shadow-sm">
                <h1 className="text-2xl font-bold text-gray-800">{exam.title}</h1>
                <div className="flex items-center space-x-4">
                    <div className="text-xl font-semibold bg-gray-100 px-4 py-2 rounded-lg">
                        ⏱ <span className={timeLeft < 60 ? 'text-red-600' : 'text-gray-800'}>{formatTime(timeLeft)}</span>
                    </div>
                    <div className="relative">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-32 h-24 bg-black rounded-md"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                        {!isCameraReady && (
                            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white text-xs rounded-md">
                                Loading...
                            </div>
                        )}
                    </div>
                    <div className="text-sm text-red-500 font-semibold">
                        Warnings: {warnings.length}/{VIOLATION_LIMIT}
                    </div>
                </div>
            </header>

            {/* Questions */}
            <main className="p-6 flex-1">
                <div className="bg-gray-50 p-6 rounded-lg shadow-inner max-w-3xl mx-auto">
                    <p className="text-sm text-gray-500 mb-2">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </p>
                    <h2 className="text-xl font-semibold mb-6">{currentQuestion?.question_text}</h2>
                    <div className="space-y-3">
                        {currentQuestion && Object.entries(currentQuestion.options).map(([key, value]) => (
                            <label
                                key={key}
                                className={`block p-4 border rounded-lg cursor-pointer transition ${
                                    answers[currentQuestion.id] === key
                                        ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500'
                                        : 'bg-white border-gray-300 hover:bg-gray-100'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name={`question-${currentQuestion.id}`}
                                    value={key}
                                    checked={answers[currentQuestion.id] === key}
                                    onChange={() => handleAnswerSelect(currentQuestion.id, key)}
                                    className="hidden"
                                />
                                <span className="font-bold mr-3">{key.toUpperCase()}.</span>
                                <span>{value}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-4 border-t flex justify-between bg-white">
                <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded disabled:bg-gray-300"
                >
                    Previous
                </button>
                {currentQuestionIndex === questions.length - 1 ? (
                    <button
                        onClick={() => submitExam('Completed')}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded"
                    >
                        Submit Exam
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded"
                    >
                        Next
                    </button>
                )}
            </footer>
        </div>
    );
};

export default ExamPage;