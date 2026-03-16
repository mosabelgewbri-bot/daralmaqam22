import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(`Server root directory: ${__dirname}`);

// Initialize SQLite Database
const DB_PATH = path.resolve(process.cwd(), "database.sqlite");
let db: Database.Database;
try {
  // On Vercel, we might not have write access to the root, so use /tmp or memory
  const isVercel = process.env.VERCEL === "1";
  const actualDbPath = isVercel ? ":memory:" : DB_PATH;
  
  console.log(`Initializing database at ${actualDbPath}...`);
  db = new Database(actualDbPath);
  db.pragma('foreign_keys = ON');
  console.log("Database initialized successfully.");
} catch (error) {
  console.error("Failed to initialize database:", error);
  // Fallback to in-memory if file fails, to at least let the server start
  db = new Database(":memory:");
  console.warn("Falling back to in-memory database.");
}

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    tripNumber TEXT,
    name TEXT,
    airline TEXT,
    totalSeats INTEGER,
    availableSeats INTEGER,
    ticketPrice REAL,
    currency TEXT,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    tripId TEXT,
    headName TEXT,
    regId TEXT,
    phone TEXT,
    passengerCount INTEGER,
    status TEXT,
    totals TEXT, -- JSON string
    pilgrims TEXT, -- JSON string (kept for compatibility)
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
    createdAt TEXT,
    updatedAt TEXT,
    createdBy TEXT,
    groupNo TEXT,
    isVisaOnly INTEGER DEFAULT 0,
    FOREIGN KEY (tripId) REFERENCES trips(id)
  );

  CREATE TABLE IF NOT EXISTS pilgrims (
    id TEXT PRIMARY KEY,
    bookingId TEXT,
    name TEXT,
    passportNo TEXT,
    passportImage TEXT,
    birthDate TEXT,
    gender TEXT,
    nationality TEXT,
    relation TEXT,
    roomType TEXT,
    status TEXT DEFAULT 'pending',
    visaStatus TEXT DEFAULT 'none',
    FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    action TEXT,
    details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS permissions (
    role TEXT PRIMARY KEY,
    allowedScreens TEXT, -- JSON string
    canEdit INTEGER,
    canDelete INTEGER,
    canExport INTEGER DEFAULT 1,
    canViewFinance INTEGER DEFAULT 1,
    canApproveBookings INTEGER DEFAULT 0,
    canManageUsers INTEGER DEFAULT 0,
    canEditTrips INTEGER DEFAULT 0,
    canViewReports INTEGER DEFAULT 0,
    canManageSettings INTEGER DEFAULT 0,
    canManageFinance INTEGER DEFAULT 0,
    canChangeVisaStatus INTEGER DEFAULT 0,
    canManageRooms INTEGER DEFAULT 0,
    dataScope TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration: Add missing columns to bookings table if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(bookings)").all() as any[];
const columnNames = tableInfo.map(c => c.name);

// Migration for trips table
const tripTableInfo = db.prepare("PRAGMA table_info(trips)").all() as any[];
const tripColumnNames = tripTableInfo.map(c => c.name);
if (!tripColumnNames.includes('tripNumber')) {
  console.log("Migrating: Adding column tripNumber to trips table");
  try {
    db.exec("ALTER TABLE trips ADD COLUMN tripNumber TEXT");
  } catch (e) {
    console.error("Failed to add column tripNumber to trips table:", e);
  }
}

const requiredColumns = [
  { name: 'paidLYD', type: 'REAL DEFAULT 0' },
  { name: 'paidUSD', type: 'REAL DEFAULT 0' },
  { name: 'paidCashLYD', type: 'REAL DEFAULT 0' },
  { name: 'paidTransferLYD', type: 'REAL DEFAULT 0' },
  { name: 'paidCashUSD', type: 'REAL DEFAULT 0' },
  { name: 'paidTransferUSD', type: 'REAL DEFAULT 0' },
  { name: 'groupNo', type: 'TEXT' },
  { name: 'isVisaOnly', type: 'INTEGER DEFAULT 0' },
  { name: 'makkahBookingNo', type: 'TEXT' },
  { name: 'makkahCheckIn', type: 'TEXT' },
  { name: 'madinahBookingNo', type: 'TEXT' },
  { name: 'madinahCheckIn', type: 'TEXT' }
];

for (const col of requiredColumns) {
  if (!columnNames.includes(col.name)) {
    console.log(`Migrating: Adding column ${col.name} to bookings table`);
    try {
      db.exec(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      console.error(`Failed to add column ${col.name}:`, e);
    }
  }
}

// Migration: Add missing columns to pilgrims table if they don't exist
const pilgrimTableInfo = db.prepare("PRAGMA table_info(pilgrims)").all() as any[];
const pilgrimColumnNames = pilgrimTableInfo.map(c => c.name);

const requiredPilgrimColumns = [
  { name: 'roomType', type: 'TEXT' },
  { name: 'status', type: "TEXT DEFAULT 'pending'" },
  { name: 'visaStatus', type: "TEXT DEFAULT 'none'" }
];

for (const col of requiredPilgrimColumns) {
  if (!pilgrimColumnNames.includes(col.name)) {
    console.log(`Migrating: Adding column ${col.name} to pilgrims table`);
    try {
      db.exec(`ALTER TABLE pilgrims ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      console.error(`Failed to add column ${col.name}:`, e);
    }
  }
}

// Migration for permissions table
const permsTableInfo = db.prepare("PRAGMA table_info(permissions)").all() as any[];
const permsColumnNames = permsTableInfo.map(c => c.name);
const newPermsColumns = [
  'canApproveBookings', 'canManageUsers', 'canEditTrips', 'canViewReports',
  'canManageSettings', 'canManageFinance', 'canChangeVisaStatus', 'canManageRooms'
];
for (const col of newPermsColumns) {
  if (!permsColumnNames.includes(col)) {
    console.log(`Migrating: Adding column ${col} to permissions table`);
    try {
      db.exec(`ALTER TABLE permissions ADD COLUMN ${col} INTEGER DEFAULT 0`);
    } catch (e) {
      console.error(`Failed to add column ${col} to permissions table:`, e);
    }
  }
}

// Seed initial data if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)");
  insertUser.run('1', 'admin', 'admin123', 'المدير العام', 'admin');
  insertUser.run('2', 'staff', 'staff123', 'موظف عمليات', 'staff');
  insertUser.run('3', 'accountant', 'acc123', 'المحاسب المالي', 'accountant');
  insertUser.run('4', 'manager', 'manager123', 'مدير فرع', 'manager');
  insertUser.run('5', 'visa', 'visa123', 'مسؤول تأشيرات', 'visa_specialist');
  insertUser.run('6', 'reception', 'rec123', 'موظف استقبال', 'receptionist');
}

// Seed default settings if empty
const settingsCount = db.prepare("SELECT count(*) as count FROM settings").get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('app_logo', "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10L15 40V90H85V40L50 10Z' fill='%23D4AF37' fill-opacity='0.2' stroke='%23D4AF37' stroke-width='2'/%3E%3Cpath d='M50 30L30 50V80H70V50L50 30Z' fill='%23D4AF37' stroke='%23D4AF37' stroke-width='2'/%3E%3Ccircle cx='50' cy='20' r='5' fill='%23D4AF37'/%3E%3C/svg%3E");
}

// Seed default permissions if empty
const permsCount = db.prepare("SELECT count(*) as count FROM permissions").get() as { count: number };
if (permsCount.count === 0) {
  const insertPerm = db.prepare(`
    INSERT INTO permissions 
    (role, allowedScreens, canEdit, canDelete, canExport, canViewFinance, canApproveBookings, canManageUsers, canEditTrips, canViewReports, canManageSettings, canManageFinance, canChangeVisaStatus, canManageRooms, dataScope) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertPerm.run('admin', JSON.stringify(['dashboard', 'booking', 'rooming', 'finance', 'tracking', 'reports', 'trips', 'users', 'settings']), 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 'all');
  insertPerm.run('staff', JSON.stringify(['dashboard', 'booking', 'rooming', 'tracking', 'finance', 'settings']), 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'own');
  insertPerm.run('accountant', JSON.stringify(['dashboard', 'reports', 'finance', 'settings']), 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 'all');
  insertPerm.run('manager', JSON.stringify(['dashboard', 'booking', 'rooming', 'finance', 'tracking', 'reports', 'trips', 'settings']), 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 'all');
  insertPerm.run('visa_specialist', JSON.stringify(['dashboard', 'tracking', 'reports', 'settings']), 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 'all');
  insertPerm.run('receptionist', JSON.stringify(['dashboard', 'booking', 'settings']), 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'own');
}

// Migration for permissions: ensure settings is in allowedScreens for all roles
try {
  const allPerms = db.prepare("SELECT role, allowedScreens FROM permissions").all() as any[];
  const updatePerm = db.prepare("UPDATE permissions SET allowedScreens = ? WHERE role = ?");
  for (const p of allPerms) {
    const screens = JSON.parse(p.allowedScreens) as string[];
    if (!screens.includes('settings')) {
      screens.push('settings');
      updatePerm.run(JSON.stringify(screens), p.role);
      console.log(`Migrated: Added settings to allowedScreens for role ${p.role}`);
    }
  }
} catch (e) {
  console.error("Failed to migrate permissions for settings screen:", e);
}

// Helper to clean API Key
function cleanGeminiKey(key: string | undefined): string {
  if (!key) return '';
  // Remove common prefixes if user accidentally pasted them
  let cleaned = key.trim();
  if (cleaned.includes('=')) {
    cleaned = cleaned.split('=').pop() || cleaned;
  }
  
  // Remove all whitespace, quotes, and non-printable characters
  return cleaned
    .replace(/\s/g, '')
    .replace(/^["']|["']$/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
}

const app = express();

async function startServer() {
  const PORT = 3000;

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // API routes
  app.get("/api/health", (req, res) => {
    try {
      const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
      res.json({ status: "ok", db: "connected", users: userCount.count });
    } catch (error: any) {
      res.status(500).json({ status: "error", db: "error", message: error.message });
    }
  });

  app.get("/api/test", (req, res) => {
    res.send("Server is running correctly");
  });

  // Auth
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;

    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Trips
  app.get("/api/trips", (req, res) => {
    const trips = db.prepare("SELECT * FROM trips").all();
    res.json(trips);
  });

  app.post("/api/trips", (req, res) => {
    try {
      const trip = req.body;
      console.log("Saving trip:", JSON.stringify(trip, null, 2));
      
      if (!trip.id || !trip.name || !trip.airline) {
        console.error("Missing required trip fields:", trip);
        return res.status(400).json({ error: "بيانات الرحلة غير مكتملة" });
      }

      const stmt = db.prepare("INSERT OR REPLACE INTO trips (id, tripNumber, name, airline, totalSeats, availableSeats, ticketPrice, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const result = stmt.run(
        trip.id, 
        trip.tripNumber || null, 
        trip.name, 
        trip.airline, 
        trip.totalSeats, 
        trip.availableSeats, 
        trip.ticketPrice, 
        trip.currency, 
        trip.status
      );
      
      console.log("Trip saved successfully, result:", result);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving trip:", error);
      res.status(500).json({ error: `فشل حفظ الرحلة: ${error.message}` });
    }
  });

  app.delete("/api/trips/:id", (req, res) => {
    const id = req.params.id;
    console.log(`DELETE /api/trips/${id}`);
    try {
      const result = db.prepare("DELETE FROM trips WHERE id = ?").run(id);
      console.log(`Delete trip result:`, result);
      if (result.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'الرحلة غير موجودة أو تم حذفها بالفعل' });
      }
    } catch (error: any) {
      console.error(`Error deleting trip:`, error);
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        res.status(400).json({ error: 'لا يمكن حذف هذه الرحلة لوجود حجوزات مرتبطة بها. يرجى حذف الحجوزات أولاً.' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Bookings

  app.get("/api/bookings", (req, res) => {
    try {
      // Join with trips to get trip name and ensure tripId is consistent
      const bookings = db.prepare(`
        SELECT b.*, t.name as tripName, t.tripNumber 
        FROM bookings b
        LEFT JOIN trips t ON b.tripId = t.id
      `).all();
      
      console.log(`Fetching ${bookings.length} bookings from database`);
      
      const parsedBookings = bookings.map((b: any) => {
        try {
          return {
            ...b,
            // Ensure tripId is present even if it's tripid in DB (though it should be tripId)
            tripId: b.tripId || b.tripid || b.trip_id,
            totals: b.totals ? JSON.parse(b.totals) : {},
            pilgrims: b.pilgrims ? JSON.parse(b.pilgrims) : [],
            isVisaOnly: !!b.isVisaOnly
          };
        } catch (e) {
          console.error(`Error parsing booking ${b.id}:`, e);
          return {
            ...b,
            tripId: b.tripId || b.tripid || b.trip_id,
            totals: {},
            pilgrims: []
          };
        }
      });
      res.json(parsedBookings);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/bookings", (req, res) => {
    const b = req.body;
    console.log(`Saving booking: ${b.id} for trip: ${b.tripId}`);
    const tripId = b.tripId || b.tripid || b.trip_id;
    
    const transaction = db.transaction(() => {
      // 0. Get old booking to calculate seat difference
      const oldBooking = db.prepare("SELECT passengerCount, tripId FROM bookings WHERE id = ?").get(b.id) as any;

      // 1. Save Booking
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO bookings 
        (id, tripId, headName, regId, phone, passengerCount, status, totals, pilgrims, makkahHotel, makkahNights, madinahHotel, madinahNights, makkahBookingNo, makkahCheckIn, madinahBookingNo, madinahCheckIn, paidLYD, paidUSD, paidCashLYD, paidTransferLYD, paidCashUSD, paidTransferUSD, createdAt, updatedAt, createdBy, groupNo, isVisaOnly) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        b.id, tripId, b.headName, b.regId, b.phone, b.passengerCount, b.status, 
        JSON.stringify(b.totals), JSON.stringify(b.pilgrims), 
        b.makkahHotel, b.makkahNights, b.madinahHotel, b.madinahNights,
        b.makkahBookingNo || null, b.makkahCheckIn || null,
        b.madinahBookingNo || null, b.madinahCheckIn || null,
        b.paidLYD || 0, b.paidUSD || 0, 
        b.paidCashLYD || 0, b.paidTransferLYD || 0, 
        b.paidCashUSD || 0, b.paidTransferUSD || 0,
        b.createdAt, b.updatedAt || null, b.createdBy, b.groupNo || null,
        b.isVisaOnly ? 1 : 0
      );

      // 2. Update Trip Seats
      if (tripId) {
        if (oldBooking && oldBooking.tripId === tripId) {
          // Same trip, update difference
          const diff = b.passengerCount - oldBooking.passengerCount;
          db.prepare("UPDATE trips SET availableSeats = availableSeats - ? WHERE id = ?").run(diff, tripId);
        } else {
          // New booking or trip changed
          if (oldBooking && oldBooking.tripId) {
            // Restore seats to old trip
            db.prepare("UPDATE trips SET availableSeats = availableSeats + ? WHERE id = ?").run(oldBooking.passengerCount, oldBooking.tripId);
          }
          // Deduct seats from new trip
          db.prepare("UPDATE trips SET availableSeats = availableSeats - ? WHERE id = ?").run(b.passengerCount, tripId);
        }
      }

      // 3. Save Pilgrims (Delete existing first for this booking to avoid duplicates on update)
      db.prepare("DELETE FROM pilgrims WHERE bookingId = ?").run(b.id);
      
      if (Array.isArray(b.pilgrims)) {
        const insertPilgrim = db.prepare(`
          INSERT INTO pilgrims (id, bookingId, name, passportNo, passportImage, birthDate, gender, nationality, relation, roomType)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const p of b.pilgrims) {
          const pId = p.id || Math.random().toString(36).substr(2, 9).toUpperCase();
          insertPilgrim.run(
            pId, b.id, p.name || '', p.passportNo || '', p.passportImage || null,
            p.birthDate || null, p.gender || null, p.nationality || null,
            p.relation || null, p.roomType || null
          );
        }
      }

      // 4. Log Action
      db.prepare("INSERT INTO logs (userId, action, details) VALUES (?, ?, ?)").run(
        b.createdBy || 'system',
        'SAVE_BOOKING',
        `Saved booking ${b.id} for trip ${tripId}`
      );
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving booking transaction:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/bookings/:id", (req, res) => {
    const id = req.params.id;
    console.log(`DELETE /api/bookings/${id}`);
    
    const transaction = db.transaction(() => {
      // 1. Get booking info to restore seats
      const booking = db.prepare("SELECT tripId, passengerCount FROM bookings WHERE id = ?").get(id) as any;
      
      if (booking) {
        // 2. Restore seats to trip
        if (booking.tripId) {
          db.prepare("UPDATE trips SET availableSeats = availableSeats + ? WHERE id = ?").run(booking.passengerCount, booking.tripId);
        }
        
        // 3. Delete booking (pilgrims will be deleted by ON DELETE CASCADE)
        db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
        
        return true;
      }
      return false;
    });

    try {
      const success = transaction();
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'الحجز غير موجود أو تم حذفه بالفعل' });
      }
    } catch (error: any) {
      console.error(`Error deleting booking:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Permissions
  app.get("/api/permissions", (req, res) => {
    const perms = db.prepare("SELECT * FROM permissions").all();
    const parsed = perms.map((p: any) => {
      try {
        return {
          ...p,
          allowedScreens: p.allowedScreens ? JSON.parse(p.allowedScreens) : [],
          canEdit: !!p.canEdit,
          canDelete: !!p.canDelete,
          canExport: !!p.canExport,
          canViewFinance: !!p.canViewFinance,
          canApproveBookings: !!p.canApproveBookings,
          canManageUsers: !!p.canManageUsers,
          canEditTrips: !!p.canEditTrips,
          canViewReports: !!p.canViewReports,
          canManageSettings: !!p.canManageSettings,
          canManageFinance: !!p.canManageFinance,
          canChangeVisaStatus: !!p.canChangeVisaStatus,
          canManageRooms: !!p.canManageRooms
        };
      } catch (e) {
        console.error(`Error parsing permissions for role ${p.role}:`, e);
        return {
          ...p,
          allowedScreens: [],
          canEdit: !!p.canEdit,
          canDelete: !!p.canDelete,
          canExport: !!p.canExport,
          canViewFinance: !!p.canViewFinance,
          canApproveBookings: !!p.canApproveBookings,
          canManageUsers: !!p.canManageUsers,
          canEditTrips: !!p.canEditTrips,
          canViewReports: !!p.canViewReports,
          canManageSettings: !!p.canManageSettings,
          canManageFinance: !!p.canManageFinance,
          canChangeVisaStatus: !!p.canChangeVisaStatus,
          canManageRooms: !!p.canManageRooms
        };
      }
    });
    res.json(parsed);
  });

  app.post("/api/permissions", (req, res) => {
    const p = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO permissions 
      (role, allowedScreens, canEdit, canDelete, canExport, canViewFinance, canApproveBookings, canManageUsers, canEditTrips, canViewReports, canManageSettings, canManageFinance, canChangeVisaStatus, canManageRooms, dataScope) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      p.role, 
      JSON.stringify(p.allowedScreens), 
      p.canEdit ? 1 : 0, 
      p.canDelete ? 1 : 0, 
      p.canExport ? 1 : 0, 
      p.canViewFinance ? 1 : 0,
      p.canApproveBookings ? 1 : 0,
      p.canManageUsers ? 1 : 0,
      p.canEditTrips ? 1 : 0,
      p.canViewReports ? 1 : 0,
      p.canManageSettings ? 1 : 0,
      p.canManageFinance ? 1 : 0,
      p.canChangeVisaStatus ? 1 : 0,
      p.canManageRooms ? 1 : 0,
      p.dataScope
    );
    res.json({ success: true });
  });

  // Users
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    const parsed = users.map((u: any) => {
      const { password: _, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
    res.json(parsed);
  });

  app.post("/api/users", (req, res) => {
    const u = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO users (id, username, password, name, role, status) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(u.id, u.username, u.password || '123456', u.name, u.role, u.status || 'active');
    res.json({ success: true });
  });

  app.delete("/api/users/:id", (req, res) => {
    const id = req.params.id;
    console.log(`DELETE /api/users/${id}`);
    try {
      const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
      console.log(`Delete user result:`, result);
      if (result.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'المستخدم غير موجود أو تم حذفه بالفعل' });
      }
    } catch (error: any) {
      console.error(`Error deleting user:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Settings
  app.post("/api/change-password", (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE id = ? AND password = ?").get(userId, currentPassword) as any;

    if (user) {
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newPassword, userId);
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const result = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(result);
  });

  app.post("/api/settings", (req, res) => {
    const settings = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value);
    }
    res.json({ success: true });
  });

  app.get("/api/db-stats", (req, res) => {
    try {
      const stats = {
        users: (db.prepare("SELECT count(*) as count FROM users").get() as any).count,
        trips: (db.prepare("SELECT count(*) as count FROM trips").get() as any).count,
        bookings: (db.prepare("SELECT count(*) as count FROM bookings").get() as any).count,
        pilgrims: (db.prepare("SELECT count(*) as count FROM pilgrims").get() as any).count,
        logs: (db.prepare("SELECT count(*) as count FROM logs").get() as any).count,
        dbSize: fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0,
        lastBackup: fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).mtime : new Date()
      };
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/db-download", (req, res) => {
    if (fs.existsSync(DB_PATH)) {
      res.download(DB_PATH, `backup_${new Date().toISOString().split('T')[0]}.sqlite`);
    } else {
      res.status(404).json({ error: "Database file not found" });
    }
  });

  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
  });

  app.post("/api/db-upload", upload.single('file'), async (req, res) => {
    let tempDb: Database.Database | null = null;
    const tempPath = path.resolve(process.cwd(), "temp_restore.sqlite");

    try {
      if (!req.file) {
        return res.status(400).json({ error: "لم يتم رفع أي ملف" });
      }

      console.log(`Restoring database from uploaded file: ${req.file.originalname} (${req.file.size} bytes)`);
      
      // Basic SQLite validation
      const buffer = req.file.buffer;
      if (buffer.length < 16 || buffer.toString('utf8', 0, 15) !== 'SQLite format 3') {
        return res.status(400).json({ error: "الملف المرفوع ليس قاعدة بيانات SQLite صالحة" });
      }

      // Write to temporary file first to validate
      fs.writeFileSync(tempPath, buffer);
      
      try {
        tempDb = new Database(tempPath);
        // Verify it's a valid DB by running a simple query
        tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        tempDb.close();
        tempDb = null;
      } catch (e: any) {
        if (tempDb) {
          try { tempDb.close(); } catch(err) {}
        }
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        return res.status(400).json({ error: "قاعدة البيانات المرفوعة تالفة أو غير صالحة: " + e.message });
      }

      // Close current database connection
      try {
        db.close();
      } catch (e) {
        console.warn("Error closing database before restore:", e);
      }
      
      // Replace the database file using rename (more atomic)
      try {
        if (fs.existsSync(DB_PATH)) {
          fs.unlinkSync(DB_PATH);
        }
        fs.renameSync(tempPath, DB_PATH);
      } catch (e: any) {
        console.error("Error replacing database file:", e);
        // Fallback to writeFileSync if rename fails (e.g. cross-device)
        fs.writeFileSync(DB_PATH, buffer);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      
      // Re-open database connection
      db = new Database(DB_PATH);
      db.pragma('foreign_keys = ON');
      
      res.json({ success: true, message: "تم استعادة قاعدة البيانات بنجاح" });
    } catch (error: any) {
      console.error("Error restoring database:", error);
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch(e) {}
      }
      // Try to re-open if it was closed
      try {
        db = new Database(DB_PATH);
        db.pragma('foreign_keys = ON');
      } catch (e) {}
      res.status(500).json({ error: error.message });
    }
  });

  // Global error handler for Express
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Express Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      path: req.path
    });
  });

  // Vite middleware for development
  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);
  
  try {
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      console.log("Initializing Vite middleware...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      
      // Explicitly serve public directory
      app.use(express.static(path.join(process.cwd(), "public")));
      
      app.use(vite.middlewares);
      console.log("Vite middleware initialized.");

      // Add a catch-all for SPA in dev mode
      app.get("*", async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api')) return next();
        
        try {
          const indexPath = path.resolve(process.cwd(), "index.html");
          if (!fs.existsSync(indexPath)) {
            return res.status(404).send("index.html not found. Please ensure it exists in the root.");
          }
          let template = await fs.promises.readFile(indexPath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          console.error(`Error serving index.html for ${url}:`, e);
          next(e);
        }
      });
    } else {
      const distPath = path.join(process.cwd(), "dist");
      console.log(`Serving static files from: ${distPath}`);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          const indexPath = path.join(distPath, "index.html");
          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            res.status(404).send("index.html not found in dist. Check build output.");
          }
        });
      } else {
        console.warn("dist directory not found. API only mode.");
        app.get("/", (req, res) => res.send("API is running. Frontend build missing."));
      }
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error("Failed to initialize server middleware:", error);
    throw error;
  }
}

// Start the server setup
const serverPromise = startServer().catch(err => {
  console.error("Failed to start server:", err);
});

export { app, serverPromise };
export default app;
