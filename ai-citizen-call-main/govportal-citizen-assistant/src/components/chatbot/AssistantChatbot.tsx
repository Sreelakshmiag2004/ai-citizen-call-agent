import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Bot, X, Minus, Send, Sparkles, ExternalLink, ArrowLeft } from 'lucide-react';

export const AssistantChatbot: React.FC = () => {
  const {
    isChatOpen,
    isChatMinimized,
    setIsChatOpen,
    setIsChatMinimized,
    toggleChat,
    chatMessages,
    sendChatMessage,
    handleChatAction,
    navigate,
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatbotRef = useRef<HTMLDivElement>(null);

  // Close chatbot when clicking outside
  useEffect(() => {
    if (!isChatOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (chatbotRef.current && !chatbotRef.current.contains(event.target as Node)) {
        setIsChatOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isChatOpen, setIsChatOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen && !isChatMinimized) {
      scrollToBottom();
    }
  }, [chatMessages, isChatOpen, isChatMinimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendChatMessage(inputVal);
    setInputVal('');
  };

  const handleCloseChat = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsChatOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-amber-50 text-amber-600 border border-amber-200';
      case 'Assigned':
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'Verified':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
      case 'Resolved':
        return 'bg-green-50 text-green-600 border border-green-200';
      case 'Closed':
        return 'bg-slate-100 text-slate-500 border border-slate-200';
      default:
        return 'bg-blue-50 text-blue-600 border border-blue-200';
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isChatOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            id="floating-ai-assistant-btn"
            onClick={toggleChat}
            className="w-14 h-14 bg-[#003B95] hover:bg-[#002D72] text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer border border-blue-400/30 transition-transform hover:scale-105 active:scale-95 group relative"
            title="GovPortal AI Assistant"
          >
            <Bot className="w-7 h-7" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
            
            {/* Tooltip on hover */}
            <div className="absolute right-16 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              GovPortal AI Assistant
            </div>
          </button>
        </div>
      )}

      {/* Interactive Chatbot Modal */}
      {isChatOpen && (
        <div 
          ref={chatbotRef}
          id="assistant-chatbot-modal"
          className="fixed bottom-6 right-6 z-50 w-full max-w-[420px] shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col transition-all duration-200"
          style={{ height: isChatMinimized ? '56px' : '580px' }}
        >
          {/* Header */}
          <div 
            id="chatbot-header"
            className="bg-[#003B95] text-white px-4 py-3.5 flex items-center justify-between shrink-0 select-none shadow-sm cursor-pointer"
            onClick={() => setIsChatMinimized(!isChatMinimized)}
          >
            <div className="flex items-center gap-2">
              {/* Back / Return Button */}
              <button
                id="chatbot-back-btn"
                type="button"
                onClick={handleCloseChat}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Back / Close"
                aria-label="Back to previous screen"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-sm tracking-wide">GovPortal Assistant</span>
              <span className="bg-blue-400/30 text-blue-100 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                BETA
              </span>
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                id="chatbot-minimize-btn"
                onClick={() => setIsChatMinimized(!isChatMinimized)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title={isChatMinimized ? 'Expand' : 'Minimize'}
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                id="chatbot-close-btn"
                onClick={handleCloseChat}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Close"
                aria-label="Close chatbot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isChatMinimized && (
            <>
              {/* Chat Messages Body */}
              <div 
                id="chatbot-messages-container"
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70"
              >
                <div className="text-center my-1">
                  <span className="text-[11px] font-medium text-slate-400 bg-white/80 px-2.5 py-0.5 rounded-full shadow-xs border border-slate-200/60">
                    Today, 10:00 AM
                  </span>
                </div>

                {chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-2.5">
                    {msg.sender === 'bot' ? (
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#003B95] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="space-y-2 max-w-[85%]">
                          <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-sm p-3.5 text-xs text-slate-800 shadow-xs leading-relaxed whitespace-pre-line">
                            {msg.text}
                          </div>

                          {/* Embedded Complaint Card */}
                          {msg.complaintCard && (
                            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                              <div>
                                <h4 className="font-bold text-xs text-slate-900 leading-snug">
                                  {msg.complaintCard.title}
                                </h4>
                                <div className="mt-1.5 space-y-1 text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-medium">Status:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(msg.complaintCard.status)}`}>
                                      {msg.complaintCard.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <span className="text-slate-500 font-medium">Department:</span>
                                    <span>{msg.complaintCard.department}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <span className="text-slate-500 font-medium">Updated on:</span>
                                    <span>{msg.complaintCard.updatedOn}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                id={`chat-view-complaint-${msg.complaintCard.id}`}
                                onClick={() => {
                                  navigate('complaint-details', msg.complaintCard?.id);
                                }}
                                className="w-full py-1.5 px-3 border border-[#003B95] text-[#003B95] hover:bg-blue-50 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                              >
                                <span>View Complaint Details</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Quick Action Chips */}
                          {msg.actionChips && msg.actionChips.length > 0 && (
                            <div className="flex flex-col gap-1.5 pt-1">
                              {msg.actionChips.map((chip, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleChatAction(chip)}
                                  className="w-full text-left px-3.5 py-2 rounded-full border border-[#003B95]/40 text-[#003B95] hover:bg-blue-50 hover:border-[#003B95] text-xs font-semibold transition-all bg-white shadow-2xs"
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <div className="bg-[#003B95] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs shadow-xs max-w-[85%] leading-relaxed">
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 pr-1">
                          {msg.timestamp}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form 
                onSubmit={handleSubmit}
                id="chatbot-input-form"
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
              >
                <div className="relative flex-1">
                  <input
                    id="chatbot-message-input"
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full pl-4 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:border-[#003B95] focus:bg-white transition-all text-slate-800"
                  />
                  <button
                    id="chatbot-send-btn"
                    type="submit"
                    disabled={!inputVal.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-[#003B95] hover:text-[#002D72] disabled:text-slate-300 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
