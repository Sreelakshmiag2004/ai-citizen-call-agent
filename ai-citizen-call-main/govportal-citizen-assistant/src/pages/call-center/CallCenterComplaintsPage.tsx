import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

export const CallCenterComplaintsPage: React.FC = () => {
  const { navigate, setSelectedComplaintId, callCenterComplaints, complaintsLoading, complaintsError } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredComplaints = useMemo(() => {
    return callCenterComplaints.filter((item) => {
      const matchesSearch = 
        !searchTerm ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.callerName && item.callerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        statusFilter === 'All Status' || 
        item.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesDept = 
        deptFilter === 'All Departments' || 
        item.department.toLowerCase().includes(deptFilter.toLowerCase());

      const matchesPriority = 
        priorityFilter === 'All Priorities' || 
        item.priority.toLowerCase() === priorityFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesDept && matchesPriority;
    });
  }, [callCenterComplaints, searchTerm, statusFilter, deptFilter, priorityFilter]);

  const handleRowClick = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    navigate('complaint-details', complaintId);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Routed':
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Exception':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'text-slate-600';
    if (score >= 90) return 'text-emerald-600 font-semibold';
    if (score >= 75) return 'text-blue-600 font-semibold';
    return 'text-amber-600 font-semibold';
  };

  return (
    <div id="call-center-complaints-page" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Complaints</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          View and track all complaints
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box (5 cols) */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="complaints-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, caller, or issue..."
              className="w-full pl-9 pr-3.5 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Status Dropdown (2-3 cols) */}
          <div className="lg:col-span-2 relative">
            <select
              id="complaints-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none pr-8 cursor-pointer"
            >
              <option>All Status</option>
              <option>Routed</option>
              <option>In Progress</option>
              <option>Exception</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Department Dropdown (3 cols) */}
          <div className="lg:col-span-3 relative">
            <select
              id="complaints-dept-filter"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none pr-8 cursor-pointer"
            >
              <option>All Departments</option>
              <option>PWD</option>
              <option>Electrical</option>
              <option>Sanitation</option>
              <option>Water Supply</option>
              <option>Police</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Priority Dropdown (2 cols) */}
          <div className="lg:col-span-2 relative">
            <select
              id="complaints-priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none pr-8 cursor-pointer"
            >
              <option>All Priorities</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Complaint ID</th>
                <th className="py-3.5 px-4 font-semibold">Caller</th>
                <th className="py-3.5 px-4 font-semibold">Issue</th>
                <th className="py-3.5 px-4 font-semibold">Priority</th>
                <th className="py-3.5 px-4 font-semibold">Department</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">AI Confidence</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaintsLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading complaints…</span>
                  </td>
                </tr>
              ) : complaintsError ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-rose-500 font-semibold">
                    {complaintsError}
                  </td>
                </tr>
              ) : filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No complaints found.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((item) => (
                  <tr
                    key={item.id}
                    id={`complaint-row-${item.id}`}
                    onClick={() => handleRowClick(item.id)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 font-mono">
                      {item.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {item.callerName || 'Citizen'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {item.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getPriorityBadge(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {item.department}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className={getConfidenceColor(item.aiConfidence)}>
                        {item.aiConfidence ? `${item.aiConfidence}%` : '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(item.id);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination info */}
        <div className="py-3.5 px-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredComplaints.length > 0 ? 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-800">{filteredComplaints.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{callCenterComplaints.length}</span> complaints
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-semibold text-xs">
              1
            </button>
            <button className="px-2.5 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs">
              2
            </button>
            <button className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
