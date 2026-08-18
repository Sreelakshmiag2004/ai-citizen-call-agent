import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  UserCheck, 
  RefreshCw, 
  CheckCircle2, 
  MessageSquare, 
  XCircle,
  Bell
} from 'lucide-react';
import { NotificationItem } from '../types';

export const NotificationsPage: React.FC = () => {
  const { notifications, markAllNotificationsRead, markNotificationAsRead, navigate } = useApp();

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'assigned':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        );
      case 'status_change':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
        );
      case 'resolved':
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'reminder':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      case 'closed':
        return (
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markNotificationAsRead(item.id);
    navigate('complaint-details', item.complaintId);
  };

  return (
    <div id="notifications-page" className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Notifications
        </h1>

        <button
          id="mark-all-read-btn"
          onClick={markAllNotificationsRead}
          className="text-xs font-semibold text-slate-600 hover:text-[#003B95] transition-colors cursor-pointer"
        >
          Mark all as read
        </button>
      </div>

      {/* Notifications List Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <div
              key={item.id}
              id={`notification-item-${item.id}`}
              onClick={() => handleNotificationClick(item)}
              className={`p-5 sm:px-6 flex items-center gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer ${
                !item.isRead ? 'bg-blue-50/20' : ''
              }`}
            >
              {/* Notification Icon */}
              {getNotificationIcon(item.type)}

              {/* Message and Timestamp */}
              <div className="flex-1 space-y-1">
                <p className={`text-xs sm:text-sm leading-snug ${
                  !item.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                }`}>
                  {item.message}
                </p>
                <span className="text-[11px] text-slate-400 block">
                  {item.timestamp}
                </span>
              </div>

              {!item.isRead && (
                <div className="w-2 h-2 rounded-full bg-[#003B95] shrink-0" />
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-slate-400 text-sm">
            You have no notifications.
          </div>
        )}
      </div>
    </div>
  );
};
