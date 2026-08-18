import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  MoreVertical, 
  Users, 
  Shield, 
  UserX, 
  ChevronLeft, 
  ChevronRight,
  X
} from 'lucide-react';
import { ADMIN_DEPARTMENTS_LIST } from '../../data/adminData';
import { AdminDepartmentItem } from '../../types';

export const AdminDepartmentManagementPage: React.FC = () => {
  const [departments, setDepartments] = useState<AdminDepartmentItem[]>(ADMIN_DEPARTMENTS_LIST);
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // New dept form
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [officers, setOfficers] = useState(10);
  const [supervisors, setSupervisors] = useState(2);

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) return;

    const newDept: AdminDepartmentItem = {
      id: `dept-${Date.now()}`,
      departmentName: deptName.trim(),
      deptCode: deptCode.trim().toUpperCase(),
      officers: Number(officers),
      supervisors: Number(supervisors),
      activeComplaints: 0,
      slaPerformance: '95.0%',
      status: 'Active',
    };

    setDepartments([...departments, newDept]);
    setIsAddDeptModalOpen(false);
    setDeptName('');
    setDeptCode('');
  };

  return (
    <div id="admin-dept-management-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Department Management</h2>
          <p className="text-xs text-slate-500">Manage departments and map officers & supervisors.</p>
        </div>

        {/* Add Department Action Button */}
        <button 
          id="admin-add-dept-btn"
          onClick={() => setIsAddDeptModalOpen(true)}
          className="px-4 py-2 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Department</span>
        </button>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">DEPARTMENT NAME</th>
                <th className="py-3.5 px-5">DEPT. CODE</th>
                <th className="py-3.5 px-5">OFFICERS</th>
                <th className="py-3.5 px-5">SUPERVISORS</th>
                <th className="py-3.5 px-5">ACTIVE COMPLAINTS</th>
                <th className="py-3.5 px-5">SLA PERFORMANCE</th>
                <th className="py-3.5 px-5">STATUS</th>
                <th className="py-3.5 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-slate-900">
                    {dept.departmentName}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-slate-600 font-medium">
                    {dept.deptCode}
                  </td>
                  <td className="py-3.5 px-5 text-slate-900 font-semibold">
                    {dept.officers}
                  </td>
                  <td className="py-3.5 px-5 text-slate-900 font-semibold">
                    {dept.supervisors}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-900">
                    {dept.activeComplaints.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-emerald-600">
                    {dept.slaPerformance}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {dept.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>Showing 1 to {departments.length} of 24 departments</span>
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
            <button className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center">
              4
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

      {/* Bottom Section: Department Mapping Overview (3 cards) */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Department Mapping Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Officers */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Total Officers</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">65</div>
              <button className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-1">
                View all
              </button>
            </div>
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total Supervisors */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Total Supervisors</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">17</div>
              <button className="text-[11px] text-[#1D4ED8] hover:underline font-semibold mt-1">
                View all
              </button>
            </div>
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Unassigned Officers */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Unassigned Officers</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">3</div>
              <button className="text-[11px] text-rose-600 hover:underline font-semibold mt-1">
                View list
              </button>
            </div>
            <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Department Modal */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Add New Department</h3>
              <button 
                onClick={() => setIsAddDeptModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Urban Development Department"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="e.g. UDD"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8] uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Allocated Officers</label>
                  <input
                    type="number"
                    min="1"
                    value={officers}
                    onChange={(e) => setOfficers(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supervisors</label>
                  <input
                    type="number"
                    min="1"
                    value={supervisors}
                    onChange={(e) => setSupervisors(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
