import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { User, Role } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Bed, 
  CreditCard, 
  FileText, 
  LogOut,
  ShieldCheck,
  Users,
  Settings,
  History,
  BarChart3,
  Calculator,
  IdCard,
  Plane,
  Megaphone,
  Globe
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, onLogout, isOpen, onClose }: SidebarProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { language, setLanguage, t, isRTL } = useLanguage();

  useEffect(() => {
    const handleUpdate = () => setRefreshKey(prev => prev + 1);
    window.addEventListener('permissions_updated', handleUpdate);
    return () => window.removeEventListener('permissions_updated', handleUpdate);
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/', id: 'dashboard' },
    { icon: PlusCircle, label: t('bookings.add_new'), path: '/booking', id: 'booking' },
    { icon: Plane, label: t('nav.trips'), path: '/trips', id: 'trips' },
    { icon: ShieldCheck, label: 'وحدة التأشيرات', path: '/visa', id: 'visa' },
    { icon: Bed, label: t('nav.rooming') || 'تسكين الفنادق', path: '/rooming', id: 'rooming' },
    { icon: CreditCard, label: t('nav.finance') || 'المالية', path: '/finance', id: 'finance' },
    { icon: BarChart3, label: t('nav.analytics') || 'التحليلات', path: '/analytics', id: 'analytics' },
    { icon: Calculator, label: t('nav.profit_loss') || 'الأرباح والخسائر', path: '/profit-loss', id: 'profit-loss' },
    { icon: FileText, label: t('nav.reports') || 'التقرير الشامل', path: '/reports', id: 'reports' },
    { icon: Megaphone, label: t('nav.offers'), path: '/offers', id: 'offers' },
    { icon: Users, label: t('nav.marketing'), path: '/marketing', id: 'marketing' },
    { icon: IdCard, label: t('nav.pilgrims'), path: '/cards', id: 'cards' },
    { icon: Users, label: t('nav.users') || 'المستخدمين', path: '/users', id: 'users' },
    { icon: History, label: t('nav.logs') || 'سجل العمليات', path: '/logs', id: 'logs' },
    { icon: Settings, label: t('nav.settings'), path: '/settings', id: 'settings' },
  ];

  const filteredItems = menuItems.filter(item => {
    if (user.role === 'admin') return true;

    try {
      const savedPermissions = localStorage.getItem('role_permissions');
      if (savedPermissions) {
        const permissions = JSON.parse(savedPermissions) as any[];
        const rolePerms = permissions.find(p => p.role === user.role);
        if (rolePerms && Array.isArray(rolePerms.allowedScreens) && rolePerms.allowedScreens.length > 0) {
          return rolePerms.allowedScreens.includes(item.id);
        }
      }
    } catch (e) {
      console.error('Error parsing permissions:', e);
    }

    // Fallback to basic logic if no permissions found or role not in saved permissions
    if (user.role === 'staff') return ['dashboard', 'booking', 'rooming', 'visa', 'finance', 'cards', 'profit-loss', 'analytics', 'logs'].includes(item.id);
    if (user.role === 'accountant') return ['dashboard', 'reports', 'finance', 'analytics', 'profit-loss', 'visa', 'cards', 'logs'].includes(item.id);
    if (user.role === 'manager') return true;
    if (user.role === 'visa_specialist') return ['dashboard', 'visa', 'reports'].includes(item.id);
    if (user.role === 'receptionist') return ['dashboard', 'booking'].includes(item.id);
    return false;
  });

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={clsx(
        "fixed inset-y-0 z-50 w-72 bg-matte-dark border-white/10 flex flex-col transition-transform duration-500 lg:relative lg:translate-x-0 shadow-2xl",
        isRTL ? "right-0 border-l" : "left-0 border-r",
        isOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full")
      )}>
        <div className="p-8 border-b border-white/10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="flex flex-col gap-6 relative z-10">
            <Logo textSize="text-xl" showSubtitle={true} className="scale-90 origin-right" />
            
            <div className="flex items-center justify-between bg-white/[0.03] rounded-2xl p-4 border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-matte-dark" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-0.5">الدور الحالي</p>
                  <p className="text-xs font-bold text-white/80">
                    {user.role === 'admin' ? 'المدير العام' : 
                     user.role === 'staff' ? 'موظف عمليات' : 
                     user.role === 'accountant' ? 'المحاسب المالي' :
                     user.role === 'manager' ? 'مدير فرع' :
                     user.role === 'visa_specialist' ? 'مسؤول تأشيرات' : 'موظف استقبال'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold mb-4 px-4">القائمة الرئيسية</p>
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => clsx(
                "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                isActive 
                  ? "bg-gold/10 text-gold border border-gold/20 shadow-[0_0_20px_rgba(212,175,55,0.05)]" 
                  : "text-white/50 hover:bg-white/[0.03] hover:text-white border border-transparent"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.div layoutId="active-pill" className="absolute inset-y-2 right-0 w-1 bg-gold rounded-full" />}
                  <item.icon className={clsx("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-gold" : "text-white/30 group-hover:text-gold/60")} />
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10 bg-white/[0.01] space-y-2">
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-4 px-4 py-3 w-full text-white/60 hover:text-gold hover:bg-gold/5 rounded-2xl transition-all group border border-transparent hover:border-gold/10"
          >
            <div className="p-2 rounded-lg bg-white/5 group-hover:bg-gold/10 transition-colors">
              <Globe className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm">{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-4 px-4 py-3 w-full text-red-400/60 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all group border border-transparent hover:border-red-400/10"
          >
            <div className="p-2 rounded-lg bg-red-400/10 group-hover:bg-red-400/20 transition-colors">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
