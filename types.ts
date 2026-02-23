
export enum Role {
  CLIENT = 'CLIENT',     // The Customer (Homeowner)
  PROVIDER = 'PROVIDER', // The "Guy" (Worker)
  ADMIN = 'ADMIN',       // Platform Admin
  EMPLOYEE = 'EMPLOYEE', // Legacy
  MANAGER = 'MANAGER',   // Legacy
  VENDOR = 'VENDOR'      // Legacy
}

export enum StaffType {
  W2 = 'W2',
  CONTRACTOR_1099 = '1099'
}

export enum ShiftStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EN_ROUTE = 'EN_ROUTE', // New: Provider is traveling
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED', // Provider marked as done
  VERIFIED = 'VERIFIED',   // Client confirmed & rated
  OPEN_REQUEST = 'OPEN_REQUEST' 
}

export type ShiftType = 'SCHEDULED' | 'URGENT';
export type EscrowStatus = 'PENDING' | 'SECURED' | 'DISPUTED' | 'RELEASED' | 'REFUNDED' | 'PARTIAL_REFUND';

export type ServiceCategory = 'LANDSCAPING' | 'MOVING' | 'CLEANING' | 'HANDYMAN' | 'PLUMBING' | 'AUTO' | 'CONSTRUCTION' | 'COMPUTER' | 'GENERAL_LABOR' | 'JOBSITE_LABOR' | 'POWER_WASHING';

export interface Organization {
  id: string;
  name: string;
}

export interface Site {
  id: string;
  orgId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

// New Financial & Gating Configuration
export type InsuranceFeeType = 'FLAT' | 'PERCENTAGE';

export interface InsuranceRule {
  type: InsuranceFeeType;
  value: number; // e.g., 2.00 for FLAT, 5 for PERCENTAGE
}

export interface CategoryRule {
    platformFeePercent: number; // e.g. 20 for 20%
    insuranceRule: InsuranceRule;
    requiresInsurance: boolean; // Gating: If true, unverified pros cannot see these
}

export type PlatformConfig = Record<ServiceCategory, CategoryRule>;

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  staffType?: StaffType;
  hourlyRate: number;
  isActive: boolean;
  phone: string;
  
  // Verification
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';

  // Provider specific fields
  companyName?: string;
  profileImage?: string; // URL/Base64 of the uploaded profile image or logo
  skills?: ServiceCategory[]; 
  pendingSkills?: ServiceCategory[]; // Skills requested but not yet approved by Admin
  rating?: number;
  jobsCompleted?: number;
  vendorType?: string;
  
  // Financials
  stripeAccountId?: string; // Connected account ID for payouts (Provider)
  hasPaymentMethod?: boolean; // Does user have a card on file? (Client)
  hasTaxW9?: boolean; // 2026 Tax Compliance: Has user submitted W9/Tax Info?
  
  // Preferences
  urgentAlertsEnabled?: boolean;

  // Insurance
  insuranceType?: 'OWN_COI' | 'DAILY_SHIELD';
  coiUrl?: string; // URL/Base64 of the uploaded certificate
  isCoiVerified?: boolean; // Admin verification status
  coiExpiry?: Date; // Expiration date of the uploaded COI
}

export interface PayFeedback {
  upvotes: string[];   // Users who think price is good/fair
  downvotes: string[]; // Users who think price is too low
}

export interface CounterOffer {
  id: string;
  providerId: string;
  amount: number;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
}

export interface Shift {
  id: string;
  userId: string | null; // Null if open request
  clientId?: string;     // The user who requested it
  siteId: string;
  start: Date;
  end: Date;
  description: string;
  category: ServiceCategory; 
  status: ShiftStatus;
  isRecurring: boolean;
  type?: ShiftType;
  price?: number;        // Flat rate price for the job
  
  // Financial State
  isPaid?: boolean;      // Has the platform/client paid the provider?
  escrowStatus?: EscrowStatus; // Status of funds held by platform
  isDisputed?: boolean;  // If true, payout is frozen pending admin review
  disputeReason?: string; // Reason for the dispute/freeze
  refundAmount?: number;  // Amount returned to client (Partial Refund logic)
  resolutionNotes?: string; // Admin notes on how dispute was resolved
  
