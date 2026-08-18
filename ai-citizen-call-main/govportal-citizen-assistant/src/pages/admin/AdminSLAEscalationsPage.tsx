import React, { useEffect, useState } from 'react';
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import * as api from '../../services/api';
import {
  DepartmentBreakdownItem,
  SLAAtRiskItem,
  SLABreachedItem,
  SLAStatsResponse,
  SLASummary,
} from '../../types';

interface DeptRow {
  department: string;
  total: number;
  breached: number;
  atRisk: number;
  maxEscalation: number;
}

export const AdminSLAEscalationsPage: React.FC = () => {
  const { navigate } = useApp();
  const [summary, setSummary] = useState<SLASummary | null>(null);
  const [slaStats, setSlaStats] = useState<SLAStatsResponse | null>(null);
  const [departments, setDepartments] = useState<DepartmentBreakdownItem[]>([]);
  const [breached, setBreached] = useState<SLABreachedItem[]>([]);
  const [atRisk, setAtRisk] = useState<SLAAtRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.getSLASummary(),
      api.getAnalyticsSLA(),
      api.getAnalyticsDepartments(),
      api.getSLABreached(),
      api.getSLAAtRisk(),
    ])
      .then(([s, stats, depts, br, ar]) => {
        if (cancelled) return;
        setSummary(s);
        setSlaStats(stats);
        setDepartments(depts);
        setBreached(br);
        setAtRisk(ar);
        setError(null);
      })
      .catch(() => !cancelled && setError('Unable to load SLA information from the backend.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const deptRows: DeptRow[] = departments.map((d) => {
    const deptBreached = breached.filter((b) => b.department === d.department);
    const deptAtRisk = atRisk.filter((a) => a.department === d.department);
    const maxEscalation = deptBreached.reduce((m, b) => Math.max(m, b.escalation_level), 0);
    return {
      department: d.department,
      total: d.count,
      breached: deptBreached.length,
      atRisk: deptAtRisk.length,
      maxEscalation,
    };
  });

  return (
    <div id="admin-sla-escalations-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">SLA & Escalation Monitoring</h2>
          <p className="text-xs text-slate-500">Real-time SLA compliance, breaches, and escalations from the backend.</p>
        </div>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 font-semibold">{error}</div>}

      {/* Row 1: 4 Top KPI Cards — all real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">SLA COMPLIANCE</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `${slaStats?.sla_compliance_percentage ?? 0}%`}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Of resolved/closed complaints</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">ACTIVE BREACHES</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary?.breached ?? 0}</div>
            <span className="text-[11px] text-rose-600 font-medium">Requires administrative attention</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">AT RISK</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary?.at_risk ?? 0}</div>
            <span className="text-[11px] text-amber-700 font-medium">Within 20% of SLA deadline</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">COMPLETED (ON TIME)</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary?.completed ?? 0}</div>
            <span className="text-[11px] text-indigo-700 font-medium">Resolved/closed within SLA</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Row 2: Department SLA Breakdown — real counts, no fabricated compliance labels */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Department SLA Breakdown</h3>
          <p className="text-[11px] text-slate-500">Real complaint / breach / at-risk counts per department</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">DEPARTMENT</th>
                <th className="py-3.5 px-5">TOTAL COMPLAINTS</th>
                <th className="py-3.5 px-5">ACTIVE BREACHES</th>
                <th className="py-3.5 px-5">AT RISK</th>
                <th className="py-3.5 px-5">MAX ESCALATION LEVEL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {deptRows.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">{loading ? 'Loading…' : 'No data available'}</td></tr>
              ) : deptRows.map((row) => (
                <tr key={row.department} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-slate-900">{row.department}</td>
                  <td className="py-3.5 px-5 font-mono text-slate-600">{row.total}</td>
                  <td className="py-3.5 px-5 font-bold text-rose-600">{row.breached}</td>
                  <td className="py-3.5 px-5 font-bold text-amber-600">{row.atRisk}</td>
                  <td className="py-3.5 px-5">
                    {row.maxEscalation > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                        Level {row.maxEscalation}
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Real breached-complaint queue */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Breached Complaints Queue</h3>
        {breached.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">{loading ? 'Loading…' : 'No breached complaints — great job!'}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {breached.slice(0, 6).map((b) => (
              <div
                key={b.complaint_id}
                onClick={() => navigate('complaint-details', b.complaint_id)}
                className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2 cursor-pointer hover:bg-rose-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-700">{b.complaint_id} • {b.department}</span>
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">Level {b.escalation_level}</span>
                </div>
                <p className="text-xs text-slate-800 font-medium">Priority: {b.priority} {b.location ? `• ${b.location}` : ''}</p>
                <p className="text-[11px] text-slate-500">SLA deadline: {new Date(b.sla_deadline).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
