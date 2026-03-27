export interface Trip {
  id: string;
  tripNumber?: string;
  name: string;
  airline: string;
  totalSeats: number;
  availableSeats: number;
  ticketPrice: number;
  currency: "LYD" | "USD";
  status: "Upcoming" | "Active" | "Completed";
  startDate?: string;
  departureDate?: string;
  costs?: {
    flightLYD: number;
    hotelLYD: number;
    transportLYD: number;
    visaLYD: number;
    otherLYD: number;
    flightUSD: number;
    hotelUSD: number;
    transportUSD: number;
    visaUSD: number;
    otherUSD: number;
  };
}

export interface Booking {
  id: string;
  tripId: string;
  headName: string;
  regId: string;
  phone: string;
  passengerCount: number;
  status: "Pending" | "Confirmed";
  totals: {
    ticketsLYD: number;
    ticketsUSD: number;
    packageLYD: number;
    packageUSD: number;
    totalLYD: number;
    totalUSD: number;
  };
  costLYD?: number;
  costUSD?: number;
  paidLYD?: number;
  paidUSD?: number;
  paidCashLYD?: number;
  paidTransferLYD?: number;
  paidCashUSD?: number;
  paidTransferUSD?: number;
  pilgrims: Partial<Pilgrim>[];
  makkahHotel: string;
  makkahNights: number;
  madinahHotel: string;
  madinahNights: number;
  makkahBookingNo?: string;
  makkahCheckIn?: string;
  madinahBookingNo?: string;
  madinahCheckIn?: string;
  groupNo?: string;
  isVisaOnly?: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string; // User ID
}

export interface Pilgrim {
  id: string;
  bookingId: string;
  name: string;
  relationship: string;
  roomType: "Double" | "Triple" | "Quad" | "Quint" | "VisaOnly";
  passportNo: string;
  expiryDate: string;
  groupNo?: string;
  visaStatus: "Pending" | "Processed" | "Visa Issued";
  makkahRoom?: string;
  madinahRoom?: string;
  passportImage?: string;
}

export type Role = "admin" | "staff" | "accountant" | "manager" | "visa_specialist" | "receptionist";

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  email?: string;
  status: "active" | "inactive";
  lastLogin?: string;
  backupFrequency?: 'daily' | 'weekly' | 'monthly' | 'manual';
}

export interface RolePermissions {
  role: Role;
  allowedScreens: string[]; // e.g. ['dashboard', 'booking', 'rooming', 'visa', 'reports', 'users', 'trips', 'settings', 'logs']
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canViewFinance: boolean;
  canApproveBookings: boolean;
  canManageUsers: boolean;
  canEditTrips: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canManageFinance: boolean;
  canChangeVisaStatus: boolean;
  canManageRooms: boolean;
  canViewLogs: boolean;
  dataScope: 'all' | 'own';
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: any;
  userId?: string;
}

export interface UmrahOfferRow {
  makkah: string;
  madinah: string;
  offer?: string;
  meals: string;
  double: number;
  triple: number;
  quad: number;
  quint?: number;
  currency: "LYD" | "USD";
}

export interface UmrahOffer {
  id: string;
  name: string;
  category: string;
  documentTitle?: string;
  rows: UmrahOfferRow[];
  fixedText?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  lastBookingDate?: string;
  totalBookings: number;
  createdAt: string;
}
