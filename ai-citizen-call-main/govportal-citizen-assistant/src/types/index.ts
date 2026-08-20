export type ComplaintStatus = 'New' | 'Verified' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed' | 'Routed' | 'Exception' | 'On Hold';
export type PriorityLevel = 'High' | 'Medium' | 'Low' | 'Critical';
export type PortalType = 'citizen' | 'call-center' | 'officer' | 'admin';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  author: string;
  status: ComplaintStatus;
}

export interface Complaint {
  id: string; // e.g. GP2025-0001234 or CP2025-0001234
  title: string;
  category: string;
  department: string;
  priority: PriorityLevel;
  status: ComplaintStatus;
  submittedOn: string;
  updatedOn: string;
  location: string;
  description: string;
  callerName?: string;
  callerPhone?: string;
  aiConfidence?: number;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  duplicateFound?: boolean;
  audioDuration?: string;
  attachments?: string[];
  timeline: TimelineEvent[];
  assignedOfficer?: {
    name: string;
    designation: string;
    contact?: string;
  };
  resolutionNotes?: string;
  feedback?: {
    rating: number;
    comment: string;
    submittedAt: string;
  };

  // ---- Real backend fields (present when this Complaint was mapped from a
  // BackendComplaint via mapBackendComplaintToUI). Optional because demo-only
  // records (e.g. leftover mock entries) will not have them. ----
  ticketId?: string;
  keywords?: string[];
  duplicateStatus?: BackendDuplicateStatus;
  duplicateOf?: string | null;
  similarityScore?: number | null;
  slaDurationHours?: number;
  slaDeadline?: string | null;
  slaStatus?: BackendSLAStatus | string;
  escalationLevel?: number;
  escalatedAt?: string | null;
  wasBreached?: boolean;
  reportCount?: number;
}

export interface CallCenterCall {
  id: string;
  callId: string;
  callerName: string;
  phoneNumber: string;
  duration: string;
  status: 'Live' | 'Incoming' | 'Completed' | 'Failed';
  aiSummary: string;
  recommendedDepartment: string;
  aiConfidence: number;
  detectedIssue: string;
  detectedCategory: string;
  priority: PriorityLevel;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  duplicateStatus: string;
  routingStatus: string;
  routingTarget: string;
  transcript?: { speaker: string; text: string; time: string }[];
}

export interface CallCenterException {
  id: string;
  complaintId: string;
  type: 'Low Confidence' | 'Transcription Failed' | 'Conflicting Depts.' | 'Processing Failed' | 'Emergency Case';
  reason: string;
  caller: string;
  priority: PriorityLevel;
  aiConfidence: string;
  createdOn: string;
}

export interface NotificationItem {
  id: string;
  complaintId?: string;
  type: 'assigned' | 'status_change' | 'resolved' | 'reminder' | 'closed' | 'high_priority' | 'routed' | 'exception' | 'transcription_failed' | 'system_update' | 'sla_breach' | 'user_created' | 'dept_mapping' | 'maintenance';
  category?: 'System' | 'Complaints' | 'SLA & Escalations' | 'User Management' | 'Department Management';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface AdminUserItem {
  id: string;
  name: string;
  contact: string;
  role: 'Citizen' | 'Call Center Exec.' | 'Officer' | 'Supervisor' | 'Administrator';
  department: string;
  status: 'Active' | 'Inactive';
  registeredOn: string;
  lastActive: string;
}

export interface AdminDepartmentItem {
  id: string;
  departmentName: string;
  deptCode: string;
  officers: number;
  supervisors: number;
  activeComplaints: number;
  slaPerformance: string;
  status: 'Active' | 'Inactive';
}

export interface AdminAuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
  ipAddress: string;
  status: 'Success' | 'Failed';
  performedBy?: string;
  entityAffected?: string;
  actionType?: 'Create' | 'Update' | 'Escalation' | 'Delete';
}

export interface AdminComplaintItem {
  id: string;
  citizenName: string;
  category: string;
  department: string;
  submittedOn: string;
  slaStatus: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'New' | 'In Progress' | 'Overdue' | 'Resolved';
}

export interface AdminSLAItem {
  id: string;
  department: string;
  targetSLA: string;
  complianceRate: string;
  activeBreaches: number;
  avgResolutionTime: string;
  escalationLevel: string;
}

export interface AdminExecutivePerformance {
  id: string;
  executiveName: string;
  callsHandled: number;
  complaintsCreated: number;
  avgHandlingTime: string;
  performance: string;
  status: 'Online' | 'Offline' | 'Away';
}

export interface AdminBreachedSLAItem {
  id: string;
  complaintId: string;
  issue: string;
  department: string;
  assignedOfficer: string;
  slaBreachedOn: string;
  overdueBy: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  mobileNumber: string;
  address: string;
  role: string;
  avatarInitials: string;
  joinedDate: string;
  status?: 'Available' | 'Busy' | 'On Call' | 'Offline' | 'Active';
  portalType?: PortalType;
}

export type PageRoute = 
  | 'landing' 
  | 'login' 
  | 'register' 
  | 'dashboard' 
  | 'raise-complaint' 
  | 'my-complaints' 
  | 'complaint-details' 
  | 'notifications' 
  | 'profile' 
  | 'services' 
  | 'about' 
  | 'help'
  | 'live-calls'
  | 'complaints'
  | 'exceptions'
  | 'user-management'
  | 'department-management'
  | 'call-center-management'
  | 'complaint-management'
  | 'sla-escalations'
  | 'audit-logs'
  | 'admin-notifications'
  | 'admin-profile'
  | 'my-assignments'
  | 'officer-complaint-details'
  | 'officer-notifications'
  | 'officer-profile';

