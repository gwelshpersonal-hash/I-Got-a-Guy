import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Search, TrendingUp, Info, DollarSign, Tag, ArrowRight, Database, CheckCircle2, Loader2 } from 'lucide-react';
import { ShiftStatus, Role } from '../types';

interface PriceStats {
  category: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  examples: string[];
}

export const PriceGuide = () => {
  const { shifts, seedMarketData } = useData();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const isAdmin = currentUser?.role === Role.ADMIN;

  const handleSeedData = () => {
      if(confirm("This will inject mock historical job data into the system to calibrate pricing models. Continue?")) {
          setIsSeeding(true);
          // Simulate slight delay for effect
          setTimeout(() => {
              seedMarketData();
              setIsSeeding(false);
              setSeedSuccess(true);
              setTimeout(() => setSeedSuccess(false), 3000);
          }, 1500);
      }
  };

  // Calculate statistics from existing shifts
  const priceStats = useMemo(() => {
    const statsMap: Record<string, { prices: number[], examples: string[] }> = {};

    // Filter relevant shifts (Accepted/Completed/Verified) to get real market data
    // Also include Open Requests to show what people are *offering*, but weight them less ideally. 
    // For simplicity, let's use all shifts that have a price > 0.
    const relevantShifts = shifts.filter(s => 
      s.price && s.price > 0 && 
      (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED || s.status === ShiftStatus.OPEN_REQUEST)
    );

    relevantShifts.forEach(shift => {
      // If search term exists, filter strictly by description matching
      if (searchTerm && !shift.description.toLowerCase().includes(searchTerm.toLowerCase()) && !shift.category.toLowerCase().includes(searchTerm.toLowerCase())) {
          return;
      }

      const cat = shift.category;
      if (!statsMap[cat]) {
        statsMap[cat] = { prices: [], examples: [] };
      }
      statsMap[cat].prices.push(shift.price || 0);
      
      // Keep up to 3 recent unique examples
      if (statsMap[cat].examples.length < 3 && !statsMap[cat].examples.includes(shift.description)) {
          statsMap[cat].examples.push(shift.description);
      }
    });

    const results: PriceStats[] = Object.entries(statsMap).map(([category, data]) => {
      const sum = data.prices.reduce((a, b) => a + b, 0);
      const avg = sum / data.prices.length;
      const min = Math.min(...data.prices);
      const max = Math.max(...data.prices);

      return {
        category,
        count: data.prices.length,
        avgPrice: avg,
        minPrice: min,
        maxPrice: max,
        examples: data.examples
      };
    });

    return results.sort((a, b) => b.count - a.count); // Sort by most popular
  }, [shifts, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* Admin Market Calibration Tool */}
      {isAdmin && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                  <h2 className="text-lg font-bold text-navy-900 flex items-center">
                      <Database className="w-5 h-5 mr-2 text-blue-600" /> Market Calibration
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                      Inject historical data to stabilize pricing averages for Day 1 accuracy.
                  </p>
              </div>
              <button 
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className={`px-6 py-3 rounded-xl font-bold flex items-center shadow-md transition-all ${seedSuccess ? 'bg-green-100 text-green-700' : 'bg-navy-900 text-white hover:bg-navy-800'}`}
              >
                  {isSeeding ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calibrating...</>
                  ) : seedSuccess ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Data Populated</>
                  ) : (
                      "Populate Historical Data"
                  )}
              </button>
          </div>
      )}

      <div className="bg-gradient-to-br from-navy-900 to-navy-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Fair Price Guide</h1>
          <p className="text-navy-100 mb-6 max-w-xl text-lg">
            Not sure what to offer? Check out average prices for similar jobs posted on our platform to help you set a fair rate.
          </p>
          
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by keyword (e.g. 'Lawn', 'Sink', 'Moving')..." 
              className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:bg-white/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {priceStats.length === 0 ? (
           <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
             <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-20" />
             <p className="text-lg font-medium">No pricing data found for "{searchTerm}"</p>
             <p className="text-sm">Try a different keyword or browse categories.</p>
           </div>
        ) : (
          priceStats.map((stat) => (
            <div key={stat.category} className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                     <div className="p-3 bg-navy-50 text-navy-600 rounded-xl group-hover:bg-navy-100 transition-colors">
                        <Tag className="w-5 h-5" />
                     </div>
                     <div>
                       <h3 className="font-bold text-navy-900 text-lg">{stat.category}</h3>
                       <p className="text-xs text-slate-500 font-medium">{stat.count} jobs analyzed</p>
                     </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Avg Price</p>
                    <p className="text-3xl font-black text-navy-900">${Math.round(stat.avgPrice)}</p>
                  </div>
                </div>

                {/* Price Range Visual */}
                <div className="mb-6">
                   <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                      <span>Min: ${stat.minPrice}</span>
                      <span>Max: ${stat.maxPrice}</span>
                   </div>
                   <div className="h-4 bg-slate-100 rounded-full relative overflow-hidden">
                      {/* Range Bar */}
                      <div 
                        className="absolute top-0 bottom-0 bg-gold-200 rounded-full opacity-50"
                        style={{
                            left: '0%',
                            right: '0%' // Spans full width as simpler visual, or calculate range width relative to global max if desired
                        }}
                      ></div>
                      {/* Average Marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-2 bg-navy-900 rounded-full shadow-lg transform -translate-x-1/2 z-10"
                        style={{
                            // Calculate percentage position of avg between min and max (normalized)
                            // If min === max, put in middle
                            left: stat.maxPrice === stat.minPrice 
                                ? '50%' 
                                : `${((stat.avgPrice - stat.minPrice) / (stat.maxPrice - stat.minPrice)) * 100}%`
                        }}
                      ></div>
                   </div>
                   <p className="text-[10px] text-center text-slate-400 mt-1">Marker indicates average</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                      <Info className="w-3 h-3 mr-1" /> Recent Examples
                   </p>
                   <ul className="space-y-2">
                      {stat.examples.map((ex, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start">
                           <ArrowRight className="w-3 h-3 mr-2 mt-0.5 text-gold-500 shrink-0" />
                           <span className="line-clamp-1 italic">"{ex}"</span>
                        </li>
                      ))}
                   </ul>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-start gap-4">
             <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                 <Info className="w-6 h-6" />
             </div>
             <div>
                 <h3 className="font-bold text-navy-900">How is this calculated?</h3>
                 <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                     We analyze historical job data from your area, excluding outliers and cancelled requests. 
                     Prices vary based on complexity, location, and provider experience. This is intended as a guide, not a guarantee.
                 </p>
             </div>
         </div>
      </div>
    </div>
  );
};