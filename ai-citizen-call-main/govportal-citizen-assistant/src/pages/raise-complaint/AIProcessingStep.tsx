import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bot, Sparkles, CheckCircle2, Loader2, AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react';

// Real pipeline status display. There is no fabricated progress percentage
// here — each row reflects the actual stage the backend request is in
// (uploading -> transcribing -> analyzing -> duplicate-check), and the step
// only advances to 'review' once the real API responses have come back.
export const AIProcessingStep: React.FC = () => {
  const { complaintDraft, setComplaintDraft, startVoiceProcessing, startTextProcessing } = useApp();
  const stage = complaintDraft.processingStage || 'idle';
  const isVoice = complaintDraft.mode === 'voice';

  const stages = isVoice
    ? (['uploading', 'transcribing', 'analyzing', 'duplicate-check'] as const)
    : (['analyzing', 'duplicate-check'] as const);

  const stageLabels: Record<string, string> = {
    uploading: 'Uploading audio to server',
    transcribing: 'Transcribing speech with faster-whisper (multilingual)',
    analyzing: 'Analyzing complaint with LLM (category, department, priority)',
    'duplicate-check': 'Checking for similar complaints (ChromaDB semantic search)',
  };

  const stageIndex = stages.indexOf(stage as any);

  const handleRetry = () => {
    if (isVoice && complaintDraft.audioBlob) {
      startVoiceProcessing(complaintDraft.audioBlob);
    } else {
      startTextProcessing(complaintDraft.description);
    }
  };

  const handleBack = () => {
    setComplaintDraft((prev) => ({
      ...prev,
      step: prev.mode === 'voice' ? 'voice-recording' : 'text-description',
      processingStage: 'idle',
      processingError: null,
    }));
  };

  return (
    <div id="ai-processing-step" className="max-w-2xl mx-auto py-8 space-y-8 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8 sm:p-12 text-center space-y-8">

        {/* Animated AI Icon Badge */}
        <div className="relative inline-flex items-center justify-center">
          <div
            className={`w-20 h-20 rounded-2xl text-white flex items-center justify-center shadow-lg ${
              stage === 'error' ? 'bg-gradient-to-tr from-rose-600 to-rose-400' : 'bg-gradient-to-tr from-[#003B95] to-blue-500 animate-bounce'
            }`}
          >
            {stage === 'error' ? <AlertTriangle className="w-10 h-10" /> : <Sparkles className="w-10 h-10" />}
          </div>
          <div className={`absolute -bottom-2 -right-2 text-white p-1.5 rounded-full ring-4 ring-white ${stage === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
            <Bot className="w-4 h-4" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {stage === 'error' ? 'Something went wrong' : 'GovPortal AI Assistant is Processing'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {stage === 'error'
              ? complaintDraft.processingError || 'Unable to process your complaint. Please try again.'
              : 'Real speech-to-text, LLM analysis, and duplicate detection are running on the backend — this can take a few seconds.'}
          </p>
        </div>

        {stage !== 'error' && (
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 text-left space-y-3.5 text-xs font-medium">
            {stages.map((s, idx) => {
              const done = stageIndex > idx || stage === 'submitting';
              const active = stageIndex === idx;
              return (
                <div key={s} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : active ? (
                      <Loader2 className="w-4 h-4 text-[#003B95] animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className={done ? 'text-slate-800 font-semibold' : active ? 'text-slate-700' : 'text-slate-400'}>
                      {stageLabels[s]}
                    </span>
                  </div>
                  {done && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Done</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {stage === 'error' ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
            <button
              id="retry-ai-processing-btn"
              onClick={handleRetry}
              className="px-5 py-2.5 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">
            Please don't close this window while the AI pipeline is running.
          </p>
        )}
      </div>
    </div>
  );
};
