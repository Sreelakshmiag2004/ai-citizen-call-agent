import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  CheckCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { OFFICER_NOTIFICATIONS_LIST } from '../../data/officerData';

export const OfficerNotificationsPage: React.FC = () => {
  const { navigate, markAllNotificationsRead, setSelectedComplaintId } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'assignments' | 'sla' | 'updates'>('all');
  const [notifications, setNotifications] = useState(OFFICER_NOTIFICATIONS_LIST);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'assignments', label: 'Assignments (6)' },
    { id: 'sla', label: 'SLA Alerts (3)' },
    { id: 'updates', label: 'Updates (3)' },
  ];

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    markAllNotificationsRead();
  };

  const handleNotificationClick = (complaintId?: string) => {
    if (complaintId) {
      setSelectedComplaintId(complaintId);
      navigate('officer-complaint-details', complaintId);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sla_breach':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'assigned':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'status_change':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'routed':
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#003B95] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        );
    }
  };

  const filteredNotifications = notifications.filter(item => {
    if (activeTab === 'assignments') return item.type === 'assigned';
    if (activeTab === 'sla') return item.type === 'sla_breach';
    if (activeTab === 'updates') return item.type === 'status_change' || item.type === 'routed';
    return true;
  });

  return (
    <div id="officer-notifications-screen" className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Notifications
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time assignment updates and SLA escalations
          </p>
        </div>

        <button
          id="officer-mark-all-read-btn"
          onClick={handleMarkAllRead}
          className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Tabs matching Screenshot 6 */}
      <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-semibold overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            id={`notif-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 whitespace-nowrap cursor-pointer transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-[#003B95] text-[#003B95] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List matching Screenshot 6 */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {filteredNotifications.map((notif) => {
          const isCritical = notif.type === 'sla_breach';
          return (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif.complaintId)}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                isCritical
                  ? 'bg-rose-50/40 hover:bg-rose-50/80'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {/* Red unread dot */}
                <div className="pt-2 w-2">
                  {!notif.isRead && (
                    <span className="block w-2 h-2 rounded-full bg-red-600" />
                  )}
                </div>

                {/* Icon */}
                {getNotificationIcon(notif.type)}

                {/* Content */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {notif.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {notif.message}
                  </p>
                  {notif.complaintId && (
                    <span className="inline-block font-mono text-[11px] font-bold text-[#003B95] mt-1.5 hover:underline">
                      View Complaint {notif.complaintId} →
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-right shrink-0">
                <span className="text-xs font-semibold text-slate-400">
                  {notif.timestamp}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Link matching Screenshot 6 */}
      <div className="pt-2 flex justify-center">
        <button
          id="officer-view-all-notifications-footer"
          onClick={handleMarkAllRead}
          className="text-xs font-bold text-[#003B95] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>View All Notifications</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
