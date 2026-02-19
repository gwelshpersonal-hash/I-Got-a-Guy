import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Shift, Site, Notification, JobPosting, JobApplication, Role, Referral, Message, PlatformConfig, ServiceCategory, ShiftStatus, LegalDocument, FaqItem } from '../types';
import { MOCK_USERS, MOCK_SHIFTS, MOCK_SITES, MOCK_JOBS, MOCK_APPLICATIONS, ALL_SERVICE_CATEGORIES, CATEGORY_RISK_MAPPING, INSURANCE_FEES, RISK_LEVELS } from '../constants';
import { sendSMS, sendEmail, sendPush } from '../services/notificationService';
import { differenceInHours, subDays } from 'date-fns';
import { calculateJobSplit } from '../utils/feeEngine'; // Import Fee Engine

interface DataContextType {
  users: User[];
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  
  sites: Site[];
  addSite: (site: Site) => void;
  updateSite: (site: Site) => void;
  deleteSite: (id: string) => void;

  shifts: Shift[];
  addShift: (shift: Shift) => void;
  updateShift: (shift: Shift) => void;
  claimGig: (gigId: string, providerId: string, options: { insuranceOptIn: boolean, estimatedInsuranceFee: number, platformFeePercent: number }) => Promise<void>;
  verifyJob: (jobId: string, review: { rating: number, feedback: string }) => Promise<void>;
  seedMarketData: () => void;

