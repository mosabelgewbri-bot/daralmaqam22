import { Booking, Trip, Role, RolePermissions } from '../types';

/**
 * Gets the permissions for a specific role from localStorage or defaults.
 */
export function getRolePermissions(role: Role): RolePermissions {
  const saved = localStorage.getItem('role_permissions');
  if (saved) {
    try {
      const permissions = JSON.parse(saved) as RolePermissions[];
      const found = permissions.find(p => p.role === role);
      if (found) return found;
    } catch (e) {
      console.error('Error parsing role permissions:', e);
    }
  }
  
  // Fallback defaults
  const defaults: Record<Role, RolePermissions> = {
    admin: {
      role: 'admin',
      allowedScreens: ['dashboard', 'booking', 'rooming', 'finance', 'tracking', 'reports', 'trips', 'users', 'settings'],
      canEdit: true,
      canDelete: true,
      canExport: true,
      canViewFinance: true,
      canApproveBookings: true,
      canManageUsers: true,
      canEditTrips: true,
      canViewReports: true,
      canManageSettings: true,
      canManageFinance: true,
      canChangeVisaStatus: true,
      canManageRooms: true,
      dataScope: 'all'
    },
    staff: {
      role: 'staff',
      allowedScreens: ['dashboard', 'booking', 'rooming', 'tracking'],
      canEdit: true,
      canDelete: false,
      canExport: true,
      canViewFinance: false,
      canApproveBookings: false,
      canManageUsers: false,
      canEditTrips: false,
      canViewReports: false,
      canManageSettings: false,
      canManageFinance: false,
      canChangeVisaStatus: false,
      canManageRooms: true,
      dataScope: 'own'
    },
    accountant: {
      role: 'accountant',
      allowedScreens: ['dashboard', 'reports', 'finance'],
      canEdit: false,
      canDelete: false,
      canExport: true,
      canViewFinance: true,
      canApproveBookings: false,
      canManageUsers: false,
      canEditTrips: false,
      canViewReports: true,
      canManageSettings: false,
      canManageFinance: true,
      canChangeVisaStatus: false,
      canManageRooms: false,
      dataScope: 'all'
    },
    manager: {
      role: 'manager',
      allowedScreens: ['dashboard', 'booking', 'rooming', 'finance', 'tracking', 'reports', 'trips'],
      canEdit: true,
      canDelete: true,
      canExport: true,
      canViewFinance: true,
      canApproveBookings: true,
      canManageUsers: false,
      canEditTrips: true,
      canViewReports: true,
      canManageSettings: false,
      canManageFinance: true,
      canChangeVisaStatus: true,
      canManageRooms: true,
      dataScope: 'all'
    },
    visa_specialist: {
      role: 'visa_specialist',
      allowedScreens: ['dashboard', 'tracking', 'reports'],
      canEdit: true,
      canDelete: false,
      canExport: true,
      canViewFinance: false,
      canApproveBookings: false,
      canManageUsers: false,
      canEditTrips: false,
      canViewReports: true,
      canManageSettings: false,
      canManageFinance: false,
      canChangeVisaStatus: true,
      canManageRooms: false,
      dataScope: 'all'
    },
    receptionist: {
      role: 'receptionist',
      allowedScreens: ['dashboard', 'booking'],
      canEdit: true,
      canDelete: false,
      canExport: false,
      canViewFinance: false,
      canApproveBookings: false,
      canManageUsers: false,
      canEditTrips: false,
      canViewReports: false,
      canManageSettings: false,
      canManageFinance: false,
      canChangeVisaStatus: false,
      canManageRooms: false,
      dataScope: 'own'
    }
  };
  return defaults[role];
}

/**
 * Deduplicates an array of bookings by their ID.
 * Keeps the most recently updated/created version of each booking.
 */
export function deduplicateBookings(bookings: Booking[]): Booking[] {
  if (!Array.isArray(bookings)) return [];
  
  const bookingMap = new Map<string, Booking>();
  
  bookings.forEach(booking => {
    if (!booking.id) return;
    
    const existing = bookingMap.get(booking.id);
    if (!existing) {
      bookingMap.set(booking.id, booking);
    } else {
      // If duplicate exists, keep the one with the latest updatedAt or createdAt
      const existingDate = new Date(existing.updatedAt || existing.createdAt).getTime();
      const currentDate = new Date(booking.updatedAt || booking.createdAt).getTime();
      
      if (currentDate > existingDate) {
        bookingMap.set(booking.id, booking);
      }
    }
  });
  
  return Array.from(bookingMap.values());
}

/**
 * Deduplicates an array of trips by their ID.
 */
export function deduplicateTrips(trips: Trip[]): Trip[] {
  if (!Array.isArray(trips)) return [];
  const tripMap = new Map<string, Trip>();
  trips.forEach(trip => {
    if (trip.id) tripMap.set(trip.id, trip);
  });
  return Array.from(tripMap.values());
}

/**
 * Cleans up localStorage data by deduplicating bookings and trips.
 */
export function cleanLocalStorage() {
  try {
    const savedBookings = localStorage.getItem('bookings');
    if (savedBookings) {
      const bookings = JSON.parse(savedBookings);
      const unique = deduplicateBookings(bookings);
      localStorage.setItem('bookings', JSON.stringify(unique));
    }
    
    const savedTrips = localStorage.getItem('trips');
    if (savedTrips) {
      const trips = JSON.parse(savedTrips);
      const unique = deduplicateTrips(trips);
      localStorage.setItem('trips', JSON.stringify(unique));
    }
    
    console.log('LocalStorage data cleaned and deduplicated.');
  } catch (error) {
    console.error('Error cleaning localStorage:', error);
  }
}
