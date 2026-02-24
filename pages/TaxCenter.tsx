
import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Shift, ShiftStatus, ServiceCategory } from '../types';
import { format, isSameYear } from 'date-fns';
import { FileText, Download, Shield, DollarSign, Wallet, Calendar, AlertTriangle, Printer, X, Briefcase, TrendingUp, CheckCircle2 } from 'lucide-react';
import { ALL_SERVICE_CATEGORIES, APP_LOGO_URL } from '../constants';

export const TaxCenter = () => {
    const { currentUser } = useAuth();
    const { shifts, platformConfig } = useData();
    
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [is1099ModalOpen, setIs1099ModalOpen] = useState(false);

    // Filter shifts for this user, year, and status
    // Using COMPLETED or VERIFIED as proxy for earnings. Ideally should check isPaid, but for tax accrual basis, completion matters.
    const yearlyShifts = useMemo(() => {
        if (!currentUser) return [];
        return shifts.filter(s => {
            const dateToCheck = s.completedAt ? new Date(s.completedAt) : s.end;
            return (
                s.userId === currentUser.id && 
                (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED) &&
                dateToCheck.getFullYear() === selectedYear
            );
        });
    }, [shifts, currentUser, selectedYear]);

    const yearlyExpenses = useMemo(() => {
        if (!currentUser) return [];
        return shifts.filter(s => {
            const dateToCheck = s.completedAt ? new Date(s.completedAt) : s.end;
            return (
                s.clientId === currentUser.id && 
                (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED) &&
                dateToCheck.getFullYear() === selectedYear
            );
        });
    }, [shifts, currentUser, selectedYear]);

    // Financial Calculations
    const financials = useMemo(() => {
        let totalGross = 0;
        let totalPlatformFees = 0;
        let totalInsuranceFees = 0;
        const categoryBreakdown: Record<string, { gross: number, net: number, count: number }> = {};

        yearlyShifts.forEach(shift => {
            const gross = shift.price || 0;
            
            // Replicate fee logic from Payroll.tsx
            const feePercent = shift.appliedPlatformFee !== undefined 
                ? shift.appliedPlatformFee 
                : (platformConfig[shift.category]?.platformFeePercent || 20) / 100;
            
            const platformFee = gross * feePercent;

            let insuranceFee = 0;
            if (shift.insuranceOptIn) {
                if (shift.appliedInsuranceFee !== undefined) {
                    insuranceFee = shift.appliedInsuranceFee;
                } else {
                    const rule = platformConfig[shift.category]?.insuranceRule || { type: 'FLAT', value: 2.00 };
                    if (rule.type === 'PERCENTAGE') {
                        insuranceFee = gross * (rule.value / 100);
                    } else {
                        insuranceFee = rule.value;
                    }
                }
            }

            totalGross += gross;
            totalPlatformFees += platformFee;
            totalInsuranceFees += insuranceFee;

            const net = gross - platformFee - insuranceFee;

            // Category Stats
            if (!categoryBreakdown[shift.category]) {
                categoryBreakdown[shift.category] = { gross: 0, net: 0, count: 0 };
            }
            categoryBreakdown[shift.category].gross += gross;
            categoryBreakdown[shift.category].net += net;
            categoryBreakdown[shift.category].count += 1;
        });

        const totalNet = totalGross - totalPlatformFees - totalInsuranceFees;

        let totalExpenses = 0;
        const expensesBreakdown: Record<string, { amount: number, count: number }> = {};
        yearlyExpenses.forEach(shift => {
            const amount = shift.price || 0;
            totalExpenses += amount;
            
            if (!expensesBreakdown[shift.category]) {
                expensesBreakdown[shift.category] = { amount: 0, count: 0 };
            }
            expensesBreakdown[shift.category].amount += amount;
            expensesBreakdown[shift.category].count += 1;
        });

        return {
            totalGross,
            totalPlatformFees,
            totalInsuranceFees,
            totalNet,
            totalExpenses,
            categoryBreakdown: Object.entries(categoryBreakdown).sort((a, b) => b[1].net - a[1].net), // Sort by highest net
            expensesBreakdown: Object.entries(expensesBreakdown).sort((a, b) => b[1].amount - a[1].amount)
        };
    }, [yearlyShifts, yearlyExpenses, platformConfig]);

    const isEligibleFor1099 = financials.totalNet >= 600;

    const handleDownloadCSV = () => {
        const headers = "Date,Job ID,Category,Description,Gross Amount,Platform Fee,Insurance Fee,Net Payout\n";
        const rows = yearlyShifts.map(s => {
            const date = format(s.completedAt || s.end, 'yyyy-MM-dd');
            const gross = s.price || 0;
            
            // Recalculate individually for row data
            const feePercent = s.appliedPlatformFee !== undefined ? s.appliedPlatformFee : (platformConfig[s.category]?.platformFeePercent || 20) / 100;
            const platformFee = gross * feePercent;
            
            let insuranceFee = 0;
            if (s.insuranceOptIn) {
                if (s.appliedInsuranceFee !== undefined) insuranceFee = s.appliedInsuranceFee;
                else {
                    const rule = platformConfig[s.category]?.insuranceRule || { type: 'FLAT', value: 2.00 };
                    insuranceFee = rule.type === 'PERCENTAGE' ? gross * (rule.value / 100) : rule.value;
                }
            }
            
            const net = gross - platformFee - insuranceFee;

            // Escape description for CSV
            const safeDesc = `"${s.description.replace(/"/g, '""')}"`;

            return `${date},${s.id},${s.category},${safeDesc},${gross.toFixed(2)},${platformFee.toFixed(2)},${insuranceFee.toFixed(2)},${net.toFixed(2)}`;
        }).join("\n");

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tax_report_${selectedYear}_${currentUser?.name.replace(/\s+/g, '_')}.csv`;
        a.click();
    };

    if (!currentUser) return null;

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Tax Center</h1>
                    <p className="text-slate-500 mt-1">Manage your annual earnings and tax documents.</p>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button 
                        onClick={() => setSelectedYear(selectedYear - 1)}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        {selectedYear - 1}
                    </button>
                    <div className="px-6 py-2 bg-navy-900 text-white rounded-lg font-bold text-sm shadow-md flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gold-400" />
                        {selectedYear}
                    </div>
                    <button 
                        disabled={selectedYear >= new Date().getFullYear()}
                        onClick={() => setSelectedYear(selectedYear + 1)}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {selectedYear + 1}
                    </button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Gross Earnings</p>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">${financials.totalGross.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">Before deductions</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Platform Fees</p>
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-700">${financials.totalPlatformFees.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">Market access commission</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Daily Shield</p>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Shield className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-700">${financials.totalInsuranceFees.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">Deductible insurance expense</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Subcontractor Expenses</p>
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <Briefcase className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-700">${financials.totalExpenses.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">Deductible staffing expense</p>
                </div>

                <div className="bg-gradient-to-br from-navy-900 to-navy-800 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs text-gold-400 uppercase font-bold tracking-wider">Net Income</p>
                            <div className="p-2 bg-white/10 rounded-lg text-gold-400 backdrop-blur-sm">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-white">${financials.totalNet.toFixed(2)}</p>
                        <p className="text-xs text-navy-200 mt-1">Taxable earnings (Schedule C)</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Actions & Compliance */}
                <div className="space-y-6">
                    {/* 1099-NEC Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 relative overflow-hidden">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-navy-900 text-lg">1099-NEC Form</h3>
                                <p className="text-xs text-slate-500 mt-1">Federal Tax Form for Non-Employee Compensation</p>
                            </div>
                            <FileText className="w-8 h-8 text-slate-300" />
                        </div>

                        {isEligibleFor1099 ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-green-800">You are eligible.</p>
                                        <p className="text-xs text-green-700 mt-1">Your net earnings exceed the $600 federal reporting threshold.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIs1099ModalOpen(true)}
                                    className="w-full py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors shadow-lg flex items-center justify-center"
                                >
                                    <FileText className="w-4 h-4 mr-2" /> View 1099 Summary
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start">
                                    <AlertTriangle className="w-5 h-5 text-slate-400 mr-2 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-600">Not yet eligible.</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Earnings are under $600. Keep working to reach the threshold!
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-slate-300" 
                                        style={{ width: `${Math.min((financials.totalNet / 600) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-center text-slate-400 font-medium">
                                    ${financials.totalNet.toFixed(0)} / $600.00
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Data Export Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-navy-900 text-lg">Export Data</h3>
                                <p className="text-xs text-slate-500 mt-1">Download detailed CSV for your records.</p>
                            </div>
                            <Download className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            Includes detailed breakdown of every job: Date, Category, Gross, Fees, and Net Payout. Useful for analyzing your most profitable skills.
                        </p>
                        <button 
                            onClick={handleDownloadCSV}
                            className="w-full py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center"
                        >
                            <Download className="w-4 h-4 mr-2" /> Download CSV
                        </button>
                    </div>
                </div>

                {/* Right Column: Earnings by Category */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-50">
                            <h3 className="font-bold text-navy-900 text-lg flex items-center">
                                <Briefcase className="w-5 h-5 mr-2 text-gold-500" /> Earnings by Category
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Analyze which skills generate the highest profit margin.</p>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider">Category</th>
                                        <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider text-right">Jobs</th>
                                        <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider text-right">Gross</th>
                                        <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider text-right">Net Profit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {financials.categoryBreakdown.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                                No completed jobs in {selectedYear}.
                                            </td>
                                        </tr>
                                    ) : (
                                        financials.categoryBreakdown.map(([category, stats]) => (
                                            <tr key={category} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700">
                                                    {category}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500">
                                                    {stats.count}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-500">
                                                    ${stats.gross.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                                                    ${stats.net.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-50">
                            <h3 className="font-bold text-navy-900 text-lg flex items-center">
                                <Briefcase className="w-5 h-5 mr-2 text-red-500" /> Subcontractor Expenses
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Track your staffing expenses for tax deductions.</p>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider">Category</th>
                                        <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider text-right">Jobs</th>
                                        <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {financials.expensesBreakdown.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                                No subcontractor expenses in {selectedYear}.
                                            </td>
                                        </tr>
                                    ) : (
                                        financials.expensesBreakdown.map(([category, stats]) => (
                                            <tr key={category} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700">
                                                    {category}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500">
                                                    {stats.count}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-red-600">
                                                    ${stats.amount.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* 1099 Summary Modal */}
            {is1099ModalOpen && (
                <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden animate-in zoom-in-95">
                        {/* Header */}
                        <div className="bg-navy-900 text-white p-4 flex justify-between items-center print:hidden">
                            <h2 className="font-bold text-lg flex items-center">
                                <FileText className="w-5 h-5 mr-2" /> 1099-NEC Summary (Preview)
                            </h2>
                            <button onClick={() => setIs1099ModalOpen(false)} className="text-white/70 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Form Preview */}
                        <div className="p-8 bg-white text-black font-serif border-b-8 border-navy-900 relative">
                            {/* Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                                <img src={APP_LOGO_URL} className="w-96" alt="" />
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-8 border-b-2 border-black pb-6">
                                <div>
                                    <p className="text-[10px] font-bold uppercase mb-1">Payer's Name & Address</p>
                                    <div className="text-sm">
                                        <p className="font-bold">I Got A Guy Platform Inc.</p>
                                        <p>123 Builder Lane</p>
                                        <p>Construction City, ST 12345</p>
                                        <p className="mt-1">TIN: 99-1234567</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h1 className="text-3xl font-bold tracking-tighter">1099-NEC</h1>
                                    <p className="text-xs font-bold uppercase mt-1">{selectedYear} Nonemployee Compensation</p>
                                    <div className="mt-4 p-2 border border-black inline-block text-left min-w-[150px]">
                                        <p className="text-[9px] uppercase">1. Nonemployee Compensation</p>
                                        <p className="text-xl font-bold font-mono">${financials.totalNet.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-[10px] font-bold uppercase mb-1">Recipient's Name & Address</p>
                                    <div className="text-sm">
                                        <p className="font-bold">{currentUser.name}</p>
                                        <p>{currentUser.email}</p>
                                        <p>{currentUser.phone}</p>
                                        <p className="text-slate-400 text-xs mt-1">[Address on File]</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase mb-1">Account Number</p>
                                    <p className="font-mono text-sm">{currentUser.id}</p>
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-500 text-center leading-relaxed">
                                This is a summary for your records and is not an official IRS document. 
                                Official forms will be mailed by Jan 31st to your address on file. 
                                Consult a tax professional for filing advice.
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 flex justify-end gap-3 print:hidden">
                            <button 
                                onClick={() => setIs1099ModalOpen(false)}
                                className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => window.print()}
                                className="px-6 py-2 bg-navy-900 text-white font-bold rounded-lg hover:bg-navy-800 shadow-md flex items-center"
                            >
                                <Printer className="w-4 h-4 mr-2" /> Print Summary
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
