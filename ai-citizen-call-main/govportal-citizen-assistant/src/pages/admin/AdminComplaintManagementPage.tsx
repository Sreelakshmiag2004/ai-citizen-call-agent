import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  X,
  Loader2,
} from 'lucide-react';
import { ComplaintStatus } from '../../types';

// Backend-valid forward transitions per status (mirrors
// backend/app/services/complaint_service.py ALLOWED_TRANSITIONS, display-side only).
const NEXT_STATUSES: Record<ComplaintStatus, ComplaintStatus[]> = {
  New: ['Assigned', 'Closed'],
  Assigned: ['In Progress', 'New', 'Closed'],
  'In Progress': ['Resolved', 'Assigned', 'Closed'],
  Resolved: ['Closed', 'In Progress'],
  Closed: ['In Progress', 'New'],
  Verified: [],
  Routed: [],
  Exception: [],
  'On Hold': [],
};

export const AdminComplaintManagementPage: React.FC = () => {
  const { complaints, complaintsLoading, complaintsError, updateComplaintStatus, navigate } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedPriority, setSelectedPriority] = useState('All Priorities');
  const [currentPage, setCurrentPage] = useState(1);

  const [statusModalComplaintId, setStatusModalComplaintId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  const itemsPerPage = 10;

  const departments = Array.from(new Set(complaints.map((c) => c.department))).sort();
  const statuses = Array.from(new Set(complaints.map((c) => c.status))).sort();
  const priorities = Array.from(new Set(complaints.map((c) => c.priority))).sort();

  const filtered = complaints.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All Departments' || c.department === selectedDept;
    const matchesStatus = selectedStatus === 'All Status' || c.status === selectedStatus;
    const matchesPriority = selectedPriority === 'All Priorities' || c.priority === selectedPriority;
    return matchesSearch && matchesDept && matchesStatus && matchesPriority;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    const header = 'Complaint ID,Category,Department,Priority,Status,Submitted On,SLA Status\n';
    const rows = filtered
      .map((c) => [c.id, c.category, c.department, c.priority, c.status, c.submittedOn, c.slaStatus || ''].join(','))
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'complaints_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeModalComplaint = complaints.find((c) => c.id === statusModalComplaintId) || null;

  const handleUpdateStatus = async (newStatus: ComplaintStatus) => {
    if (!activeModalComplaint) return;
    setStatusUpdating(true);
    setStatusUpdateError(null);
    const result = await updateComplaintStatus(activeModalComplaint.id, newStatus);
    setStatusUpdating(false);
    if (result.ok) {
      setStatusModalComplaintId(null);
    } else {
      setStatusUpdateError(result.error);
    }
  };

  return (
    <div id="admin-complaint-mgmt-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Complaint Management</h2>
          <p className="text-xs text-slate-500">System-wide complaints tracking and status overrides — real backend data.</p>
        </div>

        <button
          id="admin-export-complaints-btn"
          onClick={handleExport}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span>Export CSV</span>
        </button>
      </div>

      {complaintsError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 font-semibold">{complaintsError}</div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="admin-complaint-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by Complaint ID, category, or keyword..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select value={selectedDept} onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#1D4ED8]">
            <option>All Departments</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>

          <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#1D4ED8]">
            <option>All Status</option>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>

          <select value={selectedPriority} onChange={(e) => { setSelectedPriority(e.target.value); setCurrentPage(1); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#1D4ED8]">
            <option>All Priorities</option>
            {priorities.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">COMPLAINT ID</th>
                <th className="py-3.5 px-5">CATEGORY</th>
                <th className="py-3.5 px-5">DEPARTMENT</th>
                <th className="py-3.5 px-5">SUBMITTED ON</th>
                <th className="py-3.5 px-5">SLA STATUS</th>
                <th className="py-3.5 px-5">PRIORITY</th>
                <th className="py-3.5 px-5">STATUS</th>
                <th className="py-3.5 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {complaintsLoading ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading complaints…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400">No complaints found.</td></tr>
              ) : paginated.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => navigate('complaint-details', c.id)}>
                  <td className="py-3.5 px-5 font-mono font-bold text-[#1D4ED8]">{c.id}</td>
                  <td className="py-3.5 px-5 text-slate-700">{c.category}</td>
                  <td className="py-3.5 px-5 text-slate-600">{c.department}</td>
                  <td className="py-3.5 px-5 text-slate-500">{c.submittedOn}</td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center gap-1 font-medium ${
                      c.slaStatus === 'BREACHED' ? 'text-rose-600 font-bold' :
                      c.slaStatus === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {c.slaStatus === 'BREACHED' ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {c.slaStatus || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                      c.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                      c.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                      c.priority === 'Medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      c.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      c.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      c.status === 'Closed' ? 'bg-slate-100 text-slate-700' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setStatusModalComplaintId(c.id); setStatusUpdateError(null); }}
                      className="px-2.5 py-1 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Update Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>Showing {paginated.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} complaints</span>
          <div className="flex items-center gap-1.5">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-semibold text-slate-700">{currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Real status-update modal (calls PATCH /complaints/{id}/status) */}
      {activeModalComplaint && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Status</h3>
                <p className="text-xs text-slate-500">{activeModalComplaint.id} • Current: {activeModalComplaint.status}</p>
              </div>
              <button onClick={() => setStatusModalComplaintId(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {statusUpdateError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold">
                {statusUpdateError}
              </div>
            )}

            <div className="space-y-2">
              {(NEXT_STATUSES[activeModalComplaint.status] || []).length === 0 ? (
                <p className="text-xs text-slate-400">No further transitions available from this status.</p>
              ) : (
                NEXT_STATUSES[activeModalComplaint.status].map((next) => (
                  <button
                    key={next}
                    disabled={statusUpdating}
                    onClick={() => handleUpdateStatus(next)}
                    className="w-full px-4 py-2.5 border border-slate-300 hover:border-[#1D4ED8] hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {statusUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Move to {next}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
