import React, { useState, useEffect } from 'react';
import { User, Trip, Pilgrim } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Upload, AlertCircle, Loader2, ArrowLeft, ShieldCheck, FileText, Download, Camera, Scan, Eye, X, MessageSquare, CheckCircle2, Zap } from 'lucide-react';
import Logo from './Logo';
import PassportScanner from './PassportScanner';
import { differenceInMonths, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { useNavigate, useParams } from 'react-router-dom';
import { extractPassportData } from '../services/geminiService';
import { resizeImage } from '../utils/imageUtils';
import { deduplicateBookings, getRolePermissions } from '../utils/dataUtils';
import { api } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { sendWhatsAppMessage, generateWelcomeMessage } from '../utils/whatsapp';

export default function BookingForm({ user }: { user: User }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [pilgrims, setPilgrims] = useState<Partial<Pilgrim>[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState<number | null>(null);
  const [activeScannerIndex, setActiveScannerIndex] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedBooking, setSavedBooking] = useState<any>(null);
  const [viewingPassport, setViewingPassport] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const fieldRefs = React.useRef<Record<string, HTMLElement | null>>({});
  
  // Hotel Stay Details
  const [makkahHotel, setMakkahHotel] = useState('');
  const [makkahNights, setMakkahNights] = useState(0);
  const [madinahHotel, setMadinahHotel] = useState('');
  const [madinahNights, setMadinahNights] = useState(0);
  const [manualTicketPrice, setManualTicketPrice] = useState<number>(0);
  const [isVisaOnly, setIsVisaOnly] = useState(false);
  
  // Head of Family State
  const [headName, setHeadName] = useState('');
  const [regId, setRegId] = useState('');
  const [phone, setPhone] = useState('');
  const [isDuplicateRegId, setIsDuplicateRegId] = useState(false);
  
  // Room Pricing State
  const [roomPrices, setRoomPrices] = useState<Record<string, { price: number, currency: string }>>({
    Double: { price: 0, currency: 'LYD' },
    Triple: { price: 0, currency: 'LYD' },
    Quad: { price: 0, currency: 'LYD' },
    Quint: { price: 0, currency: 'LYD' },
    VisaOnly: { price: 0, currency: 'LYD' },
  });

  useEffect(() => {
    const checkDuplicate = async () => {
      if (regId) {
        try {
          const duplicate = await api.checkDuplicateRegId(regId, id);
          setIsDuplicateRegId(duplicate);
        } catch (error) {
          console.error('Error checking duplicate regId:', error);
        }
      } else {
        setIsDuplicateRegId(false);
      }
    };
    checkDuplicate();
  }, [regId, id]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const tripsData = await api.getTrips();
        setTrips(tripsData);

        if (id) {
          const bookingToEdit = await api.getBookingById(id);
          if (bookingToEdit) {
            setSelectedTripId(bookingToEdit.tripId);
            setPassengerCount(bookingToEdit.passengerCount);
            setPilgrims(bookingToEdit.pilgrims);
            setMakkahHotel(bookingToEdit.makkahHotel || '');
            setMakkahNights(bookingToEdit.makkahNights || 0);
            setMadinahHotel(bookingToEdit.madinahHotel || '');
            setMadinahNights(bookingToEdit.madinahNights || 0);
            setHeadName(bookingToEdit.headName || '');
            setRegId(bookingToEdit.regId || '');
            setPhone(bookingToEdit.phone || '');
            setIsVisaOnly(bookingToEdit.isVisaOnly || false);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    setPilgrims(prev => {
      let current = [...prev];
      
      if (current.length < passengerCount) {
        for (let i = current.length; i < passengerCount; i++) {
          current.push({ relationship: 'Self', roomType: isVisaOnly ? 'VisaOnly' : 'Double', visaStatus: 'Pending' });
        }
      } else if (current.length > passengerCount) {
        current = current.slice(0, passengerCount);
      }
      
      if (isVisaOnly) {
        current = current.map(p => ({ ...p, roomType: 'VisaOnly' }));
      }
      
      return current;
    });
  }, [passengerCount, isVisaOnly]);

  const isExpiredSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    try {
      const expiryDate = parseISO(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threshold = new Date(today);
      threshold.setMonth(today.getMonth() + 6);
      return expiryDate < threshold;
    } catch {
      return false;
    }
  };

  const handleFileUpload = async (index: number, file: File) => {
    setOcrLoading(index);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        console.log(`Starting OCR extraction for pilgrim ${index} on client side...`);
        
        // Resize image before sending to OCR to reduce payload size and improve reliability
        const resizedImage = await resizeImage(base64);
        const data = await extractPassportData(resizedImage);
        
        console.log("OCR Data received:", data);
        
        if (data) {
          handleScanResult(index, data, resizedImage);
        } else {
          console.warn("OCR returned empty or invalid data");
          const updated = [...pilgrims];
          updated[index] = { ...updated[index], passportImage: resizedImage };
          setPilgrims(updated);
        }
      } catch (e: any) {
        console.error("OCR Failed", e);
        
        // Provide more specific error message if available
        let errorMessage = "فشل استخراج البيانات من الصورة. يرجى إدخال البيانات يدوياً.";
        if (e.message) {
          if (e.message.includes("API key not valid") || e.message.includes("غير صالح") || e.message.includes("API_KEY_INVALID")) {
            errorMessage = "مفتاح API غير صالح. يرجى التأكد من نسخ المفتاح كاملاً من Google AI Studio وتفعيل Generative Language API.";
          } else if (e.message.includes("Quota exceeded") || e.message.includes("تجاوز حصة")) {
            errorMessage = "تم تجاوز حصة الاستخدام المجانية لمفتاح API. يرجى المحاولة لاحقاً.";
          } else if (e.message.includes("API key is not configured") || e.message.includes("غير مكوّن")) {
            errorMessage = "مفتاح API غير مكوّن على الخادم. يرجى إضافة GEMINI_API_KEY في إعدادات Vercel.";
          }
        }
        
        showToast(errorMessage, 'error');
        
        const updated = [...pilgrims];
        updated[index] = { ...updated[index], passportImage: base64 };
        setPilgrims(updated);
      } finally {
        setOcrLoading(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleScanResult = (index: number, data: any, image: string) => {
    console.log("BookingForm: Received scan result for index", index, data);
    const updated = [...pilgrims];
    
    // Support multiple naming conventions from OCR
    const extractedNo = data.passportNumber || data.passport_number || data.passportNo || data.number || '';
    const extractedExpiry = data.expiryDate || data.expiry_date || data.expiry || '';
    const extractedName = data.fullNameArabic || data.nameArabic || data.name_arabic || data.name || '';
    
    console.log("BookingForm: Extracted fields:", { extractedNo, extractedExpiry, extractedName });
    
    const expiryDate = extractedExpiry || updated[index].expiryDate || '';
    const isInvalid = isExpiredSoon(expiryDate);
    
    updated[index] = { 
      ...updated[index], 
      name: extractedName || updated[index].name || '',
      passportNo: isInvalid ? 'الجواز منتهي الصلاحية' : (extractedNo || updated[index].passportNo || ''), 
      expiryDate: expiryDate,
      passportImage: image
    };
    
    if (index === 0 && !headName && extractedName) {
      console.log("BookingForm: Setting headName to", extractedName);
      setHeadName(extractedName);
    }
    
    setPilgrims(updated);
    console.log("BookingForm: State updated successfully");
  };

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  // Financial Calculations
  const calculateTotals = () => {
    let ticketsLYD = 0;
    let ticketsUSD = 0;
    let packageLYD = 0;
    let packageUSD = 0;

    if (selectedTrip) {
      if (selectedTrip.currency === 'LYD') ticketsLYD = manualTicketPrice * passengerCount;
      else ticketsUSD = manualTicketPrice * passengerCount;
    }

    pilgrims.forEach(p => {
      if (p.roomType) {
        const pricing = roomPrices[p.roomType];
        if (pricing.currency === 'LYD') packageLYD += pricing.price;
        else packageUSD += pricing.price;
      }
    });

    return {
      ticketsLYD,
      ticketsUSD,
      packageLYD,
      packageUSD,
      totalLYD: ticketsLYD + packageLYD,
      totalUSD: ticketsUSD + packageUSD
    };
  };

  const totals = calculateTotals();

  const exportInvoicePDF = async () => {
    if (!savedBooking) return;
    
    const tripName = selectedTrip?.name || 'الرحلة المختارة';
    
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
          <h1 style="font-size: 56px; color: #d4af37; margin: 0; font-family: 'Amiri', serif; font-weight: bold; line-height: 1.2;">فاتورة حجز إلكترونية</h1>
          <p style="font-size: 24px; color: #555; margin: 15px 0 0 0; font-weight: 500;">لرحلة ${tripName} - دار المقام لإدارة العمرة</p>
        </div>
        <div style="text-align: left; border-right: 2px solid #eee; padding-right: 30px;">
          <div style="font-size: 16px; color: #999; margin-bottom: 5px;">رقم الفاتورة</div>
          <div style="font-size: 22px; font-weight: bold; color: #d4af37;">${savedBooking.id}</div>
          <div style="font-size: 14px; color: #999; margin-top: 10px;">التاريخ: ${new Date(savedBooking.createdAt).toLocaleDateString('ar-LY')}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
        <div style="background: #f9f9f9; padding: 25px; border-radius: 15px; border: 1px solid #eee;">
          <h3 style="color: #d4af37; margin-top: 0; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-bottom: 15px;">بيانات رب الأسرة</h3>
          <p style="margin: 5px 0;"><strong>الاسم:</strong> ${savedBooking.headName}</p>
          <p style="margin: 5px 0;"><strong>رقم القيد:</strong> ${savedBooking.regId}</p>
          <p style="margin: 5px 0;"><strong>الهاتف:</strong> ${savedBooking.phone}</p>
        </div>
        <div style="background: #f9f9f9; padding: 25px; border-radius: 15px; border: 1px solid #eee;">
          <h3 style="color: #d4af37; margin-top: 0; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-bottom: 15px;">تفاصيل الرحلة</h3>
          <p style="margin: 5px 0;"><strong>الرحلة:</strong> ${tripName}</p>
          <p style="margin: 5px 0;"><strong>شركة الطيران:</strong> ${selectedTrip?.airline}</p>
          <p style="margin: 5px 0;"><strong>عدد المعتمرين:</strong> ${savedBooking.passengerCount}</p>
        </div>
      </div>

      <div style="background: #fcfaf0; padding: 25px; border-radius: 15px; border: 1px solid #d4af37; margin-bottom: 40px;">
        <h3 style="color: #d4af37; margin-top: 0; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-bottom: 15px;">بيانات الإقامة</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <p style="margin: 0;"><strong>فندق مكة:</strong> ${savedBooking.makkahHotel} (${savedBooking.makkahNights} ليالي)</p>
          <p style="margin: 0;"><strong>فندق المدينة:</strong> ${savedBooking.madinahHotel} (${savedBooking.madinahNights} ليالي)</p>
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
          ${savedBooking.pilgrims.map((p: any, idx: number) => `
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
            <span>إجمالي التذاكر:</span>
            <span>${savedBooking.totals.ticketsLYD.toLocaleString()} د.ل</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 16px;">
            <span>إجمالي البرنامج:</span>
            <span>${savedBooking.totals.packageLYD.toLocaleString()} د.ل</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px solid #d4af37; margin-top: 15px;">
            <span style="font-size: 20px; font-weight: bold; color: #d4af37;">الإجمالي الكلي:</span>
            <div style="text-align: left;">
              <div style="font-size: 28px; font-weight: bold; color: #d4af37;">${savedBooking.totals.totalLYD.toLocaleString()} د.ل</div>
              <div style="font-size: 28px; font-weight: bold; color: #d4af37; margin-top: 5px;">${savedBooking.totals.totalUSD.toLocaleString()} دولار</div>
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
      const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait for invoice
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`فاتورة_${savedBooking.headName}_${savedBooking.id}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      showToast('حدث خطأ أثناء تصدير ملف PDF. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      document.body.removeChild(printWindow);
    }
  };

  if (showSuccess && savedBooking) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-matte-black p-8 flex items-center justify-center"
      >
        <div className="glass-card w-full max-w-4xl p-8 space-y-8 border-gold/30">
          <div className="flex justify-between items-start border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
              <Logo iconSize={40} textSize="text-3xl" showSubtitle={false} />
              <div className="h-10 w-px bg-white/10" />
              <div>
                <h1 className="text-xl font-bold text-gold">{id ? 'تحديث الحجز' : 'تأكيد الحجز'}</h1>
                <p className="text-white/40 font-mono text-xs">رقم الفاتورة: {savedBooking.id}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">دار المقام</p>
              <p className="text-xs text-white/40">نظام إدارة العمرة</p>
              <p className="text-xs text-white/40">{new Date(savedBooking.createdAt).toLocaleDateString('ar-LY')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gold uppercase tracking-widest">رب الأسرة</h3>
              <div className="space-y-1">
                <p className="text-lg font-medium">{savedBooking.headName}</p>
                <p className="text-sm text-white/60">رقم القيد: {savedBooking.regId}</p>
                <p className="text-sm text-white/60">الهاتف: {savedBooking.phone}</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gold uppercase tracking-widest">تفاصيل الرحلة</h3>
              <div className="space-y-1">
                <p className="text-lg font-medium">{selectedTrip?.name}</p>
                <p className="text-sm text-white/60">شركة الطيران: {selectedTrip?.airline}</p>
                <p className="text-sm text-white/60">عدد المعتمرين: {savedBooking.passengerCount}</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gold uppercase tracking-widest">بيانات الإقامة</h3>
              <div className="space-y-1">
                <p className="text-sm text-white/60">مكة: {savedBooking.makkahHotel} ({savedBooking.makkahNights} ليالي)</p>
                <p className="text-sm text-white/60">المدينة: {savedBooking.madinahHotel} ({savedBooking.madinahNights} ليالي)</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-right">
              <thead className="bg-white/5 text-[10px] uppercase text-white/40">
                <tr>
                  <th className="px-6 py-3">اسم المعتمر</th>
                  <th className="px-6 py-3">العلاقة</th>
                  <th className="px-6 py-3">نوع الغرفة</th>
                  <th className="px-6 py-3">رقم الجواز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {savedBooking.pilgrims.map((p: any, idx: number) => (
                  <tr key={idx} className="text-sm">
                    <td className="px-6 py-4">{p.name}</td>
                    <td className="px-6 py-4 text-white/60">{p.relationship === 'Self' ? 'نفسه' : p.relationship === 'Spouse' ? 'زوج/ة' : p.relationship === 'Child' ? 'ابن/ة' : p.relationship === 'Parent' ? 'أب/أم' : 'آخر'}</td>
                    <td className="px-6 py-4 text-white/60">{p.roomType === 'Double' ? 'ثنائية' : p.roomType === 'Triple' ? 'ثلاثية' : p.roomType === 'Quad' ? 'رباعية' : p.roomType === 'Quint' ? 'خماسية' : 'تأشيرة فقط'}</td>
                    <td className="px-6 py-4 font-mono text-xs">{p.passportNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-6 border-t border-white/10">
            <div className="space-y-2 text-right">
              <div className="flex items-center gap-2 text-emerald-400 justify-end">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-widest">تم تأكيد الدفع</span>
              </div>
              <p className="text-xs text-white/40 max-w-xs">هذه فاتورة إلكترونية تم إنشاؤها آلياً ولا تحتاج لتوقيع.</p>
            </div>
            <div className="text-right space-y-2">
              <div className="flex justify-between gap-12 text-sm text-white/60">
                <span>إجمالي التذاكر</span>
                <span>{savedBooking.totals.ticketsLYD.toLocaleString()} د.ل</span>
              </div>
              <div className="flex justify-between gap-12 text-sm text-white/60">
                <span>إجمالي البرنامج</span>
                <span>{savedBooking.totals.packageLYD.toLocaleString()} د.ل</span>
              </div>
              <div className="flex justify-between gap-12 pt-2 border-t border-white/10">
                <span className="text-lg font-bold text-white">الإجمالي الكلي</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gold">{savedBooking.totals.totalLYD.toLocaleString()} د.ل</div>
                  <div className="text-2xl font-bold text-gold">{savedBooking.totals.totalUSD.toLocaleString()} دولار</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-8">
            <button 
              onClick={exportInvoicePDF}
              className="btn-gold flex-1 py-3 flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" /> تصدير PDF
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-white/10 hover:bg-white/20 text-white flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-5 h-5" /> طباعة مباشرة
            </button>
            <button 
              onClick={() => {
                const message = generateWelcomeMessage(savedBooking.headName, selectedTrip?.name || '');
                sendWhatsAppMessage(savedBooking.phone, message);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <MessageSquare className="w-5 h-5" /> رسالة ترحيب (WhatsApp)
            </button>
            <button 
              onClick={() => {
                setShowSuccess(false);
                setSavedBooking(null);
                if (id) {
                  navigate('/booking');
                } else {
                  setSelectedTripId('');
                  setPassengerCount(1);
                  setPilgrims([{ relationship: 'Self', roomType: 'Double', visaStatus: 'Pending' }]);
                  setHeadName('');
                  setRegId('');
                  setPhone('');
                  setMakkahHotel('');
                  setMakkahNights(0);
                  setMadinahHotel('');
                  setMadinahNights(0);
                  setManualTicketPrice(0);
                }
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> حجز جديد
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5 rotate-180" /> العودة للتقارير
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const handleSave = async () => {
    console.log('handleSave triggered');
    if (loading) {
      console.log('Already loading, skipping');
      return;
    }
    const newErrors: Record<string, boolean> = {};
    let firstErrorField: string | null = null;
    setFormError(null);

    const setError = (field: string) => {
      newErrors[field] = true;
      if (!firstErrorField) firstErrorField = field;
    };

    console.log('Validating form data...');
    if (!selectedTripId) setError('selectedTripId');
    if (!headName) setError('headName');
    if (!regId) setError('regId');
    
    // Check for duplicate regId
    let allBookings: any[] = [];
    try {
      console.log('Fetching bookings for duplicate check...');
      allBookings = await api.getBookings();
      if (regId && allBookings.some((b: any) => String(b.regId).trim() === String(regId).trim() && b.id !== id)) {
        console.warn('Duplicate regId found');
        setError('regId');
        setFormError('رقم القيد هذا مسجل مسبقاً في حجز آخر');
      }
    } catch (error) {
      console.error('Error checking duplicate regId during save:', error);
    }

    if (!phone) setError('phone');
    if (!isVisaOnly) {
      if (!makkahHotel) setError('makkahHotel');
      if (makkahNights <= 0) setError('makkahNights');
      if (!madinahHotel) setError('madinahHotel');
      if (madinahNights <= 0) setError('madinahNights');
    }

    pilgrims.forEach((p, idx) => {
      if (!p.name) setError(`pilgrimName-${idx}`);
      if (!p.passportNo || p.passportNo === 'الجواز منتهي الصلاحية') setError(`pilgrimPassportNo-${idx}`);
      if (!p.expiryDate || isExpiredSoon(p.expiryDate)) setError(`pilgrimExpiryDate-${idx}`);
      
      // Validate room price for the selected room type (only for new bookings)
      if (!id && roomPrices[p.roomType].price <= 0) {
        setError(`roomPrice-${p.roomType}`);
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      console.warn('Validation failed with errors:', newErrors);
      if (firstErrorField && fieldRefs.current[firstErrorField]) {
        fieldRefs.current[firstErrorField]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldRefs.current[firstErrorField]?.focus?.();
      }
      
      if (!formError) {
        setFormError('الرجاء إكمال جميع الحقول المطلوبة والتأكد من صلاحية الجوازات');
      }
      return;
    }

    console.log('Validation passed, starting save process...');
    setLoading(true);

    try {
      const oldBooking = id ? allBookings.find((b: any) => b.id === id) : null;

      // 1. Create/Update Booking Object
      const bookingData = {
        ...(oldBooking || {}),
        id: id || `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        tripId: selectedTripId,
        headName,
        regId,
        phone,
        passengerCount,
        pilgrims: isVisaOnly ? pilgrims.map(p => ({ ...p, roomType: 'VisaOnly' })) : pilgrims,
        totals,
        makkahHotel: isVisaOnly ? 'تأشيرة فقط' : makkahHotel,
        makkahNights: isVisaOnly ? 0 : makkahNights,
        madinahHotel: isVisaOnly ? 'تأشيرة فقط' : madinahHotel,
        madinahNights: isVisaOnly ? 0 : madinahNights,
        isVisaOnly,
        paidLYD: (oldBooking?.paidLYD || 0),
        paidUSD: (oldBooking?.paidUSD || 0),
        paidCashLYD: (oldBooking?.paidCashLYD || 0),
        paidTransferLYD: (oldBooking?.paidTransferLYD || 0),
        paidCashUSD: (oldBooking?.paidCashUSD || 0),
        paidTransferUSD: (oldBooking?.paidTransferUSD || 0),
        createdAt: oldBooking ? oldBooking.createdAt : new Date().toISOString(),
        updatedAt: id ? new Date().toISOString() : undefined,
        createdBy: oldBooking ? oldBooking.createdBy : user.id,
        status: oldBooking ? oldBooking.status : 'Confirmed'
      };

      console.log('Saving booking data:', bookingData);
      // 2. Save Booking to API
      await api.saveBooking(bookingData);
      console.log('Booking saved successfully');

      // 3. Save/Update Customer for Marketing
      try {
        await api.saveCustomer({
          name: bookingData.headName,
          phone: bookingData.phone,
          lastBookingDate: new Date().toISOString()
        });
        console.log('Customer info saved/updated');
      } catch (custError) {
        console.error('Error saving customer info:', custError);
        // Don't block the booking flow if customer save fails
      }

      // Refresh trips to get updated available seats from server
      console.log('Refreshing trips...');
      const updatedTrips = await api.getTrips();
      setTrips(updatedTrips);

      setSavedBooking(bookingData);
      setShowSuccess(true);
    } catch (error: any) {
      console.error('Save error:', error);
      setFormError(error.message || 'حدث خطأ أثناء حفظ الحجز');
    } finally {
      setLoading(false);
    }
  };

  const permissions = getRolePermissions(user.role);
  const canSave = !id || permissions.canEdit;

  return (
    <>
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
            <h2 className="text-4xl font-bold gold-text-gradient mb-2">{id ? 'تعديل حجز' : 'إنشاء حجز جديد'}</h2>
            <p className="text-white/60">أدخل بيانات المعتمر وتفاصيل الرحلة</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all">إلغاء</button>
          {canSave && (
            <button onClick={handleSave} className="btn-gold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> {id ? 'حفظ التعديلات' : 'تأكيد الحجز'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold text-gold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> اختيار الرحلة
            </h3>
            <div className="space-y-2">
              <label className="text-xs text-white/60">اختر الرحلة</label>
              <select 
                ref={(el) => (fieldRefs.current['selectedTripId'] = el)}
                className={clsx("input-field w-full", errors.selectedTripId && "border-red-500 bg-red-500/10")}
                value={selectedTripId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedTripId(id);
                  setErrors(prev => ({ ...prev, selectedTripId: false }));
                  const trip = trips.find(t => t.id === id);
                  if (trip) {
                    setManualTicketPrice(trip.ticketPrice);
                  } else {
                    setManualTicketPrice(0);
                  }
                }}
              >
                <option value="">اختر رحلة...</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} (بقي {t.availableSeats} مقاعد)
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-gold uppercase tracking-widest">نوع الحجز</h4>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsVisaOnly(false);
                    setPilgrims(prev => prev.map(p => ({ ...p, roomType: 'Double' })));
                  }}
                  className={clsx(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all border",
                    !isVisaOnly ? "bg-gold/20 border-gold text-gold" : "bg-white/5 border-white/10 text-white/40"
                  )}
                >
                  برنامج كامل
                </button>
                <button 
                  onClick={() => {
                    setIsVisaOnly(true);
                    setPilgrims(prev => prev.map(p => ({ ...p, roomType: 'VisaOnly' })));
                  }}
                  className={clsx(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all border",
                    isVisaOnly ? "bg-gold/20 border-gold text-gold" : "bg-white/5 border-white/10 text-white/40"
                  )}
                >
                  تأشيرة فقط
                </button>
              </div>
            </div>

            {selectedTrip && (
              <div className="p-4 bg-gold/5 border border-gold/10 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/40 uppercase tracking-widest">شركة الطيران</p>
                  <p className="text-sm font-bold text-white">{selectedTrip.airline}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/40 uppercase tracking-widest">المقاعد المتاحة</p>
                  <p className="text-sm font-bold text-emerald-400">{selectedTrip.availableSeats} / {selectedTrip.totalSeats}</p>
                </div>
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <p className="text-xs text-white/40 uppercase tracking-widest">سعر التذكرة (يدوي)</p>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      className="input-field w-full py-1 text-lg font-bold text-gold"
                      value={manualTicketPrice}
                      onChange={(e) => setManualTicketPrice(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-gold font-bold">{selectedTrip.currency}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={clsx("glass-card p-6 space-y-4 md:col-span-3 transition-all duration-500", isVisaOnly && "opacity-50 pointer-events-none grayscale")}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gold">تفاصيل الإقامة والفندق</h3>
              {isVisaOnly && <span className="text-[10px] bg-gold/20 text-gold px-2 py-1 rounded-full font-bold">غير مطلوب (تأشيرة فقط)</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1 text-right">
                <label className="text-[10px] text-white/40 uppercase">فندق مكة</label>
                <input 
                  ref={(el) => (fieldRefs.current['makkahHotel'] = el)}
                  type="text" 
                  className={clsx("input-field w-full py-1.5 text-sm", errors.makkahHotel && "border-red-500 bg-red-500/10")}
                  placeholder="اسم الفندق"
                  value={makkahHotel}
                  onChange={(e) => {
                    setMakkahHotel(e.target.value);
                    setErrors(prev => ({ ...prev, makkahHotel: false }));
                  }}
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] text-white/40 uppercase">ليالي مكة</label>
                <input 
                  ref={(el) => (fieldRefs.current['makkahNights'] = el)}
                  type="number" 
                  className={clsx("input-field w-full py-1.5 text-sm", errors.makkahNights && "border-red-500 bg-red-500/10")}
                  placeholder="0"
                  value={makkahNights === 0 ? '' : makkahNights}
                  onChange={(e) => {
                    setMakkahNights(parseInt(e.target.value) || 0);
                    setErrors(prev => ({ ...prev, makkahNights: false }));
                  }}
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] text-white/40 uppercase">فندق المدينة</label>
                <input 
                  ref={(el) => (fieldRefs.current['madinahHotel'] = el)}
                  type="text" 
                  className={clsx("input-field w-full py-1.5 text-sm", errors.madinahHotel && "border-red-500 bg-red-500/10")}
                  placeholder="اسم الفندق"
                  value={madinahHotel}
                  onChange={(e) => {
                    setMadinahHotel(e.target.value);
                    setErrors(prev => ({ ...prev, madinahHotel: false }));
                  }}
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] text-white/40 uppercase">ليالي المدينة</label>
                <input 
                  ref={(el) => (fieldRefs.current['madinahNights'] = el)}
                  type="number" 
                  className={clsx("input-field w-full py-1.5 text-sm", errors.madinahNights && "border-red-500 bg-red-500/10")}
                  placeholder="0"
                  value={madinahNights === 0 ? '' : madinahNights}
                  onChange={(e) => {
                    setMadinahNights(parseInt(e.target.value) || 0);
                    setErrors(prev => ({ ...prev, madinahNights: false }));
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-gold">بيانات رب الأسرة</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 text-right">
              <label className="text-xs text-white/60">الاسم بالكامل</label>
              <input 
                ref={(el) => (fieldRefs.current['headName'] = el)}
                type="text" 
                className={clsx("input-field w-full", errors.headName && "border-red-500 bg-red-500/10")}
                placeholder="الاسم بالكامل" 
                value={headName}
                onChange={(e) => {
                  setHeadName(e.target.value);
                  setErrors(prev => ({ ...prev, headName: false }));
                }}
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-xs text-white/60">رقم القيد</label>
              <input 
                ref={(el) => (fieldRefs.current['regId'] = el)}
                type="text" 
                className={clsx("input-field w-full", (errors.regId || isDuplicateRegId) && "border-red-500 bg-red-500/10")}
                placeholder="رقم القيد" 
                value={regId}
                onChange={(e) => {
                  setRegId(e.target.value);
                  setErrors(prev => ({ ...prev, regId: false }));
                }}
              />
              {isDuplicateRegId && (
                <p className="text-[10px] text-red-500 mt-1 font-medium">رقم الفاتورة موجودة سابقا</p>
              )}
            </div>
            <div className="space-y-2 text-right">
              <label className="text-xs text-white/60">رقم الهاتف</label>
              <input 
                ref={(el) => (fieldRefs.current['phone'] = el)}
                type="text" 
                className={clsx("input-field w-full", errors.phone && "border-red-500 bg-red-500/10")}
                placeholder="+218 ..." 
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setErrors(prev => ({ ...prev, phone: false }));
                }}
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-xs text-white/60">عدد المعتمرين</label>
              <input 
                type="number" 
                min="1" 
                max="20"
                className="input-field w-full" 
                value={passengerCount === 0 ? '' : passengerCount}
                onChange={(e) => setPassengerCount(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

      <AnimatePresence>
        {activeScannerIndex !== null && (
          <PassportScanner 
            onScan={(data, image) => handleScanResult(activeScannerIndex, data, image)}
            onClose={() => setActiveScannerIndex(null)}
          />
        )}
      </AnimatePresence>

      <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h3 className="font-semibold text-gold">أفراد العائلة</h3>
            <span className="text-xs bg-white/10 px-3 py-1 rounded-full">{passengerCount} معتمرين</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-white/5 text-xs uppercase text-white/40">
                <tr>
                  <th className="px-6 py-4">الاسم</th>
                  <th className="px-6 py-4">العلاقة</th>
                  {!isVisaOnly && <th className="px-6 py-4">نوع الغرفة</th>}
                  <th className="px-6 py-4">بيانات الجواز</th>
                  <th className="px-6 py-4">رفع</th>
                  <th className="px-6 py-4">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pilgrims.map((p, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        ref={(el) => (fieldRefs.current[`pilgrimName-${idx}`] = el)}
                        type="text" 
                        className={clsx(
                          "bg-transparent border-b border-white/10 focus:border-gold outline-none w-full py-1 text-right",
                          errors[`pilgrimName-${idx}`] && "border-red-500 bg-red-500/10"
                        )}
                        placeholder="أدخل الاسم"
                        value={p.name || ''}
                        onChange={(e) => {
                          const updated = [...pilgrims];
                          updated[idx].name = e.target.value;
                          setPilgrims(updated);
                          setErrors(prev => ({ ...prev, [`pilgrimName-${idx}`]: false }));
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        className="bg-transparent border-b border-white/10 focus:border-gold outline-none w-full py-1 text-right"
                        value={p.relationship}
                        onChange={(e) => {
                          const updated = [...pilgrims];
                          updated[idx].relationship = e.target.value;
                          setPilgrims(updated);
                        }}
                      >
                        <option value="Self">نفسه</option>
                        <option value="Spouse">زوج/ة</option>
                        <option value="Child">ابن/ة</option>
                        <option value="Parent">أب/أم</option>
                        <option value="Other">آخر</option>
                      </select>
                    </td>
                    {!isVisaOnly && (
                      <td className="px-6 py-4">
                        <select 
                          className="bg-transparent border-b border-white/10 focus:border-gold outline-none w-full py-1 text-right"
                          value={p.roomType}
                          onChange={(e) => {
                            const updated = [...pilgrims];
                            updated[idx].roomType = e.target.value as any;
                            setPilgrims(updated);
                          }}
                        >
                          <option value="Double">ثنائية</option>
                          <option value="Triple">ثلاثية</option>
                          <option value="Quad">رباعية</option>
                          <option value="Quint">خماسية</option>
                          <option value="VisaOnly">تأشيرة فقط</option>
                        </select>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="relative">
                          <input 
                            ref={(el) => (fieldRefs.current[`pilgrimPassportNo-${idx}`] = el)}
                            type="text" 
                            className={clsx(
                              "bg-transparent border-b border-white/10 focus:border-gold outline-none w-full py-1 text-sm transition-all text-right",
                              p.passportNo && p.passportNo !== 'الجواز منتهي الصلاحية' && "border-emerald-500/50 text-emerald-400",
                              (p.passportNo === 'الجواز منتهي الصلاحية' || errors[`pilgrimPassportNo-${idx}`]) && "border-red-500/50 text-red-500 font-bold bg-red-500/5",
                              ocrLoading === idx && "opacity-50 animate-pulse"
                            )}
                            placeholder={ocrLoading === idx ? "جاري المسح..." : "رقم الجواز"}
                            value={p.passportNo || ''}
                            onChange={(e) => {
                              const updated = [...pilgrims];
                              updated[idx].passportNo = e.target.value;
                              setPilgrims(updated);
                              setErrors(prev => ({ ...prev, [`pilgrimPassportNo-${idx}`]: false }));
                            }}
                          />
                          {ocrLoading === idx && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2">
                              <Loader2 className="w-3 h-3 animate-spin text-gold" />
                            </div>
                          )}
                          {p.passportNo && !ocrLoading && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={clsx(
                                "absolute left-0 top-1/2 -translate-y-1/2 text-[8px] font-bold uppercase tracking-tighter px-1 rounded",
                                p.passportNo === 'الجواز منتهي الصلاحية' ? "text-red-500 bg-red-500/10" : "text-emerald-500 bg-emerald-500/10"
                              )}
                            >
                              {p.passportNo === 'الجواز منتهي الصلاحية' ? 'منتهي' : 'تعبئة تلقائية'}
                            </motion.div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <input 
                              ref={(el) => (fieldRefs.current[`pilgrimExpiryDate-${idx}`] = el)}
                              type="date" 
                              className={clsx(
                                "bg-transparent border-b border-white/10 focus:border-gold outline-none w-full py-1 text-sm text-right",
                                (isExpiredSoon(p.expiryDate) || errors[`pilgrimExpiryDate-${idx}`]) && "text-red-500 font-bold border-red-500 bg-red-500/10"
                              )}
                              value={p.expiryDate || ''}
                              onChange={(e) => {
                                const updated = [...pilgrims];
                                const newDate = e.target.value;
                                updated[idx].expiryDate = newDate;
                                if (newDate && isExpiredSoon(newDate)) {
                                  updated[idx].passportNo = 'الجواز منتهي الصلاحية';
                                }
                                setPilgrims(updated);
                                setErrors(prev => ({ ...prev, [`pilgrimExpiryDate-${idx}`]: false }));
                              }}
                            />
                            {isExpiredSoon(p.expiryDate) && <AlertCircle className="w-4 h-4 text-red-500 animate-bounce" />}
                          </div>
                          {isExpiredSoon(p.expiryDate) && (
                            <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest">
                              هام: الصلاحية أقل من 6 أشهر
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setActiveScannerIndex(idx)}
                          className="p-2 hover:bg-gold/20 rounded-lg text-gold transition-all"
                          title="مسح بالكاميرا"
                        >
                          <Camera className="w-5 h-5" />
                        </button>
                        <label className="cursor-pointer hover:text-gold transition-colors p-2 hover:bg-white/10 rounded-lg">
                          {ocrLoading === idx ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Upload className={clsx("w-5 h-5", p.passportImage ? "text-emerald-500" : "text-white/40")} />
                          )}
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(idx, e.target.files[0])}
                          />
                        </label>
                        {p.passportImage && (
                          <button 
                            onClick={() => setViewingPassport(p.passportImage || null)}
                            className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-all"
                            title="عرض الجواز"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                        {p.passportImage && (
                          <div className="w-10 h-10 rounded bg-white/10 overflow-hidden border border-white/20 shadow-lg cursor-pointer" onClick={() => setViewingPassport(p.passportImage || null)}>
                            <img src={p.passportImage} className="w-full h-full object-cover" alt="Passport" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => {
                          if (passengerCount > 1) {
                            setPassengerCount(prev => prev - 1);
                            setPilgrims(prev => prev.filter((_, i) => i !== idx));
                          } else {
                            showToast('يجب أن يكون هناك معتمر واحد على الأقل', 'warning');
                          }
                        }}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                        title="حذف المعتمر"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="font-semibold text-gold text-right">تسعير الغرف الذكي</h3>
            <div className="space-y-4">
              {['Double', 'Triple', 'Quad', 'Quint', 'VisaOnly']
                .filter(type => isVisaOnly ? type === 'VisaOnly' : true)
                .map((type) => (
                <div key={type} className="flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 accent-gold" 
                    checked={roomPrices[type].price > 0}
                    readOnly
                  />
                  <span className="w-20 text-sm text-right">
                    {type === 'Double' ? 'ثنائية' : 
                     type === 'Triple' ? 'ثلاثية' : 
                     type === 'Quad' ? 'رباعية' : 
                     type === 'Quint' ? 'خماسية' : 'تأشيرة فقط'}
                  </span>
                  <input 
                    ref={(el) => (fieldRefs.current[`roomPrice-${type}`] = el)}
                    type="number" 
                    className={clsx("input-field flex-1 text-right", errors[`roomPrice-${type}`] && "border-red-500 bg-red-500/10")}
                    placeholder="السعر" 
                    value={roomPrices[type].price === 0 ? '' : roomPrices[type].price}
                    onChange={(e) => {
                      setRoomPrices(prev => ({
                        ...prev,
                        [type]: { ...prev[type], price: parseFloat(e.target.value) || 0 }
                      }));
                      setErrors(prev => ({ ...prev, [`roomPrice-${type}`]: false }));
                    }}
                  />
                  <select 
                    className="input-field w-24 text-right"
                    value={roomPrices[type].currency}
                    onChange={(e) => {
                      setRoomPrices(prev => ({
                        ...prev,
                        [type]: { ...prev[type], currency: e.target.value }
                      }));
                    }}
                  >
                    <option value="LYD">د.ل</option>
                    <option value="USD">دولار</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 space-y-6 bg-gold/5 border-gold/20">
            <h3 className="font-semibold text-gold text-right">الملخص المالي</h3>
            <div className="space-y-3">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/60">إجمالي التذاكر</span>
                <span className="font-mono">{totals.ticketsLYD.toLocaleString()} د.ل / {totals.ticketsUSD.toLocaleString()} دولار</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">إجمالي البرنامج</span>
                <span className="font-mono">{totals.packageLYD.toLocaleString()} د.ل / {totals.packageUSD.toLocaleString()} دولار</span>
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                <span className="text-lg font-bold">الإجمالي الكلي</span>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gold">{totals.totalLYD.toLocaleString()} د.ل</p>
                  <p className="text-lg text-white/60">{totals.totalUSD.toLocaleString()} دولار</p>
                </div>
              </div>
            </div>
            {canSave && (
              <button 
                onClick={handleSave}
                disabled={loading}
                className="btn-gold w-full py-4 text-lg shadow-lg shadow-gold/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'تأكيد الحجز وإصدار الفاتورة'
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {viewingPassport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setViewingPassport(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewingPassport;
                    link.download = `passport-${Date.now()}.jpg`;
                    link.click();
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  title="تحميل الصورة"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewingPassport(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-2">
                <img
                  src={viewingPassport}
                  alt="Passport Preview"
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
              </div>
              <div className="p-4 bg-black/40 border-t border-white/10 flex justify-between items-center">
                <p className="text-sm text-white/60">معاينة صورة الجواز</p>
                <button
                  onClick={() => setViewingPassport(null)}
                  className="text-sm text-gold hover:underline"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={clsx(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md",
              toast.type === 'success' ? "bg-emerald-500/90 border-emerald-500/20 text-white" :
              toast.type === 'error' ? "bg-red-500/90 border-red-500/20 text-white" :
              "bg-blue-500/90 border-blue-500/20 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
             toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
             <Zap className="w-5 h-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
