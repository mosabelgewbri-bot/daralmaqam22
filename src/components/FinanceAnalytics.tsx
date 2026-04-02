import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { BarChart3, PieChart, TrendingUp, TrendingDown, DollarSign, Calendar, Search, Filter, Download, ArrowUpRight, ArrowDownRight, Target, Zap } from 'lucide-react';

const FinanceAnalytics: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="text-primary w-6 h-6" />
          {t('nav.financeAnalytics')}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-primary w-5 h-5" />
                {t('finance.revenueGrowth')}
              </h2>
              <div className="flex gap-4 text-xs font-bold">
                <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  <ArrowUpRight className="w-3 h-3" />
                  +12.5%
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  مقارنة بالشهر الماضي
                </div>
              </div>
            </div>
            
            <div className="flex items-end justify-between h-64 gap-4">
              {[30, 45, 35, 60, 50, 85, 70, 95, 80, 100, 90, 110].map((h, i) => (
                <div key={i} className="flex-1 bg-primary/5 rounded-t-lg relative group">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-lg transition-all group-hover:bg-primary-dark" 
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {h * 1000} SAR
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[10px] text-gray-400 font-bold">
              <span>يناير</span>
              <span>فبراير</span>
              <span>مارس</span>
              <span>أبريل</span>
              <span>مايو</span>
              <span>يونيو</span>
              <span>يوليو</span>
              <span>أغسطس</span>
              <span>سبتمبر</span>
              <span>أكتوبر</span>
              <span>نوفمبر</span>
              <span>ديسمبر</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Target className="text-primary w-5 h-5" />
                {t('finance.salesTarget')}
              </h2>
              <div className="relative w-48 h-48 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-gray-100 stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
                  <circle className="text-primary stroke-current" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset="62.8" strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">75%</span>
                  <span className="text-[10px] text-gray-400">تم تحقيقه</span>
                </div>
              </div>
              <div className="mt-6 space-y-2 text-center">
                <p className="text-sm font-bold text-gray-900">الهدف: 1,000,000 SAR</p>
                <p className="text-xs text-gray-500">متبقي 250,000 ريال سعودي لتحقيق الهدف السنوي.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Zap className="text-amber-500 w-5 h-5" />
                {t('finance.topTrips')}
              </h2>
              <div className="space-y-6">
                {[
                  { label: 'عمرة رمضان 2024', value: 85, color: 'bg-primary' },
                  { label: 'حج 1445هـ', value: 60, color: 'bg-green-500' },
                  { label: 'سياحة تركيا', value: 45, color: 'bg-amber-500' },
                  { label: 'عمرة المولد', value: 30, color: 'bg-purple-500' },
                ].map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-700">{item.label}</span>
                      <span className="text-primary">{item.value}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ delay: index * 0.1, duration: 1 }}
                        className={`h-full ${item.color}`}
                      ></motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-primary p-8 rounded-3xl shadow-xl shadow-primary/20 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70">الرصيد الحالي</p>
                  <p className="text-2xl font-bold">1,250,000 SAR</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                  <p className="text-[10px] opacity-70 mb-1">الإيداعات</p>
                  <p className="font-bold text-sm">+45,000</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                  <p className="text-[10px] opacity-70 mb-1">المصروفات</p>
                  <p className="font-bold text-sm">-12,000</p>
                </div>
              </div>

              <button className="w-full bg-white text-primary py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-lg">
                سحب التقارير المالية
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <PieChart className="text-primary w-5 h-5" />
              {t('finance.revenueByAgent')}
            </h2>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {i === 1 ? 'أ' : i === 2 ? 'م' : i === 3 ? 'خ' : 'س'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">وكيل {i === 1 ? 'أحمد' : i === 2 ? 'محمد' : i === 3 ? 'خالد' : 'سعد'}</p>
                      <p className="text-[10px] text-gray-400">12 حجز هذا الشهر</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary">45,000 SAR</p>
                    <div className="flex items-center gap-1 text-[8px] text-green-600 bg-green-50 px-1 rounded">
                      <ArrowUpRight className="w-2 h-2" />
                      +5%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceAnalytics;
