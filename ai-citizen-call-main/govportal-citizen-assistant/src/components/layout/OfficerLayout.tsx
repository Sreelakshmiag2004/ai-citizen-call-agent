import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Shield, 
  LayoutDashboard, 
  ClipboardList, 
  AlertTriangle, 
  Bell, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  ChevronDown, 
  CheckCircle2, 
  LogOut,
  Sliders
} from 'lucide-react';

export const OfficerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    currentRoute, 
    navigate, 
    logout, 
    user, 
    unreadNotificationCount, 
    isSidebarCollapsed, 
    toggleSidebarCollapse 
  } = useApp();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      route: 'dashboard' as const,
      icon: LayoutDashboard,
    },
    {
      id: 'my-assignments',
      label: 'My Assignments',
      route: 'my-assignments' as const,
      icon: ClipboardList,
    },
    {
      id: 'complaints',
      label: 'Complaints',
      route: 'complaints' as const,
      icon: AlertTriangle,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      route: 'officer-notifications' as const,
      icon: Bell,
      badge: unreadNotificationCount > 0 ? unreadNotificationCount : 12,
    },
    {
      id: 'profile',
      label: 'Profile',
      route: 'officer-profile' as const,
      icon: User,
    },
  ];

  const isNavActive = (route: string) => {
    if (route === 'dashboard' && currentRoute === 'dashboard') return true;
    if (route === 'my-assignments' && (currentRoute === 'my-assignments' || currentRoute === 'officer-complaint-details')) return true;
    if (route === 'complaints' && currentRoute === 'complaints') return true;
    if (route === 'officer-notifications' && currentRoute === 'officer-notifications') return true;
    if (route === 'officer-profile' && currentRoute === 'officer-profile') return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col font-sans antialiased text-slate-800">
      {/* Top Header Bar */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: User Welcome & Department */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Welcome, {user?.fullName || 'Priya Sharma'}
              </h1>
              <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-50" />
            </div>
            <p className="text-xs font-medium text-slate-500">
              Public Works Department
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Notifications Bell */}
          <button
            id="officer-top-notifications-btn"
            onClick={() => navigate('officer-notifications')}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {unreadNotificationCount > 0 ? unreadNotificationCount : 12}
            </span>
          </button>

          {/* Settings Icon */}
          <button
            id="officer-top-settings-btn"
            onClick={() => navigate('officer-profile')}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* User Profile Dropdown Button */}
          <div className="relative">
            <button
              id="officer-profile-menu-btn"
              onClick={() => setProfileDropdownOpen(prev => !prev)}
              className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#003B95] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user?.avatarInitials || 'PS'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.fullName || 'Priya Sharma'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {user?.role || 'Assistant Engineer'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-800">{user?.fullName || 'Priya Sharma'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || 'priya.sharma@pwd.gov.in'}</p>
                </div>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('officer-profile');
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('officer-notifications');
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                  <span>Notifications</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Officer Left Navigation Sidebar */}
        <aside
          className={`${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          } bg-[#06184C] text-white flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 z-20 shadow-md`}
        >
          {/* Logo & Portal Identity */}
          <div>
            <div className="p-4 border-b border-blue-900/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-blue-300" />
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <h2 className="text-base font-bold text-white tracking-tight leading-none">
                    GovPortal
                  </h2>
                  <p className="text-[11px] font-medium text-blue-300 mt-1">
                    Officer Portal
                  </p>
                </div>
              )}
            </div>

            {/* Menu Navigation Links */}
            <nav className="p-3 space-y-1.5 mt-2">
              {navItems.map((item) => {
                const active = isNavActive(item.route);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`officer-nav-${item.id}`}
                    onClick={() => navigate(item.route)}
                    className={`w-full flex items-center ${
                      isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                    } py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                      active
                        ? 'bg-[#1E3A8A] text-white shadow-sm font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-300' : 'text-slate-400'}`} />
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </div>

                    {!isSidebarCollapsed && item.badge && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Collapse Toggle */}
          <div className="p-3 border-t border-blue-900/50">
            <button
              id="officer-sidebar-toggle-btn"
              onClick={toggleSidebarCollapse}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center' : 'justify-between px-3'
              } py-2 text-xs text-blue-200/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer`}
            >
              {!isSidebarCollapsed && <span>Collapse</span>}
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </aside>

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
