// ============================================================================
// ADAPTERS — map real backend response shapes onto the existing frontend UI
// types (Complaint, ComplaintStatus, PriorityLevel, ...). This lets the
// already-built UI components keep rendering `complaint.title`,
// `complaint.status`, `complaint.timeline`, etc. unchanged while the data
// underneath becomes 100% real.
// ============================================================================

import {
  BackendComplaint,
  BackendStatusHistoryItem,
  Complaint,
  ComplaintStatus,
  PriorityLevel,
  TimelineEvent,
} from '../types';

export function mapBackendStatusToUI(status: string): ComplaintStatus {
  switch ((status || '').toUpperCase()) {
    case 'PENDING':
      return 'New';
    case 'ASSIGNED':
      return 'Assigned';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'RESOLVED':
      return 'Resolved';
    case 'CLOSED':
      return 'Closed';
    default:
      return 'New';
  }
}

/** Inverse of mapBackendStatusToUI — used when a UI action needs to send a
 * real status value back to PATCH /complaints/{id}/status. */
export function mapUIStatusToBackend(status: string): string {
  switch (status) {
    case 'New':
      return 'PENDING';
    case 'Assigned':
      return 'ASSIGNED';
    case 'In Progress':
      return 'IN_PROGRESS';
    case 'Resolved':
      return 'RESOLVED';
    case 'Closed':
      return 'CLOSED';
    default:
      return status.toUpperCase().replace(/\s+/g, '_');
  }
}

export function mapBackendPriorityToUI(priority: string): PriorityLevel {
  switch ((priority || '').toUpperCase()) {
    case 'CRITICAL':
      return 'Critical';
    case 'HIGH':
      return 'High';
    case 'MEDIUM':
      return 'Medium';
    case 'LOW':
      return 'Low';
    default:
      return 'Medium';
  }
}

export function formatBackendDate(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}, ${d.toLocaleTimeString(
    [],
    { hour: '2-digit', minute: '2-digit' }
  )}`;
}

/** Builds a minimal but real timeline from what a list-level BackendComplaint
 * already carries (no extra request). Upgraded to the full status history
 * via mapStatusHistoryToTimeline once a detail view fetches it. */
export function buildFallbackTimeline(bc: BackendComplaint): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `${bc.complaint_id}-created`,
      title: 'Complaint registered successfully.',
      description: `Transcript analyzed and routed to ${bc.department} department by the AI pipeline.`,
      timestamp: formatBackendDate(bc.created_at),
      author: 'GovPortal AI System',
      status: 'New',
    },
  ];
  if (bc.status !== 'PENDING') {
    events.push({
      id: `${bc.complaint_id}-current`,
      title: `Current status: ${mapBackendStatusToUI(bc.status)}`,
      description: 'Latest known status from the backend.',
      timestamp: formatBackendDate(bc.updated_at),
      author: 'GovPortal System',
      status: mapBackendStatusToUI(bc.status),
    });
  }
  return events;
}

export function mapStatusHistoryToTimeline(history: BackendStatusHistoryItem[]): TimelineEvent[] {
  if (!history || history.length === 0) return [];
  return history.map((h) => ({
    id: `hist-${h.id}`,
    title:
      h.old_status === 'NONE'
        ? 'Complaint registered successfully.'
        : `Status changed: ${h.old_status} → ${h.new_status}`,
    description:
      h.old_status === 'NONE'
        ? 'Submitted and processed by the AI pipeline.'
        : `Updated by department workflow.`,
    timestamp: formatBackendDate(h.changed_at),
    author: 'GovPortal System',
    status: mapBackendStatusToUI(h.new_status),
  }));
}

/** The single source-of-truth mapper: BackendComplaint -> the existing
 * Complaint UI shape. Every citizen/officer/admin/call-center page that
 * consumes `complaint.*` from AppContext relies on this. */
export function mapBackendComplaintToUI(bc: BackendComplaint): Complaint {
  return {
    id: bc.complaint_id,
    title: bc.summary || bc.category || 'Citizen Complaint',
    category: bc.category,
    department: bc.department,
    priority: mapBackendPriorityToUI(bc.priority),
    status: mapBackendStatusToUI(bc.status),
    submittedOn: formatBackendDate(bc.created_at),
    updatedOn: formatBackendDate(bc.updated_at),
    location: bc.location || 'Not specified',
    description: bc.transcript || bc.summary,
    duplicateFound: bc.duplicate_status === 'DUPLICATE',
    timeline: buildFallbackTimeline(bc),

    ticketId: bc.ticket?.ticket_id,
    keywords: bc.keywords,
    duplicateStatus: bc.duplicate_status as Complaint['duplicateStatus'],
    duplicateOf: bc.duplicate_of,
    similarityScore: bc.similarity_score,
    slaDurationHours: bc.sla_duration_hours,
    slaDeadline: bc.sla_deadline,
    slaStatus: bc.sla_status,
    escalationLevel: bc.escalation_level,
    escalatedAt: bc.escalated_at,
    wasBreached: bc.was_breached,
    reportCount: bc.report_count,
  };
}
