import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Complaint,
  NotificationItem,
  PageRoute,
  UserProfile,
  ChatMessage,
  PriorityLevel,
  PortalType,
  CallCenterCall,
  CallCenterException,
  MatchedComplaintInfo,
} from '../types';
import { INITIAL_NOTIFICATIONS, INITIAL_USER } from '../data/mockData';
import {
  CALL_CENTER_USER,
  CALL_CENTER_EXCEPTIONS,
  CALL_CENTER_LIVE_CALLS,
  CALL_CENTER_NOTIFICATIONS,
} from '../data/callCenterData';
import {
  ADMIN_USER,
  ADMIN_NOTIFICATIONS_LIST
} from '../data/adminData';
import {
  OFFICER_USER,
  OFFICER_NOTIFICATIONS_LIST
} from '../data/officerData';
import * as api from '../services/api';
import { ApiError } from '../services/api';
import {
  mapBackendComplaintToUI,
  mapStatusHistoryToTimeline,
  mapUIStatusToBackend,
} from '../services/adapters';

export interface ComplaintDraft {
  step: 'method-selection' | 'voice-recording' | 'text-description' | 'record' | 'ai-processing' | 'review' | 'success';
  mode: 'voice' | 'text';
  recordingTime: number;
  isRecording: boolean;
  isPaused: boolean;
  audioBlobUrl?: string;
  audioBlob?: Blob;
  issueTitle: string;
  category: string;
  department: string;
  priority: PriorityLevel;
  location: string;
  description: string;
  attachments: string[];
  submittedComplaintId?: string;

  // ---- Real AI pipeline state (populated by the backend, not simulated) ----
  transcript?: string;
  language?: string;
  keywords?: string[];
  tempComplaintId?: string;
  duplicateStatus?: 'NEW' | 'RELATED' | 'DUPLICATE';
  duplicateOf?: string | null;
  similarity?: number;
  matchedComplaint?: MatchedComplaintInfo;
  processingStage?: 'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'duplicate-check' | 'submitting' | 'error';
  processingError?: string | null;
  submittedTicketId?: string;
  submittedSlaHours?: number;
  submittedSlaDeadline?: string | null;
}

const EMPTY_DRAFT: ComplaintDraft = {
  step: 'method-selection',
  mode: 'voice',
  recordingTime: 0,
  isRecording: false,
  isPaused: false,
  issueTitle: '',
  category: '',
  department: '',
  priority: 'Medium',
  location: '',
  description: '',
  attachments: [],
  processingStage: 'idle',
  processingError: null,
};

interface AppContextType {
  currentRoute: PageRoute;
  portalType: PortalType;
  selectedComplaintId: string | null;
  selectedCallId: string;
  selectedExceptionId: string | null;
  user: UserProfile | null;
  complaints: Complaint[];
  callCenterComplaints: Complaint[];
  complaintsLoading: boolean;
  complaintsError: string | null;
  backendAvailable: boolean;
  liveCalls: CallCenterCall[];
  exceptions: CallCenterException[];
  notifications: NotificationItem[];
  callCenterNotifications: NotificationItem[];
  adminNotifications: NotificationItem[];
  officerNotifications: NotificationItem[];
  unreadNotificationCount: number;
  complaintDraft: ComplaintDraft;
  isChatOpen: boolean;
  isChatMinimized: boolean;
  chatMessages: ChatMessage[];
  isSidebarCollapsed: boolean;
  redirectTarget: { route: PageRoute; complaintId?: string } | null;

