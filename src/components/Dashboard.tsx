import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Users, Plane, Calendar, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  const stats = [
    { title: t('dashboard.totalBookings'), value: '1,234', icon: Calendar, color: 'bg-blue-500' },
    { title: t('dashboard.activeTrips'), value: '12', icon: Plane, color: 'bg-green-500' },
    { title: t('dashboard.totalPilgrims'), value: '5,678', icon: Users, color: 'bg-purple-500' },
    { title: t('dashboard.revenue'), value: 'SAR 450,000', icon: CreditCard, color: 'bg-amber-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.dashboard')}</h1>
        <div className="text-sm text-gray-500">{new Date().toLocaleDateString('ar-SA')}</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={`${stat.color} p-3 rounded-lg text-white`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.title}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="text-primary w-5 h-5" />
            {t('dashboard.recentActivity')}
          </h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <p className="text-sm text-gray-700">تم إضافة حجز جديد برقم #B123{i}</p>
                </div>
                <span className="text-xs text-gray-400">منذ {i} ساعة</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="text-amber-500 w-5 h-5" />
            {t('dashboard.pendingTasks')}
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-sm text-amber-800 font-medium">تأشيرات معلقة لرحلة عمرة رمضان</p>
                <p className="text-xs text-amber-600 mt-1">يوجد 5 معتمرين بانتظار صدور التأشيرة</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
