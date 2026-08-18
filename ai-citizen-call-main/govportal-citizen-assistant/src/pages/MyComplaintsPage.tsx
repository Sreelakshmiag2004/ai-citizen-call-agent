import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComplaintStatus, PriorityLevel } from '../types';

export const MyComplaintsPage: React.FC = () => {
  const { complaints, navigate } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => {
      const matchesSearch = 
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || item.category.toLowerCase().includes(categoryFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [complaints, searchQuery, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage) || 1;
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'High':
        return <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded text-xs font-bold border border-rose-200">High</span>;
      case 'Medium':
        return <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded text-xs font-bold border border-amber-200">Medium</span>;
      case 'Low':
        return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded text-xs font-bold border border-emerald-200">Low</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 px-2.5 py-1 rounded text-xs font-bold border border-slate-200">{priority}</span>;
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'In Progress':
        return <span className="bg-amber-100/90 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 whitespace-nowrap">In Progress</span>;
      case 'Assigned':
        return <span className="bg-blue-100/90 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 whitespace-nowrap">Assigned</span>;
      case 'Verified':
        return <span className="bg-emerald-100/90 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 whitespace-nowrap">Verified</span>;
      case 'Resolved':
        return <span className="bg-green-100/90 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200 whitespace-nowrap">Resolved</span>;
      case 'Closed':
        return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 whitespace-nowrap">Closed</span>;
      default:
        return <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 whitespace-nowrap">{status}</span>;
    }
  };

  return (
    <div id="my-complaints-page" className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-150">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          My Complaints
        </h1>
      </div>

      {/* Filter and Search Bar matching reference image */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="complaints-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by ID, keyword..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#003B95] text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Filter Dropdowns and Button */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Status Dropdown */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Status</span>
              <select
                id="filter-status-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-[#003B95] font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="In Progress">In Progress</option>
                <option value="Assigned">Assigned</option>
                <option value="Verified">Verified</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Category Dropdown */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Category</span>
              <select
                id="filter-category-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-[#003B95] font-medium"
              >
                <option value="All">All Categories</option>
                <option value="Water Supply">Water Supply</option>
                <option value="Electricity">Electricity</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Roads">Roads</option>
                <option value="Public Transport">Public Transport</option>
              </select>
            </div>

            {/* Filter Action Button */}
            <div className="flex flex-col justify-end">
              <span className="text-[10px] invisible">Action</span>
              <button
                id="apply-filter-btn"
                onClick={() => setCurrentPage(1)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Complaints Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">COMPLAINT ID</th>
                <th className="py-4 px-6">ISSUE</th>
                <th className="py-4 px-6">CATEGORY</th>
                <th className="py-4 px-6">PRIORITY</th>
                <th className="py-4 px-6">DEPARTMENT</th>
                <th className="py-4 px-6">STATUS</th>
                <th className="py-4 px-6">DATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedComplaints.length > 0 ? (
                paginatedComplaints.map((item) => (
                  <tr
                    key={item.id}
                    id={`complaint-row-${item.id}`}
                    onClick={() => navigate('complaint-details', item.id)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 font-mono font-bold text-[#003B95] group-hover:underline">
                      {item.id}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {item.title}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {item.category}
                    </td>
                    <td className="py-4 px-6">
                      {getPriorityBadge(item.priority)}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {item.department}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                      {item.submittedOn.split(',')[0]}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No complaints matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredComplaints.length)} of{' '}
            {filteredComplaints.length} results
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="prev-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  id={`page-btn-${pageNum}`}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-100 text-[#003B95] border border-blue-300'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              id="next-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
