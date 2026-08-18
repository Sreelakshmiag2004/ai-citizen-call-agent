import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, ChevronDown, User, LogOut, ClipboardList, Shield, Repeat } from 'lucide-react';

export const TopHeader: React.FC = () => {
  const { user, unreadNotificationCount, navigate, logout, switchPortal } = useApp();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header 
      id="portal-top-header" 
      className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-end z-20 shrink-0 select-none"
    >
      <div className="flex items-center gap-5">
        {/* Notification Bell */}
        <button
          id="header-notification-btn"
          onClick={() => navigate('notifications')}
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#E53E3E] rounded-full ring-2 ring-white animate-pulse" />
          )}
        </button>

        <div className="h-6 w-[1px] bg-slate-200" />

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="header-user-menu-btn"
            onClick={() => setProfileDropdownOpen(prev => !prev)}
            className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-[#003B95] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user?.avatarInitials || 'RK'}
            </div>
            <div className="hidden sm:flex flex-col pr-1">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {user?.fullName || 'Ravi Kumar'}
              </span>
              <span className="text-[11px] text-slate-500 leading-tight">
                {user?.role || 'Citizen'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {profileDropdownOpen && (
            <div 
              id="profile-dropdown-menu"
              className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{user?.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>

              <button
                id="dropdown-profile-link"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate('profile');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                Profile Information
              </button>

              <button
                id="dropdown-complaints-link"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate('my-complaints');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ClipboardList className="w-4 h-4 text-slate-400" />
                My Complaints
              </button>

              <button
                id="dropdown-notifications-link"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate('notifications');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Bell className="w-4 h-4 text-slate-400" />
                Notifications ({unreadNotificationCount})
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                id="dropdown-logout-btn"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
