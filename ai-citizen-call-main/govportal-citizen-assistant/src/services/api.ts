// ============================================================================
// API SERVICE LAYER — single point of contact with the real FastAPI backend
// (Citizen Call Intelligence / GovPortal). No mock data, no fetch() calls
// anywhere else in the app should talk to the backend directly — everything
// goes through the typed functions below.
// ============================================================================

import {
  AnalyticsSummary,
  AnalyzeResult,
  AuthTokenResponse,
  BackendComplaint,
  BackendFeedback,
  BackendNotification,
  BackendSLA,
  BackendStatusHistoryItem,
  BackendUser,
  CategoryBreakdownItem,
  DepartmentBreakdownItem,
  DuplicateCheckResult,
  DuplicateStatsResponse,
  LocationBreakdownItem,
  PriorityBreakdownItem,
  ProcessAndCreateTicketResult,
  SLAAtRiskItem,
  SLABreachedItem,
  SLAStatsResponse,
  SLASummary,
  StatusBreakdown,
  TopIssueItem,
  TranscribeResult,
} from '../types';

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8001';

// The citizen-facing Twilio phone number that answers via the backend's
// /twilio/voice webhook (see backend/app/routes/twilio.py). A phone number
// is not a secret -- it's meant to be dialed -- so it's safe to read from a
// Vite env var and ship in the frontend bundle. This is NOT the Twilio
// Account SID or Auth Token, neither of which is ever read or exposed here.
// Falls back to the pre-existing placeholder if unset, so an unconfigured
// checkout doesn't render a broken tel: link.
export const TWILIO_PHONE_NUMBER: string =
  (import.meta as any).env?.VITE_TWILIO_PHONE_NUMBER || '0000000000';

