import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  UserPlus, 
  CheckCircle2, 
  CheckCheck, 
  ChevronRight 
} from 'lucide-react';

export const AdminNotificationsPage: React.FC = () => {
  const { adminNotifications, markAllNotificationsRead, markNotificationAsRead, navigate } = useApp();
  const [selectedTab, setSelectedTab] = useState<'All' | 'System Alerts' | 'SLA Breaches' | 'User Updates'>('All');

  const filtered = adminNotifications.filter(n => {
    if (selectedTab === 'All') return true;
    if (selectedTab === 'System Alerts') return n.type === 'system_update' || n.type === 'maintenance';
    // 'sla_breach' covers both escalation levels; 'reminder' is the
    // at-risk (pre-breach) warning -- see notification_service.py.
    if (selectedTab === 'SLA Breaches') return n.type === 'sla_breach' || n.type === 'reminder';
    if (selectedTab === 'User Updates') return n.type === 'user_created';
    return true;
  });

  return (
    <div id="admin-notifications-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Notifications</h2>
          <p className="text-xs text-slate-500">System alerts, escalation triggers, and administrative updates.</p>
        </div>

        <button 
          id="admin-mark-all-read-btn"
          onClick={markAllNotificationsRead}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {(['All', 'System Alerts', 'SLA Breaches', 'User Updates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedTab === tab
                ? 'bg-[#1D4ED8] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No notifications found</p>
            <p className="text-xs text-slate-400">You're all caught up with system activities.</p>
          </div>
        ) : (
          filtered.map(notification => (
            <div 
              key={notification.id}
              onClick={() => markNotificationAsRead(notification.id)}
              className={`bg-white rounded-xl p-4 border transition-all flex items-start gap-4 cursor-pointer hover:border-slate-300 ${
                !notification.isRead 
                  ? 'border-l-4 border-l-[#1D4ED8] border-slate-200/80 bg-blue-50/20' 
                  : 'border-slate-200/80 opacity-90'
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                notification.type === 'sla_breach' || notification.type === 'reminder' ? 'bg-rose-50 text-rose-600' :
                notification.type === 'system_update' || notification.type === 'maintenance' ? 'bg-amber-50 text-amber-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {(notification.type === 'sla_breach' || notification.type === 'reminder') && <AlertTriangle className="w-5 h-5" />}
                {(notification.type === 'system_update' || notification.type === 'maintenance') && <Clock className="w-5 h-5" />}
                {notification.type === 'user_created' && <UserPlus className="w-5 h-5" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {notification.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {notification.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {notification.message}
                </p>

                {/* Bottom metadata / action link */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                  <span className="text-[11px] font-mono text-slate-400">
                    {notification.id}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notification.type === 'sla_breach' || notification.type === 'reminder') navigate('sla-escalations');
                      else if (notification.type === 'user_created') navigate('user-management');
                      else navigate('dashboard');
                    }}
                    className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center gap-0.5"
                  >
                    <span>View details</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
