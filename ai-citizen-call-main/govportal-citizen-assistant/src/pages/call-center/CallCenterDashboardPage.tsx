import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Phone,
  Bot,
  CheckCircle2,
  AlertCircle,
  Percent,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import * as api from '../../services/api';
import { AnalyticsSummary, SLAStatsResponse } from '../../types';

// Real backend numbers where a backend equivalent exists (analytics summary
// + SLA stats). "Active Calls", "AI Exceptions" and "Failed Processing" have
// no backend equivalent (there is no live-call/exception feed API) and are
// intentionally left out rather than fabricated — see the Live Calls /
// Exceptions pages for their existing demo-only presentation.
export const CallCenterDashboardPage: React.FC = () => {
  const { navigate, complaints, complaintsLoading } = useApp();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [slaStats, setSlaStats] = useState<SLAStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getAnalyticsSummary(), api.getAnalyticsSLA()])
      .then(([s, sla]) => {
        if (cancelled) return;
        setSummary(s);
        setSlaStats(sla);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load analytics from the backend.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const recentComplaints = complaints.slice(0, 6);

  const statCards = [
    {
      title: 'Total Complaints Processed',
      value: summary ? summary.total_complaints : '—',
      subtext: 'All time (AI pipeline)',
      icon: <Bot className="w-5 h-5 text-purple-600" />,
      iconBg: 'bg-purple-50',
      action: () => navigate('complaints'),
    },
    {
      title: 'Assigned + In Progress',
      value: summary ? summary.assigned + summary.in_progress : '—',
      subtext: 'Currently active',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50',
      action: () => navigate('complaints'),
    },
    {
      title: 'High / Critical Priority',
      value: summary ? summary.high + summary.critical : '—',
      subtext: 'Requires attention',
      icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
      iconBg: 'bg-rose-50',
      action: () => navigate('complaints'),
    },
    {
      title: 'Duplicate Rate',
      value: summary && summary.total_complaints > 0
        ? `${Math.round((summary.duplicates / summary.total_complaints) * 100)}%`
        : '0%',
      subtext: `${summary?.duplicates ?? 0} duplicates detected`,
      icon: <Percent className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-50',
      action: () => navigate('complaints'),
    },
    {
      title: 'SLA At Risk',
      value: summary ? summary.sla_at_risk : '—',
      subtext: 'Approaching deadline',
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-50',
    },
    {
      title: 'SLA Breached',
      value: summary ? summary.sla_breached : '—',
      subtext: 'Past deadline',
      icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
      iconBg: 'bg-rose-50',
    },
    {
      title: 'SLA Compliance',
      value: slaStats ? `${slaStats.sla_compliance_percentage}%` : '—',
      subtext: 'Completed on time',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50',
    },
  ];

  return (
    <div id="call-center-dashboard" className="space-y-6">
      {/* Top Banner with Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, Priya Sharma 👋
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Call Center Executive
          </p>
        </div>

        <button
          id="dashboard-view-live-calls-btn"
          onClick={() => navigate('live-calls')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-sm rounded-lg shadow-sm transition-all"
        >
          <span>View Live Calls (Demo)</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {/* Real Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            id={`cc-stat-card-${idx}`}
            onClick={card.action}
            className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs transition-all ${
              card.action ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}>
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : card.value}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{card.subtext}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent complaints (real data) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <h3 className="text-base font-bold text-slate-900">Recent Complaints</h3>
          <button
            id="recent-activity-view-all-btn"
            onClick={() => navigate('complaints')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            View All
          </button>
        </div>

        {complaintsLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : recentComplaints.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No complaints found.</div>
        ) : (
          <div className="space-y-1">
            {recentComplaints.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate('complaint-details', c.id)}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-slate-50/80 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate max-w-xs">{c.title}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{c.id} · {c.department}</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-slate-50 text-slate-700 border-slate-200 shrink-0">
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
