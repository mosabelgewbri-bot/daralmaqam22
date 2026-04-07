import React, { useState, useEffect } from 'react';
import { User, Trip, Booking } from '../types';
import { api } from '../services/api';
import { Search, DollarSign, CreditCard, Save, CheckCircle2, AlertCircle, ShieldAlert, FileText, Download, MessageSquare, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { getRolePermissions } from '../utils/dataUtils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Logo from './Logo';

export default function FinanceModule({ user }: { user: User }) {
  const permissions = getRolePermissions(user.role);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRemainingOnly, setFilterRemainingOnly] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ id: string, status: 'idle' | 'saving' | 'success' | 'error' }>({ id: '', status: 'idle' });

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const sendWhatsAppMessage = (phone: string, message: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\s+/g, '').replace(/^0/, '218'); // Assuming Libya country code if starts with 0
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    const loadTrips = async () => {
      try {
        const data = await api.getTrips();
        setTrips(data);
      } catch (error) {
        console.error('Error loading trips:', error);
      }
    };
    loadTrips();
  }, []);

  useEffect(() => {
    const loadBookings = async () => {
      setLoading(true);
      try {
        const allBookings = await api.getBookings();
        let filtered = allBookings;
        
        if (selectedTripId) {
          const sTripId = String(selectedTripId).trim().toLowerCase();
          filtered = filtered.filter(b => {
             const bTripId = String(b.tripId || (b as any).tripid || (b as any).trip_id || '').trim().toLowerCase();
             return bTripId === sTripId;
          });
        }
        
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          filtered = filtered.filter(b => 
            (b.regId || '').toLowerCase().includes(lowerSearch) || 
            (b.headName || '').toLowerCase().includes(lowerSearch) ||
            (b.id || '').toLowerCase().includes(lowerSearch)
          );
        }

        if (filterRemainingOnly) {
          filtered = filtered.filter(b => {
            const remainingLYD = (b.totals.totalLYD || 0) - (b.paidLYD || 0);
            const remainingUSD = (b.totals.totalUSD || 0) - (b.paidUSD || 0);
            return remainingLYD > 0 || remainingUSD > 0;
          });
        }
        
        setBookings(filtered);
      } catch (error) {
        console.error('Error loading bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, [selectedTripId, searchTerm, filterRemainingOnly]);

  const handleUpdatePaid = (bookingId: string, field: 'paidLYD' | 'paidUSD' | 'paidCashLYD' | 'paidTransferLYD' | 'paidCashUSD' | 'paidTransferUSD', value: string) => {
    const numValue = parseFloat(value) || 0;
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        const updated = { ...b, [field]: numValue };
        // Recalculate totals if needed, but here we just update the specific field
        // The total paid is the sum of cash and transfer
        if (field === 'paidCashLYD' || field === 'paidTransferLYD') {
          updated.paidLYD = (updated.paidCashLYD || 0) + (updated.paidTransferLYD || 0);
        }
        if (field === 'paidCashUSD' || field === 'paidTransferUSD') {
          updated.paidUSD = (updated.paidCashUSD || 0) + (updated.paidTransferUSD || 0);
        }
        return updated;
      }
      return b;
    }));
  };

  const savePayment = async (booking: Booking) => {
    setSaveStatus({ id: booking.id, status: 'saving' });
    
    try {
      await api.saveBooking(booking);
      setSaveStatus({ id: booking.id, status: 'success' });
      setTimeout(() => setSaveStatus({ id: '', status: 'idle' }), 2000);
    } catch (error) {
      console.error('Error saving payment:', error);
      setSaveStatus({ id: booking.id, status: 'error' });
    }
  };

  const getRoomSummary = (booking: Booking) => {
    const rooms: Record<string, number> = {};
    booking.pilgrims.forEach(p => {
      if (p.roomType && p.roomType !== 'VisaOnly') {
        rooms[p.roomType] = (rooms[p.roomType] || 0) + 1;
      }
    });
    
    return Object.entries(rooms).map(([type, count]) => {
      const label = type === 'Double' ? 'ثنائية' : 
                    type === 'Triple' ? 'ثلاثية' : 
                    type === 'Quad' ? 'رباعية' : 
                    type === 'Quint' ? 'خماسية' : type;
      return `${label} (${count})`;
    }).join(' - ') || 'تأشيرة فقط';
  };

  const exportPDF = async (onlyRemaining: boolean) => {
    const selectedTrip = trips.find(t => t.id === selectedTripId);
    const tripName = selectedTripId ? selectedTrip?.name : null;
    const reportType = onlyRemaining ? 'تقرير المبالغ المتبقية' : 'التقرير المالي الشامل';
    const reportTitle = tripName ? `${reportType} لرحلة ${tripName}` : reportType;
    
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
    
    const dataToExport = onlyRemaining 
      ? bookings.filter(b => ((b.totals.totalLYD || 0) - (b.paidLYD || 0)) > 0 || ((b.totals.totalUSD || 0) - (b.paidUSD || 0)) > 0)
      : bookings;

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
      
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; font-family: sans-serif;">
        <thead>
          <tr style="background-color: #1a1a1a; color: #ffffff;">
            <th style="border: 1px solid #333; padding: 10px; text-align: center;">رقم القيد</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: right;">الرحلة</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: right;">اسم رب الأسرة</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: center;">نوع الغرفة</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: right;">إجمالي د.ل</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: right;">مدفوع د.ل</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: right;">إجمالي $</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: right;">مدفوع $</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: right; background-color: #fef2f2; color: #000;">متبقي د.ل</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: right; background-color: #fef2f2; color: #000;">متبقي $</th>
          </tr>
        </thead>
        <tbody>
          ${dataToExport.map((b, idx) => {
            const remLYD = (b.totals.totalLYD || 0) - (b.paidLYD || 0);
            const remUSD = (b.totals.totalUSD || 0) - (b.paidUSD || 0);
            const trip = trips.find(t => String(t.id).trim() === String(b.tripId || (b as any).tripid || (b as any).trip_id).trim());
            return `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold;">${b.regId}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${trip?.name || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; font-weight: bold;">${b.headName}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 10px;">${getRoomSummary(b)}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${b.totals.totalLYD.toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${(b.paidLYD || 0).toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${b.totals.totalUSD.toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right;">${(b.paidUSD || 0).toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right; color: ${remLYD > 0 ? '#dc2626' : '#059669'}; font-weight: bold; background-color: #fff1f2;">${remLYD.toLocaleString()}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: right; color: ${remUSD > 0 ? '#dc2626' : '#059669'}; font-weight: bold; background-color: #fff1f2;">${remUSD.toLocaleString()}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 14px; border-top: 2px solid #eee; padding-top: 30px;">
        <div style="text-align: center; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 40px;">توقيع المحاسب</div>
          <div style="border-bottom: 1px dashed #333; width: 100%;"></div>
        </div>
        <div style="text-align: center; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 40px;">ختم الشركة</div>
          <div style="border: 2px solid #d4af37; width: 100px; height: 100px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #d4af37; font-size: 10px; opacity: 0.3;">ختم رسمي</div>
        </div>
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
      pdf.save(`${onlyRemaining ? 'Remaining' : 'Finance'}_Report_${new Date().toLocaleDateString('ar-LY')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      showToast('حدث خطأ أثناء تصدير ملف PDF.', 'error');
    } finally {
      document.body.removeChild(printWindow);
    }
  };

  if (!permissions.canViewFinance) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">وصول مقيد</h2>
        <p className="text-white/40 max-w-md">
          عذراً، ليس لديك الصلاحيات الكافية لعرض التفاصيل المالية والمدفوعات. يرجى التواصل مع مدير النظام إذا كنت تعتقد أن هذا خطأ.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gold flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          إدارة المالية والمدفوعات
        </h2>
        <div className="flex gap-3">
          <button 
            onClick={() => exportPDF(false)}
            className="btn-gold flex items-center gap-2 text-xs"
          >
            <FileText className="w-4 h-4" /> تقرير شامل
          </button>
          <button 
            onClick={() => exportPDF(true)}
            className="btn-gold bg-red-600 border-none flex items-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" /> تقرير المتبقي
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 text-right">
            <label className="text-xs text-white/60">اختر الرحلة</label>
            <select 
              className="input-field w-full"
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
            >
              <option value="">-- اختر رحلة --</option>
              {trips.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.airline})</option>
              ))}
            </select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text" 
              placeholder="بحث برقم القيد أو اسم رب الأسرة..."
              className="input-field w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <button 
              onClick={() => setFilterRemainingOnly(!filterRemainingOnly)}
              className={clsx(
                "px-4 py-2 border rounded-lg text-xs transition-all",
                filterRemainingOnly ? "bg-red-500 text-white border-red-500" : "bg-white/5 border-white/10 text-white/60 hover:border-gold"
              )}
            >
              المتبقي فقط
            </button>
          </div>
        </div>
      </div>

      {selectedTripId && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
                  <thead className="bg-white/5 text-white/40 uppercase text-[10px]">
                <tr>
                  <th className="px-2 py-3">رقم القيد</th>
                  <th className="px-2 py-3">الرحلة</th>
                  <th className="px-2 py-3">اسم رب الأسرة</th>
                  <th className="px-2 py-3">توزيع الغرف</th>
                  <th className="px-2 py-3 bg-emerald-500/5">إجمالي (د.ل)</th>
                  <th className="px-2 py-3 bg-emerald-500/5">نقداً (د.ل)</th>
                  <th className="px-2 py-3 bg-emerald-500/5">حوالة (د.ل)</th>
                  <th className="px-2 py-3 bg-blue-500/5">إجمالي ($)</th>
                  <th className="px-2 py-3 bg-blue-500/5">نقداً ($)</th>
                  <th className="px-2 py-3 bg-blue-500/5">حوالة ($)</th>
                  <th className="px-2 py-3 bg-red-500/10">المتبقي (د.ل)</th>
                  <th className="px-2 py-3 bg-red-500/10">المتبقي ($)</th>
                  <th className="px-2 py-3">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-white/40">لا توجد حجوزات لهذه الرحلة</td>
                  </tr>
                ) : (
                  bookings.map(b => {
                    const remainingLYD = (b.totals.totalLYD || 0) - (b.paidLYD || 0);
                    const remainingUSD = (b.totals.totalUSD || 0) - (b.paidUSD || 0);
                    
                    return (
                      <tr key={b.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-2 py-4 font-mono text-[10px] text-gold">{b.regId}</td>
                        <td className="px-2 py-4 text-white/40 text-[10px]">
                          {trips.find(t => String(t.id).trim() === String(b.tripId || (b as any).tripid || (b as any).trip_id).trim())?.name || '---'}
                        </td>
                        <td className="px-2 py-4 font-medium text-xs">{b.headName}</td>
                        <td className="px-2 py-4 text-[10px] text-white/60">{getRoomSummary(b)}</td>
                        
                        {/* LYD Section */}
                        <td className="px-2 py-4 bg-emerald-500/5 font-bold text-xs">
                          {b.totals.totalLYD.toLocaleString()}
                        </td>
                        <td className="px-2 py-4 bg-emerald-500/5">
                          <input 
                            type="number"
                            className="w-16 bg-black/40 border border-white/10 rounded px-1 py-1 text-left focus:border-emerald-500 outline-none text-xs"
                            value={b.paidCashLYD || 0}
                            onChange={(e) => handleUpdatePaid(b.id, 'paidCashLYD', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-4 bg-emerald-500/5">
                          <input 
                            type="number"
                            className="w-16 bg-black/40 border border-white/10 rounded px-1 py-1 text-left focus:border-emerald-500 outline-none text-xs"
                            value={b.paidTransferLYD || 0}
                            onChange={(e) => handleUpdatePaid(b.id, 'paidTransferLYD', e.target.value)}
                          />
                        </td>
 
                        {/* USD Section */}
                        <td className="px-2 py-4 bg-blue-500/5 font-bold text-xs">
                          {b.totals.totalUSD.toLocaleString()}
                        </td>
                        <td className="px-2 py-4 bg-blue-500/5">
                          <input 
                            type="number"
                            className="w-16 bg-black/40 border border-white/10 rounded px-1 py-1 text-left focus:border-blue-500 outline-none text-xs"
                            value={b.paidCashUSD || 0}
                            onChange={(e) => handleUpdatePaid(b.id, 'paidCashUSD', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-4 bg-blue-500/5">
                          <input 
                            type="number"
                            className="w-16 bg-black/40 border border-white/10 rounded px-1 py-1 text-left focus:border-blue-500 outline-none text-xs"
                            value={b.paidTransferUSD || 0}
                            onChange={(e) => handleUpdatePaid(b.id, 'paidTransferUSD', e.target.value)}
                          />
                        </td>

                        {/* Remaining Section */}
                        <td className={clsx(
                          "px-2 py-4 bg-red-500/5 font-bold text-xs",
                          remainingLYD > 0 ? "text-red-400" : "text-emerald-400"
                        )}>
                          {remainingLYD.toLocaleString()}
                        </td>
                        <td className={clsx(
                          "px-2 py-4 bg-red-500/5 font-bold text-xs",
                          remainingUSD > 0 ? "text-red-400" : "text-blue-400"
                        )}>
                          {remainingUSD.toLocaleString()}
                        </td>
 
                        <td className="px-2 py-4 flex items-center gap-2">
                          <button 
                            onClick={() => sendWhatsAppMessage(b.phone || '', `السلام عليكم السيد/ة ${b.headName}، نود إبلاغكم بأن الرصيد المتبقي لحجزكم هو ${remainingLYD} د.ل. يرجى مراجعة المكتب.`)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="إرسال رسالة واتساب"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => savePayment(b)}
                            disabled={saveStatus.id === b.id && saveStatus.status === 'saving'}
                            className={clsx(
                              "p-1.5 rounded-lg transition-all",
                              saveStatus.id === b.id && saveStatus.status === 'success' 
                                ? "bg-emerald-500 text-white" 
                                : "bg-white/10 hover:bg-gold hover:text-black"
                            )}
                          >
                            {saveStatus.id === b.id && saveStatus.status === 'saving' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : saveStatus.id === b.id && saveStatus.status === 'success' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : saveStatus.id === b.id && saveStatus.status === 'error' ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={clsx(
              "fixed bottom-8 right-8 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl",
              toast.type === 'success' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              toast.type === 'error' && "bg-red-500/10 border-red-500/20 text-red-400",
              toast.type === 'warning' && "bg-amber-500/10 border-amber-500/20 text-amber-400",
              toast.type === 'info' && "bg-blue-500/10 border-blue-500/20 text-blue-400"
            )}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
            {toast.type === 'error' && <AlertCircle className="w-6 h-6" />}
            {toast.type === 'warning' && <Zap className="w-6 h-6" />}
            {toast.type === 'info' && <FileText className="w-6 h-6" />}
            <span className="font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={clsx("animate-spin", className)} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
