import React from 'react';
import { ServiceCategory } from '../types';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

interface InsuranceStatusGridProps {
  skills: ServiceCategory[];
  insuranceStatus: Record<string, boolean>; // e.g. { 'PLUMBING': true, 'MOVING': false }
  onOptIn: (skill: ServiceCategory) => void;
  isLoading?: boolean;
}

export const InsuranceStatusGrid: React.FC<InsuranceStatusGridProps> = ({ skills, insuranceStatus, onOptIn, isLoading }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {skills.map(skill => {
        const isCovered = insuranceStatus[skill];
        
        return (
          <div key={skill} className={`p-4 rounded-xl border-2 transition-all ${isCovered ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {isCovered ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                )}
                <h3 className="font-bold text-navy-900">{skill}</h3>
              </div>
              {isCovered && (
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </span>
              )}
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              {isCovered 
                ? "You are covered for this skill via Daily Shield." 
                : "Coverage required to claim jobs in this category."}
            </p>

            {!isCovered && (
              <button
                onClick={() => onOptIn(skill)}
                disabled={isLoading}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? 'Activating...' : 'Opt-In to Daily Shield'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
