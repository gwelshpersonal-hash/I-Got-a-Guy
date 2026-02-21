
import { FeeBreakdown, ServiceCategory } from '../types';
import { CATEGORY_RISK_MAPPING, INSURANCE_FEES, RISK_LEVELS } from '../constants';

/**
 * FeeCalculator logic for "I Got A Guy!" 
 * Restored Actuals: 15% Platform Fee + Tiered ($3, $5, $12) Protection.
 */
export const calculateJobSplit = (
  jobAmount: number,
  category: ServiceCategory,
  hasOwnInsurance: boolean = false
): FeeBreakdown => {
  
  // 15% Platform Commission 
  const platformFee = jobAmount * 0.15; 
  
  // Tiered Protection Fee (Restored Actuals: $3, $5, or $12)
  const mapping = CATEGORY_RISK_MAPPING[category];
  const riskLevel = mapping ? mapping.risk : RISK_LEVELS.LOW;
  const baseProtectionFee = INSURANCE_FEES[riskLevel] || 3.00;
  
  const protectionFee = hasOwnInsurance ? 0 : baseProtectionFee;
  
  const totalDeductions = platformFee + protectionFee;
  const providerNet = jobAmount - totalDeductions;

  // Tax Estimate (2026 Suggestion: 20% for self-withholding)
  const taxHoldbackEstimate = providerNet * 0.20;

  // Total Markup / Take Rate Percentage
  const totalMarkup = platformFee + protectionFee;
  const markupPercentage = (totalMarkup / jobAmount) * 100;

  return {
    grossAmount: jobAmount,
    platformFee: Number(platformFee.toFixed(2)),
    insuranceFee: Number(protectionFee.toFixed(2)),
    providerNet: Number(providerNet.toFixed(2)),
    taxHoldbackEstimate: Number(taxHoldbackEstimate.toFixed(2)),
    markupPercentage: Number(markupPercentage.toFixed(2))
  };
};
