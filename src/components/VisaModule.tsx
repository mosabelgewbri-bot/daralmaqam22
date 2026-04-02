import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { CreditCard, Users, FileText, Search, Filter, Plus, Save, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const VisaModule: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-primary w-6 h-6" />
          {t('nav.visa')}
        </h1>
        <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          {t('visa.issueVisa')}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-500 p-3 rounded-lg text-white">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('visa.issuedVisas')}</p>
            <p className="text-xl font-bold text-gray-900">120</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-amber-500 p-3 rounded-lg text-white">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('visa.pendingVisas')}</p>
            <p className="text-xl font-bold text-gray-900">15</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-500 p-3 rounded-lg text-white">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('visa.rejectedVisas')}</p>
            <p className="text-xl font-bold text-gray-900">2</p>
          </div>
        </div>
      </div>

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
                <th className="px-6 py-3 font-medium">{t('visa.pilgrimName')}</th>
                <th className="px-6 py-3 font-medium">{t('visa.passportNumber')}</th>
                <th className="px-6 py-3 font-medium">{t('visa.visaNumber')}</th>
                <th className="px-6 py-3 font-medium">{t('visa.issueDate')}</th>
                <th className="px-6 py-3 font-medium">{t('visa.status')}</th>
                <th className="px-6 py-3 font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">معتمر {i}</td>
                  <td className="px-6 py-4 text-gray-600">A123456{i}</td>
                  <td className="px-6 py-4 text-gray-600">V987654{i}</td>
                  <td className="px-6 py-4 text-gray-600">2024-03-2{i}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${i % 2 === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {i % 2 === 0 ? 'صدرت' : 'قيد المعالجة'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-primary hover:text-primary-dark font-medium text-sm">
                      {t('common.view')}
                    </button>
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

export default VisaModule;
