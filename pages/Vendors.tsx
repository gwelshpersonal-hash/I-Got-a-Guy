
import React, { useState } from 'react';
import { User, Role, StaffType } from '../types';
import { useData } from '../contexts/DataContext';
import { Plus, Edit2, Trash2, Truck, Phone, Mail } from 'lucide-react';

export const Vendors = () => {
  const { users, addUser, updateUser } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({});

  const handleOpenModal = (vendor?: User) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData(vendor);
    } else {
      setEditingVendor(null);
      setFormData({ 
        role: Role.VENDOR, 
        staffType: StaffType.CONTRACTOR_1099, 
        isActive: true,
        hourlyRate: 0,
        phone: '',
        companyName: '',
        vendorType: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.companyName) {
        alert("Company Name, Contact Name and Email are required");
        return;
    }

    if (editingVendor) {
      updateUser({ ...editingVendor, ...formData } as User);
    } else {
      const newVendor: User = {
        ...(formData as User),
        id: `user_${Date.now()}`,
        orgId: 'org_1',
      } as User;
      
      addUser(newVendor);
    }
    setIsModalOpen(false);
  };

  const handleDeactivate = (id: string) => {
    const userToDeactivate = users.find(u => u.id === id);
    if (userToDeactivate) {
        updateUser({ ...userToDeactivate, isActive: false });
    }
  };

  // Filter for vendors only
  const vendors = users.filter(u => u.role === Role.VENDOR && u.isActive);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-navy-950">Vendor Management</h1>
            <p className="text-sm text-slate-500">Manage external contractors, trades, and service providers</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gold-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gold-50 border-b border-gold-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-navy-800">Company / Trade</th>
                <th className="px-6 py-4 font-semibold text-navy-800">Contact Person</th>
                <th className="px-6 py-4 font-semibold text-navy-800">Contact Info</th>
                <th className="px-6 py-4 font-semibold text-navy-800">Default Rate</th>
                <th className="px-6 py-4 font-semibold text-navy-800 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.length > 0 ? (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                          <div className="bg-navy-50 p-2 rounded-lg mr-3 text-navy-600">
                              <Truck className="w-4 h-4" />
                          </div>
                          <div>
                              <div className="font-bold text-slate-900">{vendor.companyName || vendor.name}</div>
                              <div className="text-xs text-slate-500 bg-slate-100 inline-block px-1.5 py-0.5 rounded mt-1">
                                  {vendor.vendorType || 'General Contractor'}
                              </div>
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{vendor.name}</td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-600">
                            <span className="flex items-center"><Mail className="w-3 h-3 mr-1.5 opacity-70"/> {vendor.email}</span>
                            <span className="flex items-center"><Phone className="w-3 h-3 mr-1.5 opacity-70"/> {vendor.phone}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                        {vendor.hourlyRate > 0 ? `$${vendor.hourlyRate.toFixed(2)}/hr` : 'Per Job'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenModal(vendor)}
                        className="text-slate-400 hover:text-navy-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { if(confirm("Remove this vendor?")) handleDeactivate(vendor.id) }}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No active vendors found.</p>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-navy-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border-t-4 border-navy-500">
            <h2 className="text-xl font-bold mb-4 text-navy-950 flex items-center">
                <Truck className="w-5 h-5 mr-2 text-navy-600" />
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none"
                  value={formData.companyName || ''}
                  onChange={e => setFormData({...formData, companyName: e.target.value})}
                  placeholder="e.g. Sparky's Electric"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Trade / Service</label>
                    <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none"
                    value={formData.vendorType || ''}
                    onChange={e => setFormData({...formData, vendorType: e.target.value})}
                    placeholder="e.g. Electrician"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Rate ($/hr)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-navy-500"
                      value={formData.hourlyRate}
                      onChange={e => setFormData({...formData, hourlyRate: parseFloat(e.target.value)})}
                    />
                 </div>
              </div>

              <hr className="border-slate-100 my-2"/>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Primary Contact</p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Full Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                    type="email" 
                    className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none"
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="email@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input 
                    type="tel" 
                    className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none"
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="555-0000"
                    />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700"
              >
                Save Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