  notifications: Notification[];
  addNotification: (note: Notification) => void;
  markNotificationsRead: (userId: string) => void;
  broadcastNotification: (userIds: string[], message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT') => void;

  // Recruitment
  jobs: JobPosting[];
  addJob: (job: JobPosting) => void;
  updateJob: (job: JobPosting) => void;
  deleteJob: (id: string) => void;
  applications: JobApplication[];
  submitApplication: (app: JobApplication) => void;
  updateApplication: (app: JobApplication) => void;

  // Referrals
  referrals: Referral[];
  addReferral: (referral: Referral) => void;
  updateReferral: (referral: Referral) => void;
  isReferralEnabled: boolean;
  toggleReferralProgram: (enabled: boolean) => void;

  // Messaging
  messages: Message[];
  sendMessage: (shiftId: string, senderId: string, content: string) => void;

  // Platform Config (Fees & Gating)
  platformConfig: PlatformConfig;
  updatePlatformConfig: (newConfig: PlatformConfig) => void;

  // Support & Legal
  legalDocuments: LegalDocument[];
  updateLegalDocument: (doc: LegalDocument) => void;
  faqs: FaqItem[];
  addFaq: (faq: FaqItem) => void;
  updateFaq: (faq: FaqItem) => void;
  deleteFaq: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY_SHIFTS = 'iw_shifts';
const STORAGE_KEY_REF_ENABLED = 'iw_referral_enabled';
const STORAGE_KEY_MESSAGES = 'iw_messages';
const STORAGE_KEY_JOBS = 'iw_jobs';
const STORAGE_KEY_CONFIG = 'iw_platform_config';
const STORAGE_KEY_LEGAL = 'iw_legal_docs';
const STORAGE_KEY_FAQS = 'iw_faqs';

// Default Platform Config
// Updated to 15% Platform Fee Standard
const DEFAULT_PLATFORM_CONFIG: PlatformConfig = ALL_SERVICE_CATEGORIES.reduce((acc, cat) => {
    // Determine fee based on risk mapping
    const mapping = CATEGORY_RISK_MAPPING[cat];
    const riskLevel = mapping ? mapping.risk : RISK_LEVELS.LOW;
    const insuranceFee = INSURANCE_FEES[riskLevel] || 2.00;

    acc[cat] = { 
        platformFeePercent: 15, // Updated to 15%
        insuranceRule: { type: 'FLAT', value: insuranceFee },
        requiresInsurance: false 
    };
    return acc;
}, {} as PlatformConfig);

// Initial Mock Legal Data
const DEFAULT_LEGAL_DOCS: LegalDocument[] = [
    {
        id: 'terms_1',
        title: 'Terms of Service',
        category: 'TERMS',
        lastUpdated: new Date('2024-01-01'),
        content: `1. Acceptance of Terms\nBy accessing and using "I Got A Guy!", you accept and agree to be bound by the terms and provision of this agreement.\n\n2. User Responsibilities\nClients are responsible for providing accurate job descriptions and safe working environments. Providers are responsible for performing services with due care and skill.\n\n3. Payments\nAll payments are processed securely via Stripe. "I Got A Guy!" facilitates the transaction but is not a party to the direct contract between Client and Provider.`
    },
    {
        id: 'privacy_1',
        title: 'Privacy Policy',
        category: 'PRIVACY',
        lastUpdated: new Date('2024-01-01'),
        content: `1. Data Collection\nWe collect personal information necessary to facilitate services, including name, phone number, email, and location data for geolocation features.\n\n2. Data Usage\nYour data is used to match Clients with Providers and to process payments. We do not sell your personal data to third parties.\n\n3. Location Services\nWe track Provider location only during active "En Route" and "In Progress" job states to ensure safety and transparency.`
    },
    {
        id: 'liability_1',
        title: 'Liability Waiver',
        category: 'LIABILITY',
        lastUpdated: new Date('2024-01-01'),
        content: `1. Limitation of Liability\n"I Got A Guy!" is a platform connecting independent contractors with clients. We are not liable for damages arising from the performance of services.\n\n2. Insurance\nProviders participating in the "Daily Shield" program are covered by limited general liability insurance for the duration of the job. Providers using their own insurance must maintain valid COI.`
    }
];

const DEFAULT_FAQS: FaqItem[] = [
    {
        id: 'faq_1',
        question: "How do I get paid?",
        answer: "Payments are processed weekly on Fridays for all completed gigs. Ensure your bank details are updated in your profile.",
        order: 1
    },
    {
        id: 'faq_2',
        question: "How do I verify my account?",
        answer: "After signing up, an Admin will review your application. You may be contacted for additional documentation regarding your skills and insurance.",
        order: 2
    },
    {
        id: 'faq_3',
        question: "Can I cancel a gig?",
        answer: "Yes, but please try to give at least 24 hours notice. Frequent cancellations may affect your rating and ability to claim future gigs.",
        order: 3
    },
    {
        id: 'faq_4',
        question: "Is there insurance provided?",
        answer: "I Got A Guy Platform provides general liability for verified Pros while on active clock-in status via the Daily Shield program. See terms for details.",
        order: 4
    }
];

// Helper for seeding data
const SAMPLE_JOBS: Partial<Record<ServiceCategory, { desc: string, min: number, max: number }[]>> = {
    'MOVING': [
        { desc: "Move 1-bedroom apartment locally", min: 150, max: 300 },
        { desc: "Help move heavy piano to second floor", min: 100, max: 200 },
        { desc: "Unload rental truck (2 hours)", min: 80, max: 150 },
        { desc: "Move sofa and fridge to new house", min: 60, max: 120 }
    ],
    'PLUMBING': [
        { desc: "Fix leaking kitchen sink", min: 80, max: 150 },
        { desc: "Replace garbage disposal", min: 100, max: 180 },
        { desc: "Unclog main drain line", min: 150, max: 250 },
        { desc: "Install new toilet", min: 120, max: 200 }
    ],
    'HANDYMAN': [
        { desc: "Mount 65-inch TV on brick wall", min: 60, max: 100 },
        { desc: "Assemble IKEA furniture (Wardrobe)", min: 80, max: 150 },
        { desc: "Repair drywall hole and paint", min: 75, max: 150 },
        { desc: "Hang heavy mirror and artwork", min: 50, max: 90 }
    ],
    'LANDSCAPING': [
        { desc: "Mow and edge front and back lawn", min: 50, max: 80 },
        { desc: "Weed garden beds and trim hedges", min: 100, max: 200 },
        { desc: "Leaf removal for large yard", min: 120, max: 250 },
        { desc: "Spread mulch (mulch provided)", min: 80, max: 160 }
    ]
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [sites, setSites] = useState<Site[]>(MOCK_SITES);
  
  // Initialize Shifts from LocalStorage to persist status updates
  const [shifts, setShifts] = useState<Shift[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_SHIFTS);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              return parsed.map((s: any) => ({
                  ...s,
                  start: new Date(s.start),
                  end: new Date(s.end),
                  completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
                  clientConfirmedAt: s.clientConfirmedAt ? new Date(s.clientConfirmedAt) : undefined,
                  createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
                  enRouteAt: s.enRouteAt ? new Date(s.enRouteAt) : undefined
              }));
          } catch (e) {
              console.error("Failed to parse shifts", e);
              return MOCK_SHIFTS;
          }
      }
      return MOCK_SHIFTS;
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Jobs & Applications State (Now Persisted)
  const [jobs, setJobs] = useState<JobPosting[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_JOBS);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              return parsed.map((j: any) => ({
                  ...j,
                  createdAt: new Date(j.createdAt)
              }));
          } catch (e) {
              return MOCK_JOBS;
          }
      }
      return MOCK_JOBS;
  });

  const [applications, setApplications] = useState<JobApplication[]>(MOCK_APPLICATIONS);

  // Referrals State
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isReferralEnabled, setIsReferralEnabled] = useState<boolean>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_REF_ENABLED);
      return saved !== null ? JSON.parse(saved) === true : true;
  });

  const toggleReferralProgram = (enabled: boolean) => {
      setIsReferralEnabled(enabled);
      localStorage.setItem(STORAGE_KEY_REF_ENABLED, JSON.stringify(enabled));
  };

  // Messages State
  const [messages, setMessages] = useState<Message[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              return parsed.map((m: any) => ({
                  ...m,
                  timestamp: new Date(m.timestamp)
              }));
          } catch (e) {
              return [];
          }
      }
      return [];
  });

  // Config State
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
          try {
              // Merge with default to ensure all keys exist if categories change
              return { ...DEFAULT_PLATFORM_CONFIG, ...JSON.parse(saved) };
          } catch (e) {
              return DEFAULT_PLATFORM_CONFIG;
          }
      }
      return DEFAULT_PLATFORM_CONFIG;
  });

  const updatePlatformConfig = (newConfig: PlatformConfig) => {
      setPlatformConfig(newConfig);
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
  };

  // Legal & FAQ State
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_LEGAL);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              return parsed.map((d: any) => ({ ...d, lastUpdated: new Date(d.lastUpdated)}));
          } catch(e) { return DEFAULT_LEGAL_DOCS; }
      }
      return DEFAULT_LEGAL_DOCS;
  });

  const [faqs, setFaqs] = useState<FaqItem[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_FAQS);
      if (saved) {
          try {
              return JSON.parse(saved);
          } catch(e) { return DEFAULT_FAQS; }
      }
      return DEFAULT_FAQS;
  });

  const updateLegalDocument = (doc: LegalDocument) => {
      const updatedDocs = legalDocuments.map(d => d.id === doc.id ? {...doc, lastUpdated: new Date()} : d);
      setLegalDocuments(updatedDocs);
      localStorage.setItem(STORAGE_KEY_LEGAL, JSON.stringify(updatedDocs));
  };

  const addFaq = (faq: FaqItem) => {
      const newFaqs = [...faqs, faq];
      setFaqs(newFaqs);
      localStorage.setItem(STORAGE_KEY_FAQS, JSON.stringify(newFaqs));
  };

  const updateFaq = (faq: FaqItem) => {
      const newFaqs = faqs.map(f => f.id === faq.id ? faq : f);
      setFaqs(newFaqs);
      localStorage.setItem(STORAGE_KEY_FAQS, JSON.stringify(newFaqs));
  };

  const deleteFaq = (id: string) => {
      const newFaqs = faqs.filter(f => f.id !== id);
      setFaqs(newFaqs);
      localStorage.setItem(STORAGE_KEY_FAQS, JSON.stringify(newFaqs));
  };

  // Seed Market Data Function
  const seedMarketData = () => {
      const newShifts: Shift[] = [];
      const categories = Object.keys(SAMPLE_JOBS) as ServiceCategory[];
      
      // Provider IDs to assign randomly
      const providerIds = users.filter(u => u.role === Role.PROVIDER).map(u => u.id);
      if (providerIds.length === 0) providerIds.push('user_2'); // Fallback to Bob

      categories.forEach(cat => {
          const templates = SAMPLE_JOBS[cat] || [];
          // Create 10 entries per category
          for(let i=0; i<10; i++) {
              const template = templates[Math.floor(Math.random() * templates.length)];
              const price = Math.floor(Math.random() * (template.max - template.min + 1)) + template.min;
              const daysAgo = Math.floor(Math.random() * 30) + 1; // Last 30 days
              const completedDate = subDays(new Date(), daysAgo);
              const providerId = providerIds[Math.floor(Math.random() * providerIds.length)];

              newShifts.push({
                  id: `seed_${cat}_${Date.now()}_${i}`,
                  userId: providerId,
                  clientId: 'user_1', // Alice
                  siteId: 'site_1',
                  start: completedDate,
                  end: new Date(completedDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
                  description: template.desc,
                  category: cat,
                  status: ShiftStatus.VERIFIED, // Fully completed
                  isRecurring: false,
                  price: price,
                  isPaid: true,
                  escrowStatus: 'RELEASED',
                  completedAt: completedDate,
                  clientRating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
                  createdAt: subDays(completedDate, 2)
              });
          }
      });

      setShifts(prev => [...prev, ...newShifts]);
  };

  // Persist shifts whenever they change
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
  }, [shifts]);

  // Persist jobs whenever they change
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(jobs));
  }, [jobs]);

  // Persist messages
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  // --- INTERNAL WEBHOOK SIMULATOR ---
  // Mimics api/stripe-webhook.ts logic in the frontend
  const simulateStripeWebhook = (event: { type: string, data: any }) => {
      const { type, data } = event;
      const object = data.object;
      const jobId = object.metadata.jobId;

      console.log(`%c[WEBHOOK] ${type} for Job: ${jobId}`, "background: #222; color: #bada55; font-weight: bold; padding: 2px 5px;");

      setShifts(prev => prev.map(s => {
          if (s.id !== jobId) return s;

          switch (type) {
              case 'payment_intent.amount_capturable_updated':
                  return {
                      ...s,
                      escrowStatus: 'SECURED',
                      stripePaymentIntentId: object.id
                  };
              case 'transfer.created':
                  return {
                      ...s,
                      escrowStatus: 'RELEASED',
                      payoutTimestamp: new Date().toISOString(),
                      isPaid: true
                  };
              case 'payment_intent.payment_failed':
                  // Trigger risk alert
                  broadcastNotification(
                      users.filter(u => u.role === Role.ADMIN).map(u => u.id), 
                      `Payment FAILED for Job ${s.description}`, 
                      'ALERT'
                  );
                  return s;
              default:
                  return s;
          }
      }));
  };

  // --- Silent Release & Auto Logic ---
  useEffect(() => {
      const checkSilentRelease = async () => {
          // Identify jobs COMPLETED > 48h ago that are NOT Disputed and NOT Verified
          const now = new Date();
          const autoReleaseJobs = shifts.filter(s => 
              s.status === ShiftStatus.COMPLETED && 
              s.completedAt && 
              differenceInHours(now, s.completedAt) > 48 &&
              !s.isDisputed && // Kill Switch Check
              s.escrowStatus === 'SECURED' // Funds waiting to be moved
          );

          if (autoReleaseJobs.length > 0) {
              console.log(`[Silent Release] Triggering capture for ${autoReleaseJobs.length} jobs.`);
              
              for (const job of autoReleaseJobs) {
                  // Fee Calculation for Stripe Split
                  // We need the exact amount to capture and the amount to keep as app fee
                  // Re-calculate the split to ensure backend accuracy
                  const breakdown = calculateJobSplit(job.price || 0, job.category, !job.insuranceOptIn);
                  
                  // Total Application Fee = Platform Fee + Insurance Fee
                  const applicationFeeAmount = Math.round((breakdown.platformFee + breakdown.insuranceFee) * 100); // cents

                  console.log(`[Backend Call] POST /api/capture-payment for Job ${job.id}`);
                  console.log(` > Payload: { paymentIntentId: '${job.stripePaymentIntentId}', application_fee_amount: ${applicationFeeAmount} }`);

                  // Simulate API Latency
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  // Simulate Webhook Response from Stripe
                  simulateStripeWebhook({
                      type: 'transfer.created',
                      data: {
                          object: {
                              id: `tr_${Date.now()}_silent`,
                              metadata: { jobId: job.id }
                          }
                      }
                  });

                  // Update frontend status to Verified as well (platform logic)
                  updateShift({ 
                      ...job, 
                      status: ShiftStatus.VERIFIED,
                      clientFeedback: 'Auto-verified by system (48h timeout)',
                      clientConfirmedAt: now
                  });

                  // Notify Provider
                  if (job.userId) {
                      addNotification({
                          id: `auto_rel_${Date.now()}_${job.id}`,
                          targetUserId: job.userId,
                          type: 'SUCCESS',
                          message: `Funds Released: ${job.description} was auto-verified after 48h.`,
                          timestamp: now,
                          read: false
                      });
                  }
              }
          }
      };

      // Run check on mount and every minute
      checkSilentRelease();
      const interval = setInterval(checkSilentRelease, 60000);
      return () => clearInterval(interval);
  }, [shifts]);

  // User Actions
  const addUser = (user: User) => setUsers(prev => [...prev, user]);
  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  // Site Actions
  const addSite = (site: Site) => setSites(prev => [...prev, site]);
  const updateSite = (site: Site) => setSites(prev => prev.map(s => s.id === site.id ? site : s));
  const deleteSite = (id: string) => setSites(prev => prev.filter(s => s.id !== id));

  // Shift Actions
  const addShift = (shift: Shift) => setShifts(prev => [...prev, shift]);
  
  // Audit Point B: The "Stripe Handshake"
  const claimGig = async (gigId: string, providerId: string, options: { insuranceOptIn: boolean, estimatedInsuranceFee: number, platformFeePercent: number }) => {
      
      const provider = users.find(u => u.id === providerId);
      // Backend Check: Does provider have a connected account?
      if (!provider?.stripeAccountId) {
          throw new Error("Payout method missing. Please connect your bank account in Profile > Payout Method before claiming jobs.");
      }

      // --- TAX COMPLIANCE CHECK (2026 Circuit Breaker) ---
      // Check YTD earnings. If > $1,800 and no tax info, block.
      const currentYear = new Date().getFullYear();
      const providerCompletedJobs = shifts.filter(s => 
          s.userId === providerId && 
          (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED) &&
          (s.completedAt ? new Date(s.completedAt).getFullYear() === currentYear : false)
      );
      
      const ytdNet = providerCompletedJobs.reduce((acc, job) => {
          const breakdown = calculateJobSplit(job.price || 0, job.category, !job.insuranceOptIn);
          return acc + breakdown.providerNet;
      }, 0);

      // Warning threshold is 1800 to warn before hitting the 2000 requirement hard stop in reality,
      // but prompt says "If a Guy's ytdEarnings exceeds $1,800, the system must block further claims"
      if (ytdNet > 1800 && !provider.hasTaxW9) {
          throw new Error("Tax Compliance Hold: Your YTD earnings have exceeded $1,800. Please upload your tax information in the Tax Center to continue claiming jobs.");
      }

      // 1. Simulate API Latency
      await new Promise(resolve => setTimeout(resolve, 1500));

      const job = shifts.find(s => s.id === gigId);
      if (!job) throw new Error("Job not found");

      console.log(`[Backend Call] POST /api/create-hold`);
      console.log(` > Body: { jobId: '${gigId}', providerId: '${providerId}', amount: ${job.price}, destination: '${provider.stripeAccountId}' }`);

      // 2. Simulate Payment Logic
      const isCardValid = Math.random() > 0.05; // 5% chance of failure

      if (!isCardValid) {
          // Simulate Payment Failed Webhook event for auditing
          simulateStripeWebhook({
              type: 'payment_intent.payment_failed',
              data: { object: { metadata: { jobId: gigId } } }
          });
          throw new Error("Client payment method declined. Funds could not be secured.");
      }

      // Simulate getting a clientSecret back
      const mockClientSecret = `pi_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`;
      console.log(` > Response: { clientSecret: '${mockClientSecret}' }`);

      // 3. Pre-update state logic (Provider assignment etc)
      setShifts(prev => prev.map(s => {
          if (s.id === gigId) {
              const updatedShift: Shift = {
                  ...s,
                  userId: providerId,
                  status: ShiftStatus.ACCEPTED,
                  insuranceOptIn: options.insuranceOptIn,
                  appliedInsuranceFee: options.estimatedInsuranceFee,
                  appliedPlatformFee: options.platformFeePercent,
                  // Escrow status will be updated by webhook simulation
              };
              
              // Trigger Transaction Loop Notification
              const client = users.find(u => u.id === s.clientId);
              
              if (client && provider) {
                  sendSMS(client.phone, `Good news! ${provider.name} has claimed your job "${s.description}". Funds are now secured in escrow.`);
                  sendEmail(client.email, "Receipt: Funds Secured", `Your payment for "${s.description}" is held securely. It will not be released until you verify the work.`);
              }

              return updatedShift;
          }
          return s;
      }));

      // 4. Simulate Successful Webhook Trigger (Handshake confirmed)
      simulateStripeWebhook({
          type: 'payment_intent.amount_capturable_updated',
          data: {
              object: {
                  id: mockClientSecret.split('_secret')[0], // Extract ID from secret
                  metadata: { jobId: gigId },
                  amount_capturable: (job.price || 0) * 100 // cents
              }
          }
      });
  };

  const verifyJob = async (jobId: string, review: { rating: number, feedback: string }) => {
      const job = shifts.find(s => s.id === jobId);
      if (!job) throw new Error("Job not found");

      // 1. Simulate API Latency
      console.log(`[Backend Call] POST /api/verify-job for Job ${jobId}`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 2. Simulate Stripe Transfer (Release Funds)
      simulateStripeWebhook({
          type: 'transfer.created',
          data: {
              object: {
                  id: `tr_${Date.now()}_verified`,
                  metadata: { jobId: jobId }
              }
          }
      });

      // 3. Update Job Status & Save Review in Frontend State
      setShifts(prev => prev.map(s => {
          if (s.id === jobId) {
              return {
                  ...s,
                  status: ShiftStatus.VERIFIED,
                  clientRating: review.rating,
                  clientFeedback: review.feedback,
                  clientConfirmedAt: new Date(),
                  // Ensure financial flags are consistent
                  escrowStatus: 'RELEASED',
                  isPaid: true,
                  payoutTimestamp: new Date().toISOString()
              };
          }
          return s;
      }));

      // 4. Notification
      if (job.userId) {
          addNotification({
              id: `verify_${Date.now()}`,
              targetUserId: job.userId,
              type: 'SUCCESS',
              message: `Job Verified! Funds released for "${job.description}". Rating: ${review.rating} Stars.`,
              timestamp: new Date(),
              read: false
          });
      }
  };

  const updateShift = (shift: Shift) => {
      const oldShift = shifts.find(s => s.id === shift.id);
      setShifts(prev => prev.map(s => s.id === shift.id ? shift : s));

      // --- Transaction Transparency Loop Notifications ---
      if (!oldShift) return;

      const client = users.find(u => u.id === shift.clientId);
      const provider = users.find(u => u.id === shift.userId);

      const timestamp = new Date();

      // 1. En Route (ACCEPTED -> EN_ROUTE)
      if (oldShift.status !== 'EN_ROUTE' && shift.status === 'EN_ROUTE' && client && provider) {
          sendPush(client.id, "Provider En Route", `${provider.name} is on the way! Track them in the app.`);
          sendSMS(client.phone, `${provider.name} is en route to ${shift.category}. ETA: 15 mins.`);
          addNotification({
              id: `notif_${Date.now()}_enroute`,
              targetUserId: client.id,
              type: 'INFO',
              message: `${provider.name} is on the way.`,
              timestamp,
              read: false
          });
      }

      // 2. Job Completed (EN_ROUTE/IN_PROGRESS -> COMPLETED)
      if (oldShift.status !== 'COMPLETED' && shift.status === 'COMPLETED' && client) {
          sendPush(client.id, "Job Complete", "Your provider has marked the job as complete. Please verify.");
          sendSMS(client.phone, `Work is done! Please review photos and release payment for "${shift.description}" within 24 hours.`);
          sendEmail(client.email, "Action Required: Verify Work", "Your provider has marked the job as complete. Please review the proof of work photos and release the funds.");
          addNotification({
              id: `notif_${Date.now()}_complete`,
              targetUserId: client.id,
              type: 'SUCCESS',
              message: `Job Completed: ${shift.description}. Please verify to release funds.`,
              timestamp,
              read: false
          });
      }

      // 3. Funds Released / Verified (VERIFIED -> RELEASED)
      if (oldShift.escrowStatus !== 'RELEASED' && shift.escrowStatus === 'RELEASED' && provider) {
          sendPush(provider.id, "You got paid!", `Success! Payment for "${shift.description}" has been released to your Stripe account.`);
          addNotification({
              id: `notif_${Date.now()}_paid`,
              targetUserId: provider.id,
              type: 'SUCCESS',
              message: `Payment Released: $${shift.price} for ${shift.description}.`,
              timestamp,
              read: false
          });
      }

      // 4. Dispute Filed (False -> True)
      if (!oldShift.isDisputed && shift.isDisputed) {
          // Notify Provider
          if (provider) {
              sendPush(provider.id, "Payout Paused", `A dispute was filed for ${shift.description}. Funds are frozen.`);
              addNotification({
                  id: `dispute_${Date.now()}_prov`,
                  targetUserId: provider.id,
                  type: 'ALERT',
                  message: `DISPUTE FILED: Payout paused for "${shift.description}". Reason: ${shift.disputeReason}`,
                  timestamp,
                  read: false
              });
          }
          // Notify Client (Confirmation)
          if (client) {
              addNotification({
                  id: `dispute_${Date.now()}_cli`,
                  targetUserId: client.id,
                  type: 'INFO',
                  message: `Dispute Submitted for "${shift.description}". An admin will review shortly.`,
                  timestamp,
                  read: false
              });
          }
      }

      // 5. Dispute Resolved (True -> False)
      if (oldShift.isDisputed && !shift.isDisputed) {
          const outcome = shift.refundAmount && shift.refundAmount > 0 ? `Refund Issued: $${shift.refundAmount}` : "Dispute Dismissed";
          // Notify Provider
          if (provider) {
              addNotification({
                  id: `resolve_${Date.now()}_prov`,
                  targetUserId: provider.id,
                  type: 'SUCCESS',
                  message: `Dispute Resolved: ${outcome}. Check your earnings.`,
                  timestamp,
                  read: false
              });
          }
          // Notify Client
          if (client) {
              addNotification({
                  id: `resolve_${Date.now()}_cli`,
                  targetUserId: client.id,
                  type: 'SUCCESS',
                  message: `Dispute Closed: ${outcome}. Notes: ${shift.resolutionNotes}`,
                  timestamp,
                  read: false
              });
          }
      }
  };

  // Notification Actions
  const addNotification = (note: Notification) => setNotifications(prev => [note, ...prev]);
  
  const markNotificationsRead = (userId: string) => {
      setNotifications(prev => prev.map(n => 
          n.targetUserId === userId ? {...n, read: true} : n
      ));
  };

  const broadcastNotification = (userIds: string[], message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT') => {
      const newNotes: Notification[] = userIds.map(uid => ({
          id: `notif_${Date.now()}_${uid}`,
          targetUserId: uid,
          type,
          message,
          timestamp: new Date(),
          read: false
      }));
      setNotifications(prev => [...newNotes, ...prev]);
  };

  // Job Actions
  const addJob = (job: JobPosting) => setJobs(prev => [job, ...prev]);
  const updateJob = (job: JobPosting) => setJobs(prev => prev.map(j => j.id === job.id ? job : j));
  const deleteJob = (id: string) => setJobs(prev => prev.filter(j => j.id !== id));

  // Application Actions
  const submitApplication = (app: JobApplication) => {
      setApplications(prev => [app, ...prev]);
      const managers = users.filter(u => u.role === Role.MANAGER);
      const job = jobs.find(j => j.id === app.jobId);
      broadcastNotification(
          managers.map(m => m.id),
          `New Applicant: ${app.candidateName} for ${job?.title || 'Job'}`,
          'INFO'
      );
  };
  const updateApplication = (app: JobApplication) => setApplications(prev => prev.map(a => a.id === app.id ? app : a));

  // Referral Actions
  const addReferral = (referral: Referral) => setReferrals(prev => [referral, ...prev]);
  const updateReferral = (referral: Referral) => setReferrals(prev => prev.map(r => r.id === referral.id ? referral : r));

  // Message Actions
  const sendMessage = (shiftId: string, senderId: string, content: string) => {
      const newMessage: Message = {
          id: `msg_${Date.now()}`,
          shiftId,
          senderId,
          content,
          timestamp: new Date(),
          read: false
      };
      setMessages(prev => [...prev, newMessage]);
  };

  return (
    <DataContext.Provider value={{ 
      users, addUser, updateUser, 
      sites, addSite, updateSite, deleteSite,
      shifts, addShift, updateShift, claimGig, verifyJob, seedMarketData,
      notifications, addNotification, markNotificationsRead, broadcastNotification,
      jobs, addJob, updateJob, deleteJob, applications, submitApplication, updateApplication,
      referrals, addReferral, updateReferral,
      isReferralEnabled, toggleReferralProgram,
      messages, sendMessage,
      platformConfig, updatePlatformConfig,
      legalDocuments, updateLegalDocument, faqs, addFaq, updateFaq, deleteFaq
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};