/** Thrown by every api.ts function on a non-2xx response or network failure. */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ----------------------------------------------------------------------------
// Auth token storage. A bearer token in localStorage (not an HttpOnly
// cookie) was chosen deliberately: the frontend (port 3000) and backend
// (port 8001) are different origins in local dev, both plain HTTP with no
// shared parent domain, and modern browsers require `SameSite=None;
// Secure` (HTTPS-only) for a cookie to be sent on a cross-origin fetch --
// which this dev/demo topology can't satisfy. The token itself is never
// exposed to the backend except via the Authorization header below, and
// it is never logged or sent anywhere else.
// ----------------------------------------------------------------------------
const TOKEN_STORAGE_KEY = 'govportal_access_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* storage unavailable (e.g. private browsing) -- session just won't persist across reloads */
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });
  } catch (e) {
    throw new ApiError(
      'Unable to connect to the backend. Please make sure the API server is running.'
    );
  }

  if (!res.ok) {
    let detail = `Request failed with status ${res.status}.`;
    try {
      const body = await res.json();
      if (body?.detail) {
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      /* response wasn't JSON — keep the generic message */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ----------------------------------------------------------------------------
// Authentication
// ----------------------------------------------------------------------------

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Public self-registration -- always creates a citizen account. */
export function register(payload: RegisterPayload): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function login(payload: LoginPayload): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Re-fetches the authenticated identity from the backend using the stored
 * token -- used on app load to rehydrate the session (or discover the
 * stored token is stale/expired) instead of trusting anything client-side. */
export function getMe(): Promise<BackendUser> {
  return request<BackendUser>('/auth/me');
}

/** Stateless JWTs carry no server-side session to invalidate; this call
 * exists mainly so a real 401 is surfaced if there's no valid token. The
 * actual "forget the session" step is clearAuthToken() client-side. */
export function logoutBackend(): Promise<{ message: string }> {
  return request('/auth/logout', { method: 'POST' });
}

// ----------------------------------------------------------------------------
// Module 1 — Transcription
// ----------------------------------------------------------------------------

export function transcribeAudio(file: File | Blob, filename = 'recording.webm'): Promise<TranscribeResult> {
  const form = new FormData();
  form.append('file', file, filename);
  return request<TranscribeResult>('/transcribe', { method: 'POST', body: form });
}

// ----------------------------------------------------------------------------
// Module 2 — LLM Analysis
// ----------------------------------------------------------------------------

export function analyzeTranscript(transcript: string): Promise<AnalyzeResult> {
  return request<AnalyzeResult>('/analyze', {
    method: 'POST',
    body: JSON.stringify({ transcript }),
  });
}

// ----------------------------------------------------------------------------
// Module 3 — Semantic Duplicate Detection (ChromaDB)
// ----------------------------------------------------------------------------

export interface DuplicateCheckPayload {
  complaint_id?: string;
  transcript: string;
  category?: string;
  department?: string;
  priority?: string;
  summary?: string;
  location?: string | null;
}

export function checkDuplicate(payload: DuplicateCheckPayload): Promise<DuplicateCheckResult> {
  return request<DuplicateCheckResult>('/duplicate-check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ----------------------------------------------------------------------------
// Module 4 — Complaint + Ticket management
// ----------------------------------------------------------------------------

export interface CreateComplaintPayload {
  transcript: string;
  summary: string;
  language?: string;
  category?: string;
  department?: string;
  priority?: string;
  location?: string | null;
  keywords?: string[];
  duplicate_status?: string;
  duplicate_of?: string | null;
  similarity_score?: number | null;
  complaint_id?: string;
}

export function createComplaint(payload: CreateComplaintPayload): Promise<BackendComplaint> {
  return request<BackendComplaint>('/complaints', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface ListComplaintsFilters {
  department?: string;
  priority?: string;
  status?: string;
  category?: string;
  location?: string;
}

export function getComplaints(filters?: ListComplaintsFilters): Promise<BackendComplaint[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const qs = params.toString();
  return request<BackendComplaint[]>(`/complaints${qs ? `?${qs}` : ''}`);
}

export function getComplaint(complaintId: string): Promise<BackendComplaint> {
  return request<BackendComplaint>(`/complaints/${encodeURIComponent(complaintId)}`);
}

export function updateComplaintStatus(
  complaintId: string,
  status: string
): Promise<BackendComplaint> {
  return request<BackendComplaint>(`/complaints/${encodeURIComponent(complaintId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getDepartmentComplaints(
  department: string,
  filters?: { status?: string; priority?: string }
): Promise<BackendComplaint[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  const qs = params.toString();
  return request<BackendComplaint[]>(
    `/departments/${encodeURIComponent(department)}/complaints${qs ? `?${qs}` : ''}`
  );
}

export function getComplaintHistory(complaintId: string): Promise<BackendStatusHistoryItem[]> {
  return request<BackendStatusHistoryItem[]>(`/complaints/${encodeURIComponent(complaintId)}/history`);
}

// Citizen feedback (rating/comment) -- see backend/app/services/feedback_service.py.
// Submitting again for the same complaint updates the existing feedback
// rather than creating a duplicate.
export interface SubmitFeedbackPayload {
  rating: number;
  comment?: string;
}

export function submitComplaintFeedback(
  complaintId: string,
  payload: SubmitFeedbackPayload
): Promise<BackendFeedback> {
  return request<BackendFeedback>(`/complaints/${encodeURIComponent(complaintId)}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getComplaintFeedback(complaintId: string): Promise<BackendFeedback> {
  return request<BackendFeedback>(`/complaints/${encodeURIComponent(complaintId)}/feedback`);
}

// The single convenience endpoint that runs the entire audio pipeline
// (Whisper -> LLM -> ChromaDB duplicate detection -> complaint/ticket/SLA)
// in one call. Used where a two-phase editable review isn't needed.
export function processAudioComplaint(file: Blob, filename = 'recording.webm'): Promise<ProcessAndCreateTicketResult> {
  const form = new FormData();
  form.append('file', file, filename);
  return request<ProcessAndCreateTicketResult>('/process-and-create-ticket', {
    method: 'POST',
    body: form,
  });
}

// ----------------------------------------------------------------------------
// Module 5 — SLA + Escalation
// ----------------------------------------------------------------------------

export function getComplaintSLA(complaintId: string): Promise<BackendSLA> {
  return request<BackendSLA>(`/complaints/${encodeURIComponent(complaintId)}/sla`);
}

export function getSLASummary(): Promise<SLASummary> {
  return request<SLASummary>('/sla/summary');
}

export function getSLAAtRisk(): Promise<SLAAtRiskItem[]> {
  return request<SLAAtRiskItem[]>('/sla/at-risk');
}

export function getSLABreached(): Promise<SLABreachedItem[]> {
  return request<SLABreachedItem[]>('/sla/breached');
}

export function recalculateSLAs(): Promise<{ message: string; recalculated_count: number; summary: SLASummary }> {
  return request('/sla/recalculate', { method: 'POST' });
}

// ----------------------------------------------------------------------------
// Notifications -- persistent, backend-delivered (currently SLA
// escalation events only; see backend/app/services/notification_service.py)
// ----------------------------------------------------------------------------

export function getNotifications(unreadOnly = false): Promise<BackendNotification[]> {
  return request<BackendNotification[]>(`/notifications${unreadOnly ? '?unread_only=true' : ''}`);
}

export function markNotificationRead(notificationId: number): Promise<BackendNotification> {
  return request<BackendNotification>(`/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<{ message: string; updated_count: number }> {
  return request('/notifications/read-all', { method: 'POST' });
}

// ----------------------------------------------------------------------------
// Module 6 — Analytics
// ----------------------------------------------------------------------------

function daysQuery(days?: number): string {
  return days ? `?days=${days}` : '';
}

export function getAnalyticsSummary(days?: number): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>(`/analytics/summary${daysQuery(days)}`);
}

export function getAnalyticsDepartments(days?: number): Promise<DepartmentBreakdownItem[]> {
  return request<DepartmentBreakdownItem[]>(`/analytics/departments${daysQuery(days)}`);
}

export function getAnalyticsCategories(days?: number): Promise<CategoryBreakdownItem[]> {
  return request<CategoryBreakdownItem[]>(`/analytics/categories${daysQuery(days)}`);
}

export function getAnalyticsPriorities(days?: number): Promise<PriorityBreakdownItem[]> {
  return request<PriorityBreakdownItem[]>(`/analytics/priorities${daysQuery(days)}`);
}

export function getAnalyticsStatus(days?: number): Promise<StatusBreakdown> {
  return request<StatusBreakdown>(`/analytics/status${daysQuery(days)}`);
}

export function getAnalyticsDuplicates(days?: number): Promise<DuplicateStatsResponse> {
  return request<DuplicateStatsResponse>(`/analytics/duplicates${daysQuery(days)}`);
}

export function getAnalyticsSLA(days?: number): Promise<SLAStatsResponse> {
  return request<SLAStatsResponse>(`/analytics/sla${daysQuery(days)}`);
}

export function getAnalyticsLocations(days?: number): Promise<LocationBreakdownItem[]> {
  return request<LocationBreakdownItem[]>(`/analytics/locations${daysQuery(days)}`);
}

export function getAnalyticsTopIssues(days?: number): Promise<TopIssueItem[]> {
  return request<TopIssueItem[]>(`/analytics/top-issues${daysQuery(days)}`);
}

// ----------------------------------------------------------------------------
// Health check — used to distinguish "backend down" from "no data".
// ----------------------------------------------------------------------------

export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Chatbot — public RAG FAQ assistant (see backend/app/routes/chatbot.py).
// Deliberately unauthenticated: this call carries a bearer token via
// `request()` if the caller happens to be logged in, but the backend
// endpoint doesn't require one and ignores it either way. It never
// returns complaint or user data — `sources` are human-friendly knowledge
// document titles only (never a collection name, file path, embedding, or
// similarity score).
// ----------------------------------------------------------------------------

export interface ChatbotReply {
  reply: string;
  sources: string[];
}

export function sendChatbotMessage(message: string): Promise<ChatbotReply> {
  return request<ChatbotReply>('/chatbot/message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
