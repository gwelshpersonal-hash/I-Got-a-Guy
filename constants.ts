
import { Organization, Site, User, Role, StaffType, Shift, ShiftStatus, TimeEntry, JobPosting, JobApplication, ServiceCategory } from './types';
import { addDays, setHours, subDays, addHours, subHours } from 'date-fns';

// REPLACE THIS URL WITH YOUR UPLOADED IMAGE URL
export const APP_LOGO_URL = "https://placehold.co/600x200/1e3a8a/ffd01f?text=I+Got+A+Guy!&font=roboto";

export const ALL_SERVICE_CATEGORIES: ServiceCategory[] = [
    'LANDSCAPING', 'MOVING', 'CLEANING', 'HANDYMAN', 'PLUMBING', 'AUTO', 'CONSTRUCTION', 'COMPUTER', 'GENERAL_LABOR', 'JOBSITE_LABOR', 'POWER_WASHING', 'OTHER'
];

export const SERVICE_CATEGORIES = {
  COMPUTER:      { risk: 'LOW',    fee: 3.00 },
  CLEANING:      { risk: 'LOW',    fee: 3.00 },
  LANDSCAPING:   { risk: 'MEDIUM', fee: 5.00 },
  HANDYMAN:      { risk: 'MEDIUM', fee: 5.00 },
  GENERAL_LABOR: { risk: 'MEDIUM', fee: 5.00 },
  MOVING:        { risk: 'HIGH',   fee: 12.00 },
  PLUMBING:      { risk: 'HIGH',   fee: 12.00 },
  CONSTRUCTION:  { risk: 'HIGH',   fee: 12.00 },
  AUTO:          { risk: 'HIGH',   fee: 12.00 },
  OTHER:         { risk: 'LOW',    fee: 3.00 }
};

export const PLATFORM_COMMISSION = 0.15; // 15%
export const TAX_THRESHOLD = 2000.00;    // 2026 IRS Limit
export const ESCROW_WINDOW_HOURS = 48;

export const RISK_LEVELS = {
  LOW: 'LOW',       // Yard work, cleaning
  MEDIUM: 'MEDIUM', // General labor, assembly
  HIGH: 'HIGH'      // Moving, Electrical, Plumbing
} as const;

export const INSURANCE_FEES = {
  [RISK_LEVELS.LOW]: 2.00,
  [RISK_LEVELS.MEDIUM]: 5.00,
  [RISK_LEVELS.HIGH]: 10.00
};

export const CATEGORY_RISK_MAPPING: Record<ServiceCategory, { risk: keyof typeof RISK_LEVELS }> = {
  MOVING: { risk: RISK_LEVELS.HIGH },
  PLUMBING: { risk: RISK_LEVELS.HIGH },
  AUTO: { risk: RISK_LEVELS.HIGH },
  CONSTRUCTION: { risk: RISK_LEVELS.HIGH },
  JOBSITE_LABOR: { risk: RISK_LEVELS.HIGH }, 
  HANDYMAN: { risk: RISK_LEVELS.MEDIUM },
  GENERAL_LABOR: { risk: RISK_LEVELS.MEDIUM },
  LANDSCAPING: { risk: RISK_LEVELS.MEDIUM },
  POWER_WASHING: { risk: RISK_LEVELS.MEDIUM },
  CLEANING: { risk: RISK_LEVELS.LOW },
  COMPUTER: { risk: RISK_LEVELS.LOW },
  OTHER: { risk: RISK_LEVELS.LOW },
};


export const MOCK_ORG: Organization = {
  id: 'org_1',
  name: 'I Got A Guy Platform',
};

