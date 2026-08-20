import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Landmark } from 'lucide-react';
import { AssistantChatbot } from '../components/chatbot/AssistantChatbot';

export const RegisterPage: React.FC = () => {
  const { register, navigate } = useApp();
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agreed) {
      setError('Please agree to the Terms of Use and Privacy Policy.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required to create an account.');
      return;
    }

    // Self-registration always creates a citizen account (see
    // backend/app/routes/auth.py) -- this form has no role selector,
    // by design.
    setIsSubmitting(true);
    const result = await register({
      fullName,
      email,
      password,
      phone: mobileNumber || undefined,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
    }
  };

  return (
    <div id="register-screen" className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Card Container */}
      <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-xl border border-slate-200/70 p-8 sm:p-10 relative z-10 flex flex-col items-center">
        
        {/* Brand Icon & Name */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center shadow-2xs">
            <Landmark className="w-5 h-5 text-slate-700" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            GovPortal
          </span>
        </div>

        {/* Header Text */}
        <h1 className="text-2xl font-bold text-slate-900 mb-1 text-center">
          Create Your Account
        </h1>
        <p className="text-xs text-slate-500 mb-8 text-center">
          Join us to raise and track complaints
        </p>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {error && (
            <div
              id="register-error-banner"
              className="px-3 py-2.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
            >
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Name
            </label>
            <input
              id="register-fullname-input"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95] focus:ring-1 focus:ring-[#003B95] transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Mobile Number (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              id="register-mobile-input"
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="Enter mobile number"
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95] focus:ring-1 focus:ring-[#003B95] transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Email -- this is the account's login identifier, so it's required */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="register-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95] focus:ring-1 focus:ring-[#003B95] transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password <span className="text-slate-400 font-normal">(min. 8 characters)</span>
            </label>
            <input
              id="register-password-input"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create password"
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95] focus:ring-1 focus:ring-[#003B95] transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-2 pt-1">
            <input
              id="terms-agree"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-[#003B95] border-slate-300 focus:ring-[#003B95]"
            />
            <label htmlFor="terms-agree" className="text-xs text-slate-600 leading-tight cursor-pointer">
              I agree to the{' '}
              <a href="#" className="font-semibold text-[#003B95] hover:underline">
                Terms of Use
              </a>{' '}
              and{' '}
              <a href="#" className="font-semibold text-[#003B95] hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>

          {/* Register Button */}
          <button
            id="register-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 mt-2 bg-[#003B95] hover:bg-[#002D72] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg shadow-sm transition-all"
          >
            {isSubmitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-7 text-xs text-slate-600 text-center">
          Already have an account?{' '}
          <button
            id="register-goto-login-btn"
            onClick={() => navigate('login')}
            className="font-bold text-[#003B95] hover:underline"
          >
            Login
          </button>
        </p>

        {/* Cityscape Skyline Footer SVG Vector */}
        <div className="w-full mt-6 flex justify-center opacity-25">
          <svg className="w-48 h-6 text-slate-600" viewBox="0 0 200 30" fill="currentColor">
            <path d="M0 30 L0 25 L15 25 L15 20 L25 20 L25 15 L35 15 L35 25 L45 25 L45 10 L55 10 L55 5 L65 5 L65 18 L75 18 L75 12 L85 12 L85 24 L95 24 L95 8 L105 8 L105 4 L115 4 L115 16 L125 16 L125 22 L135 22 L135 14 L145 14 L145 26 L155 26 L155 18 L165 18 L165 10 L175 10 L175 22 L185 22 L185 15 L200 15 L200 30 Z" />
          </svg>
        </div>
      </div>

      <AssistantChatbot />
    </div>
  );
};
