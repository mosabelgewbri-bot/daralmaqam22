import React, { useState, useEffect } from 'react';
import { User, Booking } from '../types';
import { deduplicateBookings, getRolePermissions } from '../utils/dataUtils';
import { motion } from 'motion/react';
import Logo from './Logo';
import AnalogClock from './AnalogClock';
import PrayerTimes from './PrayerTimes';
import WeatherWidget from './WeatherWidget';
import { 
  Users, 
  Plane, 
  Hotel, 
  TrendingUp,
  ChevronRight,
  Calculator,
  PlusCircle, 
  Bed, 
  ShieldCheck, 
  FileText, 
  LogOut, 
  Settings, 
  CreditCard, 
  Map as MapIcon, 
  BarChart3,
  Calendar,
  UserPlus,
  Bus,
  Wallet,
  PieChart,
  Activity,
  IdCard
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

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshKey(prev => prev + 1);
    window.addEventListener('permissions_updated', handleUpdate);
    return () => window.removeEventListener('permissions_updated', handleUpdate);
  }, []);

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
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    loadDashboardData();
  }, [user.id, user.role]);

  const modules = [
    { icon: UserPlus, label: 'حجز جديد', path: '/booking', id: 'booking', color: 'bg-gold/10 text-gold' },
    { icon: Plane, label: 'إدارة الرحلات', path: '/trips', id: 'trips', color: 'bg-indigo-500/10 text-indigo-400' },
    { icon: Bed, label: 'تسكين الفنادق', path: '/rooming', id: 'rooming', color: 'bg-blue-500/10 text-blue-400' },
    { icon: Wallet, label: 'المالية', path: '/finance', id: 'finance', color: 'bg-amber-500/10 text-amber-400' },
    { icon: PieChart, label: 'الأرباح والخسائر', path: '/profit-loss', id: 'profit-loss', color: 'bg-emerald-500/10 text-emerald-400' },
    { icon: BarChart3, label: 'التحليلات', path: '/analytics', id: 'analytics', color: 'bg-indigo-500/10 text-indigo-400' },
    { icon: ShieldCheck, label: 'وحدة التأشيرات', path: '/visa', id: 'visa', color: 'bg-emerald-500/10 text-emerald-400' },
    { icon: FileText, label: 'التقارير', path: '/reports', id: 'reports', color: 'bg-purple-500/10 text-purple-400' },
    { icon: IdCard, label: 'بطاقات المعتمرين', path: '/cards', id: 'cards', color: 'bg-rose-500/10 text-rose-400' },
    { icon: Activity, label: 'سجل العمليات', path: '/logs', id: 'logs', color: 'bg-cyan-500/10 text-cyan-400' },
    { icon: Users, label: 'المستخدمين', path: '/users', id: 'users', color: 'bg-orange-500/10 text-orange-400' },
    { icon: Settings, label: 'الإعدادات', path: '/settings', id: 'settings', color: 'bg-slate-500/10 text-slate-400' },
  ];

  const filteredModules = modules.filter(m => {
    if (user.role === 'admin') return true;
    
    try {
      const savedPermissions = localStorage.getItem('role_permissions');
      if (savedPermissions) {
        const permissions = JSON.parse(savedPermissions) as any[];
        const rolePerms = permissions.find(p => p.role === user.role);
        if (rolePerms && Array.isArray(rolePerms.allowedScreens) && rolePerms.allowedScreens.length > 0) {
          return rolePerms.allowedScreens.includes(m.id);
        }
      }
    } catch (e) {
      console.error('Error parsing permissions:', e);
    }
    
    // Fallback
    if (user.role === 'staff') return ['booking', 'rooming', 'visa', 'finance', 'cards', 'profit-loss', 'analytics', 'logs'].includes(m.id);
    if (user.role === 'accountant') return ['reports', 'finance', 'profit-loss', 'analytics', 'visa', 'cards', 'logs'].includes(m.id);
    if (user.role === 'manager') return true;
    if (user.role === 'visa_specialist') return ['visa', 'reports'].includes(m.id);
    if (user.role === 'receptionist') return ['booking'].includes(m.id);
    return false;
  });

  return (
    <div className="min-h-screen bg-matte-black p-4 md:p-8 space-y-12 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-gold/3 rounded-full blur-[100px]" />
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
            <span className="text-[10px] text-gold font-bold uppercase tracking-[0.4em]">لوحة التحكم الرئيسية</span>
          </motion.div>
          <h1 className="text-2xl md:text-4xl font-serif text-white tracking-tight leading-tight">
            شركة دار المقام <span className="text-gold/90">للخدمات السياحية والحج والعمرة</span>
          </h1>
          <p className="text-white/30 text-xs tracking-[0.2em] uppercase font-medium max-w-md">
            نظام إدارة الرحلات والحجوزات المتكامل • الكفاءة في كل خطوة
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="glass-card px-8 py-4 flex items-center gap-6 border-white/5 group hover:border-gold/20 transition-all">
            <div className="text-right">
              <p className="text-[10px] text-white/20 uppercase tracking-widest leading-none mb-2">الوقت الآن</p>
              <p className="text-sm font-bold text-white/80 tracking-tight group-hover:text-gold transition-colors">
                {new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="w-px h-10 bg-white/5" />
            <div className="p-3 rounded-xl bg-white/5 text-gold/40 group-hover:text-gold transition-colors">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Row: Clock, Prayer Times & Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="h-full"
        >
          <PrayerTimes />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1.1, y: 0 }}
          transition={{ 
            duration: 0.6, 
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
          className="h-full z-20 relative"
        >
          <div className="drop-shadow-[0_20px_50px_rgba(212,175,55,0.25)]">
            <AnalogClock />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="h-full"
        >
          <WeatherWidget />
        </motion.div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (idx + 2) * 0.1 }}
            whileHover={{ y: -8, transition: { duration: 0.3, ease: "circOut" } }}
            className="glass-card p-8 relative overflow-hidden group border-white/5 hover:border-gold/30 transition-all flex flex-col"
          >
            <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity group-hover:scale-110 transition-transform duration-700">
              <stat.icon size={120} />
            </div>
            <div className="relative flex flex-col gap-6">
              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} border border-white/5 group-hover:border-gold/20 transition-all`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-bold mb-2">{stat.label}</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-serif text-white group-hover:text-gold transition-colors">{stat.value.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <TrendingUp className="w-3 h-3" />
                    <span>+12%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Access Horizontal Section */}
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 bg-gold rounded-full" />
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">الوصول السريع</h3>
          </div>
          <div className="flex-1 h-px bg-white/5 mx-8 hidden md:block" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-4">
          {filteredModules.map((module, idx) => (
            <motion.button
              key={idx}
              whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.03)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(module.path)}
              className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-gold/30 transition-all group text-center gap-3 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`w-12 h-12 rounded-2xl ${module.color} bg-opacity-10 flex items-center justify-center border border-white/5 group-hover:border-gold/40 transition-all duration-500`}>
                <module.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-white/40 group-hover:text-white transition-colors uppercase tracking-widest whitespace-nowrap">{module.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Charts & Activity */}
        <div className="lg:col-span-8 space-y-8">
          {/* Revenue Chart */}
          <div className="glass-card p-8">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">تحليل الإيرادات</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">آخر 7 أيام عمل</p>
              </div>
              <div className="flex gap-2">
                <div className="px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-[10px] text-gold font-bold tracking-widest uppercase">أسبوعي</div>
              </div>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#ffffff20" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={15}
                  />
                  <YAxis 
                    stroke="#ffffff20" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value > 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-matte-black border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{payload[0].payload.date}</p>
                            <p className="text-lg font-bold text-gold">{payload[0].value?.toLocaleString()} <span className="text-xs font-normal">د.ل</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={40}>
                    {revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === revenueData.length - 1 ? '#d4af37' : 'rgba(212,175,55,0.1)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-8">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">أحدث الحجوزات</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">متابعة العمليات الأخيرة</p>
              </div>
              <button 
                onClick={() => navigate('/reports')}
                className="text-[10px] text-gold font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
              >
                عرض السجل الكامل <ChevronRight className="w-3 h-3 rotate-180" />
              </button>
            </div>
            
            <div className="space-y-4">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking, idx) => (
                  <motion.div 
                    key={booking.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-gold/20 hover:bg-white/[0.03] transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gold font-serif text-xl border border-white/5 group-hover:border-gold/20 transition-all">
                        {booking.headName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-white group-hover:text-gold transition-colors">{booking.headName}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-white/30 font-mono tracking-tighter">#{booking.id.slice(0, 8)}</span>
                          <span className="text-white/10 text-[10px]">•</span>
                          <span className="text-[10px] text-white/30 uppercase tracking-widest">{new Date(booking.createdAt).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-10">
                      <div className="text-right hidden sm:block">
                        <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">المبلغ</p>
                        <p className="text-sm font-bold text-white">{booking.totals?.totalLYD.toLocaleString()} <span className="text-[10px] text-gold/60 font-normal">د.ل</span></p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                          booking.status === 'Confirmed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-gold/10 text-gold border-gold/20"
                        )}>
                          {booking.status === 'Confirmed' ? 'مؤكد' : 'قيد المعالجة'}
                        </span>
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

        {/* Right Column: Trip Progress */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">توفر الرحلات</h3>
              <Plane className="w-4 h-4 text-gold/40" />
            </div>
            <div className="space-y-8">
              {tripAvailability.length > 0 ? (
                tripAvailability.map((trip, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white/80">{trip.name}</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">نسبة الحجز</p>
                      </div>
                      <span className="text-xs font-mono text-gold font-bold">{trip.filled}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${trip.filled}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className="h-full bg-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]"
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
          </div>
        </div>
      </div>
    </div>
  );
}
