import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  Headphones, 
  FileText, 
  AlertCircle, 
  Bell, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Landmark, 
  ChevronDown,
  LogOut,
  Repeat,
  CheckCircle2,
  PhoneCall
} from 'lucide-react';
import { PageRoute } from '../../types';

interface CallCenterLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export const CallCenterLayout: React.FC<CallCenterLayoutProps> = ({ 
  children,
  pageTitle,
  pageSubtitle
}) => {
  const { 
    currentRoute, 
    navigate, 
    logout, 
    user, 
    isSidebarCollapsed, 
    toggleSidebarCollapse,
    switchPortal,
    unreadNotificationCount 
  } = useApp();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'Available' | 'Busy' | 'On Call' | 'Away'>('Available');

  const navItems: { route: PageRoute; label: string; icon: React.ReactNode; countBadge?: number }[] = [
    {
      route: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      route: 'live-calls',
      label: 'Live Calls',
      icon: <Headphones className="w-5 h-5" />,
    },
    {
      route: 'complaints',
      label: 'Complaints',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      route: 'exceptions',
      label: 'Exceptions',
      icon: <AlertCircle className="w-5 h-5" />,
    },
    {
      route: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
    },
    {
      route: 'profile',
      label: 'Profile',
      icon: <User className="w-5 h-5" />,
    },
  ];

  const isNavActive = (route: PageRoute) => {
    if (currentRoute === route) return true;
    if (route === 'complaints' && currentRoute === 'complaint-details') return true;
    return false;
  };

  return (
    <div id="call-center-shell" className="min-h-screen bg-[#F8FAFC] flex overflow-x-hidden font-sans">
      {/* Dark Navy Sidebar */}
      <aside 
        id="call-center-sidebar"
        className={`bg-[#0C1527] text-white flex flex-col shrink-0 transition-all duration-300 z-30 select-none ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div 
          id="call-center-brand"
          onClick={() => navigate('dashboard')}
          className="p-5 flex items-center gap-3 cursor-pointer border-b border-slate-800/80 hover:opacity-95"
        >
          <div className="w-9 h-9 bg-white text-[#0C1527] rounded-lg flex items-center justify-center font-bold shadow-md shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg tracking-tight text-white leading-none">GovPortal</span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide mt-1">Call Center Portal</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav id="call-center-nav" className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isNavActive(item.route);
            return (
              <button
                key={item.route}
                id={`cc-nav-${item.route}`}
                onClick={() => navigate(item.route)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
                  isSidebarCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3.5'
                } ${
                  active
                    ? 'bg-[#1D4ED8] text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className={active ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle Footer */}
        <div id="call-center-sidebar-footer" className="p-3 border-t border-slate-800/80">
          <button
            id="cc-collapse-btn"
            onClick={toggleSidebarCollapse}
            className={`w-full flex items-center rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors ${
              isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-2.5'
            }`}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header id="call-center-top-bar" className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          {/* Left Title / Subtitle */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {pageTitle || (currentRoute === 'dashboard' ? 'Welcome, Priya Sharma 👋' : 'GovPortal')}
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {pageSubtitle || (currentRoute === 'dashboard' ? 'Call Center Executive' : 'Call Center Portal')}
            </p>
          </div>

          {/* Right Controls: Notifications & User Profile */}
          <div className="flex items-center gap-4">
            {/* Notifications Button */}
            <button
              id="cc-top-notifications-btn"
              onClick={() => navigate('notifications')}
              className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 bg-[#E11D48] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                12
              </span>
            </button>

            {/* Profile Dropdown Badge */}
            <div className="relative">
              <button
                id="cc-profile-menu-trigger"
                onClick={() => setIsProfileMenuOpen(prev => !prev)}
                className="flex items-center gap-3 p-1.5 pr-2.5 rounded-full hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
              >
                <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center border border-slate-300">
                  {user?.avatarInitials || 'PS'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {user?.fullName || 'Priya Sharma'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 leading-none mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>{currentStatus}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {/* Profile Menu Dropdown */}
              {isProfileMenuOpen && (
                <div 
                  id="cc-profile-dropdown"
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user?.fullName || 'Priya Sharma'}</p>
                    <p className="text-[11px] text-slate-500">{user?.email || 'priya.sharma@govportal.gov.in'}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setIsProfileMenuOpen(false); navigate('profile'); }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>Account Profile</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => { setIsProfileMenuOpen(false); logout(); }}
                      className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
