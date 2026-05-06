const LoadingSpinner = ({ message = "Loading..." }) => {
    return (
        <div className="fixed inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-50">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600"></div>
                <div className="w-10 h-10 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 absolute top-3 left-3" style={{ animationDirection: 'reverse', animationDuration: '0.6s' }}></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium text-sm">{message}</p>
        </div>
    );
};

export default LoadingSpinner;