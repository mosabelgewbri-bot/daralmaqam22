-- SQL Schema for Supabase
-- Run this in the Supabase SQL Editor

-- 1. Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  tripNumber TEXT,
  name TEXT NOT NULL,
  airline TEXT NOT NULL,
  totalSeats INTEGER NOT NULL,
  availableSeats INTEGER NOT NULL,
  ticketPrice REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Upcoming'
);

-- 2. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  tripId TEXT REFERENCES trips(id),
  headName TEXT NOT NULL,
  regId TEXT,
  phone TEXT,
  passengerCount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  totals JSONB,
  pilgrims JSONB,
  makkahHotel TEXT,
  makkahNights INTEGER,
  madinahHotel TEXT,
  madinahNights INTEGER,
  makkahBookingNo TEXT,
  makkahCheckIn TEXT,
  madinahBookingNo TEXT,
  madinahCheckIn TEXT,
  paidLYD REAL DEFAULT 0,
  paidUSD REAL DEFAULT 0,
  paidCashLYD REAL DEFAULT 0,
  paidTransferLYD REAL DEFAULT 0,
  paidCashUSD REAL DEFAULT 0,
  paidTransferUSD REAL DEFAULT 0,
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW(),
  createdBy TEXT,
  groupNo TEXT,
  isVisaOnly BOOLEAN DEFAULT FALSE
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  lastLogin TIMESTAMPTZ
);

-- 4. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  role TEXT PRIMARY KEY,
  allowedScreens JSONB,
  canEdit BOOLEAN DEFAULT FALSE,
  canDelete BOOLEAN DEFAULT FALSE,
  canExport BOOLEAN DEFAULT TRUE,
  canViewFinance BOOLEAN DEFAULT TRUE,
  canApproveBookings BOOLEAN DEFAULT FALSE,
  canManageUsers BOOLEAN DEFAULT FALSE,
  canEditTrips BOOLEAN DEFAULT FALSE,
  canViewReports BOOLEAN DEFAULT FALSE,
  canManageSettings BOOLEAN DEFAULT FALSE,
  canManageFinance BOOLEAN DEFAULT FALSE,
  canChangeVisaStatus BOOLEAN DEFAULT FALSE,
  canManageRooms BOOLEAN DEFAULT FALSE,
  dataScope TEXT DEFAULT 'own'
);

-- 5. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 6. Logs Table
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial data
INSERT INTO users (id, username, password, name, role) 
VALUES ('1', 'admin', 'admin123', 'المدير العام', 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO settings (key, value) 
VALUES ('app_logo', 'data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M50 10L15 40V90H85V40L50 10Z" fill="%23D4AF37" fill-opacity="0.2" stroke="%23D4AF37" stroke-width="2"/%3E%3Cpath d="M50 30L30 50V80H70V50L50 30Z" fill="%23D4AF37" stroke="%23D4AF37" stroke-width="2"/%3E%3Ccircle cx="50" cy="20" r="5" fill="%23D4AF37"/%3E%3C/svg%3E')
ON CONFLICT (key) DO NOTHING;

INSERT INTO permissions (role, allowed_screens, can_edit, can_delete, can_export, can_view_finance, can_approve_bookings, can_manage_users, can_edit_trips, can_view_reports, can_manage_settings, can_manage_finance, can_change_visa_status, can_manage_rooms, data_scope)
VALUES 
('admin', '["dashboard", "booking", "rooming", "finance", "tracking", "reports", "trips", "users", "settings"]', true, true, true, true, true, true, true, true, true, true, true, true, 'all'),
('staff', '["dashboard", "booking", "rooming", "tracking", "finance"]', true, false, true, false, false, false, false, false, false, false, false, true, 'own'),
('accountant', '["dashboard", "reports", "finance"]', false, false, true, true, false, false, false, true, false, true, false, false, 'all'),
('manager', '["dashboard", "booking", "rooming", "finance", "tracking", "reports", "trips"]', true, true, true, true, true, false, true, true, false, true, true, true, 'all'),
('visa_specialist', '["dashboard", "tracking", "reports"]', true, false, true, false, false, false, false, true, false, false, true, false, 'all'),
('receptionist', '["dashboard", "booking"]', true, false, false, false, false, false, false, false, false, false, false, false, 'own')
ON CONFLICT (role) DO NOTHING;
