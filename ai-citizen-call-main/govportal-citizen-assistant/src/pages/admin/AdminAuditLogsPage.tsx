import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Filter 
} from 'lucide-react';
import { ADMIN_AUDIT_LOGS_LIST } from '../../data/adminData';
import { AdminAuditLogItem } from '../../types';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>(ADMIN_AUDIT_LOGS_LIST);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('All Actions');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = logs.filter(l => {
    const matchesSearch = 
      l.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.ipAddress.includes(searchQuery);
    const matchesRole = selectedRole === 'All Roles' || l.role === selectedRole;
    const matchesAction = selectedAction === 'All Actions' || l.action.toLowerCase().includes(selectedAction.toLowerCase());
    return matchesSearch && matchesRole && matchesAction;
  });

  const handleExport = () => {
    alert('Security Audit Logs exported successfully in CEF / CSV format.');
  };

  return (
    <div id="admin-audit-logs-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Audit Logs</h2>
          <p className="text-xs text-slate-500">Track all administrative activities and user changes across the system.</p>
        </div>

        <button 
          id="admin-export-logs-btn"
          onClick={handleExport}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Logs</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="admin-audit-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user, IP address, or activity..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select 
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#1D4ED8]"
          >
            <option>All Actions</option>
            <option>User Role Updated</option>
            <option>Complaint Created</option>
            <option>Profile Updated</option>
            <option>SLA Check</option>
            <option>Complaint Status Changed</option>
            <option>Login Attempt</option>
          </select>

          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#1D4ED8]"
          >
            <option>All Roles</option>
            <option>Administrator</option>
            <option>Call Center Exec.</option>
            <option>Citizen</option>
            <option>Officer</option>
            <option>System</option>
          </select>

          <button 
            onClick={() => { setSearchQuery(''); setSelectedAction('All Actions'); setSelectedRole('All Roles'); }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">TIMESTAMP</th>
                <th className="py-3.5 px-5">USER</th>
                <th className="py-3.5 px-5">ROLE</th>
                <th className="py-3.5 px-5">ACTION</th>
                <th className="py-3.5 px-5">DETAILS</th>
                <th className="py-3.5 px-5">IP ADDRESS</th>
                <th className="py-3.5 px-5">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-slate-500 text-[11px]">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-900">
                    {log.user}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="font-semibold text-slate-700">
                      {log.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-medium text-slate-800">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-slate-500 text-[11px]">
                    {log.ipAddress}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      log.status === 'Success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>Showing 1 to {filtered.length} of 8,450 logs</span>
          <div className="flex items-center gap-1.5">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="w-7 h-7 rounded-md bg-[#1D4ED8] text-white font-bold text-xs flex items-center justify-center shadow-xs">
              1
            </button>
            <button className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center">
              2
            </button>
            <button className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center">
              3
            </button>
            <span className="px-1 text-slate-400">...</span>
            <button className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center">
              423
            </button>
            <button 
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
