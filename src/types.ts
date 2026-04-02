export type Role = 'admin' | 'manager' | 'accountant' | 'visa_officer' | 'rooming_officer' | 'marketing' | 'agent' | 'customer' | 'staff' | 'visa_specialist' | 'receptionist';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  status: 'active' | 'inactive';
  email?: string;
  phone?: string;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RolePermissions {
  id: string;
  role: Role;
  permissions: string[];
  allowedScreens?: string[];
}

export interface Trip {
  id: string;
  name: string;
  type: 'umrah' | 'hajj' | 'tourism';
  startDate: string;
  endDate: string;
  price: number;
  currency: string;
  status: 'open' | 'closed' | 'completed';
  capacity?: number;
  booked?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Booking {
  id: string;
  tripId: string;
  regId: string;
  name: string;
  phone: string;
  contactName: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  totalAmount: number;
  paidAmount: number;
  currency: string;
  pilgrimsCount: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
}

export interface Pilgrim {
  id: string;
  bookingId: string;
  name: string;
  passportNumber: string;
  nationality: string;
  gender: 'male' | 'female';
  birthDate: string;
}

export interface UmrahOffer {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}
