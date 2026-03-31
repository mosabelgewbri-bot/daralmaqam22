export type Role = 'admin' | 'manager' | 'accountant' | 'client' | 'guest' | 'staff' | 'visa_specialist' | 'receptionist';

export interface RolePermissions {
  canManageUsers: boolean;
  canManageTrips: boolean;
  canManageBookings: boolean;
  canManageFinance: boolean;
  canManageMarketing: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  role?: Role;
  allowedScreens?: string[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: Role;
  permissions?: RolePermissions;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Trip {
  id: string;
  name: string;
  date: string;
  totalSeats: number;
  ticketPrice: number;
  status: 'active' | 'completed' | 'cancelled' | 'Upcoming';
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Booking {
  id: string;
  tripId: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  seats: number;
  totalAmount: number;
  paidAmount: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  hasWhatsApp?: boolean;
  lastBookingDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UmrahOfferRow {
  makkah: string;
  madinah: string;
  offer: string;
  meals: string;
  double: string;
  triple: string;
  quad: string;
  quint?: string;
  currency?: string;
}

export interface UmrahOffer {
  id: string;
  name?: string;
  documentTitle?: string;
  category: string;
  rows: UmrahOfferRow[];
  fixedText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

export interface Pilgrim {
  id: string;
  bookingId: string;
  name: string;
  passportNumber: string;
  nationality: string;
  [key: string]: any;
}

export type Category = 'Cocktails' | 'Desserts' | 'Coffee';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  category: Category;
  image: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
}
