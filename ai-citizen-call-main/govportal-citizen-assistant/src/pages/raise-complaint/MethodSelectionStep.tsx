import React from 'react';
import { useApp } from '../../context/AppContext';
import { Mic, Pencil } from 'lucide-react';

export const MethodSelectionStep: React.FC = () => {
  const { setComplaintDraft } = useApp();

  const handleSelectVoice = () => {
    setComplaintDraft((prev) => ({
      ...prev,
      step: 'voice-recording',
      mode: 'voice',
      isRecording: true,
      isPaused: false,
      recordingTime: 0,
    }));
  };

  const handleSelectText = () => {
    setComplaintDraft((prev) => ({
      ...prev,
      step: 'text-description',
      mode: 'text',
      isRecording: false,
      isPaused: false,
    }));
  };

  return (
    <div id="method-selection-flow" className="max-w-4xl mx-auto py-6 sm:py-10 space-y-8 animate-in fade-in duration-150">
      {/* Title and Subtitle */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          How would you like to raise your complaint?
        </h1>
        <p className="text-sm text-slate-500 font-normal">
          Choose any one of the options below
        </p>
      </div>

      {/* Two Method Options Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2">
        {/* Voice Complaint Card */}
        <div
          id="method-voice-card"
          onClick={handleSelectVoice}
          className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md p-8 sm:p-10 flex flex-col items-center text-center justify-between transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
        >
          <div className="flex flex-col items-center pt-2">
            {/* Mint Circle Icon Container */}
            <div className="w-20 h-20 rounded-full bg-[#EAFBF3] border-[6px] border-[#D1F7E4] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform shadow-2xs">
              <Mic className="w-8 h-8 text-[#10B981] stroke-[2.2]" />
            </div>
            
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
              Voice Complaint
            </h2>
            
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Record your issue in your own voice.
            </p>
          </div>

          <button
            id="record-voice-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectVoice();
            }}
            className="w-full mt-8 py-3.5 px-6 bg-[#00B368] hover:bg-[#009E5C] text-white font-bold text-sm sm:text-base rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            Record Voice
          </button>
        </div>

        {/* Text Complaint Card */}
        <div
          id="method-text-card"
          onClick={handleSelectText}
          className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md p-8 sm:p-10 flex flex-col items-center text-center justify-between transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
        >
          <div className="flex flex-col items-center pt-2">
            {/* Soft Blue Circle Icon Container */}
            <div className="w-20 h-20 rounded-full bg-[#EBF2FF] border-[6px] border-[#D8E6FF] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform shadow-2xs">
              <Pencil className="w-8 h-8 text-[#003B95] stroke-[2.2]" />
            </div>
            
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
              Text Complaint
            </h2>
            
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Type your issue in your own words.
            </p>
          </div>

          <button
            id="type-text-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectText();
            }}
            className="w-full mt-8 py-3.5 px-6 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-sm sm:text-base rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            Type Text
          </button>
        </div>
      </div>
    </div>
  );
};
