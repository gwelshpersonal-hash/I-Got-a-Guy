
import { FeeBreakdown, ServiceCategory } from '../types';
import { CATEGORY_RISK_MAPPING, INSURANCE_FEES, RISK_LEVELS } from '../constants';

/**
 * FeeCalculator logic for "I Got A Guy!" 
 * Implements 2026 Industry Standards: 15% Platform Fee + Tiered Protection.
 */
export const calculateJobSplit = (
  jobAmount: number,
  category: ServiceCategory,
  hasOwnInsurance: boolean = false
): FeeBreakdown => {
  
  // 15% Platform Commission (2026 Industry Standard)
  const platformFee = jobAmount * 0.15; 
  
  // Tiered Protection Fee (The "Actuals": $2, $5, or $10)
  // Lookup risk level from constants to determine fee
  const mapping = CATEGORY_RISK_MAPPING[category];
  const riskLevel = mapping ? mapping.risk : RISK_LEVELS.LOW;
  const baseProtectionFee = INSURANCE_FEES[riskLevel] || 2.00;
  
  // If the Pro has their own COI (and it's verified), they don't pay the Daily Shield protection fee.
  const protectionFee = hasOwnInsurance ? 0 : baseProtectionFee;
  
  // Calculate Net
  const totalDeductions = platformFee + protectionFee;
  const providerNet = jobAmount - totalDeductions;

  // Tax Estimate (Suggest 20% of net for their own savings)
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
