import { Trip, Booking, RolePermissions, User, AuditLog, Notification, Pilgrim, UmrahOffer, Customer, Hotel, HotelRoom, UmrahPricing, Company } from '../types';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDoc,
  setDoc,
  serverTimestamp,
  getDocFromServer,
  getDocsFromServer,
  getDocsFromCache,
  writeBatch,
  orderBy,
  limit,
  clearIndexedDbPersistence
} from 'firebase/firestore';
import { signInAnonymously, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function isQuotaError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || error.error || String(error)).toLowerCase();
  const code = String(error.code || "").toLowerCase();
  const errorCode = error.status || error.code;
  
  if (code === '8' || code === 'resource-exhausted' || code.includes('quota-exceeded')) return true;
  if (errorCode === 8 || errorCode === 429 || errorCode === '8') return true;
  
  return msg.includes('quota exceeded') || 
         msg.includes('resource exhausted') || 
         msg.includes('limit exceeded') || 
         msg.includes('daily limit');
}

function isConnectionError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || error.error || String(error)).toLowerCase();
  return msg.includes('offline') || 
         msg.includes('unavailable') || 
         msg.includes('could not reach') || 
         msg.includes('connection terminated') || 
         msg.includes('terminated by server') || 
         msg.includes('network error') || 
         msg.includes('internal error') ||
         msg.includes('failed to fetch');
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? errorMessageFrom(error) : String(error);
  const isQuota = isQuotaError(error) || errorMessage.toLowerCase().includes('quota exceeded');
  const isConn = isConnectionError(error);
  
  if (isQuota || isConn) {
    if (errorMessage.toLowerCase().includes('connection terminated') || errorMessage.toLowerCase().includes('terminated by server')) {
       console.warn('Firestore Connection Terminated (Retrying or Handled) for path:', path);
       return;
    }
    if (isQuota) {
      quotaExceeded = true;
      lastQuotaErrorTime = Date.now();
    }
    lastError = errorMessage;
    console.warn(`Firestore ${isQuota ? 'Quota' : 'Connection'} Issue (Handled) for path:`, path, errorMessage);
    return;
  }

  // SILENTLY handle permission errors for LIST operations if not signed in, to avoid crashing the UI
  if (operationType === OperationType.LIST && (errorMessage.includes('insufficient permissions') || errorMessage.includes('permission-denied'))) {
    console.warn(`Firestore Permission Denied (Handled) for LIST on path: ${path}. Return empty results.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error(`Firestore Error [${operationType}] on ${path}:`, errorMessage);
  console.log('CurrentUser:', auth.currentUser ? `ID: ${auth.currentUser.uid}, Anonymous: ${auth.currentUser.isAnonymous}` : 'NOT LOGGED IN');
  throw new Error(JSON.stringify(errInfo));
}

function errorMessageFrom(error: any): string {
  if (typeof error === 'string') return error;
  return error.message || error.error || JSON.stringify(error);
}

function safeLocalStorageSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error: any) {
    console.log(`Local storage write failed: ${error.message || error}`);
    
    const isQuota = 
      error.name === 'QuotaExceededError' || 
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      String(error).toLowerCase().includes('quota') ||
      String(error.message || '').toLowerCase().includes('quota');
      
    if (isQuota) {
      console.log("Freeing local storage cache by aggressively pruning old stored state...");
      
      const keysToKeep = ['user', 'token', 'theme', 'companyId'];
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !keysToKeep.includes(k) && k !== key) {
          keysToRemove.push(k);
        }
      }
      
      for (const k of keysToRemove) {
        try {
          localStorage.removeItem(k);
          localStorage.removeItem(`last_${k.replace('cached_', '')}_fetch`);
        } catch (_) {}
      }
      
      // Retry putting original value
      try {
        localStorage.setItem(key, value);
        console.log(`Cache key "${key}" saved successfully after purging non-critical keys.`);
        return;
      } catch (e) {
        // If it still fails, let's compress the collection itself
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            console.log(`Pruning collection "${key}" of length ${parsed.length} to fit quota.`);
            // Prune to the latest 30 items
            const reduced = parsed.slice(0, 30).map((item: any) => {
              if (item && typeof item === 'object') {
                // Strip non-essential fields to minimize size
                const {
                  makkahHotel, madinahHotel, notes, makkahCheckIn, madinahCheckIn,
                  makkahBookingNo, madinahBookingNo, auditLogs, ...essential
                } = item;
                // If it contains pilgrims array, also prune them
                if (Array.isArray(essential.pilgrims)) {
                  essential.pilgrims = essential.pilgrims.map((p: any) => {
                    if (p && typeof p === 'object') {
                      const { passportImage, ...essentialPilgrim } = p;
                      return essentialPilgrim;
                    }
                    return p;
                  });
                }
                return essential;
              }
              return item;
            });
            
            localStorage.setItem(key, JSON.stringify(reduced));
            console.log(`Successfully persisted compressed collection for key "${key}".`);
          }
        } catch (compressError: any) {
          console.log(`Persistence deferred to avoid browser storage exhaustion.`);
        }
      }
    }
  }
}

// Test connection on boot
let quotaExceeded = false;
let lastQuotaErrorTime = 0;
const QUOTA_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes block on quota exceeded

let lastError: string | null = null;
let currentCompanyId: string | null = null;

function canMakeRequest(): boolean {
  if (!quotaExceeded) return true;
  
  const now = Date.now();
  if (now - lastQuotaErrorTime > QUOTA_RETRY_DELAY) {
    console.log('Quota backoff period expired. Attempting requests again.');
    quotaExceeded = false;
    return true;
  }
  return false;
}

async function testConnection(retries = 3) {
  if (quotaExceeded && !canMakeRequest()) return;

  try {
    // Attempting to read using a query that might fail if offline but doesn't require a specific document
    await getDocsFromServer(query(collection(db, 'trips'), limit(1)));
    console.log("Firestore connection test successful");
    quotaExceeded = false;
    lastError = null;
  } catch (error: any) {
    const errorMsg = errorMessageFrom(error);
    console.warn("Connection test failed:", errorMsg);
    lastError = errorMsg;

    // If it's a permission error, it means we ARE connected but just can't read yet (expected if not logged in)
    if (errorMsg.includes('permission-denied') || errorMsg.includes('insufficient permissions')) {
      console.log("Firestore connected (Auth pending or permissions restricted)");
      quotaExceeded = false;
      return;
    }

    if (retries > 0 && (isQuotaError(error) || isConnectionError(error))) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return testConnection(retries - 1);
    }

    if (isQuotaError(error)) {
      quotaExceeded = true;
      lastQuotaErrorTime = Date.now();
    }
  }
}
testConnection();

// Recursive helper to remove undefined values from objects/arrays
function cleanUndefined(obj: any): any {
  if (obj === undefined) return undefined;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(v => cleanUndefined(v)).filter(v => v !== undefined);
  }
  if (typeof obj === 'object' && !(obj instanceof Date) && !(obj?.constructor?.name === 'FieldValue')) {
    const entries = Object.entries(obj)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, cleanUndefined(v)]);
    return Object.fromEntries(entries);
  }
  return obj;
}

// Helper to convert Firestore Timestamps to ISO strings
function mapDocData<T>(doc: any): T {
  const data = doc.data();
  const id = doc.id;
  
  const processValue = (val: any): any => {
    if (val && typeof val === 'object') {
      if (typeof val.toDate === 'function') {
        return val.toDate().toISOString();
      }
      if (Array.isArray(val)) {
        return val.map(processValue);
      }
      const mapped: any = {};
      for (const [k, v] of Object.entries(val)) {
        mapped[k] = processValue(v);
      }
      return mapped;
    }
    return val;
  };

  return { id, ...processValue(data) } as T;
}

// Invalidate stale globally-deduplicated bookings cache to force a fresh fetch
try {
  localStorage.removeItem('cached_bookings');
  localStorage.removeItem('last_bookings_fetch');
} catch (e) {}

const normalizeTripString = (str: string): string => {
  if (!str) return '';
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let normalized = str;
  for (let i = 0; i < 10; i++) {
    normalized = normalized.replace(arabicNumbers[i], String(i));
  }
  normalized = normalized.replace(/[-.\s\\_]+/g, '/');
  normalized = normalized.trim().toLowerCase();
  if (/^\d+(\/\d+)+$/.test(normalized)) {
    normalized = normalized.split('/').map(part => {
      const parsed = parseInt(part, 10);
      return isNaN(parsed) ? part : String(parsed);
    }).join('/');
  }
  return normalized;
};

const findTripRobust = (tripsList: Trip[], tripIdOrName: any, bookingObj?: any) => {
  const queryId = String(tripIdOrName || '').trim().toLowerCase();
  const bTripName = bookingObj ? String(bookingObj.tripName || (bookingObj as any).tripName || '').trim().toLowerCase() : '';
  
  // 1. Try exact match first
  const exactFound = tripsList.find(t => {
    const tId = String(t.id).trim().toLowerCase();
    const tName = String(t.name).trim().toLowerCase();
    return tId === queryId || tName === queryId || (bTripName && tName === bTripName);
  });
  if (exactFound) return exactFound;

  // 2. Try normalized comparison
  const normQuery = normalizeTripString(queryId);
  const normBookingName = normalizeTripString(bTripName);

  return tripsList.find(t => {
    const tId = normalizeTripString(t.id);
    const tName = normalizeTripString(t.name);
    return (normQuery && (tId === normQuery || tName === normQuery)) ||
           (normBookingName && tName === normBookingName);
  });
};

function deduplicateBookings(bookings: Booking[], trips?: Trip[]): Booking[] {
  // Sort bookings by createdAt descending in memory (Index-free, safe, and robust)
  const sorted = [...bookings].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  // Ensure absolute uniqueness by document ID
  const seenIds = new Set<string>();
  let filtered = sorted.filter(b => {
    if (!b.id) return false;
    if (seenIds.has(b.id)) return false;
    seenIds.add(b.id);
    return true;
  });

  // De-duplicate by regId per trip - keep the latest one (since we sorted by createdAt desc)
  const seenTripRegIds = new Set<string>();
  filtered = filtered.filter(b => {
    let tId = '';
    if (trips && trips.length > 0) {
      const resolved = findTripRobust(trips, b.tripId || (b as any).tripid || (b as any).trip_id || (b as any).tripName, b);
      if (resolved) {
        tId = resolved.id;
      }
    }
    if (!tId) {
      tId = String(b.tripId || (b as any).tripid || (b as any).trip_id || (b as any).tripName || '').trim().toLowerCase();
    }
    const rId = String(b.regId || '').trim();
    if (!tId || !rId) return true; // Keep if empty/null
    const uniqueKey = `${tId}_${rId}`;
    if (seenTripRegIds.has(uniqueKey)) {
      console.warn('Filtered duplicate registration ID within trip during deduplication helper:', uniqueKey);
      return false;
    }
    seenTripRegIds.add(uniqueKey);
    return true;
  });

  return filtered;
}

export const api = {
  async resetQuota() {
    quotaExceeded = false;
    lastError = null;
    console.log('Force manual quota reset. Re-checking server connection...');
    
    // Attempt 3 different collections to find a bypass
    const tests = ['trips', 'users', 'logs'];
    let successCount = 0;
    let lastErrDetail = '';
    let isQuotaStillExceeded = false;

    for (const colName of tests) {
      try {
        await getDocsFromServer(query(collection(db, colName), limit(1)));
        successCount++;
        break; // One success is enough
      } catch (e: any) {
        lastErrDetail = errorMessageFrom(e);
        const errLower = lastErrDetail.toLowerCase();
        
        // If it's a security/permission denial, the server is alive and evaluated the security rules (quota is fine!)
        if (errLower.includes('permission-denied') || errLower.includes('insufficient') || errLower.includes('permissions')) {
          successCount++;
          break;
        }

        // If it's any other error that is NOT a quota error and NOT a connection error, the server processed it
        if (!isQuotaError(e) && !isConnectionError(e)) {
          successCount++;
          break;
        }

        if (isQuotaError(e)) {
          isQuotaStillExceeded = true;
        }
      }
    }

    if (successCount > 0) {
      console.log('Server connection verified! System is online.');
      quotaExceeded = false;
      lastError = null;
      return { success: true };
    } else {
      console.error('Connection still blocked by server:', lastErrDetail);
      if (isQuotaStillExceeded || lastErrDetail.toLowerCase().includes('quota') || lastErrDetail.toLowerCase().includes('exhausted')) {
        quotaExceeded = true;
      }
      lastError = lastErrDetail;
      return { success: false, error: 'Still blocked by server', detail: lastErrDetail };
    }
  },

  forceReset() {
    console.log('Forcefully clearing quota flag without checking server.');
    quotaExceeded = false;
    lastError = null;
    return true;
  },

  getDataScope(): 'all' | 'own' {
    const userStr = localStorage.getItem('user');
    if (!userStr) return 'all';
    try {
      const userObj = JSON.parse(userStr);
      if (!userObj || !userObj.role) return 'all';
      if (userObj.role === 'admin' || userObj.role === 'manager') return 'all';
      
      const saved = localStorage.getItem('role_permissions');
      if (saved) {
        const permissions = JSON.parse(saved) as RolePermissions[];
        const found = permissions.find(p => p.role === userObj.role);
        if (found && found.dataScope) {
          return found.dataScope;
        }
      }
      if (userObj.role === 'staff' || userObj.role === 'receptionist') {
         return 'own';
      }
    } catch (e) {
      console.error('Error getting data scope:', e);
    }
    return 'all';
  },

  getCurrentUserId(): string | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      const userObj = JSON.parse(userStr);
      return userObj ? userObj.id : null;
    } catch (e) {
      return null;
    }
  },

  filterBookingsByScope(bookings: Booking[]): Booking[] {
    const dataScope = this.getDataScope();
    if (dataScope !== 'own') return bookings;
    const userId = this.getCurrentUserId();
    if (!userId) return bookings;
    return bookings.filter(b => !b.createdBy || b.createdBy === userId);
  },

  async deepReset() {
    console.log('Starting deep reset...');
    console.log('Project Identity:', {
      projectId: 'gen-lang-client-0227849596',
      database: 'ai-studio-17a07b55-b746-4e2d-a308-a63e401936a9',
      apiKeyPrefix: 'AIzaSy'
    });
    try {
      // 1. Clear Firestore persistence
      try {
        await clearIndexedDbPersistence(db);
      } catch (e) {
        console.warn('Persistence clear skipped:', e);
      }
      
      // 2. Clear typical browser caches
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Reset JS flags
      quotaExceeded = false;
      lastError = null;
      
      // 4. Force fully clean IndexedDB
      try {
        const databases = await window.indexedDB.databases();
        for (const dbInfo of databases) {
          if (dbInfo.name) window.indexedDB.deleteDatabase(dbInfo.name);
        }
      } catch (e) {}
      
      console.log('Deep reset complete. Power cycling...');
      window.location.reload();
    } catch (e) {
      console.error('Fatal reset error:', e);
      localStorage.clear();
      window.location.reload();
    }
  },
  
  async checkOriginalError() {
    try {
      await getDocsFromServer(query(collection(db, 'users'), limit(1)));
      return "Success: Connection is working now!";
    } catch (e: any) {
      return `Error: ${e.code || 'No code'} - ${e.message || String(e)}`;
    }
  },
  
  isQuotaExceeded: () => quotaExceeded,
  getLastError: () => lastError,
  
  setCompanyId(id: string | null) {
    currentCompanyId = id;
    if (id) localStorage.setItem('current_company_id', id);
    else localStorage.removeItem('current_company_id');
  },

  getCompanyId(): string | null {
    if (currentCompanyId) return currentCompanyId;
    return localStorage.getItem('current_company_id');
  },

  async withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && isQuotaError(error)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.withRetry(fn, retries - 1);
      }
      throw error;
    }
  },

  // Auth
  async login(username: string, password: string): Promise<{ user: User }> {
    const path = 'users';
    try {
      await this.ensureAuth();
      const q = query(collection(db, path), where("username", "==", username), where("password", "==", password));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as any;
      const uid = auth.currentUser?.uid;

      if (userData.companyId) {
        this.setCompanyId(userData.companyId);
      }

      if (uid && userDoc.id !== uid) {
        const newUserRef = doc(db, path, uid);
        await setDoc(newUserRef, { ...userData, linkedFrom: userDoc.id, updatedAt: serverTimestamp() }, { merge: true });
      }
      
      return { 
        user: { 
          id: uid || userDoc.id, 
          ...userData,
          createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt,
          updatedAt: userData.updatedAt?.toDate?.()?.toISOString() || userData.updatedAt
        } 
      };
    } catch (error: any) {
      if (isQuotaError(error)) {
        quotaExceeded = true;
      }
      if (error instanceof Error && error.message === 'اسم المستخدم أو كلمة المرور غير صحيحة') throw error;
      handleFirestoreError(error, OperationType.GET, path);
      throw error;
    }
  },

  // Trips
  authPromise: null as Promise<void> | null,
  lastAuthAttempt: 0,

  async ensureAuth(): Promise<void> {
    if (auth.currentUser) return;
    
    const now = Date.now();
    // Don't retry auth too frequently if it's failing
    if (this.lastAuthAttempt > 0 && now - this.lastAuthAttempt < 10000) {
      return;
    }

    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = (async () => {
      this.lastAuthAttempt = Date.now();
      try {
        await signInAnonymously(auth);
        console.log('Anonymous authentication successful');
        localStorage.removeItem('fb_auth_disabled');
      } catch (error: any) {
        if (error.code === 'auth/admin-restricted-operation') {
          console.warn('Anonymous auth is disabled in Firebase Console.');
          localStorage.setItem('fb_auth_disabled', 'true');
        } else {
          console.error('Error signing in anonymously:', error);
        }
      } finally {
        this.authPromise = null;
      }
    })();

    return this.authPromise;
  },

  async loginWithGoogle(): Promise<{ user: User }> {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      // Check if user exists in our 'users' collection or create a new one
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      let userData: User;
      if (userSnap.exists()) {
        userData = { id: userSnap.id, ...userSnap.data() } as User;
        // Ensure role is admin if it's the super admin
        if (firebaseUser.email?.toLowerCase() === 'mosabelgewbri@gmail.com' && userData.role !== 'admin') {
          await updateDoc(userRef, { role: 'admin' });
          userData.role = 'admin';
        }
      } else {
        // Create a basic user record for the first-time Google login
        userData = {
          id: firebaseUser.uid,
          username: firebaseUser.email?.split('@')[0] || 'user',
          name: firebaseUser.displayName || 'مستخدم جديد',
          role: firebaseUser.email?.toLowerCase() === 'mosabelgewbri@gmail.com' ? 'admin' : 'staff',
          status: 'active',
          email: firebaseUser.email || ''
        };
        await setDoc(userRef, { ...userData, createdAt: serverTimestamp() });
      }
      
      return { user: userData };
    } catch (error: any) {
      handleFirestoreError(error, OperationType.GET, 'auth');
      throw error;
    }
  },

  // Trips
  async getTrips(): Promise<Trip[]> {
    const path = 'trips';
    const companyId = this.getCompanyId();
    
    // Cache first
    const cachedStr = localStorage.getItem('cached_trips');
    if (cachedStr) {
      try {
        const all = JSON.parse(cachedStr) as Trip[];
        const lastFetch = Number(localStorage.getItem('last_trips_fetch') || 0);
        const isFresh = Date.now() - lastFetch < (quotaExceeded ? 300000 : 120000); // 5 mins if quota error, 2 mins normally
        if (isFresh || (quotaExceeded && !canMakeRequest())) return all;
      } catch (e) {}
    }

    if (quotaExceeded && !canMakeRequest()) {
      return cachedStr ? JSON.parse(cachedStr) : [];
    }

    try {
      await this.ensureAuth();
      let q = query(collection(db, path));
      
      // Only filter by company if not admin
      const userStr = localStorage.getItem('user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      if (companyId && userObj?.role !== 'admin') {
        q = query(q, where("companyId", "==", companyId));
      }
      
      const querySnapshot = await getDocs(q);
      const trips = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as Trip;
      });
      
      safeLocalStorageSetItem('cached_trips', JSON.stringify(trips));
      safeLocalStorageSetItem('last_trips_fetch', Date.now().toString());
      
      return trips;
    } catch (error: any) {
      if (isQuotaError(error)) {
        quotaExceeded = true;
        if (cachedStr) return JSON.parse(cachedStr);
      }
      handleFirestoreError(error, OperationType.LIST, path);
      if (cachedStr) return JSON.parse(cachedStr);
      return [];
    }
  },
  async saveTrip(trip: Trip): Promise<void> {
    const path = 'trips';
    const { id, ...data } = trip;
    const companyId = this.getCompanyId();
    
    const cleanData = cleanUndefined(data);

    try {
      await this.ensureAuth();
      if (id && id !== 'new') {
        const docRef = doc(db, path, id);
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (e) {
          // Fall back gracefully if offline or cache issue
        }

        if (docSnap && docSnap.exists()) {
          await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
        } else {
          await setDoc(docRef, { ...cleanData, companyId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
      } else {
        await addDoc(collection(db, path), { ...cleanData, companyId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },
  async deleteTrip(id: string): Promise<void> {
    const path = 'trips';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Bookings
  async getBookings(limitCount?: number): Promise<Booking[]> {
    const path = 'bookings';
    const companyId = this.getCompanyId();
    
    const cachedStr = localStorage.getItem('cached_bookings');
    if (cachedStr) {
      try {
        const all = JSON.parse(cachedStr) as Booking[];
        const lastFetch = Number(localStorage.getItem('last_bookings_fetch') || 0);
        // Extend cache validity during quota issues
        const cacheTTL = (quotaExceeded && !canMakeRequest()) ? 600000 : 60000;
        if (Date.now() - lastFetch < cacheTTL) {
           const filtered = this.filterBookingsByScope(all);
           return limitCount ? filtered.slice(0, limitCount) : filtered;
        }
      } catch (e) {}
    }

    if (quotaExceeded && !canMakeRequest()) {
      const all = cachedStr ? JSON.parse(cachedStr) as Booking[] : [];
      const filtered = this.filterBookingsByScope(all);
      return filtered.slice(0, limitCount || 1000);
    }

    try {
      await this.ensureAuth();
      let q = query(collection(db, path));
      
      const userStr = localStorage.getItem('user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      if (companyId && userObj?.role !== 'admin') {
        q = query(q, where("companyId", "==", companyId));
      }
      
      const querySnapshot = await getDocs(q);
      let bookings = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          name: String(data.name || ''),
          phone: String(data.phone || ''),
          contactName: String(data.contactName || ''),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as Booking;
      });

      // Sort bookings by createdAt descending in memory (Index-free, safe, and robust)
      bookings.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      // Fetch trips to resolve robust trip IDs during deduplication
      let trips: Trip[] = [];
      try {
        const tripsSnapshot = await getDocs(collection(db, 'trips'));
        trips = tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Trip));
      } catch (tripsError) {
        console.warn('Could not fetch trips for deduplication:', tripsError);
      }

      bookings = deduplicateBookings(bookings, trips);

      if (!limitCount) {
        // Strip heavy passportImage from cached_bookings to prevent exceeding LocalStorage quota
        const lightweightBookings = bookings.map(b => ({
          ...b,
          pilgrims: (b.pilgrims || []).map(p => {
            if (p && 'passportImage' in p) {
              const { passportImage, ...rest } = p;
              return rest;
            }
            return p;
          })
        }));
        safeLocalStorageSetItem('cached_bookings', JSON.stringify(lightweightBookings));
        safeLocalStorageSetItem('last_bookings_fetch', Date.now().toString());
      }

      if (limitCount) {
        bookings = bookings.slice(0, limitCount);
      }

      return this.filterBookingsByScope(bookings);
    } catch (error: any) {
      if (isQuotaError(error)) {
        quotaExceeded = true;
        if (cachedStr) {
          const all = JSON.parse(cachedStr) as Booking[];
          const filtered = this.filterBookingsByScope(all);
          return filtered.slice(0, limitCount || 1000);
        }
      }
      handleFirestoreError(error, OperationType.LIST, path);
      if (cachedStr) {
        const all = JSON.parse(cachedStr) as Booking[];
        return this.filterBookingsByScope(all);
      }
      return [];
    }
  },
  async getBookingById(id: string): Promise<Booking | null> {
    const path = 'bookings';
    try {
      if (quotaExceeded) {
        const cached = localStorage.getItem('cached_bookings');
        if (cached) {
          const all = JSON.parse(cached) as Booking[];
          return all.find(b => b.id === id) || null;
        }
      }

      await this.ensureAuth();
      const docRef = doc(db, path, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as Booking;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },
  async checkDuplicateRegId(regId: string, excludeId?: string, tripId?: string): Promise<boolean> {
    const path = 'bookings';
    try {
      await this.ensureAuth();
      const q = query(collection(db, path), where("regId", "==", regId));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return false;
      
      let docs = snapshot.docs;
      if (excludeId) {
        docs = docs.filter(doc => doc.id !== excludeId);
      }
      
      if (docs.length === 0) return false;
      if (!tripId) {
        return true;
      }

      // If tripId is provided, check if the booking's trip matches the targeted trip in-memory (index-free)
      const tripsSnapshot = await getDocs(collection(db, 'trips'));
      const trips = tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Trip));
      const targetTrip = trips.find(t => t.id === tripId);
      if (!targetTrip) return false;

      return docs.some(doc => {
        const b = doc.data();
        const bTrip = trips.find(t => t.id === b.tripId || t.name === b.tripId || t.name === (b as any).tripName);
        return bTrip && bTrip.id === targetTrip.id;
      });
    } catch (error) {
      console.error('Error checking duplicate regId:', error);
      return false;
    }
  },
  async saveBooking(booking: Booking): Promise<void> {
    const path = 'bookings';
    const { id, ...data } = booking;
    const companyId = this.getCompanyId();
    
    const cleanData = cleanUndefined(data);

    try {
      await this.ensureAuth();
      if (id && id !== 'new') {
        const docRef = doc(db, path, id);
        // Only get doc if we actually NEED to check the trip change, otherwise just update
        let oldTripId: string | undefined;
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
             oldTripId = (docSnap.data() as Booking).tripId;
             await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
          } else {
             await setDoc(docRef, { ...cleanData, companyId, createdAt: serverTimestamp() });
          }
        } catch (e) {
          // If getDoc fails, just try setDoc
          await setDoc(docRef, { ...cleanData, companyId, updatedAt: serverTimestamp() }, { merge: true });
        }
        
        if (booking.tripId) await this.syncTripSeats(booking.tripId);
        if (oldTripId && oldTripId !== booking.tripId) await this.syncTripSeats(oldTripId);
      } else {
        await addDoc(collection(db, path), { ...cleanData, companyId, createdAt: serverTimestamp() });
        if (booking.tripId) await this.syncTripSeats(booking.tripId);
      }
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },
  async deleteBooking(id: string): Promise<void> {
    const path = 'bookings';
    try {
      await this.ensureAuth();
      const bookingRef = doc(db, path, id);
      const bookingSnap = await getDocFromServer(bookingRef);
      const bookingData = bookingSnap.exists() ? bookingSnap.data() as Booking : null;
      
      await deleteDoc(bookingRef);
      
      if (bookingData?.tripId) {
        await this.syncTripSeats(bookingData.tripId);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async syncTripSeats(tripId: string): Promise<void> {
    if (quotaExceeded && !canMakeRequest()) return;
    try {
      await this.ensureAuth();
      
      const tripsSnapshot = await getDocs(collection(db, 'trips'));
      const trips = tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Trip));
      const targetTrip = trips.find(t => t.id === tripId);
      if (!targetTrip) {
        console.warn(`Trip with ID ${tripId} not found during seat sync.`);
        return;
      }

      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      let bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Booking));
      
      bookings = deduplicateBookings(bookings, trips);

      const tripBookings = bookings.filter(b => {
        const resolved = findTripRobust(trips, b.tripId || (b as any).tripid || (b as any).trip_id || (b as any).tripName, b);
        return resolved && resolved.id === targetTrip.id;
      });
      
      let totalSeatsDeducted = 0;
      tripBookings.forEach(b => {
        const pilgrims = (b.pilgrims || []) as Pilgrim[];
        if (pilgrims.length > 0) {
          const ticketPilgrims = pilgrims.filter(p => {
            const type = p.serviceType || 'Full';
            return type === 'Full' || type === 'TicketOnly' || type === 'TicketAndAccommodation' || type === 'TicketAndVisa';
          });
          totalSeatsDeducted += ticketPilgrims.length;
        } else {
          totalSeatsDeducted += (b.passengerCount || 0);
        }
      });
      
      const availableSeats = Math.max(0, targetTrip.totalSeats - totalSeatsDeducted);
      
      await updateDoc(doc(db, 'trips', targetTrip.id), { 
        availableSeats,
        updatedAt: serverTimestamp()
      });
      
      console.log(`Synced trip ${targetTrip.name}: ${totalSeatsDeducted} tickets, ${availableSeats} available seats`);
    } catch (error) {
      console.error(`Error syncing trip seats for ${tripId}:`, error);
    }
  },
  async syncAllTripsSeats(): Promise<void> {
    if (quotaExceeded && !canMakeRequest()) return;
    try {
      await this.ensureAuth();
      const tripsSnapshot = await getDocs(collection(db, 'trips'));
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      
      const trips = tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Trip));
      let bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Booking));
      
      bookings = deduplicateBookings(bookings, trips);
      
      for (const trip of trips) {
        const tripBookings = bookings.filter(b => {
          const resolved = findTripRobust(trips, b.tripId || (b as any).tripid || (b as any).trip_id || (b as any).tripName, b);
          return resolved && resolved.id === trip.id;
        });
        
        let totalSeatsDeducted = 0;
        tripBookings.forEach(b => {
          const pilgrims = (b.pilgrims || []) as Pilgrim[];
          if (pilgrims.length > 0) {
            const ticketPilgrims = pilgrims.filter(p => {
              const type = p.serviceType || 'Full';
              return type === 'Full' || type === 'TicketOnly' || type === 'TicketAndAccommodation' || type === 'TicketAndVisa';
            });
            totalSeatsDeducted += ticketPilgrims.length;
          } else {
            totalSeatsDeducted += (b.passengerCount || 0);
          }
        });

        const availableSeats = Math.max(0, trip.totalSeats - totalSeatsDeducted);
        
        if (trip.availableSeats !== availableSeats) {
          await updateDoc(doc(db, 'trips', trip.id), { 
            availableSeats,
            updatedAt: serverTimestamp()
          });
          console.log(`Updated trip ${trip.name}: ${availableSeats} seats available`);
        }
      }
    } catch (error) {
      console.error('Error syncing all trips seats:', error);
    }
  },
  async bulkSaveBookings(bookings: Partial<Booking>[]): Promise<void> {
    const path = 'bookings';
    try {
      await this.ensureAuth();
      const chunkSize = 500;
      for (let i = 0; i < bookings.length; i += chunkSize) {
        const chunk = bookings.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(booking => {
          const { id, ...data } = booking;
          const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== undefined)
          );
          if (id && id !== 'new') {
            batch.update(doc(db, path, id), { ...cleanData, updatedAt: serverTimestamp() });
          } else {
            batch.set(doc(collection(db, path)), { ...cleanData, createdAt: serverTimestamp() });
          }
        });
        await batch.commit();
      }
      // Automatically sync all trip bookings and seats to keep reports/counters pristine
      await this.syncAllTripsSeats();
    } catch (error) {
      console.error('Error in bulkSaveBookings:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Permissions
  async getPermissions(): Promise<RolePermissions[]> {
    const path = 'permissions';
    try {
      // If quota exceeded, return cache immediately
      if (quotaExceeded) {
        const cached = localStorage.getItem('cached_permissions');
        if (cached) return JSON.parse(cached);
      }

      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      const perms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as RolePermissions));
      
      // Cache permissions
      safeLocalStorageSetItem('cached_permissions', JSON.stringify(perms));
      return perms;
    } catch (error: any) {
      // Return cached permissions if quota exceeded
      if (isQuotaError(error)) {
        quotaExceeded = true;
        try {
          const cacheSnapshot = await getDocsFromCache(collection(db, path));
          if (!cacheSnapshot.empty) {
            return cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as RolePermissions));
          }
        } catch (cacheError) {
          // console.warn('Cache fetch failed:', cacheError);
        }
        const cached = localStorage.getItem('cached_permissions');
        if (cached) return JSON.parse(cached);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      return [];
    }
  },
  async savePermission(permission: RolePermissions): Promise<void> {
    const path = 'permissions';
    const { id, ...data } = permission as any;
    
    // Remove undefined fields to avoid Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    try {
      await this.ensureAuth();
      if (id && id !== 'new') {
        const docRef = doc(db, path, id);
        const docSnap = await getDocFromServer(docRef);
        if (docSnap.exists()) {
          await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
        } else {
          await setDoc(docRef, { ...cleanData, createdAt: serverTimestamp() });
        }
      } else {
        await addDoc(collection(db, path), { ...cleanData, createdAt: serverTimestamp() });
      }
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },
  async deletePermission(id: string): Promise<void> {
    const path = 'permissions';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Users
  async getUsers(): Promise<User[]> {
    const path = 'users';
    const companyId = this.getCompanyId();
    
    const cachedStr = localStorage.getItem('cached_users');
    if (cachedStr) {
      try {
        const lastFetch = Number(localStorage.getItem('last_users_fetch') || 0);
        const cacheTTL = (quotaExceeded && !canMakeRequest()) ? 900000 : 300000;
        if (Date.now() - lastFetch < cacheTTL || (quotaExceeded && !canMakeRequest())) {
          return JSON.parse(cachedStr);
        }
      } catch (e) {}
    }

    if (quotaExceeded && !canMakeRequest()) {
      return cachedStr ? JSON.parse(cachedStr) : [];
    }

    try {
      await this.ensureAuth();
      let q = query(collection(db, path));
      
      const userStr = localStorage.getItem('user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      if (companyId && userObj?.role !== 'admin') {
        q = query(q, where("companyId", "==", companyId));
      }
      
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => mapDocData<User>(doc));
      
      safeLocalStorageSetItem('cached_users', JSON.stringify(users));
      safeLocalStorageSetItem('last_users_fetch', Date.now().toString());
      return users;
    } catch (error: any) {
      if (isQuotaError(error)) {
        quotaExceeded = true;
        lastQuotaErrorTime = Date.now();
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return cachedStr ? JSON.parse(cachedStr) : [];
    }
  },
  async saveUser(user: Partial<User> & { password?: string }): Promise<void> {
    const path = 'users';
    const { id, ...data } = user;
    const companyId = this.getCompanyId();
    
    const cleanData = cleanUndefined(data);

    try {
      await this.ensureAuth();
      if (id && id !== 'new') {
        const docRef = doc(db, path, id);
        let docSnap;
        try {
          docSnap = await getDocFromServer(docRef);
        } catch (e) {
          // Ignore error and try to check or fallback
        }
        if (docSnap && docSnap.exists()) {
          await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
        } else {
          await setDoc(docRef, { ...cleanData, companyId, createdAt: serverTimestamp() });
        }
      } else {
        await addDoc(collection(db, path), { ...cleanData, companyId, createdAt: serverTimestamp() });
      }
      try {
        localStorage.removeItem('cached_users');
        localStorage.removeItem('last_users_fetch');
      } catch (e) {}
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },
  async deleteUser(id: string): Promise<void> {
    const path = 'users';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
      try {
        localStorage.removeItem('cached_users');
        localStorage.removeItem('last_users_fetch');
      } catch (e) {}
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Settings
  async getSettings(): Promise<Record<string, string>> {
    const path = 'settings';
    
    // Always check cache first
    const cached = localStorage.getItem('cached_settings');
    const lastFetch = Number(localStorage.getItem('last_settings_fetch') || 0);
    const isQuotaReady = !quotaExceeded || canMakeRequest();
    const isFresh = Date.now() - lastFetch < (isQuotaReady ? 600000 : 3600000); // 10 mins vs 1 hour

    if (cached && (isFresh || !isQuotaReady)) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    if (!isQuotaReady) return cached ? JSON.parse(cached) : {};

    try {
      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      const settings: Record<string, string> = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.key) settings[data.key] = data.value;
      });
      
      safeLocalStorageSetItem('cached_settings', JSON.stringify(settings));
      safeLocalStorageSetItem('last_settings_fetch', Date.now().toString());
      return settings;
    } catch (error: any) {
      if (isQuotaError(error)) {
        quotaExceeded = true;
        lastQuotaErrorTime = Date.now();
        if (cached) return JSON.parse(cached);
      }
      console.warn('Settings fetch failed, falling back to cache:', error.message);
      if (cached) return JSON.parse(cached);
      return {};
    }
  },
  async saveSettings(settings: Record<string, string>): Promise<void> {
    const path = 'settings';
    try {
      await this.ensureAuth();
      for (const [key, value] of Object.entries(settings)) {
        // Find if setting exists
        const q = query(collection(db, path), where("key", "==", key));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await updateDoc(doc(db, path, snapshot.docs[0].id), { value });
        } else {
          await addDoc(collection(db, path), { key, value });
        }
      }

      // Update local storage cache immediately so changes reflect everywhere instantly
      const cached = localStorage.getItem('cached_settings');
      let currentCached: Record<string, string> = {};
      if (cached) {
        try {
          currentCached = JSON.parse(cached);
        } catch (e) {}
      }
      const updatedCached = { ...currentCached, ...settings };
      safeLocalStorageSetItem('cached_settings', JSON.stringify(updatedCached));
      safeLocalStorageSetItem('last_settings_fetch', Date.now().toString());
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const path = 'users';
    try {
      await this.ensureAuth();
      const userRef = doc(db, path, userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error('المستخدم غير موجود');
      
      const userData = userSnap.data();
      if (userData.password !== currentPassword) throw new Error('كلمة المرور الحالية غير صحيحة');
      
      await updateDoc(userRef, { password: newPassword });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getDbStats(): Promise<any> {
    const collections = ['users', 'trips', 'bookings', 'pilgrims', 'logs'];
    
    // Helper to count items in cache for a collection
    const getCacheCount = (colName: string): number => {
      try {
        const cached = localStorage.getItem(`cached_${colName}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          return Array.isArray(parsed) ? parsed.length : 0;
        }
      } catch (_) {}
      return 0;
    };

    try {
      const stats: any = {
        dbType: 'Cloud (Firestore)',
        health: quotaExceeded ? 'Limited (Quota Exceeded - Using Cache)' : 'Excellent',
        uptime: '99.9%'
      };

      if (quotaExceeded) {
        let totalDocs = 0;
        collections.forEach(col => {
          const count = getCacheCount(col);
          stats[col] = count;
          totalDocs += count;
        });
        stats.totalDocs = totalDocs;
        stats.dbSize = totalDocs * 500; // estimated 500 bytes per document
        return stats;
      }

      await this.ensureAuth();
      
      const results = await Promise.all(collections.map(async (col) => {
        try {
          // Try server first
          const snap = await getDocs(collection(db, col));
          return { name: col, size: snap.size, cached: false };
        } catch (e: any) {
          const errorMsg = (e.message || String(e)).toLowerCase();
          
          if (errorMsg.includes('quota') || errorMsg.includes('resource-exhausted') || errorMsg.includes('limitation')) {
            const count = getCacheCount(col);
            return { name: col, size: count, cached: true };
          }
          
          // Handle permission denied gracefully
          if (errorMsg.includes('permissions') || errorMsg.includes('permission-denied') || errorMsg.includes('insufficient')) {
            return { name: col, size: 0, restricted: true };
          }

          // Any other error (e.g. offline), fallback to cached count gracefully
          const count = getCacheCount(col);
          return { name: col, size: count, cached: true };
        }
      }));

      let anyCached = false;
      results.forEach(res => {
        stats[res.name] = res.size;
        if (res.cached) {
          anyCached = true;
          stats[res.name] = `${res.size} (مؤقت)`;
        }
        if (res.restricted) stats[res.name] = 'Restricted';
      });

      if (anyCached) {
        stats.health = 'Limited (Quota Exceeded - Using Cache)';
      }

      const totalDocs = results.reduce((acc, res) => acc + (typeof res.size === 'number' ? res.size : 0), 0);
      stats.totalDocs = totalDocs;
      stats.dbSize = totalDocs * 500;

      return stats;
    } catch (error: any) {
      console.error('Error getting DB stats in try-catch:', error);
      
      const stats: any = {
        dbType: 'Cloud (Firestore)',
        health: 'Limited (Offline/Cache)',
        uptime: '---',
        totalDocs: 0,
        dbSize: 0
      };
      
      let totalDocs = 0;
      collections.forEach(col => {
        const count = getCacheCount(col);
        stats[col] = count;
        totalDocs += count;
      });
      stats.totalDocs = totalDocs;
      stats.dbSize = totalDocs * 500;
      
      return stats;
    }
  },

  async exportDatabase(): Promise<void> {
    try {
      await this.ensureAuth();
      const collections = [
        'users', 'trips', 'bookings', 'pilgrims', 'permissions', 
        'settings', 'logs', 'customers', 'umrahOffers', 
        'hotels', 'hotelRooms', 'umrah_pricing'
      ];
      const backupData: Record<string, any[]> = {};

      for (const collName of collections) {
        const snapshot = await getDocs(collection(db, collName));
        backupData[collName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dar-al-maqam-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'all_collections');
    }
  },

  async importDatabase(backupData: Record<string, any[]>): Promise<void> {
    try {
      await this.ensureAuth();
      
      for (const [collName, docs] of Object.entries(backupData)) {
        console.log(`Importing collection: ${collName} (${docs.length} documents)`);
        
        // Firestore batches can handle up to 500 operations
        const chunkSize = 400;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          
          chunk.forEach(docData => {
            const { id, ...data } = docData;
            if (id) {
              const docRef = doc(db, collName, id);
              batch.set(docRef, data);
            }
          });
          
          await batch.commit();
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'import_database');
      throw error;
    }
  },

  async logAction(userId: string, userName: string, action: string, details?: string): Promise<void> {
    const path = 'logs';
    const companyId = this.getCompanyId();
    try {
      await this.ensureAuth();
      await addDoc(collection(db, path), {
        userId,
        userName,
        action,
        details,
        companyId,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  },

  async getLogs(limitCount: number = 100): Promise<AuditLog[]> {
    const path = 'logs';
    const companyId = this.getCompanyId();
    try {
      await this.ensureAuth();
      let q = query(collection(db, path));
      if (companyId) {
        q = query(q, where("companyId", "==", companyId));
      }
      const querySnapshot = await getDocs(q);
      let logs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
        } as unknown as AuditLog;
      });

      // Sort logs by timestamp descending in memory (Index-free and robust)
      logs.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      return logs.slice(0, limitCount);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

   async getPilgrims(bookingId?: string): Promise<Pilgrim[]> {
    const path = 'pilgrims';
    let pilgrims: Pilgrim[] = [];
    let loaded = false;
    
    // Proactively check quota
    const cachedStr = localStorage.getItem('cached_pilgrims');
    const lastFetch = Number(localStorage.getItem('last_pilgrims_fetch') || 0);
    const cacheTTL = (quotaExceeded && !canMakeRequest()) ? 900000 : 180000; // 15 mins vs 3 mins

    if (cachedStr && !bookingId && (Date.now() - lastFetch < cacheTTL || (quotaExceeded && !canMakeRequest()))) {
      try {
        pilgrims = JSON.parse(cachedStr);
        loaded = true;
      } catch (e) {}
    }

    if (!loaded && quotaExceeded && !canMakeRequest()) {
      if (cachedStr) {
        try {
          pilgrims = JSON.parse(cachedStr) as Pilgrim[];
          loaded = true;
        } catch (e) {}
      }
    }

    if (!loaded) {
      try {
        await this.ensureAuth();
        let q = query(collection(db, path));
        if (bookingId) {
          q = query(collection(db, path), where("bookingId", "==", bookingId));
        }
        const querySnapshot = await getDocs(q);
        pilgrims = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: String(data.name || ''),
            phone: String(data.phone || ''),
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
          } as unknown as Pilgrim;
        });

        if (!bookingId) {
          // Strip heavy passportImage from cached_pilgrims to prevent exceeding LocalStorage quota
          const lightweightPilgrims = pilgrims.map(({ passportImage, ...rest }) => rest);
          safeLocalStorageSetItem('cached_pilgrims', JSON.stringify(lightweightPilgrims));
          safeLocalStorageSetItem('last_pilgrims_fetch', Date.now().toString());
        }
        loaded = true;
      } catch (error: any) {
        if (isQuotaError(error)) {
          quotaExceeded = true;
          lastError = error.message || String(error);
          console.warn('Quota exceeded in getPilgrims, switching to cache');
        } else {
          console.error('Error in getPilgrims:', error);
        }
        
        if (cachedStr) {
          try {
            pilgrims = JSON.parse(cachedStr) as Pilgrim[];
            loaded = true;
          } catch (e) {}
        }
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    // Filter by bookingId if provided (for when we obtained full cache list)
    if (bookingId) {
      pilgrims = pilgrims.filter(p => p.bookingId === bookingId);
    }

    // Filter by role dataScope 'own'
    if (this.getDataScope() === 'own') {
      try {
        const allowedBookings = await this.getBookings();
        const allowedIds = new Set(allowedBookings.map(b => b.id));
        pilgrims = pilgrims.filter(p => allowedIds.has(p.bookingId));
      } catch (e) {
        console.error('Error filtering pilgrims by allowed bookings:', e);
      }
    }

    return pilgrims;
  },

  async getNotifications(userId?: string): Promise<Notification[]> {
    const path = 'notifications';
    try {
      if (quotaExceeded) {
        const cached = localStorage.getItem('cached_notifications');
        if (cached) {
          const all = JSON.parse(cached) as Notification[];
          return userId ? all.filter(n => n.userId === userId) : all;
        }
      }

      await this.ensureAuth();
      let q = query(collection(db, path));
      if (userId) {
        q = query(collection(db, path), where("userId", "==", userId));
      }
      const querySnapshot = await getDocs(q);
      const notifications = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        } as unknown as Notification;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (!userId) {
        safeLocalStorageSetItem('cached_notifications', JSON.stringify(notifications));
      }
      return notifications;
    } catch (error: any) {
      if (isQuotaError(error)) {
        quotaExceeded = true;
        const cached = localStorage.getItem('cached_notifications');
        if (cached) {
          const all = JSON.parse(cached) as Notification[];
          return userId ? all.filter(n => n.userId === userId) : all;
        }
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addNotification(notification: Partial<Notification>): Promise<void> {
    const path = 'notifications';
    
    // Remove undefined fields to avoid Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(notification).filter(([_, v]) => v !== undefined)
    );

    try {
      await this.ensureAuth();
      const companyId = this.getCompanyId();
      await addDoc(collection(db, path), {
        ...cleanData,
        companyId,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  },

  async markNotificationAsRead(id: string): Promise<void> {
    const path = 'notifications';
    try {
      await this.ensureAuth();
      await updateDoc(doc(db, path, id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },
  async bulkAddNotifications(notifications: Partial<Notification>[]): Promise<void> {
    const path = 'notifications';
    try {
      await this.ensureAuth();
      const chunkSize = 500;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        const chunk = notifications.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(notification => {
          const cleanData = Object.fromEntries(
            Object.entries(notification).filter(([_, v]) => v !== undefined)
          );
          batch.set(doc(collection(db, path)), {
            ...cleanData,
            read: false,
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  async bulkMarkNotificationsAsRead(ids: string[]): Promise<void> {
    const path = 'notifications';
    try {
      await this.ensureAuth();
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.update(doc(db, path, id), { read: true });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error('Error in bulkMarkNotificationsAsRead:', error);
    }
  },
  
  // Umrah Offers
  async getUmrahOffers(): Promise<UmrahOffer[]> {
    const path = 'umrahOffers';
    const companyId = this.getCompanyId();
    
    const cachedStr = localStorage.getItem('cached_umrah_offers');
    if (cachedStr) {
      try {
        const lastFetch = Number(localStorage.getItem('last_offers_fetch') || 0);
        const cacheTTL = (quotaExceeded && !canMakeRequest()) ? 1200000 : 300000; // 20 mins vs 5 mins
        if (Date.now() - lastFetch < cacheTTL || (quotaExceeded && !canMakeRequest())) {
          return JSON.parse(cachedStr);
        }
      } catch (e) {}
    }

    if (quotaExceeded && !canMakeRequest()) {
      return cachedStr ? JSON.parse(cachedStr) : [];
    }

    try {
      await this.ensureAuth();
      let q = query(collection(db, path));
      
      const userStr = localStorage.getItem('user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      if (companyId && userObj?.role !== 'admin') {
        q = query(q, where("companyId", "==", companyId));
      }
      
      const querySnapshot = await getDocs(q);
      const offers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          rows: Array.isArray(data.rows) ? data.rows : [],
          name: String(data.name || ''),
          category: String(data.category || 'الاقتصادي'),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as UmrahOffer;
      });

      safeLocalStorageSetItem('cached_umrah_offers', JSON.stringify(offers));
      return offers;
    } catch (error: any) {
      if (isQuotaError(error)) {
        quotaExceeded = true;
        lastError = error.message || String(error);
        console.warn('Quota exceeded in getUmrahOffers, switching to cache');
      } else {
        console.error('Error in getUmrahOffers:', error);
      }
      
      const cached = localStorage.getItem('cached_umrah_offers');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Error parsing cached offers:', e);
        }
      }
      
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {}
      return [];
    }
  },
  async getUmrahOfferById(id: string): Promise<UmrahOffer | null> {
    const path = 'umrahOffers';
    try {
      if (quotaExceeded) {
        const cached = localStorage.getItem('cached_umrah_offers');
        if (cached) {
          const all = JSON.parse(cached) as UmrahOffer[];
          return all.find(o => o.id === id) || null;
        }
      }

      await this.ensureAuth();
      const docRef = doc(db, path, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as UmrahOffer;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },
  async getTripById(id: string): Promise<Trip | null> {
    const path = 'trips';
    try {
      if (quotaExceeded) {
        const cached = localStorage.getItem('cached_trips');
        if (cached) {
          const all = JSON.parse(cached) as Trip[];
          return all.find(t => t.id === id) || null;
        }
      }

      await this.ensureAuth();
      const docRef = doc(db, path, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as Trip;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },
  async saveUmrahOffer(offer: UmrahOffer): Promise<string> {
    const path = 'umrahOffers';
    const { id, ...data } = offer;
    const companyId = this.getCompanyId();
    
    // Remove undefined fields to avoid Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    try {
      await this.ensureAuth();
      if (id && id !== 'new') {
        const docRef = doc(db, path, id);
        const docSnap = await getDocFromServer(docRef);
        if (docSnap.exists()) {
          await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
          return id;
        } else {
          await setDoc(docRef, { ...cleanData, companyId, createdAt: serverTimestamp() });
          return id;
        }
      } else {
        const docRef = await addDoc(collection(db, path), { ...cleanData, companyId, createdAt: serverTimestamp() });
        return docRef.id;
      }
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
      throw error;
    }
  },
  async deleteUmrahOffer(id: string): Promise<void> {
    const path = 'umrahOffers';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async updateOffer(id: string, offer: UmrahOffer): Promise<void> {
    await this.saveUmrahOffer({ ...offer, id });
  },
  async deleteOffer(id: string): Promise<void> {
    await this.deleteUmrahOffer(id);
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const path = 'customers';
    const companyId = this.getCompanyId();
    
    const cachedStr = localStorage.getItem('cached_customers');
    if (cachedStr) {
      try {
        const lastFetch = Number(localStorage.getItem('last_customers_fetch') || 0);
        const cacheTTL = (quotaExceeded && !canMakeRequest()) ? 1800000 : 300000; // 30 mins vs 5 mins
        if (Date.now() - lastFetch < cacheTTL || (quotaExceeded && !canMakeRequest())) {
          return JSON.parse(cachedStr);
        }
      } catch (e) {}
    }

    if (quotaExceeded && !canMakeRequest()) {
      return cachedStr ? JSON.parse(cachedStr) : [];
    }

    try {
      await this.ensureAuth();
      const q = query(collection(db, path));
      const querySnapshot = await getDocs(q);
      let customers = querySnapshot.docs.map(doc => mapDocData<Customer>(doc));

      const userStr = localStorage.getItem('user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      if (companyId && userObj?.role !== 'admin') {
        customers = customers.filter(c => c.companyId === companyId || !c.companyId);
      }

      safeLocalStorageSetItem('cached_customers', JSON.stringify(customers));
      localStorage.setItem('last_customers_fetch', Date.now().toString());
      return customers;
    } catch (error: any) {
      if (isQuotaError(error)) {
        quotaExceeded = true;
        lastError = error.message || String(error);
        console.warn('Quota exceeded in getCustomers, switching to cache');
      } else {
        console.error('Error in getCustomers:', error);
      }
      
      const cached = localStorage.getItem('cached_customers');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Error parsing cached customers:', e);
        }
      }

      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {}
      return [];
    }
  },
  async saveCustomer(customer: Partial<Customer>): Promise<void> {
    const path = 'customers';
    const { id, createdAt, updatedAt, ...data } = customer;
    const companyId = this.getCompanyId();
    
    const cleanData = cleanUndefined(data);
    if (!cleanData.companyId && companyId) cleanData.companyId = companyId;

    try {
      await this.ensureAuth();
      if (id && id !== 'new') {
        const docRef = doc(db, path, id);
        const docSnap = await getDocFromServer(docRef);
        if (docSnap.exists()) {
          await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
        } else {
          await setDoc(docRef, { ...cleanData, createdAt: serverTimestamp() });
        }
      } else {
        // Check if customer with this phone already exists
        const q = query(collection(db, path), where("phone", "==", data.phone));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const existingId = snapshot.docs[0].id;
          await updateDoc(doc(db, path, existingId), { ...cleanData, updatedAt: serverTimestamp() });
        } else {
          await addDoc(collection(db, path), { ...cleanData, createdAt: serverTimestamp() });
        }
      }
      try {
        localStorage.removeItem('cached_customers');
        localStorage.removeItem('last_customers_fetch');
      } catch (e) {}
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },
  async deleteCustomer(id: string): Promise<void> {
    const path = 'customers';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
      try {
        localStorage.removeItem('cached_customers');
        localStorage.removeItem('last_customers_fetch');
      } catch (e) {}
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async bulkDeleteCustomers(ids: string[]): Promise<void> {
    const path = 'customers';
    try {
      await this.ensureAuth();
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, path, id));
        });
        await this.withRetry(() => batch.commit());
      }
      try {
        localStorage.removeItem('cached_customers');
        localStorage.removeItem('last_customers_fetch');
      } catch (e) {}
    } catch (error) {
      console.error('Error in bulkDeleteCustomers:', error);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async bulkSaveCustomers(customers: Partial<Customer>[], existingMap?: Map<string, string>): Promise<void> {
    const path = 'customers';
    const companyId = this.getCompanyId();
    try {
      await this.ensureAuth();
      
      let existingCustomersMap = existingMap;
      
      // 1. Get existing customers only if not provided
      if (!existingCustomersMap) {
        const querySnapshot = await getDocs(collection(db, path));
        existingCustomersMap = new Map<string, string>();
        querySnapshot.docs.forEach(doc => {
          const phone = doc.data().phone;
          if (phone) existingCustomersMap!.set(phone, doc.id);
        });
      }

      // 2. Process in batches of 500
      const chunkSize = 500;
      for (let i = 0; i < customers.length; i += chunkSize) {
        const chunk = customers.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach(customer => {
          const { id, createdAt, updatedAt, ...data } = customer;
          if (!data.phone) return; // Skip if no phone

          const cleanData = cleanUndefined(data);
          if (!cleanData.companyId && companyId) cleanData.companyId = companyId;

          const existingId = existingCustomersMap!.get(data.phone);
          if (existingId) {
            batch.update(doc(db, path, existingId), { ...cleanData, updatedAt: serverTimestamp() });
          } else {
            const newDocRef = doc(collection(db, path));
            batch.set(newDocRef, { ...cleanData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          }
        });

        await this.withRetry(() => batch.commit());
      }
      try {
        localStorage.removeItem('cached_customers');
        localStorage.removeItem('last_customers_fetch');
      } catch (e) {}
    } catch (error) {
      console.error('Error in bulkSaveCustomers:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Image Hosting
  async uploadImage(base64Data: string, fileName: string): Promise<string> {
    const path = 'hosted_images';
    try {
      // Check data size (Firestore limit is 1MB per document)
      // 1MB is 1,048,576 bytes. Base64 is ~1.33x original size.
      // 750KB original -> ~1,000,000 characters.
      if (base64Data.length > 1048000) {
        throw new Error('حجم الصورة كبير جداً (أكثر من 1 ميجابايت بعد التشفير). يرجى ضغط الصورة قبل الرفع.');
      }

      await this.ensureAuth();
      const docRef = await addDoc(collection(db, path), {
        data: base64Data,
        name: fileName,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async getHostedImage(id: string): Promise<{ data: string, name: string } | null> {
    const path = 'hosted_images';
    try {
      await this.ensureAuth();
      const docSnap = await getDoc(doc(db, path, id));
      if (docSnap.exists()) {
        return docSnap.data() as { data: string, name: string };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async syncCustomersFromBookings(): Promise<Customer[]> {
    const path = 'customers';
    try {
      await this.ensureAuth();
      
      // 1. Get all bookings, pilgrims, and existing customers using resilient methods
      const [bookings, pilgrims, customers] = await Promise.all([
        this.getBookings(),
        this.getPilgrims(),
        this.getCustomers()
      ]);

      const existingPhones = new Set(customers.map(d => d.phone));
      const newContacts: Map<string, { name: string, phone: string, lastDate: string }> = new Map();

      // Process bookings
      bookings.forEach(data => {
        if (data.phone && !existingPhones.has(data.phone)) {
          newContacts.set(data.phone, {
            name: data.contactName || data.name || 'عميل من الحجوزات',
            phone: data.phone,
            lastDate: data.createdAt || new Date().toISOString()
          });
        }
      });

      // Process pilgrims
      pilgrims.forEach(data => {
        if (data.phone && !existingPhones.has(data.phone) && !newContacts.has(data.phone)) {
          newContacts.set(data.phone, {
            name: data.name || 'معتمر من الحجوزات',
            phone: data.phone,
            lastDate: data.createdAt || new Date().toISOString()
          });
        }
      });

      // 2. Add new contacts to customers collection in batches
      const contactsArray = Array.from(newContacts.values());
      const chunkSize = 500;
      
      for (let i = 0; i < contactsArray.length; i += chunkSize) {
        const chunk = contactsArray.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        const companyId = this.getCompanyId();
        
        chunk.forEach(contact => {
          const newDocRef = doc(collection(db, path));
          batch.set(newDocRef, {
            name: contact.name,
            phone: contact.phone,
            email: '',
            totalBookings: 1,
            lastBookingDate: contact.lastDate,
            hasWhatsApp: false,
            companyId,
            createdAt: serverTimestamp()
          });
        });
        
        await batch.commit();
      }

      try {
        localStorage.removeItem('cached_customers');
        localStorage.removeItem('last_customers_fetch');
      } catch (e) {}

      // 3. Return updated customers list
      return this.getCustomers();
    } catch (error) {
      console.error('Error syncing customers:', error);
      handleFirestoreError(error, OperationType.WRITE, 'customers');
      return [];
    }
  },
  // Hotels
  async getHotels(): Promise<Hotel[]> {
    const path = 'hotels';
    const companyId = this.getCompanyId();
    
    const cachedStr = localStorage.getItem('cached_hotels');
    if (cachedStr) {
      try {
        const lastFetch = Number(localStorage.getItem('last_hotels_fetch') || 0);
        const cacheTTL = (quotaExceeded && !canMakeRequest()) ? 3600000 : 600000; // 1 hour vs 10 mins
        if (Date.now() - lastFetch < cacheTTL || (quotaExceeded && !canMakeRequest())) {
          return JSON.parse(cachedStr);
        }
      } catch (e) {}
    }

    if (quotaExceeded && !canMakeRequest()) {
      return cachedStr ? JSON.parse(cachedStr) : [];
    }

    try {
      await this.ensureAuth();
      let q = query(collection(db, path));
      
      const userStr = localStorage.getItem('user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      if (companyId && userObj?.role !== 'admin') {
        q = query(q, where('companyId', '==', companyId));
      }
      
      const querySnapshot = await this.withRetry(() => getDocs(q));
      const hotels = querySnapshot.docs.map(doc => mapDocData<Hotel>(doc));
      
      // Sort hotels by createdAt descending in memory (Index-free and robust)
      hotels.sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      
      safeLocalStorageSetItem('cached_hotels', JSON.stringify(hotels));
      safeLocalStorageSetItem('last_hotels_fetch', Date.now().toString());
      return hotels;
    } catch (error: any) {
      if (isQuotaError(error)) {
        quotaExceeded = true;
        lastQuotaErrorTime = Date.now();
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return cachedStr ? JSON.parse(cachedStr) : [];
    }
  },
  async saveHotel(hotel: Partial<Hotel>): Promise<string> {
    const path = 'hotels';
    const companyId = this.getCompanyId();
    try {
      await this.ensureAuth();
      const { id, ...data } = hotel;
      
      const cleanData = cleanUndefined(data);

      if (id) {
        await updateDoc(doc(db, path, id), { ...cleanData, updatedAt: serverTimestamp() });
        return id;
      } else {
        const docRef = await addDoc(collection(db, path), { 
          ...cleanData, 
          companyId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp() 
        });
        return docRef.id;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  // Companies
  async getCompanies(): Promise<Company[]> {
    const path = 'companies';
    try {
      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => mapDocData<Company>(doc));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async saveCompany(company: Partial<Company>): Promise<void> {
    const path = 'companies';
    const { id, ...data } = company;
    const cleanData = cleanUndefined(data);
    try {
      await this.ensureAuth();
      if (id && id !== 'new') {
        await updateDoc(doc(db, path, id), { ...cleanData, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, path), { ...cleanData, createdAt: serverTimestamp() });
      }
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },
  async deleteCompany(id: string): Promise<void> {
    const path = 'companies';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async deleteHotel(id: string): Promise<void> {
    const path = 'hotels';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  // Rooms
  async getRooms(hotelId?: string): Promise<HotelRoom[]> {
    const path = 'hotelRooms';
    try {
      if (quotaExceeded) return [];
      await this.ensureAuth();
      let q;
      if (hotelId) {
        q = query(collection(db, path), where('hotelId', '==', hotelId));
      } else {
        // Fallback to no order if results are empty, to handle docs without updatedAt
        q = query(collection(db, path));
      }
      const querySnapshot = await this.withRetry(() => getDocs(q));
      return querySnapshot.docs.map(doc => mapDocData<HotelRoom>(doc));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async saveRoom(room: Partial<HotelRoom>): Promise<void> {
    const path = 'hotelRooms';
    try {
      await this.ensureAuth();
      const { id, updatedAt, ...data } = room;
      
      const cleanData = cleanUndefined(data);

      await this.withRetry(async () => {
        if (id) {
          await updateDoc(doc(db, path, id), { ...cleanData, updatedAt: serverTimestamp() });
        } else {
          await addDoc(collection(db, path), { 
            ...cleanData, 
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },
  async bulkSaveRooms(rooms: Partial<HotelRoom>[]): Promise<void> {
    const path = 'hotelRooms';
    try {
      await this.ensureAuth();
      const chunkSize = 400; // Batch max is 500
      for (let i = 0; i < rooms.length; i += chunkSize) {
        const chunk = rooms.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach(room => {
          const { id, ...data } = room;
          const cleanData = cleanUndefined(data);
          
          if (id) {
            const docRef = doc(db, path, id);
            batch.update(docRef, { ...cleanData, updatedAt: serverTimestamp() });
          } else {
            const docRef = doc(collection(db, path));
            batch.set(docRef, { 
              ...cleanData, 
              createdAt: serverTimestamp(), 
              updatedAt: serverTimestamp() 
            });
          }
        });
        
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },
  async deleteRoom(id: string): Promise<void> {
    const path = 'hotelRooms';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async bulkDeleteRooms(ids: string[]): Promise<void> {
    const path = 'hotelRooms';
    try {
      await this.ensureAuth();
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, path, id));
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Umrah Pricing
  async getUmrahPricings(): Promise<UmrahPricing[]> {
    const path = 'umrah_pricing';
    
    const cachedStr = localStorage.getItem('cached_umrah_pricing');
    if (cachedStr) {
      try {
        const lastFetch = Number(localStorage.getItem('last_pricing_fetch') || 0);
        const cacheTTL = (quotaExceeded && !canMakeRequest()) ? 1800000 : 600000;
        if (Date.now() - lastFetch < cacheTTL || (quotaExceeded && !canMakeRequest())) {
          return JSON.parse(cachedStr);
        }
      } catch (e) {}
    }

    if (quotaExceeded && !canMakeRequest()) {
      return cachedStr ? JSON.parse(cachedStr) : [];
    }

    try {
      await this.ensureAuth();
      const q = query(collection(db, path));
      const querySnapshot = await this.withRetry(() => getDocs(q));
      
      const pricings = querySnapshot.docs.map(doc => mapDocData<UmrahPricing>(doc));
      
      // Sort pricings by createdAt descending in memory (Index-free and robust)
      pricings.sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      
      safeLocalStorageSetItem('cached_umrah_pricing', JSON.stringify(pricings));
      safeLocalStorageSetItem('last_pricing_fetch', Date.now().toString());
      return pricings;
    } catch (error: any) {
      if (isQuotaError(error)) {
        quotaExceeded = true;
        lastQuotaErrorTime = Date.now();
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return cachedStr ? JSON.parse(cachedStr) : [];
    }
  },
  async saveUmrahPricing(pricing: UmrahPricing): Promise<void> {
    const path = 'umrah_pricing';
    const { id, createdAt, updatedAt, ...data } = pricing;
    const cleanData = cleanUndefined(data);
    try {
      await this.ensureAuth();
      await this.withRetry(async () => {
        if (id && id !== 'new') {
          const docRef = doc(db, path, id);
          await setDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() }, { merge: true });
        } else {
          await addDoc(collection(db, path), { 
            ...cleanData, 
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      });
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },
  async deleteUmrahPricing(id: string): Promise<void> {
    const path = 'umrah_pricing';
    try {
      await this.ensureAuth();
      await this.withRetry(() => deleteDoc(doc(db, path, id)));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};
