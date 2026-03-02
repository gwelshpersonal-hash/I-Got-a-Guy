import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Shift, Site, Notification, JobPosting, JobApplication, Role, Referral, Message, PlatformConfig, ServiceCategory, ShiftStatus, LegalDocument, FaqItem } from '../types';
import { MOCK_USERS, MOCK_SHIFTS, MOCK_SITES, MOCK_JOBS, MOCK_APPLICATIONS, ALL_SERVICE_CATEGORIES, CATEGORY_RISK_MAPPING, INSURANCE_FEES, RISK_LEVELS } from '../constants';
import { sendSMS, sendEmail, sendPush } from '../services/notificationService';
import { differenceInHours, subDays } from 'date-fns';
import { calculateJobSplit } from '../utils/feeEngine';
import { supabase } from '../lib/supabase';

interface DataContextType {
  users: User[];
  addUser: (user: User) => Promise<void>;
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

  isVendorSignupEnabled: boolean;
  toggleVendorSignup: (enabled: boolean) => void;

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
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Default Platform Config
const DEFAULT_PLATFORM_CONFIG: PlatformConfig = ALL_SERVICE_CATEGORIES.reduce((acc, cat) => {
    const mapping = CATEGORY_RISK_MAPPING[cat];
    const riskLevel = mapping ? mapping.risk : RISK_LEVELS.LOW;
    const insuranceFee = INSURANCE_FEES[riskLevel] || 3.00; 

    acc[cat] = { 
        platformFeePercent: 15, 
        insuranceRule: { type: 'FLAT', value: insuranceFee },
        requiresInsurance: false 
    };
    return acc;
}, {} as PlatformConfig);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  // Local state for toggles (could be moved to DB config table)
  const [isReferralEnabled, setIsReferralEnabled] = useState<boolean>(true);
  const [isVendorSignupEnabled, setIsVendorSignupEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
        try {
            const { data: usersData } = await supabase.from('users').select('*');
            if (usersData) setUsers(usersData);

            const { data: sitesData } = await supabase.from('sites').select('*');
            if (sitesData) setSites(sitesData);

            const { data: shiftsData } = await supabase.from('shifts').select('*');
            if (shiftsData) {
                // Parse dates
                const parsedShifts = shiftsData.map((s: any) => ({
                    ...s,
                    start: new Date(s.start),
                    end: new Date(s.end),
                    completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
                    clientConfirmedAt: s.clientConfirmedAt ? new Date(s.clientConfirmedAt) : undefined,
                    createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
                    enRouteAt: s.enRouteAt ? new Date(s.enRouteAt) : undefined
                }));
                setShifts(parsedShifts);
            }

            const { data: jobsData } = await supabase.from('job_postings').select('*');
            if (jobsData) {
                 const parsedJobs = jobsData.map((j: any) => ({
                    ...j,
                    createdAt: new Date(j.createdAt)
                 }));
                 setJobs(parsedJobs);
            }

            const { data: appsData } = await supabase.from('job_applications').select('*');
            if (appsData) {
                const parsedApps = appsData.map((a: any) => ({
                    ...a,
                    appliedAt: new Date(a.appliedAt)
                }));
                setApplications(parsedApps);
            }

            const { data: notifsData } = await supabase.from('notifications').select('*');
            if (notifsData) {
                const parsedNotifs = notifsData.map((n: any) => ({
                    ...n,
                    timestamp: new Date(n.timestamp)
                }));
                setNotifications(parsedNotifs);
            }
            
            const { data: refsData } = await supabase.from('referrals').select('*');
            if (refsData) setReferrals(refsData);

            const { data: msgsData } = await supabase.from('messages').select('*');
            if (msgsData) {
                 const parsedMsgs = msgsData.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));
                setMessages(parsedMsgs);
            }

            const { data: legalData } = await supabase.from('legal_documents').select('*');
            if (legalData) {
                 const parsedLegal = legalData.map((d: any) => ({
                    ...d,
                    lastUpdated: new Date(d.lastUpdated)
                }));
                setLegalDocuments(parsedLegal);
            }

            const { data: faqsData } = await supabase.from('faqs').select('*');
            if (faqsData) setFaqs(faqsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, []);

  // --- Actions ---

  const addUser = async (user: User) => {
      const { error } = await supabase.from('users').insert(user);
      if (!error) setUsers(prev => [...prev, user]);
      else console.error("Error adding user:", error);
  };

  const updateUser = async (updatedUser: User) => {
      const { error } = await supabase.from('users').update(updatedUser).eq('id', updatedUser.id);
      if (!error) setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      else console.error("Error updating user:", error);
  };

