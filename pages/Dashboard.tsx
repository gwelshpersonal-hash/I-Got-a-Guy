import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CheckCircle2, DollarSign, Zap, MapPin, Loader2, Bell, Truck, Sparkles, Wrench, Calendar, Car, Trash2, Lock,
  UserPlus, Gift, Share2, Copy, X, Siren, AlertTriangle, TrendingUp, Info, Camera, Image as ImageIcon, Monitor, MessageCircle, Send, Smartphone, Rocket, Filter, ArrowUp, ArrowDown, Equal, Edit2, Milestone, Hammer, HardHat, ThumbsUp, ThumbsDown, Droplets, ShieldCheck, ShieldAlert, Scale, Star, Wallet, Waves, Briefcase, Clock, CreditCard, Radio, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Role, Shift, ShiftStatus, ServiceCategory, CounterOffer, MarketRates } from '../types';
import { format, addHours, formatDistanceToNow, differenceInHours, differenceInDays } from 'date-fns';
import { ALL_SERVICE_CATEGORIES } from '../constants';
import { calculateJobSplit } from '../utils/feeEngine';
import { canProviderClaimJob } from '../utils/riskGating';

// Haversine formula for distance in miles
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8; // Radius of the earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in miles
};

const ServiceCard = ({ title, icon: Icon, colorClass, onClick, isEmergency = false, disabled = false }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`p-6 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-4 group h-48 w-full relative
    ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 border border-slate-100' : 
      isEmergency 
        ? 'bg-red-50 hover:bg-red-100 shadow-sm hover:shadow-lg border-2 border-transparent hover:border-red-200' 
        : 'bg-white hover:bg-gold-50 shadow-soft hover:shadow-xl hover:-translate-y-1 border border-transparent'}`}
  >
    <div className={`p-5 rounded-2xl transition-transform duration-300 group-hover:scale-110 ${isEmergency ? 'bg-red-100 text-red-600' : 'bg-slate-50 group-hover:bg-white shadow-sm'}`}>
        <Icon className={`w-8 h-8 ${colorClass}`} />
    </div>
    <h3 className={`text-lg font-bold tracking-tight ${isEmergency ? 'text-red-700' : 'text-navy-900'}`}>{title}</h3>
    {disabled && <span className="absolute bottom-4 text-[10px] text-slate-400 font-bold uppercase bg-slate-100 px-2 py-1 rounded">No Providers</span>}
  </button>
);

const getPlaceholderForCategory = (category: ServiceCategory | null): string => {
    switch (category) {
        case 'MOVING':
            return "e.g. Moving a small 1-bedroom apartment content approx 10 miles. Includes a queen bed, sofa, 2 dressers, and about 20 boxes. 2nd floor walk-up at origin, elevator at destination.";
        case 'CLEANING':
            return "e.g. Deep clean needed for a 2-bed, 2-bath apartment. Focus on the kitchen grease and bathroom tile. Please bring your own vacuum and supplies.";
        case 'HANDYMAN':
            return "e.g. Need to mount a 65-inch TV on a brick wall, fix a loose cabinet hinge, and patch a small hole in the hallway drywall.";
        case 'LANDSCAPING':
            return "e.g. Lawn mowing and edging for front and back yard. Also need help trimming the hedges along the fence. Green waste bin is available.";
        case 'AUTO':
            return "e.g. My 2015 Honda Civic won't start. Battery seems dead. Car is parked nose-in at the grocery store lot.";
        case 'PLUMBING':
            return "e.g. Kitchen sink is draining very slowly and the garbage disposal is making a humming noise but not spinning.";
        case 'CONSTRUCTION':
            return "e.g. Need a hand carrying drywall sheets into the basement and some general site cleanup/demolition assistance.";
        case 'COMPUTER':
            return "e.g. Laptop screen is cracked, or PC is running very slow. Need virus removal and data backup.";
        case 'GENERAL_LABOR':
            return "e.g. Moving boxes, organizing garage, assembling furniture, heavy lifting assistance.";
        case 'JOBSITE_LABOR':
            return "e.g. Construction site cleanup, material handling, digging trenches, demolition support.";
        case 'POWER_WASHING':
            return "e.g. Need driveway and front walkway pressure washed. Approx 800 sq ft. Water hookup is available on side of house.";
        default:
            return "e.g. Need someone to help with a task. Please provide details.";
    }
};

const SERVICE_TILES = [
    { id: 'MOVING', title: 'Moving', icon: Truck, color: 'text-blue-600' },
    { id: 'CLEANING', title: 'Cleaning', icon: Sparkles, color: 'text-emerald-500' },
    { id: 'HANDYMAN', title: 'Handyman', icon: Wrench, color: 'text-amber-600' },
    { id: 'PLUMBING', title: 'Plumbing', icon: Droplets, color: 'text-cyan-600' },
    { id: 'LANDSCAPING', title: 'Landscaping', icon: Calendar, color: 'text-green-600' },
    { id: 'POWER_WASHING', title: 'Power Washing', icon: Waves, color: 'text-cyan-500' },
    { id: 'GENERAL_LABOR', title: 'General Labor', icon: Hammer, color: 'text-orange-500' },
    { id: 'JOBSITE_LABOR', title: 'Job Site Labor', icon: HardHat, color: 'text-slate-700' },
    { id: 'AUTO', title: 'Auto Help', icon: Car, color: 'text-red-500' },
    { id: 'COMPUTER', title: 'Computer Repair', icon: Monitor, color: 'text-cyan-500' },
] as const;

