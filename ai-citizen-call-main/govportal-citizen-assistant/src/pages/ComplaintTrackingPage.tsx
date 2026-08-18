import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Download,
  Check,
  Clock,
  MapPin,
  UserCheck,
  Building,
  Droplet,
  AlertCircle,
  Star,
  Send,
  MessageSquare,
  FileCheck,
  Phone,
  Loader2,
} from 'lucide-react';
import { ComplaintStatus } from '../types';

export const ComplaintTrackingPage: React.FC = () => {
  const { selectedComplaintId, complaints, complaintsLoading, goBack, addComplaintFeedback, fetchComplaintDetails } = useApp();
  const [activeTab, setActiveTab] = useState<'timeline' | 'details' | 'resolution' | 'feedback'>('timeline');

  // Interactive feedback state
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Pull the full record + real status history for this one complaint —
  // GET /complaints only returns summary fields for the list view.
  useEffect(() => {
    if (selectedComplaintId) {
      fetchComplaintDetails(selectedComplaintId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComplaintId]);

  const complaint = complaints.find(c => c.id === selectedComplaintId) || complaints[0];

  if (!complaint) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center">
        {complaintsLoading ? (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading complaint…
          </div>
        ) : (
          <>
            <p className="text-slate-500 text-sm mb-4">Complaint not found.</p>
            <button onClick={goBack} className="text-xs font-bold text-[#003B95] hover:underline">
              ← Go back
            </button>
          </>
        )}
      </div>
    );
  }

  // Real backend workflow only has 5 states (PENDING -> ASSIGNED -> IN_PROGRESS
  // -> RESOLVED -> CLOSED). There is no "Verified" stage on the backend, so it
  // is not shown here as a step the complaint can be "at".
  const steps: ComplaintStatus[] = ['New', 'Assigned', 'In Progress', 'Resolved', 'Closed'];

  const getStepIndex = (status: ComplaintStatus) => {
    return steps.indexOf(status);
  };

  const currentStepIndex = getStepIndex(complaint.status);

  const getStatusTimestamp = (status: ComplaintStatus) => {
    const event = complaint.timeline?.find(t => t.status === status);
    if (event) return event.timestamp;
    if (status === 'New') return complaint.submittedOn;
    return '-';
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addComplaintFeedback(complaint.id, rating, feedbackComment);
    setFeedbackSubmitted(true);
  };

  const handleDownloadReport = () => {
    const reportText = `GOVPORTAL OFFICIAL CITIZEN COMPLAINT SUMMARY
=========================================
Complaint ID: ${complaint.id}
Status: ${complaint.status}
Issue: ${complaint.title}
Category: ${complaint.category}
Department: ${complaint.department}
Priority: ${complaint.priority}
Submitted On: ${complaint.submittedOn}
Location: ${complaint.location}

TIMELINE HISTORY:
${complaint.timeline.map(t => `[${t.timestamp}] - ${t.title} (${t.author})`).join('\n')}

Assigned Officer: ${complaint.assignedOfficer?.name || 'N/A'} (${complaint.assignedOfficer?.designation || 'N/A'})
=========================================
Generated via GovPortal Citizen Redressal System.`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${complaint.id}_Grievance_Report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="complaint-tracking-page" className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <button
          id="tracking-back-btn"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#003B95] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          id="download-report-btn"
          onClick={handleDownloadReport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-[#003B95] border border-slate-200 text-xs font-bold rounded-lg shadow-2xs transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-8">
        
        {/* Header with Complaint ID & Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Complaint ID: <span className="font-mono">{complaint.id}</span>
          </h1>

          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
            {complaint.status}
          </span>
        </div>

        {/* 4-Item Grid Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2 pb-2">
          {/* Issue */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Issue</span>
            <span className="text-sm font-bold text-slate-900 block leading-snug">
              {complaint.title}
            </span>
          </div>

          {/* Department */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Department</span>
            <span className="text-sm font-bold text-slate-900 block leading-snug">
              {complaint.department}
            </span>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Priority</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{complaint.priority}</span>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Category</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px]">
                💧
              </span>
              <span>{complaint.category}</span>
            </div>
          </div>
        </div>

        {/* Submitted On Date */}
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Submitted On: </span>
          <span>{complaint.submittedOn}</span>
        </div>

        {/* Stepper Progress Visualizer matching screenshot */}
        <div className="py-6 border-y border-slate-100 overflow-x-auto">
          <div className="min-w-[600px] px-4">
            <div className="relative flex items-center justify-between">
              {/* Connecting Horizontal Line */}
              <div className="absolute top-4 left-0 right-0 h-1 bg-slate-200 z-0">
                <div 
                  className="h-full bg-[#003B95] transition-all duration-500"
                  style={{ width: `${Math.min(100, (Math.max(0, currentStepIndex) / (steps.length - 1)) * 100)}%` }}
                />
              </div>

              {steps.map((step, idx) => {
                const isPassed = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const timestamp = getStatusTimestamp(step);

                return (
                  <div key={step} className="flex flex-col items-center relative z-10 space-y-2">
                    {/* Circle Indicator */}
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isPassed
                          ? 'bg-[#003B95] text-white shadow-xs'
                          : isCurrent
                          ? 'bg-white border-4 border-[#003B95] shadow-xs'
                          : 'bg-white border-2 border-slate-300'
                      }`}
                    >
                      {isPassed ? (
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      ) : isCurrent ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#003B95]" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-200" />
                      )}
                    </div>

                    {/* Step Title & Timestamp */}
                    <div className="text-center">
                      <span className={`text-xs block font-bold leading-tight ${
                        isCurrent ? 'text-[#003B95]' : isPassed ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        {step}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 whitespace-nowrap">
                        {timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex items-center gap-8">
          {(['timeline', 'details', 'resolution', 'feedback'] as const).map((tab) => (
            <button
              key={tab}
              id={`tracking-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs sm:text-sm font-bold capitalize transition-all relative ${
                activeTab === tab
                  ? 'text-[#003B95] border-b-2 border-[#003B95]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-6 py-2">
            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {complaint.timeline.map((event, idx) => (
                <div key={event.id} className="relative flex items-start gap-4">
                  {/* Circle Pin */}
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-[#003B95] flex items-center justify-center z-10 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#003B95]" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400">
                        {event.timestamp}
                      </span>
                      <span className="text-[11px] text-slate-400">•</span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {event.author}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {event.title}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Details */}
        {activeTab === 'details' && (
          <div className="space-y-6 py-2">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Full Issue Description
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {complaint.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/60">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Incident Location
                  </h4>
                  <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {complaint.location}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Assigned Officer
                  </h4>
                  <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    {complaint.assignedOfficer?.name || 'Desk Officer Assigned'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {complaint.assignedOfficer?.designation || 'Central Intake Desk'}
                  </p>
                </div>
              </div>

              {complaint.slaStatus && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-200/60">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ticket</h4>
                    <p className="text-xs font-mono font-semibold text-slate-800">{complaint.ticketId || '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">SLA Status</h4>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        complaint.slaStatus === 'BREACHED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : complaint.slaStatus === 'AT_RISK'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : complaint.slaStatus === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {complaint.slaStatus}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">SLA Deadline</h4>
                    <p className="text-xs font-semibold text-slate-800">
                      {complaint.slaDeadline ? new Date(complaint.slaDeadline).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Escalation</h4>
                    <p className="text-xs font-semibold text-slate-800">
                      {complaint.escalationLevel ? `Level ${complaint.escalationLevel}` : 'None'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Resolution */}
        {activeTab === 'resolution' && (
          <div className="space-y-6 py-2">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileCheck className="w-4 h-4 text-[#003B95]" />
                <span>Department Inspection & Repair Status</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {complaint.resolutionNotes || 'Technicians are on-site repairing the reported pipeline fissure. Pressure valves have been tested.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Feedback */}
        {activeTab === 'feedback' && (
          <div className="space-y-6 py-2">
            {complaint.feedback || feedbackSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-2">
                <div className="flex justify-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <h4 className="text-sm font-bold text-emerald-900">Thank you for your feedback!</h4>
                <p className="text-xs text-emerald-700">
                  "{feedbackComment || complaint.feedback?.comment || 'Swiftly addressed. Excellent resolution.'}"
                </p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Rate Your Grievance Redressal Experience
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Share Citizen Feedback / Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Tell us about the response time, officer conduct, or resolution quality..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#003B95] text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Feedback</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
