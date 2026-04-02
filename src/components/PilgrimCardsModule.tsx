import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { CreditCard, Users, Search, Filter, Plus, Download, Printer, Share2, User, Phone, MapPin, Calendar, FileText } from 'lucide-react';

const PilgrimCardsModule: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-primary w-6 h-6" />
          {t('nav.pilgrimCards')}
        </h1>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-all">
            <Printer className="w-4 h-4" />
            {t('pilgrimCards.printAll')}
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            {t('pilgrimCards.generateCards')}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
            >
              <div className="bg-primary p-4 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="relative z-10">
                  <h3 className="font-bold text-lg">دار المقام</h3>
                  <p className="text-[10px] opacity-80">لخدمات الحج والعمرة</p>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-50">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">أحمد محمد علي</p>
                    <p className="text-xs text-gray-500">رقم الجواز: A1234567</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="w-3 h-3 text-primary" />
                    <span>الرحلة: عمرة رمضان 2024</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span>الفندق: مكة هيلتون</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone className="w-3 h-3 text-primary" />
                    <span>الطوارئ: +966 50 123 4567</span>
                  </div>
                </div>

                <div className="flex items-center justify-center pt-4">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <div className="w-24 h-24 bg-white border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">
                      QR CODE
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 flex justify-center gap-4 border-t border-gray-100">
                <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                  <Printer className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PilgrimCardsModule;
