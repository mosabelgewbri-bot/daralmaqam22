import React, { useState, useEffect } from 'react';
import { User, Pilgrim, Booking, Trip } from '../types';
import { api } from '../services/api';
import { deduplicateBookings } from '../utils/dataUtils';
import { motion } from 'motion/react';
import { Shield, CheckCircle, Clock, AlertCircle, ArrowLeft, Search, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function VisaModule({ user }: { user: User }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPilgrims, setFilteredPilgrims] = useState<(Pilgrim & { bookingId: string, regId: string })[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bookingsData, tripsData] = await Promise.all([
          api.getBookings(),
          api.getTrips()
        ]);
        setBookings(bookingsData);
        setTrips(tripsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    let results: (Pilgrim & { bookingId: string, regId: string })[] = [];
    
    bookings.forEach(booking => {
      const bTripId = String(booking.tripId || (booking as any).tripid || (booking as any).trip_id || '').trim().toLowerCase();
      const sTripId = String(selectedTripId).trim().toLowerCase();
      const matchesTrip = !selectedTripId || bTripId === sTripId;
      
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        booking.id.toLowerCase().includes(lowerSearch) || 
        (booking.regId || '').toLowerCase().includes(lowerSearch) ||
        booking.pilgrims.some(p => (p.passportNo || '').toLowerCase().includes(lowerSearch));
      
      if (matchesTrip && matchesSearch) {
        booking.pilgrims.forEach(p => {
          // If search term is passport, only show matching pilgrims
          if (searchTerm && (p.passportNo || '').toLowerCase().includes(lowerSearch)) {
            results.push({
              ...p,
              bookingId: booking.id,
              regId: booking.regId,
              visaStatus: p.visaStatus || 'Pending'
            } as any);
          } else if (!searchTerm || (booking.id || '').toLowerCase().includes(lowerSearch) || (booking.regId || '').toLowerCase().includes(lowerSearch)) {
            results.push({
              ...p,
              bookingId: booking.id,
              regId: booking.regId,
              visaStatus: p.visaStatus || 'Pending'
            } as any);
          }
        });
      }
    });

    setFilteredPilgrims(results);
  }, [selectedTripId, searchTerm, bookings]);

  const updateStatus = async (bookingId: string, passportNo: string, newStatus: Pilgrim['visaStatus']) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const updatedBooking = {
      ...booking,
      pilgrims: booking.pilgrims.map(p => 
        p.passportNo === passportNo ? { ...p, visaStatus: newStatus } : p
      )
    };

    try {
      await api.saveBooking(updatedBooking);
      setBookings(bookings.map(b => b.id === bookingId ? updatedBooking : b));
    } catch (error) {
      console.error('Error updating visa status:', error);
    }
  };

  const updateGroup = async (bookingId: string, passportNo: string, groupNo: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const updatedBooking = {
      ...booking,
      pilgrims: booking.pilgrims.map(p => 
        p.passportNo === passportNo ? { ...p, groupNo } : p
      )
    };

    try {
      await api.saveBooking(updatedBooking);
      setBookings(bookings.map(b => b.id === bookingId ? updatedBooking : b));
    } catch (error) {
      console.error('Error updating group number:', error);
    }
  };

  const exportPDF = async () => {
    const trip = selectedTripId ? trips.find(t => t.id === selectedTripId) : null;
    const tripName = trip?.name;
    const reportTitle = tripName ? `تقرير التأشيرات لرحلة ${tripName}` : 'تقرير التأشيرات';
    
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
      
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; font-family: sans-serif;">
        <thead>
          <tr style="background-color: #1a1a1a; color: #ffffff;">
            <th style="border: 1px solid #333; padding: 15px; text-align: right;">اسم المعتمر</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: center;">رقم الجواز</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: center;">رقم القيد</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: center;">رقم المجموعة</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: center;">الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${filteredPilgrims.map((p, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 12px; font-weight: bold;">${p.name}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-mono: true;">${p.passportNo}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: #d4af37;">${p.regId}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${p.groupNo || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${p.visaStatus}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 14px; border-top: 2px solid #eee; padding-top: 30px;">
        <div style="text-align: center; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 40px;">توقيع مسؤول التأشيرات</div>
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
      pdf.save(`تأشيرات_${tripName}_${new Date().toLocaleDateString('ar-LY')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('حدث خطأ أثناء تصدير ملف PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      document.body.removeChild(printWindow);
    }
  };

  const statusMap: Record<string, string> = {
    'Pending': 'قيد الانتظار',
    'Processed': 'تمت المعالجة',
    'Visa Issued': 'صدرت التأشيرة'
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
            <h2 className="text-4xl font-bold gold-text-gradient mb-2">تتبع التأشيرات</h2>
            <p className="text-white/60">متابعة حالة التأشيرات وتوزيع المجموعات للمعتمرين</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={exportPDF} className="btn-gold flex items-center gap-2">
            <FileText className="w-4 h-4" /> تصدير PDF
          </button>
        </div>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs text-white/60">البحث (رقم القيد، الجواز، الفاتورة)</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="مثال: BK-12345 أو رقم الجواز..."
              className="input-field w-full pr-10"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-white/60">تصفية حسب الرحلة</label>
          <select 
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="input-field w-full"
          >
            <option value="">كل الرحلات</option>
            {trips.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-white/5 text-xs uppercase text-white/40">
            <tr>
              <th className="px-6 py-4">اسم المعتمر</th>
              <th className="px-6 py-4">رقم الجواز</th>
              <th className="px-6 py-4">رقم القيد</th>
              <th className="px-6 py-4">رقم المجموعة</th>
              <th className="px-6 py-4">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredPilgrims.length > 0 ? (
              filteredPilgrims.map((p, idx) => (
                <tr key={`${p.bookingId}-${p.passportNo}`} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{p.name}</td>
                  <td className="px-6 py-4 font-mono text-white/60">{p.passportNo}</td>
                  <td className="px-6 py-4 text-xs text-gold">{p.regId}</td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      className="input-field w-32 py-1 text-sm"
                      value={p.groupNo || ''}
                      onChange={(e) => updateGroup(p.bookingId, p.passportNo, e.target.value)}
                      placeholder="رقم المجموعة"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={p.visaStatus || 'Pending'}
                      onChange={(e) => updateStatus(p.bookingId, p.passportNo, e.target.value as any)}
                      className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-transparent outline-none cursor-pointer",
                        p.visaStatus === 'Pending' && "text-yellow-500 border-yellow-500/20",
                        p.visaStatus === 'Processed' && "text-blue-500 border-blue-500/20",
                        p.visaStatus === 'Visa Issued' && "text-emerald-500 border-emerald-500/20"
                      )}
                    >
                      <option value="Pending" className="bg-matte-dark">قيد الانتظار</option>
                      <option value="Processed" className="bg-matte-dark">تمت المعالجة</option>
                      <option value="Visa Issued" className="bg-matte-dark">صدرت التأشيرة</option>
                    </select>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-white/20">
                  لا توجد بيانات تطابق البحث.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