// ============================================================================
// BACKEND API TYPES — Citizen Call Intelligence FastAPI backend.
// These mirror the actual response shapes from app/database/schemas.py and
// the service layer. Fields are optional where the backend may omit them.
// ============================================================================

export type BackendStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type BackendPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BackendDuplicateStatus = 'NEW' | 'RELATED' | 'DUPLICATE';
export type BackendSLAStatus = 'ACTIVE' | 'AT_RISK' | 'BREACHED' | 'COMPLETED';

export interface BackendTicket {
  ticket_id: string;
  complaint_id: string;
  department: string;
  priority: string;
  status: string;
  parent_ticket?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendComplaint {
  complaint_id: string;
  transcript: string;
  language: string;
  category: string;
  department: string;
  priority: string;
  summary: string;
  location?: string | null;
  keywords: string[];
  status: string;
  duplicate_status: string;
  duplicate_of?: string | null;
  similarity_score?: number | null;
  report_count?: number;
  sla_duration_hours: number;
  sla_deadline?: string | null;
  sla_status: string;
  escalation_level: number;
  escalated_at?: string | null;
  was_breached: boolean;
  created_at: string;
  updated_at: string;
  ticket?: BackendTicket | null;
  feedback?: BackendFeedback | null;
}

// Shape returned by POST/GET /complaints/{id}/feedback (see
// backend/app/database/schemas.py's FeedbackResponse) and embedded in
// BackendComplaint.feedback.
export interface BackendFeedback {
  complaint_id: string;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendStatusHistoryItem {
  id: number;
  complaint_id: string;
  old_status: string;
  new_status: string;
  changed_at: string;
}

export interface BackendSLA {
  complaint_id: string;
  ticket_id?: string | null;
  priority: string;
  sla_duration_hours: number;
  created_at: string;
  sla_deadline: string;
  sla_status: string;
  remaining_seconds: number;
  remaining_hours: number;
  escalation_level: number;
  escalated_at?: string | null;
  was_breached: boolean;
}

export interface SLASummary {
  total_active: number;
  active: number;
  at_risk: number;
  breached: number;
  completed: number;
}

export interface SLABreachedItem {
  complaint_id: string;
  ticket_id?: string | null;
  department: string;
  priority: string;
  location?: string | null;
  status: string;
  sla_deadline: string;
  escalation_level: number;
  escalated_at?: string | null;
  was_breached: boolean;
}

export interface SLAAtRiskItem {
  complaint_id: string;
  ticket_id?: string | null;
  department: string;
  priority: string;
  location?: string | null;
  status: string;
  sla_deadline: string;
  remaining_hours: number;
}

export interface AnalyticsSummary {
  total_complaints: number;
  pending: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  closed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  duplicates: number;
  sla_at_risk: number;
  sla_breached: number;
}

export interface DepartmentBreakdownItem { department: string; count: number }
export interface CategoryBreakdownItem { category: string; count: number }
export interface PriorityBreakdownItem { priority: string; count: number }
export type StatusBreakdown = Record<string, number>;

export interface DuplicateStatsResponse {
  total_complaints: number;
  new: number;
  related: number;
  duplicates: number;
  duplicate_percentage: number;
}

export interface SLAStatsResponse {
  active: number;
  at_risk: number;
  breached: number;
  completed: number;
  sla_compliance_percentage: number;
}

export interface LocationBreakdownItem { location: string; count: number }
export interface TopIssueItem { category: string; count: number }

export interface TranscribeResult {
  filename: string;
  language: string;
  language_probability: number;
  transcript: string;
  segments: unknown;
}

export interface AnalyzeResult {
  category: string;
  department: string;
  priority: string;
  summary: string;
  location: string | null;
  keywords: string[];
}

export interface MatchedComplaintInfo {
  complaint_id: string;
  category: string;
  department: string;
  location?: string | null;
  summary: string;
}

export interface DuplicateCheckResult {
  complaint_id: string;
  status: BackendDuplicateStatus;
  duplicate_of: string | null;
  related_complaint: string | null;
  similarity: number;
  matched_complaint?: MatchedComplaintInfo;
}

export interface ProcessAndCreateTicketResult {
  complaint: {
    complaint_id: string;
    category: string;
    department: string;
    priority: string;
    summary: string;
    location: string | null;
    status: string;
  };
  ticket: {
    ticket_id: string | null;
    department: string;
    priority: string;
    status: string;
  };
  duplicate: {
    status: string;
    duplicate_of: string | null;
    similarity: number;
  };
}

// ----------------------------------------------------------------------------
// Authentication -- shapes returned by POST /auth/register, /auth/login,
// GET /auth/me (see backend/app/database/schemas.py's UserResponse /
// TokenResponse). `role` matches PortalType exactly.
// ----------------------------------------------------------------------------

export interface BackendUser {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: PortalType;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: BackendUser;
}

// ----------------------------------------------------------------------------
// Notifications -- shape returned by GET /notifications (see
// backend/app/database/schemas.py's NotificationResponse). Currently only
// populated by SLA at-risk/breach escalation events; `type` is always one
// of the NotificationItem['type'] values below ('reminder' for at-risk,
// 'sla_breach' for breached at either escalation level).
// ----------------------------------------------------------------------------

export interface BackendNotification {
  id: number;
  complaint_id: string | null;
  type: string;
  escalation_level: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  complaintCard?: {
    id: string;
    title: string;
    status: ComplaintStatus;
    department: string;
    updatedOn: string;
  };
  actionChips?: string[];
  // Human-friendly knowledge-document titles the backend grounded this
  // reply in (see backend/app/routes/chatbot.py) -- never a ChromaDB
  // collection name, file path, embedding, or similarity score. Present
  // only on real backend-answered bot messages; absent on the canned
  // welcome message and on error messages.
  sources?: string[];
}
