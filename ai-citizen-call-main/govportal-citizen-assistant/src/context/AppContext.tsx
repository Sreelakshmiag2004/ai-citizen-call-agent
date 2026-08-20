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
  formatBackendDate,
  mapBackendComplaintToUI,
  mapBackendNotificationToUI,
  mapBackendUserToProfile,
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

  // ---- Optional device GPS, captured only if the citizen explicitly
  // clicks "Use my current location" in ReviewComplaintStep. Distinct from
  // `location` above (the AI-extracted/reported place name), which this
  // never overwrites. Left undefined for Twilio complaints (no browser
  // flow) and whenever the citizen doesn't opt in. ----
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracyM?: number;

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
  isChatLoading: boolean;
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
  // Real backend authentication (see backend/app/routes/auth.py). Resolves
  // to an error message on failure instead of throwing, so callers can
  // display it inline without a try/catch.
  login: (credentials: { email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (
    payload: { fullName: string; email: string; password: string; phone?: string }
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  authLoading: boolean;
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
  addComplaintFeedback: (
    complaintId: string,
    rating: number,
    comment: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;

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

  // Preserves the `?id=` query portion of a deep-link hash (e.g.
  // `#complaint-details?id=CMP-1018`) that getInitialRoute() above
  // deliberately strips before matching the route name, so a full browser
  // refresh on the Track Complaint page still knows which complaint to load.
  const getInitialComplaintId = (): string | null => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const queryPart = window.location.hash.split('?')[1];
      if (queryPart) {
        const id = new URLSearchParams(queryPart).get('id');
        if (id) return id;
      }
    }
    return null;
  };

  const initialRoute = getInitialRoute();
  const [currentRoute, setCurrentRoute] = useState<PageRoute>(initialRoute);
  const [portalType, setPortalType] = useState<PortalType>('citizen');
  const [redirectTarget, setRedirectTarget] = useState<{ route: PageRoute; complaintId?: string } | null>(null);
  const [historyStack, setHistoryStack] = useState<{ route: PageRoute; complaintId?: string }[]>([
    { route: initialRoute }
  ]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(getInitialComplaintId());
  const [selectedCallId, setSelectedCallId] = useState<string>('call-1');
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>('exc-1');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

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
  // True while a /chatbot/message request is in flight -- guards against
  // duplicate submissions (both here and via the input/send-button disabled
  // state in AssistantChatbot.tsx) and drives the "assistant is typing"
  // indicator.
  const [isChatLoading, setIsChatLoading] = useState(false);

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

  // GET /complaints now requires authentication (see MASTER_TODO.md's "No
  // authentication/authorization anywhere" item) -- only fetch once a user
  // is actually logged in (covers initial login, registration, and session
  // rehydration from a stored token alike, since all three set `user`).
  useEffect(() => {
    if (user) {
      refreshComplaints();
    }
  }, [user, refreshComplaints]);

  // --------------------------------------------------------------------
  // Real backend notifications (see MASTER_TODO.md's "SLA breach/escalation
  // has no actual delivery mechanism" item) -- currently populated only by
  // SLA at-risk/breach escalation events, delivered to whichever portal(s)
  // the backend actually addressed them to (the owning citizen, and
  // officer/admin per escalation level; see notification_service.py).
  // Call-center notifications have no backend source yet and keep using
  // their existing mock data, unchanged.
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const backendNotifs = await api.getNotifications();
      const mapped = backendNotifs.map(mapBackendNotificationToUI);
      if (portalType === 'officer') {
        setOfficerNotifications(mapped);
      } else if (portalType === 'admin') {
        setAdminNotifications(mapped);
      } else if (portalType === 'citizen') {
        setNotifications(mapped);
      }
      // call-center: intentionally left on mock data (see comment above).
    } catch {
      // Notifications failing to load shouldn't break the rest of the app;
      // the portal simply keeps whatever it last had (mock data on first
      // load).
    }
  }, [user, portalType]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

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
  // REAL AUTHENTICATION (see backend/app/routes/auth.py). The JWT the
  // backend issues is the only thing that determines what a logged-in
  // user is allowed to do -- every protected endpoint validates it and
  // re-checks the role from the database on every request (see
  // app/auth/dependencies.py). Nothing here on the frontend grants
  // access; it only decides what to *render*, exactly as the task
  // requires ("never rely on the React UI to enforce roles").
  // ------------------------------------------------------------------
  const _enterAfterAuth = (profile: UserProfile) => {
    setPortalType((profile.portalType as PortalType) || 'citizen');
    setUser(profile);

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

  const login = async (credentials: { email: string; password: string }): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const res = await api.login({ email: credentials.email, password: credentials.password });
      api.setAuthToken(res.access_token);
      _enterAfterAuth(mapBackendUserToProfile(res.user));
      return { ok: true };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Unable to reach the server. Please try again.';
      return { ok: false, error: msg };
    }
  };

  const register = async (
    payload: { fullName: string; email: string; password: string; phone?: string }
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const res = await api.register({
        email: payload.email,
        password: payload.password,
        full_name: payload.fullName,
        phone: payload.phone,
      });
      api.setAuthToken(res.access_token);
      _enterAfterAuth(mapBackendUserToProfile(res.user));
      return { ok: true };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Unable to reach the server. Please try again.';
      return { ok: false, error: msg };
    }
  };

  // Rehydrate the session on page load/refresh from a stored token, if any
  // -- always re-verified against the backend rather than trusted as-is.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = api.getAuthToken();
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const me = await api.getMe();
        if (!cancelled) {
          const profile = mapBackendUserToProfile(me);
          setUser(profile);
          setPortalType((profile.portalType as PortalType) || 'citizen');
        }
      } catch {
        // Token missing/expired/invalid -- clear it rather than leaving the
        // app in a state where API calls will keep 401ing silently.
        api.clearAuthToken();
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Best-effort -- JWTs are stateless (see backend/app/routes/auth.py's
    // logout endpoint), so this has nothing to wait on; the token is
    // discarded client-side regardless of whether the call succeeds.
    api.logoutBackend().catch(() => {});
    api.clearAuthToken();
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
      // No filename override -- api.transcribeAudio derives the correct
      // extension from audioBlob.type itself (see filenameForAudioBlob),
      // since VoiceRecordingStep.tsx's MediaRecorder may have actually
      // produced audio/mp4 (Safari) rather than audio/webm (Chrome/Edge).
      const transcribed = await api.transcribeAudio(audioBlob);
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
        latitude: draft.gpsLatitude ?? null,
        longitude: draft.gpsLongitude ?? null,
        location_accuracy_m: draft.gpsAccuracyM ?? null,
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

  const addComplaintFeedback = async (
    complaintId: string,
    rating: number,
    comment: string
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const saved = await api.submitComplaintFeedback(complaintId, { rating, comment: comment || undefined });
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? {
                ...c,
                feedback: {
                  rating: saved.rating,
                  comment: saved.comment || '',
                  submittedAt: formatBackendDate(saved.updated_at),
                },
              }
            : c
        )
      );
      return { ok: true };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Unable to submit feedback. Please try again.';
      return { ok: false, error: msg };
    }
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
      api.markAllNotificationsRead().catch(() => {});
    } else if (portalType === 'admin') {
      setAdminNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      api.markAllNotificationsRead().catch(() => {});
    } else if (portalType === 'call-center') {
      // No backend source for call-center notifications yet -- local only.
      setCallCenterNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      api.markAllNotificationsRead().catch(() => {});
    }
  };

  const markNotificationAsRead = (id: string) => {
    if (portalType === 'officer') {
      setOfficerNotifications(prev => prev.map(n => n.id === id ? ({ ...n, isRead: true }) : n));
      api.markNotificationRead(Number(id)).catch(() => {});
    } else if (portalType === 'admin') {
      setAdminNotifications(prev => prev.map(n => n.id === id ? ({ ...n, isRead: true }) : n));
      api.markNotificationRead(Number(id)).catch(() => {});
    } else if (portalType === 'call-center') {
      // No backend source for call-center notifications yet -- local only.
      setCallCenterNotifications(prev => prev.map(n => n.id === id ? ({ ...n, isRead: true }) : n));
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? ({ ...n, isRead: true }) : n));
      api.markNotificationRead(Number(id)).catch(() => {});
    }
  };

  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
    setIsChatMinimized(false);
  };

  // Maps a failed api.sendChatbotMessage() call to a short, user-friendly
  // message -- never the raw error. In particular, a 422 (validation)
  // response's `detail` is a Pydantic array of field-error objects, not a
  // plain string; showing that directly would look like an internal
  // error dump, so it gets its own friendly copy rather than falling
  // through to `e.message`.
  const chatbotErrorMessage = (e: unknown): string => {
    if (e instanceof ApiError) {
      if (e.status === 429) {
        return e.message || "You're sending messages a bit too quickly. Please wait a moment and try again.";
      }
      if (e.status === 422) {
        return 'Please ask a shorter question (under 500 characters).';
      }
      if (e.status === 400) {
        return e.message || 'Please enter a question first.';
      }
      if (e.status === undefined) {
        return 'Unable to reach the GovPortal Assistant right now. Please check your connection and try again.';
      }
    }
    return "Sorry, I couldn't process that just now. Please try again in a moment.";
  };

  // REAL backend-answered chatbot (see backend/app/routes/chatbot.py) --
  // public/unauthenticated RAG FAQ assistant. Every message, whether typed
  // or from an action chip, goes through the same real call; there is no
  // client-side keyword logic or fabricated complaint lookup left. If the
  // citizen asks to track a specific complaint, this deliberately does NOT
  // reach into `complaints` state -- the backend's own grounded response
  // (it has no complaint/user data access at all) is shown as-is instead.
  const sendChatMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isChatLoading) return; // also guarded by the disabled input/button in AssistantChatbot.tsx

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    api.sendChatbotMessage(trimmed)
      .then((result) => {
        const botMsg: ChatMessage = {
          id: `msg-${Date.now()}-bot`,
          sender: 'bot',
          text: result.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: result.sources,
        };
        setChatMessages(prev => [...prev, botMsg]);
      })
      .catch((e: unknown) => {
        const botMsg: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          sender: 'bot',
          text: chatbotErrorMessage(e),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages(prev => [...prev, botMsg]);
      })
      .finally(() => {
        setIsChatLoading(false);
      });
  };

  const handleChatAction = (actionText: string) => {
    sendChatMessage(actionText);
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
        isChatLoading,
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
        register,
        authLoading,
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
