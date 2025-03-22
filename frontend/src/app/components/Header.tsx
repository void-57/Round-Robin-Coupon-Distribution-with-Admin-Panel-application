import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <Link
            href="/"
            className="text-2xl sm:text-3xl font-bold text-primary-300 hover:text-primary-200 transition-colors"
          >
            Coupon Distribution System
          </Link>
          <nav>
            <Link
              href="/admin"
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors text-center inline-block"
            >
              Admin Panel
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
