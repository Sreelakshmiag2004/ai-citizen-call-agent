import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Mic, 
  FileText, 
  Sparkles, 
  Paperclip, 
  MapPin, 
  AlertCircle 
} from 'lucide-react';

export const TextDescriptionStep: React.FC = () => {
  const {
    complaintDraft,
    setComplaintDraft,
    startTextProcessing
  } = useApp();

  const [textInput, setTextInput] = useState(complaintDraft.description || '');
  const [locationInput, setLocationInput] = useState(complaintDraft.location || '');

  const handleBackToMethodSelection = () => {
    setComplaintDraft((prev) => ({
      ...prev,
      step: 'method-selection',
    }));
  };

  const handleSwitchToVoice = () => {
    setComplaintDraft((prev) => ({
      ...prev,
      step: 'voice-recording',
      mode: 'voice',
      isRecording: true,
      isPaused: false,
    }));
  };

  const handleProceedToAI = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) {
      alert('Please enter a description for your complaint.');
      return;
    }

    setComplaintDraft((prev) => ({
      ...prev,
      mode: 'text',
      location: locationInput.trim() || prev.location,
    }));
    startTextProcessing(textInput.trim());
  };

  return (
    <div id="text-description-flow" className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Raise Complaint
        </h1>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-10 relative">
        
        {/* Back Link to Method Selection */}
        <button
          id="text-step-back-btn"
          type="button"
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
              onClick={handleSwitchToVoice}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Recording</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-white text-[#003B95] shadow-xs cursor-default"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Text Description</span>
            </button>
          </div>
        </div>

        {/* Text Input Mode */}
        <form onSubmit={handleProceedToAI} className="space-y-6 py-2">
          <div>
            <h2 className="text-2xl font-extrabold text-[#001D4A] tracking-tight mb-1.5">
              Describe Your Complaint
            </h2>
            <p className="text-sm text-slate-500 font-normal">
              Provide comprehensive details about the location, issue, and timeframe.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">
                Detailed Complaint Description <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {textInput.length} characters
              </span>
            </div>
            <textarea
              id="text-complaint-input"
              rows={6}
              required
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Example: Continuous heavy water pipe leakage bursting through the main asphalt road near Sector 4 market. Water has been overflowing for the past 24 hours..."
              className="w-full p-4 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#003B95] focus:bg-white text-slate-800 transition-all leading-relaxed"
            />
          </div>

          {/* Location details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Location / Landmark
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="text-location-input"
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g., Near 4th Cross Road, Green Park Sector, Bangalore"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#003B95] focus:bg-white text-slate-800"
              />
            </div>
          </div>

          {/* AI Helper Banner */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#003B95] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-blue-200" />
            </div>
            <div className="text-xs text-slate-600 space-y-0.5">
              <span className="font-bold text-[#003B95] block">AI Auto-Classification</span>
              <p>
                Our AI model will automatically analyze your text to classify the category, detect the responsible civic department, and assign an initial priority.
              </p>
            </div>
          </div>

          {/* Action Button to trigger AI Processing */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
            <button
              id="proceed-ai-analysis-btn"
              type="submit"
              className="px-6 py-3 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Process with AI Assistant</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
