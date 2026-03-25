import React, { useState, useEffect } from 'react';
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
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { User, Customer, UmrahOffer } from '../types';
import { clsx } from 'clsx';
import { sendWhatsAppMessage } from '../utils/whatsapp';

interface MarketingModuleProps {
  user: User;
}

export default function MarketingModule({ user }: MarketingModuleProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [offers, setOffers] = useState<UmrahOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<UmrahOffer | null>(null);
  const [showOfferSelector, setShowOfferSelector] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [custData, offerData] = await Promise.all([
        api.getCustomers(),
        api.getUmrahOffers()
      ]);
      setCustomers(custData);
      setOffers(offerData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const handleSendOffer = async () => {
    if (!selectedOffer || selectedCustomers.length === 0) return;

    setIsSending(true);
    setSendProgress({ current: 0, total: selectedCustomers.length });

    const selectedCustData = customers.filter(c => selectedCustomers.includes(c.id));

    // Format offer message
    let message = `*${selectedOffer.documentTitle || 'عرض عمرة جديد'}*\n\n`;
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

    // Send messages one by one (opening WhatsApp web/app)
    // Note: Since we can't fully automate bulk WhatsApp without an API, 
    // we open them sequentially or provide a list.
    // For this implementation, we'll open them one by one or provide a status.
    
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

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    try {
      await api.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-gold" />
            إدارة العملاء والتسويق
          </h1>
          <p className="text-white/40">إدارة جهات الاتصال وإرسال العروض الترويجية عبر واتساب</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all"
            title="تحديث القائمة من الحجوزات"
          >
            <Calendar className={clsx("w-5 h-5 text-gold", isLoading && "animate-spin")} />
            تحديث من الحجوزات
          </button>
          <button
            onClick={() => setShowOfferSelector(true)}
            disabled={selectedCustomers.length === 0}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
              selectedCustomers.length > 0
                ? "bg-gold text-matte-black hover:bg-gold-light shadow-lg shadow-gold/20"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            <Megaphone className="w-5 h-5" />
            إرسال عرض ({selectedCustomers.length})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-matte-dark border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white/40 text-sm">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-white">{customers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-matte-dark border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white/40 text-sm">عملاء نشطون</p>
              <p className="text-2xl font-bold text-white">
                {customers.filter(c => c.totalBookings > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-matte-dark border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white/40 text-sm">العروض المتاحة</p>
              <p className="text-2xl font-bold text-white">{offers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-matte-dark border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:bg-white/10 transition-colors">
          <Filter className="w-5 h-5" />
          تصفية متقدمة
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-matte-dark border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-gold focus:ring-gold"
                  />
                </th>
                <th className="p-4 text-white/60 font-medium">العميل</th>
                <th className="p-4 text-white/60 font-medium">رقم الهاتف</th>
                <th className="p-4 text-white/60 font-medium">آخر حجز</th>
                <th className="p-4 text-white/60 font-medium">إجمالي الحجوزات</th>
                <th className="p-4 text-white/60 font-medium">تاريخ الإضافة</th>
                <th className="p-4 text-white/60 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                      <p className="text-white/40">جاري تحميل البيانات...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/40">
                    لا يوجد عملاء مطابقين للبحث
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => toggleCustomerSelection(customer.id)}
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-gold focus:ring-gold"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-bold">{customer.name}</p>
                          {customer.email && <p className="text-white/40 text-xs">{customer.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-white/80">
                        <Phone className="w-4 h-4 text-gold/60" />
                        <span dir="ltr">{customer.phone}</span>
                      </div>
                    </td>
                    <td className="p-4 text-white/60">
                      {customer.lastBookingDate ? new Date(customer.lastBookingDate).toLocaleDateString('ar-LY') : '---'}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full bg-white/5 text-white font-bold">
                        {customer.totalBookings || 0}
                      </span>
                    </td>
                    <td className="p-4 text-white/40 text-sm">
                      {new Date(customer.createdAt).toLocaleDateString('ar-LY')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => sendWhatsAppMessage(customer.phone, "مرحباً بك، كيف يمكننا مساعدتك اليوم؟")}
                          className="p-2 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors"
                          title="محادثة واتساب"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offer Selection Modal */}
      <AnimatePresence>
        {showOfferSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSending && setShowOfferSelector(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-matte-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Megaphone className="w-6 h-6 text-gold" />
                  اختر العرض المراد إرساله
                </h2>
                <button 
                  onClick={() => setShowOfferSelector(false)}
                  disabled={isSending}
                  className="p-2 hover:bg-white/10 rounded-xl text-white/40 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                {isSending ? (
                  <div className="py-12 flex flex-col items-center gap-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
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
                ) : offers.length === 0 ? (
                  <div className="py-12 text-center text-white/40">
                    لا توجد عروض متاحة حالياً. قم بإنشاء عرض أولاً.
                  </div>
                ) : (
                  offers.map((offer) => (
                    <button
                      key={offer.id}
                      onClick={() => setSelectedOffer(offer)}
                      className={clsx(
                        "w-full p-4 rounded-2xl border transition-all text-right group",
                        selectedOffer?.id === offer.id
                          ? "bg-gold/10 border-gold shadow-lg shadow-gold/5"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white group-hover:text-gold transition-colors">
                          {offer.name}
                        </h3>
                        <span className="px-2 py-1 rounded-lg bg-white/10 text-white/60 text-xs">
                          {offer.category}
                        </span>
                      </div>
                      <p className="text-sm text-white/40 line-clamp-2">
                        {offer.rows.map(r => `${r.makkah}/${r.madinah}`).join(' - ')}
                      </p>
                    </button>
                  ))
                )}
              </div>

              {!isSending && (
                <div className="p-6 bg-white/5 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowOfferSelector(false)}
                    className="px-6 py-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSendOffer}
                    disabled={!selectedOffer}
                    className={clsx(
                      "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all",
                      selectedOffer
                        ? "bg-gold text-matte-black hover:bg-gold-light"
                        : "bg-white/5 text-white/20 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-5 h-5" />
                    بدء الإرسال
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
