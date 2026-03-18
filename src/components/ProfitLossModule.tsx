import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieChartIcon, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  Calendar,
  Briefcase,
  Save,
  RefreshCw,
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { Trip, Booking, User } from '../types';
import { clsx } from 'clsx';

export default function ProfitLossModule({ user }: { user: User }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Local state for editing costs of the selected trip
  const [editingCosts, setEditingCosts] = useState<Trip['costs']>({
    flightLYD: 0, hotelLYD: 0, transportLYD: 0, visaLYD: 0, otherLYD: 0,
    flightUSD: 0, hotelUSD: 0, transportUSD: 0, visaUSD: 0, otherUSD: 0
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tripsData, bookingsData] = await Promise.all([
        api.getTrips(),
        api.getBookings()
      ]);
      setTrips(tripsData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching P&L data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTripId !== 'all') {
      const trip = trips.find(t => t.id === selectedTripId);
      if (trip && trip.costs) {
        setEditingCosts(trip.costs);
      } else {
        setEditingCosts({
          flightLYD: 0, hotelLYD: 0, transportLYD: 0, visaLYD: 0, otherLYD: 0,
          flightUSD: 0, hotelUSD: 0, transportUSD: 0, visaUSD: 0, otherUSD: 0
        });
      }
    }
  }, [selectedTripId, trips]);

  const handleCostChange = (field: keyof Trip['costs'], value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingCosts(prev => ({
      ...prev!,
      [field]: numValue
    }));
  };

  const handleSaveCosts = async () => {
    if (selectedTripId === 'all') return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const trip = trips.find(t => t.id === selectedTripId);
      if (trip) {
        const updatedTrip = { ...trip, costs: editingCosts };
        await api.saveTrip(updatedTrip);
        setTrips(prev => prev.map(t => t.id === selectedTripId ? updatedTrip : t));
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving costs:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const calculateDetailedMetrics = () => {
    const filteredTrips = selectedTripId === 'all' ? trips : trips.filter(t => t.id === selectedTripId);
    const filteredBookings = selectedTripId === 'all' ? bookings : bookings.filter(b => b.tripId === selectedTripId);

    const tripCostsPerPax = new Map<string, { lyd: number, usd: number }>();
    
    trips.forEach(trip => {
      const totalLYD = (trip.costs?.flightLYD || 0) + (trip.costs?.hotelLYD || 0) + (trip.costs?.transportLYD || 0) + (trip.costs?.visaLYD || 0) + (trip.costs?.otherLYD || 0);
      const totalUSD = (trip.costs?.flightUSD || 0) + (trip.costs?.hotelUSD || 0) + (trip.costs?.transportUSD || 0) + (trip.costs?.visaUSD || 0) + (trip.costs?.otherUSD || 0);
      
      // Calculate cost per seat (assuming costs are spread across all seats)
      const paxCount = trip.totalSeats || 1;
      tripCostsPerPax.set(trip.id, {
        lyd: totalLYD / paxCount,
        usd: totalUSD / paxCount
      });
    });

    const detailedRows = filteredBookings.map(booking => {
      const trip = trips.find(t => t.id === booking.tripId);
      const costPerPax = tripCostsPerPax.get(booking.tripId) || { lyd: 0, usd: 0 };
      
      const revenueLYD = booking.totals?.totalLYD || 0;
      const revenueUSD = booking.totals?.totalUSD || 0;
      
      const costLYD = costPerPax.lyd * (booking.passengerCount || 0);
      const costUSD = costPerPax.usd * (booking.passengerCount || 0);
      
      return {
        id: booking.id,
        regId: booking.regId,
        tripName: trip?.name || 'غير معروف',
        headName: booking.headName,
        revenueLYD,
        revenueUSD,
        costLYD,
        costUSD,
        profitLYD: revenueLYD - costLYD,
        profitUSD: revenueUSD - costUSD
      };
    });

    const totals = detailedRows.reduce((acc, row) => ({
      revenueLYD: acc.revenueLYD + row.revenueLYD,
      revenueUSD: acc.revenueUSD + row.revenueUSD,
      costLYD: acc.costLYD + row.costLYD,
      costUSD: acc.costUSD + row.costUSD,
      profitLYD: acc.profitLYD + row.profitLYD,
      profitUSD: acc.profitUSD + row.profitUSD,
    }), { revenueLYD: 0, revenueUSD: 0, costLYD: 0, costUSD: 0, profitLYD: 0, profitUSD: 0 });

    return { rows: detailedRows, totals };
  };

  const { rows, totals } = calculateDetailedMetrics();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-gold" /> تفاصيل الأرباح والخسائر (حسب القيد)
          </h2>
          <p className="text-white/60 text-lg">تحليل مالي مفصل لكل فاتورة ورحلة</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchData}
            className="p-3 bg-white/5 rounded-xl border border-white/10 text-white/60 hover:text-gold transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
            <Filter className="w-5 h-5 text-gold ml-2" />
            <select 
              className="bg-transparent text-white border-none focus:ring-0 text-sm cursor-pointer min-w-[200px]"
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
            >
              <option value="all" className="bg-slate-900">جميع الرحلات</option>
              {trips.map(trip => (
                <option key={trip.id} value={trip.id} className="bg-slate-900">{trip.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-white/5 text-gold text-xs uppercase tracking-widest border-b border-white/10">
                <th className="px-6 py-4 font-bold">رقم القيد</th>
                <th className="px-6 py-4 font-bold">الرحلة</th>
                <th className="px-6 py-4 font-bold">اسم رب الأسرة</th>
                <th className="px-6 py-4 font-bold">السعر (LYD)</th>
                <th className="px-6 py-4 font-bold">التكلفة (LYD)</th>
                <th className="px-6 py-4 font-bold">الربح (LYD)</th>
                <th className="px-6 py-4 font-bold">السعر ($)</th>
                <th className="px-6 py-4 font-bold">التكلفة ($)</th>
                <th className="px-6 py-4 font-bold">الربح ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, idx) => (
                <motion.tr 
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 text-white/60 font-mono text-xs">{row.regId || row.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-white font-medium">{row.tripName}</td>
                  <td className="px-6 py-4 text-white">{row.headName}</td>
                  <td className="px-6 py-4 text-emerald-400 font-bold">{row.revenueLYD.toLocaleString()}</td>
                  <td className="px-6 py-4 text-rose-400">{row.costLYD.toLocaleString()}</td>
                  <td className={clsx(
                    "px-6 py-4 font-black",
                    row.profitLYD >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {row.profitLYD.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-blue-400 font-bold">${row.revenueUSD.toLocaleString()}</td>
                  <td className="px-6 py-4 text-rose-400">${row.costUSD.toLocaleString()}</td>
                  <td className={clsx(
                    "px-6 py-4 font-black",
                    row.profitUSD >= 0 ? "text-blue-400" : "text-rose-400"
                  )}>
                    ${row.profitUSD.toLocaleString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot className="bg-gold/10 border-t-2 border-gold/20">
              <tr className="text-white font-black">
                <td colSpan={3} className="px-6 py-6 text-xl text-gold">الإجماليات</td>
                <td className="px-6 py-6 text-emerald-400">{totals.revenueLYD.toLocaleString()}</td>
                <td className="px-6 py-6 text-rose-400">{totals.costLYD.toLocaleString()}</td>
                <td className={clsx(
                  "px-6 py-6 text-2xl",
                  totals.profitLYD >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totals.profitLYD.toLocaleString()}
                </td>
                <td className="px-6 py-6 text-blue-400">${totals.revenueUSD.toLocaleString()}</td>
                <td className="px-6 py-6 text-rose-400">${totals.costUSD.toLocaleString()}</td>
                <td className={clsx(
                  "px-6 py-6 text-2xl",
                  totals.profitUSD >= 0 ? "text-blue-400" : "text-rose-400"
                )}>
                  ${totals.profitUSD.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Cost Input Form (Side panel or bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="glass-card p-8 bg-gold/5 border-gold/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gold/10 rounded-br-full -ml-8 -mt-8 blur-2xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gold/20 rounded-2xl text-gold">
                  <Calculator className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">ملخص الأداء العام</h3>
                  <p className="text-white/40">صافي الربح الإجمالي بناءً على التكاليف الموزعة</p>
                </div>
              </div>
              
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-xs text-white/40 mb-1 uppercase tracking-widest">الإجمالي بالدينار</p>
                  <p className={clsx(
                    "text-3xl font-black",
                    totals.profitLYD >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {totals.profitLYD.toLocaleString()} <span className="text-sm font-normal">د.ل</span>
                  </p>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-xs text-white/40 mb-1 uppercase tracking-widest">الإجمالي بالدولار</p>
                  <p className={clsx(
                    "text-3xl font-black",
                    totals.profitUSD >= 0 ? "text-blue-400" : "text-rose-400"
                  )}>
                    <span className="text-sm font-normal">$</span>{totals.profitUSD.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">تعديل تكاليف الرحلة</h3>
              <div className="p-2 bg-gold/10 rounded-lg text-gold">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            {selectedTripId === 'all' ? (
              <div className="p-8 text-center space-y-4 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <AlertCircle className="w-12 h-12 text-white/20 mx-auto" />
                <p className="text-white/40">اختر رحلة لتعديل التكاليف التي يتم توزيعها على القيود</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gold/60 border-b border-white/5 pb-2">إجمالي تكاليف الرحلة</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">إجمالي التكاليف بالدينار</label>
                      <input 
                        type="number" 
                        className="input-field w-full"
                        value={editingCosts?.otherLYD || 0}
                        onChange={(e) => handleCostChange('otherLYD', e.target.value)}
                        placeholder="0"
                      />
                      <p className="text-[9px] text-white/30">يتم توزيع هذا المبلغ على عدد مقاعد الرحلة</p>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">إجمالي التكاليف بالدولار ($)</label>
                      <input 
                        type="number" 
                        className="input-field w-full"
                        value={editingCosts?.otherUSD || 0}
                        onChange={(e) => handleCostChange('otherUSD', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveCosts}
                  disabled={saving}
                  className={clsx(
                    "w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all",
                    saveStatus === 'success' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                    saveStatus === 'error' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                    "bg-gold text-slate-900 hover:bg-gold/90"
                  )}
                >
                  {saving ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : saveStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> تم الحفظ بنجاح
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> حفظ التكاليف
                    </>
                  )}
                </button>

                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <p className="text-xs text-blue-400 leading-relaxed">
                    * يتم حساب تكلفة كل قيد بضرب (إجمالي تكاليف الرحلة ÷ عدد المقاعد الكلي) في (عدد أفراد القيد).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
