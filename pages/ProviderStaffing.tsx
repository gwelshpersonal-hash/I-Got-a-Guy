import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Role, Shift, ShiftStatus, ServiceCategory } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import { Plus, Sparkles, MessageCircle, MapPin, Calendar, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import { ALL_SERVICE_CATEGORIES } from '../constants';

export const ProviderStaffing = () => {
  const { currentUser } = useAuth();
  const { shifts, users, addShift, sites } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [requestDesc, setRequestDesc] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  const myPostedGigs = useMemo(() => {
    return shifts.filter(s => 
      s.clientId === currentUser?.id && 
      (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.IN_PROGRESS || s.status === ShiftStatus.OPEN_REQUEST || s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED)
    ).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });
  }, [shifts, currentUser]);

  const submitRequest = () => {
      if (!selectedCategory || !selectedSiteId || !requestDesc || !currentUser) return;

      const newGig: Shift = {
          id: `gig_${Date.now()}`,
          userId: null,
          clientId: currentUser.id,
          siteId: selectedSiteId,
          start: new Date(),
          end: new Date(Date.now() + 2 * 60 * 60 * 1000),
          description: requestDesc,
          category: selectedCategory,
          status: ShiftStatus.OPEN_REQUEST,
          isRecurring: false,
          type: 'SCHEDULED', 
          price: parseFloat(estimatedPrice) || 0,
          createdAt: new Date(),
      };

      addShift(newGig);
      setIsModalOpen(false);
      setSelectedCategory(null);
      setRequestDesc('');
      setEstimatedPrice('');
      alert("Your staffing request has been posted!");
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Staffing</h1>
          <p className="text-slate-500 mt-1">Hire and manage staff for your gigs</p>
        </div>
        <button 
          onClick={() => {
              if (sites.length > 0) setSelectedSiteId(sites[0].id);
              setIsModalOpen(true);
          }}
          className="flex items-center px-5 py-2.5 bg-navy-600 text-white rounded-xl hover:bg-navy-700 transition-all shadow-md font-bold text-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Post a Gig
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
            <BriefcaseIcon className="w-5 h-5 mr-2 text-gold-500" /> My Posted Gigs
        </h2>
        {myPostedGigs.length === 0 ? (
            <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-500 flex flex-col items-center">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Sparkles className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-bold text-navy-900">No active staffing requests.</p>
                <p className="text-sm mt-1">Post a gig to hire another provider to help you.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {myPostedGigs.map(gig => {
                    const assignedProvider = users.find(u => u.id === gig.userId);
                    return (
                    <div key={gig.id} className="p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${gig.status === 'OPEN_REQUEST' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{gig.status.replace('_', ' ')}</span>
                                <span className="text-xs text-slate-500 font-medium">Posted {gig.createdAt ? formatDistanceToNow(gig.createdAt) : 'recently'} ago</span>
                            </div>
                            <h3 className="font-bold text-navy-900 text-lg">{gig.category}</h3>
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{gig.description}</p>
                            
                            {assignedProvider && (
                                <div className="mt-3 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 inline-flex">
                                    <div className="w-6 h-6 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-bold text-xs">
                                        {assignedProvider.name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-bold text-navy-900">Assigned to {assignedProvider.name}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-3 min-w-[120px]">
                            <div className="text-2xl font-black text-navy-900">${gig.price?.toFixed(2)}</div>
                        </div>
                    </div>
                )})}
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <h2 className="text-2xl font-extrabold mb-6 text-navy-900">Post a Staffing Gig</h2>
            
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Category</label>
                    <select 
                        className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                        value={selectedCategory || ''}
                        onChange={e => setSelectedCategory(e.target.value as ServiceCategory)}
                    >
                        <option value="" disabled>Select a category</option>
                        {ALL_SERVICE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {sites.length > 0 && (
                    <div>
                        <label className="block text-sm font-bold text-navy-900 mb-2">Location</label>
                        <select 
                            className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                            value={selectedSiteId}
                            onChange={e => setSelectedSiteId(e.target.value)}
                        >
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>{site.name} - {site.address}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Description</label>
                    <textarea 
                        className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium min-h-[120px]"
                        placeholder="Describe the work you need help with..."
                        value={requestDesc}
                        onChange={e => setRequestDesc(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Estimated Pay ($)</label>
                    <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                        placeholder="e.g. 150"
                        value={estimatedPrice}
                        onChange={e => setEstimatedPrice(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitRequest}
                disabled={!selectedCategory || !requestDesc || !estimatedPrice}
                className="px-6 py-3 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition-all shadow-lg font-bold hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post Gig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function BriefcaseIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  )
}