  const addSite = async (site: Site) => {
      const { error } = await supabase.from('sites').insert(site);
      if (!error) setSites(prev => [...prev, site]);
  };

  const updateSite = async (site: Site) => {
      const { error } = await supabase.from('sites').update(site).eq('id', site.id);
      if (!error) setSites(prev => prev.map(s => s.id === site.id ? site : s));
  };

  const deleteSite = async (id: string) => {
      const { error } = await supabase.from('sites').delete().eq('id', id);
      if (!error) setSites(prev => prev.filter(s => s.id !== id));
  };

  const addShift = async (shift: Shift) => {
      const { error } = await supabase.from('shifts').insert(shift);
      if (!error) setShifts(prev => [...prev, shift]);
      else console.error("Error adding shift:", error);
  };

  const updateShift = async (shift: Shift) => {
      const { error } = await supabase.from('shifts').update(shift).eq('id', shift.id);
      if (!error) {
          setShifts(prev => prev.map(s => s.id === shift.id ? shift : s));
          handleShiftNotifications(shift);
      } else {
          console.error("Error updating shift:", error);
      }
  };

  const handleShiftNotifications = (shift: Shift) => {
      const oldShift = shifts.find(s => s.id === shift.id);
      if (!oldShift) return;
      
      const client = users.find(u => u.id === shift.clientId);
      const provider = users.find(u => u.id === shift.userId);
      const timestamp = new Date();

      // 1. En Route
      if (oldShift.status !== 'EN_ROUTE' && shift.status === 'EN_ROUTE' && client && provider) {
          addNotification({
              id: `notif_${Date.now()}_enroute`,
              targetUserId: client.id,
              type: 'INFO',
              message: `${provider.name} is on the way.`,
              timestamp,
              read: false
          });
      }
      // 2. Completed
      if (oldShift.status !== 'COMPLETED' && shift.status === 'COMPLETED' && client) {
          addNotification({
              id: `notif_${Date.now()}_complete`,
              targetUserId: client.id,
              type: 'SUCCESS',
              message: `Job Completed: ${shift.description}. Please verify.`,
              timestamp,
              read: false
          });
      }
      // 3. Paid
      if (oldShift.escrowStatus !== 'RELEASED' && shift.escrowStatus === 'RELEASED' && provider) {
          addNotification({
              id: `notif_${Date.now()}_paid`,
              targetUserId: provider.id,
              type: 'SUCCESS',
              message: `Payment Released: $${shift.price} for ${shift.description}.`,
              timestamp,
              read: false
          });
      }
  };

  const addNotification = async (note: Notification) => {
      const { error } = await supabase.from('notifications').insert(note);
      if (!error) setNotifications(prev => [note, ...prev]);
  };

  const markNotificationsRead = async (userId: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('targetUserId', userId);
      if (!error) {
          setNotifications(prev => prev.map(n => n.targetUserId === userId ? {...n, read: true} : n));
      }
  };

  const broadcastNotification = async (userIds: string[], message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT') => {
      const newNotes: Notification[] = userIds.map(uid => ({
          id: `notif_${Date.now()}_${uid}`,
          targetUserId: uid,
          type,
          message,
          timestamp: new Date(),
          read: false
      }));
      const { error } = await supabase.from('notifications').insert(newNotes);
      if (!error) setNotifications(prev => [...newNotes, ...prev]);
  };

  const addJob = async (job: JobPosting) => {
      const { error } = await supabase.from('job_postings').insert(job);
      if (!error) setJobs(prev => [job, ...prev]);
  };

  const updateJob = async (job: JobPosting) => {
      const { error } = await supabase.from('job_postings').update(job).eq('id', job.id);
      if (!error) setJobs(prev => prev.map(j => j.id === job.id ? job : j));
  };

  const deleteJob = async (id: string) => {
      const { error } = await supabase.from('job_postings').delete().eq('id', id);
      if (!error) setJobs(prev => prev.filter(j => j.id !== id));
  };

  const submitApplication = async (app: JobApplication) => {
      const { error } = await supabase.from('job_applications').insert(app);
      if (!error) setApplications(prev => [app, ...prev]);
  };

  const updateApplication = async (app: JobApplication) => {
      const { error } = await supabase.from('job_applications').update(app).eq('id', app.id);
      if (!error) setApplications(prev => prev.map(a => a.id === app.id ? app : a));
  };

  const addReferral = async (referral: Referral) => {
      const { error } = await supabase.from('referrals').insert(referral);
      if (!error) setReferrals(prev => [referral, ...prev]);
  };

  const updateReferral = async (referral: Referral) => {
      const { error } = await supabase.from('referrals').update(referral).eq('id', referral.id);
      if (!error) setReferrals(prev => prev.map(r => r.id === referral.id ? referral : r));
  };

