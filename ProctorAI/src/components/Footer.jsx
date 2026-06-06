const Footer = () => {
    return (
        <footer className="bg-white border-t py-4 mt-8">
            <div className="container mx-auto px-4 text-center">
                <p className="text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} ProctorAI &mdash; Designed and developed by{' '}
                    <span className="font-semibold text-indigo-600">Rahamon Taoheed</span>
                </p>
            </div>
        </footer>
    );
};

export default Footer;