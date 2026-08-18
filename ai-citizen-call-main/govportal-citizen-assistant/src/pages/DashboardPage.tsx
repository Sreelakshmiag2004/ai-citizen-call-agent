import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Plus,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  Droplet,
  Lightbulb,
  Trash2,
  Calendar,
  Building,
  AlertTriangle,
} from 'lucide-react';
import { ComplaintStatus } from '../types';

const DONUT_RADIUS = 38;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

export const DashboardPage: React.FC = () => {
  const { user, complaints, complaintsLoading, complaintsError, navigate, resetComplaintDraft } = useApp();

  const handleRaiseComplaint = () => {
    resetComplaintDraft();
    navigate('raise-complaint');
  };

  const getStatusBadgeClass = (status: ComplaintStatus) => {
    switch (status) {
      case 'In Progress':
        return 'bg-amber-100/80 text-amber-800 border border-amber-200';
      case 'Assigned':
        return 'bg-blue-100/80 text-blue-800 border border-blue-200';
      case 'Verified':
        return 'bg-emerald-100/80 text-emerald-800 border border-emerald-200';
      case 'Resolved':
        return 'bg-green-100/80 text-green-800 border border-green-200';
      case 'Closed':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'water supply':
      case 'water':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Droplet className="w-5 h-5" />
          </div>
        );
      case 'electricity':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
        );
      case 'sanitation':
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
        );
    }
  };

  const activeComplaints = complaints.slice(0, 3);

  const total = complaints.length;
  const counts = {
    New: complaints.filter((c) => c.status === 'New').length,
    Assigned: complaints.filter((c) => c.status === 'Assigned').length,
    'In Progress': complaints.filter((c) => c.status === 'In Progress').length,
    Resolved: complaints.filter((c) => c.status === 'Resolved').length,
    Closed: complaints.filter((c) => c.status === 'Closed').length,
  };

  const donutSegments: { label: string; count: number; color: string }[] = [
    { label: 'In Progress', count: counts['In Progress'], color: '#F59E0B' },
    { label: 'Assigned', count: counts.Assigned, color: '#3B82F6' },
    { label: 'Resolved', count: counts.Resolved, color: '#10B981' },
    { label: 'Closed', count: counts.Closed, color: '#EF4444' },
  ];

  let cumulative = 0;
  const donutArcs = donutSegments.map((seg) => {
    const pct = total > 0 ? seg.count / total : 0;
    const arcLength = pct * DONUT_CIRCUMFERENCE;
    const offset = -cumulative * DONUT_CIRCUMFERENCE;
    cumulative += pct;
    return { ...seg, pct, arcLength, offset };
  });

  return (
    <div id="citizen-dashboard" className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Welcome, {user?.fullName || 'Citizen'} <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's what's happening with complaints across GovPortal.
          </p>
        </div>

        <button
          id="dashboard-raise-complaint-btn"
          onClick={handleRaiseComplaint}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-sm rounded-lg shadow-sm hover:shadow transition-all shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Complaint</span>
        </button>
      </div>

      {complaintsError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-xs text-rose-700 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{complaintsError}</span>
        </div>
      )}

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Complaints */}
        <div
          onClick={() => navigate('my-complaints')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {complaintsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : total}
              </div>
              <div className="text-xs font-semibold text-slate-500">Total Complaints</div>
              <div className="mt-1 flex items-center text-[11px] font-bold text-[#003B95] group-hover:underline">
                View all →
              </div>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => navigate('my-complaints')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{counts['In Progress']}</div>
              <div className="text-xs font-semibold text-slate-500">In Progress</div>
              <div className="mt-1 flex items-center text-[11px] font-bold text-[#003B95] group-hover:underline">
                View all →
              </div>
            </div>
          </div>
        </div>

        {/* Resolved */}
        <div
          onClick={() => navigate('my-complaints')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{counts.Resolved}</div>
              <div className="text-xs font-semibold text-slate-500">Resolved</div>
              <div className="mt-1 flex items-center text-[11px] font-bold text-[#003B95] group-hover:underline">
                View all →
              </div>
            </div>
          </div>
        </div>

        {/* Closed */}
        <div
          onClick={() => navigate('my-complaints')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{counts.Closed}</div>
              <div className="text-xs font-semibold text-slate-500">Closed</div>
              <div className="mt-1 flex items-center text-[11px] font-bold text-[#003B95] group-hover:underline">
                View all →
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Complaints (Left) & Status Overview Donut (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Complaints */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">
              Recent Complaints
            </h2>
            <button
              id="dashboard-view-all-complaints-btn"
              onClick={() => navigate('my-complaints')}
              className="text-xs font-bold text-[#003B95] hover:underline"
            >
              View All
            </button>
          </div>

          {/* Active Complaints List */}
          {complaintsLoading ? (
            <div className="py-12 flex items-center justify-center text-slate-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading complaints…
            </div>
          ) : activeComplaints.length > 0 ? (
            <div className="space-y-4">
              {activeComplaints.map((item) => (
                <div
                  key={item.id}
                  id={`complaint-card-${item.id}`}
                  onClick={() => navigate('complaint-details', item.id)}
                  className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    {getCategoryIcon(item.category)}
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono font-bold text-slate-400">
                        {item.id}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#003B95] transition-colors leading-snug">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {item.submittedOn}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:self-center shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
              No complaints found. Raise your first complaint to get started.
            </div>
          )}

          {/* Load More Button */}
          {activeComplaints.length > 0 && (
            <button
              id="load-more-complaints-btn"
              onClick={() => navigate('my-complaints')}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <span>View All Complaints</span>
            </button>
          )}
        </div>

        {/* Right Column: Status Overview Donut */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">
              Status Overview
            </h2>
          </div>

          {/* Donut Chart Component — real, computed from live complaint counts */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r={DONUT_RADIUS} fill="transparent" stroke="#F1F5F9" strokeWidth="10" />
                {total > 0 &&
                  donutArcs.map((arc) =>
                    arc.count > 0 ? (
                      <circle
                        key={arc.label}
                        cx="50"
                        cy="50"
                        r={DONUT_RADIUS}
                        fill="transparent"
                        stroke={arc.color}
                        strokeWidth="10"
                        strokeDasharray={`${arc.arcLength} ${DONUT_CIRCUMFERENCE - arc.arcLength}`}
                        strokeDashoffset={arc.offset}
                      />
                    ) : null
                  )}
              </svg>

              {/* Center Counter */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{total}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="w-full space-y-3 pt-6 text-xs">
              {donutSegments.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-slate-700 font-medium">{seg.label}</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {seg.count}{' '}
                    <span className="text-slate-400 font-normal">
                      ({total > 0 ? Math.round((seg.count / total) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
