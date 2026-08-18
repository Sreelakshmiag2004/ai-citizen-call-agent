import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Phone, 
  PhoneOff, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  User, 
  Clock, 
  Building2, 
  Tag, 
  Smile, 
  Frown, 
  CheckCircle,
  Share2,
  Volume2
} from 'lucide-react';
import { CALL_CENTER_LIVE_CALLS } from '../../data/callCenterData';
import { CallCenterCall } from '../../types';

export const CallCenterLiveCallsPage: React.FC = () => {
  const { liveCalls, selectedCallId, setSelectedCallId, endLiveCall, navigate, setSelectedComplaintId } = useApp();
  
  const currentCall: CallCenterCall = liveCalls.find(c => c.id === selectedCallId) || liveCalls[0];
  const [activeCallId, setActiveCallId] = useState<string>(selectedCallId || 'call-1');
  const [callDurations, setCallDurations] = useState<{ [id: string]: number }>({
    'call-1': 84,
    'call-2': 56,
    'call-3': 130,
    'call-4': 32,
    'call-5': 65,
  });

  // Increment duration timer for live calls
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDurations(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          next[k] += 1;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const selectedCall = liveCalls.find(c => c.id === activeCallId) || currentCall;

  return (
    <div id="call-center-live-calls-page" className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Live Calls</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Monitor real-time calls and AI processing
        </p>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Calls List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-base font-bold text-slate-900">Live Calls</h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {liveCalls.filter(c => c.status === 'Live').length} Active
            </span>
          </div>

          {/* List of Calls */}
          <div className="space-y-2.5">
            {liveCalls.map((call) => {
              const isSelected = call.id === activeCallId;
              const durationSec = callDurations[call.id] || 60;
              return (
                <div
                  key={call.id}
                  id={`live-call-item-${call.id}`}
                  onClick={() => {
                    setActiveCallId(call.id);
                    setSelectedCallId(call.id);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 tracking-tight">
                        {call.phoneNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>{call.callerName}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-600">{formatSeconds(durationSec)}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {call.status === 'Live' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/60 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Live
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Ended
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Call Details & AI Intelligence (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          {/* Call Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900">
                  {selectedCall.callerName} ({selectedCall.phoneNumber})
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span>Duration: <strong className="font-mono text-slate-700">{formatSeconds(callDurations[selectedCall.id] || 84)}</strong></span>
                <span>•</span>
                <span>Call ID: <strong className="font-mono text-slate-700">{selectedCall.callId}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {selectedCall.status === 'Live' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  Completed
                </span>
              )}

              {selectedCall.status === 'Live' && (
                <button
                  id="live-call-end-btn"
                  onClick={() => endLiveCall(selectedCall.id)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>End Call</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Summary Block */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">AI Summary</h4>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-700 leading-relaxed font-normal">
              "{selectedCall.aiSummary}"
            </div>
          </div>

          {/* Department Recommendation & AI Confidence Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              Department Recommendation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                <p className="text-[11px] font-medium text-slate-400">Recommended Department</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{selectedCall.recommendedDepartment}</p>
              </div>

              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                <p className="text-[11px] font-medium text-slate-400">AI Confidence Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-xl font-bold text-emerald-600">{selectedCall.aiConfidence}%</p>
                  <span className="text-[11px] text-emerald-700 font-medium">High Confidence</span>
                </div>
              </div>
            </div>
          </div>

          {/* Duplicate Check Block */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Duplicate Check
            </h4>
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-emerald-800">
                {selectedCall.duplicateStatus || 'No similar complaints found'}
              </span>
            </div>
          </div>

          {/* 4 Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-3.5">
              <p className="text-[11px] font-medium text-slate-400">Detected Issue</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedCall.detectedIssue}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{selectedCall.detectedCategory}</p>
            </div>

            <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-3.5">
              <p className="text-[11px] font-medium text-slate-400">Priority</p>
              <p className="text-xs font-bold text-rose-600 mt-0.5">{selectedCall.priority}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Requires prompt resolution</p>
            </div>

            <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-3.5">
              <p className="text-[11px] font-medium text-slate-400">Sentiment</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedCall.sentiment}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Frustrated citizen</p>
            </div>

            <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-3.5">
              <p className="text-[11px] font-medium text-slate-400">Automatic Routing Status</p>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">{selectedCall.routingStatus}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{selectedCall.routingTarget}</p>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="flex justify-end pt-2">
            <button
              id="live-call-view-complaint-btn"
              onClick={() => {
                setSelectedComplaintId('CP2025-0001234');
                navigate('complaint-details');
              }}
              className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg transition-colors"
            >
              View Generated Complaint (CP2025-0001234) →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
