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
  Calendar
} from 'lucide-react';
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
    currency: 'LYD'
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validation
      if (!formData.name || !formData.airline || isNaN(formData.totalSeats!) || isNaN(formData.ticketPrice!)) {
        alert('يرجى التأكد من ملء جميع الحقول المطلوبة بشكل صحيح');
        setLoading(false);
        return;
      }

      if (editingId) {
        const tripToUpdate = trips.find(t => t.id === editingId);
        if (tripToUpdate) {
          const seatDiff = formData.totalSeats! - tripToUpdate.totalSeats;
          const updatedTrip: Trip = { 
            ...tripToUpdate, 
            tripNumber: formData.tripNumber || '',
            name: formData.name.trim(), 
            airline: formData.airline.trim(), 
            totalSeats: Number(formData.totalSeats),
            ticketPrice: Number(formData.ticketPrice),
            currency: formData.currency as any,
            availableSeats: Math.max(0, tripToUpdate.availableSeats + (Number(formData.totalSeats) - tripToUpdate.totalSeats))
          };
          await api.saveTrip(updatedTrip);
          setTrips(prev => prev.map(t => t.id === editingId ? updatedTrip : t));
          setEditingId(null);
          alert('تم تحديث الرحلة بنجاح!');
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
          status: 'Upcoming'
        };
        await api.saveTrip(newTrip);
        setTrips(prev => [...prev, newTrip]);
        alert('تم حفظ الرحلة بنجاح!');
      }

      setFormData({ tripNumber: '', name: '', airline: '', totalSeats: 50, ticketPrice: 0, currency: 'LYD' });
    } catch (error: any) {
      console.error('Error saving trip:', error);
      alert(error.message || 'حدث خطأ أثناء حفظ الرحلة');
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
      alert('تم حذف الرحلة بنجاح');
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      alert(error.message || 'حدث خطأ أثناء حذف الرحلة');
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
      currency: trip.currency
    });
    setEditingId(trip.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ tripNumber: '', name: '', airline: '', totalSeats: 50, ticketPrice: 0, currency: 'LYD' });
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
                      value={isNaN(formData.totalSeats!) ? '' : formData.totalSeats}
                      onChange={(e) => setFormData({...formData, totalSeats: parseInt(e.target.value)})}
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
                      value={isNaN(formData.ticketPrice!) ? '' : formData.ticketPrice}
                      onChange={(e) => setFormData({...formData, ticketPrice: parseFloat(e.target.value)})}
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
                </div>

                <div className="mt-8 pt-8 border-t border-white/10 flex justify-end gap-4">
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
                    className="btn-gold px-12 py-3 flex items-center gap-2 shadow-lg shadow-gold/20"
                  >
                    <Save className="w-5 h-5" /> 
                    {editingId ? 'تحديث الرحلة' : 'حفظ الرحلة'}
                  </button>
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
                              <div className="flex items-center gap-1">
                                {confirmDeleteId === t.id ? (
                                  <div className="flex items-center gap-1 bg-red-500/20 p-1 rounded-lg border border-red-500/30">
                                    <span className="text-[10px] text-red-400 font-bold px-1">تأكيد؟</span>
                                    <button 
                                      onClick={() => handleDelete(t.id)}
                                      className="p-1 hover:bg-red-500 text-white rounded transition-colors"
                                      title="Confirm Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="p-1 hover:bg-gray-500 text-white rounded transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setConfirmDeleteId(t.id)}
                                    className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
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
      </div>
    );
  }
