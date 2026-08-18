import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// Real backend data (via AppContext, same source as OfficerComplaintsPage.tsx
// -- GET /complaints). The backend has no per-officer ownership model, so
// this is the full queue rather than a filtered "assigned to me" set (same
// caveat already documented on OfficerDashboardPage.tsx).
export const OfficerAssignmentsPage: React.FC = () => {
  const { navigate, setSelectedComplaintId, complaints, complaintsLoading } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'pending' | 'overdue' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // 'pending' maps to the real 'New' status (not yet started), and
  // 'overdue' maps to slaStatus === 'BREACHED' (the backend has no separate
  // "Overdue" complaint status -- overdue-ness is an SLA property, not a
  // workflow status), mirroring how OfficerDashboardPage already treats it.
  const counts = useMemo(() => ({
    all: complaints.length,
    'in-progress': complaints.filter((c) => c.status === 'In Progress' || c.status === 'Assigned').length,
    pending: complaints.filter((c) => c.status === 'New').length,
    overdue: complaints.filter((c) => c.slaStatus === 'BREACHED').length,
    resolved: complaints.filter((c) => c.status === 'Resolved').length,
  }), [complaints]);

  const tabs = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'in-progress', label: `In Progress (${counts['in-progress']})` },
    { id: 'pending', label: `Pending (${counts.pending})` },
    { id: 'overdue', label: `Overdue (${counts.overdue})` },
    { id: 'resolved', label: `Resolved (${counts.resolved})` },
  ];

  const filteredAssignments = complaints.filter(item => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'in-progress') return item.status === 'In Progress' || item.status === 'Assigned';
    if (activeTab === 'pending') return item.status === 'New';
    if (activeTab === 'overdue') return item.slaStatus === 'BREACHED';
    if (activeTab === 'resolved') return item.status === 'Resolved';
    return true;
  });

  const handleRowClick = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    navigate('officer-complaint-details', complaintId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border border-blue-200/60';
      case 'New':
        return 'bg-sky-50 text-sky-700 border border-sky-200/60';
      case 'Assigned':
        return 'bg-amber-50 text-amber-700 border border-amber-200/60';
      case 'Closed':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'Resolved':
      default:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
    }
  };

  const formatDueDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

  return (
    <div id="officer-assignments-screen" className="space-y-5 animate-in fade-in duration-200">
      {/* Header with Title and Search/Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            My Assignments
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Complaints assigned to you
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <input
              id="officer-assignments-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, title, location..."
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#003B95] focus:ring-1 focus:ring-[#003B95] transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <button
            id="officer-filter-assignments-btn"
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs matching Screenshot 2 */}
      <div className="border-b border-slate-200 flex items-center gap-6 overflow-x-auto text-xs font-semibold scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
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

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Complaint ID</th>
                <th className="py-3 px-4">Issue</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaintsLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No assignments found.</td>
                </tr>
              ) : filteredAssignments.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick(row.id)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4">
                    <span className="font-bold text-[#003B95] font-mono group-hover:underline">
                      {row.id}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {row.title}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        row.priority === 'Critical' || row.priority === 'High'
                          ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}
                    >
                      {row.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {row.location}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {formatDueDate(row.slaDeadline)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${getStatusBadge(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800 font-bold">1 to {filteredAssignments.length}</strong> of{' '}
            <strong className="text-slate-800 font-bold">{complaints.length}</strong> assignments
          </div>

          <div className="flex items-center gap-3">
            {/* Page buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded bg-[#003B95] text-white font-bold flex items-center justify-center shadow-2xs">
                1
              </button>
              <button className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 font-semibold cursor-pointer">
                2
              </button>
              <button className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 font-semibold cursor-pointer">
                3
              </button>
              <button className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 font-semibold cursor-pointer">
                4
              </button>
              <button className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 font-semibold cursor-pointer">
                5
              </button>
              <span className="px-1 text-slate-400">...</span>
              <button className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Page size dropdown */}
            <select className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer">
              <option>10 / page</option>
              <option>25 / page</option>
              <option>50 / page</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
