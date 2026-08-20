import React from 'react';
import { 
  Headphones, 
  Download, 
  ChevronRight, 
  FileText, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  PhoneCall 
} from 'lucide-react';
import { 
  ADMIN_CALL_CENTER_STATS, 
  ADMIN_EXECUTIVE_ACTIVITY, 
  ADMIN_TOP_EXECUTIVES 
} from '../../data/adminData';

export const AdminCallCenterManagementPage: React.FC = () => {
  const handleExport = () => {
    alert('Call Center Performance Report exported successfully as CSV.');
  };

  return (
    <div id="admin-callcenter-mgmt-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Call Center Management</h2>
          <p className="text-xs text-slate-500">Monitor call center executives, activity, and performance.</p>
        </div>

        {/* Export Action Button */}
        <button 
          id="admin-export-callcenter-btn"
          onClick={handleExport}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Row 1: 5 Executive & Call Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Executives */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">TOTAL EXECUTIVES</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{ADMIN_CALL_CENTER_STATS.totalExecutives}</div>
          <button className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-3 text-left flex items-center gap-0.5">
            <span>View all</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Active Executives */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">ACTIVE EXECUTIVES</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{ADMIN_CALL_CENTER_STATS.activeExecutives}</div>
          <button className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-3 text-left flex items-center gap-0.5">
            <span>View all</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Available Online */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            AVAILABLE (ONLINE)
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{ADMIN_CALL_CENTER_STATS.availableOnline}</div>
          <button className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-3 text-left flex items-center gap-0.5">
            <span>View all</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Offline */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">OFFLINE</span>
          <div className="text-2xl font-bold text-slate-600 mt-1">{ADMIN_CALL_CENTER_STATS.offline}</div>
          <button className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-3 text-left flex items-center gap-0.5">
            <span>View all</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Calls Handled Today */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">CALLS HANDLED (TODAY)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{ADMIN_CALL_CENTER_STATS.callsHandledToday}</div>
          <button className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-3 text-left flex items-center gap-0.5">
            <span>View all</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Row 2: Secondary 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Complaints Created Today */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Complaints Created (Today)</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{ADMIN_CALL_CENTER_STATS.complaintsCreatedToday}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Avg Handling Time */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Avg Handling Time</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{ADMIN_CALL_CENTER_STATS.avgHandlingTime}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Resolution / Follow-up Rate</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{ADMIN_CALL_CENTER_STATS.resolutionRate}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Row 3: Charts Row (Activity Trend Bar Chart & Workload Distribution Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Executive Activity Trend (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Executive Activity Trend</h3>
              <p className="text-[11px] text-slate-500">Last 7 Days</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">Calls Handled</span>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-48 w-full pt-4 flex items-end justify-between px-4 border-b border-slate-100 pb-2">
            {ADMIN_EXECUTIVE_ACTIVITY.map((item, idx) => {
              // Pixel height, not percentage: this column's own parent (the
              // per-bar flex-col div) has no definite height of its own --
              // it shrinks to fit its content, since the chart row above
              // uses `items-end` rather than `items-stretch`. A percentage
              // height is therefore indeterminate per the CSS spec and
              // renders as 0 (bars were invisible for every value). A fixed
              // pixel height, capped to fit inside the h-48 (192px) row
              // alongside the two label lines, has no such dependency.
              const barHeightPx = Math.round((item.calls / 160) * 120);
              return (
                <div key={idx} className="flex flex-col items-center gap-2 group flex-1">
                  <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                    {item.calls}
                  </span>
                  <div
                    className="w-7 bg-[#1D4ED8] hover:bg-[#1e40af] rounded-t-md transition-all"
                    style={{ height: `${barHeightPx}px` }}
                  />
                  <span className="text-[11px] text-slate-500 font-medium">{item.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workload Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-bold text-slate-900">Workload Distribution</h3>
              <p className="text-[11px] text-slate-500">By Executives</p>
            </div>

            <div className="flex items-center justify-center gap-5 pt-2">
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#E2E8F0" strokeWidth="12" />
                  {/* Segment 1: High (18%) */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="43 238" strokeDashoffset="0" />
                  {/* Segment 2: Medium (53%) */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="125 238" strokeDashoffset="-43" />
                  {/* Segment 3: Low (29%) */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="70 238" strokeDashoffset="-168" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-bold text-slate-900 leading-tight">156</span>
                  <span className="text-[9px] text-slate-400 font-medium">Total</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 text-[11px] flex-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>High (80+)</span>
                  </span>
                  <span className="font-semibold text-slate-900">28 (17.9%)</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Medium (40-80)</span>
                  </span>
                  <span className="font-semibold text-slate-900">82 (52.6%)</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Low (&lt; 40)</span>
                  </span>
                  <span className="font-semibold text-slate-900">46 (29.5%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Top Performing Executives (Today) Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Top Performing Executives (Today)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">EXECUTIVE NAME</th>
                <th className="py-3.5 px-5">CALLS HANDLED</th>
                <th className="py-3.5 px-5">COMPLAINTS CREATED</th>
                <th className="py-3.5 px-5">AVG HANDLING TIME</th>
                <th className="py-3.5 px-5">PERFORMANCE</th>
                <th className="py-3.5 px-5">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {ADMIN_TOP_EXECUTIVES.map((exec) => (
                <tr key={exec.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-slate-900">
                    {exec.executiveName}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-900">
                    {exec.callsHandled}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-900">
                    {exec.complaintsCreated}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-slate-600">
                    {exec.avgHandlingTime}
                  </td>
                  <td className="py-3.5 px-5 font-bold text-emerald-600">
                    {exec.performance}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      exec.status === 'Online'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {exec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
