export interface Trip {
  id: string;
  tripNumber?: string;
  name: string;
  airline: string;
  totalSeats: number;
  availableSeats: number;
  ticketPrice: number;
  currency: "LYD" | "USD";
  exchangeRate?: number;
  status: "Upcoming" | "Active" | "Completed";
  startDate?: string;
  departureDate?: string;
  companyId?: string;
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
  headNameEnglish?: string;
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
    baseTotalLYD?: number;
    baseTotalUSD?: number;
    discountLYD?: number;
    discountUSD?: number;
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
  transportType?: string;
  isVisaOnly?: boolean;
  exchangeRate?: number;
  discountLYD?: number;
  discountUSD?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string; // User ID
  companyId?: string;
  marketingSource?: string;
}

export interface Company {
  id: string;
  name: string;
  nameEn?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive' | 'expired';
  subscriptionStatus?: 'active' | 'expired' | 'trial';
  createdAt: string;
  updatedAt?: string;
}

export interface Pilgrim {
  id: string;
  bookingId: string;
  name: string;
  relationship: string;
  roomType: "Double" | "Triple" | "Quad" | "Quint" | "VisaOnly" | "None";
  passportNo: string;
  expiryDate: string;
  groupNo?: string;
  visaStatus: "Pending" | "Processed" | "Visa Issued";
  makkahRoom?: string;
  madinahRoom?: string;
  passportImage?: string;
  englishName?: string;
  gender?: "Male" | "Female";
  isChild?: boolean;
  serviceType?: "Full" | "TicketOnly" | "AccommodationOnly" | "TicketAndAccommodation" | "VisaOnly" | "AccommodationAndVisa" | "TicketAndVisa";
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
  companyId?: string;
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
  companyId?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: any;
  userId?: string;
  companyId?: string;
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
  companyId?: string;
}

export interface Hotel {
  id: string;
  name: string;
  location: "Makkah" | "Madinah";
  totalRooms: number;
  companyId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface HotelRoom {
  id: string;
  hotelId: string;
  roomNumber: string;
  floor: string;
  type: "Double" | "Triple" | "Quad" | "Quint";
  status: "Vacant" | "Occupied" | "Reserved" | "Cleaning" | "Maintenance";
  capacity: number;
  price: number;
  notes?: string;
  availability?: { [date: string]: 'booked' | 'available' | 'inactive' };
  dailyPrices?: { [date: string]: number };
  customerNames?: { [date: string]: string };
  startDate?: string;
  endDate?: string;
  updatedAt: string;
}

export interface UmrahPricing {
  id: string;
  name: string;
  tripName?: string;
  makkah: {
    hotelName?: string;
    nights: number;
    type: 'flat' | 'priced';
    roomPriceFlat: number;
    doublePrice: number;
    triplePrice: number;
    quadPrice: number;
    quintPrice: number;
  };
  madinah: {
    hotelName?: string;
    nights: number;
    type: 'flat' | 'priced';
    roomPriceFlat: number;
    doublePrice: number;
    triplePrice: number;
    quadPrice: number;
    quintPrice: number;
  };
  visaPrice: number;
  giftsCost: number;
  agentFee: number;
  ticketPrice: number;
  profitMargin: number;
  exchangeRate: number;
  currency: 'USD' | 'LYD';
  results: {
    double: number;
    triple: number;
    quad: number;
    quint: number;
    doubleLYD: number;
    tripleLYD: number;
    quadLYD: number;
    quintLYD: number;
  };
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  companyId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  lastBookingDate?: string;
  totalBookings: number;
  createdAt: string;
  hasWhatsApp?: boolean;
  isVerified?: boolean;
  lastContact?: string;
  updatedAt?: string;
  companyId?: string;
}
