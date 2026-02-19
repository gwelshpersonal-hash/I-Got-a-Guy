
import React, { useState } from 'react';
import { Mail, Phone, MapPin, MessageSquare, ChevronDown, ChevronUp, Send, FileText, Shield, Scale, Edit2, Plus, Trash2, X, Save } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Role, LegalDocument, FaqItem } from '../types';
import { format } from 'date-fns';

export const Support = () => {
    const { faqs, legalDocuments, updateLegalDocument, addFaq, updateFaq, deleteFaq } = useData();
    const { currentUser } = useAuth();
    
    const isAdmin = currentUser?.role === Role.ADMIN;

    const [openFaq, setOpenFaq] = useState<string | null>(null);
    const [msgSubject, setMsgSubject] = useState('');
    const [msgBody, setMsgBody] = useState('');

    // Modal States
    const [editingLegalDoc, setEditingLegalDoc] = useState<LegalDocument | null>(null);
    const [viewingLegalDoc, setViewingLegalDoc] = useState<LegalDocument | null>(null);
    const [editingFaq, setEditingFaq] = useState<Partial<FaqItem> | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Your message has been sent to our support team. We'll reply within 24 hours.");
        setMsgSubject('');
        setMsgBody('');
    };

    const handleSaveLegalDoc = () => {
        if (editingLegalDoc) {
            updateLegalDocument(editingLegalDoc);
            setEditingLegalDoc(null);
        }
    };

    const handleSaveFaq = () => {
        if (!editingFaq?.question || !editingFaq?.answer) return;

        if (editingFaq.id) {
            updateFaq(editingFaq as FaqItem);
        } else {
            addFaq({
                ...editingFaq,
                id: `faq_${Date.now()}`,
                order: faqs.length + 1
            } as FaqItem);
        }
        setEditingFaq(null);
    };

    const handleDeleteFaq = (id: string) => {
        if (confirm("Are you sure you want to delete this FAQ?")) {
            deleteFaq(id);
        }
    };

    const getDocIcon = (category: string) => {
        switch (category) {
            case 'PRIVACY': return <Shield className="w-5 h-5" />;
            case 'LIABILITY': return <Scale className="w-5 h-5" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-display font-black text-navy-900">Support Center</h1>
                    <p className="text-slate-500">We're here to help you get the job done.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Contact Info Cards */}
                <div className="bg-white p-6 rounded-xl border border-gold-200 shadow-sm flex flex-col items-center text-center">
                    <div className="p-3 bg-navy-50 text-navy-600 rounded-full mb-3">
                        <Phone className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-navy-900 mb-1">Call Us</h3>
                    <p className="text-sm text-slate-600">Mon-Fri, 8am - 6pm</p>
                    <a href="tel:555-123-4567" className="text-gold-600 font-bold mt-2 hover:underline">(555) 123-4567</a>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gold-200 shadow-sm flex flex-col items-center text-center">
                    <div className="p-3 bg-navy-50 text-navy-600 rounded-full mb-3">
                        <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-navy-900 mb-1">Email Us</h3>
                    <p className="text-sm text-slate-600">Anytime</p>
                    <a href="mailto:help@igotaguy.co" className="text-gold-600 font-bold mt-2 hover:underline">help@igotaguy.co</a>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gold-200 shadow-sm flex flex-col items-center text-center">
                    <div className="p-3 bg-navy-50 text-navy-600 rounded-full mb-3">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-navy-900 mb-1">HQ</h3>
                    <p className="text-sm text-slate-600">123 Builder Lane</p>
                    <p className="text-sm text-slate-600">Construction City, ST 12345</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Contact Form */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                    <h2 className="text-xl font-bold text-navy-900 mb-4 flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2 text-gold-500" /> Send a Message
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Subject</label>
                            <select 
                                value={msgSubject}
                                onChange={e => setMsgSubject(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-gold-400"
                                required
                            >
                                <option value="">Select a topic...</option>
                                <option value="Payment">Payment Issue</option>
                                <option value="Account">Account Help</option>
                                <option value="Tech">App Bug/Issue</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Message</label>
                            <textarea 
                                value={msgBody}
                                onChange={e => setMsgBody(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-gold-400 h-32 resize-none"
                                placeholder="Describe your issue..."
                                required
                            />
                        </div>
                        <button className="w-full py-3 bg-navy-600 text-white font-bold rounded-xl hover:bg-navy-700 flex items-center justify-center">
                            <Send className="w-4 h-4 mr-2" /> Send Message
                        </button>
                    </form>
                </div>

                <div className="space-y-8">
                    {/* FAQ Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-navy-900">Frequently Asked Questions</h2>
                            {isAdmin && (
                                <button 
                                    onClick={() => setEditingFaq({ question: '', answer: '', order: faqs.length + 1 })}
                                    className="text-xs bg-navy-100 text-navy-700 px-3 py-1.5 rounded-lg hover:bg-navy-200 flex items-center font-bold"
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add FAQ
                                </button>
                            )}
                        </div>
                        <div className="space-y-4">
                            {faqs.sort((a,b) => a.order - b.order).map((faq) => (
                                <div key={faq.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden group">
                                    <div className="flex items-center">
                                        <button 
                                            onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                                            className="flex-1 flex justify-between items-center p-4 text-left font-bold text-navy-900 hover:bg-slate-50"
                                        >
                                            {faq.question}
                                            {openFaq === faq.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </button>
                                        {isAdmin && (
                                            <div className="flex pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingFaq(faq)} className="p-1.5 text-slate-400 hover:text-blue-600">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteFaq(faq.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {openFaq === faq.id && (
                                        <div className="p-4 pt-0 text-sm text-slate-600 bg-slate-50 border-t border-slate-100">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Legal Documents Widget */}
                    <div>
                        <h2 className="text-xl font-bold text-navy-900 mb-4">Legal & Compliance</h2>
                        <div className="grid grid-cols-1 gap-3">
                            {legalDocuments.map((doc) => (
                                <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-gold-300 transition-colors">
                                    <div 
                                        className="flex items-center gap-3 cursor-pointer flex-1"
                                        onClick={() => setViewingLegalDoc(doc)}
                                    >
                                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-gold-50 group-hover:text-gold-600 transition-colors">
                                            {getDocIcon(doc.category)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-navy-900 text-sm">{doc.title}</h3>
                                            <p className="text-[10px] text-slate-400">Last Updated: {format(doc.lastUpdated, 'MMM d, yyyy')}</p>
                                        </div>
                                    </div>
                                    {isAdmin ? (
                                        <button 
                                            onClick={() => setEditingLegalDoc(doc)}
                                            className="p-2 text-slate-400 hover:text-navy-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setViewingLegalDoc(doc)}
                                            className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg"
                                        >
                                            View
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legal Document Viewer Modal */}
            {viewingLegalDoc && (
                <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-extrabold text-navy-900">{viewingLegalDoc.title}</h2>
                                <p className="text-xs text-slate-500 mt-1">Effective Date: {format(viewingLegalDoc.lastUpdated, 'MMMM d, yyyy')}</p>
                            </div>
                            <button onClick={() => setViewingLegalDoc(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-serif">
                            {viewingLegalDoc.content}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
                            <button 
                                onClick={() => setViewingLegalDoc(null)}
                                className="px-6 py-2 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin: Legal Document Editor Modal */}
            {editingLegalDoc && (
                <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h2 className="text-xl font-extrabold text-navy-900 flex items-center">
                                <Edit2 className="w-5 h-5 mr-2 text-gold-500" /> Edit: {editingLegalDoc.title}
                            </h2>
                            <button onClick={() => setEditingLegalDoc(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Content</label>
                            <textarea 
                                className="flex-1 w-full p-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none resize-none font-mono text-sm leading-relaxed"
                                value={editingLegalDoc.content}
                                onChange={(e) => setEditingLegalDoc({...editingLegalDoc, content: e.target.value})}
                            />
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                            <button 
                                onClick={() => setEditingLegalDoc(null)}
                                className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveLegalDoc}
                                className="px-6 py-2 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors flex items-center shadow-lg"
                            >
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin: FAQ Editor Modal */}
            {editingFaq && (
                <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-navy-900">{editingFaq.id ? 'Edit FAQ' : 'Add New FAQ'}</h2>
                            <button onClick={() => setEditingFaq(null)} className="text-slate-400 hover:text-navy-900">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Question</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 outline-none"
                                    value={editingFaq.question || ''}
                                    onChange={(e) => setEditingFaq({...editingFaq, question: e.target.value})}
                                    placeholder="e.g. How do refunds work?"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Answer</label>
                                <textarea 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 outline-none h-32 resize-none"
                                    value={editingFaq.answer || ''}
                                    onChange={(e) => setEditingFaq({...editingFaq, answer: e.target.value})}
                                    placeholder="Detailed answer..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Sort Order</label>
                                <input 
                                    type="number" 
                                    className="w-24 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 outline-none"
                                    value={editingFaq.order || 0}
                                    onChange={(e) => setEditingFaq({...editingFaq, order: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button 
                                onClick={() => setEditingFaq(null)}
                                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveFaq}
                                disabled={!editingFaq.question || !editingFaq.answer}
                                className="px-6 py-2 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 disabled:opacity-50"
                            >
                                Save FAQ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
