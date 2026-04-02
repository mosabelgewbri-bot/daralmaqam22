import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  Users, 
  Search, 
  MessageSquare, 
  Send, 
  Filter, 
  Calendar, 
  Phone, 
  Mail,
  Trash2,
  CheckCircle2,
  Megaphone,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  PlusCircle,
  Download,
  Image as ImageIcon,
  X,
  Copy,
  Globe,
  Edit2,
  ArrowRight,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { api } from '../services/api';
import { User, Customer, UmrahOffer } from '../types';
import { clsx } from 'clsx';
import { sendWhatsAppMessage } from '../utils/whatsapp';

import { translateOffer } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

import { resizeImage } from '../utils/image';

interface MarketingModuleProps {
  user: User;
}

// Memoized Row Component
const CustomerRow = memo(({ 
  customer, 
  isSelected, 
  onToggle 
}: { 
  customer: Customer, 
  isSelected: boolean, 
  onToggle: (id: string) => void 
}) => {
  return (
    <tr 
      className={clsx(
        "group hover:bg-white/[0.02] transition-colors cursor-pointer",
        isSelected && "bg-gold/5"
      )}
      onClick={() => onToggle(customer.id)}
    >
      <td className="px-6 py-4">
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => {}} // Handled by tr onClick
          className="rounded border-white/10 bg-white/5 text-gold focus:ring-gold"
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gold font-bold border border-white/10 group-hover:border-gold/30 transition-colors">
            {customer.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{customer.name}</p>
            <p className="text-[10px] text-white/40">{customer.email || 'لا يوجد بريد'}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-white/60">
          <Phone className="w-3 h-3" />
          <span className="text-xs font-mono">{customer.phone}</span>
          {customer.hasWhatsApp && (
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center" title="واتساب مفعل">
              <MessageSquare className="w-2.5 h-2.5 text-emerald-500" />
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-white/40">
          <Calendar className="w-3 h-3" />
          <span className="text-[10px]">{customer.lastContact || 'لم يتم التواصل'}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
          نشط
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              sendWhatsAppMessage(customer.phone, 'مرحباً، نود إطلاعكم على أحدث عروض العمرة من دار المقام.');
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-500 text-white/40 transition-all"
            title="إرسال واتساب"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-white/40 transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default function MarketingModule({ user }: MarketingModuleProps) {
  const { t, language } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [offers, setOffers] = useState<UmrahOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<UmrahOffer | null>(null);
  const [showOfferSelector, setShowOfferSelector] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [customMessage, setCustomMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCopyingNumbers, setIsCopyingNumbers] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [genPrefix, setGenPrefix] = useState('091');
  const [genStart, setGenStart] = useState('1000000');
  const [genCount, setGenCount] = useState('100');
  const [genType, setGenType] = useState<'sequential' | 'random'>('random');

  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanNumbers = async () => {
    if (!window.confirm('هل تريد تنظيف وتنسيق جميع أرقام الهواتف في قاعدة البيانات؟ سيتم إزالة التكرار وتصحيح الصيغ.')) return;
    
    setIsCleaning(true);
    try {
      const allCustomers = await api.getCustomers();
      const normalized = allCustomers.map(c => {
        let phone = c.phone.replace(/\D/g, '');
        if (phone.startsWith('218')) phone = '0' + phone.substring(3);
        if (phone.startsWith('9')) phone = '0' + phone;
        return { ...c, phone };
      });

      // Deduplicate
      const uniqueMap = new Map();
      normalized.forEach(c => {
        if (!uniqueMap.has(c.phone)) {
          uniqueMap.set(c.phone, c);
        }
      });

      const uniqueCustomers = Array.from(uniqueMap.values());
      await api.bulkSaveCustomers(uniqueCustomers);
      await fetchData();
      alert('تم تنظيف وتنسيق الأرقام بنجاح');
    } catch (error) {
      console.error('Error cleaning numbers:', error);
      alert('حدث خطأ أثناء تنظيف الأرقام');
    } finally {
      setIsCleaning(false);
    }
  };

  const fetchData = async (sync = false) => {
    if (sync) setIsSyncing(true);
    else setIsLoading(true);
    
    try {
      if (sync) {
        const custData = await api.syncCustomersFromBookings();
        setCustomers(custData);
        alert('تم تحديث قائمة العملاء من الحجوزات بنجاح');
      } else {
        const [custData, offerData] = await Promise.all([
          api.getCustomers(),
          api.getUmrahOffers()
        ]);
        setCustomers(custData);
        setOffers(offerData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (sync) alert('حدث خطأ أثناء تحديث البيانات من الحجوزات');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  const [filter, setFilter] = useState<'all' | 'active' | 'previous' | 'whatsapp'>('all');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.phone.includes(debouncedSearch);
      
      if (filter === 'all') return matchesSearch;
      if (filter === 'whatsapp') return matchesSearch && c.hasWhatsApp;
      return matchesSearch;
    });
  }, [customers, debouncedSearch, filter]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const toggleCustomerSelection = useCallback((id: string) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return;
    
    setIsImporting(true);
    setImportProgress(0);
    setImportError(null);
    try {
      const lines = bulkInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const newCustomers = lines.map(line => {
        // More robust parsing: try to find a phone number (9-14 digits)
        // and treat the rest as the name
        
        // Remove all non-numeric characters for phone detection
        const digitsOnly = line.replace(/\D/g, '');
        
        let phone = '';
        let name = '';
        
        // Try to find a sequence of digits that looks like a phone number
        // Libyan numbers are usually 09x-xxxxxxx (10 digits) or 9x-xxxxxxx (9 digits)
        const phoneMatch = line.match(/(?:\+?218|0)?(9[1245][0-9]{7})/);
        
        if (phoneMatch) {
          phone = phoneMatch[1]; // The 9-digit part
          // Normalize to 09xxxxxxxx
          phone = '0' + phone;
          
          // The name is everything else
          name = line.replace(phoneMatch[0], '').replace(/[,|\t:\-]/g, ' ').trim();
        } else if (digitsOnly.length >= 9 && digitsOnly.length <= 14) {
          // Fallback: if we just have a bunch of digits
          phone = digitsOnly;
          if (phone.startsWith('9')) phone = '0' + phone;
          if (phone.startsWith('218')) phone = '0' + phone.substring(3);
          
          name = line.replace(digitsOnly, '').replace(/[,|\t:\-]/g, ' ').trim();
        }
        
        if (!name) name = `عميل ${phone}`;
        
        return { name, phone, hasWhatsApp: true };
      }).filter(c => c.phone.length >= 9); // Ensure valid phone length

      if (newCustomers.length === 0) {
        setImportError('لم يتم العثور على أرقام هواتف صالحة للاستيراد. يرجى التأكد من كتابة الأرقام بشكل صحيح (مثال: 0912345678)');
        setIsImporting(false);
        return;
      }

      // Deduplicate by phone number locally before sending to API
      const uniqueCustomers = Array.from(
        newCustomers.reduce((map, cust) => {
          map.set(cust.phone, cust);
          return map;
        }, new Map<string, { name: string, phone: string, hasWhatsApp: boolean }>()).values()
      );

      setImportTotal(uniqueCustomers.length);

      // Bulk save using the new API method with progress tracking
      // Process in smaller chunks locally to update progress
      const chunkSize = 100;
      for (let i = 0; i < uniqueCustomers.length; i += chunkSize) {
        const chunk = uniqueCustomers.slice(i, i + chunkSize);
        await api.bulkSaveCustomers(chunk);
        setImportProgress(Math.min(i + chunkSize, uniqueCustomers.length));
      }
      
      await fetchData();
      setShowBulkImport(false);
      setBulkInput('');
      alert(`تم استيراد ${uniqueCustomers.length} عميل بنجاح (من أصل ${newCustomers.length} رقم تم العثور عليه)`);
    } catch (error: any) {
      console.error('Error importing customers:', error);
      let errorMessage = error?.message || 'حدث خطأ غير متوقع';
      
      // Try to parse JSON error if it's from handleFirestoreError
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        // Not JSON, keep original message
      }
      
      setImportError(`حدث خطأ أثناء الاستيراد: ${errorMessage}`);
    } finally {
      setIsImporting(false);
    }
  };

  const generateNumbers = () => {
    const count = parseInt(genCount) || 100;
    const start = parseInt(genStart) || 1000000;
    const samples = [];
    
    for (let i = 0; i < count; i++) {
      let suffix = '';
      if (genType === 'sequential') {
        suffix = (start + i).toString().padStart(7, '0');
      } else {
        suffix = Math.floor(Math.random() * 9000000 + 1000000).toString();
      }
      const phone = genPrefix + suffix;
      samples.push(`عميل واتساب ${i + 1},${phone}`);
    }
    setBulkInput(samples.join('\n'));
  };

  const generateSampleLibyanNumbers = () => {
    setGenPrefix('091');
    setGenCount('2000');
    setGenType('random');
    // We'll just call the new generator with these defaults
    const count = 2000;
    const samples = [];
    const prefixes = ['091', '092'];
    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = Math.floor(Math.random() * 9000000 + 1000000).toString();
      const phone = prefix + suffix;
      samples.push(`عميل واتساب ${i + 1},${phone}`);
    }
    setBulkInput(samples.join('\n'));
  };

  const handleTranslateOffer = async (offer: UmrahOffer) => {
    try {
      setIsLoading(true);
      const translated = await translateOffer(offer);
      
      const updatedOffer = {
        ...offer,
        name: translated.name,
        category: translated.category,
        rows: translated.rows,
        fixedText: translated.fixedText
      };
      
      await api.updateOffer(offer.id, updatedOffer);
      setOffers(prev => prev.map(o => o.id === offer.id ? updatedOffer : o));
      alert(language === 'ar' ? 'تمت الترجمة بنجاح' : 'Translated successfully');
    } catch (error) {
      console.error('Translation failed:', error);
      alert(language === 'ar' ? 'فشل في الترجمة' : 'Translation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا العرض؟' : 'Are you sure you want to delete this offer?')) return;
    try {
      setIsLoading(true);
      await api.deleteOffer(id);
      setOffers(prev => prev.filter(o => o.id !== id));
    } catch (error) {
      console.error('Error deleting offer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOffer = async () => {
    if (selectedCustomers.length === 0) return;
    if (!selectedOffer && !customMessage && !imageUrl) return;

    setIsSending(true);
    setSendProgress({ current: 0, total: selectedCustomers.length });

    const selectedCustData = customers.filter(c => selectedCustomers.includes(c.id));

    // Format offer message
    let message = customMessage ? `${customMessage}\n\n` : '';
    
    if (selectedOffer) {
      message += `*${selectedOffer.documentTitle || 'عرض عمرة جديد'}*\n\n`;
      message += `*الفئة:* ${selectedOffer.category}\n\n`;
      
      selectedOffer.rows.forEach(row => {
        message += `📍 *${row.makkah} / ${row.madinah}*\n`;
        message += `🏨 ${row.offer}\n`;
        message += `🍽️ ${row.meals}\n`;
        message += `💰 ثنائي: ${row.double} | ثلاثي: ${row.triple} | رباعي: ${row.quad}\n`;
        message += `-------------------\n`;
      });

      if (selectedOffer.fixedText) {
        message += `\n${selectedOffer.fixedText}`;
      }

      // Add public link to message
      const publicLink = `${window.location.origin}/offer/${selectedOffer.id}`;
      message += `\n\n🔗 لمشاهدة العرض بتصميم احترافي وتحميله:\n${publicLink}`;

      // If the offer itself has an image URL, include it too
      if (selectedOffer.imageUrl) {
        message += `\n\n🖼️ صورة العرض:\n${selectedOffer.imageUrl}`;
      }
    }

    // Add manual image URL if provided in the modal
    if (imageUrl) {
      message += `\n\n🖼️ رابط إضافي:\n${imageUrl}`;
    }

    // Copy to clipboard once
    try {
      await navigator.clipboard.writeText(message);
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }

    // Send messages one by one (opening WhatsApp web/app)
    for (let i = 0; i < selectedCustData.length; i++) {
      const customer = selectedCustData[i];
      setSendProgress(prev => ({ ...prev, current: i + 1 }));
      
      // We use the utility to open WhatsApp
      sendWhatsAppMessage(customer.phone, message);
      
      // Small delay to allow the browser to handle the window opening
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsSending(false);
    setShowOfferSelector(false);
    setSelectedCustomers([]);
    setSelectedOffer(null);
  };

  const renderOfferDesign = (offer: UmrahOffer) => {
    return (
      <div id="offer-design-preview" className="bg-white p-10 rounded-xl text-slate-900 font-serif relative overflow-hidden border-8 border-double border-gold/30 shadow-2xl max-w-2xl mx-auto">
        {/* Islamic Pattern Background */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        <div className="relative z-10 space-y-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-2xl font-bold text-gold">{offer.documentTitle || 'شركة دار المقام'}</h2>
            <div className="h-1 w-40 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          </div>

          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900">{offer.name}</h1>
            <p className="text-lg text-slate-500 font-bold">{offer.category} - رحلات 1447 هـ</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {offer.rows.map((row, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-3 text-right">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2 text-gold font-bold">
                    <Calendar className="w-4 h-4" />
                    <span>{row.makkah} / {row.madinah}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{offer.category}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-slate-800">{row.offer}</p>
                  <p className="text-sm text-slate-500 flex items-center justify-end gap-2">
                    <span>{row.meals}</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-white border border-slate-100 rounded-lg p-2 text-center">
                    <p className="text-[8px] text-slate-400 font-bold">ثنائي</p>
                    <p className="text-sm font-black text-gold">{row.double}</p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-lg p-2 text-center">
                    <p className="text-[8px] text-slate-400 font-bold">ثلاثي</p>
                    <p className="text-sm font-black text-gold">{row.triple}</p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-lg p-2 text-center">
                    <p className="text-[8px] text-slate-400 font-bold">رباعي</p>
                    <p className="text-sm font-black text-gold">{row.quad}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {offer.fixedText && (
            <div className="pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{offer.fixedText}</p>
            </div>
          )}

          <div className="pt-8 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-slate-400">
              <Phone className="w-4 h-4" />
              <span className="text-xs font-bold">0948470011</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Phone className="w-4 h-4" />
              <span className="text-xs font-bold">0947470010</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-8 rounded-[2rem] border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20">
            <Megaphone className="w-8 h-8 text-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">إدارة التسويق والعملاء</h1>
            <p className="text-white/40 text-sm font-medium">تواصل مع عملائك وأرسل أحدث عروض العمرة</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all font-bold border border-white/10"
          >
            <PlusCircle className="w-5 h-5" />
            <span>استيراد أرقام</span>
          </button>
          <button 
            onClick={() => {
              const numbers = customers
                .filter(c => selectedCustomers.includes(c.id))
                .map(c => c.phone)
                .join('\n');
              navigator.clipboard.writeText(numbers);
              setIsCopyingNumbers(true);
              setTimeout(() => setIsCopyingNumbers(false), 2000);
            }}
            disabled={selectedCustomers.length === 0}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 border rounded-xl text-sm font-bold transition-all",
              selectedCustomers.length > 0
                ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            <Download className="w-4 h-4" />
            {isCopyingNumbers ? 'تم نسخ الأرقام!' : 'نسخ قائمة الأرقام'}
          </button>
          <button 
            onClick={handleCleanNumbers}
            disabled={isCleaning}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 border border-white/10 rounded-xl text-white text-sm font-bold transition-all",
              isCleaning ? "bg-white/10 opacity-50 cursor-not-allowed" : "bg-white/5 hover:bg-white/10"
            )}
          >
            <Filter className={clsx("w-4 h-4", isCleaning && "animate-spin")} />
            {isCleaning ? 'جاري التنظيف...' : 'تنظيف الأرقام'}
          </button>
          <button 
            onClick={() => fetchData(true)}
            disabled={isSyncing}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 border border-white/10 rounded-xl text-white text-sm font-bold transition-all",
              isSyncing ? "bg-white/10 opacity-50 cursor-not-allowed" : "bg-white/5 hover:bg-white/10"
            )}
          >
            <Users className={clsx("w-4 h-4", isSyncing && "animate-spin")} />
            {isSyncing ? 'جاري التحديث...' : 'تحديث من الحجوزات'}
          </button>
          <button 
            onClick={() => setShowOfferSelector(true)}
            disabled={selectedCustomers.length === 0}
            className={clsx(
              "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg",
              selectedCustomers.length > 0 
                ? "bg-gold text-black hover:bg-gold/90 shadow-gold/10" 
                : "bg-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
            إرسال عرض للمختارين
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search and Filters */}
        <div className="lg:col-span-3 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-gold transition-colors" />
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder:text-white/20 focus:border-gold/50 transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
            <button 
              onClick={() => setFilter('all')}
              className={clsx("px-6 py-3 rounded-xl font-bold text-sm transition-all", filter === 'all' ? "bg-gold text-black" : "text-white/40 hover:bg-white/5")}
            >الكل</button>
            <button 
              onClick={() => setFilter('whatsapp')}
              className={clsx("px-6 py-3 rounded-xl font-bold text-sm transition-all", filter === 'whatsapp' ? "bg-gold text-black" : "text-white/40 hover:bg-white/5")}
            >أرقام واتساب</button>
            <button 
              onClick={() => setFilter('active')}
              className={clsx("px-6 py-3 rounded-xl font-bold text-sm transition-all", filter === 'active' ? "bg-gold text-black" : "text-white/40 hover:bg-white/5")}
            >حجوزات نشطة</button>
            <button 
              onClick={() => setFilter('previous')}
              className={clsx("px-6 py-3 rounded-xl font-bold text-sm transition-all", filter === 'previous' ? "bg-gold text-black" : "text-white/40 hover:bg-white/5")}
            >عملاء سابقين</button>
          </div>
        </div>

        {/* Customers List */}
        <div className="lg:col-span-3 bg-white/5 rounded-[2rem] border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gold" />
              <h2 className="text-xl font-bold text-white">قائمة العملاء</h2>
              <span className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-xs font-bold">
                {filteredCustomers.length} عميل
              </span>
            </div>
            <button 
              onClick={toggleSelectAll}
              className="text-xs font-bold text-gold hover:underline"
            >
              {selectedCustomers.length === filteredCustomers.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-white/[0.02] text-[10px] text-white/20 font-bold">
                  <th className="px-6 py-4 font-bold">
                    <input 
                      type="checkbox" 
                      checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-white/10 bg-white/5 text-gold focus:ring-gold"
                    />
                  </th>
                  <th className="px-6 py-4 font-bold">العميل</th>
                  <th className="px-6 py-4 font-bold">رقم الهاتف</th>
                  <th className="px-6 py-4 font-bold">آخر تواصل</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
                        <p className="text-white/40 font-bold">جاري تحميل العملاء...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                          <Users className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-white/40 font-bold">لم يتم العثور على عملاء</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <CustomerRow 
                      key={customer.id} 
                      customer={customer}
                      isSelected={selectedCustomers.includes(customer.id)}
                      onToggle={toggleCustomerSelection}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="text-[10px] text-white/20 font-bold">
                عرض {Math.min(filteredCustomers.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredCustomers.length, currentPage * itemsPerPage)} من أصل {filteredCustomers.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-gold hover:bg-gold/10 disabled:opacity-20 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = currentPage;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={clsx(
                          "w-8 h-8 rounded-lg text-[10px] font-bold transition-all",
                          currentPage === pageNum ? "bg-gold text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-gold hover:bg-gold/10 disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkImport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20">
                    <Users className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">استيراد أرقام هواتف</h2>
                    <p className="text-white/40 text-xs font-medium">أضف قائمة من الأرقام دفعة واحدة</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBulkImport(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {importError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{importError}</p>
                  </div>
                )}

                {isImporting && (
                  <div className="p-6 bg-gold/5 border border-gold/10 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold text-gold">
                      <span>جاري الاستيراد...</span>
                      <span>{Math.round((importProgress / importTotal) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(importProgress / importTotal) * 100}%` }}
                        className="h-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                      />
                    </div>
                    <p className="text-[10px] text-white/40 text-center">تمت معالجة {importProgress} من أصل {importTotal} عميل</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-3xl border border-white/10">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gold flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      مولد أرقام واتساب ذكي
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-white/40 font-bold px-1">البادئة</label>
                        <select 
                          value={genPrefix}
                          onChange={(e) => setGenPrefix(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:ring-1 focus:ring-gold outline-none"
                        >
                          <option value="091">091 (المدار)</option>
                          <option value="092">092 (ليبيانا)</option>
                          <option value="094">094 (ليبيانا)</option>
                          <option value="093">093 (ليبيانا)</option>
                          <option value="095">095 (ليبيانا)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-white/40 font-bold px-1">العدد</label>
                        <input 
                          type="number"
                          value={genCount}
                          onChange={(e) => setGenCount(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:ring-1 focus:ring-gold outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-white/40 font-bold px-1">بداية الرقم</label>
                        <input 
                          type="text"
                          value={genStart}
                          onChange={(e) => setGenStart(e.target.value)}
                          placeholder="1000000"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:ring-1 focus:ring-gold outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-white/40 font-bold px-1">نوع التوليد</label>
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                          <button 
                            onClick={() => setGenType('random')}
                            className={clsx("flex-1 py-1 rounded-lg text-[10px] font-bold transition-all", genType === 'random' ? "bg-gold text-black" : "text-white/40")}
                          >عشوائي</button>
                          <button 
                            onClick={() => setGenType('sequential')}
                            className={clsx("flex-1 py-1 rounded-lg text-[10px] font-bold transition-all", genType === 'sequential' ? "bg-gold text-black" : "text-white/40")}
                          >تسلسلي</button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={generateNumbers}
                      className="w-full py-3 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-xl text-gold text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      توليد الأرقام الآن
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-2">قائمة الأرقام (الاسم,الهاتف أو الهاتف فقط)</label>
                    <textarea
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder="مثال:&#10;محمد علي,0912345678&#10;0923456789"
                      className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all resize-none font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={generateSampleLibyanNumbers}
                      className="text-gold hover:text-gold/80 text-[10px] font-bold transition-colors"
                    >
                      توليد 2000 رقم عشوائي
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <p className="text-[10px] text-white/20 italic">يمكنك نسخ ولصق أرقام من ملف Excel مباشرة هنا</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowBulkImport(false)}
                      className="px-6 py-3 text-white/40 hover:text-white font-bold transition-all"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleBulkImport}
                      disabled={isImporting || !bulkInput.trim()}
                      className="px-8 py-3 bg-gold text-matte-dark rounded-2xl font-black hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isImporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-matte-dark/30 border-t-matte-dark rounded-full animate-spin" />
                          <span>جاري الاستيراد...</span>
                        </>
                      ) : (
                        <span>بدء الاستيراد</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Offer Selector Modal */}
      <AnimatePresence>
        {showOfferSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSending && setShowOfferSelector(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
                    <Send className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">إرسال عرض ترويجي</h2>
                    <p className="text-white/40 text-[10px] font-bold">اختر العرض وخصص الرسالة</p>
                  </div>
                </div>
                {!isSending && (
                  <button 
                    onClick={() => setShowOfferSelector(false)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {isSending ? (
                  <div className="h-full flex flex-col items-center justify-center gap-8 py-20">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="45"
                          fill="none"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="8"
                        />
                        <motion.circle
                          cx="96"
                          cy="96"
                          r="45"
                          fill="none"
                          stroke="#D4AF37"
                          strokeWidth="8"
                          strokeDasharray={283}
                          strokeDashoffset={283 - (283 * sendProgress.current) / sendProgress.total}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {Math.round((sendProgress.current / sendProgress.total) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white mb-1">جاري إرسال العروض...</p>
                      <p className="text-white/40">تم إرسال {sendProgress.current} من أصل {sendProgress.total}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-white/20 px-2">1. اختر العرض المراد إرساله (اختياري)</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => setSelectedOffer(null)}
                          className={clsx(
                            "w-full p-4 rounded-2xl border transition-all text-right group",
                            selectedOffer === null
                              ? "bg-gold/10 border-gold shadow-lg shadow-gold/5"
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={clsx(
                              "w-8 h-8 rounded-full flex items-center justify-center border transition-all",
                              selectedOffer === null ? "bg-gold border-gold text-black" : "bg-white/5 border-white/10 text-white/20"
                            )}>
                              <X className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white group-hover:text-gold transition-colors">بدون عرض محدد</h3>
                              <p className="text-[10px] text-white/40">إرسال رسالة نصية أو صورة فقط</p>
                            </div>
                          </div>
                        </button>
                        {offers.length > 0 && offers.map((offer) => (
                            <div key={offer.id} className="relative group">
                              <button
                                onClick={() => setSelectedOffer(offer)}
                                className={clsx(
                                  "w-full p-4 rounded-2xl border transition-all text-right",
                                  selectedOffer?.id === offer.id
                                    ? "bg-gold/10 border-gold shadow-lg shadow-gold/5"
                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-white group-hover:text-gold transition-colors">
                                    {offer.name}
                                  </h3>
                                  <span className="px-2 py-1 rounded-lg bg-white/10 text-white/60 text-[8px] font-bold">
                                    {offer.category}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/40 line-clamp-1">
                                  {offer.rows.map(r => `${r.makkah}/${r.madinah}`).join(' - ')}
                                </p>
                              </button>
                              
                              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTranslateOffer(offer);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/10 text-white/40 hover:text-gold hover:bg-gold/20 transition-all"
                                  title={language === 'ar' ? 'ترجمة للإنجليزية' : 'Translate to Arabic'}
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteOffer(offer.id);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/10 text-white/40 hover:text-red-400 hover:bg-red-400/20 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-white/20 px-2">2. تخصيص الرسالة والملحقات</h3>
                      
                      <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10">
                        {/* Custom Message */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-white/40 flex items-center gap-2">
                              <MessageSquare className="w-3 h-3" />
                              نص الرسالة المخصص
                            </label>
                            <button
                              onClick={() => {
                                if (!selectedOffer) return;
                                let msg = customMessage ? `${customMessage}\n\n` : '';
                                msg += `*${selectedOffer.documentTitle || 'عرض عمرة جديد'}*\n\n`;
                                msg += `*الفئة:* ${selectedOffer.category}\n\n`;
                                selectedOffer.rows.forEach(row => {
                                  msg += `📍 *${row.makkah} / ${row.madinah}*\n`;
                                  msg += `🏨 ${row.offer}\n`;
                                  msg += `🍽️ ${row.meals}\n`;
                                  msg += `💰 ثنائي: ${row.double} | ثلاثي: ${row.triple} | رباعي: ${row.quad}\n`;
                                  msg += `-------------------\n`;
                                });
                                if (selectedOffer.fixedText) msg += `\n${selectedOffer.fixedText}`;
                                navigator.clipboard.writeText(msg);
                                alert('تم نسخ نص الرسالة! يمكنك لصقه في واتساب.');
                              }}
                              className="text-[9px] text-gold hover:underline font-bold"
                            >
                              نسخ نص الرسالة
                            </button>
                          </div>
                          <textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="اكتب نص الرسالة التسويقية هنا..."
                            className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white text-xs focus:border-gold/50 transition-colors min-h-[120px] resize-none"
                          />
                        </div>

                        {/* Image URL */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-white/40 flex items-center gap-2">
                              <ImageIcon className="w-3 h-3" />
                              رابط صورة العرض (اختياري)
                            </label>
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  // Check file size (max 750KB to stay under Firestore 1MB limit after base64 encoding)
                                  if (file.size > 750 * 1024) {
                                    alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 750 كيلوبايت لضمان نجاح الرفع.');
                                    return;
                                  }

                                  setIsUploadingImage(true);
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    try {
                                      const base64 = event.target?.result as string;
                                      const imageId = await api.uploadImage(base64, file.name);
                                      const link = `${window.location.origin}/img/${imageId}`;
                                      setImageUrl(link);
                                      alert('تم رفع الصورة وتوليد الرابط بنجاح!');
                                    } catch (error: any) {
                                      console.error('Upload failed:', error);
                                      const errorMessage = error.message || 'فشل رفع الصورة. تأكد من أن حجم الصورة أقل من 750 كيلوبايت.';
                                      alert(errorMessage);
                                    } finally {
                                      setIsUploadingImage(false);
                                    }
                                  };
                                  reader.onerror = () => {
                                    console.error('FileReader error');
                                    setIsUploadingImage(false);
                                    alert('حدث خطأ أثناء قراءة الملف');
                                  };
                                  reader.readAsDataURL(file);
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={isUploadingImage}
                              />
                              <button className={clsx(
                                "text-[9px] font-bold px-3 py-1 rounded-lg border transition-all",
                                isUploadingImage ? "bg-white/5 border-white/5 text-white/20" : "bg-gold/10 border-gold/20 text-gold hover:bg-gold/20"
                              )}>
                                {isUploadingImage ? 'جاري الرفع...' : 'رفع صورة وتوليد رابط'}
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={imageUrl}
                              onChange={(e) => setImageUrl(e.target.value)}
                              placeholder="https://example.com/image.jpg"
                              className="flex-1 bg-black/20 border border-white/10 rounded-2xl px-4 py-3 text-white text-xs focus:border-gold/50 transition-colors"
                            />
                            {imageUrl && (
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(imageUrl);
                                  alert('تم نسخ الرابط!');
                                }}
                                className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:bg-white/10 transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-[9px] text-white/20 italic">سيظهر هذا الرابط كصورة في واتساب</p>
                        </div>
                      </div>

                      <h3 className="text-[10px] font-bold text-white/20 px-2 pt-4">3. معاينة التصميم الاحترافي</h3>
                      {selectedOffer ? (
                        <div className="space-y-4">
                          <div className="scale-[0.45] origin-top transform-gpu -mb-[380px] shadow-2xl">
                            {renderOfferDesign(selectedOffer)}
                          </div>
                          <button
                            onClick={async () => {
                              const element = document.getElementById('offer-design-preview');
                              if (element) {
                                try {
                                  const canvas = await html2canvas(element, { 
                                    scale: 3, 
                                    useCORS: true,
                                    backgroundColor: '#ffffff',
                                    onclone: (clonedDoc) => {
                                      const clonedElement = clonedDoc.getElementById('offer-design-preview');
                                      if (clonedElement) {
                                        clonedElement.style.letterSpacing = '0';
                                        clonedElement.style.wordSpacing = '0';
                                      }
                                    }
                                  });
                                  const link = document.createElement('a');
                                  link.download = `عرض_عمرة_${selectedOffer.name}.png`;
                                  link.href = canvas.toDataURL('image/png');
                                  link.click();
                                } catch (e) {
                                  console.error('Error generating image:', e);
                                  alert('حدث خطأ أثناء إنشاء الصورة. يرجى المحاولة مرة أخرى.');
                                }
                              }
                            }}
                            className="w-full py-4 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-2xl text-gold text-[10px] font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
                          >
                            <Download className="w-4 h-4" />
                            تحميل التصميم كصورة للإرسال
                          </button>
                          <p className="text-[9px] text-white/20 text-center italic">* قم بتحميل الصورة ثم إرسالها للعملاء عبر واتساب</p>
                        </div>
                      ) : (
                        <div className="h-[400px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-white/20 text-[10px] text-center p-8 gap-4">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                            <Megaphone className="w-6 h-6 opacity-20" />
                          </div>
                          يرجى اختيار عرض من القائمة لمشاهدة التصميم
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!isSending && (
                <div className="p-6 bg-white/5 border-t border-white/10 flex items-center justify-between gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-white/20 font-bold mb-1">سيتم الإرسال إلى</p>
                    <p className="text-sm font-bold text-white">{selectedCustomers.length} عميل مختار</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowOfferSelector(false)}
                      className="px-6 py-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors font-bold text-xs"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSendOffer}
                      disabled={!selectedOffer && !customMessage && !imageUrl}
                      className={clsx(
                        "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg",
                        (selectedOffer || customMessage || imageUrl)
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/10"
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                      )}
                    >
                      <Send className="w-5 h-5" />
                      بدء الإرسال (نص)
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
