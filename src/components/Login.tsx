import React, { useState } from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { Lock, User as UserIcon, ChevronRight } from 'lucide-react';
import Logo from './Logo';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBootstrapMode, setIsBootstrapMode] = useState(false);

  React.useEffect(() => {
    const checkUsers = async () => {
      try {
        const users = await api.getUsers();
        if (users.length === 0) {
          setIsBootstrapMode(true);
        }
      } catch (e) {
        console.error('Error checking users:', e);
      }
    };
    checkUsers();
  }, []);

  const handleBootstrap = async () => {
    setLoading(true);
    setError('');
    try {
      const adminUser: User = {
        id: 'ADMIN-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        username: 'admin',
        name: 'المدير العام',
        role: 'admin',
        status: 'active',
        email: 'admin@dar-al-maqam.com'
      };
      await api.saveUser({ ...adminUser, password: 'admin' });
      alert('تم إنشاء حساب المدير بنجاح: admin / admin');
      setIsBootstrapMode(false);
    } catch (err: any) {
      setError('فشل إنشاء حساب المدير: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { user } = await api.loginWithGoogle();
      onLogin(user);
    } catch (err: any) {
      console.error('Google Login Error:', err);
      setError('فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user } = await api.login(username, password);
      onLogin(user);
    } catch (err: any) {
      let msg = err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة';
      if (msg.includes('network-request-failed')) {
        msg = 'خطأ في الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت أو إضافة النطاق الحالي إلى Authorized Domains في Firebase.';
      } else if (msg.includes('admin-restricted-operation')) {
        msg = '⚠️ خاصية Anonymous Auth معطلة في Firebase Console. يرجى تفعيلها من (Authentication > Sign-in method > Anonymous) أو استخدم تسجيل الدخول عبر Google أدناه.';
      }
      setError(msg);
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
                    const stats = await api.getDbStats();
                    alert(`✅ Firestore Stats: ${JSON.stringify(stats)}`);
                  } catch (e: any) {
                    alert(`❌ Firestore check failed: ${e.message}`);
                  }
                }}
                className="py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg text-gold text-[10px] font-bold transition-all active:scale-95"
              >
                اختبار Firestore
              </button>
              <button 
                type="button"
                onClick={() => {
                  const config = localStorage.getItem('user');
                  alert(`Session: ${config ? 'Active' : 'None'}`);
                }}
                className="py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg text-gold text-[10px] font-bold transition-all active:scale-95"
              >
                حالة الجلسة
              </button>
            </div>
          </div>

          {isBootstrapMode && (
            <div className="p-4 bg-gold/10 border border-gold/30 rounded-2xl space-y-3">
              <p className="text-[10px] text-gold font-bold text-center uppercase tracking-widest">إعداد النظام لأول مرة</p>
              <p className="text-[11px] text-white/60 text-center">لا يوجد مستخدمون في النظام حالياً. هل ترغب في إنشاء حساب مدير افتراضي؟</p>
              <button
                type="button"
                onClick={handleBootstrap}
                disabled={loading}
                className="w-full py-2 bg-gold text-black rounded-xl text-xs font-bold hover:bg-gold/90 transition-all active:scale-95"
              >
                إنشاء حساب المدير (admin/admin)
              </button>
            </div>
          )}

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

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gold/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="px-4 bg-matte-black text-gold/40">أو</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm uppercase tracking-widest">الدخول بواسطة Google</span>
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
