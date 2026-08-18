import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  Users,
  Headphones,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronRight,
  ArrowUpRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import * as api from '../../services/api';
import { AnalyticsSummary, DepartmentBreakdownItem, SLASummary } from '../../types';

const DEPT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EF4444', '#64748B', '#0EA5E9', '#A855F7'];

export const AdminDashboardPage: React.FC = () => {
  const { navigate } = useApp();
  const [reportsOpen, setReportsOpen] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [departments, setDepartments] = useState<DepartmentBreakdownItem[]>([]);
  const [slaSummary, setSlaSummary] = useState<SLASummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getAnalyticsSummary(), api.getAnalyticsDepartments(), api.getSLASummary()])
      .then(([s, d, sla]) => {
        if (cancelled) return;
        setSummary(s);
        setDepartments(d);
        setSlaSummary(sla);
        setError(null);
      })
      .catch(() => !cancelled && setError('Unable to load analytics from the backend.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const totalDeptComplaints = departments.reduce((sum, d) => sum + d.count, 0);
  const overallSlaPct = slaSummary && (slaSummary.completed + slaSummary.breached) > 0
    ? Math.round((slaSummary.completed / (slaSummary.completed + slaSummary.breached)) * 100)
    : null;

  return (
    <div id="admin-dashboard-page" className="space-y-6">
      {/* Top Header Actions Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Overview</h2>
          <p className="text-xs text-slate-500">Real-time status of complaints, departments, and SLA metrics</p>
        </div>

        {/* System Reports Dropdown Button */}
        <div className="relative">
          <button
            id="admin-system-reports-btn"
            onClick={() => setReportsOpen(prev => !prev)}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <span>System Reports</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {reportsOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 text-xs">
              <button
                onClick={() => { setReportsOpen(false); navigate('complaint-management'); }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Complaint Management</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => { setReportsOpen(false); navigate('sla-escalations'); }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span>SLA Compliance Summary</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => { setReportsOpen(false); navigate('call-center-management'); }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Executive Performance (Demo)</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 font-semibold">{error}</div>
      )}

      {/* Row 1: Top 5 Complaint KPI Cards — real analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1D4ED8]" />
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">TOTAL COMPLAINTS</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary?.total_complaints ?? 0}
            </div>
          </div>
          <button onClick={() => navigate('complaint-management')} className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-3 text-left flex items-center gap-0.5">
            <span>View all</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">ACTIVE COMPLAINTS</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (summary ? summary.pending + summary.assigned + summary.in_progress : 0)}
            </div>
          </div>
          <button onClick={() => navigate('complaint-management')} className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-3 text-left flex items-center gap-0.5">
            <span>View all</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-400" />
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">RESOLVED COMPLAINTS</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (summary ? summary.resolved + summary.closed : 0)}
            </div>
          </div>
          <button onClick={() => navigate('complaint-management')} className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-3 text-left flex items-center gap-0.5">
            <span>View all</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">SLA BREACHED</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary?.sla_breached ?? 0}
            </div>
          </div>
          <button onClick={() => navigate('sla-escalations')} className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-3 text-left flex items-center gap-0.5">
            <span>View all</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-600" />
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">HIGH / CRITICAL</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (summary ? summary.high + summary.critical : 0)}
            </div>
          </div>
          <button onClick={() => navigate('complaint-management')} className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-3 text-left flex items-center gap-0.5">
            <span>View all</span>
          </button>
        </div>
      </div>

      {/* Row 2: Secondary System Metric Cards. Departments/registered-users/
          call-center-execs have no backend-managed directory (only inferred
          from complaint data or entirely demo), labeled accordingly. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">DEPARTMENTS WITH ACTIVITY</span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{departments.length}</div>
            <button onClick={() => navigate('department-management')} className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-1 inline-block">
              View all
            </button>
          </div>
          <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">DUPLICATES DETECTED</span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{summary?.duplicates ?? 0}</div>
            <button onClick={() => navigate('complaint-management')} className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-1 inline-block">
              View all
            </button>
          </div>
          <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">CALL CENTER EXECS (DEMO)</span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">—</div>
            <button onClick={() => navigate('call-center-management')} className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-1 inline-block">
              View all
            </button>
          </div>
          <div className="w-11 h-11 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <Headphones className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">SLA COMPLIANCE (RESOLVED)</span>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">
              {overallSlaPct !== null ? `${overallSlaPct}%` : '—'}
            </div>
            <button onClick={() => navigate('sla-escalations')} className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-1 inline-block">
              View details
            </button>
          </div>
          <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Row 3: Department Workload (real) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-12 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Department Workload</h3>
            <p className="text-[11px] text-slate-500">Real complaint counts per department (all time)</p>
          </div>

          {departments.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              {loading ? 'Loading…' : 'No data available'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {departments.map((d, i) => (
                <div key={d.department} className="flex items-center justify-between bg-slate-50/70 border border-slate-200/70 rounded-lg px-3 py-2.5 text-xs">
                  <span className="flex items-center gap-2 text-slate-700 font-medium truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                    <span className="truncate">{d.department}</span>
                  </span>
                  <span className="font-bold text-slate-900 shrink-0">
                    {d.count} <span className="text-slate-400 font-normal">({totalDeptComplaints > 0 ? Math.round((d.count / totalDeptComplaints) * 100) : 0}%)</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Important Alerts — real SLA/priority counts */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Important Alerts</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 border flex items-center justify-between bg-rose-50/70 border-rose-200/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-rose-100 text-rose-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-900">SLA Breach Alert</h4>
                <p className="text-[11px] text-slate-600">{summary?.sla_breached ?? 0} complaints breached SLA</p>
              </div>
            </div>
            <button onClick={() => navigate('sla-escalations')} className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center gap-0.5 shrink-0">
              <span>View details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-xl p-4 border flex items-center justify-between bg-orange-50/70 border-orange-200/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-orange-100 text-orange-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-orange-900">High Priority Complaints</h4>
                <p className="text-[11px] text-slate-600">{summary ? summary.high + summary.critical : 0} high/critical priority complaints pending</p>
              </div>
            </div>
            <button onClick={() => navigate('complaint-management')} className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center gap-0.5 shrink-0">
              <span>View details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-xl p-4 border flex items-center justify-between bg-amber-50/70 border-amber-200/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-amber-100 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900">Approaching SLA Deadline</h4>
                <p className="text-[11px] text-slate-600">{summary?.sla_at_risk ?? 0} complaints approaching deadline</p>
              </div>
            </div>
            <button onClick={() => navigate('sla-escalations')} className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center gap-0.5 shrink-0">
              <span>View details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