  // Stripe Integration
  stripePaymentIntentId?: string; // ID of the hold on client's card
  payoutTimestamp?: string; // ISO string of when payout was released
  
  createdAt?: Date;      // When the request was posted
  isBoosted?: boolean;   // If the price has been bumped by the client
  payFeedback?: PayFeedback; // Vendor feedback on price
  counterOffers?: CounterOffer[]; // Negotiation history
  
  // Specific fields for Moving
  truckNeeded?: boolean;
  distance?: string;
  
  // High Value / Insurance Logic
  hasHighValueItems?: boolean; // Client declares > $1000 items
  preWorkPhotos?: string[];    // Provider uploads proof of condition BEFORE work
  insuranceOptIn?: boolean;    // Provider opts-in for daily insurance
  
  // Historical Snapshots (Locked at time of claim)
  appliedInsuranceFee?: number; 
  appliedPlatformFee?: number; 
  
  photos?: string[];     // URLs or Base64 strings of attached job photos (Initial request)
  completionPhotos?: string[]; // URLs or Base64 strings of proof of work (Completion)
  
  // Verification Location
  completionLat?: number;
  completionLng?: number;
  checkInLat?: number;
  checkInLng?: number;

  // Job Completion Fields
  providerFeedback?: string; // Notes from the worker
  completedAt?: Date;
  checkInTime?: Date;
  
  // Provider Tracking
  enRouteAt?: Date; // When provider clicked "Start Travel"
  
  // Client Verification Fields
  clientRating?: number; // 1-5 Stars
  clientFeedback?: string;
  clientConfirmedAt?: Date;
  
  // Photos
  photos?: string[];     // URLs or Base64 strings of attached job photos (Initial request)
  completionPhotos?: string[]; // URLs or Base64 strings of proof of work (Completion)
  arrivalPhotos?: string[]; // URLs or Base64 strings of arrival photos (Check-in)
}

export interface Message {
  id: string;
  shiftId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

// Deprecated but kept for type safety in legacy components if any
export interface TimeEntry {
  id: string;
  userId: string;
  shiftId?: string; 
  clockIn: Date;
  clockOut?: Date;
  clockInLat: number;
  clockInLng: number;
  clockOutLat?: number;
  clockOutLng?: number;
  isFlagged: boolean; 
  managerApproved: boolean;
  rejectionReason?: string;
}

export interface JobPosting {
  id: string;
  orgId: string;
  title: string;
  description: string;
  payRange: string;
  isPublic: boolean;
  status: 'OPEN' | 'CLOSED';
  createdAt: Date;
}

export interface JobApplication {
  id: string;
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  experience: string;
  status: 'NEW' | 'REVIEWING' | 'INTERVIEWING' | 'OFFER_SENT' | 'HIRED' | 'REJECTED';
  appliedAt: Date;
  message?: string;
  resume?: string; // Base64 or URL
}

export interface AuditLog {
  id: string;
  targetUserId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
  performedBy: string;
}

export interface Notification {
  id: string;
  targetUserId: string; 
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface Referral {
  id: string;
  referrerUserId: string; // The existing user who referred
  referredUserId: string; // The new user
  codeUsed: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  createdAt: Date;
  payoutAmount: number;
  programType: 'CLIENT_REFERRAL' | 'PRO_REFERRAL';
}

export interface FeeBreakdown {
  grossAmount: number;
  platformFee: number;
  insuranceFee: number;
  providerNet: number;
  taxHoldbackEstimate: number; // Optional: helps the Pro plan for taxes
  markupPercentage?: number;
}

export interface MarketRates {
  commissionRate: number; // e.g., 0.10 for 10%
  insuranceFlatFee: number; // e.g., 2.00
  isHighRisk: boolean;
}

// Support & Legal
export interface LegalDocument {
  id: string;
  title: string;
  content: string; // HTML or Markdown string
  lastUpdated: Date;
  category: 'TERMS' | 'PRIVACY' | 'LIABILITY' | 'OTHER';
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}
