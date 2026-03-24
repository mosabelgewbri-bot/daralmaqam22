import React, { useState, useEffect } from 'react';
import { User, Booking, Trip, Pilgrim } from '../types';
import { api } from '../services/api';
import { getRolePermissions } from '../utils/dataUtils';
import { motion } from 'motion/react';
import { Search, FileSpreadsheet, FileText, Filter, ArrowLeft, Users, FileBarChart, Trash2, Edit2, Check, X, Hotel, ShieldCheck, DollarSign, MessageSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import Logo from './Logo';
import { addDays, format, parseISO, isValid } from 'date-fns';
import { sendWhatsAppMessage, generateTripDetailsMessage } from '../utils/whatsapp';

export default function ReportsModule({ user }: { user: User }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'master' | 'pilgrims' | 'rooming' | 'visa' | 'finance' | 'reminders'>('master');
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [selectedAirline, setSelectedAirline] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedGroupNo, setSelectedGroupNo] = useState('');
  const [groupExistence, setGroupExistence] = useState<'all' | 'entered' | 'not_entered'>('all');
  const [roomingExistence, setRoomingExistence] = useState<'all' | 'entered' | 'not_entered'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterRemainingOnly, setFilterRemainingOnly] = useState(false);
  const [editingPilgrim, setEditingPilgrim] = useState<{bookingId: string, pilgrimIdx: number, data: Partial<Pilgrim>} | null>(null);
  const [confirmDeleteBookingId, setConfirmDeleteBookingId] = useState<string | null>(null);
  const [confirmDeletePilgrimKey, setConfirmDeletePilgrimKey] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tripsData, bookingsData] = await Promise.all([
          api.getTrips(),
          api.getBookings()
        ]);
        console.log('Reports: Loaded trips:', tripsData.length);
        console.log('Reports: Loaded bookings:', bookingsData.length);
        if (bookingsData.length > 0) {
          console.log('Reports: Sample booking:', bookingsData[0]);
        }
        setTrips(tripsData);
        setBookings(bookingsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const permissions = getRolePermissions(user.role);

  const getPaymentReminders = () => {
    return bookings.filter(b => {
      const remainingLYD = (b.totals?.totalLYD || 0) - (b.paidLYD || 0);
      const remainingUSD = (b.totals?.totalUSD || 0) - (b.paidUSD || 0);
      const hasRemaining = remainingLYD > 0 || remainingUSD > 0;
      
      if (!hasRemaining) return false;

      const trip = trips.find(t => String(t.id).trim().toLowerCase() === String(b.tripId || '').trim().toLowerCase());
      if (!trip || !trip.startDate) return true; // Show if no trip date found but has remaining

      const tripDate = parseISO(trip.startDate);
      const today = new Date();
      const diffDays = Math.ceil((tripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return diffDays <= 15; // Show reminders for trips starting within 15 days
    }).sort((a, b) => {
      const tripA = trips.find(t => String(t.id).trim().toLowerCase() === String(a.tripId || '').trim().toLowerCase());
      const tripB = trips.find(t => String(t.id).trim().toLowerCase() === String(b.tripId || '').trim().toLowerCase());
      if (!tripA?.startDate || !tripB?.startDate) return 0;
      return parseISO(tripA.startDate).getTime() - parseISO(tripB.startDate).getTime();
    });
  };

  const sendPaymentReminder = (booking: Booking) => {
    const remainingLYD = (booking.totals?.totalLYD || 0) - (booking.paidLYD || 0);
    const remainingUSD = (booking.totals?.totalUSD || 0) - (booking.paidUSD || 0);
    const tripName = getTripName(booking);
    
    let message = `السلام عليكم سيد/ة ${booking.headName}\n\n`;
    message += `نود تذكيركم بخصوص حجزكم في رحلة: ${tripName}\n`;
    message += `المبلغ المتبقي للسداد هو:\n`;
    if (remainingLYD > 0) message += `- ${remainingLYD.toLocaleString()} دينار ليبي\n`;
    if (remainingUSD > 0) message += `- ${remainingUSD.toLocaleString()} دولار أمريكي\n`;
    message += `\nيرجى التكرم بتسوية المبلغ في أقرب وقت ممكن لضمان تأكيد الحجز.\n`;
    message += `شكراً لاختياركم دار المقام.`;

    sendWhatsAppMessage(booking.phone, message);
  };
  const getTripName = (input: Booking | string) => {
    if (typeof input === 'object' && (input as any).tripName) return (input as any).tripName;
    const tripId = typeof input === 'string' ? input : (input.tripId || (input as any).tripid || (input as any).trip_id);
    const trip = trips.find(t => String(t.id).trim().toLowerCase() === String(tripId).trim().toLowerCase());
    return trip ? trip.name : 'رحلة غير معروفة';
  };

  const baseFilteredBookings = bookings.filter(b => {
    const bTripId = String(b.tripId || '').trim().toLowerCase();
    const sTripId = String(selectedTripId || '').trim().toLowerCase();
    const matchesTrip = !sTripId || bTripId === sTripId;
    
    const trip = trips.find(t => String(t.id).trim().toLowerCase() === bTripId);
    const matchesAirline = !selectedAirline || trip?.airline === selectedAirline;
    const matchesStatus = !selectedStatus || b.status === selectedStatus;
    const matchesGroup = !selectedGroupNo || b.groupNo === selectedGroupNo;
    
    const matchesGroupExistence = 
      groupExistence === 'all' ? true :
      groupExistence === 'entered' ? !!b.groupNo :
      !b.groupNo;

    const matchesRoomingExistence = 
      roomingExistence === 'all' ? true :
      roomingExistence === 'entered' ? (!!b.makkahBookingNo || !!b.madinahBookingNo) :
      (!b.makkahBookingNo && !b.madinahBookingNo);
    
    const bookingDate = b.createdAt ? parseISO(b.createdAt) : null;
    const matchesDateFrom = !dateFrom || (bookingDate && bookingDate >= parseISO(dateFrom));
    const matchesDateTo = !dateTo || (bookingDate && bookingDate <= parseISO(dateTo));

    const remainingLYD = (b.totals?.totalLYD || 0) - (b.paidLYD || 0);
    const remainingUSD = (b.totals?.totalUSD || 0) - (b.paidUSD || 0);
    const hasRemaining = remainingLYD > 0 || remainingUSD > 0;
    const matchesRemainingFilter = !filterRemainingOnly || hasRemaining;

    return matchesTrip && matchesAirline && matchesStatus && matchesGroup && matchesGroupExistence && matchesRoomingExistence && matchesDateFrom && matchesDateTo && matchesRemainingFilter;
  });

  const filteredBookings = baseFilteredBookings.filter(b => 
    (b.headName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.regId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTripName(b).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roomingFilteredBookings = filteredBookings
    .map(b => ({
      ...b,
      pilgrims: (b.pilgrims || []).filter(p => p.roomType !== 'VisaOnly')
    }))
    .filter(b => b.pilgrims.length > 0);

  // Pilgrim Data Logic
  const filteredPilgrims = baseFilteredBookings.flatMap(b => 
    (b.pilgrims || []).map((p, idx) => ({ 
      ...p, 
      bookingId: b.id, 
      bookingHead: b.headName, 
      tripName: getTripName(b), 
      pilgrimIdx: idx,
      groupNo: b.groupNo,
      regId: b.regId
    }))
  ).filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.passportNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.bookingHead?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.regId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeletePilgrim = async (bookingId: string, pilgrimIdx: number) => {
    if (!bookingId) return;
    
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const newPilgrims = [...booking.pilgrims];
    newPilgrims.splice(pilgrimIdx, 1);
    const updatedBooking = { ...booking, pilgrims: newPilgrims, passengerCount: newPilgrims.length };

    try {
      await api.saveBooking(updatedBooking);
      
      // Re-fetch trips to get updated available seats from server
      const tripsData = await api.getTrips();
      setTrips(tripsData);

      setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
      setConfirmDeletePilgrimKey(null);
      alert('تم حذف المعتمر بنجاح');
    } catch (error: any) {
      console.error('Error deleting pilgrim:', error);
      alert('حدث خطأ أثناء حذف المعتمر');
      setConfirmDeletePilgrimKey(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPilgrim) return;
    
    const booking = bookings.find(b => b.id === editingPilgrim.bookingId);
    if (!booking) return;

    const newPilgrims = [...booking.pilgrims];
    newPilgrims[editingPilgrim.pilgrimIdx] = { ...newPilgrims[editingPilgrim.pilgrimIdx], ...editingPilgrim.data };
    const updatedBooking = { ...booking, pilgrims: newPilgrims };

    try {
      await api.saveBooking(updatedBooking);
      setBookings(bookings.map(b => b.id === editingPilgrim.bookingId ? updatedBooking : b));
      setEditingPilgrim(null);
    } catch (error) {
      console.error('Error saving pilgrim edit:', error);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!bookingId) return;
    
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      console.log('Deleting booking:', bookingId);
      await api.deleteBooking(bookingId);
      
      // Re-fetch trips to get updated available seats from server
      const tripsData = await api.getTrips();
      setTrips(tripsData);

      setBookings(prev => prev.filter(b => b.id !== bookingId));
      setConfirmDeleteBookingId(null);
      alert('تم حذف الحجز بنجاح');
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      alert(error.message || 'حدث خطأ أثناء حذف الحجز');
      setConfirmDeleteBookingId(null);
    }
  };

  const calculateCheckOut = (checkIn?: string, nights?: number) => {
    if (!checkIn || !nights || isNaN(nights)) return '---';
    try {
      const date = parseISO(checkIn);
      if (!isValid(date)) return '---';
      const checkOutDate = addDays(date, nights);
      return format(checkOutDate, 'yyyy-MM-dd');
    } catch (e) {
      return '---';
    }
  };

  const exportExcel = () => {
    let data;
    let filename;
    
    if (activeTab === 'master') {
      data = filteredBookings.map(b => {
        const remainingLYD = (b.totals?.totalLYD || 0) - (b.paidLYD || 0);
        const remainingUSD = (b.totals?.totalUSD || 0) - (b.paidUSD || 0);
        const trip = trips.find(t => String(t.id).trim() === String(b.tripId || (b as any).tripid || (b as any).trip_id).trim());
        const roomSummary = (b.pilgrims || []).map(p => {
          const label = p.roomType === 'Double' ? 'ثنائية' : 
                        p.roomType === 'Triple' ? 'ثلاثية' : 
                        p.roomType === 'Quad' ? 'رباعية' : 
                        p.roomType === 'Quint' ? 'خماسية' : p.roomType;
          return label;
        }).join(', ');

        return {
          'رقم الفاتورة': b.id,
          'رقم القيد': b.regId || '---',
          'الرحلة': trip?.name || '---',
          'رب الأسرة': b.headName || '---',
          'الأسماء': (b.pilgrims || []).map(p => p.name || '---').join(', '),
          'عدد الأفراد': b.passengerCount || 0,
          'رقم الهاتف': b.phone || '---',
          'فندق مكة': b.makkahHotel || '---',
          'رقم حجز مكة': b.makkahBookingNo || '---',
          'فندق المدينة': b.madinahHotel || '---',
          'رقم حجز المدينة': b.madinahBookingNo || '---',
          'توزيع الغرف': roomSummary,
          'رقم المجموعة': b.groupNo || '---',
          'الحالة': b.status || '---',
          'التاريخ': b.createdAt ? new Date(b.createdAt).toLocaleDateString('ar-LY') : '---',
          'إجمالي (دينار)': b.totals?.totalLYD || 0,
          'مدفوع (دينار)': b.paidLYD || 0,
          'متبقي (دينار)': remainingLYD,
          'إجمالي (دولار)': b.totals?.totalUSD || 0,
          'مدفوع (دولار)': b.paidUSD || 0,
          'متبقي (دولار)': remainingUSD,
        };
      });
      filename = `Dara_Master_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (activeTab === 'rooming') {
      data = roomingFilteredBookings.map(b => {
        const trip = trips.find(t => String(t.id).trim() === String(b.tripId || (b as any).tripid || (b as any).trip_id).trim());
        const roomSummary = (b.pilgrims || []).map(p => {
          const label = p.roomType === 'Double' ? 'ثنائية' : 
                        p.roomType === 'Triple' ? 'ثلاثية' : 
                        p.roomType === 'Quad' ? 'رباعية' : 
                        p.roomType === 'Quint' ? 'خماسية' : p.roomType;
          return label;
        }).join(', ');

        return {
          'رقم القيد': b.regId || '---',
          'الرحلة': trip?.name || '---',
          'رب الأسرة': b.headName || '---',
          'الأسماء': (b.pilgrims || []).map(p => p.name || '---').join(', '),
          'توزيع الغرف': roomSummary,
          'فندق مكة': b.makkahHotel || '---',
          'رقم حجز مكة': b.makkahBookingNo || '',
          'دخول مكة': b.makkahCheckIn || '',
          'خروج مكة': calculateCheckOut(b.makkahCheckIn, b.makkahNights),
          'فندق المدينة': b.madinahHotel || '---',
          'رقم حجز المدينة': b.madinahBookingNo || '',
          'دخول المدينة': b.madinahCheckIn || '',
          'خروج المدينة': calculateCheckOut(b.madinahCheckIn, b.madinahNights),
        };
      });
      filename = `Dara_Rooming_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (activeTab === 'visa') {
      data = filteredPilgrims.map(p => {
        const trip = trips.find(t => String(t.id).trim() === String(p.tripId || (p as any).tripid || (p as any).trip_id).trim());
        return {
          'اسم المعتمر': p.name || '---',
          'رقم الجواز': p.passportNo || '---',
          'رقم القيد': p.regId || '---',
          'الرحلة': trip?.name || '---',
          'رقم المجموعة': p.groupNo || '---',
          'الحالة': p.visaStatus || 'Pending'
        };
      });
      filename = `Dara_Visa_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (activeTab === 'finance') {
      data = filteredBookings.map(b => {
        const remainingLYD = (b.totals?.totalLYD || 0) - (b.paidLYD || 0);
        const remainingUSD = (b.totals?.totalUSD || 0) - (b.paidUSD || 0);
        const trip = trips.find(t => String(t.id) === String(b.tripId || (b as any).tripid || (b as any).trip_id));
        const roomSummary = (b.pilgrims || []).map(p => {
          const label = p.roomType === 'Double' ? 'ثنائية' : 
                        p.roomType === 'Triple' ? 'ثلاثية' : 
                        p.roomType === 'Quad' ? 'رباعية' : 
                        p.roomType === 'Quint' ? 'خماسية' : p.roomType;
          return label;
        }).join(', ');

        return {
          'رقم القيد': b.regId || '---',
          'الرحلة': trip?.name || '---',
          'رب الأسرة': b.headName || '---',
          'رقم الهاتف': b.phone || '---',
          'توزيع الغرف': roomSummary,
          'إجمالي د.ل': b.totals?.totalLYD || 0,
          'مدفوع د.ل': b.paidLYD || 0,
          'متبقي د.ل': remainingLYD,
          'إجمالي $': b.totals?.totalUSD || 0,
          'مدفوع $': b.paidUSD || 0,
          'متبقي $': remainingUSD,
        };
      });
      filename = `Dara_Finance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else {
      data = filteredPilgrims.map(p => {
        return {
          'اسم المعتمر': p.name || '---',
          'رقم الجواز': p.passportNo || '---',
          'الصلة': p.relationship || '---',
          'نوع الغرفة': p.roomType || '---',
          'رب الأسرة': p.bookingHead || '---',
          'الرحلة': p.tripName || '---',
          'حالة التأشيرة': p.visaStatus || 'Pending'
        };
      });
      filename = `Dara_Pilgrims_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    }
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'master' ? "Master Report" : "Pilgrims");
    XLSX.writeFile(wb, filename);
  };

  const exportPDF = async () => {
    const selectedTrip = trips.find(t => t.id === selectedTripId);
    const tripName = selectedTripId ? selectedTrip?.name : null;
    const reportType = activeTab === 'master' ? 'التقرير الشامل' : 
                        activeTab === 'rooming' ? 'تقرير التسكين' :
                        activeTab === 'visa' ? 'تقرير التأشيرات' :
                        activeTab === 'finance' ? 'التقرير المالي' :
                        'بيانات المعتمرين';
    const reportTitle = tripName ? `${reportType} لرحلة ${tripName}` : reportType;
    
    // Function to convert image to base64 to avoid CORS issues in PDF
    const getBase64FromUrl = async (url: string): Promise<string> => {
      if (!url || url.startsWith('data:')) return url;
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Could not convert image to base64, using original URL:', e);
        return url;
      }
    };

    const settings = await api.getSettings();
    const rawLogo = settings.app_logo || "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10L15 40V90H85V40L50 10Z' fill='%23D4AF37' fill-opacity='0.2' stroke='%23D4AF37' stroke-width='2'/%3E%3Cpath d='M50 30L30 50V80H70V50L50 30Z' fill='%23D4AF37' stroke='%23D4AF37' stroke-width='2'/%3E%3Ccircle cx='50' cy='20' r='5' fill='%23D4AF37'/%3E%3C/svg%3E";
    const appLogo = rawLogo.startsWith('data:') ? rawLogo : await getBase64FromUrl(rawLogo);
    
    // Create a temporary container for the PDF content
    const printWindow = document.createElement('div');
    printWindow.style.position = 'absolute';
    printWindow.style.left = '-9999px';
    printWindow.style.top = '0';
    printWindow.style.width = '1200px'; 
    printWindow.style.backgroundColor = '#ffffff';
    printWindow.style.color = '#000000';
    printWindow.style.padding = '50px';
    printWindow.style.direction = 'rtl';
    printWindow.dir = 'rtl';
    
    // Add Header
    printWindow.innerHTML = `
      <div style="display: flex; align-items: center; gap: 40px; border-bottom: 6px solid #d4af37; padding-bottom: 30px; margin-bottom: 40px;">
        <div style="background: #ffffff; padding: 10px; border: 3px solid #d4af37; border-radius: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <img src="${appLogo}" style="width: 160px; height: 160px; object-fit: contain; display: block;" crossorigin="anonymous" />
        </div>
        <div style="flex: 1;">
          <h1 style="font-size: 64px; color: #d4af37; margin: 0; font-family: 'Amiri', serif; font-weight: bold; line-height: 1;">${reportTitle}</h1>
          <p style="font-size: 24px; color: #555; margin: 15px 0 0 0; font-weight: 500;">دار المقام لإدارة العمرة والخدمات السياحية</p>
        </div>
        <div style="text-align: left; border-right: 2px solid #eee; padding-right: 30px;">
          <div style="font-size: 18px; color: #999; margin-bottom: 5px;">تاريخ التصدير</div>
          <div style="font-size: 24px; font-weight: bold; color: #1a1a1a;">${new Date().toLocaleDateString('ar-LY')}</div>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: sans-serif;">
        <thead>
          <tr style="background-color: #1a1a1a; color: #ffffff;">
            ${activeTab === 'master' ? `
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">رقم القيد</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">الرحلة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">رب الأسرة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">الأسماء</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">نوع الغرفة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">العدد</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">رقم الهاتف</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">فندق مكة (رقم الحجز)</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">فندق المدينة (رقم الحجز)</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">المجموعة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">إجمالي د.ل</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">متبقي د.ل</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">إجمالي $</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">متبقي $</th>
            ` : activeTab === 'rooming' ? `
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">رقم القيد</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">الرحلة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">رب الأسرة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">رقم الهاتف</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">الأسماء</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">نوع الغرفة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">فندق مكة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">رقم الحجز</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">الدخول</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">الخروج</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">فندق المدينة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">رقم الحجز</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">الدخول</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">الخروج</th>
            ` : activeTab === 'visa' ? `
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">اسم المعتمر</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">رقم الجواز</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">رقم القيد</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">الرحلة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">المجموعة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">الحالة</th>
            ` : activeTab === 'finance' ? `
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">رقم القيد</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">الرحلة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">رب الأسرة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">رقم الهاتف</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: center;">نوع الغرفة</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">إجمالي د.ل</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">متبقي د.ل</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">إجمالي $</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right;">متبقي $</th>
            ` : `
              <th style="border: 1px solid #333; padding: 12px; text-align: right;">اسم المعتمر</th>
              <th style="border: 1px solid #333; padding: 12px; text-align: center;">رقم الجواز</th>
              <th style="border: 1px solid #333; padding: 12px; text-align: center;">رقم الهاتف</th>
              <th style="border: 1px solid #333; padding: 12px; text-align: center;">الصلة</th>
              <th style="border: 1px solid #333; padding: 12px; text-align: center;">نوع الغرفة</th>
              <th style="border: 1px solid #333; padding: 12px; text-align: right;">رب الأسرة</th>
              <th style="border: 1px solid #333; padding: 12px; text-align: right;">الرحلة</th>
              <th style="border: 1px solid #333; padding: 12px; text-align: center;">حالة التأشيرة</th>
            `}
          </tr>
        </thead>
        <tbody>
          ${activeTab === 'master' ? filteredBookings.map((b, idx) => {
            const remainingLYD = (b.totals?.totalLYD || 0) - (b.paidLYD || 0);
            const remainingUSD = (b.totals?.totalUSD || 0) - (b.paidUSD || 0);
            const trip = trips.find(t => String(t.id).trim() === String(b.tripId || (b as any).tripid || (b as any).trip_id).trim());
            const roomSummary = (b.pilgrims || []).map(p => {
              const label = p.roomType === 'Double' ? 'ثنائية' : 
                            p.roomType === 'Triple' ? 'ثلاثية' : 
                            p.roomType === 'Quad' ? 'رباعية' : 
                            p.roomType === 'Quint' ? 'خماسية' : p.roomType;
              return label;
            }).join(' - ');
            return `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold; color: #d4af37;">${b.regId || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${trip?.name || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; font-weight: bold; white-space: nowrap;">${b.headName || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; font-size: 11px;">${(b.pilgrims || []).map(p => `<div style="margin-bottom: 2px; white-space: nowrap;">${p.name || '---'}</div>`).join('')}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 11px;">${roomSummary}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${b.passengerCount || 0}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${b.phone || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px;">${b.makkahHotel || '---'} (${b.makkahBookingNo || '---'})</td>
              <td style="border: 1px solid #dee2e6; padding: 10px;">${b.madinahHotel || '---'} (${b.madinahBookingNo || '---'})</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold;">${b.groupNo || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${(b.totals?.totalLYD || 0).toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right; color: ${remainingLYD > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">${remainingLYD.toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${(b.totals?.totalUSD || 0).toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right; color: ${remainingUSD > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">${remainingUSD.toLocaleString()}</td>
            </tr>
          `}).join('') : activeTab === 'rooming' ? roomingFilteredBookings.map((b, idx) => {
            const trip = trips.find(t => String(t.id).trim() === String(b.tripId || (b as any).tripid || (b as any).trip_id).trim());
            const roomSummary = (b.pilgrims || []).map(p => {
              const label = p.roomType === 'Double' ? 'ثنائية' : 
                            p.roomType === 'Triple' ? 'ثلاثية' : 
                            p.roomType === 'Quad' ? 'رباعية' : 
                            p.roomType === 'Quint' ? 'خماسية' : p.roomType;
              return label;
            }).join(' - ');
            return `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold; color: #d4af37;">${b.regId || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${trip?.name || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; font-weight: bold; white-space: nowrap;">${b.headName || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; white-space: nowrap;">${b.phone || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; font-size: 10px;">${(b.pilgrims || []).map(p => `<div style="margin-bottom: 2px; white-space: nowrap;">${p.name || '---'}</div>`).join('')}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 10px;">${roomSummary}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px;">${b.makkahHotel || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${b.makkahBookingNo || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${b.makkahCheckIn || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; color: #2b8a3e;">${calculateCheckOut(b.makkahCheckIn, b.makkahNights)}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px;">${b.madinahHotel || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${b.madinahBookingNo || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${b.madinahCheckIn || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; color: #2b8a3e;">${calculateCheckOut(b.madinahCheckIn, b.madinahNights)}</td>
            </tr>
          `; }).join('') : activeTab === 'visa' ? filteredPilgrims.map((p, idx) => {
            const trip = trips.find(t => String(t.id).trim() === String(p.tripId || (p as any).tripid || (p as any).trip_id).trim());
            return `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 10px; font-weight: bold;">${p.name || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${p.passportNo || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; color: #d4af37;">${p.regId || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${trip?.name || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold;">${p.groupNo || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${p.visaStatus || 'Pending'}</td>
            </tr>
          `; }).join('') : activeTab === 'finance' ? filteredBookings.map((b, idx) => {
            const remainingLYD = (b.totals?.totalLYD || 0) - (b.paidLYD || 0);
            const remainingUSD = (b.totals?.totalUSD || 0) - (b.paidUSD || 0);
            const trip = trips.find(t => String(t.id).trim() === String(b.tripId || (b as any).tripid || (b as any).trip_id).trim());
            const roomSummary = (b.pilgrims || []).map(p => {
              const label = p.roomType === 'Double' ? 'ثنائية' : 
                            p.roomType === 'Triple' ? 'ثلاثية' : 
                            p.roomType === 'Quad' ? 'رباعية' : 
                            p.roomType === 'Quint' ? 'خماسية' : p.roomType;
              return label;
            }).join(' - ');
            return `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold; color: #d4af37;">${b.regId || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${trip?.name || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; font-weight: bold; white-space: nowrap;">${b.headName || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; white-space: nowrap;">${b.phone || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 10px;">${roomSummary}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${(b.totals?.totalLYD || 0).toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right; color: ${remainingLYD > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">${remainingLYD.toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${(b.totals?.totalUSD || 0).toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right; color: ${remainingUSD > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">${remainingUSD.toLocaleString()}</td>
            </tr>
          `; }).join('') : filteredPilgrims.map((p, idx) => {
            return `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 10px; font-weight: bold; white-space: nowrap;">${p.name || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-family: monospace;">${p.passportNo || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${bookings.find(b => b.id === p.bookingId)?.phone || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${p.relationship || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${p.roomType || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px;">${p.bookingHead || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; color: #d4af37;">${p.tripName || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${p.visaStatus || 'Pending'}</td>
            </tr>
          `; }).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 14px; border-top: 2px solid #eee; padding-top: 30px;">
        <div style="text-align: center; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 40px;">توقيع المدير المالي</div>
          <div style="border-bottom: 1px dashed #333; width: 100%;"></div>
        </div>
        <div style="text-align: center; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 40px;">ختم الشركة</div>
          <div style="border: 2px solid #d4af37; width: 100px; height: 100px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #d4af37; font-size: 10px; opacity: 0.3;">ختم رسمي</div>
        </div>
      </div>
      
      <div style="position: absolute; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 10px; color: #aaa;">
        تم استخراج هذا التقرير آلياً بواسطة نظام دار المقام لإدارة العمرة
      </div>
    `;
    
    document.body.appendChild(printWindow);

    try {
      // Wait for images to load
      const images = printWindow.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      // Extra delay for rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(printWindow, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1200,
        height: printWindow.offsetHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${activeTab === 'master' ? 'Master' : 'Pilgrims'}_Report_${new Date().toLocaleDateString('ar-LY')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('حدث خطأ أثناء تصدير ملف PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      document.body.removeChild(printWindow);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen bg-matte-black p-8 space-y-8"
    >
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <Logo iconSize={40} textSize="text-4xl" className="hidden md:flex" />
          <div className="h-12 w-px bg-white/10 hidden md:block" />
          <div>
            <h2 className="text-4xl font-bold gold-text-gradient mb-2">
              {activeTab === 'master' ? 'التقرير العام' : 'بيانات المعتمرين'}
            </h2>
            <p className="text-white/60">
              {activeTab === 'master' 
                ? 'عرض شامل للحجوزات، التسكين، المالية، والتأشيرات' 
                : 'إدارة وتعديل بيانات المعتمرين حسب الرحلة المختارة'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportExcel} 
            disabled={!permissions.canExport}
            className="btn-gold bg-emerald-600 border-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button 
            onClick={exportPDF} 
            disabled={!permissions.canExport}
            className="btn-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('master')}
          className={clsx(
            "pb-4 px-2 flex items-center gap-2 transition-all relative whitespace-nowrap",
            activeTab === 'master' ? "text-gold" : "text-white/40 hover:text-white"
          )}
        >
          <FileBarChart className="w-4 h-4" />
          <span>التقرير العام</span>
          {activeTab === 'master' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
        </button>
        <button 
          onClick={() => setActiveTab('rooming')}
          className={clsx(
            "pb-4 px-2 flex items-center gap-2 transition-all relative whitespace-nowrap",
            activeTab === 'rooming' ? "text-gold" : "text-white/40 hover:text-white"
          )}
        >
          <Hotel className="w-4 h-4" />
          <span>تقرير التسكين</span>
          {activeTab === 'rooming' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
        </button>
        <button 
          onClick={() => setActiveTab('visa')}
          className={clsx(
            "pb-4 px-2 flex items-center gap-2 transition-all relative whitespace-nowrap",
            activeTab === 'visa' ? "text-gold" : "text-white/40 hover:text-white"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>تقرير التأشيرات</span>
          {activeTab === 'visa' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
        </button>
        <button 
          onClick={() => setActiveTab('finance')}
          className={clsx(
            "pb-4 px-2 flex items-center gap-2 transition-all relative whitespace-nowrap",
            activeTab === 'finance' ? "text-gold" : "text-white/40 hover:text-white"
          )}
        >
          <DollarSign className="w-4 h-4" />
          <span>تقرير المالية</span>
          {activeTab === 'finance' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
        </button>
        <button 
          onClick={() => setActiveTab('reminders')}
          className={clsx(
            "pb-4 px-2 flex items-center gap-2 transition-all relative whitespace-nowrap",
            activeTab === 'reminders' ? "text-gold" : "text-white/40 hover:text-white"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          <span>تنبيهات الدفع</span>
          {activeTab === 'reminders' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
        </button>
        <button 
          onClick={() => setActiveTab('pilgrims')}
          className={clsx(
            "pb-4 px-2 flex items-center gap-2 transition-all relative whitespace-nowrap",
            activeTab === 'pilgrims' ? "text-gold" : "text-white/40 hover:text-white"
          )}
        >
          <Users className="w-4 h-4" />
          <span>بيانات المعتمرين</span>
          {activeTab === 'pilgrims' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
        </button>
      </div>

      <div className="glass-card p-6 flex flex-wrap gap-4 items-end">
        <div className="space-y-2 flex-1 min-w-[250px]">
          <label className="text-xs text-white/60 font-bold">بحث سريع</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text" 
              className="input-field w-full pl-10 text-right" 
              placeholder={
                activeTab === 'master' ? "بحث برقم الفاتورة، الرحلة، أو الاسم..." : 
                activeTab === 'visa' ? "بحث باسم المعتمر، الجواز، أو رقم القيد..." :
                "بحث..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 min-w-[180px]">
          <label className="text-xs text-white/60 font-bold">الرحلة</label>
          <select 
            className="input-field w-full"
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
          >
            <option value="">كل الرحلات</option>
            {trips.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {(activeTab === 'master' || activeTab === 'pilgrims') && (
          <div className="space-y-2 min-w-[150px]">
            <label className="text-xs text-white/60 font-bold">شركة الطيران</label>
            <select 
              className="input-field w-full"
              value={selectedAirline}
              onChange={(e) => setSelectedAirline(e.target.value)}
            >
              <option value="">الكل</option>
              {Array.from(new Set(trips.map(t => t.airline).filter(Boolean))).map(airline => (
                <option key={airline} value={airline}>{airline}</option>
              ))}
            </select>
          </div>
        )}

        {(activeTab === 'master' || activeTab === 'pilgrims') && (
          <div className="space-y-2 min-w-[150px]">
            <label className="text-xs text-white/60 font-bold">الحالة</label>
            <select 
              className="input-field w-full"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">الكل</option>
              <option value="Confirmed">مؤكد</option>
              <option value="Pending">قيد الانتظار</option>
              <option value="Cancelled">ملغي</option>
            </select>
          </div>
        )}

        {(activeTab === 'master' || activeTab === 'pilgrims' || activeTab === 'visa') && (
          <div className="space-y-2 min-w-[150px]">
            <label className="text-xs text-white/60 font-bold">رقم المجموعة</label>
            <select 
              className="input-field w-full"
              value={selectedGroupNo}
              onChange={(e) => setSelectedGroupNo(e.target.value)}
            >
              <option value="">الكل</option>
              {Array.from(new Set(bookings.map(b => b.groupNo).filter(Boolean))).map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
        )}

        {(activeTab === 'master' || activeTab === 'pilgrims' || activeTab === 'visa') && (
          <div className="space-y-2 min-w-[150px]">
            <label className="text-xs text-white/60 font-bold">حالة المجموعة</label>
            <select 
              className="input-field w-full"
              value={groupExistence}
              onChange={(e) => setGroupExistence(e.target.value as any)}
            >
              <option value="all">الكل</option>
              <option value="entered">مدخل</option>
              <option value="not_entered">غير مدخل</option>
            </select>
          </div>
        )}

        {activeTab === 'rooming' && (
          <div className="space-y-2 min-w-[150px]">
            <label className="text-xs text-white/60 font-bold">رقم حجز الفندق</label>
            <select 
              className="input-field w-full"
              value={roomingExistence}
              onChange={(e) => setRoomingExistence(e.target.value as any)}
            >
              <option value="all">الكل</option>
              <option value="entered">مدخل</option>
              <option value="not_entered">غير مدخل</option>
            </select>
          </div>
        )}

        <div className="space-y-2 min-w-[150px]">
          <label className="text-xs text-white/60 font-bold">من تاريخ</label>
          <input 
            type="date" 
            className="input-field w-full"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="space-y-2 min-w-[150px]">
          <label className="text-xs text-white/60 font-bold">إلى تاريخ</label>
          <input 
            type="date" 
            className="input-field w-full"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {(activeTab === 'master' || activeTab === 'finance') && (
            <button 
              onClick={() => setFilterRemainingOnly(!filterRemainingOnly)}
              className={clsx(
                "px-4 py-2 border rounded-lg text-xs transition-all h-[42px]",
                filterRemainingOnly ? "bg-gold text-black border-gold" : "bg-white/5 border-white/10 text-white/60 hover:border-gold"
              )}
            >
              مبالغ متبقية
            </button>
          )}
          
          {(searchTerm || selectedTripId || selectedAirline || selectedStatus || selectedGroupNo || groupExistence !== 'all' || roomingExistence !== 'all' || dateFrom || dateTo || filterRemainingOnly) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedTripId('');
                setSelectedAirline('');
                setSelectedStatus('');
                setSelectedGroupNo('');
                setGroupExistence('all');
                setRoomingExistence('all');
                setDateFrom('');
                setDateTo('');
                setFilterRemainingOnly(false);
              }}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-all h-[42px]"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto p-4" id="reports-table">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <Logo iconSize={24} textSize="text-2xl" />
            <div className="text-right">
              <h3 className="text-gold font-bold">
                {activeTab === 'master' ? 'التقرير العام' : 
                 activeTab === 'rooming' ? 'تقرير التسكين' :
                 activeTab === 'visa' ? 'تقرير التأشيرات' :
                 activeTab === 'finance' ? 'التقرير المالي' :
                 'بيانات المعتمرين'}
              </h3>
              <p className="text-xs text-white/40">{new Date().toLocaleDateString('ar-LY')}</p>
            </div>
          </div>
          {activeTab === 'master' ? (
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 uppercase text-white/40">
                <tr>
                  <th className="px-4 py-4">رقم القيد</th>
                  <th className="px-4 py-4">الرحلة</th>
                  <th className="px-4 py-4">رب الأسرة</th>
                  <th className="px-4 py-4">الأسماء</th>
                  <th className="px-4 py-4">نوع الغرفة</th>
                  <th className="px-4 py-4">العدد</th>
                  <th className="px-4 py-4">رقم الهاتف</th>
                  <th className="px-4 py-4">فندق مكة (رقم الحجز)</th>
                  <th className="px-4 py-4">فندق المدينة (رقم الحجز)</th>
                  <th className="px-4 py-4">المجموعة</th>
                  <th className="px-4 py-4">إجمالي د.ل</th>
                  <th className="px-4 py-4">متبقي د.ل</th>
                  <th className="px-4 py-4">إجمالي $</th>
                  <th className="px-4 py-4">متبقي $</th>
                  <th className="px-4 py-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBookings.map((b, idx) => {
                  const remainingLYD = (b.totals?.totalLYD || 0) - (b.paidLYD || 0);
                  const remainingUSD = (b.totals?.totalUSD || 0) - (b.paidUSD || 0);
                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 font-mono text-gold font-bold">
                        <button 
                          onClick={() => navigate(`/booking/${b.id}`)}
                          className="hover:underline"
                        >
                          {b.regId || '---'}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-white/60">
                        {getTripName(b)}
                      </td>
                      <td className="px-4 py-4 font-medium whitespace-nowrap">{b.headName || '---'}</td>
                      <td className="px-4 py-4 text-[10px] text-white/60 max-w-[200px]">
                        <div className="flex flex-col gap-1">
                          {(b.pilgrims || []).map((p, pIdx) => (
                            <div key={pIdx} className="whitespace-nowrap">{p.name || '---'}</div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[10px] text-gold/60">
                        {(b.pilgrims || []).map(p => {
                          const label = p.roomType === 'Double' ? 'ثنائية' : 
                                        p.roomType === 'Triple' ? 'ثلاثية' : 
                                        p.roomType === 'Quad' ? 'رباعية' : 
                                        p.roomType === 'Quint' ? 'خماسية' : p.roomType;
                          return label;
                        }).join(' - ')}
                      </td>
                      <td className="px-4 py-4">{b.passengerCount || 0}</td>
                      <td className="px-4 py-4 font-mono text-white/60">{b.phone || '---'}</td>
                      <td className="px-4 py-4 text-xs">
                        {b.makkahHotel}
                        <div className="text-[10px] text-white/40">{b.makkahBookingNo || '---'}</div>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {b.madinahHotel}
                        <div className="text-[10px] text-white/40">{b.madinahBookingNo || '---'}</div>
                      </td>
                      <td className="px-4 py-4 font-bold text-gold">{b.groupNo || '---'}</td>
                      <td className="px-4 py-4 font-bold">{(b.totals?.totalLYD || 0).toLocaleString()}</td>
                      <td className={clsx(
                        "px-4 py-4 font-bold",
                        remainingLYD > 0 ? "text-red-400" : "text-emerald-400"
                      )}>
                        {remainingLYD.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 font-bold">{(b.totals?.totalUSD || 0).toLocaleString()}</td>
                      <td className={clsx(
                        "px-4 py-4 font-bold",
                        remainingUSD > 0 ? "text-red-400" : "text-emerald-400"
                      )}>
                        {remainingUSD.toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => {
                              const trip = trips.find(t => String(t.id).trim() === String(b.tripId || (b as any).tripid || (b as any).trip_id).trim());
                              if (b.phone && trip) {
                                const msg = generateTripDetailsMessage(b, trip);
                                sendWhatsAppMessage(b.phone, msg);
                              }
                            }}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg"
                            title="إرسال تفاصيل الرحلة عبر واتساب"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => navigate(`/booking/${b.id}`)}
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {permissions.canDelete && (
                            <div className="flex items-center gap-1">
                              {confirmDeleteBookingId === b.id ? (
                                <div className="flex items-center gap-1 bg-red-500/20 p-1 rounded-lg border border-red-500/30">
                                  <button 
                                    onClick={() => handleDeleteBooking(b.id)}
                                    className="p-1 hover:bg-red-500 text-white rounded transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDeleteBookingId(null)}
                                    className="p-1 hover:bg-gray-500 text-white rounded transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setConfirmDeleteBookingId(b.id)}
                                  className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : activeTab === 'rooming' ? (
            <table className="w-full text-right text-[10px]">
              <thead className="bg-white/5 uppercase text-white/40">
                <tr>
                  <th className="px-2 py-3">رقم القيد</th>
                  <th className="px-2 py-3">الرحلة</th>
                  <th className="px-2 py-3">رب الأسرة</th>
                  <th className="px-2 py-3">رقم الهاتف</th>
                  <th className="px-2 py-3">الأسماء</th>
                  <th className="px-2 py-3">نوع الغرفة</th>
                  <th className="px-2 py-3 bg-gold/5">فندق مكة</th>
                  <th className="px-2 py-3 bg-gold/5">رقم الحجز</th>
                  <th className="px-2 py-3 bg-gold/5">الدخول</th>
                  <th className="px-2 py-3 bg-gold/5">الخروج</th>
                  <th className="px-2 py-3 bg-blue-500/5">فندق المدينة</th>
                  <th className="px-2 py-3 bg-blue-500/5">رقم الحجز</th>
                  <th className="px-2 py-3 bg-blue-500/5">الدخول</th>
                  <th className="px-2 py-3 bg-blue-500/5">الخروج</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {roomingFilteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-2 py-3 font-mono text-gold">{b.regId || '---'}</td>
                    <td className="px-2 py-3 text-white/60">
                      {getTripName(b)}
                    </td>
                    <td className="px-2 py-3 font-medium whitespace-nowrap">{b.headName || '---'}</td>
                    <td className="px-2 py-3 font-mono text-white/60">{b.phone || '---'}</td>
                    <td className="px-2 py-3 text-white/60 max-w-[150px]">
                      <div className="flex flex-col gap-1">
                        {(b.pilgrims || []).map((p, idx) => (
                          <div key={idx} className="whitespace-nowrap" title={p.name}>{p.name || '---'}</div>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-[9px] text-gold/60">
                      <div className="flex flex-col gap-1">
                        {(b.pilgrims || []).map((p, idx) => {
                          const label = p.roomType === 'Double' ? 'ثنائية' : 
                                        p.roomType === 'Triple' ? 'ثلاثية' : 
                                        p.roomType === 'Quad' ? 'رباعية' : 
                                        p.roomType === 'Quint' ? 'خماسية' : p.roomType;
                          return <div key={idx}>{label}</div>;
                        })}
                      </div>
                    </td>
                    <td className="px-2 py-3 bg-gold/5">{b.makkahHotel || '---'}</td>
                    <td className="px-2 py-3 bg-gold/5">{b.makkahBookingNo || '---'}</td>
                    <td className="px-2 py-3 bg-gold/5">{b.makkahCheckIn || '---'}</td>
                    <td className="px-2 py-3 bg-gold/5 font-mono text-emerald-400">
                      {calculateCheckOut(b.makkahCheckIn, b.makkahNights)}
                    </td>
                    <td className="px-2 py-3 bg-blue-500/5">{b.madinahHotel || '---'}</td>
                    <td className="px-2 py-3 bg-blue-500/5">{b.madinahBookingNo || '---'}</td>
                    <td className="px-2 py-3 bg-blue-500/5">{b.madinahCheckIn || '---'}</td>
                    <td className="px-2 py-3 bg-blue-500/5 font-mono text-emerald-400">
                      {calculateCheckOut(b.madinahCheckIn, b.madinahNights)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'visa' ? (
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 uppercase text-white/40">
                <tr>
                  <th className="px-4 py-4">اسم المعتمر</th>
                  <th className="px-4 py-4">رقم الجواز</th>
                  <th className="px-4 py-4">رقم القيد</th>
                  <th className="px-4 py-4">الرحلة</th>
                  <th className="px-4 py-4">رقم المجموعة</th>
                  <th className="px-4 py-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPilgrims.map((p, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 font-medium">{p.name || '---'}</td>
                    <td className="px-4 py-4 font-mono text-white/60">{p.passportNo || '---'}</td>
                    <td className="px-4 py-4 text-xs text-gold">{p.regId || '---'}</td>
                    <td className="px-4 py-4 text-white/40">
                      {p.tripName || '---'}
                    </td>
                    <td className="px-4 py-4 font-bold text-gold">{p.groupNo || '---'}</td>
                    <td className="px-4 py-4">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        p.visaStatus === 'Pending' && "text-yellow-500 border-yellow-500/20",
                        p.visaStatus === 'Processed' && "text-blue-500 border-blue-500/20",
                        p.visaStatus === 'Visa Issued' && "text-emerald-500 border-emerald-500/20"
                      )}>
                        {p.visaStatus || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'finance' ? (
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 uppercase text-white/40">
                <tr>
                  <th className="px-4 py-4">رقم القيد</th>
                  <th className="px-4 py-4">الرحلة</th>
                  <th className="px-4 py-4">رب الأسرة</th>
                  <th className="px-4 py-4">رقم الهاتف</th>
                  <th className="px-4 py-4">نوع الغرفة</th>
                  <th className="px-4 py-4">إجمالي د.ل</th>
                  <th className="px-4 py-4">مدفوع د.ل</th>
                  <th className="px-4 py-4">متبقي د.ل</th>
                  <th className="px-4 py-4">إجمالي $</th>
                  <th className="px-4 py-4">مدفوع $</th>
                  <th className="px-4 py-4">متبقي $</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBookings.map((b, idx) => {
                  const remainingLYD = (b.totals?.totalLYD || 0) - (b.paidLYD || 0);
                  const remainingUSD = (b.totals?.totalUSD || 0) - (b.paidUSD || 0);
                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 font-mono text-gold font-bold">{b.regId || '---'}</td>
                      <td className="px-4 py-4 text-white/60">
                        {getTripName(b)}
                      </td>
                      <td className="px-4 py-4 font-medium whitespace-nowrap">{b.headName || '---'}</td>
                      <td className="px-4 py-4 font-mono text-white/60">{b.phone || '---'}</td>
                      <td className="px-4 py-4 text-[10px] text-gold/60">
                        {(b.pilgrims || []).map(p => {
                          const label = p.roomType === 'Double' ? 'ثنائية' : 
                                        p.roomType === 'Triple' ? 'ثلاثية' : 
                                        p.roomType === 'Quad' ? 'رباعية' : 
                                        p.roomType === 'Quint' ? 'خماسية' : p.roomType;
                          return label;
                        }).join(' - ')}
                      </td>
                      <td className="px-4 py-4">{(b.totals?.totalLYD || 0).toLocaleString()}</td>
                      <td className="px-4 py-4">{(b.paidLYD || 0).toLocaleString()}</td>
                      <td className={clsx(
                        "px-4 py-4 font-bold",
                        remainingLYD > 0 ? "text-red-400" : "text-emerald-400"
                      )}>
                        {remainingLYD.toLocaleString()}
                      </td>
                      <td className="px-4 py-4">{(b.totals?.totalUSD || 0).toLocaleString()}</td>
                      <td className="px-4 py-4">{(b.paidUSD || 0).toLocaleString()}</td>
                      <td className={clsx(
                        "px-4 py-4 font-bold",
                        remainingUSD > 0 ? "text-red-400" : "text-emerald-400"
                      )}>
                        {remainingUSD.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : activeTab === 'reminders' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-rose-500">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-bold">تنبيهات الدفع المستحقة (الرحلات القريبة)</span>
                </div>
                <span className="text-xs text-rose-500/60">يتم عرض الحجوزات غير المسددة بالكامل للرحلات التي تبدأ خلال 15 يوماً</span>
              </div>
              <table className="w-full text-right text-xs">
                <thead className="bg-white/5 uppercase text-white/40">
                  <tr>
                    <th className="px-4 py-4 text-right">المعتمر</th>
                    <th className="px-4 py-4 text-right">الرحلة</th>
                    <th className="px-4 py-4 text-right">المبلغ المتبقي</th>
                    <th className="px-4 py-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {getPaymentReminders().map((b, idx) => {
                    const remainingLYD = (b.totals?.totalLYD || 0) - (b.paidLYD || 0);
                    const remainingUSD = (b.totals?.totalUSD || 0) - (b.paidUSD || 0);
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold">{b.headName}</div>
                          <div className="text-[10px] text-white/40 font-mono">{b.phone}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-gold">{getTripName(b)}</div>
                          <div className="text-[10px] text-white/40">
                            {trips.find(t => String(t.id) === String(b.tripId))?.startDate || '---'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            {remainingLYD > 0 && <div className="text-red-400 font-bold">{remainingLYD.toLocaleString()} د.ل</div>}
                            {remainingUSD > 0 && <div className="text-red-400 font-bold">{remainingUSD.toLocaleString()} $</div>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button 
                            onClick={() => sendPaymentReminder(b)}
                            className="btn-gold py-1.5 px-3 text-[10px] flex items-center gap-2 mx-auto"
                          >
                            <MessageSquare className="w-3 h-3" />
                            إرسال تذكير
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {getPaymentReminders().length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-white/40 italic">
                        لا توجد تنبيهات دفع حالياً
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 uppercase text-white/40">
                <tr>
                  <th className="px-4 py-4">اسم المعتمر</th>
                  <th className="px-4 py-4">رقم الجواز</th>
                  <th className="px-4 py-4">رقم الهاتف</th>
                  <th className="px-4 py-4">الصلة</th>
                  <th className="px-4 py-4">نوع الغرفة</th>
                  <th className="px-4 py-4">رب الأسرة</th>
                  <th className="px-4 py-4">الرحلة</th>
                  <th className="px-4 py-4">حالة التأشيرة</th>
                  <th className="px-4 py-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPilgrims.map((p, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4">
                      {editingPilgrim?.bookingId === p.bookingId && editingPilgrim?.pilgrimIdx === p.pilgrimIdx ? (
                        <input 
                          type="text" 
                          className="input-field py-1 px-2 w-full" 
                          value={editingPilgrim.data.name} 
                          onChange={(e) => setEditingPilgrim({...editingPilgrim, data: {...editingPilgrim.data, name: e.target.value}})}
                        />
                      ) : (
                        <span className="font-medium">{p.name || '---'}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono">
                      {editingPilgrim?.bookingId === p.bookingId && editingPilgrim?.pilgrimIdx === p.pilgrimIdx ? (
                        <input 
                          type="text" 
                          className="input-field py-1 px-2 w-full" 
                          value={editingPilgrim.data.passportNo} 
                          onChange={(e) => setEditingPilgrim({...editingPilgrim, data: {...editingPilgrim.data, passportNo: e.target.value}})}
                        />
                      ) : (
                        p.passportNo || '---'
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-white/60">
                      {bookings.find(b => b.id === p.bookingId)?.phone || '---'}
                    </td>
                    <td className="px-4 py-4">{p.relationship || '---'}</td>
                    <td className="px-4 py-4">
                      {p.roomType === 'Double' ? 'ثنائية' : 
                       p.roomType === 'Triple' ? 'ثلاثية' : 
                       p.roomType === 'Quad' ? 'رباعية' : 
                       p.roomType === 'Quint' ? 'خماسية' : 'تأشيرة فقط'}
                    </td>
                    <td className="px-4 py-4 text-white/60">{p.bookingHead || '---'}</td>
                    <td className="px-4 py-4 text-gold">{p.tripName || '---'}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {p.visaStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => {
                            const booking = bookings.find(b => b.id === p.bookingId);
                            const trip = trips.find(t => t.name === p.tripName);
                            if (booking?.phone && trip) {
                              const msg = generateTripDetailsMessage(booking, trip);
                              sendWhatsAppMessage(booking.phone, msg);
                            }
                          }}
                          className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg"
                          title="إرسال تفاصيل الرحلة عبر واتساب"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        {editingPilgrim?.bookingId === p.bookingId && editingPilgrim?.pilgrimIdx === p.pilgrimIdx ? (
                          <>
                            <button onClick={handleSaveEdit} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingPilgrim(null)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => setEditingPilgrim({ bookingId: p.bookingId, pilgrimIdx: p.pilgrimIdx, data: { name: p.name, passportNo: p.passportNo } })}
                              className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {permissions.canDelete && (
                              <div className="flex items-center gap-1">
                                {confirmDeletePilgrimKey === `${p.bookingId}-${p.pilgrimIdx}` ? (
                                  <div className="flex items-center gap-1 bg-red-500/20 p-1 rounded-lg border border-red-500/30">
                                    <span className="text-[10px] text-red-400 font-bold px-1">تأكيد؟</span>
                                    <button 
                                      onClick={() => handleDeletePilgrim(p.bookingId, p.pilgrimIdx)}
                                      className="p-1 hover:bg-red-500 text-white rounded transition-colors"
                                      title="Confirm Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => setConfirmDeletePilgrimKey(null)}
                                      className="p-1 hover:bg-gray-500 text-white rounded transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setConfirmDeletePilgrimKey(`${p.bookingId}-${p.pilgrimIdx}`)}
                                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"
                                    title="Delete Pilgrim"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
