import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';
import {
  HiOutlineHome, HiOutlineBriefcase, HiOutlineDocumentText, HiOutlineUser,
  HiOutlineUsers, HiOutlineSpeakerphone, HiOutlineChartBar, HiOutlineLogout,
  HiOutlineMenu, HiOutlineX, HiOutlineSparkles, HiOutlineBookmark,
  HiOutlineCalendar, HiOutlineBell
} from 'react-icons/hi';

const navItems = [
  { path: '/', icon: HiOutlineHome, label: 'Dashboard' },
  { path: '/jobs', icon: HiOutlineBriefcase, label: 'Jobs' },
  { path: '/saved', icon: HiOutlineBookmark, label: 'Saved Jobs' },
  { path: '/applications', icon: HiOutlineDocumentText, label: 'Applications' },
  { path: '/interviews', icon: HiOutlineCalendar, label: 'Interviews' },
  { path: '/referrals', icon: HiOutlineUsers, label: 'Referrals' },
  { path: '/recruiter', icon: HiOutlineSpeakerphone, label: 'Recruiter' },
  { path: '/analytics', icon: HiOutlineChartBar, label: 'Analytics' },
  { path: '/profile', icon: HiOutlineUser, label: 'Profile' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll notifications every 30s
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await notificationsAPI.getAll();
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      } catch { /* silent */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* silent */ }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-dark-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-dark-700 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-dark-700">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-green to-emerald-600 flex items-center justify-center">
              <HiOutlineSparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">JobPilot</h1>
              <p className="text-xs text-dark-400">AI-Powered Jobs</p>
            </div>
            <button className="ml-auto lg:hidden text-dark-300" onClick={() => setSidebarOpen(false)}>
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                      : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-dark-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-100 truncate">{user?.name}</p>
                <p className="text-xs text-dark-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-dark-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
            >
              <HiOutlineLogout className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 flex items-center px-4 lg:px-6 flex-shrink-0">
          <button className="lg:hidden mr-3 text-dark-300" onClick={() => setSidebarOpen(true)}>
            <HiOutlineMenu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative text-dark-300 hover:text-white transition-all">
                <HiOutlineBell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-10 w-80 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-accent-green hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? notifications.slice(0, 10).map(n => (
                      <div key={n._id} className={`px-4 py-3 border-b border-dark-700/50 hover:bg-dark-700/50 transition-all cursor-pointer ${!n.read ? 'bg-dark-700/30' : ''}`}
                        onClick={() => { if (n.link) navigate(n.link); setShowNotifs(false); }}>
                        <div className="flex items-start gap-2">
                          {!n.read && <span className="w-2 h-2 rounded-full bg-accent-green mt-1.5 flex-shrink-0" />}
                          <div>
                            <p className="text-sm text-white font-medium">{n.title}</p>
                            <p className="text-xs text-dark-400 mt-0.5">{n.message}</p>
                            <p className="text-xs text-dark-500 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="px-4 py-8 text-center text-dark-500 text-sm">No notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <span className="text-xs text-dark-400">Welcome back, {user?.name?.split(' ')[0]}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
