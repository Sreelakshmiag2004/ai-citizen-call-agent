import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  ClipboardList,
  PlusCircle,
  BarChart3,
  Droplets,
  Zap,
  Trash2,
  Wrench,
  Clock,
  X,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// All numbers here are computed live from GET /complaints (via AppContext).
// The backend has no per-officer ownership model, so this shows the full
// department queue rather than a filtered "assigned to me" set.
export const OfficerDashboardPage: React.FC = () => {
  const { navigate, setSelectedComplaintId, complaints, complaintsLoading } = useApp();
  const [slaBannerVisible, setSlaBannerVisible] = useState(true);

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('water')) return <Droplets className="w-4 h-4 text-blue-600" />;
    if (c.includes('electric')) return <Zap className="w-4 h-4 text-amber-500" />;
    if (c.includes('sanitation') || c.includes('garbage')) return <Trash2 className="w-4 h-4 text-rose-500" />;
    return <Wrench className="w-4 h-4 text-emerald-600" />;
  };

  const handleRowClick = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    navigate('officer-complaint-details', complaintId);
  };

  const total = complaints.length;
  const newCount = complaints.filter((c) => c.status === 'New').length;
  const assignedCount = complaints.filter((c) => c.status === 'Assigned').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;
  const closed = complaints.filter((c) => c.status === 'Closed').length;
  const breached = complaints.filter((c) => c.slaStatus === 'BREACHED').length;
  const atRisk = complaints.filter((c) => c.slaStatus === 'AT_RISK').length;

  const breakdown = [
    { label: 'New', count: newCount, color: '#3B82F6' },
    { label: 'Assigned', count: assignedCount, color: '#6366F1' },
    { label: 'In Progress', count: inProgress, color: '#F59E0B' },
    { label: 'Resolved', count: resolved, color: '#10B981' },
    { label: 'Closed', count: closed, color: '#94A3B8' },
  ];

  const recent = complaints.slice(0, 6);
  const slaAlerts = complaints.filter((c) => c.slaStatus === 'BREACHED' || c.slaStatus === 'AT_RISK').slice(0, 5);

  return (
    <div id="officer-dashboard-screen" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">TOTAL COMPLAINTS</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {complaintsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : total}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">NEW</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{newCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">IN PROGRESS</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{inProgress}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">RESOLVED</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{resolved}</div>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1 text-rose-700">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-[11px] font-bold tracking-wider uppercase">SLA BREACHED</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight mt-1">{breached}</div>
        </div>
      </div>

      {/* Main 2-Column Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Complaints Overview + Quick Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/80 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Complaints Overview</h2>
            <div className="space-y-2.5">
              {breakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span className="font-bold text-slate-800">
                    {item.count} <span className="text-slate-400 font-normal">({total > 0 ? Math.round((item.count / total) * 100) : 0}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/80 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button onClick={() => navigate('my-assignments')} className="p-3 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/70 hover:border-blue-300 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-blue-100/70 text-[#003B95] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">My Assignments</span>
              </button>
              <button onClick={() => navigate('complaints')} className="p-3 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/70 hover:border-blue-300 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-blue-100/70 text-[#003B95] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Complaints Queue</span>
              </button>
              <button onClick={() => navigate('my-assignments')} className="p-3 bg-slate-50 hover:bg-rose-50/80 border border-slate-200/70 hover:border-rose-300 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-rose-100/80 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">SLA Alerts</span>
              </button>
              <button onClick={() => navigate('complaints')} className="p-3 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/70 hover:border-blue-300 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-blue-100/70 text-[#003B95] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Reports</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Complaints + SLA Alerts */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Recent Complaints</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">COMPLAINT ID / ISSUE</th>
                    <th className="py-2.5 px-3">PRIORITY</th>
                    <th className="py-2.5 px-4 text-right">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.length === 0 ? (
                    <tr><td colSpan={3} className="py-6 text-center text-slate-400">{complaintsLoading ? 'Loading…' : 'No complaints found.'}</td></tr>
                  ) : recent.map((item) => (
                    <tr key={item.id} onClick={() => handleRowClick(item.id)} className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            {getCategoryIcon(item.category)}
                          </div>
                          <div>
                            <span className="font-bold text-[#003B95] font-mono group-hover:underline">{item.id}</span>
                            <p className="text-slate-700 font-medium text-xs truncate max-w-[200px] sm:max-w-xs">{item.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.priority === 'Critical' || item.priority === 'High'
                            ? 'bg-red-50 text-red-600 border border-red-200/50'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-medium">{item.submittedOn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {slaBannerVisible && slaAlerts.length > 0 && (
            <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-4 sm:p-5 relative animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-rose-900">SLA Alerts ({atRisk} at risk, {breached} breached)</h3>
                </div>
                <button onClick={() => setSlaBannerVisible(false)} className="text-rose-400 hover:text-rose-700 p-1 rounded hover:bg-rose-100/50 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mb-3">
                {slaAlerts.map((c) => (
                  <div key={c.id} onClick={() => handleRowClick(c.id)} className="flex items-center justify-between bg-white/70 hover:bg-white p-2.5 rounded-lg border border-rose-100 transition-colors cursor-pointer text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${c.slaStatus === 'BREACHED' ? 'bg-rose-600' : 'bg-amber-500'}`} />
                      <span className="font-mono font-bold text-slate-800">{c.id}</span>
                    </div>
                    <span className={`font-bold ${c.slaStatus === 'BREACHED' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {c.slaStatus === 'BREACHED' ? `Breached (Level ${c.escalationLevel})` : 'At risk'}
                    </span>
                  </div>
                ))}
              </div>

              <button id="officer-view-all-alerts-btn" onClick={() => navigate('complaints')} className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer">
                View All Complaints
                <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
