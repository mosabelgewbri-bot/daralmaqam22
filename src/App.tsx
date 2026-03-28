import React, { useState, useEffect, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User, Role, RolePermissions, Trip, Booking } from './types';
import { api } from './services/api';
import { cleanLocalStorage } from './utils/dataUtils';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import BookingForm from './components/BookingForm';
import RoomingModule from './components/RoomingModule';
import VisaModule from './components/VisaModule';
import ReportsModule from './components/ReportsModule';
import UsersManagement from './components/UsersManagement';
import TripForm from './components/TripForm';
import Settings from './components/Settings';
import FinanceModule from './components/FinanceModule';
import { FinanceAnalytics } from './components/FinanceAnalytics';
import ProfitLossModule from './components/ProfitLossModule';
import PilgrimCardsModule from './components/PilgrimCardsModule';
import LogsModule from './components/LogsModule';
import UmrahOffersModule from './components/UmrahOffersModule';
import MarketingModule from './components/MarketingModule';
import PublicOffer from './components/PublicOffer';
import PublicImage from './components/PublicImage';
import Sidebar from './components/Sidebar';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationBell from './components/NotificationBell';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, AlertTriangle, RefreshCw } from 'lucide-react';

import { LanguageProvider } from './contexts/LanguageContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  props: any;
  state = { hasError: false, error: null };

  constructor(props: any) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = 'حدث خطأ غير متوقع في التطبيق';
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) errorMessage = `خطأ في قاعدة البيانات: ${parsed.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-matte-black flex items-center justify-center p-6 text-right" dir="rtl">
          <div className="max-w-md w-full bg-matte-dark border border-white/10 rounded-[2rem] p-8 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">عذراً، حدث خطأ ما</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gold text-black rounded-2xl font-black hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
            >
              <RefreshCw className="w-5 h-5" />
              إعادة تحميل التطبيق
            </button>
            <p className="text-[10px] text-white/10 font-mono break-all">
              {String(this.state.error)}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent({ user, onLogout }: { user: User, onLogout: () => void }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isPublicOffer = location.pathname.startsWith('/offer/');
  const isPublicImage = location.pathname.startsWith('/img/');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isPublicOffer || isPublicImage) {
    return (
      <Routes>
        <Route path="/offer/:id" element={<PublicOffer />} />
        <Route path="/img/:id" element={<PublicImage />} />
      </Routes>
    );
  }

  return (
    <NotificationProvider user={user}>
      <div className="flex h-screen bg-matte-black overflow-hidden relative">
        {!isLoginPage && (
          <Sidebar 
            user={user} 
            onLogout={onLogout} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />
        )}
        <main className="flex-1 overflow-y-auto relative">
          {!isLoginPage && (
            <div className="fixed top-4 left-4 z-30 flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 bg-matte-dark border border-white/10 rounded-lg text-gold shadow-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <NotificationBell />
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full"
            >
              <Routes location={location}>
              <Route path="/" element={<Dashboard user={user} onLogout={onLogout} />} />
              <Route path="/booking/:id?" element={<BookingForm user={user} />} />
              <Route path="/rooming" element={<RoomingModule user={user} />} />
              <Route path="/finance" element={<FinanceModule user={user} />} />
              <Route path="/analytics" element={<FinanceAnalytics />} />
              <Route path="/profit-loss" element={<ProfitLossModule user={user} />} />
              <Route path="/reports" element={<ReportsModule user={user} />} />
              <Route path="/offers" element={<UmrahOffersModule user={user} />} />
              <Route path="/marketing" element={<MarketingModule user={user} />} />
              <Route path="/visa" element={<VisaModule user={user} />} />
              <Route path="/users" element={<UsersManagement user={user} />} />
              <Route path="/trips" element={<TripForm user={user} />} />
              <Route path="/cards" element={<PilgrimCardsModule user={user} />} />
              <Route path="/settings" element={<Settings user={user} />} />
              <Route path="/logs" element={<LogsModule onBack={() => window.history.back()} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
        </main>
      </div>
    </NotificationProvider>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Check for public routes first
  const isPublicRoute = window.location.pathname.startsWith('/offer/') || 
                        window.location.pathname.startsWith('/img/');

  useEffect(() => {
    const checkQuota = () => {
      if (api.isQuotaExceeded()) {
        setConnectionError('تم تجاوز حصة الاستخدام المجانية لليوم (Quota Exceeded). ستتم إعادة تعيين الحصة تلقائياً غداً.');
      }
    };
    checkQuota();
    const interval = setInterval(checkQuota, 5000);
    window.addEventListener('focus', checkQuota);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkQuota);
    };
  }, []);

  useEffect(() => {
    // Sync permissions from API to localStorage for components that still use it
    const syncPermissions = async () => {
      if (!user || api.isQuotaExceeded()) return;
      try {
        const perms = await api.getPermissions();
        if (perms && perms.length > 0) {
          localStorage.setItem('role_permissions', JSON.stringify(perms));
          // Trigger events for components listening
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('permissions_updated'));
        }
      } catch (error) {
        console.error('Error syncing permissions:', error);
      }
    };

    const applyTheme = async () => {
      try {
        await api.ensureAuth();
        const settings = await api.getSettings();
        const theme = settings.pref_theme || 'gold';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Also apply a class to body for tailwind variants if needed
        document.body.className = `theme-${theme} min-h-screen bg-matte-black`;
      } catch (error) {
        console.error('Error applying theme:', error);
      }
    };

    const bootstrapData = async () => {
      if (api.isQuotaExceeded()) return;
      try {
        await api.ensureAuth();
        
        // 1. Bootstrap Users if empty
        const users = await api.getUsers();
        if (api.isQuotaExceeded()) return;
        
        if (users.length === 0) {
          console.log('Bootstrapping initial admin user...');
          await api.saveUser({
            username: 'admin',
            password: 'admin123',
            name: 'المدير العام',
            role: 'admin',
            status: 'active'
          });
        }

        // 2. Bootstrap Permissions if missing for any role
        const perms = await api.getPermissions();
        if (api.isQuotaExceeded()) return;
        
        const roles: Role[] = ['admin', 'staff', 'accountant', 'manager', 'visa_specialist', 'receptionist'];
        
        let updatedAny = false;
        const allScreens = ['dashboard', 'booking', 'rooming', 'finance', 'analytics', 'profit-loss', 'visa', 'reports', 'cards', 'trips', 'users', 'logs', 'settings'];

        for (const role of roles) {
          const existingPerm = perms.find(p => p.role === role);
          const isAdmin = role === 'admin';
          const isManager = role === 'manager';

          if (!existingPerm) {
            console.log(`Bootstrapping permissions for role: ${role}`);
            await api.savePermission({
              id: role,
              role,
              allowedScreens: (isAdmin || isManager) ? allScreens : ['dashboard', 'booking', 'reports'],
              canEdit: isAdmin || isManager,
              canDelete: isAdmin,
              canExport: isAdmin || isManager,
              canViewFinance: isAdmin || isManager || role === 'accountant',
              canApproveBookings: isAdmin || isManager,
              canManageUsers: isAdmin,
              canEditTrips: isAdmin || isManager,
              canViewReports: true,
              canManageSettings: isAdmin,
              canManageFinance: isAdmin || isManager || role === 'accountant',
              canChangeVisaStatus: isAdmin || isManager || role === 'visa_specialist',
              canManageRooms: isAdmin || isManager || role === 'staff' || role === 'receptionist',
              dataScope: (isAdmin || isManager) ? 'all' : 'own'
            } as any);
            updatedAny = true;
          } else if (isAdmin || isManager) {
            // Ensure admin/manager always have all screens
            const missingScreens = allScreens.filter(s => !existingPerm.allowedScreens.includes(s));
            if (missingScreens.length > 0) {
              console.log(`Updating missing screens for ${role}:`, missingScreens);
              await api.savePermission({
                ...existingPerm,
                allowedScreens: [...new Set([...existingPerm.allowedScreens, ...allScreens])]
              });
              updatedAny = true;
            }
          }
        }

        if (updatedAny) {
          // Re-sync after bootstrap/update
          const updatedPerms = await api.getPermissions();
          localStorage.setItem('role_permissions', JSON.stringify(updatedPerms));
          window.dispatchEvent(new Event('permissions_updated'));
        }
      } catch (error: any) {
        console.error('Error bootstrapping data:', error);
        if (error.message.includes('Quota exceeded')) {
          setConnectionError('تم تجاوز حصة الاستخدام المجانية لليوم (Quota Exceeded). ستتم إعادة تعيين الحصة تلقائياً غداً.');
        }
      }
    };

    bootstrapData();

    if (user) {
      syncPermissions();
      applyTheme();
    }
    
    window.addEventListener('settings_updated', applyTheme);
    return () => {
      window.removeEventListener('settings_updated', applyTheme);
    };
  }, [user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (isPublicRoute) {
    return (
      <ErrorBoundary>
        <LanguageProvider>
          <Router>
            <Routes>
              <Route path="/offer/:id" element={<PublicOffer />} />
              <Route path="/img/:id" element={<PublicImage />} />
            </Routes>
          </Router>
        </LanguageProvider>
      </ErrorBoundary>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <LanguageProvider>
          {connectionError && (
            <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white p-2 text-center text-xs font-bold">
              ⚠️ {connectionError}
            </div>
          )}
          <Login onLogin={handleLogin} />
        </LanguageProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <LanguageProvider>
        {connectionError && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white p-2 text-center text-xs font-bold">
            ⚠️ {connectionError}
          </div>
        )}
        <Router>
          <AppContent user={user} onLogout={handleLogout} />
        </Router>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
