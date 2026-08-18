import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check 
} from 'lucide-react';
import { ADMIN_USERS_LIST } from '../../data/adminData';
import { AdminUserItem } from '../../types';

export const AdminUserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserItem[]>(ADMIN_USERS_LIST);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserContact, setNewUserContact] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Citizen' | 'Call Center Exec.' | 'Officer' | 'Supervisor' | 'Administrator'>('Officer');
  const [newUserDept, setNewUserDept] = useState('Water Supply');

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.contact.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'All Roles' || u.role === selectedRole;
    const matchesDept = selectedDept === 'All Departments' || u.department === selectedDept;
    const matchesStatus = selectedStatus === 'All Status' || u.status === selectedStatus;
    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserContact.trim()) return;

    const newUser: AdminUserItem = {
      id: `u-${Date.now()}`,
      name: newUserName.trim(),
      contact: newUserContact.trim(),
      role: newUserRole,
      department: newUserRole === 'Citizen' ? '-' : newUserDept,
      status: 'Active',
      registeredOn: 'Today',
      lastActive: 'Today',
    };

    setUsers([newUser, ...users]);
    setIsAddUserModalOpen(false);
    setNewUserName('');
    setNewUserContact('');
  };

  return (
    <div id="admin-user-management-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Management</h2>
          <p className="text-xs text-slate-500">Manage users, roles, and access across the platform.</p>
        </div>

        {/* Add User Action Button */}
        <button 
          id="admin-add-user-btn"
          onClick={() => setIsAddUserModalOpen(true)}
          className="px-4 py-2 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add User</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="admin-user-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email or mobile..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Role Filter */}
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#1D4ED8]"
          >
            <option>All Roles</option>
            <option>Citizen</option>
            <option>Call Center Exec.</option>
            <option>Officer</option>
            <option>Supervisor</option>
          </select>

          {/* Department Filter */}
          <select 
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#1D4ED8]"
          >
            <option>All Departments</option>
            <option>Water Supply</option>
            <option>Public Works</option>
            <option>Sanitation</option>
            <option>Electricity</option>
            <option>Transport</option>
            <option>Call Center</option>
          </select>

          {/* Status Filter */}
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#1D4ED8]"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>

          <button 
            onClick={() => { setSearchQuery(''); setSelectedRole('All Roles'); setSelectedDept('All Departments'); setSelectedStatus('All Status'); }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">NAME</th>
                <th className="py-3.5 px-5">CONTACT</th>
                <th className="py-3.5 px-5">ROLE</th>
                <th className="py-3.5 px-5">DEPARTMENT</th>
                <th className="py-3.5 px-5">STATUS</th>
                <th className="py-3.5 px-5">REGISTERED ON</th>
                <th className="py-3.5 px-5">LAST ACTIVE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-slate-900">
                    {user.name}
                  </td>
                  <td className="py-3.5 px-5 text-slate-600">
                    {user.contact}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="font-semibold text-[#1D4ED8]">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-600">
                    {user.department}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      user.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500">
                    {user.registeredOn}
                  </td>
                  <td className="py-3.5 px-5 text-slate-500">
                    {user.lastActive}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>Showing 1 to {filteredUsers.length} of 124 users</span>
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
              16
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

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Add New User</h3>
              <button 
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email or Mobile Number</label>
                <input
                  type="text"
                  required
                  value={newUserContact}
                  onChange={(e) => setNewUserContact(e.target.value)}
                  placeholder="e.g. ramesh@gov.in or 9811223344"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e: any) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  >
                    <option value="Officer">Officer</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Call Center Exec.">Call Center Exec.</option>
                    <option value="Citizen">Citizen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    disabled={newUserRole === 'Citizen'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8] disabled:bg-slate-100"
                  >
                    <option>Water Supply</option>
                    <option>Public Works</option>
                    <option>Sanitation</option>
                    <option>Electricity</option>
                    <option>Transport</option>
                    <option>Call Center</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
