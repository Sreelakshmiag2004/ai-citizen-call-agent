import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Edit3, Lock, LogOut, Check, X } from 'lucide-react';

export const UserProfilePage: React.FC = () => {
  const { user, setUser, logout } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState(user?.fullName || 'Ravi Kumar');
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || '9876543210');
  const [address, setAddress] = useState(user?.address || '21, Green Park Street, Bangalore - 560001');
  const [email, setEmail] = useState(user?.email || 'ravi.kumar@citizen.gov.in');

  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      setUser({
        ...user,
        fullName,
        mobileNumber,
        address,
        email,
      });
    }
    setIsEditing(false);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChanged(true);
    setTimeout(() => {
      setPasswordChanged(false);
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
    }, 1200);
  };

  return (
    <div id="user-profile-page" className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Profile Card Container matching reference image */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8">
        
        {/* Header with Title and Edit Profile Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Profile Information
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage your personal details and account settings.
            </p>
          </div>

          <button
            id="edit-profile-btn"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-2xs transition-all self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* User Details Grid */}
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Large Avatar */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#003B95] text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-md">
            {user?.avatarInitials || 'RK'}
          </div>

          {/* Details Columns */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  FULL NAME
                </span>
                <span className="text-sm font-bold text-slate-900 block">
                  {user?.fullName || 'Ravi Kumar'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  MOBILE NUMBER
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono block">
                  {user?.mobileNumber || '9876543210'}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  ADDRESS
                </span>
                <span className="text-sm font-bold text-slate-900 block leading-relaxed">
                  {user?.address || '21, Green Park Street, Bangalore - 560001'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  EMAIL ADDRESS
                </span>
                <span className="text-sm font-bold text-slate-900 block">
                  {user?.email || 'ravi.kumar@citizen.gov.in'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row matching screenshot */}
        <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-4">
          <button
            id="change-password-btn"
            onClick={() => setShowPasswordModal(true)}
            className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors"
          >
            Change Password
          </button>

          <button
            id="profile-logout-btn"
            onClick={logout}
            className="px-6 py-2.5 bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-xl border border-rose-300 shadow-2xs transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Edit Profile Information</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95] text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95] text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95] text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Residential Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95] text-slate-800"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Change Account Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordChanged ? (
              <div className="py-6 text-center text-emerald-600 font-bold text-sm flex flex-col items-center gap-2">
                <Check className="w-8 h-8 p-1.5 bg-emerald-100 rounded-full" />
                <span>Password updated successfully!</span>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95]"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
