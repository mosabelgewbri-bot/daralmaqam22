import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Notification, User, Booking, Pilgrim } from '../types';
import { api } from '../services/api';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  scanForTasks: () => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode; user: User | null }> = ({ children, user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications(user.role === 'admin' ? undefined : user.id);
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

  const scanForTasks = useCallback(async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'accountant' && user.role !== 'visa_specialist' && user.role !== 'staff')) return;

    try {
      setLoading(true);
      const [bookings, pilgrims, allNotifications] = await Promise.all([
        api.getBookings(),
        api.getPilgrims(),
        api.getNotifications()
      ]);

      const newNotifications: Partial<Notification>[] = [];

      // 1. Finance Check (Accountants, Admins, Managers)
      if (['admin', 'manager', 'accountant'].includes(user.role)) {
        const unpaidBookings = bookings.filter(b => (b.totals.totalLYD > (b.paidLYD || 0)) || (b.totals.totalUSD > (b.paidUSD || 0)));
        for (const booking of unpaidBookings) {
          const title = 'فاتورة غير مكتملة الدفع';
          const message = `الحجز الخاص بـ ${booking.headName} لديه مبالغ متبقية.`;
          
          // Check if notification already exists for this booking
          const exists = allNotifications.find(n => n.title === title && n.message === message && !n.read);
          if (!exists) {
            newNotifications.push({
              title,
              message,
              type: 'warning',
              ...(user.role !== 'admin' && { userId: user.id })
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
              ...(user.role !== 'admin' && { userId: user.id })
            });
          }
        }

        // New check: Orphaned pilgrims (missing or invalid booking ID)
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
              ...(user.role !== 'admin' && { userId: user.id })
            });
          }
        }

        // New check: Missing hotel booking numbers in Rooming
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
              ...(user.role !== 'admin' && { userId: user.id })
            });
          }
        }
      }

      // 3. Visa Check (Visa Specialists, Admins, Managers)
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
              ...(user.role !== 'admin' && { userId: user.id })
            });
          }
        }
      }

      // 4. New Booking Check
      if (['admin', 'manager', 'accountant'].includes(user.role)) {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        const newBookings = bookings.filter(b => new Date(b.createdAt) > oneDayAgo);
        for (const booking of newBookings) {
          const title = 'حجز جديد';
          const message = `تم إنشاء حجز جديد لـ ${booking.headName}.`;
          
          const exists = allNotifications.find(n => n.title === title && n.message === message && !n.read);
          if (!exists) {
            newNotifications.push({
              title,
              message,
              type: 'success',
              ...(user.role !== 'admin' && { userId: user.id })
            });
          }
        }
      }

      // Add new notifications
      if (newNotifications.length > 0) {
        await Promise.all(newNotifications.map(n => api.addNotification(n)));
        await refreshNotifications();
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
      
      // Periodic refresh every 5 minutes
      const interval = setInterval(() => {
        refreshNotifications();
        scanForTasks();
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [user, refreshNotifications, scanForTasks]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
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
