
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { User, Role, ServiceCategory } from '../types';
import { UserCircle, Mail, Phone, Shield, Bell, Save, Camera, Lock, CheckCircle2, AlertCircle, ShieldCheck, FileText, Upload, ExternalLink, Hammer, Check, Clock, Plus, X, CreditCard, Wallet, ArrowRight, Info, HelpCircle } from 'lucide-react';
import { ALL_SERVICE_CATEGORIES, SERVICE_CATEGORIES } from '../constants';

export const AccountProfile = () => {
    const { currentUser } = useAuth();
    const { updateUser, platformConfig } = useData();
    
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [formData, setFormData] = useState<Partial<User>>({});
    const [isAddingSkill, setIsAddingSkill] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState<ServiceCategory | ''>('');

    // Password change state (mock)
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name,
                email: currentUser.email,
                phone: currentUser.phone,
                address: currentUser.address,
                urgentAlertsEnabled: currentUser.urgentAlertsEnabled,
                companyName: currentUser.companyName,
                profileImage: currentUser.profileImage,
                insuranceType: currentUser.insuranceType,
                coiUrl: currentUser.coiUrl,
                skills: currentUser.skills || [],
                pendingSkills: currentUser.pendingSkills || [],
                stripeAccountId: currentUser.stripeAccountId,
                hasPaymentMethod: currentUser.hasPaymentMethod
            });
        }
    }, [currentUser]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setFormData(prev => ({ ...prev, coiUrl: reader.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConnectStripe = async () => {
        // Simulate Stripe Connect Onboarding Flow
        setIsLoading(true);
        console.log("Generating Stripe Express Onboarding Link...");
        
        // Simulate redirect delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate return from Stripe
        const newStripeId = `acct_${Date.now()}`;
        setFormData(prev => ({ ...prev, stripeAccountId: newStripeId }));
        
        // Immediately save the stripe ID to the user record context
        if (currentUser) {
            updateUser({
                ...currentUser,
                stripeAccountId: newStripeId
            });
        }

        setIsLoading(false);
        setSuccessMsg("Bank connected via Stripe Express!");
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleDisconnectStripe = () => {
        if (confirm("Disconnect payout method? You will not receive funds until reconnected.")) {
            setFormData(prev => ({ ...prev, stripeAccountId: undefined }));
            if (currentUser) {
                updateUser({
                    ...currentUser,
                    stripeAccountId: undefined
                });
            }
        }
    };

    // Client Payment Method Handlers
    const handleAddPaymentMethod = () => {
        setIsLoading(true);
        // Simulate adding card
        setTimeout(() => {
            setFormData(prev => ({ ...prev, hasPaymentMethod: true }));
            if (currentUser) {
                updateUser({ ...currentUser, hasPaymentMethod: true });
            }
            setIsLoading(false);
            setSuccessMsg("Credit Card added successfully!");
            setTimeout(() => setSuccessMsg(''), 3000);
        }, 1500);
    };

    const handleRemovePaymentMethod = () => {
        if (confirm("Remove payment method? You will not be able to request jobs.")) {
            setFormData(prev => ({ ...prev, hasPaymentMethod: false }));
            if (currentUser) {
                updateUser({ ...currentUser, hasPaymentMethod: false });
            }
        }
    };

    const handleAddPendingSkill = (skill: ServiceCategory) => {
        console.log("Adding pending skill:", skill);
        const currentPending = formData.pendingSkills || [];
        
        // Check if already pending or active
        if (currentPending.includes(skill) || formData.skills?.includes(skill)) {
            console.log("Skill already pending or active");
            setIsAddingSkill(false);
            setSelectedSkill('');
            return;
        }

        const newPending = [...currentPending, skill];
        
        setFormData(prev => ({
            ...prev,
            pendingSkills: newPending
        }));

        // Save to backend immediately
        if (currentUser) {
            const updatedUser = {
                ...currentUser,
                pendingSkills: newPending
            };
            console.log("Updating user with:", updatedUser);
            updateUser(updatedUser);
            setSuccessMsg(`Request for ${skill} authorization sent!`);
            setTimeout(() => setSuccessMsg(''), 3000);
        }
        
        setIsAddingSkill(false);
        setSelectedSkill('');
    };

    const handleRemovePendingSkill = (skill: ServiceCategory) => {
        const newPending = formData.pendingSkills?.filter(s => s !== skill) || [];
        
        setFormData(prev => ({
            ...prev,
            pendingSkills: newPending
        }));

        if (currentUser) {
            updateUser({
                ...currentUser,
                pendingSkills: newPending
            });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsLoading(true);
        setSuccessMsg('');

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        let updatedUser = {
            ...currentUser,
            ...formData,
        } as User;

        // Mock geocoding if address changed
        if (formData.address && formData.address !== currentUser.address) {
            updatedUser.latitude = 37.7749 + (Math.random() - 0.5) * 0.1;
            updatedUser.longitude = -122.4194 + (Math.random() - 0.5) * 0.1;
        }

        // Auto-update verification logic if Insurance changed
        if (formData.insuranceType === 'DAILY_SHIELD' && currentUser.insuranceType !== 'DAILY_SHIELD') {
            // User opted INTO Daily Shield -> Authorized immediately
            updatedUser.verificationStatus = 'VERIFIED'; 
            updatedUser.isActive = true; 
        } else if (formData.insuranceType === 'OWN_COI' && currentUser.insuranceType !== 'OWN_COI') {
            // User switched TO Own COI -> Needs verification
            updatedUser.isCoiVerified = false; 
        }

        updateUser(updatedUser);

        // Password handling would go to a real auth backend here
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                alert("Passwords do not match");
                setIsLoading(false);
                return;
            }
            // Mock success for password
        }

        setIsLoading(false);
        setSuccessMsg('Profile updated successfully!');
        
        // Clear password fields
        setNewPassword('');
        setConfirmPassword('');

        // Fade out success message
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    if (!currentUser) return null;

    const isProvider = currentUser.role === Role.PROVIDER;
    const isClient = currentUser.role === Role.CLIENT;

    // Filter skills available to add (not already active or pending)
    const availableToAdd = ALL_SERVICE_CATEGORIES.filter(cat => 
        !formData.skills?.includes(cat) && !formData.pendingSkills?.includes(cat)
    );

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in">
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-navy-900 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-gold-400 overflow-hidden">
                    {formData.profileImage ? (
                        <img src={formData.profileImage} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                        currentUser.name.charAt(0)
                    )}
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Account Settings</h1>
                    <p className="text-slate-500 font-medium">Manage your profile details and preferences.</p>
                </div>
            </div>

            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center shadow-sm animate-in slide-in-from-top-2">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> {successMsg}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                {/* General Info */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
                        <UserCircle className="w-5 h-5 mr-2 text-gold-500" /> General Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Profile Image Upload */}
                        <div className="col-span-1 md:col-span-2 flex items-center gap-6 pb-6 border-b border-slate-100 mb-2">
                            <div className="relative group cursor-pointer">
                                <div className="h-24 w-24 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                                    {formData.profileImage ? (
                                        <img src={formData.profileImage} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <UserCircle className="w-12 h-12 text-slate-300" />
                                    )}
                                </div>
                                <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera className="w-8 h-8 text-white" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleProfileImageChange} />
                                </label>
                            </div>
                            <div>
                                <h3 className="font-bold text-navy-900">Profile Photo / Logo</h3>
                                <p className="text-sm text-slate-500 mb-2">Upload a professional photo or business logo.</p>
                                <label className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors inline-flex items-center">
                                    <Upload className="w-3 h-3 mr-1.5" /> Upload Image
                                    <input type="file" className="hidden" accept="image/*" onChange={handleProfileImageChange} />
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900"
                                value={formData.name || ''}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                            <input 
                                type="text" 
                                disabled
                                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-bold cursor-not-allowed"
                                value={currentUser.role}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <input 
                                    type="email" 
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <input 
                                    type="tel" 
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Address</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900"
                                placeholder="123 Main St, City, State"
                                value={formData.address || ''}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                {/* Notifications - Moved here */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
                        <Bell className="w-5 h-5 mr-2 text-gold-500" /> Notifications
                    </h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="block font-bold text-navy-900">Urgent Alerts</span>
                            <span className="text-sm text-slate-500">Receive SMS for emergency job requests in your area.</span>
                        </div>
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input 
                                type="checkbox" 
                                name="toggle" 
                                id="toggle" 
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300 transform checked:translate-x-6 checked:border-green-500"
                                checked={formData.urgentAlertsEnabled ?? false}
                                onChange={e => setFormData({...formData, urgentAlertsEnabled: e.target.checked})}
                            />
                            <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${formData.urgentAlertsEnabled ? 'bg-green-500' : 'bg-slate-300'}`}></label>
                        </div>
                    </div>
                </div>

                {/* Client Payment Methods */}
                {isClient && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
                            <CreditCard className="w-5 h-5 mr-2 text-gold-500" /> Payment Methods
                        </h2>
                        
                        <div className={`p-5 rounded-2xl border-2 transition-all ${formData.hasPaymentMethod ? 'bg-white border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full shadow-sm ${formData.hasPaymentMethod ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400'}`}>
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-navy-900 text-lg">Credit / Debit Card</h3>
                                        {formData.hasPaymentMethod ? (
                                            <div className="flex items-center text-sm text-blue-700 font-bold mt-1">
                                                Visa ending in 4242
                                                <span className="ml-2 text-slate-400 font-normal text-xs bg-slate-100 px-1 rounded">Exp 12/28</span>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 mt-1">Add a card to pay for services effortlessly.</p>
                                        )}
                                    </div>
                                </div>
                                
                                {formData.hasPaymentMethod ? (
                                    <button 
                                        type="button"
                                        onClick={handleRemovePaymentMethod}
                                        className="px-4 py-2 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        Remove
                                    </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={handleAddPaymentMethod}
                                        disabled={isLoading}
                                        className="px-6 py-3 bg-navy-900 text-white font-bold text-sm rounded-xl hover:bg-navy-800 transition-all shadow-lg flex items-center"
                                    >
                                        {isLoading ? 'Processing...' : (
                                            <>
                                                Add Card <Plus className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center">
                                <ShieldCheck className="w-4 h-4 mr-1 text-slate-400" />
                                Your payment details are stored securely by Stripe. We do not keep full card numbers.
                            </div>
                        </div>
                    </div>
                )}

                {/* Provider Payout Settings */}
                {isProvider && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
                            <Wallet className="w-5 h-5 mr-2 text-gold-500" /> Payout Method
                        </h2>
                        
                        <div className={`p-5 rounded-2xl border-2 transition-all ${formData.stripeAccountId ? 'bg-white border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full shadow-sm ${formData.stripeAccountId ? 'bg-green-100 text-green-600' : 'bg-white text-slate-400'}`}>
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-navy-900 text-lg">Stripe Express</h3>
                                        {formData.stripeAccountId ? (
                                            <div className="flex items-center text-sm text-green-600 font-bold mt-1">
                                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Bank Account Connected
                                                <span className="ml-2 text-slate-400 font-normal text-xs font-mono">({formData.stripeAccountId})</span>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 mt-1">Connect your bank account to receive automated payouts.</p>
                                        )}
                                    </div>
                                </div>
                                
                                {formData.stripeAccountId ? (
                                    <button 
                                        type="button"
                                        onClick={handleDisconnectStripe}
                                        className="px-4 py-2 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        Disconnect
                                    </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={handleConnectStripe}
                                        disabled={isLoading}
                                        className="px-6 py-3 bg-[#635BFF] text-white font-bold text-sm rounded-xl hover:bg-[#534ae6] transition-all shadow-lg shadow-indigo-200 flex items-center"
                                    >
                                        {isLoading ? 'Redirecting to Stripe...' : (
                                            <>
                                                Connect Bank <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            
                            {!formData.stripeAccountId && (
                                <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center">
                                    <ShieldCheck className="w-4 h-4 mr-1 text-slate-400" />
                                    Secure onboarding provided by Stripe. We do not store your bank credentials.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Provider Specific Settings */}
                {isProvider && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
                            <Hammer className="w-5 h-5 mr-2 text-gold-500" /> Provider Settings
                        </h2>

                        {/* Skills Display */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-bold text-slate-700">Your Skills</label>
                                {!isAddingSkill && (
                                    <button 
                                        type="button"
                                        onClick={() => setIsAddingSkill(true)}
                                        className="text-xs font-bold text-navy-600 hover:text-navy-800 flex items-center"
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Request New Skill Authorization
                                    </button>
                                )}
                            </div>
                            
                            {/* Adding Skill Modal */}
                            {isAddingSkill && (
                                <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-navy-900">Request Skill Authorization</h3>
                                            <button onClick={() => setIsAddingSkill(false)} className="text-slate-400 hover:text-navy-900">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-slate-500 mb-4">Select a skill category you would like to add to your profile. This will be sent to admin for approval.</p>
                                        
                                        <div className="space-y-4">
                                            <select 
                                                className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-navy-500 bg-white font-medium text-navy-900"
                                                onChange={(e) => setSelectedSkill(e.target.value as ServiceCategory)}
                                                value={selectedSkill}
                                            >
                                                <option value="" disabled>Select a skill...</option>
                                                {availableToAdd.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            
                                            <div className="flex gap-3">
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsAddingSkill(false)}
                                                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => selectedSkill && handleAddPendingSkill(selectedSkill as ServiceCategory)}
                                                    disabled={!selectedSkill}
                                                    className="flex-1 py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Submit Request
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {/* Active Skills */}
                                {formData.skills && formData.skills.length > 0 ? (
                                    formData.skills.map(skill => (
                                        <span key={skill} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100 flex items-center">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-400 italic">No verified skills.</span>
                                )}

                                {/* Pending Skills */}
                                {formData.pendingSkills && formData.pendingSkills.map(skill => (
                                    <span key={skill} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100 flex items-center animate-pulse">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {skill}
                                        <button 
                                            type="button"
                                            onClick={() => handleRemovePendingSkill(skill)}
                                            className="ml-2 hover:text-red-600"
                                            title="Cancel Request"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            {(formData.pendingSkills?.length || 0) > 0 && (
                                <p className="text-[10px] text-amber-600 mt-2 italic">* Skills in yellow are pending admin approval.</p>
                            )}
                        </div>

                        <hr className="border-slate-100 mb-8" />

                        {/* Insurance Section - Redesigned */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-lg font-bold text-navy-900 mb-4 flex items-center">
                                <ShieldCheck className="w-5 h-5 mr-2 text-blue-600" /> Insurance or Daily Shield Verification
                            </h3>

                            {/* What is Daily Shield Info */}
                            <div className="mb-6 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                                        <Info className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-navy-900 text-sm mb-1">What is Daily Shield?</h4>
                                        <p className="text-xs text-slate-600 leading-relaxed mb-2">
                                            Daily Shield is an on-demand liability insurance program designed for gig workers. 
                                            Instead of purchasing an expensive annual policy, you pay a small fee only for the jobs you work.
                                        </p>
                                        <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                                            <li><strong>Pay-As-You-Go:</strong> Fees are deducted automatically from your job payout.</li>
                                            <li><strong>Risk-Based Pricing:</strong> Fees vary based on the specific skill category (e.g., Moving is higher risk than Cleaning).</li>
                                            <li><strong>Instant Verification:</strong> No waiting for document approval. You can start working immediately.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Skill Fee Breakdown */}
                            {formData.skills && formData.skills.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Rates (If using Daily Shield)</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {formData.skills.map(skill => {
                                            // Use the new SERVICE_CATEGORIES constant as the source of truth
                                            // @ts-ignore - SERVICE_CATEGORIES is typed in constants.ts
                                            const fee = SERVICE_CATEGORIES[skill]?.fee || 0;
                                            
                                            return (
                                                <div key={skill} className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-slate-200 text-xs shadow-sm">
                                                    <span className="font-bold text-navy-900">{skill}</span>
                                                    <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                        ${fee.toFixed(2)} / job
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Option 1: Daily Shield */}
                                <div 
                                    onClick={() => setFormData({...formData, insuranceType: 'DAILY_SHIELD'})}
                                    className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between h-full ${
                                        formData.insuranceType === 'DAILY_SHIELD' 
                                        ? 'border-gold-400 bg-white shadow-lg shadow-gold-100 scale-[1.02]' 
                                        : 'border-slate-200 bg-white hover:border-gold-200 hover:bg-gold-50/30'
                                    }`}
                                >
                                    {formData.insuranceType === 'DAILY_SHIELD' && (
                                        <div className="absolute top-3 right-3 text-gold-500">
                                            <CheckCircle2 className="w-6 h-6 fill-gold-100" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="w-12 h-12 bg-gold-100 rounded-full flex items-center justify-center mb-4 text-gold-600">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <h4 className="font-bold text-navy-900 text-lg">Daily Shield Program</h4>
                                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                            Pay-as-you-go coverage provided by the platform.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Fee</span>
                                            <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded">$3.00 - $12.00 / Job</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Status</span>
                                            <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Instant Approval</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Option 2: Own COI */}
                                <div 
                                    onClick={() => setFormData({...formData, insuranceType: 'OWN_COI'})}
                                    className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between h-full ${
                                        formData.insuranceType === 'OWN_COI' 
                                        ? 'border-navy-600 bg-white shadow-lg shadow-navy-100 scale-[1.02]' 
                                        : 'border-slate-200 bg-white hover:border-navy-200 hover:bg-navy-50/30'
                                    }`}
                                >
                                    {formData.insuranceType === 'OWN_COI' && (
                                        <div className="absolute top-3 right-3 text-navy-600">
                                            <CheckCircle2 className="w-6 h-6 fill-navy-100" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center mb-4 text-navy-600">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <h4 className="font-bold text-navy-900 text-lg">My Own Insurance</h4>
                                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                            Use your existing commercial liability policy.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Fee</span>
                                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">$0.00</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Status</span>
                                            <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Requires Review</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COI Upload Area - Only visible if Own COI is selected */}
                            {formData.insuranceType === 'OWN_COI' && (
                                <div className="mt-6 bg-slate-100 p-6 rounded-xl animate-in slide-in-from-top-4 border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Upload Certificate of Insurance (COI)</label>
                                    
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <label className="flex flex-col items-center justify-center w-full sm:w-40 h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-white hover:border-navy-400 transition-all bg-white/50">
                                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                            <span className="text-xs text-slate-500 font-bold">Select File</span>
                                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                        </label>

                                        {formData.coiUrl ? (
                                            <div className="flex-1 w-full p-4 bg-white border border-green-200 rounded-xl flex items-center justify-between shadow-sm">
                                                <div className="flex items-center">
                                                    <div className="bg-green-100 p-2 rounded-lg mr-3">
                                                        <FileText className="w-6 h-6 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-green-900">Certificate Uploaded</p>
                                                        <p className="text-xs text-green-700 flex items-center mt-1">
                                                            {currentUser.isCoiVerified ? <Check className="w-3 h-3 mr-1"/> : <Clock className="w-3 h-3 mr-1"/>}
                                                            Status: {currentUser.isCoiVerified ? 'Verified' : 'Pending Admin Review'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <a href={formData.coiUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-white bg-green-600 px-3 py-2 rounded-lg hover:bg-green-700 transition-colors">View</a>
                                            </div>
                                        ) : (
                                            <div className="flex-1 w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start">
                                                <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-bold">Action Required</p>
                                                    <p className="opacity-90">Please upload your COI document (PDF or Image) to complete your profile. Daily fees will apply until this is verified.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Password Change (Mock) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
                        <Lock className="w-5 h-5 mr-2 text-gold-500" /> Security
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                            <input 
                                type="password" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
                            <input 
                                type="password" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-4 bg-navy-900 hover:bg-navy-800 text-white text-lg font-bold rounded-xl shadow-lg shadow-navy-200 transition-all hover:-translate-y-1 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <Save className="w-5 h-5 mr-2" /> {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};
