import { Complaint, NotificationItem, UserProfile } from '../types';

export const INITIAL_USER: UserProfile = {
  fullName: 'Ravi Kumar',
  email: 'ravi.kumar@citizen.gov.in',
  mobileNumber: '9876543210',
  address: '21, Green Park Street, Bangalore - 560001',
  role: 'Citizen',
  avatarInitials: 'RK',
  joinedDate: 'January 2024',
};

export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: 'GP2025-0001234',
    title: 'Water leakage on road',
    category: 'Water Supply',
    department: 'Public Works Dept.',
    priority: 'High',
    status: 'In Progress',
    submittedOn: '12 May 2025, 10:30 AM',
    updatedOn: '13 May 2025, 09:20 AM',
    location: 'Near 4th Cross Road, Green Park Sector, Bangalore',
    description: 'Continuous heavy water pipe leakage bursting through the main asphalt road causing puddle formation and water wastage for the past 24 hours.',
    audioDuration: '00:25',
    timeline: [
      {
        id: 't1',
        title: 'Complaint registered successfully.',
        description: 'Submitted via GovPortal Web.',
        timestamp: '12 May, 10:30 AM',
        author: 'GovPortal System',
        status: 'New',
      },
      {
        id: 't2',
        title: 'Complaint verified and forwarded.',
        description: 'Verified by Central Helpdesk.',
        timestamp: '12 May, 02:15 PM',
        author: 'Central Helpdesk Officer',
        status: 'Verified',
      },
      {
        id: 't3',
        title: 'Complaint assigned to Public Works Dept.',
        description: 'Status updated by System.',
        timestamp: '13 May, 09:20 AM',
        author: 'System Dispatcher',
        status: 'Assigned',
      },
      {
        id: 't4',
        title: 'Work crew deployed for field repair.',
        description: 'Maintenance team on-site with replacement pipeline fittings.',
        timestamp: '13 May, 11:30 AM',
        author: 'PWD Field Team Lead',
        status: 'In Progress',
      }
    ],
    assignedOfficer: {
      name: 'Er. S. Venkatraman',
      designation: 'Executive Engineer, Ward 42 PWD',
      contact: '+91 94481 00213',
    },
    resolutionNotes: 'Field technician inspected the subterranean pressure valve. Pipeline welding and patch repair currently underway.',
  },
  {
    id: 'GP2025-0001231',
    title: 'Street light not working since 3 days',
    category: 'Electricity',
    department: 'Electricity Dept.',
    priority: 'Medium',
    status: 'Assigned',
    submittedOn: '10 May 2025, 08:15 PM',
    updatedOn: '12 May 2025, 09:30 AM',
    location: 'Pole #44, 2nd Main Road, Green Park Colony',
    description: 'The street light has been dark for three consecutive nights, causing severe safety risks for pedestrians and cyclists.',
    timeline: [
      {
        id: 't21',
        title: 'Complaint registered successfully.',
        description: 'Submitted via Voice Complaint.',
        timestamp: '10 May, 08:15 PM',
        author: 'GovPortal Web',
        status: 'New',
      },
      {
        id: 't22',
        title: 'Assigned to Ward Electrical Section.',
        description: 'Technician task created for bulb & circuit ballast replacement.',
        timestamp: '12 May, 09:30 AM',
        author: 'Electricity Dept. Automated Route',
        status: 'Assigned',
      }
    ],
    assignedOfficer: {
      name: 'R. Keshava',
      designation: 'Assistant Linesman, BESCOM',
      contact: '+91 98450 11928',
    }
  },
  {
    id: 'GP2025-0001228',
    title: 'Garbage not collected in sector 4',
    category: 'Sanitation',
    department: 'Sanitation Dept.',
    priority: 'Low',
    status: 'Verified',
    submittedOn: '10 May 2025, 07:30 AM',
    updatedOn: '10 May 2025, 01:15 PM',
    location: 'Sector 4 Civic Bin Enclosure, Near Park Gate',
    description: 'Commercial and residential waste bins are overflowing as collection compactor truck skipped the morning route.',
    timeline: [
      {
        id: 't31',
        title: 'Complaint registered.',
        description: 'Citizen report logged with photo attachment.',
        timestamp: '10 May, 07:30 AM',
        author: 'Citizen Portal',
        status: 'New',
      },
      {
        id: 't32',
        title: 'Complaint verified by Ward Sanitation Supervisor.',
        description: 'Priority confirmed for evening sweep team.',
        timestamp: '10 May, 01:15 PM',
        author: 'Supervisor Anita Rao',
        status: 'Verified',
      }
    ]
  },
  {
    id: 'GP2025-0001226',
    title: 'Garbage not collected',
    category: 'Sanitation',
    department: 'Sanitation Dept.',
    priority: 'Low',
    status: 'Verified',
    submittedOn: '08 May 2025, 09:00 AM',
    updatedOn: '08 May 2025, 02:40 PM',
    location: '14th Cross, Green Park, Bangalore',
    description: 'Accumulation of dry leaves and uncollected domestic rubbish bags.',
    timeline: [
      {
        id: 't41',
        title: 'Complaint registered successfully.',
        description: 'Logged via portal.',
        timestamp: '08 May, 09:00 AM',
        author: 'GovPortal',
        status: 'New',
      }
    ]
  },
  {
    id: 'GP2025-0001205',
    title: 'Pothole on main road',
    category: 'Roads',
    department: 'Public Works Dept.',
    priority: 'Medium',
    status: 'Resolved',
    submittedOn: '05 May 2025, 11:20 AM',
    updatedOn: '07 May 2025, 04:30 PM',
    location: 'Junction of MG Road and 8th Avenue',
    description: 'Deep road depression damaging automobile shock absorbers and causing two-wheeler skids.',
    timeline: [
      {
        id: 't51',
        title: 'Complaint logged.',
        description: 'Received via mobile citizen portal.',
        timestamp: '05 May, 11:20 AM',
        author: 'GovPortal',
        status: 'New',
      },
      {
        id: 't52',
        title: 'Bitumen and asphalt patching completed.',
        description: 'Road surfaced and rolled clean by road repair crew.',
        timestamp: '07 May, 04:30 PM',
        author: 'PWD Inspector',
        status: 'Resolved',
      }
    ],
    feedback: {
      rating: 5,
      comment: 'Repaired swiftly within 48 hours. Excellent service!',
      submittedAt: '08 May 2025, 10:00 AM'
    }
  },
  {
    id: 'GP2025-0001210',
    title: 'Water supply delay',
    category: 'Water Supply',
    department: 'Public Works Dept.',
    priority: 'High',
    status: 'Closed',
    submittedOn: '28 Apr 2025, 04:00 PM',
    updatedOn: '30 Apr 2025, 06:00 PM',
    location: 'Block C, Green Park Apartments',
    description: 'Scheduled water supply delayed by over 6 hours without prior civic advisory.',
    timeline: [
      {
        id: 't61',
        title: 'Complaint registered.',
        description: 'Logged by resident association representative.',
        timestamp: '28 Apr, 04:00 PM',
        author: 'Citizen',
        status: 'New',
      },
      {
        id: 't62',
        title: 'Booster pump issue repaired and water pumped.',
        description: 'Normal water pressure restored across Block C.',
        timestamp: '30 Apr, 06:00 PM',
        author: 'Water Board Operator',
        status: 'Closed',
      }
    ]
  },
  {
    id: 'GP2025-0001199',
    title: 'Damaged footpath near bus stop',
    category: 'Roads',
    department: 'Public Works Dept.',
    priority: 'Low',
    status: 'Closed',
    submittedOn: '20 Apr 2025, 02:10 PM',
    updatedOn: '24 Apr 2025, 05:00 PM',
    location: 'Central Bus Terminal, Stop #3',
    description: 'Broken pavement paver blocks posing trip hazard to senior citizens boarding city buses.',
    timeline: [
      {
        id: 't71',
        title: 'Complaint submitted.',
        description: 'Recorded in portal.',
        timestamp: '20 Apr, 02:10 PM',
        author: 'GovPortal',
        status: 'New',
      },
      {
        id: 't72',
        title: 'Paver blocks re-laid and cemented.',
        description: 'Issue resolved and verified.',
        timestamp: '24 Apr, 05:00 PM',
        author: 'Municipal Supervisor',
        status: 'Closed',
      }
    ]
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    complaintId: 'GP2025-0001234',
    type: 'assigned',
    title: 'Complaint Assigned',
    message: 'Your complaint GP2025-0001234 has been assigned to Public Works Dept.',
    timestamp: '10 minutes ago',
    isRead: false,
  },
  {
    id: 'n2',
    complaintId: 'GP2025-0001231',
    type: 'status_change',
    title: 'Status Update',
    message: 'Status update for GP2025-0001231: Status changed to Assigned.',
    timestamp: '2 hours ago',
    isRead: false,
  },
  {
    id: 'n3',
    complaintId: 'GP2025-0001205',
    type: 'resolved',
    title: 'Complaint Resolved',
    message: 'Your complaint GP2025-0001225 has been resolved. Please provide your feedback.',
    timestamp: 'Yesterday',
    isRead: false,
  },
  {
    id: 'n4',
    complaintId: 'GP2025-0001205',
    type: 'reminder',
    title: 'Feedback Reminder',
    message: 'Reminder: Please share feedback for complaint GP2025-0001205.',
    timestamp: '2 days ago',
    isRead: true,
  },
  {
    id: 'n5',
    complaintId: 'GP2025-0001199',
    type: 'closed',
    title: 'Complaint Closed',
    message: 'Your complaint GP2025-0001199 has been closed.',
    timestamp: '3 days ago',
    isRead: true,
  },
];

