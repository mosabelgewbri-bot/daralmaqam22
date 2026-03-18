import React, { useState, useEffect } from 'react';
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

  const calculateMetrics = () => {
    let totalRevenueLYD = 0;
    let totalRevenueUSD = 0;
    let totalCostLYD = 0;
    let totalCostUSD = 0;

    const filteredBookings = selectedTripId === 'all' 
      ? bookings 
      : bookings.filter(b => b.tripId === selectedTripId);

    const filteredTrips = selectedTripId === 'all'
      ? trips
      : trips.filter(t => t.id === selectedTripId);

    filteredBookings.forEach(booking => {
      // Use paid amounts for actual revenue
      totalRevenueLYD += booking.paidLYD || 0;
      totalRevenueUSD += booking.paidUSD || 0;
    });

    if (selectedTripId === 'all') {
      filteredTrips.forEach(trip => {
        if (trip.costs) {
          totalCostLYD += (trip.costs.flightLYD || 0) + (trip.costs.hotelLYD || 0) + (trip.costs.transportLYD || 0) + (trip.costs.visaLYD || 0) + (trip.costs.otherLYD || 0);
          totalCostUSD += (trip.costs.flightUSD || 0) + (trip.costs.hotelUSD || 0) + (trip.costs.transportUSD || 0) + (trip.costs.visaUSD || 0) + (trip.costs.otherUSD || 0);
        }
      });
    } else {
      // Use editing costs for the selected trip
      totalCostLYD = (editingCosts?.flightLYD || 0) + (editingCosts?.hotelLYD || 0) + (editingCosts?.transportLYD || 0) + (editingCosts?.visaLYD || 0) + (editingCosts?.otherLYD || 0);
      totalCostUSD = (editingCosts?.flightUSD || 0) + (editingCosts?.hotelUSD || 0) + (editingCosts?.transportUSD || 0) + (editingCosts?.visaUSD || 0) + (editingCosts?.otherUSD || 0);
    }

    const netRevenueLYD = totalRevenueLYD - totalCostLYD;
    const netRevenueUSD = totalRevenueUSD - totalCostUSD;

    return {
      totalRevenueLYD,
      totalRevenueUSD,
      totalCostLYD,
      totalCostUSD,
      netRevenueLYD,
      netRevenueUSD
    };
  };

  const metrics = calculateMetrics();

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
            <Calculator className="w-8 h-8 text-gold" /> حساب الأرباح والخسائر
          </h2>
          <p className="text-white/60 text-lg">متابعة دقيقة للإيرادات والتكاليف وصافي الربح</p>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Metrics Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LYD Section */}
            <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/[0.02]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-emerald-400">الإيرادات والتكاليف (بالدينار)</h3>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">إجمالي الإيرادات</span>
                  <span className="text-lg font-bold text-white">{metrics.totalRevenueLYD.toLocaleString()} د.ل</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">إجمالي التكاليف</span>
                  <span className="text-lg font-bold text-rose-400">-{metrics.totalCostLYD.toLocaleString()} د.ل</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <span className="font-bold text-white">صافي الإيراد (الربح)</span>
                  <span className={clsx(
                    "text-2xl font-black",
                    metrics.netRevenueLYD >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {metrics.netRevenueLYD.toLocaleString()} د.ل
                  </span>
                </div>
              </div>
            </div>

            {/* USD Section */}
            <div className="glass-card p-6 border-blue-500/20 bg-blue-500/[0.02]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-blue-400">الإيرادات والتكاليف (بالدولار)</h3>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">إجمالي الإيرادات</span>
                  <span className="text-lg font-bold text-white">${metrics.totalRevenueUSD.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">إجمالي التكاليف</span>
                  <span className="text-lg font-bold text-rose-400">-${metrics.totalCostUSD.toLocaleString()}</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <span className="font-bold text-white">صافي الإيراد (الربح)</span>
                  <span className={clsx(
                    "text-2xl font-black",
                    metrics.netRevenueUSD >= 0 ? "text-blue-400" : "text-rose-400"
                  )}>
                    ${metrics.netRevenueUSD.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grand Total Card */}
          <div className="glass-card p-8 bg-gold/5 border-gold/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gold/10 rounded-br-full -ml-8 -mt-8 blur-2xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gold/20 rounded-2xl text-gold">
                  <Calculator className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">الإجمالي العام للأرباح</h3>
                  <p className="text-white/40">ملخص الأداء المالي النهائي للرحلة المختارة</p>
                </div>
              </div>
              
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-xs text-white/40 mb-1 uppercase tracking-widest">الإجمالي بالدينار</p>
                  <p className={clsx(
                    "text-3xl font-black",
                    metrics.netRevenueLYD >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {metrics.netRevenueLYD.toLocaleString()} <span className="text-sm font-normal">د.ل</span>
                  </p>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-xs text-white/40 mb-1 uppercase tracking-widest">الإجمالي بالدولار</p>
                  <p className={clsx(
                    "text-3xl font-black",
                    metrics.netRevenueUSD >= 0 ? "text-blue-400" : "text-rose-400"
                  )}>
                    <span className="text-sm font-normal">$</span>{metrics.netRevenueUSD.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cost Input Form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">إدخال التكاليف</h3>
              <div className="p-2 bg-gold/10 rounded-lg text-gold">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            {selectedTripId === 'all' ? (
              <div className="p-8 text-center space-y-4 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <AlertCircle className="w-12 h-12 text-white/20 mx-auto" />
                <p className="text-white/40">يرجى اختيار رحلة محددة لتعديل تكاليفها</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gold/60 border-b border-white/5 pb-2">تكاليف الطيران</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">بالدينار</label>
                      <input 
                        type="number" 
                        className="input-field w-full text-xs"
                        value={editingCosts?.flightLYD || 0}
                        onChange={(e) => handleCostChange('flightLYD', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">بالدولار</label>
                      <input 
                        type="number" 
                        className="input-field w-full text-xs"
                        value={editingCosts?.flightUSD || 0}
                        onChange={(e) => handleCostChange('flightUSD', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gold/60 border-b border-white/5 pb-2">تكاليف الفنادق</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">بالدينار</label>
                      <input 
                        type="number" 
                        className="input-field w-full text-xs"
                        value={editingCosts?.hotelLYD || 0}
                        onChange={(e) => handleCostChange('hotelLYD', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">بالدولار</label>
                      <input 
                        type="number" 
                        className="input-field w-full text-xs"
                        value={editingCosts?.hotelUSD || 0}
                        onChange={(e) => handleCostChange('hotelUSD', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gold/60 border-b border-white/5 pb-2">تكاليف النقل</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">بالدينار</label>
                      <input 
                        type="number" 
                        className="input-field w-full text-xs"
                        value={editingCosts?.transportLYD || 0}
                        onChange={(e) => handleCostChange('transportLYD', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">بالدولار</label>
                      <input 
                        type="number" 
                        className="input-field w-full text-xs"
                        value={editingCosts?.transportUSD || 0}
                        onChange={(e) => handleCostChange('transportUSD', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gold/60 border-b border-white/5 pb-2">تكاليف التأشيرات</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">بالدينار</label>
                      <input 
                        type="number" 
                        className="input-field w-full text-xs"
                        value={editingCosts?.visaLYD || 0}
                        onChange={(e) => handleCostChange('visaLYD', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">بالدولار</label>
                      <input 
                        type="number" 
                        className="input-field w-full text-xs"
                        value={editingCosts?.visaUSD || 0}
                        onChange={(e) => handleCostChange('visaUSD', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gold/60 border-b border-white/5 pb-2">تكاليف أخرى</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">بالدينار</label>
                      <input 
                        type="number" 
                        className="input-field w-full text-xs"
                        value={editingCosts?.otherLYD || 0}
                        onChange={(e) => handleCostChange('otherLYD', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 mr-1">بالدولار</label>
                      <input 
                        type="number" 
                        className="input-field w-full text-xs"
                        value={editingCosts?.otherUSD || 0}
                        onChange={(e) => handleCostChange('otherUSD', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveCosts}
                  disabled={saving}
                  className={clsx(
                    "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                    saveStatus === 'success' ? "bg-emerald-500 text-white" : "bg-gold text-black hover:bg-gold/90"
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
