import { Trip, Booking, RolePermissions, User } from '../types';
import { supabase } from '../utils/supabase';

export const api = {
  // Auth
  async login(username: string, password: string): Promise<any> {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    
    // البحث عن المستخدم (تجاهل حالة الأحرف في اسم المستخدم)
    console.log('Attempting login for:', cleanUsername);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', cleanUsername)
      .eq('password', cleanPassword)
      .single();

    if (error) {
      console.error('Supabase Login Error Details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      if (error.code === 'PGRST116') {
        throw new Error(`اسم المستخدم أو كلمة المرور غير صحيحة. (Code: ${error.code})`);
      }
      if (error.message?.includes('relation "users" does not exist')) {
        throw new Error(`جدول المستخدمين غير موجود. (Code: ${error.code})`);
      }
      throw new Error(`خطأ: ${error.message} (Code: ${error.code})`);
    }

    if (!data) {
      throw new Error('بيانات الدخول غير صحيحة');
    }

    const { password: _, ...userWithoutPassword } = data;
    return { user: userWithoutPassword };
  },

  // Trips
  async getTrips(): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*');
    
    if (error) {
      console.error('Get trips error:', error);
      throw new Error('فشل تحميل الرحلات: ' + error.message);
    }
    
    return (data || []).map((t: any) => ({
      id: t.id,
      tripNumber: t.tripNumber || t.trip_number || t.tripnumber,
      name: t.name,
      airline: t.airline,
      totalSeats: t.totalSeats || t.total_seats || t.totalseats || 0,
      availableSeats: t.availableSeats || t.available_seats || t.availableseats || 0,
      ticketPrice: t.ticketPrice || t.ticket_price || t.ticketprice || 0,
      currency: t.currency,
      status: t.status
    }));
  },
  async saveTrip(trip: Trip): Promise<void> {
    console.log('Attempting to save trip:', trip);
    
    // Create a comprehensive payload that covers multiple naming conventions
    // to ensure compatibility with different database schemas
    const payload: any = {
      id: trip.id,
      name: trip.name,
      airline: trip.airline,
      currency: trip.currency,
      status: trip.status,
      
      // CamelCase
      tripNumber: trip.tripNumber || '',
      totalSeats: trip.totalSeats,
      availableSeats: trip.availableSeats,
      ticketPrice: trip.ticketPrice,
      
      // snake_case
      trip_number: trip.tripNumber || '',
      total_seats: trip.totalSeats,
      available_seats: trip.availableSeats,
      ticket_price: trip.ticketPrice,
      
      // lowercase (to fix "totalseats" error)
      tripnumber: trip.tripNumber || '',
      totalseats: trip.totalSeats,
      availableseats: trip.availableSeats,
      ticketprice: trip.ticketPrice
    };

    const { error } = await supabase
      .from('trips')
      .upsert(payload);
    
    if (error) {
      console.warn('Save attempt failed with full payload, trying minimal:', error.message);
      
      // If the full payload fails (likely because some columns don't exist),
      // we try to save only the fields that are most likely to exist.
      // But based on the user's error, "totalseats" is the one causing issues.
      
      const fallbackPayload = {
        id: trip.id,
        name: trip.name,
        airline: trip.airline,
        currency: trip.currency,
        status: trip.status,
        totalseats: trip.totalSeats,
        availableseats: trip.availableSeats,
        ticketprice: trip.ticketPrice,
        tripnumber: trip.tripNumber || ''
      };
      
      const { error: error2 } = await supabase.from('trips').upsert(fallbackPayload);
      if (error2) {
        console.error('Final save attempt failed:', error2.message);
        throw new Error('فشل حفظ الرحلة: ' + error2.message);
      }
    }
    console.log('Trip saved successfully');
  },
  async deleteTrip(id: string): Promise<void> {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error('فشل حذف الرحلة');
  },

  // Bookings
  async getBookings(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        trips (
          name,
          tripNumber
        )
      `);
    
    if (error) {
      console.error('Get bookings error:', error);
      // Try fallback to trip_number if tripNumber fails
      if (error.message.includes('tripNumber')) {
         return this.getBookingsFallback();
      }
      throw new Error('فشل تحميل الحجوزات: ' + error.message);
    }
    
    return (data || []).map((b: any) => ({
      id: b.id,
      tripId: b.tripId || b.trip_id || b.tripid,
      headName: b.headName || b.head_name || b.headname,
      regId: b.regId || b.reg_id || b.regid,
      phone: b.phone,
      passengerCount: b.passengerCount || b.passenger_count || b.passengercount,
      status: b.status,
      makkahHotel: b.makkahHotel || b.makkah_hotel || b.makkahhotel,
      makkahNights: b.makkahNights || b.makkah_nights || b.makkahnights,
      madinahHotel: b.madinahHotel || b.madinah_hotel || b.madinahhotel,
      madinahNights: b.madinahNights || b.madinah_nights || b.madinahnights,
      isVisaOnly: b.isVisaOnly || b.is_visa_only || b.isvisaonly,
      createdAt: b.createdAt || b.created_at || b.createdat,
      createdBy: b.createdBy || b.created_by || b.createdby,
      tripName: b.trips?.name,
      tripNumber: b.trips?.tripNumber || b.trips?.trip_number || b.trips?.tripnumber,
      totals: (typeof b.totals === 'string' ? JSON.parse(b.totals) : b.totals) || { ticketsLYD: 0, ticketsUSD: 0, packageLYD: 0, packageUSD: 0, totalLYD: 0, totalUSD: 0 },
      pilgrims: (typeof b.pilgrims === 'string' ? JSON.parse(b.pilgrims) : b.pilgrims) || [],
    }));
  },

  async getBookingsFallback(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        trips (
          name,
          trip_number
        )
      `);
    
    if (error) throw new Error('فشل تحميل الحجوزات: ' + error.message);
    
    return (data || []).map((b: any) => ({
      id: b.id,
      tripId: b.trip_id || b.tripId || b.tripid,
      headName: b.head_name || b.headName || b.headname,
      regId: b.reg_id || b.regId || b.regid,
      phone: b.phone,
      passengerCount: b.passenger_count || b.passengerCount || b.passengercount,
      status: b.status,
      makkahHotel: b.makkah_hotel || b.makkahHotel || b.makkahhotel,
      makkahNights: b.makkah_nights || b.makkahNights || b.makkahnights,
      madinahHotel: b.madinah_hotel || b.madinahHotel || b.madinahhotel,
      madinahNights: b.madinah_nights || b.madinahNights || b.madinahnights,
      isVisaOnly: b.is_visa_only || b.isVisaOnly || b.isvisaonly,
      createdAt: b.created_at || b.createdAt || b.createdat,
      createdBy: b.created_by || b.createdBy || b.createdby,
      tripName: b.trips?.name,
      tripNumber: b.trips?.trip_number || b.trips?.tripNumber || b.trips?.tripnumber,
      totals: (typeof b.totals === 'string' ? JSON.parse(b.totals) : b.totals) || { ticketsLYD: 0, ticketsUSD: 0, packageLYD: 0, packageUSD: 0, totalLYD: 0, totalUSD: 0 },
      pilgrims: (typeof b.pilgrims === 'string' ? JSON.parse(b.pilgrims) : b.pilgrims) || [],
    }));
  },

  async saveBooking(booking: Booking): Promise<void> {
    // Create a comprehensive payload covering multiple naming conventions
    const payload: any = {
      id: booking.id,
      phone: booking.phone,
      status: booking.status,
      totals: booking.totals,
      pilgrims: booking.pilgrims,

      // CamelCase
      tripId: booking.tripId,
      headName: booking.headName,
      regId: booking.regId,
      passengerCount: booking.passengerCount,
      makkahHotel: booking.makkahHotel,
      makkahNights: booking.makkahNights,
      madinahHotel: booking.madinahHotel,
      madinahNights: booking.madinahNights,
      isVisaOnly: booking.isVisaOnly,
      createdBy: booking.createdBy,

      // snake_case
      trip_id: booking.tripId,
      head_name: booking.headName,
      reg_id: booking.regId,
      passenger_count: booking.passengerCount,
      makkah_hotel: booking.makkahHotel,
      makkah_nights: booking.makkahNights,
      madinah_hotel: booking.madinahHotel,
      madinah_nights: booking.madinahNights,
      is_visa_only: booking.isVisaOnly,
      created_by: booking.createdBy,

      // lowercase
      tripid: booking.tripId,
      headname: booking.headName,
      regid: booking.regId,
      passengercount: booking.passengerCount,
      makkahhotel: booking.makkahHotel,
      makkahnights: booking.makkahNights,
      madinahhotel: booking.madinahHotel,
      madinahnights: booking.madinahNights,
      isvisaonly: booking.isVisaOnly,
      createdby: booking.createdBy
    };

    const { error } = await supabase
      .from('bookings')
      .upsert(payload);
    
    if (error) {
      console.warn('Booking save failed with full payload, trying minimal lowercase:', error.message);
      // Fallback to minimal lowercase which seems to be the pattern in user's DB
      const fallbackPayload = {
        id: booking.id,
        phone: booking.phone,
        status: booking.status,
        totals: booking.totals,
        pilgrims: booking.pilgrims,
        tripid: booking.tripId,
        headname: booking.headName,
        regid: booking.regId,
        passengercount: booking.passengerCount,
        makkahhotel: booking.makkahHotel,
        makkahnights: booking.makkahNights,
        madinahhotel: booking.madinahHotel,
        madinahnights: booking.madinahNights,
        isvisaonly: booking.isVisaOnly,
        createdby: booking.createdBy
      };
      
      const { error: error2 } = await supabase.from('bookings').upsert(fallbackPayload);
      if (error2) {
        console.error('Final booking save attempt failed:', error2.message);
        throw new Error('فشل حفظ الحجز: ' + error2.message);
      }
    }
  },
  async deleteBooking(id: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error('فشل حذف الحجز');
  },

  // Permissions
  async getPermissions(): Promise<RolePermissions[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*');
    
    if (error) throw new Error('فشل تحميل الصلاحيات');
    
    return (data || []).map((p: any) => ({
      role: p.role,
      allowedScreens: typeof p.allowed_screens === 'string' ? JSON.parse(p.allowed_screens) : p.allowed_screens,
      canEdit: p.can_edit,
      canDelete: p.can_delete,
      canExport: p.can_export,
      canViewFinance: p.can_view_finance,
      canApproveBookings: p.can_approve_bookings,
      canManageUsers: p.can_manage_users,
      canEditTrips: p.can_edit_trips,
      canViewReports: p.can_view_reports,
      canManageSettings: p.can_manage_settings,
      canManageFinance: p.can_manage_finance,
      canChangeVisaStatus: p.can_change_visa_status,
      canManageRooms: p.can_manage_rooms,
      dataScope: p.data_scope
    }));
  },
  async savePermission(permission: RolePermissions): Promise<void> {
    const { error } = await supabase
      .from('permissions')
      .upsert({
        role: permission.role,
        allowed_screens: permission.allowedScreens,
        can_edit: permission.canEdit,
        can_delete: permission.canDelete,
        can_export: permission.canExport,
        can_view_finance: permission.canViewFinance,
        can_approve_bookings: permission.canApproveBookings,
        can_manage_users: permission.canManageUsers,
        can_edit_trips: permission.canEditTrips,
        can_view_reports: permission.canViewReports,
        can_manage_settings: permission.canManageSettings,
        can_manage_finance: permission.canManageFinance,
        can_change_visa_status: permission.canChangeVisaStatus,
        can_manage_rooms: permission.canManageRooms,
        data_scope: permission.dataScope
      });
    
    if (error) {
      console.error('Save permission error:', error);
      throw new Error('فشل حفظ الصلاحيات: ' + error.message);
    }
  },

  // Users
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw new Error('فشل تحميل المستخدمين');
    
    return (data || []).map((u: any) => {
      const { password: _, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
  },
  async saveUser(user: Partial<User> & { password?: string }): Promise<void> {
    const { error } = await supabase
      .from('users')
      .upsert(user);
    
    if (error) throw new Error('فشل حفظ المستخدم');
  },
  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error('فشل حذف المستخدم');
  },

  // Settings
  async getSettings(): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('settings')
      .select('*');
    
    if (error) throw new Error('فشل تحميل الإعدادات');
    
    return (data || []).reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  },
  async saveSettings(settings: Record<string, string>): Promise<void> {
    const entries = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const { error } = await supabase
      .from('settings')
      .upsert(entries);
    
    if (error) throw new Error('فشل حفظ الإعدادات');
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();

    if (fetchError || !data || data.password !== currentPassword) {
      throw new Error('كلمة المرور الحالية غير صحيحة');
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', userId);

    if (updateError) throw new Error('فشل تغيير كلمة المرور');
  },

  async getDbStats(): Promise<any> {
    return {
      users: 0,
      trips: 0,
      bookings: 0,
      pilgrims: 0,
      logs: 0,
      dbType: 'Supabase (Cloud)',
      lastSync: new Date().toISOString()
    };
  },

  async logAction(userId: string, action: string, details?: string): Promise<void> {
    await supabase
      .from('logs')
      .insert({ userId, action, details });
  }
};
