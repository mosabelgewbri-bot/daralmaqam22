import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Globe, Bell, Shield, Database, Layout, Save, Moon, Sun } from 'lucide-react';

const Settings: React.FC = () => {
  const { t } = useTranslation();

  const sections = [
    { title: t('settings.general'), icon: Layout, description: t('settings.generalDesc') },
    { title: t('settings.notifications'), icon: Bell, description: t('settings.notificationsDesc') },
    { title: t('settings.security'), icon: Shield, description: t('settings.securityDesc') },
    { title: t('settings.backup'), icon: Database, description: t('settings.backupDesc') },
    { title: t('settings.language'), icon: Globe, description: t('settings.languageDesc') },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="text-primary w-6 h-6" />
          {t('nav.settings')}
        </h1>
        <button className="bg-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
          <Save className="w-4 h-4" />
          {t('common.saveChanges')}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {sections.map((section, index) => (
            <button
              key={index}
              className={`w-full p-4 rounded-xl border text-right flex items-center gap-4 transition-all ${
                index === 0 ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-lg ${index === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                <section.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{section.title}</p>
                <p className="text-xs opacity-70">{section.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-6 border-b pb-4">{t('settings.general')}</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{t('settings.theme')}</p>
                    <p className="text-sm text-gray-500">{t('settings.themeDesc')}</p>
                  </div>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button className="p-2 rounded-md bg-white shadow-sm text-primary">
                      <Sun className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-md text-gray-500 hover:text-gray-700">
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{t('settings.companyName')}</p>
                    <p className="text-sm text-gray-500">{t('settings.companyNameDesc')}</p>
                  </div>
                  <input
                    type="text"
                    defaultValue="دار المقام"
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all w-64"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{t('settings.currency')}</p>
                    <p className="text-sm text-gray-500">{t('settings.currencyDesc')}</p>
                  </div>
                  <select className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all w-64">
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="EGP">جنيه مصري (EGP)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-6 border-b pb-4">{t('settings.notifications')}</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">تنبيهات {i === 1 ? 'الحجوزات الجديدة' : i === 2 ? 'تحديثات الرحلات' : 'التقارير المالية'}</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={i < 3} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
