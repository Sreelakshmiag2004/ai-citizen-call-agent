import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Flame, 
  X,
  Building2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CALL_CENTER_EXCEPTIONS } from '../../data/callCenterData';
import { CallCenterException } from '../../types';

export const CallCenterExceptionsPage: React.FC = () => {
  const { exceptions, navigate, setSelectedComplaintId } = useApp();
  const [selectedException, setSelectedException] = useState<CallCenterException | null>(null);
  const [manualDept, setManualDept] = useState('Public Works Dept.');
  const [isResolvedSuccess, setIsResolvedSuccess] = useState(false);

  const getExceptionTypeBadge = (type: string) => {
    switch (type) {
      case 'Emergency Case':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'Low Confidence':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Transcription Failed':
      case 'Processing Failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Conflicting Depts.':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-600 text-white font-bold';
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleResolve = () => {
    setIsResolvedSuccess(true);
    setTimeout(() => {
      setIsResolvedSuccess(false);
      setSelectedException(null);
    }, 1200);
  };

  return (
    <div id="call-center-exceptions-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Exceptions</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review cases that need human attention
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {exceptions.length} Cases Requiring Human Decision
          </span>
        </div>
      </div>

      {/* Exceptions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Complaint ID</th>
                <th className="py-3.5 px-4 font-semibold">Exception Type</th>
                <th className="py-3.5 px-4 font-semibold">Reason</th>
                <th className="py-3.5 px-4 font-semibold">Caller</th>
                <th className="py-3.5 px-4 font-semibold">Priority</th>
                <th className="py-3.5 px-4 font-semibold">AI Confidence</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exceptions.map((exc) => (
                <tr
                  key={exc.id}
                  id={`exception-row-${exc.id}`}
                  onClick={() => setSelectedException(exc)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 font-mono">
                    {exc.complaintId}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getExceptionTypeBadge(exc.type)}`}>
                      {exc.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {exc.reason}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {exc.caller}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getPriorityBadge(exc.priority)}`}>
                      {exc.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                    {exc.aiConfidence}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedException(exc);
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md transition-colors"
                    >
                      Review Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedException && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Review Exception ({selectedException.complaintId})
                </h3>
              </div>
              <button
                onClick={() => setSelectedException(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isResolvedSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">Exception Resolved & Dispatched</p>
                <p className="text-xs text-slate-500">Case routed to {manualDept}</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Caller:</span>
                    <strong className="text-slate-800">{selectedException.caller}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Exception:</span>
                    <span className={`px-2 py-0.5 rounded font-semibold ${getExceptionTypeBadge(selectedException.type)}`}>
                      {selectedException.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reason:</span>
                    <strong className="text-slate-800">{selectedException.reason}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">AI Confidence:</span>
                    <strong className="text-slate-800 font-mono">{selectedException.aiConfidence}</strong>
                  </div>
                </div>

                {/* Override Routing Option */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Assign Manual Department & Override
                  </label>
                  <select
                    value={manualDept}
                    onChange={(e) => setManualDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option>Public Works Dept. (PWD)</option>
                    <option>Electricity Supply & Grid</option>
                    <option>Sanitation & Waste Management</option>
                    <option>Water Supply & Sewerage</option>
                    <option>Patrol & Police Assistance</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedException(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolve}
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
                  >
                    Approve & Route Case
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
