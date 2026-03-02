
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { APP_LOGO_URL } from '../constants';

export const Login = () => {
    const { login } = useAuth();
    const { users } = useData();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const cleanEmail = email.trim().toLowerCase();

        setTimeout(() => {
            const user = users.find(u => u.email.toLowerCase() === cleanEmail);
            
            if (user) {
                // Modified: Allow PENDING users to login so they can fix their profile if needed.
                // Dashboard will restrict their actions.
                if (user.verificationStatus === 'REJECTED') {
                    setError('Your account application was denied.');
                    setIsLoading(false);
                    return;
                }

                if (user.isActive) {
                    login(user.id);
                    navigate('/');
                } else {
                    setError('Account is inactive.');
                    setIsLoading(false);
                }
            } else {
                setError('Invalid credentials.');
                setIsLoading(false);
            }
        }, 800);
    };

    const handleForgotPassword = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }
        // In a real app, this would trigger a Supabase password reset email
        alert(`Password reset link sent to ${email}`);
    };

    return (
        <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Ambient Backgrounds */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>

            <div className="bg-white/95 backdrop-blur-sm w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500 border border-white/20">
                <div className="bg-navy-900 p-10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-950 z-0"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 z-0"></div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-center mb-6">
                            <img 
                                src={APP_LOGO_URL} 
                                alt="I Got A Guy Logo" 
                                className="h-20 w-auto object-contain drop-shadow-2xl"
                            />
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome Back</h1>
                        <p className="text-navy-200 mt-2 text-sm font-medium">Log in to manage your jobs and crew.</p>
                    </div>
                </div>

                <div className="p-10">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start text-sm text-red-600 font-medium animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-2">Email Address</label>
                            <input 
                                type="email"
                                required
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none transition-all font-medium text-navy-900 placeholder:text-slate-400"
                                placeholder="name@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-navy-900">Password</label>
                                <button 
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-xs font-bold text-gold-600 hover:text-gold-500 transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <input 
                                type="password"
                                required
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none transition-all font-medium text-navy-900 placeholder:text-slate-400"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-navy-900 hover:bg-navy-800 text-white text-lg font-bold rounded-xl shadow-lg shadow-navy-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center mt-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-sm font-medium">Don't have an account?</p>
                        <Link to="/signup" className="text-gold-600 font-extrabold hover:text-gold-500 transition-colors text-sm mt-1 inline-block">
                            Create an Account
                        </Link>
                    </div>
                </div>

                <div className="bg-slate-50 p-6 text-center text-xs text-slate-400 border-t border-slate-100">
                    <div className="mb-2 font-bold uppercase tracking-wider">Demo Credentials</div>
                    <div className="flex flex-wrap justify-center gap-2 text-navy-700 font-medium">
                        <span className="bg-white px-2 py-1 rounded border border-slate-200">alice@homeowner.com</span>
                        <span className="bg-white px-2 py-1 rounded border border-slate-200">bob@provider.com</span>
                        <span className="bg-white px-2 py-1 rounded border border-slate-200 text-red-600 font-bold">admin@igotaguy.co</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
