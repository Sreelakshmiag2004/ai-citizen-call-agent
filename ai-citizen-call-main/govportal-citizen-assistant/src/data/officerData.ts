import { UserProfile, NotificationItem } from '../types';

export const OFFICER_USER: UserProfile = {
  fullName: 'Priya Sharma',
  email: 'priya.sharma@pwd.gov.in',
  mobileNumber: '+91 98765 43210',
  address: 'PWD Division 4, Coimbatore, Tamil Nadu',
  role: 'Assistant Engineer',
  avatarInitials: 'PS',
  joinedDate: '12 Jan 2023',
  status: 'Active',
  portalType: 'officer',
};

export const OFFICER_METRICS = {
  totalComplaints: 542,
  totalComplaintsChange: '+12%',
  assignedToYou: 28,
  assignedToYouChange: '+8%',
  inProgress: 74,
  inProgressChange: '+5%',
  resolved: 312,
  resolvedChange: '+18%',
  overdueSla: 9,
  overdueSlaChange: '-2%',
};

export const OFFICER_COMPLAINTS_OVERVIEW = {
  total: 542,
  breakdown: [
    { label: 'New', count: 42, percentage: '8%', color: '#3B82F6' },
    { label: 'In Progress', count: 74, percentage: '14%', color: '#F59E0B' },
    { label: 'Resolved', count: 312, percentage: '61%', color: '#10B981' },
    { label: 'Closed', count: 57, percentage: '6%', color: '#94A3B8' },
  ],
};

export interface OfficerRecentAssignment {
  id: string;
  issue: string;
  priority: 'High' | 'Medium' | 'Low';
  timeDate: string;
  category: string;
  type: 'water' | 'electricity' | 'sanitation' | 'road';
}

export const OFFICER_RECENT_ASSIGNMENTS: OfficerRecentAssignment[] = [
  {
    id: 'CP2025-0001234',
    issue: 'Water Leakage near Park Street',
    priority: 'High',
    timeDate: '10:30 AM',
    category: 'Water Supply',
    type: 'water',
  },
  {
    id: 'CP2025-0001250',
    issue: 'Street Light Not Working',
    priority: 'Medium',
    timeDate: '09:45 AM',
    category: 'Electricity',
    type: 'electricity',
  },
  {
    id: 'CP2025-0001278',
    issue: 'Garbage Overflow',
    priority: 'High',
    timeDate: 'Yesterday',
    category: 'Sanitation',
    type: 'sanitation',
  },
  {
    id: 'CP2025-0001299',
    issue: 'Road Damage (Pothole)',
    priority: 'Medium',
    timeDate: 'Yesterday',
    category: 'Roads',
    type: 'road',
  },
];

export interface OfficerSlaAlert {
  id: string;
  complaintId: string;
  statusText: string;
  urgency: 'critical' | 'warning';
}

export const OFFICER_SLA_ALERTS: OfficerSlaAlert[] = [
  {
    id: 'sla-1',
    complaintId: 'CP2025-0001234',
    statusText: 'Overdue by 2 hrs',
    urgency: 'critical',
  },
  {
    id: 'sla-2',
    complaintId: 'CP2025-0001087',
    statusText: 'Overdue by 1 day',
    urgency: 'critical',
  },
  {
    id: 'sla-3',
    complaintId: 'CP2025-0001201',
    statusText: 'Due in 3 hrs',
    urgency: 'warning',
  },
];

export interface OfficerAssignment {
  id: string;
  issue: string;
  priority: 'High' | 'Medium' | 'Low';
  location: string;
  dueDate: string;
  status: 'In Progress' | 'New' | 'Pending' | 'Overdue' | 'Resolved';
}

export const OFFICER_MY_ASSIGNMENTS: OfficerAssignment[] = [
  {
    id: 'CP2025-0001234',
    issue: 'Water Leakage',
    priority: 'High',
    location: 'Park Street',
    dueDate: '16 May, 5:00 PM',
    status: 'In Progress',
  },
  {
    id: 'CP2025-0001250',
    issue: 'Street Light Not Working',
    priority: 'Medium',
    location: 'Main Road, Sector 4',
    dueDate: '17 May, 2:00 PM',
    status: 'New',
  },
  {
    id: 'CP2025-0001278',
    issue: 'Garbage Overflow',
    priority: 'High',
    location: 'Ward 12',
    dueDate: '15 May, 11:00 AM',
    status: 'Pending',
  },
  {
    id: 'CP2025-0001322',
    issue: 'Road Damage',
    priority: 'Medium',
    location: 'Anna Nagar',
    dueDate: '18 May, 10:00 AM',
    status: 'New',
  },
  {
    id: 'CP2025-0001345',
    issue: 'Drainage Blocked',
    priority: 'High',
    location: 'Shankar Nagar',
    dueDate: '14 May, 2:00 PM',
    status: 'Overdue',
  },
];

export interface OfficerDepartmentComplaint {
  id: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  location: string;
  status: 'In Progress' | 'New' | 'Pending' | 'Resolved' | 'Closed';
  aiConfidence: string;
  createdOn: string;
}

