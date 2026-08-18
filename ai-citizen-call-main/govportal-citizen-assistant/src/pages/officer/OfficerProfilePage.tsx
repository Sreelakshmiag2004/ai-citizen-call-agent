import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle2, 
  KeyRound, 
  LogOut, 
  Building2, 
  Plus, 
  Calendar, 
  Briefcase, 
  MapPin, 
  UserCheck, 
  ShieldCheck, 
  Smartphone, 
  Mail, 
  Lock
} from 'lucide-react';
import { OFFICER_USER } from '../../data/officerData';

export const OfficerProfilePage: React.FC = () => {
  const { user, logout } = useApp();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const currentUser = user || OFFICER_USER;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2500);
  };

  return (
    <div id="officer-profile-screen" className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Profile Header Title */}
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">
        Profile
      </h1>

      {/* Main Profile Header Card matching Screenshot 7 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#003B95] text-white flex items-center justify-center font-extrabold text-xl shadow-sm shrink-0">
            {currentUser.avatarInitials || 'PS'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {currentUser.fullName}
              </h2>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
            </div>
            <p className="text-xs font-semibold text-slate-500 mb-3">
              {currentUser.role || 'Assistant Engineer'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1.5 gap-x-6 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-400 block text-[10px]">Employee ID</span>
                <span className="font-bold text-slate-800 font-mono">PWD-ENG-0452</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 block text-[10px]">Email</span>
                <span className="font-semibold text-slate-800">{currentUser.email}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 block text-[10px]">Mobile</span>
                <span className="font-semibold text-slate-800">{currentUser.mobileNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <button
            id="officer-change-password-btn"
            onClick={() => showToast('Password change verification code dispatched to email.')}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span>Change Password</span>
          </button>

          <button
            id="officer-profile-logout-btn"
            onClick={logout}
            className="px-3.5 py-2 bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Grid: Department Mapping + Employee Details matching Screenshot 7 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department Mapping Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Department Mapping
          </h3>

          <div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1.5">
              PRIMARY DEPARTMENT
            </span>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-[#003B95] flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Public Works Department
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Division 4 (Coimbatore Urban)
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] rounded-full">
                Active
              </span>
            </div>
          </div>

          <button
            id="officer-request-dept-access-btn"
            onClick={() => showToast('Department access request forwarded to Administrator.')}
            className="w-full py-2.5 border border-dashed border-[#003B95]/40 hover:border-[#003B95] hover:bg-blue-50/50 text-[#003B95] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Additional Department Access</span>
          </button>
        </div>

        {/* Employee Details Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Employee Details
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Joining Date</span>
              <span className="font-bold text-slate-800">12 Jan 2023</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Designation</span>
              <span className="font-bold text-slate-800">Assistant Engineer</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Work Location</span>
              <span className="font-bold text-slate-800">Coimbatore</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Reporting To</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                  EE
                </span>
                <span>Executive Engineer</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Security Activity Card matching Screenshot 7 */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Recent Security Activity
        </h3>

        <div className="space-y-3">
          {/* Activity 1 */}
          <div className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">
                  Successful login from IP 192.168.1.45
                </h4>
                <p className="text-[11px] text-slate-500">
                  Chrome on Windows · Authorized Device
                </p>
              </div>
            </div>
            <span className="text-slate-400 font-semibold text-[11px] shrink-0">
              Today, 08:30 AM
            </span>
          </div>

          {/* Activity 2 */}
          <div className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">
                  Password changed successfully
                </h4>
                <p className="text-[11px] text-slate-500">
                  Via Security Settings Portal
                </p>
              </div>
            </div>
            <span className="text-slate-400 font-semibold text-[11px] shrink-0">
              15 Apr 2023, 14:20 PM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
