import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Loader2,
} from 'lucide-react';

export const OfficerComplaintsPage: React.FC = () => {
  const { navigate, setSelectedComplaintId, complaints, complaintsLoading, complaintsError } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'in-progress' | 'resolved' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => ({
    all: complaints.length,
    new: complaints.filter((c) => c.status === 'New').length,
    'in-progress': complaints.filter((c) => c.status === 'In Progress' || c.status === 'Assigned').length,
    resolved: complaints.filter((c) => c.status === 'Resolved').length,
    closed: complaints.filter((c) => c.status === 'Closed').length,
  }), [complaints]);

  const tabs = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'new', label: `New (${counts.new})` },
    { id: 'in-progress', label: `In Progress (${counts['in-progress']})` },
    { id: 'resolved', label: `Resolved (${counts.resolved})` },
    { id: 'closed', label: `Closed (${counts.closed})` },
  ];

  const filteredComplaints = complaints.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'new') return item.status === 'New';
    if (activeTab === 'in-progress') return item.status === 'In Progress' || item.status === 'Assigned';
    if (activeTab === 'resolved') return item.status === 'Resolved';
    if (activeTab === 'closed') return item.status === 'Closed';
    return true;
  });

  const handleRowClick = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    navigate('officer-complaint-details', complaintId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-50 text-blue-700 border border-blue-200/60';
      case 'New': return 'bg-sky-50 text-sky-700 border border-sky-200/60';
      case 'Assigned': return 'bg-amber-50 text-amber-700 border border-amber-200/60';
      case 'Resolved': return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
      case 'High': return 'bg-rose-50 text-rose-600 border border-rose-200/60';
      case 'Medium': return 'bg-amber-50 text-amber-700 border border-amber-200/60';
      default: return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
    }
  };

  return (
    <div id="officer-complaints-screen" className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Complaints</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time complaint queue from the backend</p>
        </div>

        <div className="relative w-full sm:w-80">
          <input
            id="officer-complaints-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search complaint ID, category or location..."
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#003B95] focus:ring-1 focus:ring-[#003B95] transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {complaintsError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 font-semibold">{complaintsError}</div>
      )}

      <div className="border-b border-slate-200 flex items-center gap-6 overflow-x-auto text-xs font-semibold scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`complaints-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 whitespace-nowrap cursor-pointer transition-all border-b-2 ${
              activeTab === tab.id ? 'border-[#003B95] text-[#003B95] font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Complaint ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">SLA</th>
                <th className="py-3 px-4 text-right">Created On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaintsLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</td></tr>
              ) : filteredComplaints.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">No complaints found.</td></tr>
              ) : filteredComplaints.map((row) => (
                <tr key={row.id} onClick={() => handleRowClick(row.id)} className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                  <td className="py-3 px-4"><span className="font-bold text-[#003B95] font-mono group-hover:underline">{row.id}</span></td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{row.category}</td>
                  <td className="py-3 px-3"><span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${getPriorityBadge(row.priority)}`}>{row.priority}</span></td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{row.location}</td>
                  <td className="py-3 px-3"><span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${getStatusBadge(row.status)}`}>{row.status}</span></td>
                  <td className="py-3 px-4">
                    <span className={`text-[11px] font-bold ${row.slaStatus === 'BREACHED' ? 'text-rose-600' : row.slaStatus === 'AT_RISK' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {row.slaStatus || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 font-medium">{row.submittedOn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800 font-bold">{filteredComplaints.length}</strong> of{' '}
            <strong className="text-slate-800 font-bold">{complaints.length}</strong> complaints
          </div>
        </div>
      </div>
    </div>
  );
};
