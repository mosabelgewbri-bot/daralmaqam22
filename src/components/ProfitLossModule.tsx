import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, DollarSign, Search, Filter, Plus, Download, Calendar, PieChart, BarChart3, AlertCircle } from 'lucide-react';

const ProfitLossModule: React.FC = () => {
  const { t } = useTranslation();

  const stats = [
    { title: t('finance.totalRevenue'), value: '450,000', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
    { title: t('finance.totalExpenses'), value: '120,000', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
    { title: t('finance.netProfit'), value: '330,000', icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-50' },
    { title: t('finance.profitMargin'), value: '73%', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="text-primary w-6 h-6" />
          {t('nav.profitLoss')}
        </h1>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-all">
            <Calendar className="w-4 h-4" />
            {t('common.dateRange')}
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
            <Download className="w-4 h-4" />
            {t('reports.exportAll')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className={`${stat.bg} ${stat.color} p-3 rounded-lg w-fit mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-500">{stat.title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stat.value} <span className="text-xs font-normal text-gray-400">SAR</span>
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="text-primary w-5 h-5" />
            {t('finance.revenueVsExpenses')}
          </h2>
          <div className="flex items-end justify-between h-48 gap-4">
            {[40, 60, 45, 80, 55, 70].map((h, i) => (
              <div key={i} className="flex-1 flex gap-1 items-end h-full">
                <div className="flex-1 bg-green-500 rounded-t-md" style={{ height: `${h}%` }}></div>
                <div className="flex-1 bg-red-500 rounded-t-md" style={{ height: `${h * 0.3}%` }}></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-400">
            <span>أكتوبر</span>
            <span>نوفمبر</span>
            <span>ديسمبر</span>
            <span>يناير</span>
            <span>فبراير</span>
            <span>مارس</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <PieChart className="text-primary w-5 h-5" />
            {t('finance.profitByTripType')}
          </h2>
          <div className="flex items-center justify-center h-48">
            <div className="relative w-32 h-32 rounded-full border-[16px] border-primary border-r-green-500 border-b-amber-500 border-l-purple-500">
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                الأرباح
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            {[
              { label: 'عمرة', value: 65, color: 'bg-primary' },
              { label: 'حج', value: 20, color: 'bg-green-500' },
              { label: 'سياحة', value: 10, color: 'bg-amber-500' },
              { label: 'أخرى', value: 5, color: 'bg-purple-500' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className="text-xs text-gray-600">{item.label}</span>
                <span className="text-xs font-bold text-gray-900 ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 flex items-center gap-4">
        <div className="bg-amber-500 p-3 rounded-lg text-white">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-amber-900">تنبيه هام</h3>
          <p className="text-sm text-amber-800">يوجد 5 حجوزات لم يتم سداد كامل قيمتها بعد، بإجمالي مبلغ 15,000 ريال سعودي.</p>
        </div>
        <button className="mr-auto bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
          مراجعة الحجوزات
        </button>
      </div>
    </div>
  );
};

export default ProfitLossModule;
