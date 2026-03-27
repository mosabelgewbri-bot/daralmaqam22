import { Trip, Booking, RolePermissions, User, AuditLog, Notification, Pilgrim, UmrahOffer, Customer } from '../types';
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
  writeBatch
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export const api = {
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
      
      return { 
        user: { 
          id: userDoc.id, 
          ...userData,
          createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt,
          updatedAt: userData.updatedAt?.toDate?.()?.toISOString() || userData.updatedAt
        } 
      };
    } catch (error) {
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
    if (this.lastAuthAttempt > 0 && now - this.lastAuthAttempt < 30000) {
      return;
    }

    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = (async () => {
      this.lastAuthAttempt = Date.now();
      try {
        // Only attempt anonymous auth if we are not already in a login flow
        // and if it hasn't explicitly failed before with admin-restricted-operation
        const authDisabled = localStorage.getItem('fb_auth_disabled') === 'true';
        if (!authDisabled) {
          await signInAnonymously(auth);
          console.log('Anonymous authentication successful');
        }
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
      } else {
        // Create a basic user record for the first-time Google login
        userData = {
          id: firebaseUser.uid,
          username: firebaseUser.email?.split('@')[0] || 'user',
          name: firebaseUser.displayName || 'مستخدم جديد',
          role: 'admin', // Default to admin for the first user or based on your logic
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

  async getTrips(): Promise<Trip[]> {
    const path = 'trips';
    try {
      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as Trip;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async saveTrip(trip: Trip): Promise<void> {
    const path = 'trips';
    const { id, ...data } = trip;
    
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
  async getBookings(): Promise<Booking[]> {
    const path = 'bookings';
    try {
      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as Booking;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async saveBooking(booking: Booking): Promise<void> {
    const path = 'bookings';
    const { id, ...data } = booking;
    
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
  async deleteBooking(id: string): Promise<void> {
    const path = 'bookings';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Permissions
  async getPermissions(): Promise<RolePermissions[]> {
    const path = 'permissions';
    try {
      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as RolePermissions));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
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

  // Users
  async getUsers(): Promise<User[]> {
    const path = 'users';
    try {
      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as User;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async saveUser(user: Partial<User> & { password?: string }): Promise<void> {
    const path = 'users';
    const { id, ...data } = user;
    
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
  async deleteUser(id: string): Promise<void> {
    const path = 'users';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Settings
  async getSettings(): Promise<Record<string, string>> {
    const path = 'settings';
    try {
      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      const settings: Record<string, string> = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.key) settings[data.key] = data.value;
      });
      return settings;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
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
    try {
      await this.ensureAuth();
      const [users, trips, bookings, pilgrims, logs] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'trips')),
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'pilgrims')),
        getDocs(collection(db, 'logs'))
      ]);
      
      // Estimate size (very rough: ~500 bytes per doc)
      const totalDocs = users.size + trips.size + bookings.size + pilgrims.size + logs.size;
      const estimatedSize = totalDocs * 500; 

      return {
        users: users.size,
        trips: trips.size,
        bookings: bookings.size,
        pilgrims: pilgrims.size,
        logs: logs.size,
        totalDocs,
        dbSize: estimatedSize,
        dbType: 'Cloud (Firestore)',
        health: 'Excellent',
        uptime: '99.9%'
      };
    } catch (error) {
      console.error('Error getting DB stats:', error);
      // Return a partial object if we can't get everything
      return { 
        dbType: 'Cloud (Firestore)', 
        health: 'Error', 
        error: String(error),
        uptime: '---'
      };
    }
  },

  async exportDatabase(): Promise<void> {
    try {
      await this.ensureAuth();
      const collections = ['users', 'trips', 'bookings', 'pilgrims', 'permissions', 'settings', 'logs'];
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

  async logAction(userId: string, userName: string, action: string, details?: string): Promise<void> {
    const path = 'logs';
    try {
      await this.ensureAuth();
      await addDoc(collection(db, path), {
        userId,
        userName,
        action,
        details,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  },

  async getLogs(): Promise<AuditLog[]> {
    const path = 'logs';
    try {
      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
        } as unknown as AuditLog;
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getPilgrims(bookingId?: string): Promise<Pilgrim[]> {
    const path = 'pilgrims';
    try {
      await this.ensureAuth();
      let q = query(collection(db, path));
      if (bookingId) {
        q = query(collection(db, path), where("bookingId", "==", bookingId));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as Pilgrim;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getNotifications(userId?: string): Promise<Notification[]> {
    const path = 'notifications';
    try {
      await this.ensureAuth();
      let q = query(collection(db, path));
      if (userId) {
        q = query(collection(db, path), where("userId", "==", userId));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        } as unknown as Notification;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
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
      await addDoc(collection(db, path), {
        ...cleanData,
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
  
  // Umrah Offers
  async getUmrahOffers(): Promise<UmrahOffer[]> {
    const path = 'umrahOffers';
    try {
      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as unknown as UmrahOffer;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async getUmrahOfferById(id: string): Promise<UmrahOffer | null> {
    const path = 'umrahOffers';
    try {
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
  async saveUmrahOffer(offer: UmrahOffer): Promise<string> {
    const path = 'umrahOffers';
    const { id, ...data } = offer;
    
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
          await setDoc(docRef, { ...cleanData, createdAt: serverTimestamp() });
          return id;
        }
      } else {
        const docRef = await addDoc(collection(db, path), { ...cleanData, createdAt: serverTimestamp() });
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
    try {
      await this.ensureAuth();
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          lastBookingDate: data.lastBookingDate?.toDate?.()?.toISOString() || data.lastBookingDate
        } as unknown as Customer;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async saveCustomer(customer: Partial<Customer>): Promise<void> {
    const path = 'customers';
    const { id, ...data } = customer;
    
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
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },
  async deleteCustomer(id: string): Promise<void> {
    const path = 'customers';
    try {
      await this.ensureAuth();
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async bulkSaveCustomers(customers: Partial<Customer>[]): Promise<void> {
    const path = 'customers';
    try {
      await this.ensureAuth();
      
      // 1. Get all existing customers to check for duplicates
      const querySnapshot = await getDocs(collection(db, path));
      const existingCustomersMap = new Map<string, string>(); // phone -> id
      querySnapshot.docs.forEach(doc => {
        const phone = doc.data().phone;
        if (phone) existingCustomersMap.set(phone, doc.id);
      });

      // 2. Process in batches of 500
      const chunkSize = 500;
      for (let i = 0; i < customers.length; i += chunkSize) {
        const chunk = customers.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach(customer => {
          const { id, ...data } = customer;
          const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== undefined)
          );

          const existingId = existingCustomersMap.get(data.phone!);
          if (existingId) {
            batch.update(doc(db, path, existingId), { ...cleanData, updatedAt: serverTimestamp() });
          } else {
            const newDocRef = doc(collection(db, path));
            batch.set(newDocRef, { ...cleanData, createdAt: serverTimestamp() });
          }
        });

        await batch.commit();
      }
    } catch (error) {
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
    try {
      await this.ensureAuth();
      
      // 1. Get all bookings and pilgrims
      const [bookingsSnap, pilgrimsSnap, customersSnap] = await Promise.all([
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'pilgrims')),
        getDocs(collection(db, 'customers'))
      ]);

      const existingPhones = new Set(customersSnap.docs.map(d => d.data().phone));
      const newContacts: Map<string, { name: string, phone: string, lastDate: string }> = new Map();

      // Process bookings
      bookingsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.phone && !existingPhones.has(data.phone)) {
          newContacts.set(data.phone, {
            name: data.contactName || data.name || 'عميل من الحجوزات',
            phone: data.phone,
            lastDate: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString()
          });
        }
      });

      // Process pilgrims
      pilgrimsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.phone && !existingPhones.has(data.phone) && !newContacts.has(data.phone)) {
          newContacts.set(data.phone, {
            name: data.name || 'معتمر من الحجوزات',
            phone: data.phone,
            lastDate: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString()
          });
        }
      });

      // 2. Add new contacts to customers collection
      const promises = Array.from(newContacts.values()).map(contact => {
        return addDoc(collection(db, 'customers'), {
          name: contact.name,
          phone: contact.phone,
          email: '',
          totalBookings: 1,
          lastBookingDate: contact.lastDate,
          createdAt: serverTimestamp()
        });
      });

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      // 3. Return updated customers list
      return this.getCustomers();
    } catch (error) {
      console.error('Error syncing customers:', error);
      throw error;
    }
  }
};
