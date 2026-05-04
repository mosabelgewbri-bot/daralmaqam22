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
  Hotel,
  Users,
  Target,
  Zap,
  Clock,
  Activity,
  Award,
  Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { api } from '../services/api';
import { Trip, Booking, User, AuditLog, Customer } from '../types';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { clsx } from 'clsx';

const COLORS = ['#D4AF37', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

type Tab = 'financial' | 'insights' | 'performance';
type TimeRange = 'week' | 'month' | 'quarter' | 'half' | 'year';

export const FinanceAnalytics: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<Tab>('financial');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsData, bookingsData, usersData, logsData, customersData] = await Promise.all([
          api.getTrips(),
          api.getBookings(),
          api.getUsers(),
          api.getLogs(),
          api.getCustomers()
        ]);
        setTrips(tripsData);
        setBookings(bookingsData);
        setUsers(usersData);
        setLogs(logsData);
        setCustomers(customersData);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTrips = selectedTripId === 'all' 
    ? trips 
    : trips.filter(t => t.id === selectedTripId);

  const filteredBookings = selectedTripId === 'all'
    ? bookings
    : bookings.filter(b => b.tripId === selectedTripId);

  // Financial Metrics
  const calculateFinancialMetrics = () => {
    let totalRevenueLYD = 0;
    let totalRevenueUSD = 0;
    let totalCostLYD = 0;
    let totalCostUSD = 0;
    let totalDiscountLYD = 0;
    let totalDiscountUSD = 0;

    filteredBookings.forEach(booking => {
      totalRevenueLYD += booking.paidLYD || 0;
      totalRevenueUSD += booking.paidUSD || 0;
      totalDiscountLYD += (booking as any).discountLYD || (booking.totals as any)?.discountLYD || 0;
      totalDiscountUSD += (booking as any).discountUSD || (booking.totals as any)?.discountUSD || 0;
    });

    filteredTrips.forEach(trip => {
      if (trip.costs) {
        totalCostLYD += (trip.costs.flightLYD || 0) + 
                        (trip.costs.hotelLYD || 0) + 
                        (trip.costs.transportLYD || 0) + 
                        (trip.costs.visaLYD || 0) + 
                        (trip.costs.otherLYD || 0);
        
        totalCostUSD += (trip.costs.flightUSD || 0) + 
                        (trip.costs.hotelUSD || 0) + 
                        (trip.costs.transportUSD || 0) + 
                        (trip.costs.visaUSD || 0) + 
                        (trip.costs.otherUSD || 0);
      }
    });

    const profitLYD = totalRevenueLYD - totalCostLYD;
    const marginLYD = totalRevenueLYD > 0 ? (profitLYD / totalRevenueLYD) * 100 : 0;

    return {
      totalRevenueLYD,
      totalCostLYD,
      profitLYD,
      marginLYD,
      totalDiscountLYD
    };
  };

  const financialMetrics = calculateFinancialMetrics();

  // Demographic Analysis
  const getDemographicsData = () => {
    let male = 0;
    let female = 0;
    let children = 0;

    filteredBookings.forEach(b => {
      b.pilgrims.forEach(p => {
        if (p.isChild) children++;
        else if (p.gender === 'Female') female++;
        else male++; // Default to male if not specified or specified as male
      });
    });

    return [
      { name: 'ذكور', value: male, color: '#3B82F6' },
      { name: 'إناث', value: female, color: '#EC4899' },
      { name: 'أطفال', value: children, color: '#10B981' }
    ];
  };

  // Top Hotels Analysis
  const getTopHotelsData = () => {
    const makkahStats: Record<string, number> = {};
    const madinahStats: Record<string, number> = {};

    filteredBookings.forEach(b => {
      if (b.makkahHotel) makkahStats[b.makkahHotel] = (makkahStats[b.makkahHotel] || 0) + 1;
      if (b.madinahHotel) madinahStats[b.madinahHotel] = (madinahStats[b.madinahHotel] || 0) + 1;
    });

    const makkah = Object.entries(makkahStats)
      .map(([name, count]) => ({ name, count, location: 'مكة' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const madinah = Object.entries(madinahStats)
      .map(([name, count]) => ({ name, count, location: 'المدينة' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return [...makkah, ...madinah];
  };

  // Time-Series Stats
  const getTimeSeriesStats = () => {
    const stats: Record<string, { revenue: number, bookings: number }> = {};
    const now = new Date();
    
    filteredBookings.forEach(b => {
      const date = new Date(b.createdAt);
      let key = '';
      
      if (timeRange === 'week') key = `W${format(date, 'w')} - ${format(date, 'MMM')}`;
      else if (timeRange === 'month') key = format(date, 'MMM yyyy', { locale: ar });
      else if (timeRange === 'quarter') {
        const q = Math.floor(date.getMonth() / 3) + 1;
        key = `Q${q} ${date.getFullYear()}`;
      } else if (timeRange === 'half') {
        const h = date.getMonth() < 6 ? 1 : 2;
        key = `H${h} ${date.getFullYear()}`;
      } else key = format(date, 'yyyy');

      if (!stats[key]) stats[key] = { revenue: 0, bookings: 0 };
      stats[key].revenue += b.totals.totalLYD || 0;
      stats[key].bookings += 1;
    });

    return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
  };

  // Marketing Analysis (Revenue-Driven)
  const getMarketingSourceData = () => {
    const sources: Record<string, { count: number; revenueLYD: number; revenueUSD: number }> = {};
    const sourceNames: Record<string, string> = {
      'Facebook': 'فيسبوك',
      'TikTok': 'تيك توك',
      'Instagram': 'انستقرام',
      'WhatsApp': 'واتساب',
      'WordOfMouth': 'توصية',
      'Walk-in': 'مكتب',
      'Snapchat': 'سناب شات',
      'Other': 'أخرى'
    };

    bookings.forEach(b => {
      const source = b.marketingSource || 'Other';
      if (!sources[source]) {
        sources[source] = { count: 0, revenueLYD: 0, revenueUSD: 0 };
      }
      sources[source].count += 1;
      sources[source].revenueLYD += b.totals.totalLYD || 0;
      sources[source].revenueUSD += b.totals.totalUSD || 0;
    });

    return Object.entries(sources).map(([key, stats]) => ({
      name: sourceNames[key] || key,
      value: stats.revenueLYD, // For the main scale
      revenueLYD: stats.revenueLYD,
      revenueUSD: stats.revenueUSD,
      count: stats.count,
      avgValue: stats.count > 0 ? stats.revenueLYD / stats.count : 0
    })).sort((a, b) => b.revenueLYD - a.revenueLYD);
  };

  const getCustomerSegmentsFromBookings = () => {
    const customerMap: Record<string, number> = {};
    
    // Group by passport or name (using name as fallback for simplicity in demo, but usually ID)
    bookings.forEach(b => {
      const mainPilgrim = b.pilgrims[0]?.passportNo || b.pilgrims[0]?.name || 'unknown';
      customerMap[mainPilgrim] = (customerMap[mainPilgrim] || 0) + 1;
    });

    const segments = { vip: 0, loyal: 0, regular: 0 };
    Object.values(customerMap).forEach(count => {
      if (count >= 3) segments.vip++;
      else if (count === 2) segments.loyal++;
      else segments.regular++;
    });

    return [
      { name: 'عملاء VIP (3+)', value: segments.vip, color: '#D4AF37' },
      { name: 'عملاء أوفياء (2)', value: segments.loyal, color: '#10B981' },
      { name: 'عملاء لمرة واحدة', value: segments.regular, color: '#3B82F6' }
    ];
  };

  const getPeakBookingTimes = () => {
    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;
    
    bookings.forEach(b => {
      const hour = new Date(b.createdAt).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });

    return Object.entries(hours).map(([hour, count]) => ({ hour: `${hour}:00`, count }));
  };

  const getTopCustomers = () => {
    const customerMap: Record<string, { name: string, passport: string, count: number, totalSpend: number }> = {};
    
    bookings.forEach(b => {
      const mainPilgrim = b.pilgrims[0];
      if (!mainPilgrim) return;
      
      const key = mainPilgrim.passportNo || mainPilgrim.name || 'unknown';
      if (!customerMap[key]) {
        customerMap[key] = { 
          name: mainPilgrim.name || 'غير معروف', 
          passport: mainPilgrim.passportNo || '---', 
          count: 0, 
          totalSpend: 0 
        };
      }
      customerMap[key].count += 1;
      customerMap[key].totalSpend += b.totals?.totalLYD || 0;
    });

    return Object.values(customerMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const getCustomerStats = () => {
    const totalCustomers = customers.length;
    const returningCustomers = customers.filter(c => (c.totalBookings || 0) > 1).length;
    const newCustomersLast30Days = customers.filter(c => {
      const created = parseISO(c.createdAt || '');
      return isAfter(created, subDays(new Date(), 30));
    }).length;

    const whatsappVerified = customers.filter(c => c.isVerified).length;
    
    return {
      totalCustomers,
      returningCustomers,
      retentionRate: totalCustomers > 0 ? (returningCustomers / totalCustomers * 100).toFixed(1) : 0,
      newCustomersLast30Days,
      whatsappVerifiedRate: totalCustomers > 0 ? (whatsappVerified / totalCustomers * 100).toFixed(1) : 0
    };
  };

  const marketingStats = getCustomerStats();

  // User Performance Analysis
  const getUserPerformanceData = () => {
    const periodDays = 30; // 30 days window analysis
    const thirtyDaysAgo = subDays(new Date(), periodDays);

    return users.map(user => {
      const userLogs = logs.filter(l => l.userId === user.id);
      const userBookings = bookings.filter(b => b.createdBy === user.id);
      const recentLogs = userLogs.filter(l => isAfter(new Date(l.timestamp), thirtyDaysAgo));
      
      const actionCount = userLogs.length;
      const recentActionCount = recentLogs.length;
      
      const uniqueDays = new Set(userLogs.map(l => format(new Date(l.timestamp), 'yyyy-MM-dd'))).size;
      const recentUniqueDays = new Set(recentLogs.map(l => format(new Date(l.timestamp), 'yyyy-MM-dd'))).size;
      
      const totalRevenue = userBookings.reduce((sum, b) => sum + (b.totals.totalLYD || 0), 0);

      // Calculate commitment score (0-100)
      const commitment = Math.min(100, (recentUniqueDays / (periodDays * 0.7)) * 100); 

      // Activity breakdown
      const activityTypes: Record<string, number> = {};
      userLogs.slice(-100).forEach(l => {
        const type = l.action.split(' ')[0] || 'أخرى';
        activityTypes[type] = (activityTypes[type] || 0) + 1;
      });

      const topActivity = Object.entries(activityTypes).sort((a,b) => b[1] - a[1])[0]?.[0] || 'حجز';

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        actions: actionCount,
        recentActions: recentActionCount,
        bookings: userBookings.length,
        totalRevenue,
        efficiency: actionCount > 0 ? (userBookings.length / actionCount * 100).toFixed(1) : 0,
        activeDays: uniqueDays,
        commitment: Math.round(commitment),
        lastActive: userLogs.length > 0 ? new Date(userLogs[0].timestamp) : null,
        topActivity
      };
    }).filter(u => u.actions > 0 || u.bookings > 0)
      .sort((a, b) => b.bookings - a.bookings);
  };

  const userPerformanceData = getUserPerformanceData();

  // Existing Chart Data Functions (from standard FinanceAnalytics)
  const getMonthlySalesData = () => {
    const months: Record<string, number> = {};
    bookings.forEach(b => {
      const month = format(new Date(b.createdAt), 'MMMM', { locale: ar });
      months[month] = (months[month] || 0) + (b.totals.totalLYD || 0);
    });
    return Object.entries(months).map(([name, value]) => ({ name, value }));
  };

  const getTripProfitabilityData = () => {
    return trips.slice(0, 8).map(trip => {
      const tripBookings = bookings.filter(b => b.tripId === trip.id);
      const revenue = tripBookings.reduce((sum, b) => sum + (b.paidLYD || 0), 0);
      const cost = trip.costs ? (
        (trip.costs.flightLYD || 0) + 
        (trip.costs.hotelLYD || 0) + 
        (trip.costs.transportLYD || 0) + 
        (trip.costs.visaLYD || 0) + 
        (trip.costs.otherLYD || 0)
      ) : 0;
      
      return {
        name: trip.name,
        revenue,
        cost,
        profit: revenue - cost
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold"></div>
          <p className="text-gold font-bold animate-pulse text-xl">جاري تحليل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header & Main Navigation Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-bold text-white mb-3 gold-text-gradient">مركز التحليلات الذكي</h2>
          <p className="text-white/60">نظرة شاملة على الأداء المالي، التسويقي، وأداء الموظفين</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 self-stretch md:self-auto">
          <TabButton active={activeTab === 'financial'} onClick={() => setActiveTab('financial')} icon={<DollarSign className="w-4 h-4" />} label="الأداء المالي" />
          <TabButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon={<BarChart3 className="w-4 h-4" />} label="تحليل الحجوزات" />
          <TabButton active={activeTab === 'performance'} onClick={() => setActiveTab('performance')} icon={<Activity className="w-4 h-4" />} label="إنتاجية الفريق" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-8"
        >
          {/* Financial Tab Content */}
          {activeTab === 'financial' && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-white/40 text-sm">نطاق التحليل الزمني:</span>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <button onClick={() => setTimeRange('week')} className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", timeRange === 'week' ? "bg-gold text-matte-black" : "text-white/40 hover:text-white")}>أسبوعي</button>
                  <button onClick={() => setTimeRange('month')} className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", timeRange === 'month' ? "bg-gold text-matte-black" : "text-white/40 hover:text-white")}>شهري</button>
                  <button onClick={() => setTimeRange('quarter')} className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", timeRange === 'quarter' ? "bg-gold text-matte-black" : "text-white/40 hover:text-white")}>ربع سنوي</button>
                  <button onClick={() => setTimeRange('half')} className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", timeRange === 'half' ? "bg-gold text-matte-black" : "text-white/40 hover:text-white")}>نصف سنوي</button>
                  <button onClick={() => setTimeRange('year')} className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", timeRange === 'year' ? "bg-gold text-matte-black" : "text-white/40 hover:text-white")}>سنوي</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                  title="إجمالي الإيرادات" 
                  value={financialMetrics.totalRevenueLYD} 
                  icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
                  trend="+12%"
                  isPositive={true}
                />
                <MetricCard 
                  title="صافي الأرباح" 
                  value={financialMetrics.profitLYD} 
                  icon={<DollarSign className="w-6 h-6 text-gold" />}
                  trend="+18%"
                  isPositive={true}
                />
                <MetricCard 
                  title="هامش الربح" 
                  value={`${financialMetrics.marginLYD.toFixed(1)}%`} 
                  icon={<Target className="w-6 h-6 text-blue-400" />}
                  trend="+2%"
                  isPositive={true}
                  isCurrency={false}
                />
                <MetricCard 
                  title="إجمالي التخفيضات" 
                  value={financialMetrics.totalDiscountLYD} 
                  icon={<ArrowDownRight className="w-6 h-6 text-rose-400" />}
                  trend="قيمة الخصم"
                  isPositive={false}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartContainer title="مقارنة الإيرادات والتكاليف" subtitle="حسب كل رحلة">
                  <BarChart data={getTripProfitabilityData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="revenue" name="الإيرادات" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="التكاليف" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>

                <ChartContainer title="نمو المبيعات الزمني" subtitle={`تحليل المبيعات ${timeRange === 'week' ? 'الأسبوعي' : timeRange === 'month' ? 'الشهري' : timeRange === 'quarter' ? 'الربع سنوي' : 'السنوي'}`}>
                  <AreaChart data={getTimeSeriesStats()}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                      formatter={(val: any) => [`${val.toLocaleString()} د.ل`, 'الإيرادات']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#D4AF37" fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ChartContainer>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="bg-white/5 px-8 py-4 border-b border-white/10 flex justify-between items-center">
                  <h3 className="font-bold text-white flex items-center gap-2">أكثر الفنادق طلباً</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-white/5 text-[10px] uppercase font-bold text-white/30">
                      <tr>
                        <th className="px-8 py-4 text-right">عنوان الفندق</th>
                        <th className="px-8 py-4">المدينة</th>
                        <th className="px-8 py-4">عدد الحجوزات</th>
                        <th className="px-8 py-4">الشعبية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {getTopHotelsData().map((hotel, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-all">
                          <td className="px-8 py-4 font-bold text-white">{hotel.name}</td>
                          <td className="px-8 py-4">
                            <span className={clsx(
                              "px-2 py-1 rounded text-[10px] font-bold",
                              hotel.location === 'مكة' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-400"
                            )}>
                              {hotel.location}
                            </span>
                          </td>
                          <td className="px-8 py-4 font-black text-gold">{hotel.count}</td>
                          <td className="px-8 py-4">
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gold" 
                                style={{ width: `${(hotel.count / (getTopHotelsData()[0]?.count || 1)) * 100}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Booking Insights Tab Content */}
          {activeTab === 'insights' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Popular Hotels */}
                <div className="glass-card p-8 bg-gradient-to-br from-gold/5 to-transparent">
                   <h3 className="text-xl font-bold text-white mb-8 flex justify-between items-center">
                     الفنادق الأكثر طلباً
                     <span className="text-xs font-normal text-white/40">حسب تكرار الحجز في الفواتير</span>
                   </h3>
                   <div className="space-y-6">
                     {getTopHotelsData().slice(0, 10).map((hotel, i) => (
                       <div key={i} className="flex items-center gap-4 group">
                         <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 text-xs font-bold transition-colors group-hover:bg-gold/20 group-hover:text-gold">
                           {i + 1}
                         </div>
                         <div className="flex-1">
                           <div className="flex justify-between mb-1.5">
                             <span className="text-sm font-bold text-white/80">{hotel.name}</span>
                             <div className="flex items-center gap-2">
                               <span className="text-xs text-white/30">{hotel.location}</span>
                               <span className="text-xs font-black text-gold">{hotel.count} حجز</span>
                             </div>
                           </div>
                           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-gold transition-all duration-1000" 
                               style={{ width: `${(hotel.count / (getTopHotelsData()[0]?.count || 1)) * 100}%` }}
                             />
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Top Customers */}
                <div className="glass-card p-8 bg-gradient-to-br from-blue-500/5 to-transparent">
                  <h3 className="text-xl font-bold text-white mb-8 flex justify-between items-center">
                    العملاء الأكثر حجوزات
                    <span className="text-xs font-normal text-white/40">أعلى 10 عملاء نشاطاً</span>
                  </h3>
                  <div className="space-y-6">
                    {getTopCustomers().map((customer, i) => (
                      <div key={i} className="flex items-center gap-4 group p-3 rounded-2xl hover:bg-white/5 transition-all">
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black",
                          i === 0 ? "bg-gold/20 text-gold border border-gold/50" : "bg-white/5 text-white/40"
                        )}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{customer.name}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">{customer.passport}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-xl font-black text-white">{customer.count}</span>
                            <span className="text-[10px] text-white/40">رحلات</span>
                          </div>
                          <p className="text-[10px] font-bold text-emerald-400">{(customer.totalSpend).toLocaleString()} د.ل</p>
                        </div>
                      </div>
                    ))}
                    {getTopCustomers().length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-white/20">
                        <Users className="w-12 h-12 mb-4 opacity-20" />
                        <p>لا توجد بيانات عملاء كافية للتحليل</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Demographics Tab Content - REMOVED/MERGED */}

          {/* Performance Tab Content */}
          {activeTab === 'performance' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Team Standings */}
                <div className="lg:col-span-1 glass-card p-8 flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Award className="w-6 h-6 text-gold" /> تتبع الالتزام والأداء
                  </h3>
                  <div className="space-y-6 flex-1">
                    {userPerformanceData.slice(0, 5).map((u, i) => (
                      <div key={u.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-gold/30 transition-all group">
                        <div className="flex items-center gap-4 mb-3">
                          <div className={clsx(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg",
                            i === 0 ? "bg-gold/20 text-gold border border-gold" : "bg-white/5 text-white/40"
                          )}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-white">{u.name}</p>
                            <p className="text-[10px] text-white/40">{u.role === 'admin' ? 'مدير' : u.role === 'staff' ? 'موظف' : u.role}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-gold">{u.bookings}</p>
                            <p className="text-[10px] text-white/40">حجز</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                            <span className="text-white/20">نسبة الالتزام</span>
                            <span className={clsx(u.commitment > 70 ? "text-emerald-500" : "text-amber-500")}>{u.commitment}%</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={clsx("h-full transition-all duration-1000", u.commitment > 70 ? "bg-emerald-500" : "bg-amber-500")} 
                              style={{ width: `${u.commitment}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Radar or Activity */}
                <ChartContainer title="تحليل كفاءة العمليات" subtitle="تتبع النشاط مقابل النتائج" className="lg:col-span-2">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="actions" name="العمليات" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                    <YAxis type="number" dataKey="bookings" name="الحجوزات" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                    <ZAxis type="number" dataKey="commitment" range={[50, 200]} name="الالتزام" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                    <Scatter name="الموظفين" data={userPerformanceData}>
                      {userPerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ChartContainer>
              </div>

              {/* Full Performance Table */}
              <div className="glass-card overflow-hidden">
                <div className="bg-white/5 px-8 py-4 border-b border-white/10 flex justify-between items-center">
                  <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-gold" /> لوحة قيادة أداء الفريق الكاملة
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-white/5 text-[10px] uppercase font-bold text-white/30">
                      <tr>
                        <th className="px-8 py-4">الموظف</th>
                        <th className="px-8 py-4">عدد الحجوزات</th>
                        <th className="px-8 py-4">القيمة المحصلة</th>
                        <th className="px-8 py-4">إجمالي العمليات</th>
                        <th className="px-8 py-4 text-center">الالتزام</th>
                        <th className="px-8 py-4">آخر ظهور</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {userPerformanceData.map((u) => (
                        <tr key={u.id} className="hover:bg-white/5 transition-all group">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-xs uppercase">
                                {u.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-white/80">{u.name}</span>
                                <span className="text-[8px] text-white/20 uppercase tracking-widest">{u.role}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4 font-black text-white">{u.bookings}</td>
                          <td className="px-8 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-emerald-400">{u.totalRevenue.toLocaleString()} د.ل</span>
                              <span className="text-[8px] text-white/20">إجمالي مبيعات الموظف</span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-sm text-white/40">{u.actions}</td>
                          <td className="px-8 py-4">
                            <div className="flex flex-col items-center gap-1">
                              <span className={clsx(
                                "text-xs font-black",
                                u.commitment > 80 ? "text-emerald-500" : u.commitment > 50 ? "text-amber-500" : "text-rose-500"
                              )}>
                                {u.commitment}%
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-xs text-white/40">
                            {u.lastActive ? format(u.lastActive, 'yyyy-MM-dd', { locale: ar }) : '---'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Sub-components

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={clsx(
      "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300",
      active 
        ? "bg-gold text-matte-black shadow-[0_0_20px_rgba(212,175,55,0.3)]" 
        : "text-white/40 hover:text-white"
    )}
  >
    {icon}
    {label}
  </button>
);

const ChartContainer: React.FC<{ title: string; subtitle: string; children: React.ReactNode; className?: string }> = ({ title, subtitle, children, className }) => (
  <div className={clsx("glass-card p-8 flex flex-col", className)}>
    <div className="mb-8">
      <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-white/40 uppercase tracking-widest">{subtitle}</p>
    </div>
    <div className="flex-1 min-h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        {children as any}
      </ResponsiveContainer>
    </div>
  </div>
);

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
  isPositive: boolean;
  isCurrency?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, isPositive, isCurrency = true }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card p-6 relative overflow-hidden group border-white/5 hover:border-gold/30 transition-all"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
    
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:bg-gold/10 group-hover:border-gold/20 transition-all">
        {icon}
      </div>
      <div className={clsx(
        "flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter",
        isPositive ? "text-emerald-400" : "text-rose-400"
      )}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {trend}
      </div>
    </div>
    
    <div className="space-y-1">
      <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{title}</p>
      <h4 className="text-2xl font-black text-white">
        {typeof value === 'number' ? (isCurrency ? value.toLocaleString() : value) : value}
        {typeof value === 'number' && isCurrency && <span className="text-[10px] text-white/40 mr-1 uppercase">LYD</span>}
      </h4>
    </div>
  </motion.div>
);