export const Dashboard = () => {
  const { currentUser } = useAuth();
  const { shifts, addShift, updateShift, claimGig, sites, notifications, markNotificationsRead, users, addNotification, isReferralEnabled, updateUser, messages, sendMessage, platformConfig } = useData();
  const navigate = useNavigate();

  const isClient = currentUser?.role === Role.CLIENT;
  const isProvider = currentUser?.role === Role.PROVIDER;
  const isAdmin = currentUser?.role === Role.ADMIN;

  // Check Provider Insurance Status (Used for Risk Gating)
  const isVerifiedInsured = useMemo(() => {
      if (!isProvider || !currentUser) return false;
      return currentUser.isCoiVerified || currentUser.insuranceType === 'DAILY_SHIELD';
  }, [isProvider, currentUser]);

  // Request Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [requestDesc, setRequestDesc] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [estimatedPrice, setEstimatedPrice] = useState<string>('');
  const [requestImages, setRequestImages] = useState<string[]>([]);
  const [editingGig, setEditingGig] = useState<Shift | null>(null);
  const [showPriceExamples, setShowPriceExamples] = useState(false); // Toggle for drill down
  
  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Specific Fields
  const [truckNeeded, setTruckNeeded] = useState(false);
  const [moveDistance, setMoveDistance] = useState('');
  const [hasHighValueItems, setHasHighValueItems] = useState(false);
  
  // Emergency Toggle
  const [isUrgent, setIsUrgent] = useState(false);

  // Boost State
  const [boostingGigId, setBoostingGigId] = useState<string | null>(null);
  const [boostSuccessId, setBoostSuccessId] = useState<string | null>(null);

  // Broadcast Result Modal (Emergency)
  const [broadcastResult, setBroadcastResult] = useState<{ count: number } | null>(null);
  
  // New: Emergency Confirm Modal State
  const [emergencyConfirmGig, setEmergencyConfirmGig] = useState<Shift | null>(null);

  // Claiming State
  const [claimingGigId, setClaimingGigId] = useState<string | null>(null);
  const [confirmingGigId, setConfirmingGigId] = useState<string | null>(null);
  const [estimatedInsuranceFee, setEstimatedInsuranceFee] = useState<number>(0);
  const [estimatedInsuranceLabel, setEstimatedInsuranceLabel] = useState<string>('');
  const [willDeductInsurance, setWillDeductInsurance] = useState(false);

  // Skill Application State
  const [skillApplyCategory, setSkillApplyCategory] = useState<ServiceCategory | null>(null);
  const [skillExperience, setSkillExperience] = useState('');

  // Counter Offer State
  const [counterGig, setCounterGig] = useState<Shift | null>(null);
  const [counterAmount, setCounterAmount] = useState<string>('');
  const [counterMessage, setCounterMessage] = useState<string>('');
  const [reviewOffersGig, setReviewOffersGig] = useState<Shift | null>(null);

  // Filter State (Provider)
  const [filterCategory, setFilterCategory] = useState<ServiceCategory | 'ALL'>('ALL');
  const [filterMinPay, setFilterMinPay] = useState<number | ''>('');

  // Referral Modal State
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralType, setReferralType] = useState<'CLIENT' | 'PROVIDER'>('CLIENT');
  const [copySuccess, setCopySuccess] = useState(false);

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Chat Modal State
  const [chatGig, setChatGig] = useState<Shift | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // --- Dynamic Category Availability Logic ---
  const activeCategories = useMemo(() => {
      const available = new Set<string>();
      
      // Check active providers and their skills
      users.forEach(u => {
          if (u.role === Role.PROVIDER && u.isActive) {
              // Add all skills this provider has
              u.skills?.forEach(skill => available.add(skill));
          }
      });
      
      return available;
  }, [users]);

  // --- Skill Gating Calculation for Provider ---
  const providerQualifications = useMemo(() => {
      if (!isProvider || !currentUser) return { canClaimHighValue: false };

      const generalLaborCount = shifts.filter(s => 
          s.userId === currentUser.id && 
          s.category === 'GENERAL_LABOR' && 
          (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED)
      ).length;

      const rating = currentUser.rating || 0;

      // Rule: > 4.5 rating OR > 10 General Labor jobs
      const canClaimHighValue = rating >= 4.5 || generalLaborCount >= 10;

      return { canClaimHighValue, generalLaborCount, rating };
  }, [isProvider, currentUser, shifts]);

  // --- REAL Earnings Calculation ---
  const totalEarnings = useMemo(() => {
      if (!currentUser || !isProvider) return 0;

      return shifts
          .filter(s => 
              s.userId === currentUser.id && 
              (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED)
          )
          .reduce((total, s) => {
              const gross = s.price || 0;
              
              // Fee Logic (Matched with TaxCenter/Payroll)
              const feePercent = s.appliedPlatformFee !== undefined 
                  ? s.appliedPlatformFee 
                  : (platformConfig[s.category]?.platformFeePercent || 20) / 100;
              const platformFee = gross * feePercent;

              let insuranceFee = 0;
              if (s.insuranceOptIn) {
                  if (s.appliedInsuranceFee !== undefined) {
                      insuranceFee = s.appliedInsuranceFee;
                  } else {
                      const rule = platformConfig[s.category]?.insuranceRule || { type: 'FLAT', value: 2.00 };
                      insuranceFee = rule.type === 'PERCENTAGE' ? gross * (rule.value / 100) : rule.value;
                  }
              }

              const net = gross - platformFee - insuranceFee;
              return total + net;
          }, 0);
  }, [shifts, currentUser, isProvider, platformConfig]);

  const isCategoryAvailable = (cat: string) => {
      // Admins see everything for preview purposes
      if (isAdmin) return true;
      return activeCategories.has(cat);
  };

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatGig]);

  const handleChatClick = (e: React.MouseEvent, gig: Shift) => {
      e.stopPropagation();
      setChatGig(gig);
  };

  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatGig || !currentUser || !chatMessage.trim()) return;

      sendMessage(chatGig.id, currentUser.id, chatMessage);
      setChatMessage('');
  };

  const getChatPartner = (shift: Shift) => {
      if (currentUser?.role === Role.CLIENT) {
          return users.find(u => u.id === shift.userId);
      } else {
          return users.find(u => u.id === shift.clientId);
      }
  };

  const getChatPartnerName = (shift: Shift) => {
      if (currentUser?.role === Role.CLIENT) {
          return users.find(u => u.id === shift.userId)?.name || "Provider";
      } else {
          return users.find(u => u.id === shift.clientId)?.name || "Client";
      }
  };

  // Client: Open Request Modal
  const startRequest = (category: ServiceCategory) => {
      setEditingGig(null);
      setSelectedCategory(category);
      setRequestDesc('');
      setEstimatedPrice('');
      setRequestImages([]);
      setTruckNeeded(false);
      setMoveDistance('');
      setHasHighValueItems(false);
      setIsUrgent(false); // Default to not urgent
      setShowPriceExamples(false);
      if (sites.length > 0) setSelectedSiteId(sites[0].id);
      setIsRequestModalOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, gig: Shift) => {
      e.stopPropagation();
      setEditingGig(gig);
      setSelectedCategory(gig.category);
      setRequestDesc(gig.description);
      setEstimatedPrice(gig.price?.toString() || '');
      setRequestImages(gig.photos || []);
      setSelectedSiteId(gig.siteId);
      setTruckNeeded(gig.truckNeeded || false);
      setMoveDistance(gig.distance || '');
      setHasHighValueItems(gig.hasHighValueItems || false);
      setIsUrgent(gig.type === 'URGENT');
      setShowPriceExamples(false);
      setIsRequestModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setRequestImages(prev => [...prev, reader.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    }
  };

  const removeImage = (index: number) => {
      setRequestImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitRequest = () => {
      if (!selectedCategory || !selectedSiteId || !requestDesc || !currentUser) return;

      // GUARDRAIL: Check for Payment Method
      if (!currentUser.hasPaymentMethod) {
          setIsPaymentModalOpen(true);
          return;
      }

      const isMoving = selectedCategory === 'MOVING';

      if (editingGig) {
          // Update Existing Gig
          const updatedGig: Shift = {
              ...editingGig,
              description: requestDesc,
              category: selectedCategory,
              siteId: selectedSiteId,
              price: parseFloat(estimatedPrice) || 0,
              photos: requestImages,
              truckNeeded: isMoving ? truckNeeded : undefined,
              distance: isMoving ? moveDistance : undefined,
              hasHighValueItems: isMoving ? hasHighValueItems : undefined,
              type: isUrgent ? 'URGENT' : 'SCHEDULED'
          };
          updateShift(updatedGig);
          setIsRequestModalOpen(false);
          setEditingGig(null);
          alert("Request updated successfully!");
          return;
      }

      // Create New Gig
      const newGig: Shift = {
          id: `gig_${Date.now()}`,
          userId: null, // No provider yet
          clientId: currentUser.id,
          siteId: selectedSiteId,
          start: new Date(), // Immediate/ASAP
          end: addHours(new Date(), 2), // Default duration
          description: requestDesc,
          category: selectedCategory,
          status: ShiftStatus.OPEN_REQUEST,
          isRecurring: false,
          type: isUrgent ? 'URGENT' : 'SCHEDULED', 
          price: parseFloat(estimatedPrice) || 0,
          photos: requestImages,
          createdAt: new Date(),
          truckNeeded: isMoving ? truckNeeded : undefined,
          distance: isMoving ? moveDistance : undefined,
          hasHighValueItems: isMoving ? hasHighValueItems : undefined
      };

      addShift(newGig);
      setIsRequestModalOpen(false);

      if (isUrgent) {
          // Send Text Alerts to opted-in providers WHO HAVE THE SKILL and are within 30 miles
          const jobSite = sites.find(s => s.id === selectedSiteId);
          
          const eligibleProviders = users.filter(u => {
              if (u.role !== Role.PROVIDER || !u.isActive || !u.urgentAlertsEnabled || !u.skills?.includes(selectedCategory)) {
                  return false;
              }
              
              if (jobSite && u.latitude && u.longitude) {
                  const distance = calculateDistance(jobSite.latitude, jobSite.longitude, u.latitude, u.longitude);
                  if (distance > 30) {
                      return false;
                  }
              }
              return true;
          });
          
          eligibleProviders.forEach(p => {
             // Simulate Sending Text via Platform
             console.log(`%c[SMS SIMULATION] To: ${p.phone} | Msg: URGENT ${selectedCategory}: ${requestDesc}`, "color: #ef4444; font-weight: bold;");
             
             addNotification({
                id: `alert_${Date.now()}_${p.id}`,
                targetUserId: p.id,
                type: 'ALERT',
                message: `🚨 URGENT ${selectedCategory}: ${requestDesc.substring(0, 30)}...`,
                timestamp: new Date(),
                read: false
             });
          });

          // Show Result Modal 
          setBroadcastResult({
              count: eligibleProviders.length
          });

      } else {
          alert("Your request has been broadcasted to local Guys!");
      }
  };

  const handleSavePaymentMethod = () => {
      if(currentUser) {
          updateUser({
              ...currentUser,
              hasPaymentMethod: true
          });
          setIsPaymentModalOpen(false);
          alert("Card added successfully! You can now post your request.");
      }
  };

  // One-Tap Boost (Client)
  const handleBoost = async (shift: Shift) => {
      // Ensuring price is a number to prevent string concatenation bugs
      const currentPrice = typeof shift.price === 'string' ? parseFloat(shift.price) : (shift.price || 0);
      
      if (!currentUser) return;
      
      setBoostingGigId(shift.id);
      
      const BOOST_PERCENT = 0.10; // 10% increase
      const minIncrease = 5;
      
      const calculatedIncrease = Math.round(currentPrice * BOOST_PERCENT);
      const increase = Math.max(calculatedIncrease, minIncrease);
      const newPrice = currentPrice + increase;

      // Fake network delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 800));

      updateShift({
          ...shift,
          price: newPrice,
          isBoosted: true,
          createdAt: new Date() // Refresh timestamp to "bump" to top of sort if sorted by newest
      });
      
      addNotification({
          id: `notif_${Date.now()}`,
          targetUserId: currentUser.id,
          type: 'SUCCESS',
          message: `Offer Boosted! New price: $${newPrice}.`,
          timestamp: new Date(),
          read: false
      });

      setBoostingGigId(null);
      setBoostSuccessId(shift.id);
      setTimeout(() => setBoostSuccessId(null), 2000);
  };

  // Trigger Modal for Emergency Upgrade
  const handleUpgradeToEmergencyClick = (e: React.MouseEvent, gig: Shift) => {
      e.stopPropagation(); // Prevent card clicks
      setEmergencyConfirmGig(gig);
  };

  // Execute Upgrade
  const executeUpgradeToEmergency = () => {
      if (!emergencyConfirmGig || !currentUser) return;
      
      const currentPrice = typeof emergencyConfirmGig.price === 'string' ? parseFloat(emergencyConfirmGig.price) : (emergencyConfirmGig.price || 0);
      const newPrice = currentPrice + 15;

      updateShift({
          ...emergencyConfirmGig,
          type: 'URGENT',
          price: newPrice,
          createdAt: new Date() // Bump to top
      });

      // Simulate broadcast
      const eligibleProviders = users.filter(u => 
          u.role === Role.PROVIDER && 
          u.isActive && 
          u.urgentAlertsEnabled &&
          u.skills?.includes(emergencyConfirmGig.category)
      );
      
      // Close confirm modal and show result
      setEmergencyConfirmGig(null);
      setBroadcastResult({ count: eligibleProviders.length });
      
      eligibleProviders.forEach(p => {
          addNotification({
            id: `alert_upgrade_${Date.now()}_${p.id}`,
            targetUserId: p.id,
            type: 'ALERT',
            message: `🚨 URGENT UPGRADE: ${emergencyConfirmGig.category} in your area!`,
            timestamp: new Date(),
            read: false
          });
      });
  };

  // Pay Feedback Logic (Provider)
  const handlePayFeedback = (e: React.MouseEvent, gig: Shift, vote: 'up' | 'down') => {
      e.stopPropagation();
      if (!currentUser) return;

      const currentFeedback = gig.payFeedback || { upvotes: [], downvotes: [] };
      const userId = currentUser.id;

      // Create new arrays without current user to simulate toggle/switch behavior
      let newUpvotes = currentFeedback.upvotes.filter(id => id !== userId);
      let newDownvotes = currentFeedback.downvotes.filter(id => id !== userId);

      // Determine previous vote
      const wasUp = currentFeedback.upvotes.includes(userId);
      const wasDown = currentFeedback.downvotes.includes(userId);

      if (vote === 'up') {
          if (!wasUp) {
              newUpvotes.push(userId); // Add to up
          }
      } else {
          if (!wasDown) {
              newDownvotes.push(userId); // Add to down
          }
      }

      updateShift({
          ...gig,
          payFeedback: { upvotes: newUpvotes, downvotes: newDownvotes }
      });
  };

  // Calculate Price Suggestion
  const priceSuggestion = useMemo(() => {
    if (!selectedCategory) return null;

    // Base pool: Completed/Verified/Accepted jobs in this category
    const categoryShifts = shifts.filter(s => 
        s.category === selectedCategory &&
        s.price && 
        s.price > 0 &&
        (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED)
    );

    if (categoryShifts.length === 0) return null;

    let matchedShifts = categoryShifts;
    let isSpecific = false;

    // If description has meaningful content, try to refine
    if (requestDesc.trim().length >= 3) {
        const searchTerms = requestDesc.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        
        if (searchTerms.length > 0) {
             const specific = categoryShifts.filter(s => {
                const desc = s.description.toLowerCase();
                // Match if ANY significant search term is present in historical data
                return searchTerms.some(term => desc.includes(term));
             });
             
             if (specific.length > 0) {
                 matchedShifts = specific;
                 isSpecific = true;
             }
        }
    }

    const prices = matchedShifts.map(s => s.price || 0);
    const total = prices.reduce((sum, p) => sum + p, 0);
    const avg = Math.round(total / prices.length);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return { avg, min, max, count: prices.length, isSpecific, examples: matchedShifts.slice(0, 5) };
  }, [selectedCategory, requestDesc, shifts]);

  // Provider: Claim Gig
  const handleClaimClick = (e: React.MouseEvent, gig: Shift, forceDailyShield = false) => {
      e.stopPropagation();
      e.preventDefault();

      if (!currentUser) return;

      if (confirmingGigId === gig.id) {
          executeClaim(gig, forceDailyShield || willDeductInsurance);
      } else {
          setConfirmingGigId(gig.id);
          const shouldDeduct = forceDailyShield || currentUser.insuranceType === 'DAILY_SHIELD' || (currentUser.insuranceType === 'OWN_COI' && !currentUser.isCoiVerified);
          setWillDeductInsurance(shouldDeduct);

          if (shouldDeduct) {
              const rule = platformConfig[gig.category]?.insuranceRule || { type: 'FLAT', value: 2.00 };
              const gross = gig.price || 0;
              let amount = 0;
              let label = '';

              if (rule.type === 'PERCENTAGE') {
                  amount = gross * (rule.value / 100);
                  label = `(${rule.value}%)`;
              } else {
                  amount = rule.value;
                  label = '';
              }
              setEstimatedInsuranceFee(amount);
              setEstimatedInsuranceLabel(label);
          } else {
              setEstimatedInsuranceFee(0);
              setEstimatedInsuranceLabel('');
          }
      }
  };

  const executeClaim = async (gig: Shift, forceDailyShield = false) => {
      if (!currentUser) return;
      
      setConfirmingGigId(null);
      setClaimingGigId(gig.id);
      
      const config = platformConfig[gig.category];
      const platformFeePercent = (config?.platformFeePercent || 20) / 100;

      const shouldDeduct = forceDailyShield || currentUser.insuranceType === 'DAILY_SHIELD' || (currentUser.insuranceType === 'OWN_COI' && !currentUser.isCoiVerified);
      
      try {
          await claimGig(gig.id, currentUser.id, {
              insuranceOptIn: shouldDeduct,
              estimatedInsuranceFee: shouldDeduct ? estimatedInsuranceFee : 0,
              platformFeePercent: platformFeePercent
          });

          addNotification({
              id: `notif_${Date.now()}`,
              targetUserId: currentUser.id,
              type: 'SUCCESS',
              message: `Job Accepted: ${gig.category} - ${gig.description}`,
              timestamp: new Date(),
              read: false
          });

      } catch (error: any) {
          alert(`Failed to claim job: ${error.message}`);
      } finally {
          setClaimingGigId(null);
      }
  };

  // --- Skill Application Logic ---
  const handleOpenSkillApplication = (category: ServiceCategory) => {
      setSkillApplyCategory(category);
      setSkillExperience('');
  };

  const submitSkillApplication = () => {
      if (!skillApplyCategory || !currentUser) return;

      const currentPending = currentUser.pendingSkills || [];
      if (!currentPending.includes(skillApplyCategory)) {
          updateUser({
              ...currentUser,
              pendingSkills: [...currentPending, skillApplyCategory]
          });
      }

      addNotification({
          id: `app_skill_${Date.now()}`,
          targetUserId: currentUser.id,
          type: 'SUCCESS',
          message: `Application Submitted: Your request to add ${skillApplyCategory} has been sent to Admin for review.`,
          timestamp: new Date(),
          read: false
      });

      setSkillApplyCategory(null);
      alert(`Application sent! An admin will review your qualifications for ${skillApplyCategory}.`);
  };

  // --- Counter Offer Logic ---

  const handleOpenCounterModal = (e: React.MouseEvent, gig: Shift) => {
      e.stopPropagation();
      setCounterGig(gig);
      setCounterAmount(gig.price ? (gig.price + 10).toString() : '');
      setCounterMessage("I'd love to help with this! My rate is slightly higher to cover quality materials and ensure the best result.");
  };

  const handleCounterSubmit = async () => {
      if (!counterGig || !currentUser || !counterAmount) return;

      const newOffer: CounterOffer = {
          id: `offer_${Date.now()}`,
          providerId: currentUser.id,
          amount: parseFloat(counterAmount),
          message: counterMessage,
          status: 'PENDING',
          createdAt: new Date()
      };

      const updatedOffers = [...(counterGig.counterOffers || []), newOffer];

      await new Promise(resolve => setTimeout(resolve, 500));

      updateShift({
          ...counterGig,
          counterOffers: updatedOffers
      });

      if (counterGig.clientId) {
          addNotification({
              id: `notif_counter_${Date.now()}`,
              targetUserId: counterGig.clientId,
              type: 'INFO',
              message: `New Counter Offer: A provider offered $${newOffer.amount} for "${counterGig.description}"`,
              timestamp: new Date(),
              read: false
          });
      }

      setCounterGig(null);
      alert("Counter offer sent! The client has been notified.");
  };

  const handleDeclineCounter = async (offer: CounterOffer) => {
      if (!reviewOffersGig || !currentUser) return;

      updateShift({
          ...reviewOffersGig,
          counterOffers: reviewOffersGig.counterOffers?.map(o => 
              o.id === offer.id ? { ...o, status: 'REJECTED' } : o
          )
      });

      addNotification({
          id: `notif_decline_${Date.now()}`,
          targetUserId: offer.providerId,
          type: 'INFO',
          message: `Your offer of $${offer.amount} for "${reviewOffersGig.description}" was declined.`,
          timestamp: new Date(),
          read: false
      });
  };

  const handleAcceptCounter = async (offer: CounterOffer) => {
      if (!reviewOffersGig || !currentUser) return;

      const config = platformConfig[reviewOffersGig.category];
      const platformFeePercent = (config?.platformFeePercent || 20) / 100;
      
      const winningProvider = users.find(u => u.id === offer.providerId);
      const shouldDeduct = winningProvider ? (winningProvider.insuranceType === 'DAILY_SHIELD' || (winningProvider.insuranceType === 'OWN_COI' && !winningProvider.isCoiVerified)) : false;
      
      let insuranceFee = 0;
      if (shouldDeduct) {
          const rule = config?.insuranceRule || { type: 'FLAT', value: 2.00 };
          insuranceFee = rule.type === 'PERCENTAGE' ? offer.amount * (rule.value / 100) : rule.value;
      }

      setReviewOffersGig(null); 

      try {
          await claimGig(reviewOffersGig.id, offer.providerId, {
              insuranceOptIn: shouldDeduct,
              estimatedInsuranceFee: insuranceFee,
              platformFeePercent: platformFeePercent
          });

          await new Promise(resolve => setTimeout(resolve, 800));
          const isCardValid = Math.random() > 0.05; 
          if (!isCardValid) throw new Error("Payment method declined.");

          updateShift({
                ...reviewOffersGig,
                userId: offer.providerId,
                price: offer.amount, 
                status: ShiftStatus.ACCEPTED,
                insuranceOptIn: shouldDeduct,
                appliedInsuranceFee: insuranceFee,
                appliedPlatformFee: platformFeePercent,
                escrowStatus: 'SECURED', 
                counterOffers: reviewOffersGig.counterOffers?.map(o => 
                    o.id === offer.id ? { ...o, status: 'ACCEPTED' } : { ...o, status: 'REJECTED' }
                )
          });

          addNotification({
              id: `notif_win_${Date.now()}`,
              targetUserId: offer.providerId,
              type: 'SUCCESS',
              message: `Offer Accepted! You won the job "${reviewOffersGig.description}" at $${offer.amount}.`,
              timestamp: new Date(),
              read: false
          });

          alert("Offer accepted! Funds secured and provider assigned.");

      } catch (error: any) {
          alert(`Payment Failed: ${error.message}`);
      }
  };

  const openReferralModal = (type: 'CLIENT' | 'PROVIDER') => {
      setReferralType(type);
      setCopySuccess(false);
      setIsReferralModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    } else {
        alert(`Clipboard access denied. Please copy manually: ${text}`);
    }
  };

  const toggleUrgentAlerts = () => {
    if (currentUser) {
        updateUser({
            ...currentUser,
            urgentAlertsEnabled: !currentUser.urgentAlertsEnabled
        });
    }
  };

  const myNotifications = notifications.filter(n => n.targetUserId === currentUser?.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const availableGigs = shifts.filter(s => {
      if (s.status !== ShiftStatus.OPEN_REQUEST) return false;
      if (isProvider) {
          if (filterCategory !== 'ALL' && s.category !== filterCategory) return false;
          if (filterMinPay !== '' && (s.price || 0) < filterMinPay) return false;
          return true;
      }
      return true;
  });

  // Sort available gigs: Eligible first, then Boosted, then Urgent, then createdAt descending
  // Updated Logic: Split into two explicit groups for better UI separation
  const sortedAvailableGigs = useMemo(() => {
      if (!isProvider) return { eligible: availableGigs, ineligible: [] };

      const checkEligible = (gig: Shift) => {
          if (!currentUser) return false;
          // Only filter out jobs where the provider lacks the skill.
          // Insurance and High Value locks will be displayed in the card but kept in the top list.
          return currentUser.skills?.includes(gig.category) || false;
      };

      const eligible = availableGigs.filter(g => checkEligible(g));
      const ineligible = availableGigs.filter(g => !checkEligible(g));

      const sorter = (a: Shift, b: Shift) => {
          if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
          if (a.type === 'URGENT' && b.type !== 'URGENT') return -1;
          if (a.type !== 'URGENT' && b.type === 'URGENT') return 1;
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
      };

      eligible.sort(sorter);
      ineligible.sort(sorter);

      return { eligible, ineligible };
  }, [availableGigs, isProvider, currentUser, providerQualifications]);

  const myProviderGigs = shifts.filter(s => 
    s.userId === currentUser?.id && 
    (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.IN_PROGRESS || s.status === ShiftStatus.OPEN_REQUEST)
  );

  myProviderGigs.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
  });

  const myClientGigs = shifts.filter(s => 
    s.clientId === currentUser?.id && 
    (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.IN_PROGRESS || s.status === ShiftStatus.OPEN_REQUEST)
  );

  myClientGigs.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
  });

  const pendingProviders = users.filter(u => u.role === Role.PROVIDER && u.verificationStatus === 'PENDING').length;
  const activeGigsCount = shifts.filter(s => s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.IN_PROGRESS).length;
  const openRequestsCount = shifts.filter(s => s.status === ShiftStatus.OPEN_REQUEST).length;

  const hasAuthorizedSkills = isProvider && currentUser?.skills && currentUser.skills.length > 0;

  const unclaimedByCategory = useMemo(() => {
      const counts: Record<string, number> = {};
      shifts.filter(s => s.status === ShiftStatus.OPEN_REQUEST).forEach(s => {
          counts[s.category] = (counts[s.category] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]); 
  }, [shifts]);

  const renderServiceGrid = () => (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {SERVICE_TILES.map(service => {
              const isLive = activeCategories.has(service.id);
              if (!isLive && !isAdmin) return null;

              return (
                  <ServiceCard 
                      key={service.id}
                      title={service.title} 
                      icon={service.icon} 
                      colorClass={service.color} 
                      onClick={() => startRequest(service.id as ServiceCategory)} 
                      disabled={!isLive} 
                  />
              );
          })}
          {isReferralEnabled && (
              <ServiceCard title="Refer a Friend" icon={Gift} colorClass="text-pink-500" onClick={() => openReferralModal('CLIENT')} />
          )}
      </div>
  );

  const renderGigCard = (gig: Shift) => {
      if (!currentUser) return null;
      const site = sites.find(s => s.id === gig.siteId);
      const isClaiming = claimingGigId === gig.id;
      const isConfirming = confirmingGigId === gig.id;
      const isEmergency = gig.type === 'URGENT';
      const isBoosted = gig.isBoosted;
      const hasUpvoted = gig.payFeedback?.upvotes.includes(currentUser.id);
      const hasDownvoted = gig.payFeedback?.downvotes.includes(currentUser.id);
      const myPendingOffer = gig.counterOffers?.find(o => o.providerId === currentUser.id && o.status === 'PENDING');
      const missingSkill = !currentUser.skills?.includes(gig.category);
      const isLocked = gig.hasHighValueItems && !providerQualifications.canClaimHighValue;
      const riskStatus = canProviderClaimJob(currentUser, gig);
      const isRiskBlocked = !riskStatus.allowed && !missingSkill;
      const hasOwnInsurance = currentUser.insuranceType === 'OWN_COI' && currentUser.isCoiVerified;
      const breakdown = calculateJobSplit(gig.price || 0, gig.category, hasOwnInsurance);

      return (
        <div key={gig.id} className={`p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all relative overflow-hidden mb-4 ${isEmergency ? 'bg-red-50/50 border border-red-100' : isBoosted ? 'bg-gradient-to-br from-white to-purple-50 border border-purple-100' : 'bg-white border border-transparent'} ${isRiskBlocked && !isConfirming || missingSkill ? 'opacity-90' : ''}`}>
            <div className="flex justify-center gap-6 mb-4 pb-4 border-b border-black/5">
                <button onClick={(e) => handlePayFeedback(e, gig, 'up')} className={`flex items-center px-4 py-2 rounded-lg transition-all border ${hasUpvoted ? 'bg-green-100 text-green-700 border-green-200 shadow-inner font-bold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`} title="Price Looks Good">
                    <ThumbsUp className={`w-4 h-4 mr-2 ${hasUpvoted ? 'fill-current' : ''}`} />
                    <span className="text-xs">Fair Price</span>
                </button>
                <button onClick={(e) => handlePayFeedback(e, gig, 'down')} className={`flex items-center px-4 py-2 rounded-lg transition-all border ${hasDownvoted ? 'bg-red-100 text-red-700 border-red-200 shadow-inner font-bold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`} title="Price Too Low">
                    <ThumbsDown className={`w-4 h-4 mr-2 ${hasDownvoted ? 'fill-current' : ''}`} />
                    <span className="text-xs">Too Low</span>
                </button>
            </div>
            <div className="absolute top-0 right-0 flex flex-col items-end gap-1 z-10">
                {isBoosted && <div className="bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center"><Rocket className="w-3 h-3 mr-1" /> Price Boosted!</div>}
                {gig.hasHighValueItems && <div className="bg-navy-800 text-gold-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center border-l border-b border-gold-500"><ShieldCheck className="w-3 h-3 mr-1" /> HIGH VALUE</div>}
            </div>
            <div className="flex justify-between items-start">
                <div>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full mb-3 inline-block tracking-wide uppercase ${isEmergency ? 'bg-red-600 text-white animate-pulse' : 'bg-navy-50 text-navy-700'}`}>{gig.category}</span>
                    <h3 className="font-extrabold text-xl text-navy-900 leading-tight">{gig.description}</h3>
                    <p className="text-sm text-slate-500 flex items-center mt-2 font-medium"><MapPin className="w-3.5 h-3.5 mr-1.5"/> {site?.address || 'Unknown Location'}</p>
                    {(gig.category === 'MOVING') && (gig.truckNeeded || gig.distance) && (
                        <div className="flex gap-3 mt-2 text-xs font-bold text-slate-600">
                            {gig.truckNeeded && <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded flex items-center"><Truck className="w-3 h-3 mr-1" /> Truck Required</span>}
                            {gig.distance && <span className="bg-slate-100 px-2 py-1 rounded flex items-center"><Milestone className="w-3 h-3 mr-1" /> {gig.distance}</span>}
                        </div>
                    )}
                </div>
                <div className="text-right pt-6">
                    <div className={`text-xl font-bold tracking-tight text-slate-400 line-through decoration-slate-300 decoration-2`}>${gig.price}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Gross Pay</div>
                </div>
            </div>
            <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Platform</div>
                        <div className="text-xs font-bold text-slate-600">-${breakdown.platformFee.toFixed(2)}</div>
                    </div>
                    {breakdown.insuranceFee > 0 && (
                        <div className="text-center border-l border-slate-200 pl-4">
                            <div className="text-[10px] text-blue-400 font-bold uppercase flex items-center justify-center">Shield <ShieldCheck className="w-3 h-3 ml-1"/></div>
                            <div className="text-xs font-bold text-blue-600">-${breakdown.insuranceFee.toFixed(2)}</div>
                        </div>
                    )}
                    <div className="text-center border-l border-slate-200 pl-4">
                        <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center justify-center cursor-help" title="Recommendation only. You receive this money but should save it for taxes.">Rec. Save <Wallet className="w-3 h-3 ml-1"/></div>
                        <div className="text-xs font-bold text-slate-500 italic">~${breakdown.taxHoldbackEstimate.toFixed(2)}</div>
                    </div>
                </div>
                <div className="text-right pl-4 border-l border-slate-200">
                    <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Take Home</div>
                    <div className="text-xl font-black text-emerald-600">${breakdown.providerNet.toFixed(2)}</div>
                </div>
            </div>
            {gig.photos && gig.photos.length > 0 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    {gig.photos.map((photo, i) => (
                        <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0"><img src={photo} alt="Job" className="w-full h-full object-cover" /></div>
                    ))}
                </div>
            )}
            {missingSkill ? (
                <div className="mt-6 bg-slate-100 rounded-xl p-4 border border-slate-200 text-center">
                    <div className="flex justify-center mb-3"><div className="bg-slate-200 p-2 rounded-full text-slate-500"><Briefcase className="w-6 h-6" /></div></div>
                    <p className="font-bold text-slate-700 text-sm">You are not currently authorized for this skill set.</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">If you are interested in adding a skill set, apply here.</p>
                    {currentUser.pendingSkills?.includes(gig.category) ? (
                        <div className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold shadow-sm cursor-default flex items-center justify-center"><Clock className="w-4 h-4 mr-1.5" /> Application Pending</div>
                    ) : (
                        <button onClick={() => handleOpenSkillApplication(gig.category)} className="w-full py-2 bg-white text-navy-600 border border-navy-200 rounded-lg text-xs font-bold hover:bg-navy-50 transition-colors shadow-sm flex items-center justify-center">Apply for {gig.category} Authorization</button>
                    )}
                </div>
            ) : isRiskBlocked && !isConfirming ? (
                <div className="mt-6 bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-start text-amber-800 text-sm font-bold mb-3">
                        <ShieldAlert className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                        <div><p>{riskStatus.reason}</p><p className="text-xs font-normal mt-1 opacity-90">This is a high-liability category. Proof of insurance is required.</p></div>
                    </div>
                    <div className="flex gap-2">
                        {riskStatus.actionRequired === 'OPT_IN_SHIELD' && <button onClick={(e) => handleClaimClick(e, gig, true)} className="w-full py-2 bg-white text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors shadow-sm">Opt-in to Daily Shield (${breakdown.insuranceFee > 0 ? breakdown.insuranceFee.toFixed(2) : '2.00'})</button>}
                        {riskStatus.actionRequired === 'UPLOAD_COI' && <button onClick={() => navigate('/profile')} className="w-full py-2 bg-white text-navy-600 border border-navy-200 rounded-lg text-xs font-bold hover:bg-navy-50 transition-colors shadow-sm">Upload COI</button>}
                    </div>
                </div>
            ) : isLocked ? (
                <div className="mt-6 bg-slate-100 rounded-xl p-3 border border-slate-200 flex items-center text-slate-500 text-xs font-bold"><Lock className="w-4 h-4 mr-2" /><span>Requires 4.5★ or 10+ General Labor jobs.</span></div>
            ) : (
                <>
                    {isConfirming && (
                        <div className="mt-6 mb-2 bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between animate-in fade-in cursor-default">
                            <div className="flex items-center">
                                <ShieldCheck className={`w-5 h-5 mr-2 ${willDeductInsurance ? 'text-blue-600' : 'text-emerald-600'}`} />
                                <div><p className="text-xs font-bold text-navy-900">{willDeductInsurance ? 'Daily Shield Applied' : 'Insurance Verified'}</p><p className="text-xs text-slate-600">{willDeductInsurance ? 'Deduction for this job:' : 'Own coverage active. No deduction.'}</p></div>
                            </div>
                            {willDeductInsurance && <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded">- ${estimatedInsuranceFee.toFixed(2)} {estimatedInsuranceLabel}</div>}
                        </div>
                    )}
                    <div className="flex gap-3 mt-4">
                        <button type="button" onClick={(e) => handleClaimClick(e, gig)} disabled={isClaiming} className={`flex-1 py-3 rounded-xl font-bold transition-all transform active:scale-[0.98] flex items-center justify-center shadow-md ${isClaiming ? 'bg-slate-200 text-slate-400 cursor-wait' : isConfirming ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200' : isEmergency ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200' : 'bg-navy-900 text-white hover:bg-navy-800 hover:shadow-lg'}`}>
                            {isClaiming ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Claiming...</> : isConfirming ? "Confirm Claim" : "I Got This!"}
                        </button>
                        {!isConfirming && <button type="button" onClick={(e) => handleOpenCounterModal(e, gig)} disabled={!!myPendingOffer} className={`px-4 py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center ${myPendingOffer ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:border-gold-400 hover:text-navy-900 hover:bg-gold-50'}`} title={myPendingOffer ? "Offer Pending" : "Suggest different price"}>{myPendingOffer ? "Offer Sent" : "Counter Offer"}</button>}
                    </div>
                </>
            )}
        </div>
      );
  };

  const renderMyRequests = () => {
      return (
          <div className="mt-12">
              <h2 className="text-xl font-bold text-navy-900 mb-6">{isProvider ? 'My Staffing Requests' : 'My Requests'}</h2>
              {myClientGigs.length === 0 ? (
                  <div className="p-10 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-500 flex flex-col items-center"><div className="p-4 bg-slate-50 rounded-full mb-4"><Sparkles className="w-8 h-8 text-slate-300" /></div><p>You have no active requests.</p><p className="text-sm">Click a category above to get a guy!</p></div>
              ) : (
                  <div className="space-y-4">
                      {myClientGigs.map(gig => {
                          const assignedProvider = users.find(u => u.id === gig.userId);
                          const pendingOffers = gig.counterOffers?.filter(o => o.status === 'PENDING') || [];
                          const isBoosting = boostingGigId === gig.id;
                          const isBoostSuccess = boostSuccessId === gig.id;
                          const hasPendingOffers = pendingOffers.length > 0;
                          return (
                          <div key={gig.id} className={`p-6 rounded-2xl shadow-soft border transition-all hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${hasPendingOffers ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent'}`}>
                              <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${gig.status === 'OPEN_REQUEST' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{gig.status.replace('_', ' ')}</span>
                                      <span className="text-xs text-slate-500 font-medium">Posted {gig.createdAt ? formatDistanceToNow(gig.createdAt) : 'recently'} ago</span>
                                      {gig.type === 'URGENT' && <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">URGENT</span>}
                                      {hasPendingOffers && <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full animate-pulse flex items-center"><Scale className="w-3 h-3 mr-1" /> COUNTER OFFER</span>}
                                  </div>
                                  <h3 className="font-bold text-lg text-navy-900">{gig.description}</h3>
                                  <p className="text-sm text-slate-500 mt-1 font-medium"><span className={gig.isBoosted ? "text-purple-600 font-bold" : ""}>${gig.price}</span> • {gig.category}</p>
                              </div>
                              <div className="text-right flex flex-col items-end gap-2 w-full md:w-auto">
                                  {gig.userId ? (
                                      <><div className="text-sm text-green-600 font-bold flex items-center bg-green-50 px-3 py-1.5 rounded-xl"><CheckCircle2 className="w-4 h-4 mr-2"/> Guy Assigned</div><button onClick={(e) => handleChatClick(e, gig)} className="text-xs font-bold text-navy-600 bg-navy-50 hover:bg-navy-100 px-3 py-1.5 rounded-lg flex items-center transition-colors"><MessageCircle className="w-3 h-3 mr-1" /> Message</button></>
                                  ) : (
                                      <div className="flex flex-col gap-2 items-end w-full"><div className="text-sm text-amber-600 font-bold flex items-center bg-amber-50 px-3 py-1.5 rounded-xl"><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Finding a Guy...</div>{pendingOffers.length > 0 && <button onClick={() => setReviewOffersGig(gig)} className="w-full md:w-auto text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl flex items-center justify-center shadow-md transition-all animate-pulse"><Scale className="w-3 h-3 mr-1.5" /> View {pendingOffers.length} Offer{pendingOffers.length > 1 ? 's' : ''}</button>}{gig.status === ShiftStatus.OPEN_REQUEST && <div className="flex gap-2 w-full md:w-auto"><button onClick={(e) => handleEditClick(e, gig)} className="flex-1 md:flex-none text-xs font-bold text-navy-600 bg-white border border-navy-100 hover:bg-navy-50 px-4 py-2 rounded-xl flex items-center justify-center shadow-sm transition-all"><Edit2 className="w-3 h-3 mr-1.5" /> Edit</button><button onClick={() => handleBoost(gig)} disabled={isBoosting} className={`flex-1 md:flex-none text-xs font-bold text-white px-4 py-2 rounded-xl flex items-center justify-center shadow-md transition-all ${isBoostSuccess ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-indigo-600'}`}>{isBoostSuccess ? 'Boosted!' : 'Boost 10%'}</button></div>}</div>
                                  )}
                              </div>
                          </div>
                          );
                      })}
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-navy-900 tracking-tight">{isClient ? "What do you need done?" : isAdmin ? "Admin Dashboard" : "Find Gigs Near You"}</h1>
            <p className="text-slate-500 font-medium text-lg mt-1">{isClient ? "We've got a guy for that." : isAdmin ? "Platform Overview & Approvals" : "Pick up a job and get paid."}</p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
             <div className="relative">
                 <button onClick={() => { setIsNotifOpen(!isNotifOpen); if(currentUser) markNotificationsRead(currentUser.id); }} className="p-3 bg-white text-navy-600 rounded-full shadow-soft hover:shadow-lg hover:scale-105 transition-all relative border border-slate-100">
                     <Bell className="w-6 h-6" />
                     {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-100"></span>}
                 </button>
                 {isNotifOpen && (
                     <div className="absolute right-0 mt-3 w-72 sm:w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-5">
                         <div className="p-4 border-b border-slate-50 font-bold text-navy-900 flex justify-between items-center"><span>Notifications</span><span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500">{unreadCount} new</span></div>
                         <div className="max-h-[400px] overflow-y-auto">
                             {myNotifications.length === 0 ? <div className="p-8 text-center text-sm text-slate-400">No new alerts</div> : 
                                 myNotifications.map(n => (
                                     <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm ${n.type === 'ALERT' ? 'bg-red-50/50 text-red-900 font-medium' : ''}`}>{n.type === 'ALERT' && <Siren className="w-4 h-4 inline mr-2 text-red-500" />}{n.message}<div className="text-[10px] text-slate-400 mt-1">{formatDistanceToNow(n.timestamp)} ago</div></div>
                                 ))
                             }
                         </div>
                     </div>
                 )}
             </div>
        </div>
      </div>

      {isAdmin && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div onClick={() => navigate('/staff')} className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-gold-200 group">
                    <div className="flex justify-between items-start mb-4"><div className="p-4 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-colors"><Users className="w-8 h-8" /></div>{pendingProviders > 0 && <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg shadow-red-200">{pendingProviders} Pending</span>}</div>
                    <h3 className="text-3xl font-extrabold text-navy-900 mb-1">{pendingProviders}</h3><p className="text-slate-500 font-bold">Provider Applications</p><p className="text-xs text-slate-400 mt-2">Requires verification</p>
                </div>
                <div onClick={() => navigate('/schedule')} className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-gold-200 group">
                    <div className="flex justify-between items-start mb-4"><div className="p-4 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors"><Zap className="w-8 h-8" /></div></div>
                    <h3 className="text-3xl font-extrabold text-navy-900 mb-1">{openRequestsCount}</h3><p className="text-slate-500 font-bold">Open Requests</p><p className="text-xs text-slate-400 mt-2">Waiting for a Guy</p>
                </div>
                <div onClick={() => navigate('/schedule')} className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-gold-200 group">
                    <div className="flex justify-between items-start mb-4"><div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors"><CheckCircle2 className="w-8 h-8" /></div></div>
                    <h3 className="text-3xl font-extrabold text-navy-900 mb-1">{activeGigsCount}</h3><p className="text-slate-500 font-bold">Active Jobs</p><p className="text-xs text-slate-400 mt-2">Currently in progress</p>
                </div>
            </div>
            <div className="mt-8 bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-navy-900 mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-slate-500" /> Market Health: Unclaimed Gigs</h3>
                {unclaimedByCategory.length === 0 ? <p className="text-slate-400 text-sm">All posted jobs are claimed!</p> : <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{unclaimedByCategory.map(([cat, count]) => <div key={cat} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase truncate" title={cat}>{cat}</span><span className="text-2xl font-black text-navy-900 mt-1">{count}</span></div>)}</div>}
            </div>
            <div className="mt-12 pt-12 border-t border-slate-200">
                <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center"><Rocket className="w-5 h-5 mr-2 text-purple-600" /> Service Catalog Preview <span className="ml-3 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full uppercase tracking-wider font-bold">Admin View</span></h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 opacity-75 hover:opacity-100 transition-opacity">{SERVICE_TILES.map(service => <ServiceCard key={service.id} title={service.title} icon={service.icon} colorClass={service.color} onClick={() => startRequest(service.id as ServiceCategory)} disabled={!activeCategories.has(service.id)} />)}</div>
            </div>
          </>
      )}

      {isClient && (
          <>
            {renderServiceGrid()}
            {renderMyRequests()}
          </>
      )}

      {isProvider && (
          <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold text-navy-900 flex items-center"><Zap className="w-5 h-5 mr-2 text-gold-500" fill="currentColor" /> Available Gigs</h2>
                          {currentUser && <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-soft hover:shadow-md transition-all cursor-pointer"><label className="flex items-center cursor-pointer"><div className="relative"><input type="checkbox" className="sr-only" checked={currentUser.urgentAlertsEnabled} onChange={toggleUrgentAlerts} /><div className={`block w-9 h-5 rounded-full transition-colors ${currentUser.urgentAlertsEnabled ? 'bg-red-500' : 'bg-slate-300'}`}></div><div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${currentUser.urgentAlertsEnabled ? 'transform translate-x-4' : ''}`}></div></div><span className="ml-3 text-xs font-bold text-navy-900 uppercase tracking-wide">Emergency Texts</span></label></div>}
                      </div>
                      {!isVerifiedInsured && <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm"><div className="flex items-start"><ShieldCheck className="w-6 h-6 text-blue-600 mr-3 shrink-0" /><div><h3 className="text-sm font-bold text-blue-800">Verify to unlock all jobs</h3><p className="text-xs text-blue-700 mt-1">Some high-risk categories are locked until your insurance is verified.</p><button onClick={() => navigate('/profile')} className="mt-2 text-xs font-bold bg-white text-blue-600 px-3 py-1 rounded border border-blue-200 shadow-sm hover:bg-blue-50">Update Insurance</button></div></div></div>}
                      <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-400" /><span className="text-xs font-bold text-slate-500 uppercase">Filters:</span></div>
                            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as ServiceCategory | 'ALL')} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-navy-900 outline-none focus:ring-2 focus:ring-gold-400"><option value="ALL">All Categories</option>{ALL_SERVICE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                            <div className="relative"><span className="absolute left-3 top-2 text-slate-400 text-sm">$</span><input type="number" placeholder="Min Pay" value={filterMinPay ?? ''} onChange={(e) => setFilterMinPay(e.target.value ? parseFloat(e.target.value) : '')} className="w-28 pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-navy-900 outline-none focus:ring-2 focus:ring-gold-400"/></div>
                            {(filterCategory !== 'ALL' || filterMinPay !== '') && <button onClick={() => { setFilterCategory('ALL'); setFilterMinPay(''); }} className="text-xs font-bold text-red-500 hover:text-red-700 ml-auto">Clear All</button>}
                      </div>
                      {!hasAuthorizedSkills && <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 text-sm text-red-800 mb-6 shadow-sm"><Lock className="w-6 h-6 shrink-0 mt-0.5" /><div><p className="font-bold text-base">No Authorized Skills</p><p className="mt-1 opacity-90">You have not been authorized for any job categories yet.</p></div></div>}
                      
                      {sortedAvailableGigs.eligible.length === 0 && sortedAvailableGigs.ineligible.length === 0 ? (
                          <div className="p-12 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">No open gigs matching your filters.</div>
                      ) : (
                          <div className="space-y-4">
                              {sortedAvailableGigs.eligible.map(gig => renderGigCard(gig))}
                              {sortedAvailableGigs.ineligible.length > 0 && (
                                  <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="h-px bg-red-200 flex-1"></div>
                                        <span className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center bg-red-50 px-3 py-1 rounded-full border border-red-100 shadow-sm">
                                            <Lock className="w-3 h-3 mr-2" /> Requirements Not Met
                                        </span>
                                        <div className="h-px bg-red-200 flex-1"></div>
                                    </div>
                                    <div className="opacity-75 hover:opacity-100 transition-opacity duration-300">
                                        {sortedAvailableGigs.ineligible.map(gig => renderGigCard(gig))}
                                    </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
                  
                  <div>
                      <h2 className="text-xl font-bold text-navy-900 mb-6">My Upcoming Schedule</h2>
                      <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
                          {myProviderGigs.length === 0 ? <div className="text-slate-400 text-center py-8 text-sm">No claimed gigs yet.</div> : <div className="space-y-3">{myProviderGigs.map(gig => <div key={gig.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"><div><div className="font-bold text-navy-900 text-sm">{gig.description}</div><div className="text-xs text-slate-500 mt-0.5">{format(gig.start, 'MMM d, h:mm a')}</div></div><div className="flex flex-col items-end gap-1"><span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase tracking-wider">{gig.status}</span><button onClick={(e) => handleChatClick(e, gig)} className="text-[10px] font-bold text-navy-600 hover:text-navy-800 flex items-center"><MessageCircle className="w-3 h-3 mr-1" /> Message Client</button></div></div>)}</div>}
                          <button onClick={() => navigate('/schedule')} className="w-full mt-6 py-3 border-2 border-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all text-sm">View Full Calendar</button>
                      </div>
                      <div className="mt-8 space-y-6">
                          <div className="bg-gradient-to-br from-navy-900 to-navy-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full -mr-10 -mt-10 blur-2xl"></div><div className="relative z-10"><h3 className="font-bold text-gold-400 text-lg mb-1 uppercase tracking-wider text-xs">Total Earnings</h3><div className="text-5xl font-black mb-6 tracking-tight">${totalEarnings.toFixed(2)}</div><div className="flex gap-3"><button onClick={() => navigate('/payroll')} className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl text-sm font-bold transition-all backdrop-blur-sm border border-white/10">View Details</button></div></div></div>
                          {isReferralEnabled && <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex items-center justify-between hover:shadow-lg transition-all"><div><h3 className="font-bold text-navy-900 flex items-center mb-1"><UserPlus className="w-5 h-5 mr-2 text-gold-500" /> Refer a Pro</h3><p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">Earn $50 for every skilled pro you bring to the crew.</p></div><button onClick={() => openReferralModal('PROVIDER')} className="p-4 bg-navy-50 text-navy-600 rounded-2xl hover:bg-navy-100 hover:text-navy-700 transition-colors shadow-sm" title="Share Referral Link"><Share2 className="w-5 h-5" /></button></div>}
                      </div>
                  </div>
              </div>

              <div className="mt-16 pt-12 border-t border-slate-200">
                  <div className="mb-8">
                      <h2 className="text-2xl font-bold text-navy-900 mb-2 flex items-center">
                          <Users className="w-6 h-6 mr-2 text-indigo-600" /> Staffing & Subcontracting
                      </h2>
                      <p className="text-slate-500">Need extra hands for a job? Post a gig to hire another pro. These expenses will be tracked in your Tax Center.</p>
                  </div>
                  {renderServiceGrid()}
                  {renderMyRequests()}
              </div>
          </>
      )}

      {/* Request Modal */}
      {isRequestModalOpen && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                  <div className={`p-6 text-white flex justify-between items-center ${isUrgent ? 'bg-red-600' : 'bg-navy-900'}`}>
                      <h3 className="font-extrabold text-xl flex items-center tracking-tight">{isUrgent ? <Siren className="w-6 h-6 mr-3 text-white animate-pulse" /> : <Zap className="w-6 h-6 mr-3 text-gold-400" />}{editingGig ? 'Update Request' : `Request a Guy: ${selectedCategory}`}</h3>
                      <button onClick={() => setIsRequestModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Trash2 className="w-5 h-5 text-white/70 hover:text-white" /></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${isUrgent ? 'bg-red-50 border-red-500 shadow-inner' : 'bg-slate-50 border-slate-200'}`} onClick={() => setIsUrgent(!isUrgent)}>
                          <div className="flex items-center gap-3"><div className={`p-2 rounded-full ${isUrgent ? 'bg-red-200 text-red-700' : 'bg-slate-200 text-slate-500'}`}><AlertTriangle className="w-6 h-6" /></div><div><p className={`font-bold text-sm ${isUrgent ? 'text-red-700' : 'text-slate-600'}`}>Is this an Emergency?</p><p className="text-[10px] text-slate-500">Urgent requests alert providers immediately.</p></div></div><div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isUrgent ? 'bg-red-600' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isUrgent ? 'translate-x-6' : 'translate-x-1'}`} /></div>
                      </div>
                      <div><label className="block text-sm font-bold text-navy-900 mb-2">What needs doing?</label><textarea value={requestDesc} onChange={e => setRequestDesc(e.target.value)} placeholder={getPlaceholderForCategory(selectedCategory)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none h-32 resize-none transition-all text-sm"/></div>
                      <div>
                          <label className="block text-sm font-bold text-navy-900 mb-2">Where?</label>
                          <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-gold-100 focus:border-gold-400 transition-all text-sm font-medium">{sites.map(s => <option key={s.id} value={s.id}>{s.name} - {s.address}</option>)}</select>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-navy-900">Offer Price ($)</label>
                            {priceSuggestion && (
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setEstimatedPrice(priceSuggestion.avg.toString())} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center gap-1"><Sparkles className="w-3 h-3" /> Avg: ${priceSuggestion.avg}</button>
                                    {priceSuggestion.examples.length > 0 && (
                                        <button type="button" onClick={() => setShowPriceExamples(!showPriceExamples)} className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1">See examples {showPriceExamples ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button>
                                    )}
                                </div>
                            )}
                        </div>
                        <input type="number" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} placeholder={priceSuggestion ? `e.g. ${priceSuggestion.avg}` : "50"} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none font-bold text-lg transition-all" />
                        
                        {/* Improved Drill Down Visuals */}
                        {showPriceExamples && priceSuggestion && priceSuggestion.examples.length > 0 && (
                            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 animate-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center border-b border-blue-200 pb-2">
                                    <Info className="w-4 h-4 mr-2" /> Recent Completed Jobs
                                </p>
                                <div className="space-y-3">
                                    {priceSuggestion.examples.map((ex: any) => (
                                        <div key={ex.id} className="flex justify-between items-start text-xs bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                            <div className="flex-1 pr-4">
                                                <span className="font-bold text-navy-900 block mb-1">{ex.description}</span>
                                                <span className="text-slate-400 block">{ex.completedAt ? formatDistanceToNow(new Date(ex.completedAt)) + ' ago' : 'Recently'}</span>
                                            </div>
                                            <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 whitespace-nowrap">${ex.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                      </div>
                      <button onClick={submitRequest} disabled={!requestDesc || !estimatedPrice} className={`w-full py-4 text-white font-extrabold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all mt-2 disabled:opacity-50 disabled:hover:translate-y-0 ${isUrgent ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-gold-400 text-navy-900 hover:bg-gold-500 shadow-gold-200'}`}>{editingGig ? 'UPDATE REQUEST' : (isUrgent ? 'BROADCAST URGENT REQUEST' : 'GET A GUY!')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* Other Modals (Payment, Counter, Review, Chat) remain mostly unchanged but included for completeness */}
      {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-extrabold text-navy-900 flex items-center"><CreditCard className="w-6 h-6 mr-2 text-blue-600" /> Payment Required</h2><button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button></div>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">To prevent spam and ensure providers get paid, we require a valid payment method on file before you can post a request.<br/><br/><strong>No charge is made now.</strong> We only place a hold when a provider accepts your job.</p>
                  <div className="space-y-4"><div className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden group"><div className="flex items-center justify-between mb-4"><span className="font-bold text-navy-900 tracking-widest">•••• •••• •••• 4242</span><div className="w-8 h-5 bg-red-500/20 rounded-sm"></div></div><div className="flex justify-between text-xs text-slate-400 uppercase tracking-wider font-bold"><span>Card Holder</span><span>Expires</span></div><div className="flex justify-between text-sm font-bold text-navy-800"><span>{currentUser?.name}</span><span>12/28</span></div><div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"><span className="text-xs font-bold text-navy-900 bg-white px-2 py-1 rounded shadow-sm">Mock Card</span></div></div><button onClick={() => { if(currentUser) { updateUser({ ...currentUser, hasPaymentMethod: true }); setIsPaymentModalOpen(false); alert("Card added successfully! You can now post your request."); } }} className="w-full py-4 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 shadow-lg transition-all hover:-translate-y-0.5 flex items-center justify-center"><Lock className="w-4 h-4 mr-2" /> Securely Add Card</button></div>
              </div>
          </div>
      )}
      {/* ... (Other modals kept implicit to avoid exceeding token limits, logic verified in previous turns) ... */}
      {/* Skill Application Modal */}
      {skillApplyCategory && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                          <Briefcase className="w-6 h-6 mr-2 text-gold-500" /> Apply for Skill
                      </h3>
                      <button onClick={() => setSkillApplyCategory(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-400" />
                      </button>
                  </div>
                  
                  <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-600 font-medium">You are requesting authorization for:</p>
                      <p className="text-lg font-black text-navy-900 mt-1">{skillApplyCategory}</p>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-navy-900 mb-2">Experience / Qualifications</label>
                          <textarea 
                              value={skillExperience}
                              onChange={(e) => setSkillExperience(e.target.value)}
                              placeholder="Briefly describe your experience in this field..."
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none h-32 resize-none text-sm transition-all"
                          />
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              onClick={() => setSkillApplyCategory(null)}
                              className="flex-1 py-3 bg-white border-2 border-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={() => {
                                  submitSkillApplication();
                                  setSkillApplyCategory(null);
                              }}
                              disabled={!skillExperience.trim()}
                              className="flex-1 py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              Submit Application
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Counter Offer Modal (Provider) */}
      {counterGig && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                          <Scale className="w-6 h-6 mr-2 text-gold-500" /> Make Counter Offer
                      </h3>
                      <button onClick={() => setCounterGig(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-400" />
                      </button>
                  </div>
                  
                  <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Original Request</p>
                      <p className="font-bold text-navy-900 text-lg">{counterGig.description}</p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                          <span className="text-sm text-slate-600">Client Offer:</span>
                          <span className="font-black text-emerald-600 text-lg">${counterGig.price}</span>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-navy-900 mb-2">Your Price ($)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-4 text-slate-400 font-bold">$</span>
                              <input 
                                  type="number" 
                                  value={counterAmount}
                                  onChange={(e) => setCounterAmount(e.target.value)}
                                  className="w-full pl-8 p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none font-black text-xl text-navy-900 transition-all"
                                  placeholder="0.00"
                              />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-navy-900 mb-2">Message to Client</label>
                          <textarea 
                              value={counterMessage}
                              onChange={(e) => setCounterMessage(e.target.value)}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none h-32 resize-none text-sm transition-all"
                              placeholder="Explain why you are requesting a different price..."
                          />
                      </div>

                      <button 
                          onClick={handleCounterSubmit}
                          disabled={!counterAmount || parseFloat(counterAmount) <= 0}
                          className="w-full py-4 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center"
                      >
                          <Send className="w-5 h-5 mr-2" /> Send Counter Offer
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Review Offers Modal (Client) */}
      {reviewOffersGig && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                          <Scale className="w-6 h-6 mr-2 text-indigo-600" /> Review Offers
                      </h3>
                      <button onClick={() => setReviewOffersGig(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-400" />
                      </button>
                  </div>

                  <div className="mb-6">
                      <h4 className="font-bold text-navy-900 mb-1">{reviewOffersGig.description}</h4>
                      <p className="text-sm text-slate-500">Original Budget: ${reviewOffersGig.price}</p>
                  </div>
                  
                  <div className="space-y-4">
                      {reviewOffersGig.counterOffers?.filter(o => o.status === 'PENDING').length === 0 ? (
                          <div className="text-center py-8 text-slate-400">
                              No pending offers at the moment.
                          </div>
                      ) : (
                          reviewOffersGig.counterOffers?.filter(o => o.status === 'PENDING').map(offer => {
                              const provider = users.find(u => u.id === offer.providerId);
                              return (
                                  <div key={offer.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-colors">
                                      <div className="flex justify-between items-start mb-3">
                                          <div className="flex items-center gap-3">
                                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                                                  {provider?.profileImage ? (
                                                      <img src={provider.profileImage} alt="Profile" className="h-full w-full object-cover" />
                                                  ) : (
                                                      provider?.name.charAt(0)
                                                  )}
                                              </div>
                                              <div>
                                                  <div className="font-bold text-navy-900">{provider?.name}</div>
                                                  <div className="text-xs text-slate-500 flex items-center">
                                                      <Star className="w-3 h-3 text-gold-400 mr-1 fill-current" /> {provider?.rating} Rating
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-2xl font-black text-emerald-600">${offer.amount}</div>
                                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                  {offer.amount > (reviewOffersGig.price || 0) ? `+$${offer.amount - (reviewOffersGig.price || 0)}` : 'Match'}
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="bg-white p-3 rounded-xl border border-slate-100 text-sm text-slate-600 italic mb-4 relative">
                                          <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-slate-100 transform rotate-45"></div>
                                          "{offer.message}"
                                      </div>

                                      <div className="flex gap-3">
                                          <button 
                                              onClick={() => handleDeclineCounter(offer)}
                                              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                                          >
                                              Decline
                                          </button>
                                          <button 
                                              onClick={() => handleAcceptCounter(offer)}
                                              className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center"
                                          >
                                              Accept Offer
                                          </button>
                                      </div>
                                  </div>
                              );
                          })
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Chat Modal */}
      {chatGig && currentUser && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col h-[500px] animate-in zoom-in-95 overflow-hidden">
                  {/* Chat Header */}
                  <div className="bg-navy-900 p-4 flex justify-between items-center shadow-md z-10">
                      <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gold-400 flex items-center justify-center text-navy-900 font-bold overflow-hidden">
                              {getChatPartner(chatGig)?.profileImage ? (
                                  <img src={getChatPartner(chatGig)?.profileImage} alt="Profile" className="h-full w-full object-cover" />
                              ) : (
                                  getChatPartnerName(chatGig).charAt(0)
                              )}
                          </div>
                          <div>
                              <h3 className="font-bold text-white text-sm">{getChatPartnerName(chatGig)}</h3>
                              <p className="text-navy-200 text-xs">{chatGig.category}</p>
                          </div>
                      </div>
                      <button onClick={() => setChatGig(null)} className="p-2 hover:bg-navy-800 rounded-full text-white/70 hover:text-white transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 bg-slate-50 p-4 overflow-y-auto" ref={chatScrollRef}>
                      {messages.filter(m => m.shiftId === chatGig.id).length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-8">
                              <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
                              <p>No messages yet.</p>
                              <p>Coordinate schedule and arrival details here.</p>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {messages.filter(m => m.shiftId === chatGig.id).map(msg => {
                                  const isMe = msg.senderId === currentUser.id;
                                  return (
                                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                              isMe 
                                              ? 'bg-blue-600 text-white rounded-br-none' 
                                              : 'bg-white text-navy-900 border border-slate-200 rounded-bl-none'
                                          }`}>
                                              {msg.content}
                                              <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                                  {format(msg.timestamp, 'h:mm a')}
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>

                  {/* Input Area */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                      <input 
                          type="text" 
                          className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-navy-900"
                          placeholder="Type a message..."
                          value={chatMessage}
                          onChange={e => setChatMessage(e.target.value)}
                      />
                      <button 
                          type="submit" 
                          disabled={!chatMessage.trim()}
                          className="p-2.5 bg-gold-400 text-navy-900 rounded-full hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                          <Send className="w-4 h-4" />
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};