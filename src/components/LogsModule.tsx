import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { FileText, Search, Filter, Download, Calendar, User, Clock, Shield, AlertCircle, CheckCircle, Info } from 'lucide-react';

const LogsModule: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-primary w-6 h-6" />
          {t('nav.logs')}
        </h1>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-all">
            <Calendar className="w-4 h-4" />
            {t('common.dateRange')}
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
            <Download className="w-4 h-4" />
            {t('logs.exportLogs')}
          </button>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('common.search')}
              className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 flex items-center gap-2 hover:bg-gray-50 transition-all">
              <Filter className="w-4 h-4" />
              {t('common.filter')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-500 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">{t('logs.timestamp')}</th>
                <th className="px-6 py-3 font-medium">{t('logs.user')}</th>
                <th className="px-6 py-3 font-medium">{t('logs.action')}</th>
                <th className="px-6 py-3 font-medium">{t('logs.details')}</th>
                <th className="px-6 py-3 font-medium">{t('logs.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      2024-03-2{i} 10:3{i}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        {i % 2 === 0 ? 'أ' : 'م'}
                      </div>
                      <span className="text-sm font-medium text-gray-900">مستخدم {i}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Shield className="w-4 h-4 text-primary" />
                      {i % 3 === 0 ? 'تعديل حجز' : i % 3 === 1 ? 'إضافة رحلة' : 'تسجيل دخول'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-gray-500 truncate max-w-xs">
                      {i % 3 === 0 ? 'تم تعديل بيانات الحجز رقم #B12345' : i % 3 === 1 ? 'تم إضافة رحلة عمرة رمضان 2024' : 'تم تسجيل الدخول من عنوان IP: 192.168.1.1'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {i % 5 === 0 ? (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      <span className={`text-xs font-medium ${i % 5 === 0 ? 'text-amber-700' : 'text-green-700'}`}>
                        {i % 5 === 0 ? 'تحذير' : 'ناجح'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LogsModule;
