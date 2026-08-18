import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  Sparkles,
  Clock,
  Check,
  ArrowRight,
  Play,
  Zap,
  X,
  Loader2,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { OfficerUpdateStatusDrawer } from '../../components/officer/OfficerUpdateStatusDrawer';
import { ComplaintStatus } from '../../types';

const NEXT_STATUSES: Record<ComplaintStatus, ComplaintStatus[]> = {
  New: ['Assigned', 'Closed'],
  Assigned: ['In Progress', 'New', 'Closed'],
  'In Progress': ['Resolved', 'Assigned', 'Closed'],
  Resolved: ['Closed', 'In Progress'],
  Closed: ['In Progress', 'New'],
  Verified: [],
  Routed: [],
  Exception: [],
  'On Hold': [],
};

export const OfficerComplaintDetailsPage: React.FC = () => {
  const { goBack, selectedComplaintId, complaints, complaintsLoading, fetchComplaintDetails, updateComplaintStatus } = useApp();
  const [isUpdateDrawerOpen, setIsUpdateDrawerOpen] = useState(false);
  const [isAiCardDismissed, setIsAiCardDismissed] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (selectedComplaintId) fetchComplaintDetails(selectedComplaintId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComplaintId]);

  const complaint = complaints.find((c) => c.id === selectedComplaintId);

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 2500);
  };

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (!complaint) return;
    setActionBusy(true);
    setActionError(null);
    const result = await updateComplaintStatus(complaint.id, newStatus);
    setActionBusy(false);
    if (result.ok) {
      showToast(`Status updated to "${newStatus}" successfully!`);
    } else {
      setActionError(result.error);
    }
  };

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

  const nextStatuses = NEXT_STATUSES[complaint.status] || [];

  return (
    <div id="officer-complaint-details-screen" className="space-y-5 animate-in fade-in duration-200">
      {actionSuccessMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            id="officer-details-back-btn"
            onClick={goBack}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors flex items-center gap-1 font-bold text-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="h-4 w-px bg-slate-300 mx-1" />
          <h1 className="text-base font-bold text-slate-900">
            Complaint ID: <span className="text-[#003B95] font-mono">{complaint.id}</span>
          </h1>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold">{actionError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Complaint Summary</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Issue</span>
                <span className="font-bold text-slate-900 text-sm">{complaint.title}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Category</span>
                <span className="font-bold text-slate-800">{complaint.category}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Location</span>
                <span className="font-bold text-slate-800">{complaint.location}</span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Priority</span>
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[11px]">
                    {complaint.priority}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Status</span>
                  <span className="inline-block px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                    {complaint.status}
                  </span>
                </div>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-semibold block mb-0.5">SLA / Deadline</span>
                <div className={`flex items-center gap-1.5 font-bold ${complaint.slaStatus === 'BREACHED' ? 'text-rose-600' : complaint.slaStatus === 'AT_RISK' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{complaint.slaDeadline ? new Date(complaint.slaDeadline).toLocaleString() : 'Pending'}</span>
                  <span className="font-semibold">({complaint.slaStatus || 'ACTIVE'})</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Ticket</span>
                <span className="font-bold text-slate-800 font-mono">{complaint.ticketId || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Duplicate Check</span>
                <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                  complaint.duplicateStatus === 'DUPLICATE' ? 'text-rose-600' :
                  complaint.duplicateStatus === 'RELATED' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {complaint.duplicateStatus === 'DUPLICATE' ? <Copy className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  {complaint.duplicateStatus || 'NEW'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 sm:p-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Department</h3>
            <p className="text-sm font-bold text-slate-800">{complaint.department}</p>
            <p className="text-[11px] text-slate-500 mt-1">Routed automatically by the backend's department classifier.</p>
          </div>
        </div>

        {/* Right Column: AI Summary + Lifecycle + Actions */}
        <div className="lg:col-span-5 space-y-6">
          {!isAiCardDismissed && (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 sm:p-5 relative animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#003B95]">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>AI Generated Summary</span>
                </div>
                <button onClick={() => setIsAiCardDismissed(true)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed mb-3">{complaint.description}</p>
              {complaint.keywords && complaint.keywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {complaint.keywords.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-100/70 text-[#003B95] text-[10px] font-bold rounded-md border border-blue-200/50">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lifecycle — driven by real status history */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Lifecycle</h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {complaint.timeline.map((event, idx) => {
                const isLast = idx === complaint.timeline.length - 1;
                return (
                  <div key={event.id} className="relative flex items-start justify-between text-xs">
                    <div className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center shadow-2xs ${
                      isLast ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-emerald-500'
                    }`}>
                      {isLast ? <ArrowRight className="w-2.5 h-2.5 stroke-[3]" /> : <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <div>
                      <span className={`font-bold block ${isLast ? 'text-[#003B95]' : 'text-slate-800'}`}>{event.title}</span>
                      <span className="text-[11px] text-slate-400">{event.timestamp}</span>
                    </div>
                    {isLast && (
                      <span className="px-2 py-0.5 bg-blue-100 text-[#003B95] font-bold text-[10px] rounded-full">Current</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real status-change actions */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Actions</h3>

            {nextStatuses.includes('In Progress') && (
              <button
                id="officer-action-start-work"
                onClick={() => handleStatusChange('In Progress')}
                disabled={actionBusy}
                className="w-full py-2.5 bg-[#06184C] hover:bg-[#002D72] text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Work (→ In Progress)</span>
              </button>
            )}

            <button
              id="officer-action-update-status"
              onClick={() => setIsUpdateDrawerOpen(true)}
              disabled={nextStatuses.length === 0}
              className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-slate-600" />
              <span>Update Status</span>
            </button>

            {nextStatuses.includes('Resolved') && (
              <button
                id="officer-action-mark-resolved"
                onClick={() => handleStatusChange('Resolved')}
                disabled={actionBusy}
                className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark as Resolved</span>
              </button>
            )}

            <p className="text-[10px] text-slate-400 pt-1">
              Escalation is automatic based on SLA breach — there is no manual "Escalate" action on the backend.
              Current escalation level: <strong>{complaint.escalationLevel ?? 0}</strong>.
            </p>
          </div>
        </div>
      </div>

      <OfficerUpdateStatusDrawer
        isOpen={isUpdateDrawerOpen}
        onClose={() => setIsUpdateDrawerOpen(false)}
        complaintId={complaint.id}
        currentStatus={complaint.status}
        allowedNextStatuses={nextStatuses}
        onSave={(newStatus) => updateComplaintStatus(complaint.id, newStatus)}
      />
    </div>
  );
};
