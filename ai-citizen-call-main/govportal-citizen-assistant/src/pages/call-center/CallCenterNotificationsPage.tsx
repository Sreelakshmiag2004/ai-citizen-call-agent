import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  CheckCheck, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { CALL_CENTER_NOTIFICATIONS } from '../../data/callCenterData';

export const CallCenterNotificationsPage: React.FC = () => {
  const { 
    callCenterNotifications, 
    markAllNotificationsRead, 
    markNotificationAsRead, 
    navigate, 
    setSelectedComplaintId 
  } = useApp();

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'high_priority':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'routed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'exception':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'transcription_failed':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-600" />;
    }
  };

  const handleNotificationClick = (item: any) => {
    markNotificationAsRead(item.id);
    if (item.type === 'exception') {
      navigate('exceptions');
    } else if (item.complaintId && item.complaintId.startsWith('CP')) {
      setSelectedComplaintId('CP2025-0001234');
      navigate('complaint-details');
    }
  };

  return (
    <div id="call-center-notifications-page" className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Stay updated with alerts and updates
          </p>
        </div>

        <button
          id="cc-mark-all-read-btn"
          onClick={markAllNotificationsRead}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
        >
          <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {callCenterNotifications.map((notif) => (
          <div
            key={notif.id}
            id={`cc-notification-${notif.id}`}
            onClick={() => handleNotificationClick(notif)}
            className={`p-4.5 flex items-start gap-4 transition-colors cursor-pointer ${
              notif.isRead ? 'bg-white hover:bg-slate-50/70' : 'bg-blue-50/30 hover:bg-blue-50/50'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200/60 shadow-2xs">
              {getNotificationIcon(notif.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  {notif.title}
                </h4>
                <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                  {notif.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {notif.message}
              </p>
            </div>

            {!notif.isRead && (
              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
