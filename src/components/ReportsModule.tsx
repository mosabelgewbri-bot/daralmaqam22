import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { BarChart3, FileText, Download, Calendar, Search, Filter, PieChart, TrendingUp, Users } from 'lucide-react';

const ReportsModule: React.FC = () => {
  const { t } = useTranslation();

  const reportTypes = [
    { title: t('reports.bookingsReport'), icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
    { title: t('reports.financialReport'), icon: BarChart3, color: 'text-green-500', bg: 'bg-green-50' },
    { title: t('reports.pilgrimsReport'), icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
    { title: t('reports.tripsReport'), icon: PieChart, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="text-primary w-6 h-6" />
          {t('nav.reports')}
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
        {reportTypes.map((report, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-primary/30 transition-all cursor-pointer group"
          >
            <div className={`${report.bg} ${report.color} p-4 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
              <report.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{report.title}</h3>
            <p className="text-xs text-gray-500">آخر تحديث: منذ ساعتين</p>
            <button className="mt-4 text-primary text-sm font-medium flex items-center gap-1 hover:underline">
              {t('reports.generate')}
              <TrendingUp className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('reports.recentReports')}</h2>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('common.search')}
              className="pr-10 pl-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">تقرير مبيعات شهر مارس 2024</p>
                  <p className="text-xs text-gray-500">بواسطة: أحمد محمد • 2.4 MB • PDF</p>
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                <Download className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;
