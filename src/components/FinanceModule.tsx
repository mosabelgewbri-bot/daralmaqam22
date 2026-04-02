import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { CreditCard, TrendingUp, TrendingDown, DollarSign, Search, Filter, Plus, Download, Calendar, PieChart, BarChart3 } from 'lucide-react';

const FinanceModule: React.FC = () => {
  const { t } = useTranslation();

  const stats = [
    { title: t('finance.totalRevenue'), value: '450,000', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
    { title: t('finance.totalExpenses'), value: '120,000', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
    { title: t('finance.netProfit'), value: '330,000', icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-50' },
    { title: t('finance.pendingPayments'), value: '45,000', icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="text-primary w-6 h-6" />
          {t('nav.finance')}
        </h1>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-all">
            <Calendar className="w-4 h-4" />
            {t('common.dateRange')}
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            {t('finance.addTransaction')}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('finance.recentTransactions')}</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('common.search')}
                  className="pr-10 pl-4 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <button className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-primary transition-colors">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-500 text-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">{t('finance.date')}</th>
                  <th className="px-6 py-3 font-medium">{t('finance.description')}</th>
                  <th className="px-6 py-3 font-medium">{t('finance.category')}</th>
                  <th className="px-6 py-3 font-medium">{t('finance.amount')}</th>
                  <th className="px-6 py-3 font-medium">{t('finance.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">2024-03-2{i}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">دفعة حجز #B123{i}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">إيرادات</td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">+1,500 SAR</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        مكتمل
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <PieChart className="text-primary w-5 h-5" />
              {t('finance.expenseDistribution')}
            </h2>
            <div className="space-y-4">
              {[
                { label: 'تذاكر طيران', value: 45, color: 'bg-blue-500' },
                { label: 'فنادق', value: 30, color: 'bg-green-500' },
                { label: 'تأشيرات', value: 15, color: 'bg-amber-500' },
                { label: 'نقل', value: 10, color: 'bg-purple-500' },
              ].map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.value}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="text-primary w-5 h-5" />
              {t('finance.monthlyRevenue')}
            </h2>
            <div className="flex items-end justify-between h-32 gap-2">
              {[40, 60, 45, 80, 55, 70].map((h, i) => (
                <div key={i} className="flex-1 bg-primary/10 rounded-t-md relative group">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-md transition-all group-hover:bg-primary-dark" 
                    style={{ height: `${h}%` }}
                  ></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
              <span>أكتوبر</span>
              <span>نوفمبر</span>
              <span>ديسمبر</span>
              <span>يناير</span>
              <span>فبراير</span>
              <span>مارس</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceModule;
