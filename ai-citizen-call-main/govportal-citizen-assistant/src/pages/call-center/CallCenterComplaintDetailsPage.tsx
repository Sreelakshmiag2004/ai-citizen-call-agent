import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Building2,
  Clock,
  User,
  Phone,
  ShieldCheck,
  AlertCircle,
  Copy,
  Loader2,
} from 'lucide-react';

export const CallCenterComplaintDetailsPage: React.FC = () => {
  const { navigate, selectedComplaintId, callCenterComplaints, complaintsLoading, fetchComplaintDetails } = useApp();

  useEffect(() => {
    if (selectedComplaintId) fetchComplaintDetails(selectedComplaintId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComplaintId]);

  const complaint = callCenterComplaints.find(c => c.id === selectedComplaintId);

  if (!complaint) {
    return (
      <div className="py-16 text-center">
        {complaintsLoading ? (
          <span className="inline-flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading complaint…
          </span>
        ) : (
          <p className="text-slate-500 text-sm">Complaint not found.</p>
        )}
      </div>
    );
  }

  return (
    <div id="call-center-complaint-details-page" className="space-y-6">
      {/* Back Button */}
      <div>
        <button
          id="complaint-details-back-btn"
          onClick={() => navigate('complaints')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Complaints</span>
        </button>

        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Complaint Details</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          AI-generated complaint intelligence
        </p>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Complaint & AI Intel (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900 font-mono">
                    {complaint.id}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {complaint.status}
                  </span>
                </div>
                {(complaint.callerName || complaint.callerPhone) && (
                  <p className="text-xs text-slate-500 mt-1">
                    Caller: <strong className="text-slate-700 font-medium">{complaint.callerName || 'Unknown'}{complaint.callerPhone ? ` (${complaint.callerPhone})` : ''}</strong>
                  </p>
                )}
              </div>

              <div className="text-right sm:text-right">
                <span className="text-[11px] text-slate-400 font-medium block">Created on</span>
                <span className="text-xs font-semibold text-slate-700">{complaint.submittedOn}</span>
              </div>
            </div>

            {/* Sub-meta Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-4 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 mr-1">Issue:</span>
                <strong className="text-slate-800">{complaint.title}</strong>
              </div>
              <span className="text-slate-300">•</span>
              <div>
                <span className="text-slate-400 mr-1">Priority:</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  {complaint.priority}
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <div>
                <span className="text-slate-400 mr-1">Department:</span>
                <strong className="text-slate-800">{complaint.department}</strong>
              </div>
            </div>
          </div>

          {/* AI Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">AI Summary</h4>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-700 leading-relaxed font-normal">
              "{complaint.description}"
            </div>
          </div>

          {/* Key Information 2x2 Grid */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Key Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                <p className="text-[11px] font-medium text-slate-400">Detected Issue</p>
                <p className="text-xs font-bold text-slate-900 mt-1">{complaint.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Category: {complaint.category}</p>
              </div>

              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                <p className="text-[11px] font-medium text-slate-400">Report Count</p>
                <p className="text-xs font-bold text-slate-900 mt-1">{complaint.reportCount ?? 1} citizen report(s)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Includes linked duplicates</p>
              </div>

              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                <p className="text-[11px] font-medium text-slate-400">Duplicate Check</p>
                <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${
                  complaint.duplicateStatus === 'DUPLICATE' ? 'text-rose-700' :
                  complaint.duplicateStatus === 'RELATED' ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  {complaint.duplicateStatus === 'DUPLICATE' ? (
                    <Copy className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {complaint.duplicateStatus === 'DUPLICATE'
                      ? `Duplicate of ${complaint.duplicateOf}`
                      : complaint.duplicateStatus === 'RELATED'
                      ? 'Related complaint found nearby'
                      : 'No similar complaints found'}
                  </span>
                </div>
                {typeof complaint.similarityScore === 'number' && complaint.similarityScore > 0 && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{Math.round(complaint.similarityScore * 100)}% similarity</p>
                )}
              </div>

              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                <p className="text-[11px] font-medium text-slate-400">Routed Department</p>
                <p className="text-xs font-bold text-slate-900 mt-1">{complaint.department}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Ticket: {complaint.ticketId || 'Pending'}</p>
              </div>

              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                <p className="text-[11px] font-medium text-slate-400">SLA Status</p>
                <p className={`text-xs font-bold mt-1 ${
                  complaint.slaStatus === 'BREACHED' ? 'text-rose-600' :
                  complaint.slaStatus === 'AT_RISK' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {complaint.slaStatus || 'ACTIVE'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {complaint.slaDeadline ? `Due ${new Date(complaint.slaDeadline).toLocaleString()}` : 'Deadline pending'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Processing Timeline (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs h-fit">
          <h3 className="text-base font-bold text-slate-900 pb-4 border-b border-slate-100 mb-5">
            Processing Timeline
          </h3>

          <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-500">
            {complaint.timeline.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-3.5 relative z-10">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">{item.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{item.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
