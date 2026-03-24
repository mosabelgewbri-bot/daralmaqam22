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
  Hotel
} from 'lucide-react';
import { motion } from 'framer-motion';
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
  Area
} from 'recharts';
import { api } from '../services/api';
import { Trip, Booking } from '../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const COLORS = ['#D4AF37', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export const FinanceAnalytics: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsData, bookingsData] = await Promise.all([
          api.getTrips(),
          api.getBookings()
        ]);
        setTrips(tripsData);
        setBookings(bookingsData);
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

  // Calculate Financial Metrics
  const calculateMetrics = () => {
    let totalRevenueLYD = 0;
    let totalRevenueUSD = 0;
    let totalCostLYD = 0;
    let totalCostUSD = 0;

    filteredBookings.forEach(booking => {
      totalRevenueLYD += booking.paidLYD || 0;
      totalRevenueUSD += booking.paidUSD || 0;
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
    const profitUSD = totalRevenueUSD - totalCostUSD;
    const marginLYD = totalRevenueLYD > 0 ? (profitLYD / totalRevenueLYD) * 100 : 0;

    return {
      totalRevenueLYD,
      totalRevenueUSD,
      totalCostLYD,
      totalCostUSD,
      profitLYD,
      profitUSD,
      marginLYD
    };
  };

  const metrics = calculateMetrics();

  // Data for Charts
  const getCostBreakdownData = () => {
    const breakdown = {
      flight: 0,
      hotel: 0,
      transport: 0,
      visa: 0,
      other: 0
    };

    filteredTrips.forEach(trip => {
      if (trip.costs) {
        breakdown.flight += (trip.costs.flightLYD || 0);
        breakdown.hotel += (trip.costs.hotelLYD || 0);
        breakdown.transport += (trip.costs.transportLYD || 0);
        breakdown.visa += (trip.costs.visaLYD || 0);
        breakdown.other += (trip.costs.otherLYD || 0);
      }
    });

    return [
      { name: 'طيران', value: breakdown.flight },
      { name: 'فنادق', value: breakdown.hotel },
      { name: 'نقل', value: breakdown.transport },
      { name: 'تأشيرات', value: breakdown.visa },
      { name: 'أخرى', value: breakdown.other },
    ].filter(item => item.value > 0);
  };

  const getTripProfitabilityData = () => {
    return trips.slice(0, 6).map(trip => {
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

  const getMonthlySalesData = () => {
    const months: Record<string, number> = {};
    bookings.forEach(b => {
      const month = format(new Date(b.createdAt), 'MMMM', { locale: ar });
      months[month] = (months[month] || 0) + (b.totals.totalLYD || 0);
    });
    return Object.entries(months).map(([name, value]) => ({ name, value }));
  };

  const getPopularHotelsData = () => {
    const hotels: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.makkahHotel && b.makkahHotel !== 'تأشيرة فقط') {
        hotels[b.makkahHotel] = (hotels[b.makkahHotel] || 0) + 1;
      }
    });
    return Object.entries(hotels)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const getGrowthData = () => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    const currentYearData = new Array(12).fill(0);
    const lastYearData = new Array(12).fill(0);

    bookings.forEach(b => {
      const date = new Date(b.createdAt);
      const month = date.getMonth();
      if (date.getFullYear() === currentYear) {
        currentYearData[month] += b.totals.totalLYD || 0;
      } else if (date.getFullYear() === lastYear) {
        lastYearData[month] += b.totals.totalLYD || 0;
      }
    });

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    return monthNames.map((name, i) => ({
      name,
      current: currentYearData[i],
      last: lastYearData[i]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">التحليلات المالية المتقدمة</h2>
          <p className="text-white/60">تقارير مفصلة عن الإيرادات والتكاليف والأرباح</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
          <Filter className="w-5 h-5 text-gold ml-2" />
          <select 
            className="bg-transparent text-white border-none focus:ring-0 text-sm cursor-pointer"
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

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="إجمالي الإيرادات (LYD)" 
          value={metrics.totalRevenueLYD} 
          icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
          trend="+12.5%"
          isPositive={true}
        />
        <MetricCard 
          title="إجمالي التكاليف (LYD)" 
          value={metrics.totalCostLYD} 
          icon={<TrendingDown className="w-6 h-6 text-rose-400" />}
          trend="+5.2%"
          isPositive={false}
        />
        <MetricCard 
          title="صافي الربح (LYD)" 
          value={metrics.profitLYD} 
          icon={<DollarSign className="w-6 h-6 text-gold" />}
          trend="+18.3%"
          isPositive={true}
        />
        <MetricCard 
          title="هامش الربح" 
          value={`${metrics.marginLYD.toFixed(1)}%`} 
          icon={<BarChart3 className="w-6 h-6 text-blue-400" />}
          trend="+2.1%"
          isPositive={true}
          isCurrency={false}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue vs Cost Chart */}
        <div className="glass-card p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold" /> مقارنة الإيرادات والتكاليف حسب الرحلة
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
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
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Breakdown Chart */}
        <div className="glass-card p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-gold" /> تحليل هيكل التكاليف
          </h3>
          <div className="h-[350px] w-full flex flex-col md:flex-row items-center">
            <div className="h-full w-full md:w-2/3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getCostBreakdownData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getCostBreakdownData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/3 space-y-4">
              {getCostBreakdownData().map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-sm text-white/70">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{item.value.toLocaleString()} LYD</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Performance Reports Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Best Selling Months */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gold" /> أكثر الشهور مبيعاً
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getMonthlySalesData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="value" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Hotels */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Hotel className="w-5 h-5 text-gold" /> الفنادق الأكثر طلباً
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getPopularHotelsData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {getPopularHotelsData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {getPopularHotelsData().map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-white/70 truncate max-w-[150px]">{item.name}</span>
                </div>
                <span className="text-white font-bold">{item.value} حجز</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sales Growth */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold" /> نمو المبيعات (سنوي)
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getGrowthData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Line type="monotone" dataKey="current" name="السنة الحالية" stroke="#D4AF37" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="last" name="السنة الماضية" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Profit Margin Trend */}
      <div className="glass-card p-8">
        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gold" /> اتجاه الربحية
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getTripProfitabilityData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Area type="monotone" dataKey="profit" name="الربح" stroke="#D4AF37" fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Reports Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Best Selling Months */}
        <div className="glass-card p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gold" /> الأشهر الأكثر مبيعاً
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getMonthlySalesData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="value" name="المبيعات" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Hotels */}
        <div className="glass-card p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-gold" /> الفنادق الأكثر طلباً
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getPopularHotelsData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {getPopularHotelsData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sales Growth Chart */}
      <div className="glass-card p-8">
        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gold" /> نمو المبيعات (مقارنة بالعام الماضي)
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getGrowthData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Line type="monotone" dataKey="current" name="العام الحالي" stroke="#D4AF37" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="last" name="العام الماضي" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

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
    className="glass-card p-6 relative overflow-hidden group"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
    
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
        {icon}
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {trend}
      </div>
    </div>
    
    <div className="space-y-1">
      <p className="text-sm text-white/50 font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-white">
        {typeof value === 'number' ? (isCurrency ? value.toLocaleString() : value) : value}
        {typeof value === 'number' && isCurrency && <span className="text-xs text-white/40 mr-1">LYD</span>}
      </h4>
    </div>
  </motion.div>
);
