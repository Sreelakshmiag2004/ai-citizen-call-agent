import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  Check,
  Sparkles,
  MapPin,
  UploadCloud,
  FileText,
  Copy,
  AlertTriangle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { PriorityLevel } from '../../types';

const CANONICAL_DEPARTMENTS = [
  'Water', 'Electricity', 'Roads', 'Sanitation', 'Healthcare',
  'Police', 'Transport', 'Municipal', 'Disaster Management', 'Other',
];

export const ReviewComplaintStep: React.FC = () => {
  const { complaintDraft, setComplaintDraft, confirmSubmitComplaint, goBack } = useApp();

  const [title, setTitle] = useState(complaintDraft.issueTitle || '');
  const [category, setCategory] = useState(complaintDraft.category || 'Other');
  const [department, setDepartment] = useState(complaintDraft.department || 'Other');
  const [priority, setPriority] = useState<PriorityLevel>(complaintDraft.priority || 'Medium');
  const [location, setLocation] = useState(complaintDraft.location || '');
  const [description, setDescription] = useState(complaintDraft.description || '');
  const [attachments, setAttachments] = useState<string[]>(complaintDraft.attachments || []);

  const isSubmitting = complaintDraft.processingStage === 'submitting';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachments(prev => [...prev, file.name]);
    }
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirmSubmitComplaint({
      issueTitle: title,
      category,
      department,
      priority,
      location,
      description,
      attachments,
    });
  };

  const dupStatus = complaintDraft.duplicateStatus;

  return (
    <div id="review-complaint-step" className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Review Complaint
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Verify the AI-extracted details below. You can edit any field before submitting.
        </p>
      </div>

      <form onSubmit={handleConfirmSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">

        {/* Back Button */}
        <button
          type="button"
          onClick={() => setComplaintDraft(prev => ({ ...prev, step: prev.mode === 'text' ? 'text-description' : 'voice-recording' }))}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#003B95] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{complaintDraft.mode === 'text' ? 'Back to Text Description' : 'Back to Voice Recording'}</span>
        </button>

        {/* AI Banner Notice */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#003B95] text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#003B95]">
              {complaintDraft.mode === 'text' ? 'Auto-Extracted from Text Input' : 'Auto-Extracted from Voice Input'}
            </h4>
            <p className="text-[11px] text-slate-600">
              The fields below were analyzed by the backend LLM
              {complaintDraft.language ? ` (detected language: ${complaintDraft.language})` : ''}.
            </p>
          </div>
        </div>

        {/* Duplicate Detection Banner — real ChromaDB result */}
        {dupStatus === 'DUPLICATE' && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
            <Copy className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800">
              <span className="font-bold block mb-0.5">Possible Duplicate Detected</span>
              <span>
                This looks very similar to complaint{' '}
                <span className="font-mono font-bold">{complaintDraft.duplicateOf}</span>
                {typeof complaintDraft.similarity === 'number' && (
                  <> ({Math.round(complaintDraft.similarity * 100)}% similarity match)</>
                )}
                . It will be linked to that complaint instead of tracked separately.
              </span>
            </div>
          </div>
        )}
        {dupStatus === 'RELATED' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <span className="font-bold block mb-0.5">Related Complaint Found</span>
              <span>
                A related complaint{complaintDraft.matchedComplaint ? ` (${complaintDraft.matchedComplaint.complaint_id})` : ''} was
                found nearby
                {typeof complaintDraft.similarity === 'number' && (
                  <> ({Math.round(complaintDraft.similarity * 100)}% similarity)</>
                )}
                . Your complaint will still be tracked separately.
              </span>
            </div>
          </div>
        )}
        {dupStatus === 'NEW' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 font-medium">
              No similar complaints found — this will be registered as a new issue.
            </p>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Issue Title */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Issue Summary
            </label>
            <input
              id="review-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#003B95] focus:bg-white text-slate-800 font-semibold"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Assigned Department
            </label>
            <select
              id="review-department-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#003B95] focus:bg-white text-slate-800"
            >
              {CANONICAL_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Category
            </label>
            <input
              id="review-category-select"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#003B95] focus:bg-white text-slate-800"
            />
          </div>

          {/* Priority Level */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Priority Level
            </label>
            <div className="flex items-center gap-2">
              {(['Critical', 'High', 'Medium', 'Low'] as PriorityLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setPriority(lvl)}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-[11px] font-bold transition-all border ${
                    priority === lvl
                      ? lvl === 'Critical'
                        ? 'bg-rose-100 border-rose-500 text-rose-800 shadow-xs'
                        : lvl === 'High'
                        ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                        : lvl === 'Medium'
                        ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-xs'
                        : 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Location / Landmark
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="review-location-input"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter address or landmark"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#003B95] focus:bg-white text-slate-800"
              />
            </div>
          </div>

          {/* Detailed Description / real transcript */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {complaintDraft.mode === 'voice' ? 'Transcript' : 'Full Description'}
            </label>
            <textarea
              id="review-description-textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#003B95] focus:bg-white text-slate-800 leading-relaxed"
            />
          </div>

          {/* Keywords (read-only, real AI output) */}
          {complaintDraft.keywords && complaintDraft.keywords.length > 0 && (
            <div className="md:col-span-2 flex flex-wrap gap-1.5">
              {complaintDraft.keywords.map((k, idx) => (
                <span key={idx} className="bg-blue-50 text-[#003B95] text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-blue-100">
                  {k}
                </span>
              ))}
            </div>
          )}

          {/* Attachments / Photo upload */}
          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Photos & Supporting Documents <span className="text-slate-400 font-normal">(Optional)</span>
            </label>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:bg-slate-50/60 transition-colors">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <UploadCloud className="w-8 h-8 text-[#003B95] mb-2" />
                <span className="text-xs font-bold text-slate-700">
                  Click to upload photos or drag and drop
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  PNG, JPG, PDF up to 10MB
                </span>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {attachments.map((file, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    {file}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {complaintDraft.processingStage === 'error' && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold">
            {complaintDraft.processingError || 'Unable to submit the complaint. Please try again.'}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3.5">
          <button
            type="button"
            onClick={() => setComplaintDraft(prev => ({ ...prev, step: prev.mode === 'text' ? 'text-description' : 'voice-recording' }))}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Edit Recording
          </button>
          <button
            id="confirm-submit-complaint-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Submitting…' : 'Confirm & Submit Complaint'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