export const MOCK_SITES: Site[] = [
  {
    id: 'site_1',
    orgId: 'org_1',
    name: 'Home Address',
    address: '123 Maple Ave, Suburbia',
    latitude: 37.7749, 
    longitude: -122.4194,
    radiusMeters: 500,
  },
  {
    id: 'site_2',
    orgId: 'org_1',
    name: 'Rental Property',
    address: '45 Downtown St, City',
    latitude: 37.7849, 
    longitude: -122.4094,
    radiusMeters: 500,
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'admin_1',
    orgId: 'org_1',
    name: 'Admin User',
    email: 'admin@igotaguy.co',
    role: Role.ADMIN,
    hourlyRate: 0,
    isActive: true,
    verificationStatus: 'VERIFIED',
    phone: '555-ADMIN',
    urgentAlertsEnabled: true,
  },
  {
    id: 'user_1',
    orgId: 'org_1',
    name: 'Alice Client',
    email: 'alice@homeowner.com',
    role: Role.CLIENT,
    hourlyRate: 0,
    isActive: true,
    verificationStatus: 'VERIFIED',
    phone: '555-0100',
    urgentAlertsEnabled: true,
    hasPaymentMethod: true, // Alice has a card on file
  },
  {
    id: 'user_2',
    orgId: 'org_1',
    name: 'Bob The Builder',
    email: 'bob@provider.com',
    role: Role.PROVIDER,
    staffType: StaffType.CONTRACTOR_1099,
    hourlyRate: 45.00,
    isActive: true,
    verificationStatus: 'VERIFIED',
    phone: '555-0101',
    skills: ALL_SERVICE_CATEGORIES, // Bob can do it all
    rating: 4.8,
    jobsCompleted: 124,
    urgentAlertsEnabled: true,
    stripeAccountId: 'acct_test_123', // Required for claiming jobs
  },
  {
    id: 'user_3',
    orgId: 'org_1',
    name: 'Charlie Cleaner',
    email: 'charlie@clean.com',
    role: Role.PROVIDER,
    staffType: StaffType.CONTRACTOR_1099,
    hourlyRate: 30.00,
    isActive: true,
    verificationStatus: 'VERIFIED',
    phone: '555-0102',
    skills: ['CLEANING', 'MOVING'],
    rating: 4.9,
    jobsCompleted: 56,
    urgentAlertsEnabled: true,
    stripeAccountId: 'acct_test_456',
  }
];

const today = new Date();

export const MOCK_SHIFTS: Shift[] = [
  {
    id: 'gig_1',
    userId: 'user_3',
    clientId: 'user_1',
    siteId: 'site_1',
    start: setHours(today, 10),
    end: setHours(today, 13),
    description: 'Deep Clean Living Room',
    category: 'CLEANING',
    status: ShiftStatus.ACCEPTED,
    isRecurring: false,
    price: 120,
    createdAt: subDays(today, 1)
  },
  {
    id: 'gig_2',
    userId: null,
    clientId: 'user_1',
    siteId: 'site_1',
    start: addDays(today, 2),
    end: addDays(today, 2), // Same day duration usually handled by logic
    description: 'Fix Leaky Faucet',
    category: 'PLUMBING',
    status: ShiftStatus.OPEN_REQUEST,
    isRecurring: false,
    price: 85,
    createdAt: subHours(today, 3), // Created 3 hours ago -> Should trigger Low Interest Warning
    isBoosted: false
  },
  {
    id: 'gig_3',
    userId: null,
    clientId: 'user_1',
    siteId: 'site_2',
    start: addDays(today, 1),
    end: addDays(today, 1),
    description: 'Move Sofa to 2nd Floor',
    category: 'MOVING',
    status: ShiftStatus.OPEN_REQUEST,
    isRecurring: false,
    type: 'URGENT',
    price: 60,
    createdAt: subHours(today, 1) // Created 1 hour ago -> No warning yet
  }
];

export const MOCK_TIME_ENTRIES: TimeEntry[] = [
  {
    id: 'entry_1',
    userId: 'user_2',
    clockIn: setHours(subDays(today, 1), 14),
    clockOut: setHours(subDays(today, 1), 16),
    clockInLat: 37.7749,
    clockInLng: -122.4194,
    isFlagged: false,
    managerApproved: true,
  }
];

export const MOCK_JOBS: JobPosting[] = [
    { 
        id: 'job_1', 
        orgId: 'org_1', 
        title: 'Full-Time Mover', 
        description: 'Looking for a strong guy to join our moving crew full time.', 
        payRange: '$25/hr', 
        isPublic: true, 
        status: 'OPEN', 
        createdAt: new Date() 
    }
];

export const MOCK_APPLICATIONS: JobApplication[] = [];

export const STORAGE_KEYS = {
  PENDING_PUNCHES: 'iw_pending_punches',
  AUTH_USER: 'iw_auth_user',
};
