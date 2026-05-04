import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Pill, User } from 'lucide-react';
import Button from '../components/ui/Button';

const MainLayout = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      // Small timeout ensures the page has rendered before scrolling
      setTimeout(() => {
        const id = location.hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="bg-green-600 text-white p-1.5 rounded-lg group-hover:bg-green-700 transition-colors">
                  <Pill size={24} />
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-900">
                  Med<span className="text-green-600">Scan</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8 items-center">
              <Link to="/" className="text-green-600 font-bold border-b-2 border-green-600 pb-1 text-sm">Home</Link>
              <Link to="/#features" className="text-gray-700 hover:text-green-600 font-semibold text-sm transition-colors">Features</Link>
              <Link to="/#how-it-works" className="text-gray-700 hover:text-green-600 font-semibold text-sm transition-colors">How it Works</Link>
              <Link to="/#about" className="text-gray-700 hover:text-green-600 font-semibold text-sm transition-colors">About Us</Link>
              <Link to="/#contact" className="text-gray-700 hover:text-green-600 font-semibold text-sm transition-colors">Contact</Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="outline" className="hidden sm:inline-flex border-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 text-sm">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" className="bg-[#0f803f] hover:bg-[#0c6b34] px-6 py-2 rounded-lg font-semibold text-sm">
                  Sign up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-gray-400">
            <Pill size={20} />
            <span className="font-semibold text-gray-600 tracking-tight">MedScan</span>
            <span className="ml-2 text-sm">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-500">
            <a href="#" className="hover:text-green-600">Privacy Policy</a>
            <a href="#" className="hover:text-green-600">Terms of Service</a>
            <a href="#" className="hover:text-green-600">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
