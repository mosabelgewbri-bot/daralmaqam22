import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Plane, Search, Filter, Plus, Download, Share2, MapPin, Calendar, CreditCard, Star, Clock } from 'lucide-react';

const UmrahOffersModule: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Plane className="text-primary w-6 h-6" />
          {t('nav.umrahOffers')}
        </h1>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-all">
            <Share2 className="w-4 h-4" />
            {t('umrahOffers.shareAll')}
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            {t('umrahOffers.newOffer')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={`https://picsum.photos/seed/umrah${i}/800/600`}
                alt="Umrah Offer"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                عرض خاص
              </div>
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>4.9 (120 تقييم)</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900">عمرة رمضان - فندق مكة هيلتون</h3>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>مكة المكرمة</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>15 يوم</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>تبدأ في 10 مارس</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2">
                استمتع برحلة عمرة مميزة في شهر رمضان المبارك مع إقامة فاخرة في فندق مكة هيلتون المطل على الحرم مباشرة.
              </p>

              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">تبدأ من</p>
                  <p className="text-2xl font-bold text-primary">
                    4,500 <span className="text-sm font-normal text-gray-500">SAR</span>
                  </p>
                </div>
                <button className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary hover:text-white transition-all">
                  التفاصيل
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default UmrahOffersModule;
