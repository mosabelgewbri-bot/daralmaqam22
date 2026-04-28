import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Notification, User } from '../types';
import { api } from '../services/api';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  scanForTasks: () => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode; user: User | null }> = ({ children, user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const lastNotificationId = useRef<string | null>(null);

  // Real-time listener
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const path = 'notifications';
    // Admins see all notifications targeted to them or general ones (where userId is null or their id)
    // Actually, to follow "Each user his own ONLY", we filter specifically by userId
    const q = query(
      collection(db, path),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          createdAt: docData.createdAt?.toDate?.()?.toISOString() || docData.createdAt
        } as Notification;
      });

      setNotifications(data);

      // Show toast for new unread notifications
      const latest = data[0];
      if (latest && !latest.read && latest.id !== lastNotificationId.current) {
        lastNotificationId.current = latest.id;
        toast(latest.title, {
          description: latest.message,
          icon: '🔔',
          duration: 5000,
        });
      }
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    try {
      await api.bulkMarkNotificationsAsRead(unreadIds);
      setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const scanForTasks = useCallback(async () => {
    if (!user || api.isQuotaExceeded() || (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'accountant' && user.role !== 'visa_specialist' && user.role !== 'staff')) return;

    try {
      setLoading(true);
      // Use cached data if possible to reduce reads
      const [bookings, pilgrims, allNotifications] = await Promise.all([
        api.getBookings(),
        api.getPilgrims(),
        api.getNotifications()
      ]);

      if (api.isQuotaExceeded()) return;

      const newNotifications: Partial<Notification>[] = [];

      // 1. Finance Check (Accountants, Admins, Managers)
      if (['admin', 'manager', 'accountant'].includes(user.role)) {
        const [trips] = await Promise.all([api.getTrips()]);
        const unpaidBookings = bookings.filter(b => (b.totals.totalLYD > (b.paidLYD || 0)) || (b.totals.totalUSD > (b.paidUSD || 0)));
        
        for (const booking of unpaidBookings) {
          const trip = trips.find(t => t.id === booking.tripId);
          if (trip && trip.startDate) {
            const startDate = new Date(trip.startDate);
            const today = new Date();
            const diffTime = startDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 10 && diffDays > 0) {
              const title = 'تنبيه دفع عاجل';
              const message = `الحجز الخاص بـ ${booking.headName} لديه مبالغ متبقية، والرحلة بعد ${diffDays} أيام.`;
              
              const exists = allNotifications.find(n => n.title === title && n.message === message && !n.read);
              if (!exists) {
                newNotifications.push({
                  title,
                  message,
                  type: 'error',
                  userId: user.id,
                  read: false
                });
              }
            }
          }

          const title = 'فاتورة غير مكتملة الدفع';
          const message = `الحجز الخاص بـ ${booking.headName} لديه مبالغ متبقية.`;
          
          // Check if notification already exists for this booking
          const exists = allNotifications.find(n => n.title === title && n.message === message && !n.read);
          if (!exists) {
            newNotifications.push({
              title,
              message,
              type: 'warning',
              userId: user.id,
              read: false
            });
          }
        }
      }

      // 2. Rooming Check
      if (['admin', 'manager', 'staff', 'receptionist'].includes(user.role)) {
        const unassignedPilgrims = pilgrims.filter(p => !p.makkahRoom || !p.madinahRoom);
        if (unassignedPilgrims.length > 0) {
          const title = 'تسكين غير مكتمل';
          const message = `يوجد ${unassignedPilgrims.length} معتمر يحتاجون إلى توزيع غرف.`;
          
          const exists = allNotifications.find(n => n.title === title && n.message === message && !n.read);
          if (!exists) {
            newNotifications.push({
              title,
              message,
              type: 'info',
              userId: user.id,
              read: false
            });
          }
        }

        // Orphaned pilgrims check
        const orphanedPilgrims = pilgrims.filter(p => {
          if (!p.bookingId) return true;
          return !bookings.some(b => b.id === p.bookingId);
        });

        if (orphanedPilgrims.length > 0) {
          const title = 'خطأ في بيانات المعتمرين';
          const message = `يوجد ${orphanedPilgrims.length} معتمر برقم حجز غير موجود أو مفقود.`;
          
          const exists = allNotifications.find(n => n.title === title && n.message === message && !n.read);
          if (!exists) {
            newNotifications.push({
              title,
              message,
              type: 'error',
              userId: user.id,
              read: false
            });
          }
        }

        // Missing hotel booking numbers
        const missingHotelBookings = bookings.filter(b => {
          const hasRoomingPilgrims = b.pilgrims.some(p => p.roomType !== 'VisaOnly');
          return hasRoomingPilgrims && (!b.makkahBookingNo || !b.madinahBookingNo);
        });

        if (missingHotelBookings.length > 0) {
          const title = 'نقص في أرقام حجز الفنادق';
          const message = `يوجد ${missingHotelBookings.length} حجز يحتاج إلى إدخال أرقام حجز الفنادق (مكة/المدينة).`;
          
          const exists = allNotifications.find(n => n.title === title && n.message === message && !n.read);
          if (!exists) {
            newNotifications.push({
              title,
              message,
              type: 'warning',
              userId: user.id,
              read: false
            });
          }
        }
      }

      // 3. Visa Check
      if (['admin', 'manager', 'visa_specialist'].includes(user.role)) {
        const pendingPilgrims = pilgrims.filter(p => p.visaStatus === 'Pending');
        if (pendingPilgrims.length > 0) {
          const title = 'تأشيرات قيد الانتظار';
          const message = `يوجد ${pendingPilgrims.length} طلب تأشيرة لا يزال قيد الانتظار.`;
          
          const exists = allNotifications.find(n => n.title === title && n.message === message && !n.read);
          if (!exists) {
            newNotifications.push({
              title,
              message,
              type: 'warning',
              userId: user.id,
              read: false
            });
          }
        }
      }

      // Add new notifications
      if (newNotifications.length > 0) {
        await api.bulkAddNotifications(newNotifications as any);
        // refreshNotifications is not strictly needed as onSnapshot will pick it up
      }

    } catch (error) {
      console.error('Error scanning for tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user, refreshNotifications]);

  useEffect(() => {
    if (user) {
      refreshNotifications();
      // Initial scan
      scanForTasks();
      
      // Periodic refresh every 15 minutes (increased from 5 to save quota)
      const interval = setInterval(() => {
        if (!api.isQuotaExceeded()) {
          refreshNotifications();
          scanForTasks();
        }
      }, 15 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [user, refreshNotifications, scanForTasks]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead,
      refreshNotifications, 
      scanForTasks,
      loading 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
