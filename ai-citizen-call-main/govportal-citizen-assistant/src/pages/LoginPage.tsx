import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Landmark } from 'lucide-react';
import { AssistantChatbot } from '../components/chatbot/AssistantChatbot';

export const LoginPage: React.FC = () => {
  const { login, navigate } = useApp();
  const [emailOrPhone, setEmailOrPhone] = useState('99876 54321');
  const [password, setPassword] = useState('••••••••');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ emailOrPhone, password });
  };

  return (
    <div id="login-screen" className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Card Container */}
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-xl border border-slate-200/70 p-8 sm:p-10 relative z-10 flex flex-col items-center">
        
        {/* Brand Icon & Name */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center shadow-2xs">
            <Landmark className="w-5 h-5 text-slate-700" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            GovPortal
          </span>
        </div>

        {/* Header Text */}
        <h1 className="text-2xl font-bold text-slate-900 mb-1 text-center">
          Welcome Back!
        </h1>
        <p className="text-xs text-slate-500 mb-6 text-center">
          Login to your account to continue
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Mobile / Email */}
          <div>
            <label htmlFor="login-identifier-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mobile Number / Email
            </label>
            <input
              id="login-identifier-input"
              type="text"
              required
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="Enter registered mobile number or email"
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95] focus:ring-1 focus:ring-[#003B95] transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password-input" className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset link sent to your registered mobile/email.')}
                className="text-xs font-semibold text-[#003B95] hover:underline"
              >
                Forgot?
              </button>
            </div>
            <input
              id="login-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#003B95] focus:ring-1 focus:ring-[#003B95] transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-[#003B95] border-slate-300 focus:ring-[#003B95]"
            />
            <label htmlFor="remember-me" className="text-xs text-slate-600 cursor-pointer">
              Remember me
            </label>
          </div>

          {/* Primary Login Button */}
          <button
            id="login-submit-btn"
            type="submit"
            className="w-full py-2.5 bg-[#003B95] hover:bg-[#002D72] text-white font-bold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <span>Login</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs text-slate-400 font-medium">or</span>
          </div>

          {/* Login with OTP */}
          <button
            id="login-otp-btn"
            type="button"
            onClick={() => login({ emailOrPhone })}
            className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-all shadow-2xs cursor-pointer"
          >
            Login with OTP
          </button>
        </form>

        {/* Register Link */}
        <p className="mt-6 text-xs text-slate-600 text-center">
          Don't have an account?{' '}
          <button
            id="login-goto-register-btn"
            onClick={() => navigate('register')}
            className="font-bold text-[#003B95] hover:underline cursor-pointer"
          >
            Register
          </button>
        </p>

        {/* Cityscape Skyline Footer SVG Vector */}
        <div className="w-full mt-5 flex justify-center opacity-25">
          <svg className="w-48 h-6 text-slate-600" viewBox="0 0 200 30" fill="currentColor">
            <path d="M0 30 L0 25 L15 25 L15 20 L25 20 L25 15 L35 15 L35 25 L45 25 L45 10 L55 10 L55 5 L65 5 L65 18 L75 18 L75 12 L85 12 L85 24 L95 24 L95 8 L105 8 L105 4 L115 4 L115 16 L125 16 L125 22 L135 22 L135 14 L145 14 L145 26 L155 26 L155 18 L165 18 L165 10 L175 10 L175 22 L185 22 L185 15 L200 15 L200 30 Z" />
          </svg>
        </div>
      </div>

      <AssistantChatbot />
    </div>
  );
};
