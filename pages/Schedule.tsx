import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Shift, ShiftStatus, Role } from '../types';
import { format, isSameDay, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, X, Star, Loader2, ShieldCheck, AlertCircle, ImageIcon, Camera, MessageCircle, Navigation, Scale } from 'lucide-react';

export const Schedule = () => {
    const { currentUser } = useAuth();
    const { shifts, updateShift, sites, verifyJob, users, claimGig } = useData();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

    // Client Dispute & Verification State
    const [isDisputing, setIsDisputing] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    
    // Verification Form State
    const [verificationRating, setVerificationRating] = useState(5);
    const [verificationFeedback, setVerificationFeedback] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const isClient = currentUser?.role === Role.CLIENT;
    const isAdmin = currentUser?.role === Role.ADMIN;
    const isProvider = currentUser?.role === Role.PROVIDER;

    const filteredShifts = shifts.filter(s => {
        if (isAdmin) return true;
        if (isClient) return s.clientId === currentUser?.id;
        if (isProvider) return s.userId === currentUser?.id || s.clientId === currentUser?.id;
        return false;
    });

    const shiftsOnDate = filteredShifts.filter(s => isSameDay(s.start, selectedDate));

    // Calendar Generation
    const weekStart = startOfWeek(selectedDate);
    const weekEnd = endOfWeek(selectedDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const handleOpenShift = (shift: Shift) => {
        setSelectedShift(shift);
        setIsDisputing(false);
        setDisputeReason('');
        setVerificationRating(5);
        setVerificationFeedback('');
        setIsVerifying(false);
    };

    const handleVerifyCompletion = async () => {
        if (!selectedShift) return;
        
        setIsVerifying(true);
        try {
            await verifyJob(selectedShift.id, {
                rating: verificationRating,
                feedback: verificationFeedback
            });
            alert("Success! Funds released to provider.");
            setSelectedShift(null);
        } catch (error: any) {
            alert(`Verification Failed: ${error.message}`);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSubmitDispute = () => {
        if (!selectedShift || !disputeReason) return;
        updateShift({
            ...selectedShift,
            isDisputed: true,
            escrowStatus: 'DISPUTED',
            disputeReason: disputeReason
        });
        alert("Dispute filed. Admin will review.");
        setSelectedShift(null);
    };

    const handleAcceptCounter = async (offerId: string) => {
        if (!selectedShift || !currentUser) return;
        
        const offer = selectedShift.counterOffers?.find(o => o.id === offerId);
        if (!offer) return;

        try {
            // In a real app, this would use the platform config for fees
            const platformFeePercent = 0.20;
            const winningProvider = users.find(u => u.id === offer.providerId);
            const shouldDeduct = winningProvider ? (winningProvider.insuranceType === 'DAILY_SHIELD' || (winningProvider.insuranceType === 'OWN_COI' && !winningProvider.isCoiVerified)) : false;
            
            let insuranceFee = 0;
            if (shouldDeduct) {
                insuranceFee = 2.00; // Flat fee fallback
            }

            await claimGig(selectedShift.id, offer.providerId, {
                insuranceOptIn: shouldDeduct,
                estimatedInsuranceFee: insuranceFee,
                platformFeePercent: platformFeePercent
            });

            await new Promise(resolve => setTimeout(resolve, 800));

            updateShift({
                ...selectedShift,
                userId: offer.providerId,
                price: offer.amount, 
                status: ShiftStatus.ACCEPTED,
                insuranceOptIn: shouldDeduct,
                appliedInsuranceFee: insuranceFee,
                appliedPlatformFee: platformFeePercent,
                escrowStatus: 'SECURED', 
                counterOffers: selectedShift.counterOffers?.map(o => 
                    o.id === offer.id ? { ...o, status: 'ACCEPTED' } : { ...o, status: 'REJECTED' }
                )
            });

            alert("Offer accepted! Funds secured and provider assigned.");
            setSelectedShift(null);
        } catch (error: any) {
            alert(`Payment Failed: ${error.message}`);
        }
    };

    const handleDeclineCounter = async (offerId: string) => {
        if (!selectedShift || !currentUser) return;

        updateShift({
            ...selectedShift,
            counterOffers: selectedShift.counterOffers?.map(o => 
                o.id === offerId ? { ...o, status: 'REJECTED' } : o
            )
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-navy-950">Schedule</h1>
                    <p className="text-slate-500">Manage your upcoming and past jobs.</p>
                </div>
                <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                    <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2 hover:bg-slate-50 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
                    <div className="px-4 py-2 font-bold text-navy-900 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gold-500" />
                        {format(selectedDate, 'MMMM yyyy')}
                    </div>
                    <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2 hover:bg-slate-50 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
                </div>
            </div>

            {/* Week View */}
            <div className="grid grid-cols-7 gap-2 md:gap-4">
                {weekDays.map(day => {
                    const isSelected = isSameDay(day, selectedDate);
                    const hasShift = filteredShifts.some(s => isSameDay(s.start, day));
                    return (
                        <button 
                            key={day.toISOString()}
                            onClick={() => setSelectedDate(day)}
                            className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${
                                isSelected 
                                ? 'bg-navy-900 text-white shadow-lg shadow-navy-200' 
                                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="text-xs font-bold uppercase">{format(day, 'EEE')}</span>
                            <span className={`text-lg font-black mt-1 ${isSelected ? 'text-gold-400' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                            {hasShift && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>}
                        </button>
                    );
                })}
            </div>

            {/* Shift List */}
            <div className="space-y-4">
                <h2 className="font-bold text-navy-900 text-lg flex items-center">
                    {format(selectedDate, 'EEEE, MMM do')}
                </h2>
                {shiftsOnDate.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No jobs scheduled for this day.</p>
                    </div>
                ) : (
                    shiftsOnDate.map(shift => {
                        const site = sites.find(s => s.id === shift.siteId);
                        const isCompleted = shift.status === ShiftStatus.COMPLETED;
                        const isVerified = shift.status === ShiftStatus.VERIFIED;
                        const pendingOffers = shift.counterOffers?.filter(o => o.status === 'PENDING') || [];
                        const hasPendingOffers = pendingOffers.length > 0;
                        
                        // Dynamic Styles for Completed Jobs
                        const cardClasses = isCompleted 
                            ? "bg-emerald-50/60 p-5 rounded-2xl shadow-md border-2 border-emerald-400 hover:shadow-lg transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden" 
                            : isVerified 
                                ? "bg-slate-50 p-5 rounded-2xl shadow-sm border border-slate-200 opacity-80 hover:opacity-100 transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                : hasPendingOffers
                                    ? "bg-indigo-50 p-5 rounded-2xl shadow-sm border border-indigo-200 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                    : "bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4";

                        return (
                            <div 
                                key={shift.id} 
                                onClick={() => handleOpenShift(shift)}
                                className={cardClasses}
                            >
                                {isCompleted && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center z-10">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        ACTION REQUIRED
                                    </div>
                                )}
                                
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl font-bold text-center min-w-[70px] ${isCompleted ? 'bg-white text-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-500'}`}>
                                        <div className="text-xs uppercase">{format(shift.start, 'MMM')}</div>
                                        <div className="text-xl text-navy-900">{format(shift.start, 'd')}</div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-navy-900 text-lg">{shift.description}</h3>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                            <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {format(shift.start, 'h:mm a')} - {format(shift.end, 'h:mm a')}</span>
                                            <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {site?.name}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 mt-2 md:mt-0">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                        shift.status === ShiftStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
                                        shift.status === ShiftStatus.VERIFIED ? 'bg-slate-200 text-slate-600' :
                                        shift.status === ShiftStatus.ACCEPTED ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        {shift.status.replace('_', ' ')}
                                    </span>
                                    {hasPendingOffers && <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full animate-pulse flex items-center"><Scale className="w-3 h-3 mr-1" /> COUNTER OFFER</span>}
                                    {shift.price && <span className="font-black text-navy-900">${shift.price}</span>}
                                    {isCompleted && isClient && <span className="text-xs font-bold text-emerald-600 animate-pulse">Verify Now &rarr;</span>}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Detail Modal */}
            {selectedShift && (
                <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-2xl font-bold text-navy-900">Job Details</h2>
                                    {selectedShift.hasHighValueItems && (
                                        <span className="text-[10px] font-bold bg-purple-600 text-white px-2 py-1 rounded shadow-sm flex items-center">
                                            <ShieldCheck className="w-3 h-3 mr-1" /> HIGH VALUE
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-500 text-sm">{selectedShift.description}</p>
                            </div>
                            <button onClick={() => setSelectedShift(null)} className="text-slate-400 hover:text-navy-900">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Provider View - Full Details */}
                            {isProvider && (
                                <>
                                    {/* Location & Client Info */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="flex items-start gap-3 mb-3">
                                            <MapPin className="w-5 h-5 text-gold-500 mt-0.5 shrink-0" />
                                            <div>
                                                <h4 className="text-sm font-bold text-navy-900">Location</h4>
                                                <a 
                                                    href={`https://maps.google.com/?q=${encodeURIComponent(sites.find(s => s.id === selectedShift.siteId)?.address || '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-blue-600 hover:underline break-words"
                                                >
                                                    {sites.find(s => s.id === selectedShift.siteId)?.address || 'Unknown Address'}
                                                </a>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-5 w-5 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 text-xs font-bold shrink-0 mt-0.5">
                                                {users.find(u => u.id === selectedShift.clientId)?.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-navy-900">Client</h4>
                                                <p className="text-sm text-slate-600">{users.find(u => u.id === selectedShift.clientId)?.name || 'Unknown Client'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pre-Work Photos (Read Only) */}
                                    {selectedShift.preWorkPhotos && selectedShift.preWorkPhotos.length > 0 && (
                                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                                            <label className="block text-sm font-bold text-purple-900 mb-2 flex items-center">
                                                <AlertCircle className="w-4 h-4 mr-2" /> Pre-Work Condition Photos
                                            </label>
                                            <div className="flex gap-3 overflow-x-auto pb-2">
                                                {selectedShift.preWorkPhotos.map((img, i) => (
                                                    <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border border-purple-200 shrink-0 shadow-sm">
                                                        <img src={img} alt={`Pre-work ${i}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Initial Site Photos */}
                                    {selectedShift.photos && selectedShift.photos.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                                                <ImageIcon className="w-4 h-4 mr-1" /> Initial Site Photos
                                            </h3>
                                            <div className="flex gap-3 overflow-x-auto pb-2">
                                                {selectedShift.photos.map((photo, i) => (
                                                    <div key={i} className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                                                        <img src={photo} alt={`Job site ${i}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Completion Photos */}
                                    {selectedShift.completionPhotos && selectedShift.completionPhotos.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                                                <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" /> Proof of Work (Completion)
                                            </h3>
                                            <div className="flex gap-3 overflow-x-auto pb-2">
                                                {selectedShift.completionPhotos.map((photo, i) => (
                                                    <div key={i} className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                                                        <img src={photo} alt={`Completion ${i}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Financials */}
                                    <div className="bg-gold-50 p-4 rounded-xl border border-gold-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-navy-900">Final Price</span>
                                            <span className="font-black text-xl text-navy-900">${selectedShift.price}</span>
                                        </div>
                                        {selectedShift.providerFeedback && selectedShift.providerFeedback.includes('[PRICE ADJUSTMENT]') && (
                                            <div className="text-xs text-amber-700 bg-amber-100/50 p-2 rounded border border-amber-200 mt-2">
                                                <strong>Note:</strong> {selectedShift.providerFeedback}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Client View (Simplified Description) */}
                            {!isProvider && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <p className="text-sm text-slate-500 uppercase font-bold mb-1">Description</p>
                                    <p className="font-medium text-navy-900">{selectedShift.description}</p>
                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <p className="text-sm text-slate-500 uppercase font-bold mb-1">Location</p>
                                        <a 
                                            href={`https://maps.google.com/?q=${encodeURIComponent(sites.find(s => s.id === selectedShift.siteId)?.address || '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline break-words flex items-center"
                                        >
                                            <MapPin className="w-4 h-4 mr-1" />
                                            {sites.find(s => s.id === selectedShift.siteId)?.address || 'Unknown Address'}
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Client Counter Offers View */}
                            {isClient && selectedShift.status === ShiftStatus.OPEN_REQUEST && selectedShift.counterOffers && selectedShift.counterOffers.length > 0 && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center">
                                        <Scale className="w-5 h-5 mr-2" /> Pending Counter Offers
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedShift.counterOffers.filter(o => o.status === 'PENDING').map(offer => {
                                            const provider = users.find(u => u.id === offer.providerId);
                                            return (
                                                <div key={offer.id} className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                                {provider?.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm text-navy-900">{provider?.name}</div>
                                                                <div className="text-xs text-slate-500 flex items-center">
                                                                    <Star className="w-3 h-3 text-gold-400 mr-1 fill-current" /> {provider?.rating}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-lg font-black text-emerald-600">${offer.amount}</div>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-600 italic mb-3 bg-slate-50 p-2 rounded">"{offer.message}"</p>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleDeclineCounter(offer.id)}
                                                            className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-50 transition-colors text-sm"
                                                        >
                                                            Decline
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAcceptCounter(offer.id)}
                                                            className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                                                        >
                                                            Accept Offer
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {selectedShift.counterOffers.filter(o => o.status === 'PENDING').length === 0 && (
                                            <p className="text-sm text-slate-500 italic">No pending offers.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Client Verification Flow */}
                            {isClient && selectedShift.status === ShiftStatus.COMPLETED && !selectedShift.isDisputed && (
                                <div className="bg-white border-2 border-emerald-400 rounded-xl p-6 shadow-md relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400"></div>
                                    <h3 className="font-bold text-lg text-navy-900 mb-2 flex items-center">
                                        <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" /> Verify Completion
                                    </h3>
                                    <p className="text-slate-500 text-sm mb-4">
                                        The provider has marked this job as complete. Please review the proof of work and release funds.
                                    </p>

                                    {selectedShift.completionPhotos && (
                                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                            {selectedShift.completionPhotos.map((img, i) => (
                                                <img key={i} src={img} className="w-24 h-24 rounded-lg object-cover border border-slate-200 shadow-sm" alt="Proof" />
                                            ))}
                                        </div>
                                    )}

                                    {selectedShift.providerFeedback && (
                                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 italic mb-4 border border-slate-100">
                                            " {selectedShift.providerFeedback} "
                                        </div>
                                    )}

                                    {!isDisputing ? (
                                        <>
                                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-4 animate-in fade-in">
                                                <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2">Rate Provider</h4>
                                                <div className="flex gap-2 mb-3">
                                                    {[1,2,3,4,5].map(star => (
                                                        <button key={star} onClick={() => setVerificationRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                                                            <Star className={`w-6 h-6 ${star <= verificationRating ? 'fill-gold-400 text-gold-400' : 'text-slate-300'}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea 
                                                    className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    placeholder="Optional feedback..."
                                                    value={verificationFeedback}
                                                    onChange={e => setVerificationFeedback(e.target.value)}
                                                />
                                            </div>

                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => setIsDisputing(true)}
                                                    className="flex-1 py-3 text-red-600 font-bold border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                                                >
                                                    Report Issue
                                                </button>
                                                <button 
                                                    onClick={handleVerifyCompletion}
                                                    disabled={isVerifying}
                                                    className="flex-[2] py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-colors flex items-center justify-center transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    {isVerifying ? (
                                                        <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Processing...</>
                                                    ) : (
                                                        <><CheckCircle2 className="w-5 h-5 mr-2" /> Verify & Release Funds</>
                                                    )}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in">
                                            <div>
                                                <label className="block text-sm font-bold text-red-700 mb-2 flex items-center">
                                                    <AlertTriangle className="w-4 h-4 mr-2" /> Report an Issue
                                                </label>
                                                <textarea 
                                                    className="w-full p-3 bg-white border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                                    placeholder="Describe the issue..."
                                                    value={disputeReason}
                                                    onChange={e => setDisputeReason(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => setIsDisputing(false)}
                                                    className="flex-1 py-3 text-slate-500 hover:text-navy-900 font-bold"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handleSubmitDispute}
                                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200"
                                                >
                                                    Submit Dispute
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                             {/* Dispute Status Banner */}
                             {selectedShift.isDisputed && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                                    <h4 className="font-bold text-red-800 flex items-center">
                                        <AlertTriangle className="w-5 h-5 mr-2" /> Dispute Active
                                    </h4>
                                    <p className="text-sm text-red-700 mt-1">
                                        Funds are frozen pending admin review.
                                    </p>
                                    <p className="text-xs text-red-600 mt-2 italic">"{selectedShift.disputeReason}"</p>
                                </div>
                            )}

                             {/* Verified Banner */}
                             {selectedShift.status === ShiftStatus.VERIFIED && (
                                <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                    <div className="bg-white p-2 rounded-full mb-2 shadow-sm">
                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    </div>
                                    <h4 className="font-bold text-navy-900">Job Verified & Paid</h4>
                                    <p className="text-xs text-slate-500 mt-1">Funds have been released to the provider.</p>
                                    <div className="flex mt-3 text-gold-400">
                                        {[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${i <= (selectedShift.clientRating || 0) ? 'fill-current' : 'text-slate-300'}`} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};