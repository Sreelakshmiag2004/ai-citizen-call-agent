import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  KeyRound, 
  Building2, 
  CheckCircle2, 
  Lock, 
  Save 
} from 'lucide-react';

export const AdminProfilePage: React.FC = () => {
  const { user } = useApp();
  const [fullName, setFullName] = useState(user?.fullName || 'Raj Kumar');
  const [email, setEmail] = useState(user?.email || 'raj.kumar@gov.in');
  const [phone, setPhone] = useState(user?.phoneNumber || '+91 98111 22334');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div id="admin-profile-page" className="space-y-6 max-w-5xl">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Administrator Profile</h2>
        <p className="text-xs text-slate-500">Manage your administrative credentials and security preferences.</p>
      </div>

      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-[#0C1527] text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-slate-200">
          RK
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{fullName}</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200 self-center sm:self-auto">
              Administrator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Central IT & E-Governance Command • GovPortal</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Full Governance Access
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              2FA Active
            </span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Account Information */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900">Personal & Contact Details</h4>
            <p className="text-[11px] text-slate-500">Official government communication channels</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#1D4ED8] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Designation / Role
              </label>
              <input
                type="text"
                disabled
                value="System Administrator (Level 5)"
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Official Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#1D4ED8] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Official Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#1D4ED8] focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Security & Permissions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900">Administrative Security & Privileges</h4>
            <p className="text-[11px] text-slate-500">Security configurations and session controls</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Scope</span>
              <p className="text-sm font-bold text-slate-900 mt-1">Superadmin (Root)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Full write access across all 24 departments</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Two-Factor Auth</span>
              <p className="text-sm font-bold text-emerald-600 mt-1">Enabled (Hardware Token)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Enforced on all admin logins</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Audit Trail</span>
              <p className="text-sm font-bold text-blue-600 mt-1">Immutable Logging</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Every admin operation is recorded</p>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Administrator profile updated successfully!
            </span>
          ) : <div />}

          <button
            id="admin-save-profile-btn"
            type="submit"
            className="px-5 py-2.5 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
};
