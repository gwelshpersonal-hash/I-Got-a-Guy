
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Shift, ShiftStatus, Role } from '../types';
import { format, isToday, isPast, isSameDay } from 'date-fns';
import { MapPin, CheckCircle2, MessageSquare, Clock, AlertCircle, ChevronRight, Star, Calendar, Image as ImageIcon, Camera, X, MessageCircle, Send, ShieldCheck, Lock, Navigation } from 'lucide-react';
import { getCurrentPosition } from '../utils/geo';
import { CATEGORY_RISK_MAPPING, RISK_LEVELS } from '../constants';

export const TimeClock = () => {
  const { currentUser } = useAuth();
  const { shifts, updateShift, sites, addNotification, messages, sendMessage, users } = useData();
  
  const [selectedJob, setSelectedJob] = useState<Shift | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Price Adjustment State
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [priceChangeReason, setPriceChangeReason] = useState('');
  
  // Completion Photos State
  const [completionImages, setCompletionImages] = useState<string[]>([]);
  // Pre-Work Photos State
  const [preWorkImages, setPreWorkImages] = useState<string[]>([]);

  // Chat State
  const [chatGig, setChatGig] = useState<Shift | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Filter jobs for this provider that are accepted and either today or past (incomplete)
  // Include EN_ROUTE
  const myJobs = shifts.filter(s => {
      if (s.userId !== currentUser?.id) return false;
      const isRelevantDay = isToday(s.start) || (isPast(s.start) && (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.EN_ROUTE));
      return (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.IN_PROGRESS || s.status === ShiftStatus.EN_ROUTE) && isRelevantDay;
  });

  const upcomingJobs = shifts.filter(s => {
      if (s.userId !== currentUser?.id) return false;
      const isFuture = !isToday(s.start) && !isPast(s.start);
      return s.status === ShiftStatus.ACCEPTED && isFuture;
  });

  const completedToday = shifts.filter(s => 
    s.userId === currentUser?.id && 
    (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED) &&
    (s.completedAt && isSameDay(new Date(s.completedAt), new Date()))
  );

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatGig]);

  const handleOpenJob = (job: Shift) => {
      setSelectedJob(job);
      setFeedback('');
      setFinalPrice(job.price || 0);
      setPriceChangeReason('');
      setCompletionImages([]);
      setPreWorkImages(job.preWorkPhotos || []);
  };

  const handleStartTravel = (e: React.MouseEvent, job: Shift) => {
      e.stopPropagation();
      updateShift({
          ...job,
          status: ShiftStatus.EN_ROUTE,
          enRouteAt: new Date()
      });
      alert(`Client notified: You are en route to ${job.description}!`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'PRE_WORK' | 'COMPLETION') => {
    const files = e.target.files;
    if (files) {
        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    if (type === 'PRE_WORK') {
                        setPreWorkImages(prev => [...prev, reader.result as string]);
                        // Auto-save pre-work photos to the shift object immediately so they persist if modal closes
                        if (selectedJob) {
                            // We do a "silent" update to the main state
                            updateShift({
                                ...selectedJob,
                                preWorkPhotos: [...(selectedJob.preWorkPhotos || []), reader.result as string]
                            });
                        }
                    } else {
                        setCompletionImages(prev => [...prev, reader.result as string]);
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    }
  };

  const removeImage = (index: number, type: 'PRE_WORK' | 'COMPLETION') => {
      if (type === 'PRE_WORK') {
          const newImages = preWorkImages.filter((_, i) => i !== index);
          setPreWorkImages(newImages);
          if (selectedJob) {
              updateShift({ ...selectedJob, preWorkPhotos: newImages });
          }
      } else {
          setCompletionImages(prev => prev.filter((_, i) => i !== index));
      }
  };

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

  const getChatPartnerName = (shift: Shift) => {
      if (currentUser?.role === Role.CLIENT) {
          return users.find(u => u.id === shift.userId)?.name || "Provider";
      } else {
          return users.find(u => u.id === shift.clientId)?.name || "Client";
      }
  };

  const handleCompleteJob = async () => {
      if (!selectedJob || !currentUser) return;

      // GUARDRAIL: Strict High Value Photo Lock
      if (selectedJob.hasHighValueItems && preWorkImages.length === 0) {
          alert("STOP: This job involves high-value items. You MUST upload at least one pre-work photo showing condition before you can complete the job.");
          return;
      }

      // GUARDRAIL: Mandatory Proof of Work (Completion Photos)
      if (completionImages.length === 0) {
          alert("Proof of Work Required: You MUST upload at least one photo showing the completed work to close this job.");
          return;
      }

      const originalPrice = selectedJob.price || 0;

      // Validation: If price changed, reason is mandatory
      if (finalPrice !== originalPrice && !priceChangeReason.trim()) {
          alert("Please provide a reason for the price adjustment.");
          return;
      }

      setIsSubmitting(true);

      // ATTEMPT HARD GPS LOCK (Restored 90-hour Logic)
      let completionCoords = { lat: 0, lng: 0 };
      try {
          const pos = await getCurrentPosition();
          completionCoords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
          };
      } catch (error) {
          console.error("GPS Verification Failed", error);
          // HARD LOCK: Block completion for high-risk or high-value jobs if GPS fails
          if (selectedJob.hasHighValueItems || (selectedJob.price || 0) > 200) {
              alert("GPS LOCK REQUIRED: We cannot verify service delivery without a location fix. Please ensure location services are enabled and try again.");
              setIsSubmitting(false);
              return; 
          }
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      let finalFeedback = feedback;
      // Append price change info to feedback so client sees it
      if (finalPrice !== originalPrice) {
          const adjustmentNote = `[PRICE ADJUSTMENT] Changed from $${originalPrice} to $${finalPrice}.\nReason: ${priceChangeReason}`;
          finalFeedback = finalFeedback ? `${finalFeedback}\n\n${adjustmentNote}` : adjustmentNote;
      }

      const updatedJob: Shift = {
          ...selectedJob,
          status: ShiftStatus.COMPLETED,
          providerFeedback: finalFeedback,
          price: finalPrice, // Update to new price
          completedAt: new Date(),
          completionPhotos: completionImages,
          preWorkPhotos: preWorkImages, // Ensure final save captures these
          completionLat: completionCoords.lat || undefined,
          completionLng: completionCoords.lng || undefined
      };

      updateShift(updatedJob);
      
      // Notify client logic now handled centrally in DataContext

      setIsSubmitting(false);
      setSelectedJob(null);
      alert("Great work! Job marked as complete.");
  };

  const isCompleteDisabled = (selectedJob?.hasHighValueItems && preWorkImages.length === 0) || completionImages.length === 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
       <div>
            <h1 className="text-2xl font-bold text-navy-950">On The Job</h1>
            <p className="text-slate-500">Manage your active assignments for today.</p>
       </div>

       <div className="space-y-4">
            <h2 className="text-lg font-bold text-navy-900 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-gold-500" /> To Do
            </h2>
            
            {myJobs.length === 0 ? (
                <div className="p-8 bg-white border border-dashed border-slate-300 rounded-xl text-center text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>You're all caught up! No active jobs scheduled for today.</p>
                </div>
            ) : (
                myJobs.map(job => {
                    const site = sites.find(s => s.id === job.siteId);
                    const isEnRoute = job.status === ShiftStatus.EN_ROUTE;
                    return (
                        <div 
                            key={job.id} 
                            onClick={() => handleOpenJob(job)}
                            className={`bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${isEnRoute ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gold-200'}`}
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${isEnRoute ? 'bg-blue-500' : 'bg-gold-400 group-hover:bg-gold-500'}`}></div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold bg-navy-50 text-navy-700 px-2 py-0.5 rounded uppercase">
                                            {job.category}
                                        </span>
                                        <span className="text-xs text-slate-500 flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {format(job.start, 'h:mm a')}
                                        </span>
                                        {job.hasHighValueItems && (
                                            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 flex items-center">
                                                <ShieldCheck className="w-3 h-3 mr-1" /> HIGH VALUE
                                            </span>
                                        )}
                                        {isEnRoute && (
                                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 flex items-center animate-pulse">
                                                <Navigation className="w-3 h-3 mr-1" /> EN ROUTE
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-navy-900">{job.description}</h3>
                                    <p className="text-sm text-slate-600 flex items-center mt-2">
                                        <MapPin className="w-4 h-4 mr-1 text-slate-400" /> 
                                        {site?.address || 'Unknown Location'}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xl font-black text-emerald-600">${job.price}</span>
                                    
                                    <div className="flex gap-2 mt-4">
                                        {!isEnRoute && (
                                            <button 
                                                onClick={(e) => handleStartTravel(e, job)}
                                                className="p-2 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors z-10 shadow-md animate-in zoom-in"
                                                title="Start Travel (Notify Client)"
                                            >
                                                <Navigation className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => handleChatClick(e, job)}
                                            className="p-2 bg-navy-50 rounded-full text-navy-600 hover:bg-navy-100 transition-colors z-10"
                                            title="Message Client"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 bg-navy-50 rounded-full text-navy-600 group-hover:bg-navy-600 group-hover:text-white transition-colors">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
       </div>

       {/* ... (Upcoming and Completed Sections - unchanged) ... */}
       {upcomingJobs.length > 0 && (
           <div className="space-y-4 pt-4 border-t border-slate-200">
                <h2 className="text-lg font-bold text-navy-900 flex items-center opacity-75">
                    <Calendar className="w-5 h-5 mr-2 text-blue-500" /> Upcoming Jobs
                </h2>
                <p className="text-xs text-slate-500 mb-2">Select a job to mark it complete early.</p>
                {upcomingJobs.map(job => {
                    const site = sites.find(s => s.id === job.siteId);
                    return (
                        <div 
                            key={job.id} 
                            onClick={() => handleOpenJob(job)}
                            className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold bg-navy-50 text-navy-700 px-2 py-0.5 rounded uppercase">
                                            {job.category}
                                        </span>
                                        <span className="text-xs text-slate-500 flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {format(job.start, 'MMM d, h:mm a')}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-navy-900">{job.description}</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {site?.address || 'Unknown Location'}
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-slate-400">${job.price}</span>
                            </div>
                        </div>
                    );
                })}
           </div>
       )}

       {completedToday.length > 0 && (
           <div className="space-y-4 pt-4 border-t border-slate-200">
                <h2 className="text-lg font-bold text-navy-900 flex items-center opacity-75">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" /> Completed Today
                </h2>
                {completedToday.map(job => (
                    <div key={job.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 opacity-75">
                         <div className="flex justify-between items-center">
                             <div>
                                 <h3 className="font-bold text-slate-700 line-through">{job.description}</h3>
                                 <p className="text-xs text-slate-500">Completed at {job.completedAt ? format(new Date(job.completedAt), 'h:mm a') : 'Unknown'}</p>
                             </div>
                             <span className="text-sm font-bold text-emerald-600">${job.price}</span>
                         </div>
                    </div>
                ))}
           </div>
       )}

       {/* Job Completion Modal */}
       {selectedJob && (
           <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                   <div className="flex justify-between items-start mb-6">
                       <div>
                           <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-bold text-navy-900">Job Details</h2>
                                {selectedJob.hasHighValueItems && (
                                    <span className="text-[10px] font-bold bg-purple-600 text-white px-2 py-1 rounded shadow-sm flex items-center">
                                        <ShieldCheck className="w-3 h-3 mr-1" /> HIGH VALUE
                                    </span>
                                )}
                           </div>
                           <p className="text-slate-500 text-sm">{selectedJob.description}</p>
                       </div>
                       <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-navy-900">
                           <span className="sr-only">Close</span>
                           <X className="w-6 h-6" />
                       </button>
                   </div>

                   {/* Add Chat Button inside Modal */}
                   <div className="mb-6 flex justify-end">
                       <button 
                            onClick={(e) => handleChatClick(e, selectedJob)}
                            className="text-xs font-bold text-navy-600 bg-navy-50 hover:bg-navy-100 px-4 py-2 rounded-lg flex items-center transition-colors"
                       >
                            <MessageCircle className="w-4 h-4 mr-2" /> Message Client
                       </button>
                   </div>

                   {/* Pre-Work Proof of Condition (Required for High Value) */}
                   {selectedJob.hasHighValueItems && (
                       <div className="mb-6 bg-purple-50 p-4 rounded-xl border border-purple-200">
                           <label className="block text-sm font-bold text-purple-900 mb-2 flex items-center">
                               <AlertCircle className="w-4 h-4 mr-2" /> Required: Proof of Condition
                           </label>
                           <p className="text-xs text-purple-700 mb-3">
                               You must upload photos of high-value items <strong>before</strong> handling them to protect against damage claims.
                           </p>
                           
                           <div className="flex flex-wrap gap-3">
                               {preWorkImages.map((img, idx) => (
                                   <div key={idx} className="w-20 h-20 relative rounded-xl overflow-hidden border border-purple-200 shadow-sm group">
                                       <img src={img} alt="Pre-work condition" className="w-full h-full object-cover" />
                                       <button 
                                         onClick={() => removeImage(idx, 'PRE_WORK')}
                                         className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                       >
                                           <X className="w-3 h-3" />
                                       </button>
                                   </div>
                               ))}
                               
                               <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-100 transition-colors text-purple-400 hover:text-purple-600">
                                   <Camera className="w-6 h-6 mb-1" />
                                   <span className="text-[10px] font-bold">Add</span>
                                   <input 
                                     type="file" 
                                     accept="image/*" 
                                     multiple 
                                     className="hidden" 
                                     onChange={(e) => handleImageUpload(e, 'PRE_WORK')}
                                   />
                               </label>
                           </div>
                       </div>
                   )}

                   {/* Attached Photos Viewer (Initial Job Photos) */}
                   {selectedJob.photos && selectedJob.photos.length > 0 && (
                       <div className="mb-6">
                           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                               <ImageIcon className="w-4 h-4 mr-1" /> Initial Site Photos
                           </h3>
                           <div className="flex gap-3 overflow-x-auto pb-2">
                               {selectedJob.photos.map((photo, i) => (
                                   <div key={i} className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                                       <img src={photo} alt={`Job site ${i}`} className="w-full h-full object-cover" />
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}

                   <div className="bg-gold-50 p-4 rounded-xl border border-gold-200 mb-6 transition-all">
                       <div className="flex justify-between items-center mb-2">
                           <span className="text-sm font-bold text-navy-900">Final Payout ($)</span>
                           <input 
                               type="number" 
                               value={finalPrice}
                               onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)}
                               className="w-32 p-2 bg-white border border-gold-300 rounded-lg text-right font-black text-xl outline-none focus:ring-2 focus:ring-gold-400 text-navy-900"
                           />
                       </div>
                       
                       <div className="text-xs text-slate-500 mb-2">
                           Original Estimate: ${selectedJob.price || 0}
                       </div>

                       {/* Price Change Reason Input */}
                       {finalPrice !== (selectedJob.price || 0) && (
                           <div className="mt-3 pt-3 border-t border-gold-200 animate-in slide-in-from-top-2">
                               <div className="flex items-start gap-2 mb-2">
                                   <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                                   <span className="text-xs font-bold text-amber-700">Price changed. Please explain why:</span>
                                </div>
                               <textarea 
                                   placeholder="e.g. Required extra materials ($40) and took 1 hour longer than expected..."
                                   className="w-full p-3 bg-white border border-gold-300 rounded-lg text-sm focus:ring-2 focus:ring-gold-400 outline-none"
                                   rows={2}
                                   value={priceChangeReason}
                                   onChange={(e) => setPriceChangeReason(e.target.value)}
                               />
                           </div>
                       )}
                       
                       <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-gold-200/50">
                           Site: {sites.find(s => s.id === selectedJob.siteId)?.address}
                       </div>
                   </div>

                   {/* Completion Photos Upload */}
                   <div className="mb-6">
                       <label className="block text-sm font-bold text-navy-900 mb-2">Proof of Work (Completion Photos) <span className="text-red-500">*</span></label>
                       <div className="flex flex-wrap gap-3">
                           {completionImages.map((img, idx) => (
                               <div key={idx} className="w-20 h-20 relative rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                                   <img src={img} alt="Completion proof" className="w-full h-full object-cover" />
                                   <button 
                                     onClick={() => removeImage(idx, 'COMPLETION')}
                                     className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                   >
                                       <X className="w-3 h-3" />
                                   </button>
                               </div>
                           ))}
                           
                           <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-gold-400 hover:bg-gold-50 transition-colors text-slate-400 hover:text-gold-600">
                               <Camera className="w-6 h-6 mb-1" />
                               <span className="text-[10px] font-bold">Add</span>
                               <input 
                                 type="file" 
                                 accept="image/*" 
                                 multiple 
                                 className="hidden" 
                                 onChange={(e) => handleImageUpload(e, 'COMPLETION')}
                               />
                           </label>
                       </div>
                       {completionImages.length === 0 && (
                           <p className="text-xs text-amber-600 mt-2 font-medium flex items-center">
                               <AlertCircle className="w-3 h-3 mr-1" /> Mandatory: Upload at least one photo.
                           </p>
                       )}
                   </div>

                   <div className="space-y-4">
                       <label className="block text-sm font-bold text-navy-900">
                           Job Notes / Feedback
                           <span className="text-slate-400 font-normal ml-2">(Optional)</span>
                       </label>
                       <textarea 
                           className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 outline-none resize-none h-32"
                           placeholder="Describe work done or any issues encountered..."
                           value={feedback}
                           onChange={e => setFeedback(e.target.value)}
                       />
                       
                       {/* GPS Warning Box */}
                       <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start text-xs text-amber-800 shadow-sm">
                           <MapPin className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-amber-600" />
                           <p><strong>GPS Verification Required:</strong> Please mark this job complete while physically at the job site. We capture your location at the moment of completion to verify service delivery and avoid potential disputes.</p>
                       </div>

                       <button 
                           onClick={handleCompleteJob}
                           disabled={isSubmitting || isCompleteDisabled}
                           className={`w-full py-4 text-white text-lg font-bold rounded-xl shadow-lg transition-all flex items-center justify-center ${isCompleteDisabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                           title={isCompleteDisabled ? "Photos required before completion" : "Complete Job"}
                       >
                           {isSubmitting ? 'Verifying Location...' : (
                               isCompleteDisabled ? (
                                   selectedJob?.hasHighValueItems && preWorkImages.length === 0 ? 
                                   <><Lock className="w-5 h-5 mr-2" /> Upload Proof of Condition</> :
                                   <><Camera className="w-5 h-5 mr-2" /> Upload Proof of Work</>
                               ) : (
                                   <><CheckCircle2 className="w-6 h-6 mr-2" /> Mark Job Complete</>
                               )
                           )}
                       </button>
                   </div>
               </div>
           </div>
       )}

      {/* Chat Modal - Moved to end to stack on top */}
      {chatGig && currentUser && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col h-[500px] animate-in zoom-in-95 overflow-hidden">
                  {/* Chat Header */}
                  <div className="bg-navy-900 p-4 flex justify-between items-center shadow-md z-10">
                      <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gold-400 flex items-center justify-center text-navy-900 font-bold">
                              {getChatPartnerName(chatGig).charAt(0)}
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
