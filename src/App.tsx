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

    // Migrate data from localStorage to API (one-time)
    const migrateData = async () => {
      const isMigrated = localStorage.getItem('data_migrated_to_sqlite');
      if (isMigrated === 'true') return;

      console.log('Starting data migration to SQLite...');
      try {
        const savedTrips = localStorage.getItem('trips');
        const savedBookings = localStorage.getItem('bookings');

        if (savedTrips) {
          const trips = JSON.parse(savedTrips) as Trip[];
          for (const trip of trips) {
            await api.saveTrip(trip);
          }
          console.log(`Migrated ${trips.length} trips.`);
        }

        if (savedBookings) {
          const bookings = JSON.parse(savedBookings) as Booking[];
          for (const booking of bookings) {
            // Ensure tripId is captured even if named tripid or trip_id in old data
            const normalizedBooking = {
              ...booking,
              tripId: booking.tripId || (booking as any).tripid || (booking as any).trip_id
            };
            await api.saveBooking(normalizedBooking);
          }
          console.log(`Migrated ${bookings.length} bookings.`);
        }

        localStorage.setItem('data_migrated_to_sqlite', 'true');
        console.log('Data migration completed successfully.');
        
        // Refresh the page or trigger a reload of data in components
        if (savedTrips || savedBookings) {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error during data migration:', error);
      }
    };

    const applyTheme = async () => {
      try {
        const settings = await api.getSettings();
        const theme = settings.pref_theme || 'gold';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Also apply a class to body for tailwind variants if needed
        document.body.className = `theme-${theme} min-h-screen bg-matte-black`;
      } catch (error) {
        console.error('Error applying theme:', error);
      }
    };

    if (user) {
      syncPermissions();
      migrateData();
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
