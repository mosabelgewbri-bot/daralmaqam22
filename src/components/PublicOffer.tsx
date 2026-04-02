import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Plane, MapPin, Calendar, CreditCard, Star, Clock, Share2, Phone, MessageCircle } from 'lucide-react';
import { UmrahOffer } from '../types';

interface PublicOfferProps {
  offer: UmrahOffer;
}

const PublicOffer: React.FC<PublicOfferProps> = ({ offer }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="relative h-96 overflow-hidden">
          <img
            src={offer.image || `https://picsum.photos/seed/umrah${offer.id}/1200/800`}
            alt={offer.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-8 right-8 text-white">
            <h1 className="text-4xl font-bold mb-2">{offer.title}</h1>
            <div className="flex items-center gap-4 text-sm opacity-90">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>مكة المكرمة & المدينة المنورة</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>4.9 (120 تقييم)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('umrahOffers.description')}</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                {offer.description}
              </p>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'فنادق 5 نجوم', icon: Star },
                { label: 'طيران مباشر', icon: Plane },
                { label: 'نقل حديث', icon: Clock },
                { label: 'إرشاد ديني', icon: Calendar },
              ].map((item, index) => (
                <div key={index} className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center gap-2 text-center">
                  <item.icon className="w-6 h-6 text-primary" />
                  <span className="text-xs font-bold text-gray-700">{item.label}</span>
                </div>
              ))}
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('umrahOffers.itinerary')}</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                        {i}
                      </div>
                      {i < 3 && <div className="w-0.5 flex-1 bg-primary/20 my-1"></div>}
                    </div>
                    <div className="pb-8">
                      <h3 className="font-bold text-gray-900">اليوم {i === 1 ? 'الأول' : i === 2 ? 'الثاني' : 'الثالث'}</h3>
                      <p className="text-sm text-gray-500 mt-1">الوصول إلى مطار الملك عبد العزيز بجدة ثم التوجه إلى مكة المكرمة.</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-gray-50 p-8 rounded-3xl border border-gray-100 space-y-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">السعر للشخص يبدأ من</p>
                <p className="text-4xl font-bold text-primary">
                  {offer.price} <span className="text-lg font-normal text-gray-500">{offer.currency}</span>
                </p>
              </div>

              <div className="space-y-4">
                <button className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-primary-dark shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5" />
                  احجز الآن
                </button>
                <button className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-600 shadow-xl shadow-green-500/20 transition-all flex items-center justify-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  تواصل عبر واتساب
                </button>
              </div>

              <div className="pt-6 border-t border-gray-200 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>+966 50 123 4567</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Share2 className="w-4 h-4 text-primary" />
                  <span>مشاركة العرض</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PublicOffer;
