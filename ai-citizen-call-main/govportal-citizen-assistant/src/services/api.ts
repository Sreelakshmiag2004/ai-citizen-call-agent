// ============================================================================
// API SERVICE LAYER — single point of contact with the real FastAPI backend
// (Citizen Call Intelligence / GovPortal). No mock data, no fetch() calls
// anywhere else in the app should talk to the backend directly — everything
// goes through the typed functions below.
// ============================================================================

import {
  AnalyticsSummary,
  AnalyzeResult,
  BackendComplaint,
  BackendSLA,
  BackendStatusHistoryItem,
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

/** Thrown by every api.ts function on a non-2xx response or network failure. */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
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
