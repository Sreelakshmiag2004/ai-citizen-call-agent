import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  Mic,
  Pause,
  Play,
  Square,
  RotateCcw,
  FileText,
  Sparkles,
  Volume2,
  AlertTriangle,
} from 'lucide-react';

// Real browser audio recording (MediaRecorder) — no simulated timers, no
// fake transcript. The captured Blob is uploaded to the backend's real
// Whisper -> LLM -> ChromaDB pipeline once "Process with AI Assistant" is
// pressed (see AppContext.startVoiceProcessing).
export const VoiceRecordingStep: React.FC = () => {
  const {
    complaintDraft,
    setComplaintDraft,
    startVoiceProcessing,
  } = useApp();

  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioBlobRef.current = blob;
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = URL.createObjectURL(blob);
        setHasRecording(true);
        cleanupStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setHasRecording(false);
      setSeconds(0);

      clearTimer();
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setMicError(
        'Microphone access was denied or is unavailable. Please allow microphone access, or switch to Text Description.'
      );
      setIsRecording(false);
    }
  };

  // Auto-start recording when this step mounts (matches the original
  // design's "recording starts immediately" UX), unless the mic was
  // already denied.
  useEffect(() => {
    startRecording();
    return () => {
      clearTimer();
      mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current?.stop();
      cleanupStream();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')} : ${String(secs).padStart(2, '0')}`;
  };

  const handleBackToMethodSelection = () => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
    setComplaintDraft((prev) => ({ ...prev, step: 'method-selection' }));
  };

  const handleSwitchToText = () => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
    setComplaintDraft((prev) => ({ ...prev, step: 'text-description', mode: 'text' }));
  };

  const handlePauseToggle = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (isPaused) {
      recorder.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      recorder.pause();
      setIsPaused(true);
      clearTimer();
    }
  };

  const handleStop = () => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const handlePlayToggle = () => {
    if (!audioElRef.current) return;
    if (isPlaying) {
      audioElRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleReRecord = () => {
    setHasRecording(false);
    setIsPlaying(false);
    audioBlobRef.current = null;
    startRecording();
  };

  const handleProceedToAI = () => {
    if (!audioBlobRef.current) return;
    startVoiceProcessing(audioBlobRef.current);
  };

  const statusLabel = micError
    ? null
    : isPlaying
    ? 'playing'
    : isPaused
    ? 'paused'
    : hasRecording
    ? 'done'
    : isRecording
    ? 'recording'
    : 'idle';

  return (
    <div id="raise-complaint-flow" className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Raise Complaint
        </h1>
      </div>

      {/* Main Elevated Card matching reference screen */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-10 relative">

        {/* Back Link */}
        <button
          id="record-step-back-btn"
          onClick={handleBackToMethodSelection}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#003B95] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Method Selection</span>
        </button>

        {/* Mode Switcher Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-white text-[#003B95] shadow-xs cursor-default"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Recording</span>
            </button>
            <button
              type="button"
              onClick={handleSwitchToText}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Text Description</span>
            </button>
          </div>
        </div>

        {micError && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-left">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 leading-relaxed">{micError}</p>
          </div>
        )}

        {/* Voice Recording UI matching reference image */}
        <div className="flex flex-col items-center text-center space-y-8 py-4">
          <div>
            <h2 className="text-2xl font-extrabold text-[#001D4A] tracking-tight mb-2">
              Record Your Complaint
            </h2>
            <p className="text-sm text-slate-500 font-normal">
              Please describe your issue clearly.
            </p>
          </div>

          {/* Circular Green Meter Display with Pulse */}
          <div className="relative flex items-center justify-center my-4">
            {/* Outer Pulse Ring */}
            {isRecording && !isPaused && !isPlaying && (
              <div className="absolute w-52 h-52 rounded-full bg-emerald-100/50 animate-pulse-ring pointer-events-none" />
            )}

            {/* Main Circular Box */}
            <div className="w-44 h-44 rounded-full bg-[#EAFBF3] border-[6px] border-[#D1F7E4] flex flex-col items-center justify-center z-10 shadow-sm transition-transform">
              <Mic className="w-8 h-8 text-[#10B981] mb-2" />
              <span className="text-2xl font-extrabold text-[#0D9488] tracking-wider font-mono">
                {formatTimer(seconds)}
              </span>
            </div>
          </div>

          {/* Status Text */}
          <div className="text-xs font-medium text-slate-400">
            {statusLabel === 'playing' ? (
              <span className="text-blue-600 font-semibold flex items-center gap-1.5 justify-center">
                <Volume2 className="w-4 h-4 animate-bounce" /> Playing recorded audio...
              </span>
            ) : statusLabel === 'paused' ? (
              <span className="text-amber-600 font-semibold">Recording paused</span>
            ) : statusLabel === 'done' ? (
              <span className="text-emerald-600 font-semibold">Recording completed</span>
            ) : statusLabel === 'recording' ? (
              <span className="animate-pulse text-slate-400">Recording...</span>
            ) : (
              <span className="text-slate-400">Microphone unavailable</span>
            )}
          </div>

          {/* Hidden audio element for real playback of the recorded blob */}
          {audioUrlRef.current && (
            <audio
              ref={audioElRef}
              src={audioUrlRef.current}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}

          {/* Controls Row: Pause, Stop, Play, Re-record */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {/* Pause / Resume */}
            <button
              id="voice-pause-btn"
              onClick={handlePauseToggle}
              disabled={!isRecording}
              className="px-5 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Pause className="w-3.5 h-3.5 text-slate-600" />
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            {/* Stop Button (Red border) */}
            <button
              id="voice-stop-btn"
              onClick={handleStop}
              disabled={!isRecording}
              className="px-5 py-2.5 rounded-lg border-2 border-rose-500 hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Square className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>Stop</span>
            </button>

            {/* Play Button */}
            <button
              id="voice-play-btn"
              onClick={handlePlayToggle}
              disabled={!hasRecording}
              className="px-5 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-[#003B95] text-[#003B95]' : 'text-slate-600'}`} />
              <span>{isPlaying ? 'Stop Play' : 'Play'}</span>
            </button>

            {/* Re-record Button */}
            <button
              id="voice-rerecord-btn"
              onClick={handleReRecord}
              className="px-5 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>Re-record</span>
            </button>
          </div>
        </div>

        {/* Action Button to trigger AI Processing */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
          <button
            id="proceed-ai-analysis-btn"
            onClick={handleProceedToAI}
            disabled={!hasRecording}
            className="px-6 py-3 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Process with AI Assistant</span>
          </button>
        </div>
      </div>
    </div>
  );
};