export const CIVIC_SERVICES = [
  {
    id: 'roads',
    name: 'Roads & Infrastructure',
    iconName: 'Road',
    description: 'Potholes, broken footpaths, speed breakers, bridge maintenance and street signs.',
    department: 'Public Works Dept.',
    activeCount: 142,
  },
  {
    id: 'water',
    name: 'Water Supply & Drainage',
    iconName: 'Droplet',
    description: 'Pipeline leaks, contaminated water supply, storm water drain blockages and sewer overflows.',
    department: 'Water Supply & Sewerage Board',
    activeCount: 98,
  },
  {
    id: 'electricity',
    name: 'Electricity & Power',
    iconName: 'Zap',
    description: 'Non-functional street lights, power transformer faults, hanging cables and power outages.',
    department: 'Electricity Supply Company',
    activeCount: 84,
  },
  {
    id: 'sanitation',
    name: 'Sanitation & Waste',
    iconName: 'Trash2',
    description: 'Garbage collection delays, overflowing public dumpsters, street sweeping and debris removal.',
    department: 'Municipal Solid Waste Dept.',
    activeCount: 115,
  },
  {
    id: 'transport',
    name: 'Public Transport',
    iconName: 'Bus',
    description: 'Bus stop shelter damage, bus timetable irregularities, ticketing issues and feeder route queries.',
    department: 'Metropolitan Transport Corp.',
    activeCount: 42,
  },
  {
    id: 'others',
    name: 'Others',
    iconName: 'MoreHorizontal',
    description: 'Parks, stray animal management, noise pollution, tree pruning, unauthorized encroachments.',
    department: 'General Administration',
    activeCount: 63,
  },
];