  // Navigation & Actions
  navigate: (route: PageRoute, complaintId?: string) => void;
  goBack: () => void;
  setPortalType: (portal: PortalType) => void;
  setSelectedComplaintId: (id: string | null) => void;
  setSelectedCallId: (id: string) => void;
  setSelectedExceptionId: (id: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  setRedirectTarget: (target: { route: PageRoute; complaintId?: string } | null) => void;
  toggleSidebarCollapse: () => void;
  login: (credentials?: { emailOrPhone: string; password?: string; portalPreference?: PortalType }) => void;
  logout: () => void;
  switchPortal: (targetPortal: PortalType) => void;

  // Real backend data actions
  refreshComplaints: () => Promise<void>;
  fetchComplaintDetails: (complaintId: string) => Promise<void>;
  updateComplaintStatus: (complaintId: string, newUiStatus: string) => Promise<{ ok: true } | { ok: false; error: string }>;

  // Complaint Flow Actions (real AI pipeline, no simulation)
  setComplaintDraft: React.Dispatch<React.SetStateAction<ComplaintDraft>>;
  resetComplaintDraft: () => void;
  startVoiceProcessing: (audioBlob: Blob) => Promise<void>;
  startTextProcessing: (overrideText?: string) => Promise<void>;
  confirmSubmitComplaint: (overrides?: Partial<ComplaintDraft>) => Promise<void>;
  addComplaintFeedback: (complaintId: string, rating: number, comment: string) => void;

  // Notification Actions
  markAllNotificationsRead: () => void;
  markNotificationAsRead: (id: string) => void;

  // Chatbot Actions
  setIsChatOpen: (open: boolean) => void;
  setIsChatMinimized: (minimized: boolean) => void;
  toggleChat: () => void;
  sendChatMessage: (text: string) => void;
  handleChatAction: (actionText: string) => void;
  endLiveCall: (callId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialRoute = (): PageRoute => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace(/^#/, '').split('?')[0];
      if ([
        'landing', 'login', 'register', 'dashboard', 'raise-complaint',
        'my-complaints', 'complaint-details', 'notifications', 'profile',
        'services', 'about', 'help', 'live-calls', 'complaints', 'exceptions'
      ].includes(hash)) {
        return hash as PageRoute;
      }
    }
    return 'landing';
  };

  const initialRoute = getInitialRoute();
  const [currentRoute, setCurrentRoute] = useState<PageRoute>(initialRoute);
  const [portalType, setPortalType] = useState<PortalType>('citizen');
  const [redirectTarget, setRedirectTarget] = useState<{ route: PageRoute; complaintId?: string } | null>(null);
  const [historyStack, setHistoryStack] = useState<{ route: PageRoute; complaintId?: string }[]>([
    { route: initialRoute }
  ]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string>('call-1');
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>('exc-1');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // ---- Real backend complaint data (single source of truth for the whole app) ----
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState<boolean>(false);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);

  const [liveCalls, setLiveCalls] = useState<CallCenterCall[]>(CALL_CENTER_LIVE_CALLS);
  const [exceptions, setExceptions] = useState<CallCenterException[]>(CALL_CENTER_EXCEPTIONS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [callCenterNotifications, setCallCenterNotifications] = useState<NotificationItem[]>(CALL_CENTER_NOTIFICATIONS);
  const [adminNotifications, setAdminNotifications] = useState<NotificationItem[]>(ADMIN_NOTIFICATIONS_LIST);
  const [officerNotifications, setOfficerNotifications] = useState<NotificationItem[]>(OFFICER_NOTIFICATIONS_LIST);

  const [complaintDraft, setComplaintDraft] = useState<ComplaintDraft>(EMPTY_DRAFT);

  // Chatbot state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: "Hello! 👋\nI'm your GovPortal Assistant. How can I help you today?",
      timestamp: 'Today, 10:00 AM',
      actionChips: [
        'Track my complaint',
        'Raise a new complaint',
        'How does the process work?',
        'Other queries',
      ]
    }
  ]);

  // --------------------------------------------------------------------
  // Real backend data loading — GET /complaints is the single source of
  // truth for every portal (citizen / call-center / officer / admin all
  // read from the same `complaints` array; the backend has no per-user
  // ownership model, so there is no server-side notion of "my" complaints).
  // --------------------------------------------------------------------
  const refreshComplaints = useCallback(async () => {
    setComplaintsLoading(true);
    setComplaintsError(null);
    try {
      const backendComplaints = await api.getComplaints();
      setComplaints(backendComplaints.map(mapBackendComplaintToUI));
      setBackendAvailable(true);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : 'Unable to connect to the backend. Please make sure the API server is running.';
      setComplaintsError(msg);
      setBackendAvailable(false);
      setComplaints([]);
    } finally {
      setComplaintsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshComplaints();
  }, [refreshComplaints]);

  const fetchComplaintDetails = useCallback(async (complaintId: string) => {
    try {
      const [full, history] = await Promise.all([
        api.getComplaint(complaintId),
        api.getComplaintHistory(complaintId).catch(() => []),
      ]);
      const mapped = mapBackendComplaintToUI(full);
      if (history.length > 0) {
        mapped.timeline = mapStatusHistoryToTimeline(history);
      }
      setComplaints((prev) => {
        const exists = prev.some((c) => c.id === complaintId);
        return exists
          ? prev.map((c) => (c.id === complaintId ? mapped : c))
          : [mapped, ...prev];
      });
      setBackendAvailable(true);
    } catch (e) {
      // Detail fetch failing shouldn't crash the page — the list-level data
      // (if already loaded) remains visible.
      setBackendAvailable(e instanceof ApiError && e.status !== undefined ? true : false);
    }
  }, []);

  const updateComplaintStatus = useCallback(
    async (complaintId: string, newUiStatus: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const backendStatus = mapUIStatusToBackend(newUiStatus);
        const updated = await api.updateComplaintStatus(complaintId, backendStatus);
        const mapped = mapBackendComplaintToUI(updated);
        setComplaints((prev) => prev.map((c) => (c.id === complaintId ? mapped : c)));
        return { ok: true };
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Unable to update complaint status. Please try again.';
        return { ok: false, error: msg };
      }
    },
    []
  );

  const isPublicRoute = (route: PageRoute) =>
    ['landing', 'login', 'register', 'services', 'about', 'help'].includes(route);

  // Sync with browser history and set initial state
  useEffect(() => {
    if (!window.history.state || !window.history.state.route) {
      window.history.replaceState({ route: initialRoute }, '', window.location.hash || '#landing');
    }

    const handlePopState = (event: PopStateEvent) => {
      const targetRoute = (event.state && event.state.route)
        ? (event.state.route as PageRoute)
        : ((window.location.hash.replace(/^#/, '').split('?')[0] as PageRoute) || 'landing');

      const isPublic = isPublicRoute(targetRoute);

      // If logged out and trying to access a protected portal page via back button
      if (!user && !isPublic) {
        window.history.replaceState({ route: 'landing' }, '', '#landing');
        setCurrentRoute('landing');
        return;
      }

      if (event.state && event.state.route) {
        setCurrentRoute(event.state.route);
        if (event.state.complaintId) {
          setSelectedComplaintId(event.state.complaintId);
        }
      } else {
        setCurrentRoute(targetRoute || 'landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  const navigate = (route: PageRoute, complaintId?: string) => {
    // If not logged in and attempting to navigate to a protected portal route
    if (!user && !isPublicRoute(route)) {
      setRedirectTarget({ route, complaintId });
      setCurrentRoute('login');
      setHistoryStack((prev) => [...prev, { route: 'login' }]);
      window.history.pushState({ route: 'login' }, '', '#login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (complaintId) {
      setSelectedComplaintId(complaintId);
    }
    setCurrentRoute(route);
    setHistoryStack((prev) => [...prev, { route, complaintId }]);
    window.history.pushState({ route, complaintId }, '', `#${route}${complaintId ? `?id=${complaintId}` : ''}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (historyStack.length > 1) {
      const nextStack = [...historyStack];
      nextStack.pop(); // current
      const prev = nextStack[nextStack.length - 1];
      setHistoryStack(nextStack);
      if (!user && !isPublicRoute(prev.route)) {
        setCurrentRoute('landing');
        window.history.replaceState({ route: 'landing' }, '', '#landing');
      } else {
        setCurrentRoute(prev.route);
        if (prev.complaintId) {
          setSelectedComplaintId(prev.complaintId);
        }
        window.history.back();
      }
    } else {
      navigate('landing');
    }
  };

  // ------------------------------------------------------------------
  // DEMO AUTHENTICATION. The backend does not expose a verified auth API
  // (no login/JWT/session endpoint). Portal routing here is a client-side
  // demo convenience keyed off the text typed into the login form — it is
  // NOT tied to any real backend user/session, and no request the app
  // makes carries an identity. See PHASE 17 in the integration brief.
  // ------------------------------------------------------------------
  const login = (credentials?: { emailOrPhone: string; password?: string; portalPreference?: PortalType }) => {
    const rawInput = (credentials?.emailOrPhone || '').trim().toLowerCase();
    const cleanDigits = rawInput.replace(/\D/g, '');

    const isOfficerCandidate =
      credentials?.portalPreference === 'officer' ||
      rawInput.includes('officer') ||
      rawInput.includes('pwd') ||
      rawInput.includes('priya.sharma@pwd.gov.in') ||
      rawInput.includes('pwd.gov.in') ||
      rawInput.includes('pwd-eng') ||
      rawInput.includes('engineer');

    const isAdminCandidate =
      credentials?.portalPreference === 'admin' ||
      rawInput.includes('admin') ||
      rawInput.includes('raj') ||
      rawInput.includes('raj.kumar') ||
      rawInput.includes('administrator') ||
      rawInput === 'raj.kumar@gov.in' ||
      cleanDigits === '9811122334';

    const isCallCenterCandidate =
      credentials?.portalPreference === 'call-center' ||
      rawInput.includes('callcenter') ||
      rawInput.includes('call-center') ||
      rawInput.includes('executive') ||
      rawInput.includes('agent') ||
      rawInput.includes('intake') ||
      rawInput === 'callcenter@gov.in';

    let targetPortal: PortalType = 'citizen';
    let targetUser: UserProfile = INITIAL_USER;

    if (isOfficerCandidate) {
      targetPortal = 'officer';
      targetUser = OFFICER_USER;
    } else if (isAdminCandidate) {
      targetPortal = 'admin';
      targetUser = ADMIN_USER;
    } else if (isCallCenterCandidate) {
      targetPortal = 'call-center';
      targetUser = CALL_CENTER_USER;
    } else {
      targetPortal = 'citizen';
      targetUser = INITIAL_USER;
    }

    setPortalType(targetPortal);
    setUser(targetUser);

    // Return to the exact page or action the user originally clicked, or dashboard if none
    const dest = redirectTarget;
    setRedirectTarget(null);

    if (dest && dest.route && !['landing', 'login', 'register'].includes(dest.route)) {
      if (dest.complaintId) {
        setSelectedComplaintId(dest.complaintId);
      }
      setCurrentRoute(dest.route);
      setHistoryStack([{ route: 'landing' }, { route: dest.route, complaintId: dest.complaintId }]);
      window.history.replaceState(
        { route: dest.route, complaintId: dest.complaintId },
        '',
        `#${dest.route}${dest.complaintId ? `?id=${dest.complaintId}` : ''}`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCurrentRoute('dashboard');
      setHistoryStack([{ route: 'landing' }, { route: 'dashboard' }]);
      window.history.replaceState({ route: 'dashboard' }, '', '#dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const switchPortal = (targetPortal: PortalType) => {
    setPortalType(targetPortal);
    if (targetPortal === 'officer') {
      setUser(OFFICER_USER);
    } else if (targetPortal === 'admin') {
      setUser(ADMIN_USER);
    } else if (targetPortal === 'call-center') {
      setUser(CALL_CENTER_USER);
    } else {
      setUser(INITIAL_USER);
    }
    navigate('dashboard');
  };

  const logout = () => {
    setUser(null);
    setRedirectTarget(null);
    setHistoryStack([{ route: 'landing' }]);
    setCurrentRoute('landing');
    window.history.replaceState({ route: 'landing' }, '', '#landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const resetComplaintDraft = () => {
    setComplaintDraft({ ...EMPTY_DRAFT, attachments: [] });
  };

  // --------------------------------------------------------------------
  // REAL AI pipeline orchestration. These call the backend's granular
  // endpoints (transcribe -> analyze -> duplicate-check) so the citizen can
  // review/edit the AI-extracted fields before the complaint is actually
  // created via POST /complaints. No AI/duplicate logic runs in the browser.
  // --------------------------------------------------------------------

  const runAnalysisAndDuplicateCheck = async (transcript: string) => {
    setComplaintDraft((prev) => ({ ...prev, processingStage: 'analyzing', processingError: null }));
    const analysis = await api.analyzeTranscript(transcript);

    setComplaintDraft((prev) => ({ ...prev, processingStage: 'duplicate-check' }));
    // Match the backend's own temp-id convention (see run_audio_pipeline in
    // routes/complaints.py) so IDs look consistent regardless of which path
    // created the complaint.
    const tempId = `CMP-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
    const dup = await api.checkDuplicate({
      complaint_id: tempId,
      transcript,
      category: analysis.category,
      department: analysis.department,
      priority: analysis.priority,
      summary: analysis.summary,
      location: analysis.location,
    });

    setComplaintDraft((prev) => ({
      ...prev,
      step: 'review',
      processingStage: 'idle',
      transcript,
      issueTitle: analysis.summary,
      category: analysis.category,
      department: analysis.department,
      priority:
        analysis.priority === 'CRITICAL' ? 'Critical' :
        analysis.priority === 'HIGH' ? 'High' :
        analysis.priority === 'LOW' ? 'Low' : 'Medium',
      location: analysis.location || prev.location || '',
      description: transcript,
      keywords: analysis.keywords,
      tempComplaintId: tempId,
      duplicateStatus: dup.status,
      duplicateOf: dup.duplicate_of,
      similarity: dup.similarity,
      matchedComplaint: dup.matched_complaint,
    }));
  };

  const startVoiceProcessing = async (audioBlob: Blob) => {
    setComplaintDraft((prev) => ({
      ...prev,
      step: 'ai-processing',
      mode: 'voice',
      audioBlob,
      processingStage: 'uploading',
      processingError: null,
    }));
    try {
      setComplaintDraft((prev) => ({ ...prev, processingStage: 'transcribing' }));
      const transcribed = await api.transcribeAudio(audioBlob, 'recording.webm');
      const transcript = (transcribed.transcript || '').trim() || 'No speech detected in recording.';
      setComplaintDraft((prev) => ({ ...prev, language: transcribed.language }));
      await runAnalysisAndDuplicateCheck(transcript);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Unable to process the audio. Please try again.';
      setComplaintDraft((prev) => ({ ...prev, processingStage: 'error', processingError: msg }));
    }
  };

  const startTextProcessing = async (overrideText?: string) => {
    const transcript = (overrideText ?? complaintDraft.description).trim();
    setComplaintDraft((prev) => ({
      ...prev,
      step: 'ai-processing',
      mode: 'text',
      description: transcript,
      processingStage: 'analyzing',
      processingError: null,
    }));
    try {
      await runAnalysisAndDuplicateCheck(transcript);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Unable to analyze the complaint. Please try again.';
      setComplaintDraft((prev) => ({ ...prev, processingStage: 'error', processingError: msg }));
    }
  };

  const backendPriorityFromUI = (p: PriorityLevel): string => p.toUpperCase();

  const confirmSubmitComplaint = async (overrides?: Partial<ComplaintDraft>) => {
    const draft = { ...complaintDraft, ...overrides };
    setComplaintDraft((prev) => ({ ...prev, ...overrides, processingStage: 'submitting', processingError: null }));
    try {
      const created = await api.createComplaint({
        transcript: draft.transcript || draft.description,
        summary: draft.issueTitle || draft.description.slice(0, 120),
        language: draft.language || 'en',
        category: draft.category,
        department: draft.department,
        priority: backendPriorityFromUI(draft.priority),
        location: draft.location || null,
        keywords: draft.keywords,
        duplicate_status: draft.duplicateStatus || 'NEW',
        duplicate_of: draft.duplicateOf || null,
        similarity_score: draft.similarity ?? null,
        complaint_id: draft.tempComplaintId,
      });

      setComplaintDraft((prev) => ({
        ...prev,
        step: 'success',
        processingStage: 'idle',
        submittedComplaintId: created.complaint_id,
        submittedTicketId: created.ticket?.ticket_id,
        submittedSlaHours: created.sla_duration_hours,
        submittedSlaDeadline: created.sla_deadline,
      }));

      const newNotification: NotificationItem = {
        id: `n-${Date.now()}`,
        complaintId: created.complaint_id,
        type: 'assigned',
        title: 'Complaint Registered',
        message: `Your complaint ${created.complaint_id} has been submitted and routed to ${created.department}.`,
        timestamp: 'Just now',
        isRead: false,
      };
      setNotifications((prev) => [newNotification, ...prev]);

      await refreshComplaints();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Unable to submit the complaint. Please try again.';
      setComplaintDraft((prev) => ({ ...prev, processingStage: 'error', processingError: msg }));
    }
  };

  const addComplaintFeedback = (complaintId: string, rating: number, comment: string) => {
    // NOTE: the backend has no feedback endpoint — this is stored locally
    // only, for demo purposes, and is not persisted server-side.
    const now = new Date();
    const formatted = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    setComplaints(prev => prev.map(c => {
      if (c.id === complaintId) {
        return {
          ...c,
          feedback: {
            rating,
            comment,
            submittedAt: formatted,
          }
        };
      }
      return c;
    }));
  };

  const endLiveCall = (callId: string) => {
    setLiveCalls(prev => prev.map(c => c.id === callId ? { ...c, status: 'Completed' } : c));
  };

  const unreadNotificationCount = portalType === 'officer'
    ? officerNotifications.filter(n => !n.isRead).length
    : portalType === 'admin'
    ? adminNotifications.filter(n => !n.isRead).length
    : portalType === 'call-center'
    ? callCenterNotifications.filter(n => !n.isRead).length
    : notifications.filter(n => !n.isRead).length;

  const markAllNotificationsRead = () => {
    if (portalType === 'officer') {
      setOfficerNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } else if (portalType === 'admin') {
      setAdminNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } else if (portalType === 'call-center') {
      setCallCenterNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const markNotificationAsRead = (id: string) => {
    if (portalType === 'officer') {
      setOfficerNotifications(prev => prev.map(n => n.id === id ? ({ ...n, isRead: true }) : n));
    } else if (portalType === 'admin') {
      setAdminNotifications(prev => prev.map(n => n.id === id ? ({ ...n, isRead: true }) : n));
    } else if (portalType === 'call-center') {
      setCallCenterNotifications(prev => prev.map(n => n.id === id ? ({ ...n, isRead: true }) : n));
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? ({ ...n, isRead: true }) : n));
    }
  };

  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
    setIsChatMinimized(false);
  };

  const sendChatMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      handleBotResponse(text.trim());
    }, 600);
  };

  const handleChatAction = (actionText: string) => {
    sendChatMessage(actionText);
  };

  const handleBotResponse = (userText: string) => {
    const lower = userText.toLowerCase();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (lower.includes('track') || lower.includes('status') || complaints.some(c => lower.includes(c.id.toLowerCase()))) {
      const targetComplaint = complaints.find(c => lower.includes(c.id.toLowerCase())) || complaints[0];
      if (!targetComplaint) {
        const botMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: 'bot',
          text: "You don't have any complaints yet. Would you like to raise one?",
          timestamp: timeStr,
          actionChips: ['Raise a new complaint'],
        };
        setChatMessages(prev => [...prev, botMsg]);
        return;
      }
      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: `Here is the current status of complaint ${targetComplaint.id}`,
        timestamp: timeStr,
        complaintCard: {
          id: targetComplaint.id,
          title: targetComplaint.title,
          status: targetComplaint.status,
          department: targetComplaint.department,
          updatedOn: targetComplaint.updatedOn,
        }
      };
      setChatMessages(prev => [...prev, botMsg]);
    } else if (lower.includes('raise') || lower.includes('new complaint')) {
      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: "You can raise a complaint using AI Voice Recording or Text Input. Would you like to launch the complaint submission form?",
        timestamp: timeStr,
        actionChips: ['Launch Raise Complaint', 'How does Voice AI work?']
      };
      setChatMessages(prev => [...prev, botMsg]);
    } else if (lower.includes('launch raise complaint')) {
      setIsChatOpen(false);
      resetComplaintDraft();
      navigate('raise-complaint');
    } else if (lower.includes('how does the process work') || lower.includes('process')) {
      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: "The GovPortal AI pipeline has 5 real stages:\n1. 🎙️ Speech-to-text (faster-whisper, multilingual)\n2. 🧠 LLM analysis (category, department, priority, summary)\n3. 🔎 Semantic duplicate detection (ChromaDB)\n4. 🏢 Department routing & ticket creation\n5. ⏱️ SLA deadline & escalation tracking",
        timestamp: timeStr,
        actionChips: ['Track my complaint', 'Raise a new complaint']
      };
      setChatMessages(prev => [...prev, botMsg]);
    } else {
      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: "I can help you raise complaints, track ongoing requests, check department contacts, or clarify civic procedures. What would you like to do?",
        timestamp: timeStr,
        actionChips: ['Track my complaint', 'Raise a new complaint', 'Contact Helpdesk']
      };
      setChatMessages(prev => [...prev, botMsg]);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        portalType,
        selectedComplaintId,
        selectedCallId,
        selectedExceptionId,
        user,
        complaints,
        callCenterComplaints: complaints,
        complaintsLoading,
        complaintsError,
        backendAvailable,
        liveCalls,
        exceptions,
        notifications,
        callCenterNotifications,
        adminNotifications,
        officerNotifications,
        unreadNotificationCount,
        complaintDraft,
        isChatOpen,
        isChatMinimized,
        chatMessages,
        isSidebarCollapsed,
        navigate,
        goBack,
        setPortalType,
        setSelectedComplaintId,
        setSelectedCallId,
        setSelectedExceptionId,
        setUser,
        redirectTarget,
        setRedirectTarget,
        toggleSidebarCollapse,
        login,
        logout,
        switchPortal,
        refreshComplaints,
        fetchComplaintDetails,
        updateComplaintStatus,
        setComplaintDraft,
        resetComplaintDraft,
        startVoiceProcessing,
        startTextProcessing,
        confirmSubmitComplaint,
        addComplaintFeedback,
        markAllNotificationsRead,
        markNotificationAsRead,
        setIsChatOpen,
        setIsChatMinimized,
        toggleChat,
        sendChatMessage,
        handleChatAction,
        endLiveCall,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
