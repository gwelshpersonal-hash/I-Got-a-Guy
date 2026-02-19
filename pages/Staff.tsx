
import React, { useState } from 'react';
import { User, Role, StaffType, AuditLog, ServiceCategory } from '../types';
import { useData } from '../contexts/DataContext';
import { Plus, Edit2, ShieldAlert, History, Check, X, ShieldCheck, Wrench, ExternalLink, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { ALL_SERVICE_CATEGORIES } from '../constants';

export const Staff = () => {
  const { users, addUser, updateUser } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'PENDING'>('ALL');

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({});

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({ 
        role: Role.PROVIDER, 
        staffType: StaffType.CONTRACTOR_1099, 
        isActive: true,
        verificationStatus: 'VERIFIED',
        hourlyRate: 35.00,
        phone: '',
        skills: [],
        pendingSkills: [], // Init empty
        insuranceType: 'DAILY_SHIELD' // Default for manual add
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingUser) {
      updateUser({ ...editingUser, ...formData } as User);
    } else {
      const newUser: User = {
        ...(formData as User),
        id: `user_${Date.now()}`,
        orgId: 'org_1',
      } as User;
      
      if(!newUser.name || !newUser.email) {
          alert("Name and Email are required");
          return;
      }

      addUser(newUser);
    }
    setIsModalOpen(false);
  };

  const handleApprove = (user: User) => {
      if(confirm(`Approve ${user.name} to start accepting jobs?`)) {
          updateUser({
              ...user,
              isActive: true,
              verificationStatus: 'VERIFIED'
          });
          
          const log: AuditLog = {
              id: Date.now().toString(),
              targetUserId: user.id,
              action: 'PROVIDER_APPROVED',
              timestamp: new Date(),
              performedBy: 'Admin'
          };
          setAuditLogs([log, ...auditLogs]);
      }
  };

  const handleDeactivate = (id: string) => {
    const userToDeactivate = users.find(u => u.id === id);
    if (userToDeactivate) {
        updateUser({ ...userToDeactivate, isActive: false, verificationStatus: 'REJECTED' });
    }
  };

  const toggleSkill = (skill: ServiceCategory) => {
      const currentSkills = formData.skills || [];
      if (currentSkills.includes(skill)) {
          setFormData({ ...formData, skills: currentSkills.filter(s => s !== skill) });
      } else {
          setFormData({ ...formData, skills: [...currentSkills, skill] });
      }
  };

  const handlePendingSkillAction = (skill: ServiceCategory, action: 'APPROVE' | 'REJECT') => {
      const currentPending = formData.pendingSkills || [];
      const currentSkills = formData.skills || [];

      // Remove from pending in all cases
      const newPending = currentPending.filter(s => s !== skill);

      let newSkills = currentSkills;
      if (action === 'APPROVE') {
          // Add to active skills if not already there
          if (!currentSkills.includes(skill)) {
              newSkills = [...currentSkills, skill];
          }
      }

      setFormData({
          ...formData,
          skills: newSkills,
          pendingSkills: newPending
      });
  };

  // Filter Users
  // Logic Updated: Show user if they are pending verification OR have pending skill requests
  const displayUsers = users.filter(u => {
      if (filterType === 'PENDING') {
          const isPendingVerification = u.verificationStatus === 'PENDING';
          const hasPendingSkills = u.pendingSkills && u.pendingSkills.length > 0;
          return isPendingVerification || hasPendingSkills;
      }
      return true;
  });

  const pendingCount = users.filter(u => u.verificationStatus === 'PENDING' || (u.pendingSkills && u.pendingSkills.length > 0)).length;

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
            <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Approvals & User Management</h1>
            <p className="text-slate-500 mt-1">Manage Clients, Providers, and Admins</p>
        </div>
        <div className="flex gap-3">
            <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setFilterType('ALL')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterType === 'ALL' ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    ALL USERS
                </button>
                <button 
                    onClick={() => setFilterType('PENDING')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${filterType === 'PENDING' ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    PENDING 
                    {pendingCount > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px]">{pendingCount}</span>}
                </button>
            </div>
            <button 
            onClick={() => handleOpenModal()}
            className="flex items-center px-5 py-2.5 bg-navy-600 text-white rounded-xl hover:bg-navy-700 transition-all shadow-md font-bold text-sm hover:-translate-y-0.5"
            >
            <Plus className="w-4 h-4 mr-2" />
            Add User
            </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs">Name</th>
                <th className="px-8 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs">Role</th>
                <th className="px-8 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs">Insurance</th>
                <th className="px-8 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs">Approval</th>
                <th className="px-8 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900 text-base flex items-center">
                        {user.name}
                        {/* Dot indicator if action needed */}
                        {(user.verificationStatus === 'PENDING' || (user.pendingSkills?.length || 0) > 0) && (
                            <span className="w-2 h-2 rounded-full bg-red-500 ml-2 animate-pulse"></span>
                        )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{user.email}</div>
                    <div className="text-xs text-slate-400">{user.phone}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.role === Role.ADMIN ? 'bg-purple-50 text-purple-700 border border-purple-100' : 
                      user.role === Role.PROVIDER ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                     {user.role === Role.PROVIDER ? (
                         <div>
                             {user.insuranceType === 'OWN_COI' ? (
                                 <span className={`text-[10px] font-bold flex items-center ${user.isCoiVerified ? 'text-green-600' : 'text-amber-600'}`}>
                                     <FileText className="w-3 h-3 mr-1" />
                                     {user.isCoiVerified ? 'COI Verified' : 'COI Pending'}
                                 </span>
                             ) : (
                                 <span className="text-[10px] font-bold text-blue-600 flex items-center">
                                     <ShieldCheck className="w-3 h-3 mr-1" /> Daily Shield
                                 </span>
                             )}
                         </div>
                     ) : (
                         <span className="text-slate-300">-</span>
                     )}
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex flex-col gap-2">
                        {user.verificationStatus === 'PENDING' ? (
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">ACCOUNT PENDING</span>
                                <button 
                                    onClick={() => handleApprove(user)}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition-colors shadow-sm"
                                    title="Approve Provider"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                <span className="text-xs font-bold text-slate-400">ACCOUNT ACTIVE</span>
                            </div>
                        )}

                        {user.pendingSkills && user.pendingSkills.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 flex items-center">
                                    <Sparkles className="w-3 h-3 mr-1" /> {user.pendingSkills.length} SKILL REQUESTS
                                </span>
                            </div>
                        )}
                     </div>
                  </td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenModal(user)}
                      className="text-slate-400 hover:text-navy-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { if(confirm("Deactivate user?")) handleDeactivate(user.id) }}
                      className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {displayUsers.length === 0 && (
                  <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">No users found matching filters.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {auditLogs.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-navy-900 flex items-center mb-4 uppercase tracking-wider">
                <History className="w-4 h-4 mr-2 text-slate-400"/> Audit Log
            </h3>
            <ul className="text-xs text-slate-600 space-y-3">
                {auditLogs.map(log => (
                    <li key={log.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 transition-colors">
                        <span className="font-mono text-slate-400">{log.timestamp.toLocaleTimeString()}</span>
                        <span className="font-bold text-navy-800">{log.action}</span>
                        <span className="text-slate-500">for {users.find(u => u.id === log.targetUserId)?.name}</span>
                        <span className="text-slate-400 italic ml-auto">by {log.performedBy}</span>
                    </li>
                ))}
            </ul>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <h2 className="text-2xl font-extrabold mb-6 text-navy-900">{editingUser ? 'Edit User' : 'Add New User'}</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-navy-900 mb-2">Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Full Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Email</label>
                    <input 
                    type="email" 
                    className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium"
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="email@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Phone</label>
                    <input 
                    type="tel" 
                    className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium"
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="555-0000"
                    />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Role</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as Role})}
                    >
                      <option value={Role.CLIENT}>Client</option>
                      <option value={Role.PROVIDER}>Provider</option>
                      <option value={Role.ADMIN}>Admin</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Verification</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                      value={formData.verificationStatus || 'VERIFIED'}
                      onChange={e => setFormData({...formData, verificationStatus: e.target.value as any})}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                 </div>
              </div>

              {/* Insurance & Skills for Providers */}
              {formData.role === Role.PROVIDER && (
                  <>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-bold text-navy-900">Insurance & COI</label>
                            <span className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded">{formData.insuranceType === 'DAILY_SHIELD' ? 'Daily Shield Program' : 'Own Insurance'}</span>
                        </div>
                        
                        <div className="space-y-3">
                            {formData.insuranceType === 'OWN_COI' ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-blue-200">
                                        <span className="text-xs text-slate-500 flex items-center">
                                            <FileText className="w-3 h-3 mr-1" /> Certificate on file
                                        </span>
                                        {formData.coiUrl && (
                                            <a href={formData.coiUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center">
                                                View <ExternalLink className="w-3 h-3 ml-1" />
                                            </a>
                                        )}
                                    </div>
                                    <label className="flex items-center p-2 cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={formData.isCoiVerified || false}
                                            onChange={(e) => setFormData({...formData, isCoiVerified: e.target.checked})}
                                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                        />
                                        <span className="ml-2 text-xs font-bold text-emerald-800">Verify Certificate of Insurance</span>
                                    </label>
                                </div>
                            ) : (
                                <p className="text-xs text-blue-800">
                                    User is opted into the Daily Shield program. A $2.00 deduction applies to all jobs automatically.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Pending Skills Section (Only if requests exist) */}
                    {formData.pendingSkills && formData.pendingSkills.length > 0 && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <label className="block text-sm font-bold text-amber-900">Skill Requests</label>
                            </div>
                            <div className="space-y-2">
                                {formData.pendingSkills.map(skill => (
                                    <div key={skill} className="flex justify-between items-center bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                        <span className="text-sm font-bold text-navy-900">{skill}</span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handlePendingSkillAction(skill, 'APPROVE')}
                                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-bold text-xs transition-colors"
                                                title="Approve Skill"
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                onClick={() => handlePendingSkillAction(skill, 'REJECT')}
                                                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold text-xs transition-colors"
                                                title="Reject Skill"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Wrench className="w-4 h-4 text-navy-600" />
                            <label className="block text-sm font-bold text-navy-900">Active Authorizations</label>
                        </div>
                        <p className="text-xs text-slate-500 mb-4 font-medium">Select the categories this provider is eligible to see and accept.</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {ALL_SERVICE_CATEGORIES.map(category => (
                                <label key={category} className={`flex items-center p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                    formData.skills?.includes(category) 
                                    ? 'bg-navy-900 border-navy-900 text-white font-bold shadow-md' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={formData.skills?.includes(category) || false}
                                        onChange={() => toggleSkill(category)}
                                    />
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${formData.skills?.includes(category) ? 'bg-gold-400 border-gold-400' : 'bg-slate-100 border-slate-300'}`}>
                                        {formData.skills?.includes(category) && <Check className="w-3 h-3 text-navy-900" />}
                                    </div>
                                    {category}
                                </label>
                            ))}
                        </div>
                    </div>
                  </>
              )}

            </div>
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-3 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition-all shadow-lg font-bold hover:-translate-y-0.5"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
