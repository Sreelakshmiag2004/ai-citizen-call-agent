import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  Bell, 
  User, 
  LogOut, 
  Landmark 
} from 'lucide-react';
import { PageRoute } from '../../types';

export const Sidebar: React.FC = () => {
  const { currentRoute, navigate, logout, unreadNotificationCount, resetComplaintDraft } = useApp();

  const navItems: { route: PageRoute; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      route: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      route: 'raise-complaint',
      label: 'Raise Complaint',
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      route: 'my-complaints',
      label: 'My Complaints',
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      route: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      badge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
    },
    {
      route: 'profile',
      label: 'Profile',
      icon: <User className="w-5 h-5" />,
    },
  ];

  const handleNavClick = (route: PageRoute) => {
    if (route === 'raise-complaint') {
      resetComplaintDraft();
    }
    navigate(route);
  };

  const isCurrentActive = (route: PageRoute) => {
    if (currentRoute === route) return true;
    if (route === 'my-complaints' && currentRoute === 'complaint-details') return true;
    return false;
  };

  return (
    <aside 
      id="portal-sidebar" 
      className="w-64 bg-[#003B95] min-h-screen flex flex-col shrink-0 text-white select-none transition-all duration-200"
    >
      {/* Brand Header */}
      <div 
        id="sidebar-brand"
        onClick={() => navigate('dashboard')}
        className="p-6 flex items-center gap-3 border-b border-blue-800/40 cursor-pointer hover:opacity-95"
      >
        <div className="w-9 h-9 bg-white text-[#003B95] rounded-lg flex items-center justify-center shadow-md font-bold">
          <Landmark className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-xl tracking-tight leading-none text-white">GovPortal</span>
          <span className="text-[11px] text-blue-200 tracking-wide mt-1">Citizen Services</span>
        </div>
      </div>

      {/* Nav List */}
      <nav id="sidebar-nav" className="flex-1 px-3 py-5 space-y-1.5">
        {navItems.map((item) => {
          const active = isCurrentActive(item.route);
          return (
            <button
              key={item.route}
              id={`nav-${item.route}`}
              onClick={() => handleNavClick(item.route)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                active
                  ? 'bg-[#1553B7] text-white shadow-sm font-semibold'
                  : 'text-blue-100/80 hover:bg-blue-800/40 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span className={active ? 'text-white' : 'text-blue-200'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="bg-[#E53E3E] text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center leading-tight">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Logout */}
      <div id="sidebar-footer" className="p-4 border-t border-blue-800/40">
        <button
          id="sidebar-logout-btn"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 text-blue-300" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
