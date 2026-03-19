import React, { useState, useEffect } from 'react';
import { User, Trip, Booking } from '../types';
import { api } from '../services/api';
import { getRolePermissions } from '../utils/dataUtils';
import { motion } from 'motion/react';
import { Search, MapPin, Trash2, FileSpreadsheet, FileText, Download, X, Save, CheckCircle2, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import domtoimage from 'dom-to-image-more';
import * as XLSX from 'xlsx';
import { addDays, format, parseISO, isValid } from 'date-fns';
import { clsx } from 'clsx';
import Logo from './Logo';

import html2canvas from 'html2canvas';

export default function RoomingModule({ user }: { user: User }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteBookingId, setConfirmDeleteBookingId] = useState<string | null>(null);
  const [pendingSaveIds, setPendingSaveIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState<string | null>(null); // ID of booking being saved or 'all'
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tripsData, bookingsData] = await Promise.all([
          api.getTrips(),
          api.getBookings()
        ]);
        setTrips(tripsData);
        setBookings(bookingsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const permissions = getRolePermissions(user.role);

  const handleLocalUpdate = (bookingId: string, updates: Partial<Booking>) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updates } : b));
    setPendingSaveIds(prev => {
      const next = new Set(prev);
      next.add(bookingId);
      return next;
    });
  };

  const handleSaveBooking = async (bookingId: string) => {
    if (!permissions.canEdit) return;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    setIsSaving(bookingId);
    try {
      await api.saveBooking(booking);
      setPendingSaveIds(prev => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
      setSaveSuccess(bookingId);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving booking:', error);
      alert('حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setIsSaving(null);
    }
  };

  const handleSaveAll = async () => {
    if (!permissions.canEdit || pendingSaveIds.size === 0) return;
    
    setIsSaving('all');
    try {
      const bookingsToSave = bookings.filter(b => pendingSaveIds.has(b.id));
      await Promise.all(bookingsToSave.map(b => api.saveBooking(b)));
      setPendingSaveIds(new Set());
      alert('تم حفظ جميع التعديلات بنجاح');
    } catch (error) {
      console.error('Error saving all bookings:', error);
      alert('حدث خطأ أثناء حفظ بعض التعديلات');
    } finally {
      setIsSaving(null);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!bookingId) return;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      console.log('Deleting booking from rooming:', bookingId);
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

  const filteredBookings = bookings
    .map(b => ({
      ...b,
      pilgrims: b.pilgrims.filter(p => p.roomType !== 'VisaOnly')
    }))
    .filter(b => {
      if (b.pilgrims.length === 0) return false;
      const bTripId = String(b.tripId || (b as any).tripid || (b as any).trip_id || '').trim().toLowerCase();
      const sTripId = String(selectedTripId).trim().toLowerCase();
      const matchesTrip = !selectedTripId || bTripId === sTripId;
      const matchesSearch = (b.headName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                            (b.regId?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      return matchesTrip && matchesSearch;
    });

  const getRoomTypeArabic = (type?: string) => {
    switch (type) {
      case 'Double': return 'ثنائية';
      case 'Triple': return 'ثلاثية';
      case 'Quad': return 'رباعية';
      case 'Quint': return 'خماسية';
      case 'VisaOnly': return 'تأشيرة فقط';
      default: return type || '---';
    }
  };

  const exportExcel = () => {
    if (!selectedTripId) {
      alert('يرجى اختيار رحلة أولاً لتصدير البيانات');
      return;
    }
    const tripName = trips.find(t => String(t.id).trim() === String(selectedTripId).trim())?.name || 'رحلة';
    const data = filteredBookings.map(b => ({
      'رقم القيد': b.regId,
      'رب الأسرة': b.headName,
      'الأسماء': b.pilgrims.map(p => p.name).join('\n'),
      'نوع الغرفة': b.pilgrims.map(p => getRoomTypeArabic(p.roomType)).join('\n'),
      'فندق مكة': b.makkahHotel,
      'رقم حجز مكة': b.makkahBookingNo || '',
      'ليالي مكة': b.makkahNights,
      'دخول مكة': b.makkahCheckIn || '',
      'خروج مكة': calculateCheckOut(b.makkahCheckIn, b.makkahNights),
      'فندق المدينة': b.madinahHotel,
      'رقم حجز المدينة': b.madinahBookingNo || '',
      'ليالي المدينة': b.madinahNights,
      'دخول المدينة': b.madinahCheckIn || '',
      'خروج المدينة': calculateCheckOut(b.madinahCheckIn, b.madinahNights),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rooming List");
    XLSX.writeFile(wb, `تسكين_${tripName}_${new Date().toLocaleDateString('ar-LY')}.xlsx`);
  };

  const exportPDF = async () => {
    if (!selectedTripId) {
      alert('يرجى اختيار رحلة أولاً لتصدير التقرير');
      return;
    }
    
    const trip = trips.find(t => String(t.id) === String(selectedTripId));
    const tripName = trip?.name;
    const reportTitle = tripName ? `تقرير التسكين لرحلة ${tripName}` : 'تقرير التسكين';
    
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
        return url; // Fallback to original URL
      }
    };

    const rawLogo = localStorage.getItem('app_logo') || "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10L15 40V90H85V40L50 10Z' fill='%23D4AF37' fill-opacity='0.2' stroke='%23D4AF37' stroke-width='2'/%3E%3Cpath d='M50 30L30 50V80H70V50L50 30Z' fill='%23D4AF37' stroke='%23D4AF37' stroke-width='2'/%3E%3Ccircle cx='50' cy='20' r='5' fill='%23D4AF37'/%3E%3C/svg%3E";
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
          <h1 style="font-size: 56px; color: #d4af37; margin: 0; font-family: 'Amiri', serif; font-weight: bold; line-height: 1.2;">${reportTitle}</h1>
          <p style="font-size: 24px; color: #555; margin: 15px 0 0 0; font-weight: 500;">دار المقام لإدارة العمرة والخدمات السياحية</p>
        </div>
        <div style="text-align: left; border-right: 2px solid #eee; padding-right: 30px;">
          <div style="font-size: 16px; color: #999; margin-bottom: 5px;">تاريخ التصدير</div>
          <div style="font-size: 22px; font-weight: bold; color: #1a1a1a;">${new Date().toLocaleDateString('ar-LY')}</div>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: sans-serif;">
        <thead>
          <tr style="background-color: #1a1a1a; color: #ffffff;">
            <th style="border: 1px solid #333; padding: 12px; text-align: center;">رقم القيد</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: right;">رب الأسرة</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center;">رقم الهاتف</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: right;">الأسماء</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center;">نوع الغرفة</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: right; background-color: #d4af37; color: #000;">فندق مكة</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center; background-color: #d4af37; color: #000;">رقم الحجز</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center; background-color: #d4af37; color: #000;">الليالي</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center; background-color: #d4af37; color: #000;">الدخول</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center; background-color: #d4af37; color: #000;">الخروج</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: right; background-color: #2c3e50; color: #fff;">فندق المدينة</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center; background-color: #2c3e50; color: #fff;">رقم الحجز</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center; background-color: #2c3e50; color: #fff;">الليالي</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center; background-color: #2c3e50; color: #fff;">الدخول</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center; background-color: #2c3e50; color: #fff;">الخروج</th>
          </tr>
        </thead>
        <tbody>
          ${filteredBookings.map((b, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold; color: #d4af37;">${b.regId}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; font-weight: bold; white-space: nowrap;">${b.headName}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; white-space: nowrap;">${b.phone || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px;">
                ${b.pilgrims.map(p => `<div style="margin-bottom: 2px; white-space: nowrap;">• ${p.name}</div>`).join('')}
              </td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">
                ${b.pilgrims.map(p => `<div>${getRoomTypeArabic(p.roomType)}</div>`).join('')}
              </td>
              <td style="border: 1px solid #dee2e6; padding: 10px; background-color: #fffdf2;">${b.makkahHotel}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; background-color: #fffdf2;">${b.makkahBookingNo || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; background-color: #fffdf2;">${b.makkahNights}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; background-color: #fffdf2;">${b.makkahCheckIn || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; background-color: #fffdf2; font-weight: bold; color: #2b8a3e;">${calculateCheckOut(b.makkahCheckIn, b.makkahNights)}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; background-color: #f4f7f9;">${b.madinahHotel}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; background-color: #f4f7f9;">${b.madinahBookingNo || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; background-color: #f4f7f9;">${b.madinahNights}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; background-color: #f4f7f9;">${b.madinahCheckIn || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; background-color: #f4f7f9; font-weight: bold; color: #2b8a3e;">${calculateCheckOut(b.madinahCheckIn, b.madinahNights)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 14px; border-top: 2px solid #eee; padding-top: 30px;">
        <div style="text-align: center; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 40px;">توقيع مشرف الرحلة</div>
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
      pdf.save(`تسكين_${tripName}_${new Date().toLocaleDateString('ar-LY')}.pdf`);
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
            <h2 className="text-4xl font-bold gold-text-gradient mb-2">تسكين الفنادق</h2>
            <p className="text-white/60">إدارة حجوزات الفنادق وتواريخ الدخول والخروج</p>
          </div>
        </div>
        <div className="flex gap-3">
          {pendingSaveIds.size > 0 && (
            <button 
              onClick={handleSaveAll}
              disabled={isSaving !== null}
              className="btn-gold bg-emerald-600 border-none flex items-center gap-2 animate-pulse"
            >
              {isSaving === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الكل ({pendingSaveIds.size})
            </button>
          )}
          <button 
            onClick={exportExcel} 
            disabled={!selectedTripId}
            className={clsx(
              "btn-gold bg-emerald-600 border-none flex items-center gap-2 transition-all",
              !selectedTripId && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button 
            onClick={exportPDF} 
            disabled={!selectedTripId}
            className={clsx(
              "btn-gold flex items-center gap-2 transition-all",
              !selectedTripId && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="glass-card p-6 flex flex-wrap gap-4 items-end">
        <div className="space-y-2 flex-1 min-w-[250px]">
          <label className="text-xs text-white/60">اختر الرحلة</label>
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
        <div className="space-y-2 flex-1 min-w-[250px]">
          <label className="text-xs text-white/60">بحث (الاسم أو رقم القيد)</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text" 
              className="input-field w-full pr-10" 
              placeholder="بحث..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto p-4" id="rooming-table">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <Logo iconSize={24} textSize="text-2xl" />
            <div className="text-right">
              <h3 className="text-gold font-bold">قائمة تسكين الفنادق</h3>
              <p className="text-xs text-white/40">{new Date().toLocaleDateString('ar-LY')}</p>
            </div>
          </div>
          <table className="w-full text-right text-[10px]">
            <thead className="bg-white/5 uppercase text-white/40">
              <tr>
                <th className="px-2 py-3">رقم القيد</th>
                <th className="px-2 py-3">رب الأسرة</th>
                <th className="px-2 py-3">رقم الهاتف</th>
                <th className="px-2 py-3">الأسماء</th>
                <th className="px-2 py-3">نوع الغرفة</th>
                <th className="px-2 py-3 bg-gold/5">فندق مكة</th>
                <th className="px-2 py-3 bg-gold/5">رقم الحجز</th>
                <th className="px-2 py-3 bg-gold/5">الليالي</th>
                <th className="px-2 py-3 bg-gold/5">الدخول</th>
                <th className="px-2 py-3 bg-gold/5">الخروج</th>
                <th className="px-2 py-3 bg-blue-500/5">فندق المدينة</th>
                <th className="px-2 py-3 bg-blue-500/5">رقم الحجز</th>
                <th className="px-2 py-3 bg-blue-500/5">الليالي</th>
                <th className="px-2 py-3 bg-blue-500/5">الدخول</th>
                <th className="px-2 py-3 bg-blue-500/5">الخروج</th>
                <th className="px-2 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center text-white/20 italic">
                    {selectedTripId ? 'لا توجد حجوزات لهذه الرحلة' : 'يرجى اختيار رحلة لعرض بيانات التسكين'}
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-2 py-3 font-mono text-gold">{b.regId}</td>
                    <td className="px-2 py-3 font-medium whitespace-nowrap">{b.headName}</td>
                    <td className="px-2 py-3 font-mono text-white/60">{b.phone || '---'}</td>
                    <td className="px-2 py-3 text-white/60 max-w-[150px]">
                      <div className="flex flex-col gap-1">
                        {b.pilgrims.map((p, idx) => (
                          <div key={idx} className="whitespace-nowrap" title={p.name}>{p.name}</div>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-gold/80">
                      <div className="flex flex-col gap-1">
                        {b.pilgrims.map((p, idx) => (
                          <div key={idx}>{getRoomTypeArabic(p.roomType)}</div>
                        ))}
                      </div>
                    </td>
                    
                    {/* Makkah Section */}
                    <td className="px-2 py-3 bg-gold/5">{b.makkahHotel}</td>
                    <td className="px-2 py-3 bg-gold/5">
                      <input 
                        type="text" 
                        className={clsx(
                          "bg-transparent border-b outline-none w-16 py-1",
                          !b.makkahBookingNo ? "border-red-500/50 placeholder-red-400" : "border-white/10 focus:border-gold"
                        )}
                        placeholder="ناقص"
                        value={b.makkahBookingNo || ''}
                        onChange={(e) => handleLocalUpdate(b.id, { makkahBookingNo: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-3 bg-gold/5">{b.makkahNights}</td>
                    <td className="px-2 py-3 bg-gold/5">
                      <input 
                        type="date" 
                        className="bg-transparent border-b border-white/10 focus:border-gold outline-none w-24 py-1 text-[9px]"
                        value={b.makkahCheckIn || ''}
                        onChange={(e) => handleLocalUpdate(b.id, { makkahCheckIn: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-3 bg-gold/5 font-mono text-emerald-400">
                      {calculateCheckOut(b.makkahCheckIn, b.makkahNights)}
                    </td>

                    {/* Madinah Section */}
                    <td className="px-2 py-3 bg-blue-500/5">{b.madinahHotel}</td>
                    <td className="px-2 py-3 bg-blue-500/5">
                      <input 
                        type="text" 
                        className={clsx(
                          "bg-transparent border-b outline-none w-16 py-1",
                          !b.madinahBookingNo ? "border-red-500/50 placeholder-red-400" : "border-white/10 focus:border-blue-400"
                        )}
                        placeholder="ناقص"
                        value={b.madinahBookingNo || ''}
                        onChange={(e) => handleLocalUpdate(b.id, { madinahBookingNo: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-3 bg-blue-500/5">{b.madinahNights}</td>
                    <td className="px-2 py-3 bg-blue-500/5">
                      <input 
                        type="date" 
                        className="bg-transparent border-b border-white/10 focus:border-blue-400 outline-none w-24 py-1 text-[9px]"
                        value={b.madinahCheckIn || ''}
                        onChange={(e) => handleLocalUpdate(b.id, { madinahCheckIn: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-3 bg-blue-500/5 font-mono text-emerald-400">
                      {calculateCheckOut(b.madinahCheckIn, b.madinahNights)}
                    </td>

                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        {pendingSaveIds.has(b.id) && (
                          <button 
                            onClick={() => handleSaveBooking(b.id)}
                            disabled={isSaving !== null}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-all"
                            title="Save Changes"
                          >
                            {isSaving === b.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {saveSuccess === b.id && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-bounce" />
                        )}
                        {permissions.canDelete && (
                          <div className="flex items-center gap-1">
                            {confirmDeleteBookingId === b.id ? (
                              <div className="flex items-center gap-1 bg-red-500/20 p-1 rounded border border-red-500/30">
                                <button 
                                  onClick={() => handleDeleteBooking(b.id)}
                                  className="p-1 hover:bg-red-500 text-white rounded transition-colors"
                                  title="Confirm Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => setConfirmDeleteBookingId(null)}
                                  className="p-1 hover:bg-gray-500 text-white rounded transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setConfirmDeleteBookingId(b.id)}
                                className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
