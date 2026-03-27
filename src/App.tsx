import { useState, useEffect } from 'react';
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
import { Menu } from 'lucide-react';

import { LanguageProvider } from './contexts/LanguageContext';

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

  // Check for public routes first
  const isPublicRoute = window.location.pathname.startsWith('/offer/') || 
                        window.location.pathname.startsWith('/img/');

  useEffect(() => {
    // Sync permissions from API to localStorage for components that still use it
    const syncPermissions = async () => {
      if (!user) return;
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
      try {
        await api.ensureAuth();
        
        // 1. Bootstrap Users if empty
        const users = await api.getUsers();
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
      } catch (error) {
        console.error('Error bootstrapping data:', error);
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
      <LanguageProvider>
        <Router>
          <Routes>
            <Route path="/offer/:id" element={<PublicOffer />} />
            <Route path="/img/:id" element={<PublicImage />} />
          </Routes>
        </Router>
      </LanguageProvider>
    );
  }

  if (!user) {
    return (
      <LanguageProvider>
        <Login onLogin={handleLogin} />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <Router>
        <AppContent user={user} onLogout={handleLogout} />
      </Router>
    </LanguageProvider>
  );
}
