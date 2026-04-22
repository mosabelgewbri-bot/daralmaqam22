import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, 
  Bus, 
  Hotel, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  Search,
  ChevronRight,
  Phone,
  Layout,
  Car,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Trip, Booking, Pilgrim } from '../types';
import { format, addDays, parseISO, isValid } from 'date-fns';
import { clsx } from 'clsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface TransportStep {
  id: string;
  from: string;
  to: string;
  time: string;
  date: string;
  notes: string;
}

const getTransportTypeArabic = (type: string) => {
  switch (type) {
    case 'Bus': return 'حافلة';
    case 'Private': return 'نقل خاص';
    case 'Train': return 'قطار';
    case 'Other': return 'آخر';
    default: return type;
  }
};

const ArrivalNoticeModule: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success'|'error'|'info' }>({ show: false, message: '', type: 'info' });

  const showToast = (message: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };
  const [error, setError] = useState<string | null>(null);
  
  // Manual Input Fields
  const [mutawwifName, setMutawwifName] = useState('حسن');
  const [mutawwifPhone, setMutawwifPhone] = useState('563709961');
  const [agencyName, setAgencyName] = useState('البراء لخدمات المعتمرين');
  const [vehicleType, setVehicleType] = useState('تويوتا هايس خط واحد');
  const [meccaOpsPhone, setMeccaOpsPhone] = useState('552169783');
  const [medinaOpsPhone, setMedinaOpsPhone] = useState('');
  const [rawdaDate, setRawdaDate] = useState('');
  
  const [editableMakkahHotels, setEditableMakkahHotels] = useState<any[]>([]);
  const [editableMadinahHotels, setEditableMadinahHotels] = useState<any[]>([]);
  const [editableTransportRows, setEditableTransportRows] = useState<any[]>([]);
  
  // Flight Manual Fields (since they might be missing in Trip object)
  const [flightNo, setFlightNo] = useState('');
  const [departureCity, setDepartureCity] = useState('MJI');
  const [destinationCity, setDestinationCity] = useState('JED');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [returnFlightNo, setReturnFlightNo] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnDepartureTime, setReturnDepartureTime] = useState('');
  const [returnArrivalTime, setReturnArrivalTime] = useState('');

  const [transportSteps, setTransportSteps] = useState<TransportStep[]>([
    { id: '1', from: 'المطار', to: 'مكه', time: '', date: '', notes: '' },
    { id: '2', from: 'مكه', to: 'المدينة', time: '', date: '', notes: '' },
    { id: '3', from: 'المدينة', to: 'المطار', time: '', date: '', notes: '' },
  ]);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTrips();
    loadSettings();
  }, []);

  useEffect(() => {
    const convertLogo = async () => {
      const rawLogo = settings.app_logo || "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10L15 40V90H85V40L50 10Z' fill='%23000000' fill-opacity='0.1' stroke='%23000000' stroke-width='2'/%3E%3Cpath d='M50 30L30 50V80H70V50L50 30Z' fill='none' stroke='%23000000' stroke-width='2'/%3E%3Ccircle cx='50' cy='20' r='5' fill='%23000000'/%3E%3C/svg%3E";
      if (rawLogo.startsWith('data:')) {
        setLogoBase64(rawLogo);
        return;
      }
      
      try {
        const response = await fetch(rawLogo, { mode: 'cors' });
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      } catch (e) {
        console.warn('Could not convert logo to base64:', e);
        setLogoBase64(rawLogo);
      }
    };

    if (settings.app_logo || Object.keys(settings).length > 0) {
      convertLogo();
    }
  }, [settings.app_logo, settings]);

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
      if (s.company_name) setAgencyName(s.company_name);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    if (selectedTripId) {
      loadBookings(selectedTripId);
      
      const trip = trips.find(t => t.id === selectedTripId);
      if (trip) {
        setFlightNo(trip.tripNumber || '');
        // Set dates for transport based on trip dates
        setTransportSteps(prev => prev.map((step, idx) => {
          if (idx === 0) return { ...step, date: trip.startDate || trip.departureDate || '' };
          return step;
        }));
      }
    }
  }, [selectedTripId, trips]);

  const loadTrips = async () => {
    try {
      const data = await api.getTrips();
      setTrips(data);
    } catch (err) {
      console.error('Failed to load trips:', err);
    }
  };

  const loadBookings = async (tripId: string) => {
    setIsLoading(true);
    try {
      const allBookings = await api.getBookings();
      // Use more robust filtering similar to VisaModule
      const filtered = allBookings.filter(b => {
        const bTripId = String(b.tripId || (b as any).tripid || (b as any).trip_id || '').trim();
        return bTripId === String(tripId).trim();
      });
      setBookings(filtered);
    } catch (err) {
      setError('تعذر تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  useEffect(() => {
    // Aggregated Hotels for editable state
    const mHotels = bookings.reduce((acc: any[], b) => {
      const hasRelevantPilgrims = b.pilgrims?.some(p => {
        const type = p.serviceType || 'Full';
        return ['Full', 'VisaOnly', 'AccommodationAndVisa', 'TicketAndVisa'].includes(type);
      });
      if (!hasRelevantPilgrims) return acc;
      const tripStartDate = selectedTrip?.startDate || selectedTrip?.departureDate;
      const cin = b.makkahCheckIn || tripStartDate || '';
      const nights = b.makkahNights || 0;
      if (b.makkahHotel && !acc.find(h => h.name === b.makkahHotel && h.cin === cin)) {
        let makkahCout = '';
        if (cin && nights) {
          try {
            const d = parseISO(cin);
            if (isValid(d)) { makkahCout = format(addDays(d, nights), 'yyyy-MM-dd'); }
            else {
              const d2 = new Date(cin);
              if (!isNaN(d2.getTime())) { makkahCout = format(addDays(d2, nights), 'yyyy-MM-dd'); }
            }
          } catch (e) { console.error('Date error:', e); }
        }
        acc.push({ name: b.makkahHotel, city: 'مكة', cin, cout: makkahCout, nights, notes: '' });
      }
      return acc;
    }, []);

    const mdHotels = bookings.reduce((acc: any[], b) => {
      const hasRelevantPilgrims = b.pilgrims?.some(p => {
        const type = p.serviceType || 'Full';
        return ['Full', 'VisaOnly', 'AccommodationAndVisa', 'TicketAndVisa'].includes(type);
      });
      if (!hasRelevantPilgrims) return acc;
      const cin = b.madinahCheckIn || '';
      const nights = b.madinahNights || 0;
      if (b.madinahHotel && !acc.find(h => h.name === b.madinahHotel && h.cin === cin)) {
        let madinahCout = '';
        if (cin && nights) {
          try {
            const d = parseISO(cin);
            if (isValid(d)) { madinahCout = format(addDays(d, nights), 'yyyy-MM-dd'); }
            else {
              const d2 = new Date(cin);
              if (!isNaN(d2.getTime())) { madinahCout = format(addDays(d2, nights), 'yyyy-MM-dd'); }
            }
          } catch (e) { console.error('Date error:', e); }
        }
        acc.push({ name: b.madinahHotel, city: 'المدينة', cin, cout: madinahCout, nights, notes: '' });
      }
      return acc;
    }, []);

    setEditableMakkahHotels(mHotels);
    setEditableMadinahHotels(mdHotels);

    // Initial Transport Rows aggregation
    const tRows = bookings.reduce((acc: any[], b) => {
      const hasRelevantPilgrims = b.pilgrims?.some(p => {
        const type = p.serviceType || 'Full';
        return ['Full', 'VisaOnly', 'AccommodationAndVisa', 'TicketAndVisa'].includes(type);
      });
      if (!hasRelevantPilgrims) return acc;

      const tType = b.transportType || 'Bus';
      const bGroups = Array.from(new Set([
        b.groupNo,
        ...(b.pilgrims || []).map(p => p.groupNo)
      ].filter(Boolean))) as string[];

      if (tType === 'Bus') {
        let busRow = acc.find(r => r.type === 'Bus');
        if (!busRow) {
          busRow = { groups: new Set(), type: 'Bus', vehicle: vehicleType };
          acc.unshift(busRow);
        }
        bGroups.forEach(g => busRow.groups.add(g));
      } else {
        const existing = acc.find(r => r.type === tType);
        if (existing) {
          bGroups.forEach(g => existing.groups.add(g));
        } else {
          acc.push({ 
            groups: new Set(bGroups), 
            type: tType, 
            vehicle: getTransportTypeArabic(tType) 
          });
        }
      }
      return acc;
    }, [] as any[]);

    if (tRows.length === 0 && selectedTripId) {
      tRows.push({ groups: new Set(['---']), type: 'Bus', vehicle: vehicleType });
    }
    setEditableTransportRows(tRows);
  }, [bookings, selectedTripId, trips, vehicleType]);

  // Filter pilgrims based on service types that require a visa/arrival notice
  const relevantPilgrims = bookings.flatMap(b => (b.pilgrims || []).filter(p => {
    const type = p.serviceType || 'Full';
    return ['Full', 'VisaOnly', 'AccommodationAndVisa', 'TicketAndVisa'].includes(type);
  }));

  // Aggregated Data
  const totalPilgrims = relevantPilgrims.length;
  const umrahVisas = relevantPilgrims.filter(p => {
    const type = p.serviceType || 'Full';
    // Standard Umrah visa is often associated with 'Full' or 'VisaOnly'
    // but the system doesn't have an explicit 'VisaType' field yet.
    // We'll stick to a reasonable heuristic or let the user know.
    return type === 'Full' || type === 'VisaOnly';
  }).length;
  const touristVisas = totalPilgrims - umrahVisas;
  
  const allGroupNumbers = Array.from(new Set([
    ...bookings.filter(b => b.pilgrims?.some(p => {
      const type = p.serviceType || 'Full';
      return ['Full', 'VisaOnly', 'AccommodationAndVisa', 'TicketAndVisa'].includes(type);
    })).map(b => b.groupNo),
    ...relevantPilgrims.map(p => p.groupNo)
  ].filter(Boolean))) as string[];

  const addTransportStep = () => {
    setTransportSteps([...transportSteps, { id: Date.now().toString(), from: '', to: '', time: '', date: '', notes: '' }]);
  };

  const removeTransportStep = (id: string) => {
    setTransportSteps(transportSteps.filter(s => s.id !== id));
  };

  const handlePrint = () => {
    if (!selectedTripId) {
      showToast('يرجى اختيار رحلة أولاً', 'error');
      return;
    }
    
    setIsExporting(true);
    // Explicitly focus the window to ensure print works in all browsers/iframes
    window.focus();
    
    // Brief delay to allow state update to render (to hide inputs)
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Print error:', err);
        alert('حدث خطأ أثناء محاولة الطباعة. يرجى تجربة زر "تصدير PDF" كبديل.');
      } finally {
        setIsExporting(false);
      }
    }, 600);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    showToast('جاري تجهيز ملف PDF...', 'info');
    try {
      // Ensure all fonts (Cairo) are fully loaded (with a safety timeout)
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise(resolve => setTimeout(resolve, 3000))
          ]);
        } catch (e) {
          console.warn('Font loading check failed or timed out, proceeding anyway');
        }
      }

      // Capture with a moderate scale for stability and accuracy
      const canvas = await html2canvas(reportRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Ensure cloned elements are fully visible
          const el = clonedDoc.querySelector('.print-section-container') as HTMLElement;
          if (el) {
            el.style.height = 'auto';
            el.style.overflow = 'visible';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 0; // Set to 0 to eliminate exterior white space
      const maxContentWidth = pageWidth;
      const maxContentHeight = pageHeight;
      
      let imgWidth = maxContentWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // If height still exceeds page, scale down to fit
      if (imgHeight > maxContentHeight) {
        imgHeight = maxContentHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      // Center the image on the A4 page
      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = (pageHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`arrival_notice_${flightNo || 'trip'}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      showToast('تم تصدير ملف PDF بنجاح', 'success');
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('حدث خطأ أثناء تصدير ملف PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 arrival-notice-page relative" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border ${
              toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
              toast.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
              'bg-gold/10 text-gold border-gold/20'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
             toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
             <Loader2 className="w-5 h-5 animate-spin" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-black text-white">إشعار الوصول</h1>
          <p className="text-white/40 mt-1">تعبئة وإصدار بوليصة الوصول والبيانات التشغيلية</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            disabled={!selectedTripId || isLoading || isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl font-black hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
          >
            <Printer className="w-5 h-5 text-gold" />
            طباعة الإشعار
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!selectedTripId || isLoading || isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-gold text-black rounded-2xl font-black hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            تصدير PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection & Manual Inputs */}
        <div className="lg:col-span-1 space-y-6 no-print">
          <div className="bg-matte-dark border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-xl">
            <div className="space-y-4">
              <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                <Plane className="w-4 h-4" />
                اختر الرحلة
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold/50"
              >
                <option value="">— اختر رحلة —</option>
                {trips.map(trip => (
                  <option key={trip.id} value={trip.id}>
                    {trip.tripNumber} - {trip.airline} ({trip.startDate || trip.departureDate})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                <Layout className="w-4 h-4" />
                بيانات إضافية
              </label>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 mr-1">المطوف</p>
                  <input
                    type="text"
                    value={mutawwifName}
                    onChange={(e) => setMutawwifName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold/50 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 mr-1">الوكيل / الشركة</p>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold/50 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 mr-1">رقم جوال المطوف</p>
                  <input
                    type="text"
                    value={mutawwifPhone}
                    onChange={(e) => setMutawwifPhone(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold/50 text-sm font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 mr-1">نوع المركبة</p>
                  <input
                    type="text"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold/50 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 mr-1">تاريخ حجز الروضة</p>
                  <input
                    type="date"
                    value={rawdaDate}
                    onChange={(e) => setRawdaDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold/50 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                <Plane className="w-4 h-4" />
                بيانات الطيران (يدوي)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[9px] text-white/40">رقم الرحلة</p>
                  <input value={flightNo} onChange={e => setFlightNo(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-white/40">وقت الإقلاع</p>
                  <input value={departureTime} onChange={e => setDepartureTime(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-white/40">من</p>
                  <input value={departureCity} onChange={e => setDepartureCity(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-white/40">إلى</p>
                  <input value={destinationCity} onChange={e => setDestinationCity(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                </div>
                <div className="space-y-1 col-span-2 pt-2 border-t border-white/5">
                  <p className="text-[9px] text-white/40">رقم رحلة العودة</p>
                  <input value={returnFlightNo} onChange={e => setReturnFlightNo(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-white/40">تاريخ العودة</p>
                  <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-white/40">وقت العودة</p>
                  <input value={returnDepartureTime} onChange={e => setReturnDepartureTime(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                  <Bus className="w-4 h-4" />
                  حركات النقل
                </label>
                <button 
                  onClick={addTransportStep}
                  className="p-1 px-2 border border-gold/20 rounded-lg text-gold hover:bg-gold/10 transition-colors text-[10px]"
                >
                  + إضافة خطوة
                </button>
              </div>
              
              <div className="space-y-3">
                {transportSteps.map((step, idx) => (
                  <div key={step.id} className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 relative group">
                    <button 
                      onClick={() => removeTransportStep(step.id)}
                      className="absolute top-2 left-2 p-1 text-red-500/50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="من"
                        value={step.from}
                        onChange={(e) => {
                          const updated = [...transportSteps];
                          updated[idx].from = e.target.value;
                          setTransportSteps(updated);
                        }}
                        className="bg-transparent border-b border-white/5 py-1 text-xs focus:border-gold/30 outline-none"
                      />
                      <input
                        placeholder="إلى"
                        value={step.to}
                        onChange={(e) => {
                          const updated = [...transportSteps];
                          updated[idx].to = e.target.value;
                          setTransportSteps(updated);
                        }}
                        className="bg-transparent border-b border-white/5 py-1 text-xs focus:border-gold/30 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={step.date}
                        onChange={(e) => {
                          const updated = [...transportSteps];
                          updated[idx].date = e.target.value;
                          setTransportSteps(updated);
                        }}
                        className="bg-transparent border-b border-white/5 py-1 text-[10px] focus:border-gold/30 outline-none"
                      />
                      <input
                        type="time"
                        value={step.time}
                        onChange={(e) => {
                          const updated = [...transportSteps];
                          updated[idx].time = e.target.value;
                          setTransportSteps(updated);
                        }}
                        className="bg-transparent border-b border-white/5 py-1 text-[10px] focus:border-gold/30 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2 space-y-6 flex justify-center bg-gray-900/50 rounded-3xl p-4 md:p-8 overflow-auto h-[calc(100vh-170px)] custom-scrollbar no-print-bg">
          <div className="bg-white shadow-2xl origin-top scale-[0.6] md:scale-[0.8] lg:scale-100 mb-20 text-black print-only-layout">
            {/* The Print Layout (Mimicking Image) */}
            <div ref={reportRef} className="font-sans print-section text-black print-section-container" style={{ width: '210mm', minHeight: '297mm', height: 'auto', background: 'white', padding: '2mm', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
              {/* Report Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4" style={{ direction: 'rtl' }}>
                <div className="w-28 h-20 flex items-center justify-center border border-black rounded p-1 overflow-hidden bg-white">
                  <img 
                    src={logoBase64 || settings.app_logo || "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10L15 40V90H85V40L50 10Z' fill='%23000000' fill-opacity='0.1' stroke='%23000000' stroke-width='2'/%3E%3Cpath d='M50 30L30 50V80H70V50L50 30Z' fill='none' stroke='%23000000' stroke-width='2'/%3E%3Ccircle cx='50' cy='20' r='5' fill='%23000000'/%3E%3C/svg%3E"} 
                    className="max-w-full max-h-full object-contain"
                    alt="Logo"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-center flex-1 py-1" style={{ letterSpacing: '0', direction: 'rtl' }}>
                  <h1 className="text-2xl font-bold uppercase" style={{ margin: '0', padding: '0', lineHeight: '1.2' }}>إشعار وصول معتمرين</h1>
                  <p className="text-sm font-bold" style={{ margin: '0', padding: '0' }}>Arrival Notice</p>
                </div>
                <div className="text-left w-28 pt-2">
                  <p className="text-[10px] font-bold" style={{ whiteSpace: 'nowrap' }}>التاريخ: {format(new Date(), 'yyyy/MM/dd')}</p>
                </div>
              </div>

              {/* Top Info Table */}
              <table className="w-full border-collapse border-[3px] border-black mb-3 text-[10px] print-section" style={{ direction: 'rtl', tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-gray-100 font-bold border-b-[3px] border-black">
                    <th className="border-l-2 border-black py-3 px-1 w-1/4 text-center leading-none">الوكيل</th>
                    <th className="border-l-2 border-black py-3 px-1 w-1/4 text-center leading-none">رقم المجموعة</th>
                    <th className="border-l-2 border-black py-3 px-1 w-1/4 text-center leading-none">نوع المركبة</th>
                    <th className="border-black py-3 px-1 w-1/4 text-center leading-none">اسم المطوف</th>
                  </tr>
                </thead>
                <tbody>
                  {editableTransportRows.map((row, idx) => (
                    <tr key={idx} className={idx < editableTransportRows.length - 1 ? 'border-b-2 border-black' : ''}>
                      {idx === 0 ? (
                        <td className="border-l-2 border-black p-2 text-center text-sm font-bold bg-white" rowSpan={editableTransportRows.length} style={{ verticalAlign: 'middle' }}>
                          <div className="w-full h-full flex items-center justify-center min-h-[50px] leading-relaxed text-base font-black px-2">{agencyName}</div>
                        </td>
                      ) : null}
                      <td className="border-l-2 border-black p-2 text-center font-mono whitespace-pre-wrap leading-tight text-[11px]" style={{ verticalAlign: 'middle' }}>
                        <div className="w-full h-full flex items-center justify-center min-h-[50px]">
                          {Array.from(row.groups as Set<string>).length > 0 ? Array.from(row.groups as Set<string>).join('\n') : '---'}
                        </div>
                      </td>
                      <td className="border-l-2 border-black p-0 text-center font-bold text-xs" style={{ verticalAlign: 'middle' }}>
                        {isExporting ? (
                          <div className="w-full h-full flex items-center justify-center min-h-[50px] px-1">{row.vehicle}</div>
                        ) : (
                          <input
                            type="text"
                            value={row.vehicle}
                            onChange={(e) => {
                              const updated = [...editableTransportRows];
                              updated[idx].vehicle = e.target.value;
                              setEditableTransportRows(updated);
                            }}
                            className="w-full h-full bg-transparent border-none text-center outline-none px-1 text-xs font-bold min-h-[50px]"
                          />
                        )}
                      </td>
                      <td className="border-black p-2 text-center font-bold text-xs" style={{ verticalAlign: 'middle' }}>
                        <div className="w-full h-full flex items-center justify-center min-h-[50px]">{mutawwifName}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Header */}
              <table className="w-full border-collapse border-[3px] border-black mb-3 text-[10px] print-section" style={{ direction: 'rtl', tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-gray-100 font-bold border-b-[3px] border-black">
                    <th className="border-l-2 border-black py-3 px-1 text-center leading-none">عدد التأشيرات السياحية</th>
                    <th className="border-l-2 border-black py-3 px-1 text-center leading-none">عدد تأشيرات العمرة</th>
                    <th className="border-black py-3 px-1 text-center leading-none">العدد الإجمالي للمعتمرين</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-bold text-base">
                    <td className="border-l-2 border-black p-3 text-center bg-gray-50/10">
                      <div className="w-full flex items-center justify-center min-h-[40px]">{touristVisas}</div>
                    </td>
                    <td className="border-l-2 border-black p-3 text-center bg-gray-50/10">
                      <div className="w-full flex items-center justify-center min-h-[40px]">{umrahVisas}</div>
                    </td>
                    <td className="border-black p-3 text-center bg-gray-50/10">
                      <div className="w-full flex items-center justify-center min-h-[40px]">{totalPilgrims}</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Flight Details Section */}
              <table className="w-full border-collapse border-[3px] border-black mb-3 text-[9px] print-section" style={{ direction: 'rtl', tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td className="bg-gray-100 border-l-[3px] border-black w-10 p-0 font-bold" style={{ verticalAlign: 'middle' }}>
                      <div className="flex items-center justify-center h-full min-h-[120px] overflow-visible">
                        <div className="whitespace-nowrap font-bold text-[13px] text-center" style={{ transform: 'rotate(-90deg) translateX(15px)', width: '20px', display: 'block' }}>تفاصيل الطيران</div>
                      </div>
                    </td>
                    <td className="p-0">
                      <table className="w-full border-collapse text-center" style={{ direction: 'rtl', tableLayout: 'fixed' }}>
                        <thead>
                          <tr className="bg-gray-50 border-b-2 border-black font-bold">
                            <th className="border-l-2 border-black py-2.5 px-1 w-[15%]">رقم الرحلة</th>
                            <th className="border-l-2 border-black py-2.5 px-1 w-[15%]">تاريخ التحرك</th>
                            <th className="border-l-2 border-black py-2.5 px-1 w-[10%]">من</th>
                            <th className="border-l-2 border-black py-2.5 px-1 w-[10%]">إلى</th>
                            <th className="border-l-2 border-black py-2.5 px-1 w-[15%]">وقت الإقلاع</th>
                            <th className="border-l-2 border-black py-2.5 px-1 w-[15%]">وقت الوصول</th>
                            <th className="py-2.5 px-1 w-[20%]">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b-2 border-black h-12 font-bold">
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full text-xs">{flightNo || '---'}</div></td>
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full font-mono">{selectedTrip?.startDate || selectedTrip?.departureDate || '---'}</div></td>
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full">{departureCity}</div></td>
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full">{destinationCity}</div></td>
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full font-mono">{departureTime || '---'}</div></td>
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full font-mono">{arrivalTime || '---'}</div></td>
                            <td className="p-1"></td>
                          </tr>
                          <tr className="h-12 font-bold">
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full text-xs">{returnFlightNo || '---'}</div></td>
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full font-mono">{returnDate || '---'}</div></td>
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full">{destinationCity}</div></td>
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full">{departureCity}</div></td>
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full font-mono">{returnDepartureTime || '---'}</div></td>
                            <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full font-mono">{returnArrivalTime || '---'}</div></td>
                            <td className="p-1"></td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Accommodation Details Section */}
              <table className="w-full border-collapse border-[3px] border-black mb-3 text-[9px] print-section" style={{ direction: 'rtl', tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td className="bg-gray-100 border-l-[3px] border-black w-10 p-0 font-bold" style={{ verticalAlign: 'middle' }}>
                      <div className="flex items-center justify-center h-full min-h-[300px] overflow-visible">
                        <div className="whitespace-nowrap font-bold text-[13px] text-center" style={{ transform: 'rotate(-90deg) translateX(25px)', width: '20px', display: 'block' }}>تفاصيل السكن</div>
                      </div>
                    </td>
                    <td className="p-0">
                      <table className="w-full border-collapse text-center" style={{ direction: 'rtl', tableLayout: 'fixed' }}>
                        <thead>
                          <tr className="bg-gray-50 border-b-2 border-black font-bold">
                            <th className="border-l-2 border-black py-2.5 px-1 w-[10%]">المدينة</th>
                            <th className="border-l-2 border-black py-2.5 px-1 w-[35%]">إسم الفندق</th>
                            <th className="border-l-2 border-black py-2.5 px-1 w-[15%]">C/IN</th>
                            <th className="border-l-2 border-black py-2.5 px-1 w-[15%]">C/OUT</th>
                            <th className="border-l-2 border-black py-2.5 px-1 w-[10%]">الليالي</th>
                            <th className="py-2.5 px-1 w-[15%]">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 4 }).map((_, i) => {
                            const hotel = editableMakkahHotels[i];
                            return (
                              <tr key={`makkah-${i}`} className="border-b-2 border-black h-12 font-bold">
                                <td className="border-l-2 border-black bg-gray-50/10 p-1 text-[8px] font-bold"><div className="flex items-center justify-center h-full">{i === 0 ? 'مكة' : ''}</div></td>
                                <td className="border-l-2 border-black p-0 text-[10px]">
                                  {isExporting ? (
                                    <div className="w-full h-full flex items-center justify-center text-center px-1 min-h-[40px] leading-tight break-words">{hotel?.name || ''}</div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={hotel?.name || ''}
                                      onChange={(e) => {
                                        const updated = [...editableMakkahHotels];
                                        if (!updated[i]) updated[i] = { name: '', city: 'مكة', cin: '', cout: '', nights: 0, notes: '' };
                                        updated[i].name = e.target.value;
                                        setEditableMakkahHotels(updated);
                                      }}
                                      className="w-full h-full bg-transparent border-none text-center outline-none px-1"
                                      placeholder="..."
                                    />
                                  )}
                                </td>
                                <td className="border-l-2 border-black p-0 font-mono">
                                  {isExporting ? (
                                    <div className="w-full h-full flex items-center justify-center text-center px-1 font-mono text-[9px] min-h-[40px]">{hotel?.cin || ''}</div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={hotel?.cin || ''}
                                      onChange={(e) => {
                                        const updated = [...editableMakkahHotels];
                                        if (!updated[i]) updated[i] = { name: '', city: 'مكة', cin: '', cout: '', nights: 0, notes: '' };
                                        updated[i].cin = e.target.value;
                                        setEditableMakkahHotels(updated);
                                      }}
                                      className="w-full h-full bg-transparent border-none text-center outline-none px-1 font-mono text-[9px]"
                                    />
                                  )}
                                </td>
                                <td className="border-l-2 border-black p-0 font-mono">
                                  {isExporting ? (
                                    <div className="w-full h-full flex items-center justify-center text-center px-1 font-mono text-[9px] min-h-[40px]">{hotel?.cout || ''}</div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={hotel?.cout || ''}
                                      onChange={(e) => {
                                        const updated = [...editableMakkahHotels];
                                        if (!updated[i]) updated[i] = { name: '', city: 'مكة', cin: '', cout: '', nights: 0, notes: '' };
                                        updated[i].cout = e.target.value;
                                        setEditableMakkahHotels(updated);
                                      }}
                                      className="w-full h-full bg-transparent border-none text-center outline-none px-1 font-mono text-[9px]"
                                    />
                                  )}
                                </td>
                                <td className="border-l-2 border-black p-0">
                                  {isExporting ? (
                                    <div className="w-full h-full flex items-center justify-center text-center px-1 min-h-[40px]">{hotel?.nights || ''}</div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={hotel?.nights || ''}
                                      onChange={(e) => {
                                        const updated = [...editableMakkahHotels];
                                        if (!updated[i]) updated[i] = { name: '', city: 'مكة', cin: '', cout: '', nights: 0, notes: '' };
                                        updated[i].nights = e.target.value;
                                        setEditableMakkahHotels(updated);
                                      }}
                                      className="w-full h-full bg-transparent border-none text-center outline-none px-1"
                                    />
                                  )}
                                </td>
                                <td className="p-0">
                                  {isExporting ? (
                                    <div className="w-full h-full flex items-center justify-center text-center px-1 text-[8px] min-h-[40px] break-words">{hotel?.notes || ''}</div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={hotel?.notes || ''}
                                      onChange={(e) => {
                                        const updated = [...editableMakkahHotels];
                                        if (!updated[i]) updated[i] = { name: '', city: 'مكة', cin: '', cout: '', nights: 0, notes: '' };
                                        updated[i].notes = e.target.value;
                                        setEditableMakkahHotels(updated);
                                      }}
                                      className="w-full h-full bg-transparent border-none text-center outline-none px-1 text-[8px]"
                                    />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {Array.from({ length: 4 }).map((_, i) => {
                            const hotel = editableMadinahHotels[i];
                            return (
                              <tr key={`madinah-${i}`} className="border-b-2 border-black h-12 font-bold last:border-0">
                                <td className="border-l-2 border-black bg-gray-50/10 p-1 text-[8px] font-bold"><div className="flex items-center justify-center h-full">{i === 0 ? 'المدينة' : ''}</div></td>
                                <td className="border-l-2 border-black p-0 text-[10px]">
                                  {isExporting ? (
                                    <div className="w-full h-full flex items-center justify-center text-center px-1 min-h-[40px] leading-tight break-words">{hotel?.name || ''}</div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={hotel?.name || ''}
                                      onChange={(e) => {
                                        const updated = [...editableMadinahHotels];
                                        if (!updated[i]) updated[i] = { name: '', city: 'المدينة', cin: '', cout: '', nights: 0, notes: '' };
                                        updated[i].name = e.target.value;
                                        setEditableMadinahHotels(updated);
                                      }}
                                      className="w-full h-full bg-transparent border-none text-center outline-none px-1"
                                      placeholder="..."
                                    />
                                  )}
                                </td>
                                <td className="border-l-2 border-black p-0 font-mono">
                                  {isExporting ? (
                                    <div className="w-full h-full flex items-center justify-center text-center px-1 font-mono text-[9px] min-h-[40px]">{hotel?.cin || ''}</div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={hotel?.cin || ''}
                                      onChange={(e) => {
                                        const updated = [...editableMadinahHotels];
                                        if (!updated[i]) updated[i] = { name: '', city: 'المدينة', cin: '', cout: '', nights: 0, notes: '' };
                                        updated[i].cin = e.target.value;
                                        setEditableMadinahHotels(updated);
                                      }}
                                      className="w-full h-full bg-transparent border-none text-center outline-none px-1 font-mono text-[9px]"
                                    />
                                  )}
                                </td>
                                <td className="border-l-2 border-black p-0 font-mono">
                                  {isExporting ? (
                                    <div className="w-full h-full flex items-center justify-center text-center px-1 font-mono text-[9px] min-h-[40px]">{hotel?.cout || ''}</div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={hotel?.cout || ''}
                                      onChange={(e) => {
                                        const updated = [...editableMadinahHotels];
                                        if (!updated[i]) updated[i] = { name: '', city: 'المدينة', cin: '', cout: '', nights: 0, notes: '' };
                                        updated[i].cout = e.target.value;
                                        setEditableMadinahHotels(updated);
                                      }}
                                      className="w-full h-full bg-transparent border-none text-center outline-none px-1 font-mono text-[9px]"
                                    />
                                  )}
                                </td>
                                <td className="border-l-2 border-black p-0">
                                  {isExporting ? (
                                    <div className="w-full h-full flex items-center justify-center text-center px-1 min-h-[40px]">{hotel?.nights || ''}</div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={hotel?.nights || ''}
                                      onChange={(e) => {
                                        const updated = [...editableMadinahHotels];
                                        if (!updated[i]) updated[i] = { name: '', city: 'المدينة', cin: '', cout: '', nights: 0, notes: '' };
                                        updated[i].nights = e.target.value;
                                        setEditableMadinahHotels(updated);
                                      }}
                                      className="w-full h-full bg-transparent border-none text-center outline-none px-1"
                                    />
                                  )}
                                </td>
                                <td className="p-0">
                                  {isExporting ? (
                                    <div className="w-full h-full flex items-center justify-center text-center px-1 text-[8px] min-h-[40px] break-words">{hotel?.notes || ''}</div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={hotel?.notes || ''}
                                      onChange={(e) => {
                                        const updated = [...editableMadinahHotels];
                                        if (!updated[i]) updated[i] = { name: '', city: 'المدينة', cin: '', cout: '', nights: 0, notes: '' };
                                        updated[i].notes = e.target.value;
                                        setEditableMadinahHotels(updated);
                                      }}
                                      className="w-full h-full bg-transparent border-none text-center outline-none px-1 text-[8px]"
                                    />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Transport Step Table Section */}
              <table className="w-full border-collapse border-[3px] border-black mb-3 text-[9px] print-section" style={{ direction: 'rtl', tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td className="bg-gray-100 border-l-[3px] border-black w-10 p-0 font-bold" style={{ verticalAlign: 'middle' }}>
                      <div className="flex items-center justify-center h-full min-h-[180px] overflow-visible">
                        <div className="whitespace-nowrap font-bold text-[13px] text-center" style={{ transform: 'rotate(-90deg) translateX(15px)', width: '20px', display: 'block' }}>تفاصيل حركات النقل</div>
                      </div>
                    </td>
                    <td className="p-0">
                      <table className="w-full border-collapse text-center" style={{ direction: 'rtl', tableLayout: 'fixed' }}>
                        <thead>
                          <tr className="bg-gray-50 border-b-2 border-black font-bold">
                            <th className="border-l-2 border-black py-2.5 px-1 w-8">.NO</th>
                            <th className="border-l-2 border-black py-2.5 px-1">من</th>
                            <th className="border-l-2 border-black py-2.5 px-1">إلى</th>
                            <th className="border-l-2 border-black py-2.5 px-1">الوقت</th>
                            <th className="border-l-2 border-black py-2.5 px-1">التاريخ</th>
                            <th className="py-2.5 px-1">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 5 }).map((_, i) => {
                            const step = transportSteps[i];
                            return (
                              <tr key={i} className="border-b-2 border-black h-12 last:border-0 font-bold">
                                <td className="border-l-2 border-black bg-gray-50 p-1"><div className="flex items-center justify-center h-full">{i + 1}</div></td>
                                <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full">{step?.from || ''}</div></td>
                                <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full">{step?.to || ''}</div></td>
                                <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full font-mono">{step?.time || ''}</div></td>
                                <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center h-full font-mono">{step?.date || ''}</div></td>
                                <td className="p-1"><div className="flex items-center justify-center h-full text-[8px]">{step?.notes || ''}</div></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Rawda Date and Contacts */}
              <div className="border-2 border-black mb-3 h-8 flex items-center px-4 font-bold text-[10px] bg-gray-100/30" style={{ direction: 'rtl' }}>
                <span className="ml-4">تاريخ حجز الروضة الشريفة:</span>
                <span className="text-[11px] font-mono">{rawdaDate || '---'}</span>
              </div>

              <div className="border-2 border-black" style={{ direction: 'rtl' }}>
                <div className="bg-gray-100 text-center py-1 border-b-2 border-black font-bold text-[11px]">
                  بيانات الإتصال
                </div>
                <table className="w-full text-center border-collapse text-[10px]" style={{ direction: 'rtl', tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-black font-bold">
                      <th className="border-l-2 border-black p-1 w-1/4">الجهة</th>
                      <th className="border-l-2 border-black p-1 w-2/4">الإسم</th>
                      <th className="p-1 w-1/4">رقم الجوال</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b-2 border-black h-7 font-bold">
                      <td className="border-l-2 border-black p-1 bg-gray-50"><div className="flex items-center justify-center">المطوف</div></td>
                      <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center">{mutawwifName}</div></td>
                      <td className="p-1"><div className="flex items-center justify-center font-mono text-[11px]">{mutawwifPhone}</div></td>
                    </tr>
                    <tr className="border-b-2 border-black h-7 font-bold">
                      <td className="border-l-2 border-black p-1 bg-gray-50"><div className="flex items-center justify-center">عمليات مكة</div></td>
                      <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center">دليل مكة</div></td>
                      <td className="p-1"><div className="flex items-center justify-center font-mono text-[11px]">{meccaOpsPhone}</div></td>
                    </tr>
                    <tr className="h-7 font-bold">
                      <td className="border-l-2 border-black p-1 bg-gray-50"><div className="flex items-center justify-center">عمليات المدينة</div></td>
                      <td className="border-l-2 border-black p-1"><div className="flex items-center justify-center">دليل المدينة</div></td>
                      <td className="p-1"><div className="flex items-center justify-center font-mono text-[11px]">{medinaOpsPhone || '---'}</div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArrivalNoticeModule;
