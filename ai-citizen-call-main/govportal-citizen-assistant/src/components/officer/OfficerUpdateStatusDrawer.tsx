import React, { useState } from 'react';
import { X, Save, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

interface OfficerUpdateStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string;
  currentStatus: string;
  /** Backend-valid next statuses only (see ALLOWED_TRANSITIONS in
   * app/services/complaint_service.py) — passed in by the parent so this
   * drawer never offers a transition the backend would reject. */
  allowedNextStatuses: string[];
  /** Performs the real PATCH /complaints/{id}/status call. Resolves with
   * { ok: true } or { ok: false, error } — no optimistic fake success. */
  onSave: (newStatus: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export const OfficerUpdateStatusDrawer: React.FC<OfficerUpdateStatusDrawerProps> = ({
  isOpen,
  onClose,
  complaintId,
  currentStatus,
  allowedNextStatuses,
  onSave,
}) => {
  const [status, setStatus] = useState<string>(allowedNextStatuses[0] || currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await onSave(status);
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 900);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        id="officer-update-status-drawer"
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 border-l border-slate-200"
      >
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Update Status</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Complaint ID: <span className="text-[#003B95] font-mono">{complaintId}</span>
            </p>
          </div>
          <button
            id="close-update-status-drawer"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 flex-1">
          <div>
            <label htmlFor="officer-status-select" className="block text-xs font-bold text-slate-700 mb-1.5">
              Current status: <span className="text-slate-500 font-normal">{currentStatus}</span>
            </label>
            {allowedNextStatuses.length === 0 ? (
              <p className="text-xs text-slate-400">No further status transitions are available from this status.</p>
            ) : (
              <select
                id="officer-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#003B95] focus:ring-1 focus:ring-[#003B95] transition-all cursor-pointer"
              >
                {allowedNextStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Status updated successfully!</span>
            </div>
          )}
        </form>

        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 sticky bottom-0">
          <button
            type="button"
            id="cancel-update-status-btn"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="save-update-status-btn"
            onClick={handleSave}
            disabled={saving || allowedNextStatuses.length === 0}
            className="px-5 py-2.5 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving…' : 'Save Update'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
