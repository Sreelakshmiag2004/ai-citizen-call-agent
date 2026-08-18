import React from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { AssistantChatbot } from '../chatbot/AssistantChatbot';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div id="govportal-app-shell" className="min-h-screen bg-[#F8FAFC] flex overflow-x-hidden">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        <TopHeader />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Persistent AI Assistant */}
      <AssistantChatbot />
    </div>
  );
};
