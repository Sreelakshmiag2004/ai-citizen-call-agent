import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Landmark, 
  ArrowRight, 
  Search, 
  CheckCircle2, 
  Building2, 
  Headphones, 
  Smile, 
  Droplet, 
  Zap, 
  Trash2, 
  Bus, 
  MoreHorizontal, 
  Route as RoadIcon,
  ShieldCheck,
  ChevronRight,
  PhoneCall
} from 'lucide-react';
import { AssistantChatbot } from '../components/chatbot/AssistantChatbot';

// Call Center Helpline Phone Number (Placeholder - easily replaceable with actual number)
const CALL_CENTER_PHONE_NUMBER = '0000000000';

export const LandingPage: React.FC = () => {
  const { navigate, resetComplaintDraft, complaints } = useApp();
  const [trackQuery, setTrackQuery] = useState('');
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackError, setTrackError] = useState('');

  const handleStartRaiseComplaint = () => {
    resetComplaintDraft();
    navigate('raise-complaint');
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    const cleanId = trackQuery.trim().toUpperCase();
    const found = complaints.find(c => c.id.toUpperCase() === cleanId);
    if (found) {
      setShowTrackModal(false);
      navigate('complaint-details', found.id);
    } else {
      setTrackError(`No complaint found for ID "${trackQuery}". Try GP2025-0001234 or GP2025-0001231`);
    }
  };

  return (
    <div id="landing-page" className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div 
            id="landing-logo"
            onClick={() => navigate('landing')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 bg-[#003B95] text-white rounded-xl flex items-center justify-center shadow-md">
              <Landmark className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#003B95] leading-none">
                GovPortal
              </span>
              <span className="text-[11px] text-slate-500 font-medium tracking-wide mt-1">
                Your Voice. Our Responsibility.
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button 
              id="nav-home" 
              onClick={() => navigate('landing')}
              className="text-[#003B95] font-bold border-b-2 border-[#003B95] pb-1"
            >
              Home
            </button>
            <button 
              id="nav-services" 
              onClick={() => navigate('services')}
              className="hover:text-[#003B95] transition-colors"
            >
              Services
            </button>
            <button 
              id="nav-raise-complaint" 
              onClick={handleStartRaiseComplaint}
              className="hover:text-[#003B95] transition-colors"
            >
              Raise Complaint
            </button>
            <button 
              id="nav-track-complaint" 
              onClick={() => setShowTrackModal(true)}
              className="hover:text-[#003B95] transition-colors"
            >
              Track Complaint
            </button>
            <button 
              id="nav-help" 
              onClick={() => navigate('help')}
              className="hover:text-[#003B95] transition-colors"
            >
              Help
            </button>
          </nav>

          {/* Auth Action Buttons */}
          <div className="flex items-center gap-3.5">
            <button
              id="landing-login-btn"
              onClick={() => navigate('login')}
              className="px-5 py-2 text-sm font-bold text-[#003B95] border border-[#003B95] hover:bg-blue-50/80 rounded-lg transition-all"
            >
              Login
            </button>
            <button
              id="landing-register-btn"
              onClick={() => navigate('register')}
              className="px-5 py-2 text-sm font-bold text-white bg-[#003B95] hover:bg-[#002D72] shadow-sm rounded-lg transition-all"
            >
              Register
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-100/50 via-slate-50 to-white py-16 lg:py-24">
        {/* Subtle Watermark Silhouette */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 text-8xl md:text-9xl font-black text-slate-200/40 select-none pointer-events-none whitespace-nowrap">
          Cityscape Portal
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Hero Left Content */}
          <div className="lg:col-span-6 space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
              A Smarter Way to Serve Citizens Better
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl font-normal">
              Report public issues, track complaints, and get updates in real time. Together, let's build a better tomorrow.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                id="hero-raise-complaint-btn"
                onClick={handleStartRaiseComplaint}
                className="px-7 py-3.5 bg-[#003B95] hover:bg-[#002D72] text-white text-base font-bold rounded-lg shadow-md hover:shadow-lg flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5"
              >
                <span>Raise a Complaint</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                id="hero-track-complaint-btn"
                onClick={() => setShowTrackModal(true)}
                className="px-7 py-3.5 bg-white hover:bg-slate-50 text-[#003B95] border-2 border-[#003B95] text-base font-bold rounded-lg shadow-xs transition-all"
              >
                Track Complaint
              </button>

              <a
                id="hero-start-call-btn"
                href={`tel:${CALL_CENTER_PHONE_NUMBER}`}
                className="px-7 py-3.5 bg-[#00B368] hover:bg-[#009E5C] text-white text-base font-bold rounded-lg shadow-md hover:shadow-lg flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5"
              >
                <PhoneCall className="w-5 h-5" />
                <span>Start Call</span>
              </a>
            </div>
          </div>

          {/* Hero Right Visual: Government Municipal Building */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white group">
              <img
                src="https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80"
                alt="Government Municipal City Hall"
                className="w-full h-[360px] object-cover object-center group-hover:scale-102 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-xl p-3.5 shadow-lg flex items-center justify-between border border-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#003B95] flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Certified Citizen Redressal</h4>
                    <p className="text-[11px] text-slate-500">Official Municipal & State Grievance Grid</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Active 24/7
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Ribbon (Navy Blue Banner) */}
      <section className="bg-[#003B95] text-white py-8 px-6 shadow-inner">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-blue-800/60">
          <div className="flex items-center gap-4 pt-4 md:pt-0 md:px-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-extrabold tracking-tight">12L+</div>
              <div className="text-xs text-blue-200 font-medium">Complaints Resolved</div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 md:pt-0 md:px-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Smile className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-extrabold tracking-tight">98%</div>
              <div className="text-xs text-blue-200 font-medium">Citizen Satisfaction</div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 md:pt-0 md:px-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-extrabold tracking-tight">500+</div>
              <div className="text-xs text-blue-200 font-medium">Departments</div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 md:pt-0 md:px-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-extrabold tracking-tight">24x7</div>
              <div className="text-xs text-blue-200 font-medium">Service Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services We Offer Section */}
      <section className="py-16 md:py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Services We Offer
          </h2>
          <button
            onClick={() => navigate('services')}
            className="text-sm font-bold text-[#003B95] hover:text-[#002D72] flex items-center gap-1.5 transition-colors group"
          >
            <span>View All Services</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* 6 Clean Service Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {/* Roads & Infrastructure */}
          <div 
            onClick={handleStartRaiseComplaint}
            className="bg-white hover:bg-blue-50/40 p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#003B95] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <RoadIcon className="w-7 h-7" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Roads & Infrastructure
            </h3>
          </div>

          {/* Water Supply & Drainage */}
          <div 
            onClick={handleStartRaiseComplaint}
            className="bg-white hover:bg-blue-50/40 p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#003B95] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Droplet className="w-7 h-7" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Water Supply & Drainage
            </h3>
          </div>

          {/* Electricity & Power */}
          <div 
            onClick={handleStartRaiseComplaint}
            className="bg-white hover:bg-blue-50/40 p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#003B95] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Electricity & Power
            </h3>
          </div>

          {/* Sanitation & Waste */}
          <div 
            onClick={handleStartRaiseComplaint}
            className="bg-white hover:bg-blue-50/40 p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#003B95] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Sanitation & Waste
            </h3>
          </div>

          {/* Public Transport */}
          <div 
            onClick={handleStartRaiseComplaint}
            className="bg-white hover:bg-blue-50/40 p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#003B95] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bus className="w-7 h-7" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Public Transport
            </h3>
          </div>

          {/* Others */}
          <div 
            onClick={handleStartRaiseComplaint}
            className="bg-white hover:bg-blue-50/40 p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#003B95] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MoreHorizontal className="w-7 h-7" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Others
            </h3>
          </div>
        </div>
      </section>

      {/* Track Complaint Modal */}
      {showTrackModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Track Your Complaint</h3>
            <p className="text-xs text-slate-500 mb-6">
              Enter your unique Complaint Reference ID to view live progress updates.
            </p>

            <form onSubmit={handleTrackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Complaint ID
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={trackQuery}
                    onChange={(e) => {
                      setTrackQuery(e.target.value);
                      setTrackError('');
                    }}
                    placeholder="e.g. GP2025-0001234"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#003B95] font-mono uppercase font-semibold"
                  />
                </div>
                {trackError && (
                  <p className="text-xs text-red-600 mt-1.5">{trackError}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTrackModal(false);
                    setTrackError('');
                  }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#003B95] text-white font-bold text-xs rounded-xl hover:bg-[#002D72] shadow-sm"
                >
                  Track Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Persistent Floating Chatbot */}
      <AssistantChatbot />
    </div>
  );
};
