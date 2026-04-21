import React, { useState, useEffect, useRef } from 'react';
import { User, Booking, Trip, Pilgrim } from '../types';
import { api } from '../services/api';
import { 
  Search, 
  Printer, 
  ArrowLeft, 
  Plane, 
  User as UserIcon, 
  Download, 
  Loader2, 
  Ticket,
  FileText,
  UserCheck,
  CreditCard,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import Logo from './Logo';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function TicketsModule({ user }: { user: User }) {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tripsData, bookingsData] = await Promise.all([
          api.getTrips(),
          api.getBookings()
        ]);
        setTrips(tripsData.filter(t => t.status !== 'Completed'));
        setBookings(bookingsData);
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('خطأ في تحميل البيانات', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredBookings = bookings
    .map(b => ({
      ...b,
      pilgrims: (b.pilgrims || []).filter(p => {
        const type = p.serviceType || 'Full';
        return type === 'Full' || type === 'TicketOnly' || type === 'TicketAndAccommodation';
      })
    }))
    .filter(b => {
      if (b.pilgrims.length === 0) return false;
      const matchesTrip = !selectedTripId || b.tripId === selectedTripId;
      const matchesSearch = !searchTerm || 
        b.headName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.regId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.pilgrims.some(p => 
          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.passportNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.englishName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchesTrip && matchesSearch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handlePrint = () => {
    // Better print handling for iframes
    const printContent = printRef.current;
    if (!printContent) return;

    window.print();
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);
    showToast('جاري تجهيز ملف PDF...', 'info');

    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // 1. Remove ALL existing stylesheets to prevent html2canvas from parsing OKLCH/OKLAB values
          const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          styles.forEach(s => s.remove());

          // 2. Force a global high-contrast reset via a fresh style tag
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { 
              color: #000000 !important; 
              border-color: #dddddd !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              text-shadow: none !important;
              font-family: Arial, sans-serif !important;
              background-image: none !important;
            }
            body { background: #ffffff !important; }
            table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #000000 !important; }
            th, td { border: 1px solid #dddddd !important; padding: 8px !important; color: #000000 !important; }
            th { background-color: #f3f4f6 !important; font-weight: bold !important; }
            .glass-card { 
              background: #ffffff !important; 
              border: 1px solid #dddddd !important; 
              box-shadow: none !important;
              color: #000000 !important;
              border-radius: 8px !important;
              margin-bottom: 20px !important;
            }
            .text-gold { color: #856404 !important; font-weight: bold !important; }
            .bg-emerald-500 { background-color: #10b981 !important; color: #ffffff !important; }
            .font-mono { font-family: monospace !important; font-weight: bold !important; }
            img { border: 1px solid #eeeeee !important; max-width: 100% !important; }
            .no-print { display: none !important; }
          `;
          clonedDoc.head.appendChild(style);

          // 3. Final DOM scrub to ensure no inline okl colors remain
          const all = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < all.length; i++) {
            const el = all[i] as HTMLElement;
            if (el.style) {
              // Reset problematic inline styles if they exist
              if (el.style.color?.includes('okl')) el.style.color = '#000000';
              if (el.style.backgroundColor?.includes('okl')) el.style.backgroundColor = 'transparent';
              if (el.style.borderColor?.includes('okl')) el.style.borderColor = '#000000';
            }
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`تذاكر-وبياناب-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      showToast('تم تصدير ملف PDF بنجاح', 'success');
    } catch (error) {
      console.error('PDF Export Error:', error);
      showToast('فشل في تصدير PDF', 'error');
    } finally {
      setExporting(false);
    }
  };

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60"
          >
            <ArrowLeft className="w-6 h-6 rotate-180" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Ticket className="w-8 h-8 text-gold" />
              إصدار التذاكر والبيانات
            </h1>
            <p className="text-white/40 text-sm">عرض وطباعة بيانات المسافرين المصنفة حسب الرحلة والعائلة</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportPDF}
            disabled={filteredBookings.length === 0 || exporting}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-gold" />}
            تصدير PDF
          </button>
          <button
            onClick={handlePrint}
            disabled={filteredBookings.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gold text-matte-black font-bold rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] disabled:opacity-50 disabled:hover:scale-100"
          >
            <Printer className="w-5 h-5" />
            طباعة الكشوفات
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs text-white/60 font-bold">اختر الرحلة</label>
            <div className="relative">
              <Plane className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <select 
                className="input-field w-full pr-10"
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
              >
                <option value="">كل الرحلات النشطة</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>{t.name} - {t.tripNumber || 'بدون رقم'}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs text-white/60 font-bold">بحث شامل</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                className="input-field w-full pr-10"
                placeholder="ابحث بالاسم، رقم الجواز، أو رقم الفاتورة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-gold animate-spin" />
          <p className="text-white/40 animate-pulse font-bold">جاري تحميل بيانات التذاكر...</p>
        </div>
      ) : filteredBookings.length > 0 ? (
        <div ref={printRef} className="space-y-16">
          {/* Global Summary Header (Printed only one) */}
          <div className="p-6 glass-card bg-gold/5 border-gold/20 flex justify-between items-center no-print">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" />
              تقرير بيانات المسافرين (كافة المجموعات)
            </h3>
            <span className="text-xs bg-gold/10 px-4 py-2 rounded-full text-gold font-bold border border-gold/20">
              إجمالي المجموعات: {filteredBookings.length} | إجمالي المسجلين: {filteredBookings.reduce((acc, b) => acc + (b.pilgrims?.length || 0), 0)}
            </span>
          </div>

          {filteredBookings.map((booking) => (
            <motion.div 
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 break-after-page"
            >
              {/* Group Header */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-white/[0.05] border-b border-white/10 flex justify-between items-center print:bg-gray-100 print:border-black">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white print:text-black">فاتورة رقم: {booking.regId}</h4>
                      <p className="text-xs text-white/40 print:text-gray-600">مسؤول المجموعة: <span className="text-gold font-bold">{booking.headName}</span></p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-white/40 uppercase font-black print:text-gray-500">تاريخ الحجز</p>
                    <p className="text-sm font-bold text-white print:text-black">
                      {booking.createdAt ? format(new Date(booking.createdAt), 'yyyy/MM/dd') : '---'}
                    </p>
                  </div>
                </div>

                {/* Data Table for this specific group */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[10px] uppercase text-white/40 font-black tracking-widest border-b border-white/10 print:bg-gray-50 print:text-black print:border-black">
                        <th className="px-4 py-4 text-center">#</th>
                        <th className="px-4 py-4">تاريخ الرحلة</th>
                        <th className="px-4 py-4">الرحلة</th>
                        <th className="px-4 py-4">الاسم بالعربي</th>
                        <th className="px-4 py-4">English Name</th>
                        <th className="px-4 py-4">رقم الجواز</th>
                        <th className="px-4 py-4">صلاحية الجواز</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-gray-300">
                      {(booking.pilgrims || []).map((pilgrim, pIdx) => {
                        const trip = trips.find(t => t.id === booking.tripId);
                        return (
                          <tr key={`${booking.id}-${pIdx}`} className="hover:bg-white/[0.02] transition-colors group print:text-black">
                            <td className="px-4 py-4 text-center text-[10px] text-white/20 group-hover:text-gold print:text-gray-400">
                              {pIdx + 1}
                            </td>
                            <td className="px-4 py-4 text-sm text-white/60 font-mono print:text-black">
                              {trip?.startDate ? format(new Date(trip.startDate), 'yyyy/MM/dd') : '---'}
                            </td>
                            <td className="px-4 py-4 text-sm text-white font-bold group-hover:text-gold transition-colors print:text-black">
                              {trip?.name || '---'}
                            </td>
                            <td className="px-4 py-4 text-sm text-white print:text-black select-all">
                              {pilgrim.name}
                            </td>
                            <td className="px-4 py-4 text-sm font-mono uppercase text-gold font-black print:text-black select-all tracking-tight">
                              {pilgrim.englishName || '---'}
                            </td>
                            <td className="px-4 py-4 text-sm font-mono font-black text-white bg-white/[0.02] group-hover:bg-gold/10 transition-all print:text-black select-all">
                              {pilgrim.passportNo || '---'}
                            </td>
                            <td className="px-4 py-4 text-sm text-white/60 font-bold print:text-black">
                              {pilgrim.expiryDate || '---'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Passport Images for this specific group */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(booking.pilgrims || []).map((pilgrim, idx) => (
                  <div key={`${booking.id}-img-${idx}`} className="glass-card overflow-hidden group hover:border-gold/30 transition-all print:border-gray-200">
                    <div className="aspect-[4/3] bg-black/40 relative group-hover:bg-black/20 transition-all overflow-hidden border-b border-white/5">
                      {pilgrim.passportImage ? (
                        <img 
                          src={pilgrim.passportImage} 
                          alt={pilgrim.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/10">
                          <ImageIcon className="w-10 h-10" />
                          <span className="text-[10px] font-black uppercase">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white/[0.02] flex flex-col gap-1 print:bg-white print:text-black">
                      <p className="text-[10px] font-black text-white uppercase truncate font-mono print:text-black">{pilgrim.englishName || '---'}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] text-white/40 font-bold print:text-gray-600 truncate">{pilgrim.name}</p>
                        <p className="text-[9px] font-mono text-gold print:text-black">{pilgrim.passportNo || '---'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center gap-6 glass-card border-dashed">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/10">
            <Ticket className="w-12 h-12" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-white">لا توجد بيانات متاحة</h3>
            <p className="text-white/40 max-w-sm">لم يتم العثور على أي بيانات مسافرين تطابق خيارات البحث الحالية.</p>
          </div>
          <button 
            onClick={() => {
              setSelectedTripId('');
              setSearchTerm('');
            }}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-all border border-white/10"
          >
            إعادة تعيين المرشحات
          </button>
        </div>
      )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { 
            background: white !important; 
            color: black !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .no-print { display: none !important; }
          .glass-card { 
            background: white !important; 
            border: 2px solid #000 !important;
            margin-bottom: 2rem !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
            color: black !important;
          }
          .print-bg-gray { background: #f9fafb !important; }
          .print-border { border: 1px solid #e5e7eb !important; }
          h1, h2, h3, h4, p, span { color: black !important; }
          .text-gold { color: #856404 !important; }
          @page {
            margin: 15mm;
            size: auto;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={clsx(
              "fixed bottom-8 left-8 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl",
              toast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              toast.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" :
              "bg-gold/10 border-gold/20 text-gold"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
