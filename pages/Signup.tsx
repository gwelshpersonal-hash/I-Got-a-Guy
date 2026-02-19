
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { User, Role, StaffType, ServiceCategory, Referral } from '../types';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, UserPlus, Home, Hammer, Gift, ShieldCheck, Upload, FileText, ChevronRight } from 'lucide-react';
import { APP_LOGO_URL, ALL_SERVICE_CATEGORIES } from '../constants';

export const Signup = () => {
    const { login } = useAuth();
    const { addUser, users, addReferral, isReferralEnabled } = useData();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [isLoading, setIsLoading] = useState(false);
    const [role, setRole] = useState<Role>(Role.CLIENT);
    const [referralCode, setReferralCode] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '', 
        phone: '',
        // Provider specific
        skills: [] as ServiceCategory[],
        insuranceType: 'DAILY_SHIELD' as 'OWN_COI' | 'DAILY_SHIELD' | undefined,
        coiFile: null as string | null
    });

    // Populate referral code from URL if present, only if enabled
    useEffect(() => {
        if (isReferralEnabled) {
            const refParam = searchParams.get('ref');
            if (refParam) {
                setReferralCode(refParam);
            }
        }
    }, [searchParams, isReferralEnabled]);

    const toggleSkill = (skill: ServiceCategory) => {
        if (formData.skills.includes(skill)) {
            setFormData({...formData, skills: formData.skills.filter(s => s !== skill)});
        } else {
            setFormData({...formData, skills: [...formData.skills, skill]});
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setFormData({ ...formData, coiFile: reader.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        setTimeout(() => {
            const isProvider = role === Role.PROVIDER;
            
            // Determine Verification Status
            // If Provider chooses Daily Shield, they can be auto-verified
            // If Own COI or Skipped (undefined), they are PENDING (restricted from claiming)
            let verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' = 'VERIFIED'; 
            
            if (isProvider) {
                if (formData.insuranceType === 'DAILY_SHIELD') {
                    verificationStatus = 'VERIFIED'; 
                } else {
                    verificationStatus = 'PENDING'; 
                }
            }

            // 1. Create User
            const newUser: User = {
                id: `user_${Date.now()}`,
                orgId: 'org_1',
                name: formData.name,
                email: formData.email.trim(),
                role: role,
                staffType: isProvider ? StaffType.CONTRACTOR_1099 : undefined,
                
                isActive: true, // Account is active, but permissions might be restricted by verificationStatus
                verificationStatus: verificationStatus,
                
                hourlyRate: isProvider ? 35 : 0, 
                phone: formData.phone,
                urgentAlertsEnabled: true,
                skills: isProvider ? formData.skills : undefined,
                
                // Insurance Data
                insuranceType: isProvider ? formData.insuranceType : undefined,
                coiUrl: isProvider && formData.insuranceType === 'OWN_COI' ? (formData.coiFile || undefined) : undefined,
                isCoiVerified: false 
            };

            addUser(newUser);

            // 2. Handle Referral Logic (only if enabled)
            if (isReferralEnabled && referralCode) {
                const normalizedCode = referralCode.trim().toUpperCase();
                const referrer = users.find(u => {
                    const expectedCode = `${u.name.split(' ')[0].toUpperCase()}2024`;
                    return expectedCode === normalizedCode;
                });

                if (referrer) {
                    const newReferral: Referral = {
                        id: `ref_${Date.now()}`,
                        referrerUserId: referrer.id,
                        referredUserId: newUser.id,
                        codeUsed: normalizedCode,
                        status: 'PENDING',
                        createdAt: new Date(),
                        programType: isProvider ? 'PRO_REFERRAL' : 'CLIENT_REFERRAL',
                        payoutAmount: isProvider ? 50 : 20
                    };
                    addReferral(newReferral);
                }
            }

            // Login immediately regardless of status, Dashboard will handle restrictions
            login(newUser.id);
            navigate('/');
            
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4 relative overflow-hidden">
             <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-gold-400/10 rounded-full blur-3xl"></div>
             <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>

            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-in slide-in-from-bottom-5 duration-300">
                <div className="bg-gold-400 p-8 text-center border-b border-gold-500">
                    <div className="flex justify-center mb-4">
                        <img 
                            src={APP_LOGO_URL} 
                            alt="I Got A Guy Logo" 
                            className="h-20 w-auto object-contain drop-shadow-md"
                        />
                    </div>
                    <h1 className="text-xl font-black text-navy-900 tracking-wide">Get Started</h1>
                    <p className="text-navy-900/80 font-bold">Join the community.</p>
                </div>

                <div className="p-8 max-h-[70vh] overflow-y-auto">
                    <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                        <button 
                            type="button"
                            onClick={() => setRole(Role.CLIENT)}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${role === Role.CLIENT ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Home className="w-4 h-4 mr-2" /> I Need a Guy
                        </button>
                        <button 
                             type="button"
                             onClick={() => setRole(Role.PROVIDER)}
                             className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${role === Role.PROVIDER ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Hammer className="w-4 h-4 mr-2" /> I am a Guy
                        </button>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-1">Full Name</label>
                            <input 
                                type="text"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900"
                                placeholder="Joe Smith"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-1">Email Address</label>
                            <input 
                                type="email"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900"
                                placeholder="name@company.com"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-1">Phone</label>
                            <input 
                                type="tel"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900"
                                placeholder="(555) 555-5555"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-1">Create Password</label>
                            <input 
                                type="password"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                        </div>

                         {isReferralEnabled && (
                            <div>
                                <label className="block text-sm font-bold text-navy-900 mb-1">Referral Code (Optional)</label>
                                <div className="relative">
                                    <Gift className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900 uppercase"
                                        placeholder="FRIEND2024"
                                        value={referralCode}
                                        onChange={e => setReferralCode(e.target.value)}
                                    />
                                </div>
                            </div>
                         )}

                        {/* Provider Specific Steps */}
                        {role === Role.PROVIDER && (
                            <>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-navy-900 mb-2">What are you good at?</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ALL_SERVICE_CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => toggleSkill(cat)}
                                                className={`text-xs p-2 rounded-lg border text-left transition-all ${
                                                    formData.skills.includes(cat) 
                                                    ? 'bg-navy-600 text-white border-navy-600 font-bold' 
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-navy-900 mb-3 flex items-center">
                                        <ShieldCheck className="w-4 h-4 mr-2 text-gold-500" /> Insurance Setup
                                    </label>
                                    
                                    <div className="space-y-3">
                                        <label className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.insuranceType === 'DAILY_SHIELD' ? 'border-gold-400 bg-gold-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                            <div className="flex items-start">
                                                <input 
                                                    type="radio" 
                                                    name="insurance" 
                                                    className="mt-1 mr-3"
                                                    checked={formData.insuranceType === 'DAILY_SHIELD'}
                                                    onChange={() => setFormData({...formData, insuranceType: 'DAILY_SHIELD'})}
                                                />
                                                <div>
                                                    <span className="block font-bold text-navy-900 text-sm">Join "I Got A Guy! Daily Shield"</span>
                                                    <span className="block text-xs text-slate-500 mt-1">
                                                        Authorized to claim jobs immediately. 
                                                        <span className="text-red-500 font-bold"> $2.00 deducted per job.</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </label>

                                        <label className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.insuranceType === 'OWN_COI' ? 'border-navy-500 bg-navy-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                            <div className="flex items-start">
                                                <input 
                                                    type="radio" 
                                                    name="insurance" 
                                                    className="mt-1 mr-3"
                                                    checked={formData.insuranceType === 'OWN_COI'}
                                                    onChange={() => setFormData({...formData, insuranceType: 'OWN_COI'})}
                                                />
                                                <div>
                                                    <span className="block font-bold text-navy-900 text-sm">I have my own Insurance</span>
                                                    <span className="block text-xs text-slate-500 mt-1">
                                                        No per-job deduction. 
                                                        <span className="text-amber-600 font-bold"> Requires Admin verification before active.</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </label>

                                        {/* Skip Option */}
                                        <div className="text-center pt-2">
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({...formData, insuranceType: undefined})}
                                                className={`text-xs font-bold transition-colors flex items-center justify-center mx-auto ${formData.insuranceType === undefined ? 'text-navy-600 underline' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Skip for now 
                                                {formData.insuranceType === undefined && <span className="ml-1 text-navy-600">(Will complete later)</span>}
                                            </button>
                                            {formData.insuranceType === undefined && (
                                                <p className="text-[10px] text-red-500 mt-1">Note: You won't be able to claim jobs until insurance is added.</p>
                                            )}
                                        </div>

                                        {formData.insuranceType === 'OWN_COI' && (
                                            <div className="mt-2 animate-in slide-in-from-top-2">
                                                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-white transition-colors bg-slate-50/50">
                                                    {formData.coiFile ? (
                                                        <div className="flex items-center text-green-600 text-xs font-bold">
                                                            <FileText className="w-4 h-4 mr-2" /> COI Uploaded
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center text-slate-400 text-xs">
                                                            <Upload className="w-4 h-4 mb-1" />
                                                            <span>Upload Certificate (PDF/IMG)</span>
                                                        </div>
                                                    )}
                                                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoading || (role === Role.PROVIDER && formData.insuranceType === 'OWN_COI' && !formData.coiFile)}
                            className="w-full py-4 bg-navy-900 hover:bg-navy-800 text-white text-lg font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>Create Account <UserPlus className="w-5 h-5 ml-2" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-500 text-sm">Already have an account?</p>
                        <Link to="/login" className="text-navy-900 font-black hover:text-gold-600 transition-colors text-sm mt-1 inline-block">
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
