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
import TrackingModule from './components/TrackingModule';
import UsersManagement from './components/UsersManagement';
import TripForm from './components/TripForm';
import Settings from './components/Settings';
import FinanceModule from './components/FinanceModule';
import PilgrimCardsModule from './components/PilgrimCardsModule';
import Sidebar from './components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { Menu } from 'lucide-react';

function AppContent({ user, onLogout }: { user: User, onLogout: () => void }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
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
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-matte-dark border border-white/10 rounded-lg text-gold shadow-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
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
            <Route path="/reports" element={<ReportsModule user={user} />} />
            <Route path="/tracking" element={<TrackingModule user={user} />} />
            <Route path="/users" element={<UsersManagement user={user} />} />
            <Route path="/trips" element={<TripForm user={user} />} />
            <Route path="/cards" element={<PilgrimCardsModule user={user} />} />
            <Route path="/settings" element={<Settings user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    // Sync permissions from API to localStorage for components that still use it
    const syncPermissions = async () => {
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
        
        let createdAny = false;
        for (const role of roles) {
          const exists = perms.some(p => p.role === role);
          if (!exists) {
            console.log(`Bootstrapping permissions for role: ${role}`);
            const isAdmin = role === 'admin';
            await api.savePermission({
              id: role, // Use role as ID to prevent duplicates
              role,
              allowedScreens: isAdmin 
                ? ['dashboard', 'booking', 'rooming', 'finance', 'tracking', 'reports', 'trips', 'users', 'settings']
                : ['dashboard', 'booking', 'reports'],
              canEdit: isAdmin,
              canDelete: isAdmin,
              canExport: isAdmin,
              canViewFinance: isAdmin || role === 'accountant',
              canApproveBookings: isAdmin || role === 'manager',
              canManageUsers: isAdmin,
              canEditTrips: isAdmin || role === 'manager',
              canViewReports: true,
              canManageSettings: isAdmin,
              canManageFinance: isAdmin || role === 'accountant',
              canChangeVisaStatus: isAdmin || role === 'visa_specialist',
              canManageRooms: isAdmin || role === 'staff' || role === 'receptionist',
              dataScope: isAdmin ? 'all' : 'own'
            } as any);
            createdAny = true;
          }
        }

        if (createdAny) {
          // Re-sync after bootstrap
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

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <AppContent user={user} onLogout={handleLogout} />
    </Router>
  );
}
