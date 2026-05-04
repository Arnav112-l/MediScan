import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { setToken } from '../api/client';
import { 
  LayoutDashboard, 
  Search, 
  Upload, 
  History, 
  Bell, 
  TrendingUp, 
  FileText, 
  MessageSquare, 
  Settings,
  LogOut,
  Pill,
  Menu,
  MapPin,
  User as UserIcon
} from 'lucide-react';
import Button from '../components/ui/Button';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector(state => state.auth);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Search Medicine', href: '/dashboard/search', icon: Search },
    { name: 'Upload Prescription', href: '/dashboard/upload', icon: Upload },
    { name: 'Medicine History', href: '/dashboard/history', icon: History },
    { name: 'Reminders', href: '/dashboard/reminders', icon: Bell },
    { name: 'Adherence', href: '/dashboard/adherence', icon: TrendingUp },
    { name: 'Lab Reports', href: '/dashboard/reports', icon: FileText },
    { name: 'Nearby Pharmacies', href: '/dashboard/pharmacies', icon: MapPin },
    { name: 'AI Assistant', href: '/dashboard/assistant', icon: MessageSquare },
  ];

  const secondaryNavigation = [
    { name: 'Profile & Settings', href: '/dashboard/profile', icon: Settings },
  ];

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('medscan_refresh');
    localStorage.removeItem('medscan_user');
    dispatch(logout());
    navigate('/login');
  };

  // Helper to determine page title based on current path
  const getPageTitle = () => {
    const currentPath = location.pathname;
    if (currentPath === '/dashboard') return 'Dashboard Overview';
    const activeNav = [...navigation, ...secondaryNavigation].find(item => item.href === currentPath);
    return activeNav ? activeNav.name : 'MedScan Dashboard';
  };

  return (
    <div className="h-screen flex bg-gray-50 font-sans text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        {/* Sidebar Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-green-600 text-white p-1 rounded-md">
              <Pill size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              Med<span className="text-green-600">Scan</span>
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/dashboard'}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-green-50 text-green-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </div>

        {/* Secondary Navigation */}
        <div className="p-4 border-t border-gray-100 flex flex-col gap-1">
          {secondaryNavigation.map((item) => (
             <NavLink
             key={item.name}
             to={item.href}
             className={({ isActive }) => `
               flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
               ${isActive 
                 ? 'bg-green-50 text-green-700' 
                 : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
             `}
           >
             <item.icon size={18} className="flex-shrink-0" />
             {item.name}
           </NavLink>
          ))}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left mt-2"
          >
            <LogOut size={18} className="flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 flex-1">
            <button className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700">
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl w-full max-w-md">
              <Search size={18} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search medicine..." 
                className="bg-transparent border-none focus:outline-none text-sm w-full placeholder-gray-400 text-gray-700"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <button className="text-gray-500 hover:text-gray-700 relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            {/* User Dropdown Profile mock */}
            <div className="flex items-center gap-3 border-l border-gray-100 pl-5 cursor-pointer">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200 overflow-hidden">
                <UserIcon size={16} />
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-bold text-[#0B1B2B]">{user?.name || user?.email || 'Account'}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
