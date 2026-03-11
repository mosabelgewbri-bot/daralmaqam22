import React, { useState, useEffect } from 'react';
import { User, Booking } from '../types';
import { deduplicateBookings, getRolePermissions } from '../utils/dataUtils';
import { motion } from 'motion/react';
import Logo from './Logo';
import { 
  Users, 
  Plane, 
  Hotel, 
  TrendingUp,
  ChevronRight,
  PlusCircle,
  Bed,
  ShieldCheck,
  FileText,
  LogOut,
  Settings,
  CreditCard,
  Map as MapIcon,
  Monitor,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

import { clsx } from 'clsx';
import { api } from '../services/api';

export default function Dashboard({ user, onLogout }: { user: User, onLogout: () => void }) {
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [tripAvailability, setTripAvailability] = useState<any[]>([]);

  const [stats, setStats] = useState([
    { label: 'إجمالي المعتمرين', value: '0', icon: Users, color: 'text-blue-400' },
    { label: 'الرحلات النشطة', value: '0', icon: Plane, color: 'text-gold' },
    { label: 'نسبة الإشغال', value: '0%', icon: Hotel, color: 'text-emerald-400' },
    { label: 'الإيرادات (د.ل)', value: '0', icon: TrendingUp, color: 'text-purple-400' },
  ]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [allBookings, allTrips] = await Promise.all([
          api.getBookings(),
          api.getTrips()
        ]);
        
        const permissions = getRolePermissions(user.role);
        const scopedBookings = allBookings.filter(b => 
          permissions.dataScope === 'all' || !b.createdBy || b.createdBy === user.id
        );

        // Sort and set recent
        const sorted = [...scopedBookings].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5);
        setRecentBookings(sorted);

        // Calculate Stats
        const totalPilgrims = scopedBookings.reduce((acc, b) => acc + (Number(b.passengerCount) || 0), 0);
        const totalRevenue = scopedBookings.reduce((acc, b) => acc + (Number(b.totals?.totalLYD) || 0), 0);
        
        const activeTripsCount = allTrips.filter((t: any) => t.status === 'Active' || t.status === 'Upcoming').length;
        const totalCapacity = allTrips.reduce((acc: number, t: any) => acc + (Number(t.totalSeats) || 0), 0);
        const filledSeats = allBookings.reduce((acc, b) => acc + (Number(b.passengerCount) || 0), 0);

        const occupancy = totalCapacity > 0 ? Math.round((filledSeats / totalCapacity) * 100) : 0;

        // Trip Availability for chart
        const availability = allTrips.slice(0, 3).map(t => ({
          name: t.name,
          filled: t.totalSeats > 0 ? Math.round(((t.totalSeats - t.availableSeats) / t.totalSeats) * 100) : 0,
          color: t.status === 'Active' ? 'bg-gold' : 'bg-blue-500'
        }));
        setTripAvailability(availability);

        // Prepare Revenue Data for Chart
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const chartData = last7Days.map(date => {
          const dayRevenue = scopedBookings
            .filter(b => (b.createdAt || '').split('T')[0] === date)
            .reduce((acc, b) => acc + (Number(b.totals?.totalLYD) || 0), 0);
          
          return {
            date: new Date(date).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' }),
            revenue: dayRevenue
          };
        });
        setRevenueData(chartData);

        setStats([
          { label: 'إجمالي المعتمرين', value: totalPilgrims.toLocaleString(), icon: Users, color: 'text-blue-400' },
          { label: 'الرحلات النشطة', value: activeTripsCount.toString(), icon: Plane, color: 'text-gold' },
          { label: 'نسبة الإشغال', value: `${occupancy}%`, icon: Hotel, color: 'text-emerald-400' },
          { label: 'الإيرادات (د.ل)', value: totalRevenue > 1000 ? `${(totalRevenue / 1000).toFixed(1)}k` : totalRevenue.toString(), icon: TrendingUp, color: 'text-purple-400' },
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    loadDashboardData();
  }, [user.id, user.role]);

  const modules = [
    { icon: PlusCircle, label: 'حجز جديد', path: '/booking', id: 'booking', color: 'bg-gold/10 text-gold' },
    { icon: MapIcon, label: 'إضافة رحلة', path: '/trips', id: 'trips', color: 'bg-indigo-500/10 text-indigo-400' },
    { icon: Bed, label: 'تسكين الفنادق', path: '/rooming', id: 'rooming', color: 'bg-blue-500/10 text-blue-400' },
    { icon: CreditCard, label: 'المالية', path: '/finance', id: 'finance', color: 'bg-amber-500/10 text-amber-400' },
    { icon: ShieldCheck, label: 'وحدة التأشيرات', path: '/tracking', id: 'tracking', color: 'bg-emerald-500/10 text-emerald-400' },
    { icon: FileText, label: 'التقارير', path: '/reports', id: 'reports', color: 'bg-purple-500/10 text-purple-400' },
    { icon: Users, label: 'المستخدمين', path: '/users', id: 'users', color: 'bg-orange-500/10 text-orange-400' },
    { icon: Settings, label: 'الإعدادات', path: '/settings', id: 'settings', color: 'bg-slate-500/10 text-slate-400' },
  ];

  const filteredModules = modules.filter(m => {
    const savedPermissions = localStorage.getItem('role_permissions');
    if (savedPermissions) {
      const permissions = JSON.parse(savedPermissions) as any[];
      const rolePerms = permissions.find(p => p.role === user.role);
      return rolePerms?.allowedScreens.includes(m.id);
    }
    // Fallback
    if (user.role === 'admin') return true;
    if (user.role === 'staff') return ['booking', 'rooming', 'tracking', 'finance'].includes(m.id);
    if (user.role === 'accountant') return ['reports', 'finance'].includes(m.id);
    return false;
  });

  return (
    <div className="min-h-screen bg-matte-black p-4 md:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group hidden md:block">
            <div className="absolute -inset-1 bg-gradient-to-r from-gold/50 to-gold/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <Logo iconSize={64} showSubtitle={false} className="relative" />
          </div>
          <div className="h-12 w-px bg-white/10 hidden md:block" />
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] text-gold font-bold uppercase tracking-[0.3em] bg-gold/10 px-2 py-0.5 rounded">نظام الإدارة</span>
              <span className="text-white/20 text-[10px]">•</span>
              <span className="text-white/40 text-[10px] uppercase tracking-widest">{user.role === 'admin' ? 'المدير العام' : 'موظف'}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              أهلاً بك، <span className="gold-text-gradient">{user.name}</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {(user.role === 'admin' || user.role === 'manager') && (
            <button 
              onClick={() => navigate('/trips')}
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-gold text-black rounded-xl font-bold hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
            >
              <PlusCircle className="w-5 h-5" />
              <span>إضافة رحلة</span>
            </button>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">التاريخ اليوم</p>
            <p className="text-sm font-medium text-white/80">
              {new Date().toLocaleDateString('ar-LY', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gold">
            <Monitor className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card p-6 relative overflow-hidden group hover:border-gold/30 transition-all"
          >
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <stat.icon size={80} />
            </div>
            <div className="relative flex flex-col gap-4">
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Actions - Left Rail */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <PlusCircle className="w-3 h-3 text-gold" /> الوصول السريع
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {filteredModules.map((module, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ x: -4 }}
                  onClick={() => navigate(module.path)}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-gold/20 transition-all group text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${module.color}`}>
                      <module.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-white/80 group-hover:text-white">{module.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-gold rotate-180" />
                </motion.button>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 bg-gold/5 border-gold/10">
            <h3 className="text-xs font-bold text-gold uppercase tracking-[0.3em] mb-4">حالة النظام</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">اتصال قاعدة البيانات</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-400 font-bold">متصل</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">مزامنة البيانات</span>
                <span className="text-[10px] text-white/40">منذ دقيقتين</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Activity - Center/Right */}
        <div className="lg:col-span-9 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <div className="md:col-span-2 glass-card p-6">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gold" /> تحليل الإيرادات
                  </h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">آخر 7 أيام عمل</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1 rounded-lg bg-gold/10 border border-gold/20 text-[10px] text-gold font-bold">أسبوعي</div>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#ffffff20" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#ffffff20" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value > 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0a0a0a', 
                        border: '1px solid rgba(212,175,55,0.2)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                      }}
                      itemStyle={{ color: '#d4af37' }}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={32}>
                      {revenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === revenueData.length - 1 ? '#d4af37' : '#d4af3720'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trip Progress */}
            <div className="glass-card p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <Plane className="w-4 h-4 text-gold" /> توفر الرحلات
              </h3>
              <div className="space-y-8">
                {tripAvailability.length > 0 ? (
                  tripAvailability.map((trip, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white/80">{trip.name}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-tighter">نسبة الحجز</p>
                        </div>
                        <span className="text-sm font-mono text-gold">{trip.filled}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${trip.filled}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full bg-gradient-to-l from-gold to-gold/40 shadow-[0_0_10px_rgba(212,175,55,0.3)]`}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/10">
                      <Plane className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">لا توجد رحلات نشطة</p>
                  </div>
                )}
              </div>
              {tripAvailability.length > 0 && (
                <button 
                  onClick={() => navigate('/trips')}
                  className="w-full mt-8 py-3 rounded-xl border border-white/5 text-[10px] text-white/40 uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all"
                >
                  إدارة جميع الرحلات
                </button>
              )}
            </div>
          </div>

          {/* Recent Activity Table-like Grid */}
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-bold text-white">أحدث الحجوزات</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">متابعة العمليات الأخيرة</p>
              </div>
              <button 
                onClick={() => navigate('/reports')}
                className="btn-gold py-1.5 px-4 text-[10px] flex items-center gap-2"
              >
                عرض السجل الكامل <ChevronRight className="w-3 h-3 rotate-180" />
              </button>
            </div>
            
            <div className="space-y-3">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking, idx) => (
                  <motion.div 
                    key={booking.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-gold/20 hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-gold font-serif text-xl border border-gold/10">
                        {booking.headName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white group-hover:text-gold transition-colors whitespace-nowrap">{booking.headName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-white/40 font-mono">#{booking.id}</span>
                          <span className="text-white/10 text-[10px]">•</span>
                          <span className="text-[10px] text-white/40">{new Date(booking.createdAt).toLocaleDateString('ar-LY')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">المبلغ الإجمالي</p>
                        <p className="font-mono text-white font-bold">{booking.totals?.totalLYD.toLocaleString()} <span className="text-gold text-[10px]">د.ل</span></p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter border",
                          booking.status === 'Confirmed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-gold/10 text-gold border-gold/20"
                        )}>
                          {booking.status === 'Confirmed' ? 'مؤكد' : 'قيد المعالجة'}
                        </span>
                        <p className="text-[9px] text-white/20">بواسطة: {booking.createdBy || 'النظام'}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-white/20">لا توجد حجوزات مسجلة في النظام حالياً</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
