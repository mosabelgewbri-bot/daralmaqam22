import React, { useState, useEffect, useRef } from 'react';
import { User, Booking, Trip, Pilgrim } from '../types';
import { api } from '../services/api';
import { Search, Printer, CreditCard, ArrowLeft, Hotel, Phone, User as UserIcon, Download, Share2, ImageIcon, Loader2, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import Logo from './Logo';
import html2canvas from 'html2canvas';

export default function PilgrimCardsModule({ user }: { user: User }) {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [makkahRep, setMakkahRep] = useState('');
  const [madinahRep, setMadinahRep] = useState('');
  const [cardBackground, setCardBackground] = useState<string | null>(null);
  const [hideDefaultHeader, setHideDefaultHeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<number | null>(null);

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
        setTrips(tripsData);
        setBookings(bookingsData);
        
        // Load reps from settings if available
        const settings = await api.getSettings();
        if (settings.makkah_rep) setMakkahRep(settings.makkah_rep);
        if (settings.madinah_rep) setMadinahRep(settings.madinah_rep);
        if (settings.card_background) setCardBackground(settings.card_background);
        if (settings.hide_default_header === 'true') setHideDefaultHeader(true);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredBookings = bookings.filter(b => {
    const matchesTrip = !selectedTripId || String(b.tripId).trim() === String(selectedTripId).trim();
    const matchesSearch = !searchTerm || 
      b.headName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.pilgrims || []).some(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTrip && matchesSearch;
  });

  const allPilgrims = filteredBookings.flatMap(b => 
    (b.pilgrims || [])
      .filter(p => !b.isVisaOnly && p.roomType !== 'VisaOnly')
      .map(p => ({
        ...p,
        makkahHotel: b.makkahHotel,
        madinahHotel: b.madinahHotel,
        tripId: b.tripId
      }))
  );

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Collect all styles from the current document
      const allStyles = Array.from(document.querySelectorAll('style')).map(s => s.innerHTML).join('\n');
      
      printWindow.document.write(`
        <html>
          <head>
            <title>طباعة بطاقات المعتمرين</title>
            <style>
              ${allStyles}
              @page {
                size: A6;
                margin: 0;
              }
              body { 
                margin: 0; 
                padding: 0; 
                background: white !important; 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print { display: none !important; }
              .card { 
                width: 105mm !important; 
                height: 148mm !important; 
                margin: 0 !important; 
                page-break-after: always !important; 
                border: none !important; 
                box-shadow: none !important; 
                border-radius: 0 !important;
                display: block !important;
                position: relative !important;
              }
              .no-print-container { margin: 0 !important; padding: 0 !important; }
              .grid { display: block !important; }
            </style>
          </head>
          <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handleExportToCanva = async (index: number, name: string) => {
    const cardElement = document.getElementById(`card-${index}`);
    if (!cardElement) return;

    setExporting(index);
    try {
      // Create a high-quality canvas
      const canvas = await html2canvas(cardElement, {
        scale: 3, // High resolution for Canva
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `بطاقة_${name}_${new Date().getTime()}.png`;
      link.href = imgData;
      link.click();
      
      // Optional: Inform user they can now upload to Canva
      // showToast('تم تحميل البطاقة بجودة عالية. يمكنك الآن رفعها إلى Canva.', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('حدث خطأ أثناء التصدير', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    if (allPilgrims.length === 0) return;
    setExporting(-1); // Special value for "all"
    
    try {
      // Create a temporary container for all cards to ensure they are rendered for export
      for (let i = 0; i < allPilgrims.length; i++) {
        const p = allPilgrims[i];
        const cardElement = document.getElementById(`card-${i}`);
        if (cardElement) {
          const canvas = await html2canvas(cardElement, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false
          });
          const imgData = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `بطاقة_${p.name}_${i + 1}.png`;
          link.href = imgData;
          link.click();
          // Small delay to prevent browser blocking multiple downloads
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }
    } catch (error) {
      console.error('Export all error:', error);
      showToast('حدث خطأ أثناء تصدير الكل', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setCardBackground(base64);
      try {
        await api.saveSettings({ card_background: base64 });
      } catch (err) {
        console.error('Error saving background:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeBackground = async () => {
    setCardBackground(null);
    try {
      await api.saveSettings({ card_background: '' });
    } catch (err) {
      console.error('Error removing background:', err);
    }
  };

  const toggleHeader = async () => {
    const newValue = !hideDefaultHeader;
    setHideDefaultHeader(newValue);
    try {
      await api.saveSettings({ hide_default_header: String(newValue) });
    } catch (err) {
      console.error('Error saving header toggle:', err);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">بطاقات المعتمرين</h1>
            <p className="text-white/40 text-sm">توليد وطباعة بطاقات التعريف للمعتمرين بحجم A6</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <input 
            type="file" 
            id="bg-upload" 
            className="hidden" 
            accept="image/*" 
            onChange={handleBackgroundUpload}
          />
          <button
            onClick={handleExportAll}
            disabled={exporting !== null || allPilgrims.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10 disabled:opacity-50"
          >
            {exporting === -1 ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            تصدير الكل لـ Canva
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-gold text-matte-black font-bold rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          >
            <Printer className="w-5 h-5" />
            طباعة الكل
          </button>
        </div>
      </div>

      {/* Design Settings & Filters */}
      <div className="glass-card p-6 space-y-6 no-print">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-gold" />
              تخصيص مظهر البطاقة
            </h2>
            <p className="text-white/40 text-xs">يمكنك استيراد تصميم من Canva كخلفية للبطاقة</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => document.getElementById('bg-upload')?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold font-bold rounded-lg hover:bg-gold/20 transition-all border border-gold/20 text-sm"
            >
              <Download className="w-4 h-4" />
              استيراد من Canva
            </button>
            {cardBackground && (
              <>
                <button
                  onClick={removeBackground}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 font-bold rounded-lg hover:bg-red-500/20 transition-all border border-red-500/20 text-sm"
                >
                  حذف الخلفية
                </button>
                <button
                  onClick={toggleHeader}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-all border text-sm",
                    hideDefaultHeader 
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                      : "bg-white/5 text-white/60 border-white/10"
                  )}
                >
                  {hideDefaultHeader ? "إظهار الهيدر" : "إخفاء الهيدر"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-white/60 font-bold">اختر الرحلة</label>
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
          <div className="space-y-2">
            <label className="text-xs text-white/60 font-bold">بحث عن معتمر</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                className="input-field w-full pl-10"
                placeholder="اسم المعتمر..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-white/60 font-bold">رقم مندوب مكة</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                className="input-field w-full pl-10"
                placeholder="00966..."
                value={makkahRep}
                onChange={(e) => setMakkahRep(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-white/60 font-bold">رقم مندوب المدينة</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                className="input-field w-full pl-10"
                placeholder="00966..."
                value={madinahRep}
                onChange={(e) => setMadinahRep(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={async () => {
                try {
                  await api.saveSettings({ 
                    makkah_rep: makkahRep, 
                    madinah_rep: madinahRep,
                    hide_default_header: String(hideDefaultHeader)
                  });
                  showToast('تم حفظ الإعدادات بنجاح', 'success');
                } catch (e) {
                  showToast('فشل حفظ الإعدادات', 'error');
                }
              }}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl border border-white/10 transition-all text-sm font-bold"
            >
              حفظ كافتراضي
            </button>
          </div>
        </div>
      </div>

      {/* Cards Preview */}
      {selectedTripId ? (
        allPilgrims.length > 0 ? (
          <div ref={printRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 print:block print:space-y-0">
            {allPilgrims.map((p, idx) => (
              <div key={idx} className="space-y-4 no-print-container">
                <div 
                  id={`card-${idx}`}
                  className="card mx-auto print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0"
                  style={{ 
                    pageBreakAfter: 'always',
                    backgroundImage: cardBackground ? `url(${cardBackground})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* الهيدر */}
                  {!hideDefaultHeader && (
                    <div className="header">
                        <div className="logo-box">
                            <Logo iconSize={180} hideText={true} transparent={true} />
                        </div>
                        <div className="brand-container">
                          <div className="brand-text">
                            دار <span>المقام</span>
                          </div>
                          <div className="brand-subtitle">للخدمات السياحية والحج والعمرة</div>
                        </div>
                    </div>
                  )}

                  {/* المحتوى */}
                  <div className={clsx("content", hideDefaultHeader && "pt-24")}>
                      {!cardBackground && (
                        <svg className="watermark" viewBox="0 0 100 100">
                            <rect width="100" height="100" fill="black"/>
                            <path d="M40 35 H75 V65 H40 Z" fill="#d5a933"/>
                        </svg>
                      )}

                      <span className="field-label">الاسم الكامل للعميل</span>
                      <div className="name-display">{p.name || '---'}</div>

                      <div className="grid-container">
                          <div className="info-block">
                              <div className="info-header">
                                  <div className="icon-sq">H</div>
                                  <span>فندق مكة</span>
                              </div>
                              <div className="val-display">{p.makkahHotel || '---'}</div>
                          </div>
                          <div className="info-block">
                              <div className="info-header">
                                  <div className="icon-sq">H</div>
                                  <span>فندق المدينة</span>
                              </div>
                              <div className="val-display">{p.madinahHotel || '---'}</div>
                          </div>
                      </div>

                      <div className="footer-section">
                          <div className="reps-row">
                              <div className="rep-item">
                                  <div className="rep-label">مندوب مكة</div>
                                  <div className="phone-val">{makkahRep || '---'}</div>
                              </div>
                              <div style={{ width: '1px', height: '30px', background: '#eee' }}></div>
                              <div className="rep-item">
                                  <div className="rep-label">مندوب المدينة</div>
                                  <div className="phone-val">{madinahRep || '---'}</div>
                              </div>
                          </div>
                      </div>

                      <div className="slogan-text">للخدمات السياحية والحج والعمرة</div>
                  </div>
                </div>
                
                <div className="flex justify-center gap-2 no-print">
                  <button 
                    onClick={() => handleExportToCanva(idx, p.name || 'معتمر')}
                    disabled={exporting !== null}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg border border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    {exporting === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                    تصدير لـ Canva
                  </button>
                  <button 
                    onClick={() => {
                      // Print single card logic
                      const cardElement = document.getElementById(`card-${idx}`);
                      if (!cardElement) return;
                      
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        const allStyles = Array.from(document.querySelectorAll('style')).map(s => s.innerHTML).join('\n');
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>طباعة بطاقة</title>
                              <style>
                                ${allStyles}
                                @page { 
                                  size: A6; 
                                  margin: 0; 
                                }
                                body { 
                                  margin: 0; 
                                  padding: 0; 
                                  background: white !important; 
                                  -webkit-print-color-adjust: exact;
                                  print-color-adjust: exact;
                                }
                                .card { 
                                  width: 105mm !important; 
                                  height: 148mm !important; 
                                  margin: 0 !important; 
                                  border: none !important; 
                                  box-shadow: none !important; 
                                  border-radius: 0 !important;
                                  display: block !important;
                                  position: relative !important;
                                }
                              </style>
                            </head>
                            <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
                              ${cardElement.outerHTML}
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg border border-white/10 transition-all"
                    title="طباعة هذه البطاقة"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 text-center space-y-4 no-print">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <UserIcon className="w-10 h-10 text-white/20" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">لا يوجد معتمرين ببرنامج كامل</h3>
              <p className="text-white/40">هذه الرحلة لا تحتوي على معتمرين ببرنامج كامل (تأشيرة فقط مستبعدون)</p>
            </div>
          </div>
        )
      ) : (
        <div className="glass-card p-12 text-center space-y-4 no-print">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <CreditCard className="w-10 h-10 text-white/20" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">برجاء اختيار رحلة</h3>
            <p className="text-white/40">يجب اختيار رحلة أولاً لعرض بطاقات المعتمرين وتجهيزها للطباعة</p>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');

        :root {
            --primary-gold: #d5a933; 
            --dark-bg: #000000;
            --light-bg: #ffffff;
            --text-dark: #1a1a1a;
            --text-muted: #777777;
        }

        .card {
            width: 100%;
            max-width: 400px;
            aspect-ratio: 105 / 148;
            background: var(--light-bg);
            border-radius: 30px;
            overflow: hidden;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            position: relative;
            border: 1px solid #eeeeee;
            direction: rtl;
            text-align: right;
            font-family: 'Cairo', sans-serif;
        }

        .header {
            background: var(--dark-bg);
            padding: 10px 20px;
            display: flex;
            flex-direction: row-reverse;
            justify-content: center;
            align-items: center;
            gap: 25px;
            border-bottom: 4px solid var(--primary-gold);
            border-bottom-left-radius: 40px;
            border-bottom-right-radius: 40px;
            height: 150px;
            box-sizing: border-box;
            position: relative;
        }

        .brand-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            text-align: center;
            margin-top: -15px;
            margin-right: -15px;
        }

        .brand-text {
            color: #ffffff;
            font-size: 36px;
            font-weight: 900;
            line-height: 1;
            white-space: nowrap;
            margin: 0;
            padding: 0;
        }

        .brand-text span {
            color: var(--primary-gold);
        }

        .brand-subtitle {
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
            margin-top: 15px;
            white-space: nowrap;
            opacity: 0.9;
        }

        .logo-box {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0;
            transform: translateY(-5px);
        }

        .kufi-logo-svg {
            width: 100%;
            height: 100%;
        }

        .content {
            padding: 15px;
            text-align: center;
            position: relative;
            display: flex;
            flex-direction: column;
            height: calc(100% - 140px);
            box-sizing: border-box;
            z-index: 1;
        }

        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            opacity: 0.04;
            pointer-events: none;
            z-index: 0;
        }

        .field-label {
            color: var(--primary-gold);
            font-size: 13px;
            font-weight: 700;
            display: block;
            margin-bottom: 5px;
        }

        .name-display {
            font-size: 24px;
            font-weight: 900;
            color: var(--text-dark);
            margin-bottom: 25px;
            border-bottom: 2px solid #f1f1f1;
            padding-bottom: 8px;
        }

        .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
            position: relative;
            z-index: 1;
        }

        .info-block {
            background: #fff;
        }

        .info-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            color: var(--primary-gold);
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .icon-sq {
            width: 18px;
            height: 18px;
            border: 1.5px solid var(--primary-gold);
            border-radius: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 9px;
        }

        .val-display {
            font-size: 16px;
            font-weight: 800;
            color: #333;
            border-bottom: 1px dashed #ddd;
            padding-bottom: 4px;
        }

        .footer-section {
            background: #fcfcfc;
            border-radius: 20px;
            padding: 12px;
            border: 1px solid #f0f0f0;
            margin-top: auto;
        }

        .reps-row {
            display: flex;
            justify-content: space-around;
        }

        .rep-item {
            text-align: center;
        }

        .rep-label {
            font-size: 10px;
            color: var(--text-muted);
            margin-bottom: 3px;
        }

        .phone-val {
            font-size: 16px;
            font-weight: 900;
            color: var(--text-dark);
            direction: ltr;
        }

        .slogan-text {
            margin-top: auto;
            padding-top: 10px;
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 700;
        }

        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .card { 
            width: 105mm !important;
            height: 148mm !important;
            margin: 0 !important;
            page-break-after: always !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page {
            size: A6;
            margin: 0;
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
            {toast.type === 'info' && <ImageIcon className="w-6 h-6" />}
            <span className="font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
