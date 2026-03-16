import React, { useState } from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { Lock, User as UserIcon, ChevronRight } from 'lucide-react';
import Logo from './Logo';
import { api } from '../services/api';
import { supabase } from '../utils/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user } = await api.login(username, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-matte-black p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gold/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-gold/5 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="glass-card w-full max-w-md p-10 space-y-10 relative z-10 border-gold/20 shadow-[0_0_50px_rgba(212,175,55,0.1)]"
      >
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="absolute top-2 right-2 text-[8px] text-gold/40 font-mono">v1.0.6-debug</div>
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gold/10 blur-3xl rounded-full" />
            <Logo iconSize={100} textSize="text-5xl" className="relative" />
          </motion.div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-serif font-bold gold-text-gradient tracking-tight">نظام دار المقام</h2>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-gold/30" />
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">التميز في خدمة ضيوف الرحمن</p>
              <div className="h-px w-8 bg-gold/30" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-3 bg-gold/5 border border-gold/20 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gold/60 uppercase tracking-wider">أدوات التشخيص</span>
              <span className="text-[8px] text-white/20">{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/health');
                    const data = await response.json();
                    alert(`✅ حالة الخادم: ${JSON.stringify(data, null, 2)}`);
                  } catch (e: any) {
                    alert(`❌ فشل الاتصال بالخادم: ${e.message}`);
                  }
                }}
                className="py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg text-gold text-[10px] font-bold transition-all active:scale-95"
              >
                اختبار الخادم (Health)
              </button>
              <button 
                type="button"
                onClick={async () => {
                  try {
                    const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
                    alert(error ? `❌ خطأ في Supabase: ${error.message}` : `✅ تم الاتصال بـ Supabase بنجاح! عدد المستخدمين: ${count}`);
                  } catch (e: any) {
                    alert(`⚠️ فشل الاتصال بـ Supabase: ${e.message}`);
                  }
                }}
                className="py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg text-gold text-[10px] font-bold transition-all active:scale-95"
              >
                اختبار Supabase
              </button>
            </div>
            <div className="text-[8px] text-white/30 font-mono break-all opacity-50">
              URL: {import.meta.env.VITE_SUPABASE_URL || 'Default'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest mr-1">اسم المستخدم</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <UserIcon className="w-4 h-4 text-white/20 group-focus-within:text-gold transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder:text-white/10 focus:outline-none focus:border-gold/50 focus:bg-white/[0.05] transition-all"
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">كلمة المرور</label>
              <button type="button" className="text-[10px] text-gold/60 hover:text-gold transition-colors">نسيت كلمة المرور؟</button>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-white/20 group-focus-within:text-gold transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder:text-white/10 focus:outline-none focus:border-gold/50 focus:bg-white/[0.05] transition-all"
                placeholder="أدخل كلمة المرور"
                required
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex flex-col gap-1 text-red-500 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-red-500" />
                <span className="font-bold">فشل الدخول:</span>
              </div>
              <p className="mr-4 opacity-80">{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gold via-gold/80 to-gold group-hover:scale-105 transition-transform duration-500" />
            <div className="relative py-4 rounded-2xl text-matte-black font-bold flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-matte-black/30 border-t-matte-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>تسجيل الدخول للنظام</span>
                  <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>
        </form>

        <div className="pt-4 text-center">
          <p className="text-[10px] text-white/20">
            بمجرد تسجيل الدخول، فإنك توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
