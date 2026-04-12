import React, { useState, useEffect } from 'react';
import { User, Trip } from '../types';
import { api } from '../services/api';
import { getRolePermissions } from '../utils/dataUtils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, 
  Users, 
  Save, 
  ArrowLeft,
  Info,
  Wind,
  Trash2,
  Edit2,
  Plus,
  X,
  Calendar,
  Loader2,
  AlertCircle,
  CreditCard,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info' | 'warning', onClose: () => void }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />
  };

  const colors = {
    success: 'border-emerald-500/50 bg-emerald-500/10',
    error: 'border-red-500/50 bg-red-500/10',
    warning: 'border-amber-500/50 bg-amber-500/10',
    info: 'border-blue-500/50 bg-blue-500/10'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={clsx(
        "fixed bottom-8 left-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl min-w-[320px]",
        colors[type]
      )}
    >
      {icons[type]}
      <p className="text-white font-medium flex-1">{message}</p>
      <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// Confirmation Modal Component
const ConfirmModal = ({ 
  show, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  type = 'danger' 
}: { 
  show: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  type?: 'danger' | 'warning' | 'info'
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-matte-black border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <div className={clsx(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
          type === 'danger' ? "bg-red-500/20 text-red-500" : 
          type === 'warning' ? "bg-amber-500/20 text-amber-500" : "bg-blue-500/20 text-blue-500"
        )}>
          {type === 'danger' ? <Trash2 className="w-8 h-8" /> : 
           type === 'warning' ? <AlertCircle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/60 mb-8 leading-relaxed">{message}</p>
        
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={clsx(
              "flex-1 px-6 py-3 rounded-xl text-white font-bold transition-all shadow-lg",
              type === 'danger' ? "bg-red-600 hover:bg-red-500 shadow-red-500/20" : 
              type === 'warning' ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
            )}
          >
            تأكيد
          </button>
        </div>
      </motion.div>
    </div>
  );
};
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import Logo from './Logo';

export default function TripForm({ user }: { user: User }) {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<Trip>>({
    tripNumber: '',
    name: '',
    airline: '',
    totalSeats: 50,
    ticketPrice: 0,
    currency: 'LYD',
    startDate: '',
    departureDate: '',
    costs: {
      flightLYD: 0,
      hotelLYD: 0,
      transportLYD: 0,
      visaLYD: 0,
      otherLYD: 0,
      flightUSD: 0,
      hotelUSD: 0,
      transportUSD: 0,
      visaUSD: 0,
      otherUSD: 0
    }
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info' }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };
  const [showForm, setShowForm] = useState(false);
  const permissions = getRolePermissions(user.role);
  const canManage = permissions.canEditTrips || user.role === 'admin' || user.role === 'manager';

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

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit triggered');
    setLoading(true);
    setFormError(null);
    setSuccessMessage(null);
    
    try {
      console.log('Form data:', formData);
      // Validation
      if (!formData.name || !formData.airline || isNaN(formData.totalSeats!) || isNaN(formData.ticketPrice!)) {
        const errorMsg = 'يرجى التأكد من ملء جميع الحقول المطلوبة بشكل صحيح';
        console.warn('Validation failed:', errorMsg);
        setFormError(errorMsg);
        setLoading(false);
        return;
      }

      if (editingId) {
        console.log('Editing trip:', editingId);
        const tripToUpdate = trips.find(t => t.id === editingId);
        if (tripToUpdate) {
          const updatedTrip: Trip = { 
            ...tripToUpdate, 
            tripNumber: formData.tripNumber || '',
            name: formData.name.trim(), 
            airline: formData.airline.trim(), 
            totalSeats: Number(formData.totalSeats),
            ticketPrice: Number(formData.ticketPrice),
            currency: formData.currency as any,
            startDate: formData.startDate,
            departureDate: formData.departureDate,
            costs: formData.costs
          };
          console.log('Calling api.saveTrip for update:', updatedTrip);
          await api.saveTrip(updatedTrip);
          
          // Re-fetch trips to get the correctly synced availableSeats
          const refreshedTrips = await api.getTrips();
          setTrips(refreshedTrips);
          
          setEditingId(null);
          setSuccessMessage('تم تحديث الرحلة بنجاح!');
          setTimeout(() => {
            setShowForm(false);
            setSuccessMessage(null);
          }, 2000);
        }
      } else {
        const newTrip: Trip = {
          id: `TRIP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          tripNumber: formData.tripNumber || '',
          name: formData.name.trim(),
          airline: formData.airline.trim(),
          totalSeats: Number(formData.totalSeats),
          availableSeats: Number(formData.totalSeats),
          ticketPrice: Number(formData.ticketPrice),
          currency: formData.currency as any,
          startDate: formData.startDate,
          departureDate: formData.departureDate,
          status: 'Upcoming',
          costs: formData.costs
        };
        console.log('Calling api.saveTrip for new trip:', newTrip);
        await api.saveTrip(newTrip);
        setTrips(prev => [...prev, newTrip]);
        setSuccessMessage('تم حفظ الرحلة بنجاح!');
        setTimeout(() => {
          setShowForm(false);
          setSuccessMessage(null);
        }, 2000);
      }

      setFormData({ tripNumber: '', name: '', airline: '', totalSeats: 50, ticketPrice: 0, currency: 'LYD' });
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      setFormError(error.message || 'حدث خطأ أثناء حفظ الرحلة');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    try {
      console.log('Deleting trip:', id);
      await api.deleteTrip(id);
      setTrips(prev => prev.filter(t => t.id !== id));
      setConfirmDeleteId(null);
      showToast('تم حذف الرحلة بنجاح', 'success');
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      showToast(error.message || 'حدث خطأ أثناء حذف الرحلة', 'error');
      setConfirmDeleteId(null);
    }
  };

  const handleEdit = (trip: Trip) => {
    setFormData({
      tripNumber: trip.tripNumber || '',
      name: trip.name,
      airline: trip.airline,
      totalSeats: trip.totalSeats,
      ticketPrice: trip.ticketPrice,
      currency: trip.currency,
      startDate: trip.startDate || '',
      departureDate: trip.departureDate || '',
      costs: trip.costs || {
        flightLYD: 0,
        hotelLYD: 0,
        transportLYD: 0,
        visaLYD: 0,
        otherLYD: 0,
        flightUSD: 0,
        hotelUSD: 0,
        transportUSD: 0,
        visaUSD: 0,
        otherUSD: 0
      }
    });
    setEditingId(trip.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ 
      tripNumber: '', 
      name: '', 
      airline: '', 
      totalSeats: 50, 
      ticketPrice: 0, 
      currency: 'LYD',
      startDate: '',
      departureDate: '',
      costs: {
        flightLYD: 0,
        hotelLYD: 0,
        transportLYD: 0,
        visaLYD: 0,
        otherLYD: 0,
        flightUSD: 0,
        hotelUSD: 0,
        transportUSD: 0,
        visaUSD: 0,
        otherUSD: 0
      }
    });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-matte-black p-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Logo iconSize={40} textSize="text-4xl" className="hidden md:flex" />
          <div className="h-12 w-px bg-white/10 hidden md:block" />
          <div>
            <h1 className="text-4xl font-bold gold-text-gradient mb-2">إدارة الرحلات</h1>
            <p className="text-white/60">إضافة وتعديل رحلات العمرة المتاحة</p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-3">
            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  await api.syncAllTripsSeats();
                  const data = await api.getTrips();
                  setTrips(data);
                  setToast({ message: 'تمت مزامنة جميع المقاعد بنجاح', type: 'success' });
                } catch (error) {
                  setToast({ message: 'فشل مزامنة المقاعد', type: 'error' });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="px-6 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 shadow-lg shadow-blue-500/10"
              title="مزامنة المقاعد المتاحة بناءً على الحجوزات الفعلية"
            >
              <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
              <span className="hidden md:inline">مزامنة المقاعد</span>
            </button>
            <button 
              onClick={() => setShowForm(!showForm)}
              className={clsx(
                "px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-2xl hover:scale-105 active:scale-95",
                showForm && !editingId 
                  ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" 
                  : "bg-gold text-black hover:bg-gold/90 shadow-gold/40 border border-gold/50"
              )}
            >
              {editingId ? (
                <>
                  <Edit2 className="w-6 h-6" />
                  <span className="text-lg">تعديل الرحلة</span>
                </>
              ) : showForm ? (
                <>
                  <X className="w-6 h-6" />
                  <span className="text-lg">إغلاق النموذج</span>
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6" />
                  <span className="text-lg">إضافة رحلة جديدة</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Form Section */}
      {canManage && (
        <AnimatePresence>
          {showForm && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gold/10 text-gold">
                    {editingId ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {editingId ? 'تحديث بيانات الرحلة' : 'إضافة رحلة جديدة'}
                    </h2>
                    <p className="text-sm text-white/40">أدخل المعلومات الأساسية للرحلة</p>
                  </div>
                </div>
                <button 
                  onClick={cancelEdit}
                  className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trip Number */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                      <Info className="w-3 h-3" /> رقم الرحلة
                    </label>
                    <input 
                      type="text" 
                      placeholder="مثال: TRIP-001"
                      className="input-field w-full"
                      value={formData.tripNumber || ''}
                      onChange={(e) => setFormData({...formData, tripNumber: e.target.value})}
                    />
                  </div>

                  {/* Trip Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                      <Info className="w-3 h-3" /> اسم الرحلة
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="مثال: عمرة رمضان"
                      className="input-field w-full"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  {/* Airline */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                      <Wind className="w-3 h-3" /> شركة الطيران
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="مثال: الخطوط الليبية"
                      className="input-field w-full"
                      value={formData.airline || ''}
                      onChange={(e) => setFormData({...formData, airline: e.target.value})}
                    />
                  </div>

                  {/* Total Seats */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-3 h-3" /> إجمالي المقاعد
                    </label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      className="input-field w-full"
                      value={formData.totalSeats === 0 ? '' : formData.totalSeats}
                      onChange={(e) => setFormData({...formData, totalSeats: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  {/* Ticket Price */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                      سعر التذكرة
                    </label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      className="input-field w-full"
                      value={formData.ticketPrice}
                      onChange={(e) => setFormData({...formData, ticketPrice: parseFloat(e.target.value) || 0})}
                    />
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                      العملة
                    </label>
                    <select 
                      className="input-field w-full"
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value as any})}
                    >
                      <option value="LYD">LYD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> تاريخ بداية الرحلة
                    </label>
                    <input 
                      type="date" 
                      className="input-field w-full"
                      value={formData.startDate || ''}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    />
                  </div>

                  {/* Departure Date */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> تاريخ المغادرة
                    </label>
                    <input 
                      type="date" 
                      className="input-field w-full"
                      value={formData.departureDate || ''}
                      onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
                    />
                  </div>
                </div>

                {/* Costs Section */}
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gold" /> تكاليف الرحلة (للتحليل المالي)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* LYD Costs */}
                    <div className="space-y-4 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                      <h4 className="text-sm font-bold text-emerald-400 mb-4">التكاليف بالدينار الليبي (LYD)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40 uppercase">طيران</label>
                          <input 
                            type="number" 
                            className="input-field w-full py-1.5 text-sm"
                            value={formData.costs?.flightLYD}
                            onChange={(e) => setFormData({...formData, costs: {...formData.costs!, flightLYD: parseFloat(e.target.value) || 0}})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40 uppercase">فندق</label>
                          <input 
                            type="number" 
                            className="input-field w-full py-1.5 text-sm"
                            value={formData.costs?.hotelLYD}
                            onChange={(e) => setFormData({...formData, costs: {...formData.costs!, hotelLYD: parseFloat(e.target.value) || 0}})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40 uppercase">نقل</label>
                          <input 
                            type="number" 
                            className="input-field w-full py-1.5 text-sm"
                            value={formData.costs?.transportLYD}
                            onChange={(e) => setFormData({...formData, costs: {...formData.costs!, transportLYD: parseFloat(e.target.value) || 0}})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40 uppercase">تأشيرة</label>
                          <input 
                            type="number" 
                            className="input-field w-full py-1.5 text-sm"
                            value={formData.costs?.visaLYD}
                            onChange={(e) => setFormData({...formData, costs: {...formData.costs!, visaLYD: parseFloat(e.target.value) || 0}})}
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] text-white/40 uppercase">أخرى</label>
                          <input 
                            type="number" 
                            className="input-field w-full py-1.5 text-sm"
                            value={formData.costs?.otherLYD}
                            onChange={(e) => setFormData({...formData, costs: {...formData.costs!, otherLYD: parseFloat(e.target.value) || 0}})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* USD Costs */}
                    <div className="space-y-4 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                      <h4 className="text-sm font-bold text-blue-400 mb-4">التكاليف بالدولار (USD)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40 uppercase">طيران</label>
                          <input 
                            type="number" 
                            className="input-field w-full py-1.5 text-sm"
                            value={formData.costs?.flightUSD}
                            onChange={(e) => setFormData({...formData, costs: {...formData.costs!, flightUSD: parseFloat(e.target.value) || 0}})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40 uppercase">فندق</label>
                          <input 
                            type="number" 
                            className="input-field w-full py-1.5 text-sm"
                            value={formData.costs?.hotelUSD}
                            onChange={(e) => setFormData({...formData, costs: {...formData.costs!, hotelUSD: parseFloat(e.target.value) || 0}})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40 uppercase">نقل</label>
                          <input 
                            type="number" 
                            className="input-field w-full py-1.5 text-sm"
                            value={formData.costs?.transportUSD}
                            onChange={(e) => setFormData({...formData, costs: {...formData.costs!, transportUSD: parseFloat(e.target.value) || 0}})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40 uppercase">تأشيرة</label>
                          <input 
                            type="number" 
                            className="input-field w-full py-1.5 text-sm"
                            value={formData.costs?.visaUSD}
                            onChange={(e) => setFormData({...formData, costs: {...formData.costs!, visaUSD: parseFloat(e.target.value) || 0}})}
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] text-white/40 uppercase">أخرى</label>
                          <input 
                            type="number" 
                            className="input-field w-full py-1.5 text-sm"
                            value={formData.costs?.otherUSD}
                            onChange={(e) => setFormData({...formData, costs: {...formData.costs!, otherUSD: parseFloat(e.target.value) || 0}})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex flex-col gap-2">
                    {formError && (
                      <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{formError}</span>
                      </div>
                    )}
                    {successMessage && (
                      <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-lg border border-emerald-400/20">
                        <Save className="w-4 h-4" />
                        <span className="text-sm">{successMessage}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 ml-auto">
                    {editingId && (
                      <button 
                        type="button"
                        onClick={cancelEdit}
                        className="px-8 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 transition-all"
                      >
                        إلغاء
                      </button>
                    )}
                    <button 
                      type="submit"
                      disabled={loading}
                      className="btn-gold px-12 py-3 flex items-center gap-2 shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      {editingId ? 'تحديث الرحلة' : 'حفظ الرحلة'}
                    </button>
                  </div>
                </div>
              </form>
          </motion.div>
        )}
      </AnimatePresence>
      )}

        {/* Table Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-white/10 bg-white/[0.02] flex justify-between items-center">
            <h3 className="text-xl font-bold text-gold flex items-center gap-3">
              <Plane className="w-5 h-5" /> قائمة الرحلات المتاحة
            </h3>
            {canManage && !showForm && (
              <button 
                onClick={() => {
                  setShowForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold text-gold hover:text-white flex items-center gap-2 transition-colors bg-gold/10 px-4 py-2 rounded-lg border border-gold/20"
              >
                <Plus className="w-4 h-4" /> إضافة رحلة
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/10">
                  <th className="p-4 text-xs font-bold text-gold uppercase tracking-widest">رقم الرحلة</th>
                  <th className="p-4 text-xs font-bold text-gold uppercase tracking-widest">اسم الرحلة</th>
                  <th className="p-4 text-xs font-bold text-gold uppercase tracking-widest">شركة الطيران</th>
                  <th className="p-4 text-xs font-bold text-gold uppercase tracking-widest text-center">المقاعد</th>
                  <th className="p-4 text-xs font-bold text-gold uppercase tracking-widest text-center">السعر</th>
                  <th className="p-4 text-xs font-bold text-gold uppercase tracking-widest text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {trips.length === 0 ? (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td colSpan={6} className="p-12 text-center text-white/20 italic">
                        لا توجد رحلات مضافة بعد.
                      </td>
                    </motion.tr>
                  ) : (
                    trips.map((t) => (
                      <motion.tr 
                        key={t.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="p-4 font-mono text-gold text-xs">{t.tripNumber || '-'}</td>
                        <td className="p-4 font-medium text-white">{t.name}</td>
                        <td className="p-4 text-white/60">{t.airline}</td>
                        <td className="p-4 text-center">
                          <span className="px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-bold">
                            {t.totalSeats}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-gold font-mono text-xs">
                            {t.ticketPrice} {t.currency}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {canManage && (
                              <button 
                                onClick={() => handleEdit(t)}
                                className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {canManage && (
                              <button 
                                onClick={() => {
                                  setConfirmModal({
                                    show: true,
                                    title: 'حذف رحلة',
                                    message: `هل أنت متأكد من حذف رحلة ${t.name}؟ لا يمكن التراجع عن هذا الإجراء.`,
                                    type: 'danger',
                                    onConfirm: () => handleDelete(t.id)
                                  });
                                }}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>

        <AnimatePresence>
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </AnimatePresence>

        <ConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
        />
      </div>
    );
  }
