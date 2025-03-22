export default function Footer() {
  return (
    <footer className="bg-gray-800 border-t border-gray-700 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center space-y-2">
          <p className="text-gray-400 text-sm text-center">
            © {new Date().getFullYear()} Coupon Distribution System. All rights
            reserved.
          </p>
          <div className="flex items-center space-x-4">
            <a
              href="#"
              className="text-gray-400 hover:text-primary-300 text-sm transition-colors"
            >
              Terms of Service
            </a>
            <span className="text-gray-600">•</span>
            <a
              href="#"
              className="text-gray-400 hover:text-primary-300 text-sm transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-gray-600">•</span>
            <a
              href="#"
              className="text-gray-400 hover:text-primary-300 text-sm transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
