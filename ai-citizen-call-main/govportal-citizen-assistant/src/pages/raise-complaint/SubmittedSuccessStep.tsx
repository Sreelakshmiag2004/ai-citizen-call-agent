import React from 'react';
import { useApp } from '../../context/AppContext';
import { Check, Ticket, Clock } from 'lucide-react';

export const SubmittedSuccessStep: React.FC = () => {
  const { complaintDraft, navigate, resetComplaintDraft } = useApp();
  const complaintId = complaintDraft.submittedComplaintId || '';

  const handleTrackComplaint = () => {
    navigate('complaint-details', complaintId);
  };

  const handleBackToDashboard = () => {
    resetComplaintDraft();
    navigate('dashboard');
  };

  return (
    <div id="complaint-success-screen" className="max-w-xl mx-auto py-8 sm:py-12 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-8 sm:p-12 text-center flex flex-col items-center">

        {/* Large Green Checkmark Circle matching screenshot */}
        <div className="w-24 h-24 rounded-full bg-[#EAFBF3] border-[6px] border-[#D1F7E4] flex items-center justify-center mb-8 shadow-xs">
          <Check className="w-12 h-12 text-[#10B981] stroke-[3.5]" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug mb-3">
          Your complaint has been submitted successfully!
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-8">
          The backend has registered your complaint, routed it to the correct department, and calculated an SLA deadline.
        </p>

        {/* Details Box matching screenshot */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 mb-6 flex items-center justify-between shadow-2xs">
          <div className="text-left space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              COMPLAINT ID
            </span>
            <span className="text-lg sm:text-xl font-mono font-extrabold text-slate-900 tracking-tight">
              {complaintId || 'N/A'}
            </span>
          </div>

          <div className="text-right space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              STATUS
            </span>
            <span className="inline-block bg-[#EAFBF3] text-[#10B981] border border-[#A7F3D0] px-3.5 py-1 rounded-md text-xs font-bold">
              Pending
            </span>
          </div>
        </div>

        {/* Real ticket + SLA info returned from POST /complaints */}
        {(complaintDraft.submittedTicketId || complaintDraft.submittedSlaDeadline) && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {complaintDraft.submittedTicketId && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-left">
                <Ticket className="w-4 h-4 text-[#003B95] shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ticket</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{complaintDraft.submittedTicketId}</span>
                </div>
              </div>
            )}
            {complaintDraft.submittedSlaHours !== undefined && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-left">
                <Clock className="w-4 h-4 text-[#003B95] shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">SLA Window</span>
                  <span className="text-xs font-bold text-slate-800">{complaintDraft.submittedSlaHours} hours</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-4">
          <button
            id="success-track-complaint-btn"
            onClick={handleTrackComplaint}
            className="w-full sm:flex-1 py-3.5 px-6 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition-all"
          >
            Track Complaint
          </button>

          <button
            id="success-back-dashboard-btn"
            onClick={handleBackToDashboard}
            className="w-full sm:flex-1 py-3.5 px-6 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-300 transition-all shadow-2xs"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