export const OFFICER_DEPARTMENT_COMPLAINTS: OfficerDepartmentComplaint[] = [
  {
    id: 'CP2025-0001234',
    category: 'Water Supply',
    priority: 'High',
    location: 'Park Street',
    status: 'In Progress',
    aiConfidence: '96%',
    createdOn: '16 May, 10:30 AM',
  },
  {
    id: 'CP2025-0001250',
    category: 'Electricity',
    priority: 'Medium',
    location: 'Main Road',
    status: 'New',
    aiConfidence: '92%',
    createdOn: '16 May, 9:45 AM',
  },
  {
    id: 'CP2025-0001278',
    category: 'Sanitation',
    priority: 'High',
    location: 'Ward 12',
    status: 'Pending',
    aiConfidence: '91%',
    createdOn: '15 May, 4:10 PM',
  },
  {
    id: 'CP2025-0001299',
    category: 'Roads',
    priority: 'Medium',
    location: 'Anna Nagar',
    status: 'In Progress',
    aiConfidence: '89%',
    createdOn: '15 May, 11:20 AM',
  },
  {
    id: 'CP2025-0001301',
    category: 'Water Supply',
    priority: 'Low',
    location: 'Sector 3',
    status: 'Resolved',
    aiConfidence: '97%',
    createdOn: '14 May, 8:20 PM',
  },
];

export interface OfficerComplaintDetail {
  id: string;
  issue: string;
  category: string;
  location: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Progress' | 'New' | 'Pending' | 'Resolved' | 'Closed';
  slaDueDate: string;
  slaOverdueNotice: string;
  source: string;
  aiConfidence: number;
  aiSummary: string;
  aiTags: string[];
  citizen: {
    name: string;
    initials: string;
    mobile: string;
    email: string;
  };
  assignment: {
    assignedTo: string;
    assignedOn: string;
    department: string;
  };
  lifecycle: {
    stage: string;
    timestamp: string;
    actor: string;
    isCurrent?: boolean;
    isCompleted?: boolean;
  }[];
}

export const OFFICER_PRIMARY_COMPLAINT: OfficerComplaintDetail = {
  id: 'CP2025-0001234',
  issue: 'Water Leakage near Park Street',
  category: 'Water Supply',
  location: 'Park Street, Coimbatore',
  priority: 'High',
  status: 'In Progress',
  slaDueDate: '16 May, 5:00 PM',
  slaOverdueNotice: '(Overdue by 2 hrs)',
  source: 'Call Center (Voice)',
  aiConfidence: 96,
  aiSummary:
    'Citizen reported continuous water leakage near the Park Street junction for the past 2 days causing water wastage. Possible pipe joint issue. Immediate inspection recommended.',
  aiTags: ['Leakage', 'Pipe Joint', 'Water Waste'],
  citizen: {
    name: 'Ravi Kumar',
    initials: 'RK',
    mobile: '******5421',
    email: 'ravi.kumar@gmail.com',
  },
  assignment: {
    assignedTo: 'Priya Sharma (You)',
    assignedOn: '16 May, 10:35 AM',
    department: 'Public Works Department',
  },
  lifecycle: [
    {
      stage: 'New',
      timestamp: '16 May, 10:30 AM',
      actor: 'AI Auto-Routed',
      isCompleted: true,
    },
    {
      stage: 'Verified',
      timestamp: '16 May, 10:32 AM',
      actor: 'By System',
      isCompleted: true,
    },
    {
      stage: 'Assigned',
      timestamp: '16 May, 10:35 AM',
      actor: 'To You',
      isCompleted: true,
    },
    {
      stage: 'In Progress',
      timestamp: '16 May, 10:45 AM',
      actor: 'You',
      isCurrent: true,
    },
    {
      stage: 'Resolved',
      timestamp: 'Pending',
      actor: '',
      isCompleted: false,
    },
  ],
};

export const OFFICER_NOTIFICATIONS_LIST: NotificationItem[] = [
  {
    id: 'onotif-1',
    complaintId: 'CP2025-0001350',
    type: 'assigned',
    title: 'New complaint CP2025-0001350 assigned to you',
    message: 'Street Light flickering in Anna Nagar',
    timestamp: '10:42 AM',
    isRead: false,
  },
  {
    id: 'onotif-2',
    complaintId: 'CP2025-0001234',
    type: 'sla_breach',
    title: 'SLA Overdue: CP2025-0001234',
    message: 'Water leakage complaint is overdue by 2 hrs',
    timestamp: '10:40 AM',
    isRead: false,
  },
  {
    id: 'onotif-3',
    complaintId: 'CP2025-0001278',
    type: 'status_change',
    title: 'Citizen updated: CP2025-0001278',
    message: 'Additional photos added',
    timestamp: 'Yesterday',
    isRead: true,
  },
  {
    id: 'onotif-4',
    complaintId: 'CP2025-0001187',
    type: 'routed',
    title: 'Escalation Received: CP2025-0001187',
    message: 'Forwarded from Senior Officer',
    timestamp: 'Yesterday',
    isRead: true,
  },
];