  const sendMessage = async (shiftId: string, senderId: string, content: string) => {
      const newMessage: Message = {
          id: `msg_${Date.now()}`,
          shiftId,
          senderId,
          content,
          timestamp: new Date(),
          read: false
      };
      const { error } = await supabase.from('messages').insert(newMessage);
      if (!error) setMessages(prev => [...prev, newMessage]);
  };

  const updatePlatformConfig = (newConfig: PlatformConfig) => {
      setPlatformConfig(newConfig);
      // In a real app, save to DB
  };

  const updateLegalDocument = async (doc: LegalDocument) => {
      const { error } = await supabase.from('legal_documents').update(doc).eq('id', doc.id);
      if (!error) setLegalDocuments(prev => prev.map(d => d.id === doc.id ? doc : d));
  };

  const addFaq = async (faq: FaqItem) => {
      const { error } = await supabase.from('faqs').insert(faq);
      if (!error) setFaqs(prev => [...prev, faq]);
  };

  const updateFaq = async (faq: FaqItem) => {
      const { error } = await supabase.from('faqs').update(faq).eq('id', faq.id);
      if (!error) setFaqs(prev => prev.map(f => f.id === faq.id ? faq : f));
  };

  const deleteFaq = async (id: string) => {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (!error) setFaqs(prev => prev.filter(f => f.id !== id));
  };

  const toggleReferralProgram = (enabled: boolean) => setIsReferralEnabled(enabled);
  const toggleVendorSignup = (enabled: boolean) => setIsVendorSignupEnabled(enabled);

  // --- Complex Actions (Claim/Verify) ---
  
  const claimGig = async (gigId: string, providerId: string, options: { insuranceOptIn: boolean, estimatedInsuranceFee: number, platformFeePercent: number }) => {
      const provider = users.find(u => u.id === providerId);
      if (!provider) throw new Error("Provider not found");

      // Optimistic Update
      const job = shifts.find(s => s.id === gigId);
      if (!job) throw new Error("Job not found");

      const updatedShift: Shift = {
          ...job,
          userId: providerId,
          status: ShiftStatus.ACCEPTED,
          insuranceOptIn: options.insuranceOptIn,
          appliedInsuranceFee: options.estimatedInsuranceFee,
          appliedPlatformFee: options.platformFeePercent,
          escrowStatus: 'SECURED', // Simulating instant secure for now
          stripePaymentIntentId: `pi_mock_${Date.now()}`
      };

      await updateShift(updatedShift);
      
      // Notify Client
      const client = users.find(u => u.id === job.clientId);
      if (client) {
          addNotification({
              id: `notif_${Date.now()}`,
              targetUserId: client.id,
              type: 'SUCCESS',
              message: `${provider.name} claimed your job!`,
              timestamp: new Date(),
              read: false
          });
      }
  };

  const verifyJob = async (jobId: string, review: { rating: number, feedback: string }) => {
      const job = shifts.find(s => s.id === jobId);
      if (!job) throw new Error("Job not found");

      const updatedShift: Shift = {
          ...job,
          status: ShiftStatus.VERIFIED,
          clientRating: review.rating,
          clientFeedback: review.feedback,
          clientConfirmedAt: new Date(),
          escrowStatus: 'RELEASED',
          isPaid: true,
          payoutTimestamp: new Date().toISOString()
      };

      await updateShift(updatedShift);

      if (job.userId) {
          addNotification({
              id: `verify_${Date.now()}`,
              targetUserId: job.userId,
              type: 'SUCCESS',
              message: `Job Verified! Funds released. Rating: ${review.rating} Stars.`,
              timestamp: new Date(),
              read: false
          });
      }
  };

  // Seed Data
  const seedMarketData = async () => {
      // Check if data exists
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (count && count > 0) {
          alert("Database already has data. Skipping seed.");
          return;
      }

      console.log("Seeding Database...");
      
      // Insert Users
      await supabase.from('users').insert(MOCK_USERS);
      setUsers(MOCK_USERS);

      // Insert Sites
      await supabase.from('sites').insert(MOCK_SITES);
      setSites(MOCK_SITES);

      // Insert Shifts
      await supabase.from('shifts').insert(MOCK_SHIFTS);
      setShifts(MOCK_SHIFTS);

      // Insert Jobs
      await supabase.from('job_postings').insert(MOCK_JOBS);
      setJobs(MOCK_JOBS);

      alert("Database seeded successfully!");
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
      isVendorSignupEnabled, toggleVendorSignup,
      messages, sendMessage,
      platformConfig, updatePlatformConfig,
      legalDocuments, updateLegalDocument, faqs, addFaq, updateFaq, deleteFaq,
      isLoading
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
