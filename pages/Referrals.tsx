
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Referral } from '../types';
import { Gift, CheckCircle2, XCircle, DollarSign, Filter, Users, ArrowRight, Lock } from 'lucide-react';
import { format } from 'date-fns';

export const Referrals = () => {
    const { referrals, users, updateReferral, isReferralEnabled, toggleReferralProgram } = useData();
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

    const handleAction = (id: string, action: 'APPROVE' | 'REJECT') => {
        const ref = referrals.find(r => r.id === id);
        if (ref) {
            const newStatus = action === 'APPROVE' ? 'PAID' : 'REJECTED';
            if (confirm(`Are you sure you want to mark this referral as ${newStatus}?`)) {
                updateReferral({ ...ref, status: newStatus });
            }
        }
    };

    const filteredReferrals = referrals.filter(r => {
        if (filterStatus === 'ALL') return true;
        if (filterStatus === 'PENDING') return r.status === 'PENDING';
        if (filterStatus === 'PAID') return r.status === 'PAID';
        return true;
    });

    const pendingAmount = referrals.filter(r => r.status === 'PENDING').reduce((acc, curr) => acc + curr.payoutAmount, 0);
    const paidAmount = referrals.filter(r => r.status === 'PAID').reduce((acc, curr) => acc + curr.payoutAmount, 0);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-navy-950">Referral Program</h1>
                    <p className="text-sm text-slate-500">Track and manage referral payouts.</p>
                </div>
                
                {/* Master Toggle */}
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gold-200 shadow-sm">
                    <span className="text-xs font-bold text-navy-900 uppercase tracking-wider pl-2">Program Status</span>
                    <button 
                        onClick={() => toggleReferralProgram(!isReferralEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isReferralEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isReferralEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-xs font-bold px-2 ${isReferralEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {isReferralEnabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                </div>
            </div>

            {!isReferralEnabled ? (
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-12 text-center">
                    <Lock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl font-bold text-slate-500">Referral Program Disabled</h2>
                    <p className="text-slate-400 max-w-md mx-auto mt-2">
                        All referral features, text, and calculations are currently hidden from users. 
                        Enable the program above to resume activity and view data.
                    </p>
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gold-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                    <Gift className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-navy-900">${pendingAmount.toFixed(2)}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending Payouts</div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gold-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-navy-900">${paidAmount.toFixed(2)}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Paid YTD</div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gold-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-navy-900">{referrals.length}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Referrals</div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gold-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-navy-900 flex items-center">
                                <Filter className="w-4 h-4 mr-2" /> Filter List
                            </h2>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => setFilterStatus('ALL')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === 'ALL' ? 'bg-white shadow text-navy-900' : 'text-slate-500'}`}
                                >
                                    All
                                </button>
                                <button 
                                    onClick={() => setFilterStatus('PENDING')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === 'PENDING' ? 'bg-white shadow text-navy-900' : 'text-slate-500'}`}
                                >
                                    Pending
                                </button>
                                <button 
                                    onClick={() => setFilterStatus('PAID')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === 'PAID' ? 'bg-white shadow text-navy-900' : 'text-slate-500'}`}
                                >
                                    Paid
                                </button>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Referrer</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Referred User</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Payout</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredReferrals.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                No referrals found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredReferrals.map(ref => {
                                            const referrer = users.find(u => u.id === ref.referrerUserId);
                                            const referee = users.find(u => u.id === ref.referredUserId);
                                            
                                            return (
                                                <tr key={ref.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 text-slate-600">{format(ref.createdAt, 'MMM d, yyyy')}</td>
                                                    <td className="px-6 py-4 font-bold text-navy-900">{referrer?.name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 text-slate-700 flex items-center gap-2">
                                                        <ArrowRight className="w-3 h-3 text-slate-400" />
                                                        {referee?.name || 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {ref.programType === 'CLIENT_REFERRAL' 
                                                            ? <span className="text-[10px] bg-pink-50 text-pink-600 px-2 py-1 rounded font-bold uppercase border border-pink-100">Client Gift</span> 
                                                            : <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold uppercase border border-blue-100">Pro Bonus</span>
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                                            ref.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                            ref.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {ref.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                                                        ${ref.payoutAmount}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {ref.status === 'PENDING' && (
                                                            <div className="flex justify-end gap-2">
                                                                <button 
                                                                    onClick={() => handleAction(ref.id, 'APPROVE')}
                                                                    className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                                                                    title="Mark Paid"
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleAction(ref.id, 'REJECT')}
                                                                    className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                                                    title="Reject"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
