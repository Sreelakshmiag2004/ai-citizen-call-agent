import React from 'react';
import { useApp } from '../context/AppContext';
import { CIVIC_SERVICES } from '../data/mockData';
import { 
  ArrowLeft, 
  ArrowRight, 
  Droplet, 
  Zap, 
  Trash2, 
  Bus, 
  MoreHorizontal, 
  Route as RoadIcon,
  HelpCircle,
  PhoneCall,
  Mail,
  ShieldAlert
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { navigate, resetComplaintDraft } = useApp();

  const getIcon = (id: string) => {
    switch (id) {
      case 'roads': return <RoadIcon className="w-6 h-6 text-[#003B95]" />;
      case 'water': return <Droplet className="w-6 h-6 text-[#003B95]" />;
      case 'electricity': return <Zap className="w-6 h-6 text-[#003B95]" />;
      case 'sanitation': return <Trash2 className="w-6 h-6 text-[#003B95]" />;
      case 'transport': return <Bus className="w-6 h-6 text-[#003B95]" />;
      default: return <MoreHorizontal className="w-6 h-6 text-[#003B95]" />;
    }
  };

  const handleRaiseForService = (serviceName: string, category: string) => {
    resetComplaintDraft();
    navigate('raise-complaint');
  };

  return (
    <div id="services-directory-page" className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-150 py-4">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('landing')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#003B95] mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Government Services & Civic Departments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore dedicated redressal categories and service resolution standards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CIVIC_SERVICES.map((srv) => (
          <div
            key={srv.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                {getIcon(srv.id)}
              </div>
              <h3 className="text-base font-bold text-slate-900">{srv.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{srv.description}</p>
              
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 block font-medium text-[11px]">Primary Authority</span>
                <span className="font-semibold text-slate-800">{srv.department}</span>
              </div>
            </div>

            <button
              onClick={() => handleRaiseForService(srv.name, srv.name)}
              className="mt-6 w-full py-2.5 bg-slate-50 hover:bg-[#003B95] hover:text-white text-[#003B95] font-bold text-xs rounded-xl border border-blue-200/80 transition-all flex items-center justify-center gap-2"
            >
              <span>Raise Issue in this Category</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AboutHelpPage: React.FC<{ mode: 'about' | 'help' }> = ({ mode }) => {
  const { navigate } = useApp();

  return (
    <div id="about-help-page" className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150 py-4">
      <div>
        <button
          onClick={() => navigate('landing')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#003B95] mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {mode === 'about' ? 'About GovPortal' : 'Help & Citizen Support'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {mode === 'about' 
            ? 'Transparent, AI-empowered civic grievance redressal for all citizens.' 
            : 'Frequently asked questions, grievance escalation matrices, and helpline contacts.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900">How Grievance Redressal Operates</h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          GovPortal provides an intelligent, end-to-end digital lifecycle for municipal complaints. When you submit a voice or text grievance, our AI assistant structures your complaint, assigns appropriate priority levels, routes the ticket to the respective municipal division, and alerts local field engineers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <h4 className="text-xs font-bold text-slate-800">24/7 Helpline</h4>
            <p className="text-xs font-mono text-[#003B95] font-bold">1800-425-0011</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <h4 className="text-xs font-bold text-slate-800">Email Grievance Desk</h4>
            <p className="text-xs text-[#003B95] font-medium">helpdesk@govportal.gov.in</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <h4 className="text-xs font-bold text-slate-800">SLA Resolution Target</h4>
            <p className="text-xs text-emerald-600 font-bold">48 to 72 Hours Average</p>
          </div>
        </div>
      </div>
    </div>
  );
};
