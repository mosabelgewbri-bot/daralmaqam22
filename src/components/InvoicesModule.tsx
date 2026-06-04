import React, { useState, useEffect } from 'react';
import { User, Trip, Booking } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Printer, 
  FileText, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  Phone, 
  Hash, 
  History,
  Download,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
  Ticket
} from 'lucide-react';
import { api } from '../services/api';
import { clsx } from 'clsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const findTripRobust = (tripsList: Trip[], tripIdOrName: any, bookingObj?: any) => {
  const queryId = String(tripIdOrName || '').trim().toLowerCase();
  const bTripName = bookingObj ? String(bookingObj.tripName || (bookingObj as any).tripName || '').trim().toLowerCase() : '';
  if (!queryId && !bTripName) return undefined;
  
  return tripsList.find(t => {
    const tId = String(t.id).trim().toLowerCase();
    const tName = String(t.name).trim().toLowerCase();
    
    return tId === queryId || 
           tName === queryId || 
           (bTripName && tName === bTripName);
  });
};

export default function InvoicesModule({ user }: { user: User }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTripId, setSelectedTripId] = useState('all');
  const [searchType, setSearchType] = useState<'all' | 'regId' | 'passport' | 'phone' | 'headName'>('all');
  
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bookingsData, tripsData, settingsData] = await Promise.all([
          api.getBookings(),
          api.getTrips(),
          api.getSettings()
        ]);
        setBookings(bookingsData);
        setTrips(tripsData);
        setSettings(settingsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredBookings = bookings.filter(b => {
    const bTripId = String(b.tripId || (b as any).tripid || (b as any).trip_id || (b as any).tripName || '').trim().toLowerCase();
    const sTripId = String(selectedTripId).trim().toLowerCase();
    
    let matchesTrip = selectedTripId === 'all';
    if (selectedTripId !== 'all') {
      if (bTripId === sTripId) {
        matchesTrip = true;
      } else {
        const selectedTrip = trips.find(t => String(t.id).trim().toLowerCase() === sTripId);
        const selectedTripName = selectedTrip ? String(selectedTrip.name).trim().toLowerCase() : '';
        
        if (selectedTripName && bTripId === selectedTripName) {
          matchesTrip = true;
        } else if (selectedTripName && (b as any).tripName && String((b as any).tripName).trim().toLowerCase() === selectedTripName) {
          matchesTrip = true;
        } else {
          const bookingTrip = trips.find(t => 
            String(t.id).trim().toLowerCase() === bTripId || 
            String(t.name).trim().toLowerCase() === bTripId
          );
          if (bookingTrip) {
            const btId = String(bookingTrip.id).trim().toLowerCase();
            const btName = String(bookingTrip.name).trim().toLowerCase();
            matchesTrip = btId === sTripId || (selectedTripName && btName === selectedTripName);
          }
        }
      }
    }
    
    let matchesSearch = true;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      if (searchType === 'regId') {
        matchesSearch = b.regId?.toLowerCase().includes(lowerSearch);
      } else if (searchType === 'passport') {
        matchesSearch = b.pilgrims?.some(p => p.passportNo?.toLowerCase().includes(lowerSearch));
      } else if (searchType === 'phone') {
        matchesSearch = b.phone?.toLowerCase().includes(lowerSearch);
      } else if (searchType === 'headName') {
        matchesSearch = b.headName?.toLowerCase().includes(lowerSearch);
      } else {
        // all
        matchesSearch = 
          b.regId?.toLowerCase().includes(lowerSearch) ||
          b.phone?.toLowerCase().includes(lowerSearch) ||
          b.headName?.toLowerCase().includes(lowerSearch) ||
          b.pilgrims?.some(p => p.passportNo?.toLowerCase().includes(lowerSearch));
      }
    }

    return matchesTrip && matchesSearch;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const exportInvoicePDF = async (booking: Booking) => {
    setPrintingId(booking.id);
    const bTripId = String(booking.tripId || (booking as any).tripid || (booking as any).trip_id || '').trim().toLowerCase();
    const selectedTrip = findTripRobust(trips, bTripId, booking);
    const tripName = selectedTrip?.name || 'الرحلة المختارة';
    
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

    const rawLogo = settings.app_logo || "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10L15 40V90H85V40L50 10Z' fill='%23D4AF37' fill-opacity='0.2' stroke='%23D4AF37' stroke-width='2'/%3E%3Cpath d='M50 30L30 50V80H70V50L50 30Z' fill='%23D4AF37' stroke='%23D4AF37' stroke-width='2'/%3E%3Ccircle cx='50' cy='20' r='5' fill='%23D4AF37'/%3E%3C/svg%3E";
    const appLogo = rawLogo.startsWith('data:') ? rawLogo : await getBase64FromUrl(rawLogo);
    
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
    
    printWindow.innerHTML = `
      <div style="display: flex; align-items: center; gap: 40px; border-bottom: 6px solid #d4af37; padding-bottom: 30px; margin-bottom: 40px;">
        <div style="background: #ffffff; padding: 10px; border: 3px solid #d4af37; border-radius: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <img src="${appLogo}" style="width: 160px; height: 160px; object-fit: contain; display: block;" crossorigin="anonymous" />
        </div>
        <div style="flex: 1;">
          <h1 style="font-size: 56px; color: #d4af37; margin: 0; font-family: 'Amiri', serif; font-weight: bold; line-height: 1.2;">فاتورة حجز إلكترونية</h1>
          <p style="font-size: 24px; color: #555; margin: 15px 0 0 0; font-weight: 500;">لرحلة ${tripName} - دار المقام لإدارة العمرة</p>
        </div>
        <div style="text-align: left; border-right: 2px solid #eee; padding-right: 30px;">
          <div style="font-size: 16px; color: #999; margin-bottom: 5px;">رقم القيد</div>
          <div style="font-size: 26px; font-weight: bold; color: #d4af37;">${booking.regId || '---'}</div>
          <div style="font-size: 12px; color: #ccc; margin-top: 5px;">رقم النظام: ${booking.id}</div>
          <div style="font-size: 14px; color: #999; margin-top: 10px;">التاريخ: ${new Date(booking.createdAt).toLocaleDateString('ar-LY')}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
        <div style="background: #f9f9f9; padding: 25px; border-radius: 15px; border: 1px solid #eee;">
          <h3 style="color: #d4af37; margin-top: 0; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-bottom: 15px;">بيانات رب الأسرة</h3>
          <p style="margin: 5px 0;"><strong>الاسم:</strong> ${booking.headName}</p>
          <p style="margin: 5px 0;"><strong>رقم القيد:</strong> ${booking.regId}</p>
          <p style="margin: 5px 0;"><strong>الهاتف:</strong> ${booking.phone}</p>
        </div>
        <div style="background: #f9f9f9; padding: 25px; border-radius: 15px; border: 1px solid #eee;">
          <h3 style="color: #d4af37; margin-top: 0; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-bottom: 15px;">تفاصيل الرحلة</h3>
          <p style="margin: 5px 0;"><strong>الرحلة:</strong> ${tripName}</p>
          <p style="margin: 5px 0;"><strong>شركة الطيران:</strong> ${selectedTrip?.airline}</p>
          <p style="margin: 5px 0;"><strong>عدد المعتمرين:</strong> ${booking.passengerCount}</p>
        </div>
      </div>

      <div style="background: #fcfaf0; padding: 25px; border-radius: 15px; border: 1px solid #d4af37; margin-bottom: 40px;">
        <h3 style="color: #d4af37; margin-top: 0; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-bottom: 15px;">بيانات الإقامة</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <p style="margin: 0;"><strong>فندق مكة:</strong> ${booking.makkahHotel} (${booking.makkahNights} ليالي)</p>
          <p style="margin: 0;"><strong>فندق المدينة:</strong> ${booking.madinahHotel} (${booking.madinahNights} ليالي)</p>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; font-family: sans-serif; margin-bottom: 40px;">
        <thead>
          <tr style="background-color: #1a1a1a; color: #ffffff;">
            <th style="border: 1px solid #333; padding: 15px; text-align: right;">اسم المعتمر</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: center;">العلاقة</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: center;">نوع الغرفة</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: center;">رقم الجواز</th>
          </tr>
        </thead>
        <tbody>
          ${booking.pilgrims.map((p: any, idx: number) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 12px; font-weight: bold; white-space: nowrap;">${p.name}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${p.relationship === 'Self' ? 'نفسه' : p.relationship === 'Spouse' ? 'زوج/ة' : p.relationship === 'Child' ? 'ابن/ة' : p.relationship === 'Parent' ? 'أب/أم' : 'آخر'}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${p.roomType === 'Double' ? 'ثنائية' : p.roomType === 'Triple' ? 'ثلاثية' : p.roomType === 'Quad' ? 'رباعية' : p.roomType === 'Quint' ? 'خماسية' : 'تأشيرة فقط'}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-mono: true;">${p.passportNo}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
        <div style="width: 400px; background: #1a1a1a; color: #fff; padding: 30px; border-radius: 20px; border: 4px solid #d4af37;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 16px;">
            <span>الإجمالي (قبل التخفيض):</span>
            <span>
              ${(booking.totals.baseTotalLYD || booking.totals.totalLYD).toLocaleString()} د.ل
              ${(booking.totals.baseTotalUSD || booking.totals.totalUSD) > 0 ? ' + ' + (booking.totals.baseTotalUSD || booking.totals.totalUSD).toLocaleString() + ' دولار' : ''}
            </span>
          </div>
          ${(booking.discountLYD || booking.totals.discountLYD || 0) > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; color: #ff4d4d;">
            <span>تخفيض (د.ل):</span>
            <span>-${(booking.discountLYD || booking.totals.discountLYD).toLocaleString()} د.ل</span>
          </div>
          ` : ''}
          ${(booking.discountUSD || booking.totals.discountUSD || 0) > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; color: #ff4d4d;">
            <span>تخفيض ($):</span>
            <span>-${(booking.discountUSD || booking.totals.discountUSD).toLocaleString()} دولار</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px solid #d4af37; margin-top: 15px;">
            <span style="font-size: 20px; font-weight: bold; color: #d4af37;">الإجمالي النهائي:</span>
            <div style="text-align: left;">
              <div style="font-size: 28px; font-weight: bold; color: #d4af37;">
                ${booking.totals.totalLYD.toLocaleString()} د.ل
              </div>
              ${booking.totals.totalUSD > 0 ? `
                <div style="font-size: 28px; font-weight: bold; color: #d4af37; margin-top: 5px;">
                  ${booking.totals.totalUSD.toLocaleString()} دولار
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 14px; border-top: 2px solid #eee; padding-top: 30px;">
        <div style="text-align: center; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 40px;">توقيع المحاسب</div>
          <div style="border-bottom: 1px dashed #333; width: 100%;"></div>
        </div>
        <div style="text-align: center; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 40px;">ختم الشركة</div>
          <div style="border: 2px solid #d4af37; width: 100px; height: 100px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #d4af37; font-size: 10px; opacity: 0.3;">ختم رسمي</div>
        </div>
      </div>
      
      <div style="position: absolute; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 10px; color: #aaa;">
        تم استخراج هذه الفاتورة آلياً بواسطة نظام دار المقام لإدارة العمرة
      </div>
    `;
    
    document.body.appendChild(printWindow);

    try {
      const images = printWindow.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      await new Promise(resolve => setTimeout(resolve, 800));

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
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`فاتورة_${booking.headName}_قيد_${booking.regId || booking.id}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      document.body.removeChild(printWindow);
      setPrintingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-matte-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-gold animate-spin" />
          <p className="text-white/40 animate-pulse font-bold">جاري تحميل سجل الفواتير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-matte-black text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold/10 rounded-2xl border border-gold/20 shadow-lg shadow-gold/5">
              <History className="w-8 h-8 text-gold" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">سجل الفواتير</h1>
              <p className="text-white/40 text-sm font-medium">عرض وإعادة طباعة جميع الفواتير الصادرة</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 px-6 py-4 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-md">
          <div className="text-left">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">إجمالي الفواتير</p>
            <p className="text-2xl font-black text-gold">{filteredBookings.length}</p>
          </div>
          <div className="w-px h-10 bg-white/10 mx-2" />
          <Printer className="w-6 h-6 text-white/20" />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-6 border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent opacity-50" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block px-1">البحث عن</label>
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث هنا..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-all placeholder:text-white/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block px-1">طريقة البحث</label>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
              <button 
                onClick={() => setSearchType('all')}
                className={clsx(
                  "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                  searchType === 'all' ? "bg-gold text-black shadow-lg shadow-gold/20" : "text-white/40 hover:text-white"
                )}
              >الكل</button>
              <button 
                onClick={() => setSearchType('regId')}
                className={clsx(
                  "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                  searchType === 'regId' ? "bg-gold text-black shadow-lg shadow-gold/20" : "text-white/40 hover:text-white"
                )}
              >رقم القيد</button>
              <button 
                onClick={() => setSearchType('passport')}
                className={clsx(
                  "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                  searchType === 'passport' ? "bg-gold text-black shadow-lg shadow-gold/20" : "text-white/40 hover:text-white"
                )}
              >الجواز</button>
              <button 
                onClick={() => setSearchType('phone')}
                className={clsx(
                  "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                  searchType === 'phone' ? "bg-gold text-black shadow-lg shadow-gold/20" : "text-white/40 hover:text-white"
                )}
              >الهاتف</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block px-1">فلترة حسب الرحلة</label>
            <div className="relative">
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <select 
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-gold/50 transition-all shadow-inner cursor-pointer"
              >
                <option value="all">جميع الرحلات</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedTripId('all');
                setSearchType('all');
              }}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 text-xs font-bold transition-all flex items-center justify-center gap-2 group"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="glass-card overflow-hidden border-white/10 shadow-2xl bg-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/10">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">رقم الفاتورة / القيد</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">الرحلة</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">رب الأسرة</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">الهاتف</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">التاريخ</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">الإجمالي</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">الركاب</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredBookings.length > 0 ? filteredBookings.map((b, idx) => {
                  const bTripId = String(b.tripId || (b as any).tripid || (b as any).trip_id || '').trim().toLowerCase();
                  const trip = findTripRobust(trips, bTripId, b);
                  const totalLYD = b.totals.totalLYD || 0;
                  const totalUSD = b.totals.totalUSD || 0;

                  return (
                    <motion.tr 
                      key={b.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-white/[0.02] transition-all group border-b border-white/[0.02]"
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-gold font-mono font-bold text-lg tracking-tighter">{b.regId || '---'}</span>
                          <span className="text-[10px] text-white/20 font-bold uppercase">رقم الفاتورة: {b.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
                          <span className="text-white text-xs font-bold truncate max-w-[150px]">{trip?.name || '---'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 underline decoration-white/10 underline-offset-4">
                        <span className="text-white font-bold text-sm">{b.headName}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-white/40">
                          <Phone className="w-3 h-3" />
                          <span className="text-[11px] font-mono">{b.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-white/40">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[11px]">{new Date(b.createdAt).toLocaleDateString('ar-LY')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          {totalLYD > 0 && <span className="text-emerald-400 font-black text-xs">{totalLYD.toLocaleString()} د.ل</span>}
                          {totalUSD > 0 && <span className="text-blue-400 font-black text-xs">${totalUSD.toLocaleString()}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1 bg-white/5 py-1 px-3 rounded-full w-fit">
                          <UserIcon className="w-3 h-3 text-white/30" />
                          <span className="text-[10px] font-bold text-white/60">{b.passengerCount} مرافق</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => exportInvoicePDF(b)}
                            disabled={printingId === b.id}
                            className="p-2 bg-gold/10 hover:bg-gold text-gold hover:text-black rounded-lg transition-all border border-gold/20 flex items-center justify-center shadow-lg shadow-gold/5 disabled:opacity-50"
                            title="تحميل الفاتورة PDF"
                          >
                            {printingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-white flex items-center justify-center">
                          <Search className="w-10 h-10" />
                        </div>
                        <p className="text-xl font-bold">لم يتم العثور على فواتير تطابق بحثك</p>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
        <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white mb-1">دقة البحث</h4>
            <p className="text-[10px] text-white/40 leading-relaxed">استخدم رقم القيد للحصول على الفاتورة بدقة، أو ابحث بجزء من الاسم للبحث العام.</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white mb-1">إعادة الطباعة</h4>
            <p className="text-[10px] text-white/40 leading-relaxed">جميع الفواتير المصدرة من هنا هي نسخ مطابقة تماماً للأصل الصادر وقت الحجز.</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white mb-1">تزامن البيانات</h4>
            <p className="text-[10px] text-white/40 leading-relaxed">تنعكس أي تحديثات مالية تتم في شاشة "المالية" تلقائياً على قيم الفواتير هنا.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
