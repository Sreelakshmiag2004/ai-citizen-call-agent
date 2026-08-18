import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  CheckCircle2, 
  Repeat, 
  LogOut,
  Building,
  Calendar,
  Sparkles
} from 'lucide-react';
import { CALL_CENTER_USER } from '../../data/callCenterData';

export const CallCenterProfilePage: React.FC = () => {
  const { user, logout, switchPortal, navigate } = useApp();
  const [status, setStatus] = useState<'Available' | 'On Call' | 'Break' | 'Away'>('Available');
  const [isSaved, setIsSaved] = useState(false);

  const currentUser = user || CALL_CENTER_USER;

  const handleStatusChange = (newStatus: any) => {
    setStatus(newStatus);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div id="call-center-profile-page" className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Profile</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Manage your account information
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100">
          <div className="w-20 h-20 rounded-full bg-slate-900 text-white text-2xl font-bold flex items-center justify-center border-4 border-slate-100 shadow-md shrink-0">
            {currentUser.avatarInitials || 'PS'}
          </div>

          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{currentUser.fullName}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{currentUser.role || 'Call Center Executive'}</p>
              </div>

              {/* Status Indicator / Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Status:</span>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{status}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-4 justify-center sm:justify-start">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Command & Dispatch Hub, Bangalore</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Active since {currentUser.joinedDate || 'March 2023'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Account Details Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
            <span className="text-[11px] font-medium text-slate-400 block">Full Name</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{currentUser.fullName}</span>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
            <span className="text-[11px] font-medium text-slate-400 block">Email Address</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{currentUser.email}</span>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
            <span className="text-[11px] font-medium text-slate-400 block">Mobile Number</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{currentUser.mobileNumber}</span>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
            <span className="text-[11px] font-medium text-slate-400 block">Assigned Role</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{currentUser.role || 'Call Center Executive'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <button
            id="profile-switch-citizen-portal-btn"
            onClick={() => switchPortal('citizen')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Repeat className="w-4 h-4" />
            <span>Switch to Citizen Portal</span>
          </button>

          <button
            id="profile-logout-btn"
            onClick={logout}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
