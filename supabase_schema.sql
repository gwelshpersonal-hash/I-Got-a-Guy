-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table (Matches User interface)
create table public.users (
  id text primary key,
  "orgId" text not null,
  name text not null,
  email text not null,
  role text not null,
  "staffType" text,
  "hourlyRate" numeric default 0,
  "isActive" boolean default true,
  phone text,
  "verificationStatus" text,
  "companyName" text,
  "profileImage" text,
  skills text[],
  "pendingSkills" text[],
  rating numeric,
  "jobsCompleted" integer default 0,
  "vendorType" text,
  "stripeAccountId" text,
  "hasPaymentMethod" boolean default false,
  "hasTaxW9" boolean default false,
  "urgentAlertsEnabled" boolean default false,
  address text,
  latitude numeric,
  longitude numeric,
  "insuranceType" text,
  "coiUrl" text,
  "isCoiVerified" boolean default false,
  "coiExpiry" timestamptz,
  "createdAt" timestamptz default now()
);

-- Sites Table
create table public.sites (
  id text primary key,
  "orgId" text not null,
  name text not null,
  address text not null,
  latitude numeric not null,
  longitude numeric not null,
  "radiusMeters" numeric not null,
  "createdAt" timestamptz default now()
);

-- Shifts Table
create table public.shifts (
  id text primary key,
  "userId" text references public.users(id),
  "clientId" text references public.users(id),
  "siteId" text references public.sites(id),
  start timestamptz not null,
  "end" timestamptz not null,
  description text not null,
  category text not null,
  status text not null,
  "isRecurring" boolean default false,
  type text,
  price numeric,
  
  -- Financials
  "isPaid" boolean default false,
  "escrowStatus" text,
  "isDisputed" boolean default false,
  "disputeReason" text,
  "refundAmount" numeric,
  "resolutionNotes" text,
  "stripePaymentIntentId" text,
  "payoutTimestamp" text, -- Keeping as text to match ISO string in types
  
  "isBoosted" boolean default false,
  "payFeedback" jsonb,
  "counterOffers" jsonb,
  
  -- Moving specific
  "truckNeeded" boolean,
  distance text,
  
  -- Insurance
  "hasHighValueItems" boolean default false,
  "preWorkPhotos" text[],
  "insuranceOptIn" boolean default false,
  "appliedInsuranceFee" numeric,
  "appliedPlatformFee" numeric,
  
  -- Photos & Location
  photos text[],
  "completionPhotos" text[],
  "arrivalPhotos" text[],
  "completionLat" numeric,
  "completionLng" numeric,
  "checkInLat" numeric,
  "checkInLng" numeric,
  
  -- Feedback
  "providerFeedback" text,
  "completedAt" timestamptz,
  "checkInTime" timestamptz,
  "enRouteAt" timestamptz,
  "clientRating" numeric,
  "clientFeedback" text,
  "clientConfirmedAt" timestamptz,
  
  "createdAt" timestamptz default now()
);

-- Job Postings
create table public.job_postings (
  id text primary key,
  "orgId" text not null,
  title text not null,
  description text not null,
  "payRange" text not null,
  "isPublic" boolean default true,
  status text not null,
  "createdAt" timestamptz default now()
);

-- Job Applications
create table public.job_applications (
  id text primary key,
  "jobId" text references public.job_postings(id) on delete cascade,
  "candidateName" text not null,
  "candidateEmail" text not null,
  "candidatePhone" text not null,
  experience text not null,
  status text not null,
  message text,
  resume text,
  "appliedAt" timestamptz default now()
);

-- Notifications
create table public.notifications (
  id text primary key,
  "targetUserId" text references public.users(id),
  type text not null,
  message text not null,
  read boolean default false,
  timestamp timestamptz default now()
);

-- Referrals
create table public.referrals (
  id text primary key,
  "referrerUserId" text references public.users(id),
  "referredUserId" text references public.users(id),
  "codeUsed" text not null,
  status text not null,
  "payoutAmount" numeric not null,
  "programType" text not null,
  "createdAt" timestamptz default now()
);

-- Messages
create table public.messages (
  id text primary key,
  "shiftId" text references public.shifts(id),
  "senderId" text references public.users(id),
  content text not null,
  read boolean default false,
  timestamp timestamptz default now()
);

-- Platform Config
create table public.platform_config (
  category text primary key,
  config jsonb not null
);

-- Legal Documents
create table public.legal_documents (
  id text primary key,
  title text not null,
  content text not null,
  category text not null,
  "lastUpdated" timestamptz default now()
);

-- FAQs
create table public.faqs (
  id text primary key,
  question text not null,
  answer text not null,
  "order" integer not null
);

-- RLS Policies
alter table public.users enable row level security;
create policy "Public access for demo" on public.users for all using (true);

alter table public.sites enable row level security;
create policy "Public access for demo" on public.sites for all using (true);

alter table public.shifts enable row level security;
create policy "Public access for demo" on public.shifts for all using (true);

alter table public.job_postings enable row level security;
create policy "Public access for demo" on public.job_postings for all using (true);

alter table public.job_applications enable row level security;
create policy "Public access for demo" on public.job_applications for all using (true);

alter table public.notifications enable row level security;
create policy "Public access for demo" on public.notifications for all using (true);

alter table public.referrals enable row level security;
create policy "Public access for demo" on public.referrals for all using (true);

alter table public.messages enable row level security;
create policy "Public access for demo" on public.messages for all using (true);

alter table public.platform_config enable row level security;
create policy "Public access for demo" on public.platform_config for all using (true);

alter table public.legal_documents enable row level security;
create policy "Public access for demo" on public.legal_documents for all using (true);

alter table public.faqs enable row level security;
create policy "Public access for demo" on public.faqs for all using (true);
