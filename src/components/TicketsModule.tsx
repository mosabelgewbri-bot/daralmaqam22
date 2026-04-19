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
  AlertCircle
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

  const filteredBookings = bookings.filter(b => {
    const matchesTrip = !selectedTripId || b.tripId === selectedTripId;
    const matchesSearch = !searchTerm || 
      b.headName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.regId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.pilgrims || []).some(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.passportNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.englishName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesTrip && matchesSearch;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handlePrint = () => {
    window.print();
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
        <div ref={printRef} className="space-y-12">
          {filteredBookings.map((booking) => (
            <motion.div 
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden print:shadow-none print:border-none print:bg-white print:text-black print:p-0"
            >
              {/* Booking Header (Family Group) */}
              <div className="p-6 bg-white/[0.03] border-b border-white/10 flex flex-wrap justify-between items-center gap-4 print:bg-gray-100 print:border-gray-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20 print:bg-gold/20">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white print:text-black">فاتورة رقم: {booking.regId}</h3>
                    <p className="text-xs text-white/40 mt-1 print:text-gray-500">مسؤول المجموعة: <span className="text-gold font-bold">{booking.headName}</span></p>
                  </div>
                </div>
                <div className="flex gap-4 print:text-xs">
                  <div className="text-right">
                    <p className="text-[10px] text-white/40 uppercase font-black print:text-gray-400">عدد الركاب</p>
                    <p className="text-lg font-bold text-white print:text-black">{booking.passengerCount} فرد</p>
                  </div>
                  <div className="w-px h-10 bg-white/10 print:bg-gray-300" />
                  <div className="text-right">
                    <p className="text-[10px] text-white/40 uppercase font-black print:text-gray-400">تاريخ الحجز</p>
                    <p className="text-lg font-bold text-white print:text-black">
                      {booking.createdAt ? format(new Date(booking.createdAt), 'yyyy/MM/dd') : '---'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pilgrims List (Tickets) */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
                {(booking.pilgrims || []).map((pilgrim, pIdx) => (
                  <div 
                    key={pIdx} 
                    className="flex gap-6 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-gold/20 transition-all group print:bg-white print:border-gray-200 print:text-black print:rounded-none print:border-b last:print:border-b-0 print:p-4"
                  >
                    {/* Passport/Pilgrim Image */}
                    <div className="relative w-32 h-40 flex-shrink-0 bg-white/5 rounded-2xl border border-white/10 overflow-hidden group-hover:border-gold/30 transition-all print:w-24 print:h-32 print:border-gray-300">
                      {pilgrim.passportImage ? (
                        <img 
                          src={pilgrim.passportImage} 
                          alt={pilgrim.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/10">
                          <ImageIcon className="w-10 h-10" />
                          <span className="text-[8px] font-bold uppercase">لا يوجد صورة</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {pilgrim.passportNo && (
                           <div className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[8px] font-black uppercase shadow-lg">متوفر</div>
                        )}
                      </div>
                    </div>

                    {/* Ticket Details */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                           <p className="text-[10px] text-gold font-black uppercase tracking-widest print:text-gray-500">الاسم بالإنجليزية</p>
                           <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-white/20 print:hidden">{pilgrim.relationship === 'Self' ? 'رئيسي' : 'تابع'}</span>
                        </div>
                        <h4 className="text-xl font-black text-white uppercase tracking-tight font-mono print:text-black">
                          {pilgrim.englishName || pilgrim.name || '---'}
                        </h4>
                        <p className="text-sm text-white/40 print:text-gray-600">{pilgrim.name} (عربي)</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <p className="text-[10px] text-white/40 uppercase font-bold print:text-gray-500">رقم الجواز</p>
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-gold print:text-gray-400" />
                            <p className="text-sm font-black text-white font-mono print:text-black">{pilgrim.passportNo || '---'}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-white/40 uppercase font-bold print:text-gray-500">نوع الغرفة</p>
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-3 h-3 text-gold print:text-gray-400" />
                            <p className="text-sm font-bold text-white print:text-black">
                              {pilgrim.roomType === 'Double' ? 'ثنائية' : 
                               pilgrim.roomType === 'Triple' ? 'ثلاثية' : 
                               pilgrim.roomType === 'Quad' ? 'رباعية' : 
                               pilgrim.roomType === 'Quint' ? 'خماسية' : 'تأشيرة فقط'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {pilgrim.expiryDate && (
                        <div className="pt-2">
                           <p className="text-[10px] text-white/40 uppercase font-bold print:text-gray-500">تاريخ انتهاء الجواز</p>
                           <p className="text-xs font-bold text-white/60 print:text-black">{pilgrim.expiryDate}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Section (Flight Info) */}
              <div className="p-4 bg-white/5 border-t border-white/10 flex justify-between items-center print:bg-gray-50 print:border-gray-200">
                <div className="flex items-center gap-3">
                  <Plane className="w-4 h-4 text-gold" />
                  <span className="text-xs font-bold text-white/60 print:text-black">
                    {selectedTrip?.name || trips.find(t => t.id === booking.tripId)?.name || 'رحلة غير معروفة'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase font-black text-white/20 print:text-gray-400">
                   <Logo iconSize={20} hideText={true} />
                   <span>دار المقام للخدمات السياحية</span>
                </div>
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
          }
          .no-print { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:text-black { color: black !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
          .glass-card { 
            background: white !important; 
            border: 1px solid #eee !important;
            box-shadow: none !important;
          }
          @page {
            margin: 10mm;
            size: A4;
          }
          .motion-div {
            opacity: 1 !important;
            transform: none !important;
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
