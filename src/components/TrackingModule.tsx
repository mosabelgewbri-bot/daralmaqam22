import React, { useState, useEffect } from 'react';
import { User, Booking, Trip, Pilgrim } from '../types';
import { api } from '../services/api';
import { getRolePermissions } from '../utils/dataUtils';
import { motion } from 'motion/react';
import { 
  Search, 
  Plane, 
  Users, 
  Hotel, 
  FileText, 
  ArrowLeft, 
  Save,
  CheckCircle,
  AlertCircle,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import Logo from './Logo';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function TrackingModule({ user }: { user: User }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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

  const handleUpdateGroupNo = async (bookingId: string, groupNo: string) => {
    if (!permissions.canEdit) return;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const updatedBooking = { ...booking, groupNo };
    try {
      await api.saveBooking(updatedBooking);
      setBookings(bookings.map(b => b.id === bookingId ? updatedBooking : b));
      setSaveStatus(bookingId);
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Error updating group number:', error);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const bTripId = String(b.tripId || (b as any).tripid || (b as any).trip_id || '').trim().toLowerCase();
    const sTripId = String(selectedTripId).trim().toLowerCase();
    const matchesTrip = !selectedTripId || bTripId === sTripId;
    
    const matchesSearch = searchTerm === '' || 
      (b.regId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.pilgrims || []).some(p => p.passportNo?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && b.groupNo && b.groupNo.trim() !== '') ||
      (statusFilter === 'pending' && (!b.groupNo || b.groupNo.trim() === ''));
    
    return matchesTrip && matchesSearch && matchesStatus;
  });

  const exportPDF = async () => {
    const trip = selectedTripId ? trips.find(t => String(t.id).trim() === String(selectedTripId).trim()) : null;
    const tripName = trip?.name;
    const reportTitle = tripName ? `تقرير تتبع المعتمرين لرحلة ${tripName}` : 'تقرير تتبع المعتمرين';
    
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
            <th style="border: 1px solid #333; padding: 15px; text-align: center;">رقم القيد</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: right;">اسم رب العائلة</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: center;">رقم الهاتف</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: right;">المعتمرين</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: right;">فندق مكة</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: right;">فندق المدينة</th>
            <th style="border: 1px solid #333; padding: 15px; text-align: center;">رقم المجموعة</th>
          </tr>
        </thead>
        <tbody>
          ${filteredBookings.map((b, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">${b.regId}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px; font-weight: bold; white-space: nowrap;">${b.headName}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; white-space: nowrap;">${b.phone || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px;">
                <div style="font-size: 10px;">
                  ${b.pilgrims.map((p, i) => `<div style="white-space: nowrap;">${i+1}. ${p.name}</div>`).join('')}
                </div>
              </td>
              <td style="border: 1px solid #dee2e6; padding: 12px;">${b.makkahHotel}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px;">${b.madinahHotel}</td>
              <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: #d4af37; font-weight: bold;">${b.groupNo || '---'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 14px; border-top: 2px solid #eee; padding-top: 30px;">
        <div style="text-align: center; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 40px;">توقيع المشرف</div>
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
      pdf.save(`وحدة_التأشيرات_${tripName}_${new Date().toLocaleDateString('ar-LY')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('حدث خطأ أثناء تصدير ملف PDF.');
    } finally {
      document.body.removeChild(printWindow);
    }
  };

  const downloadPassport = (imageData: string, pilgrimName: string) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `جواز_${pilgrimName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <h2 className="text-4xl font-bold gold-text-gradient mb-2">وحدة التأشيرات</h2>
            <p className="text-white/60">إدارة وتتبع التأشيرات وتوزيع المعتمرين</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={exportPDF} className="btn-gold flex items-center gap-2">
            <FileText className="w-4 h-4" /> تصدير PDF
          </button>
        </div>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-xs text-white/40 uppercase tracking-widest">اختر الرحلة</label>
          <div className="relative">
            <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold" />
            <select 
              className="input-field w-full pl-10"
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
            >
              <option value="">كل الرحلات</option>
              {trips.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-white/40 uppercase tracking-widest">حالة الإنجاز</label>
          <div className="relative">
            <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold" />
            <select 
              className="input-field w-full pl-10"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">الكل</option>
              <option value="completed">منجز (تم تحديد المجموعة)</option>
              <option value="pending">غير منجز (قيد الانتظار)</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-white/40 uppercase tracking-widest">بحث برقم القيد أو الجواز</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              className="input-field w-full pl-10"
              placeholder="أدخل رقم القيد أو رقم الجواز..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-white/5 text-xs uppercase text-white/40">
              <tr>
                <th className="px-6 py-4">رقم القيد</th>
                <th className="px-6 py-4">اسم رب العائلة</th>
                <th className="px-6 py-4">رقم الهاتف</th>
                <th className="px-6 py-4">المعتمرين</th>
                <th className="px-6 py-4">صور الجوازات</th>
                <th className="px-6 py-4">فندق مكة</th>
                <th className="px-6 py-4">فندق المدينة</th>
                <th className="px-6 py-4">رقم المجموعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-gold font-bold">{booking.regId}</td>
                    <td className="px-6 py-4 font-bold whitespace-nowrap">{booking.headName}</td>
                    <td className="px-6 py-4 font-mono text-white/60">{booking.phone || '---'}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {booking.pilgrims.map((p, i) => (
                          <div key={i} className="text-xs flex items-center gap-2 whitespace-nowrap">
                            <span className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-[8px] text-white/40">{i+1}</span>
                            <span>{p.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {booking.pilgrims.map((p, i) => (
                          p.passportImage ? (
                            <button 
                              key={i}
                              onClick={() => downloadPassport(p.passportImage!, p.name || 'معتمر')}
                              className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 transition-colors group relative"
                              title={`تحميل جواز ${p.name}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-[8px] px-1 py-0.5 rounded whitespace-nowrap z-10">
                                {p.name}
                              </span>
                            </button>
                          ) : (
                            <div key={i} className="p-1.5 rounded-lg bg-white/5 text-white/20" title="لا توجد صورة">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                          )
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Hotel className="w-3 h-3 text-white/40" />
                        <span>{booking.makkahHotel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Hotel className="w-3 h-3 text-white/40" />
                        <span>{booking.madinahHotel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="text"
                          disabled={!permissions.canEdit}
                          className={clsx(
                            "bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:border-gold outline-none w-24 text-center text-gold font-bold",
                            !permissions.canEdit && "opacity-50 cursor-not-allowed"
                          )}
                          placeholder="---"
                          value={booking.groupNo || ''}
                          onChange={(e) => handleUpdateGroupNo(booking.id, e.target.value)}
                        />
                        {saveStatus === booking.id && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-emerald-400"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </motion.div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/20">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-8 h-8" />
                      <p>لا توجد بيانات تطابق البحث</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
