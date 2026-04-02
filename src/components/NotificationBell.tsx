import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, AlertCircle, Info, X, Trash2, Settings } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-primary/10 hover:text-primary transition-all relative group"
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            ></div>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute left-0 mt-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  {t('notifications.title')}
                </h3>
                <div className="flex gap-2">
                  <button className="p-1.5 text-gray-400 hover:text-primary transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto p-2 space-y-2">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer group relative ${
                        n.read ? 'bg-white border-gray-50 opacity-60' : 'bg-primary/5 border-primary/10 hover:bg-primary/10'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-lg h-fit ${
                          n.type === 'success' ? 'bg-green-100 text-green-600' :
                          n.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                          n.type === 'error' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {n.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
                           n.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                           n.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
                           <Info className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 mb-1">{n.title}</p>
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(n.createdAt).toLocaleString('ar-SA')}
                          </p>
                        </div>
                      </div>
                      {!n.read && (
                        <div className="absolute top-4 left-4 w-2 h-2 bg-primary rounded-full shadow-sm shadow-primary/50"></div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center space-y-4">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-gray-300">
                      <Bell className="w-8 h-8" />
                    </div>
                    <p className="text-sm text-gray-500">{t('notifications.noNotifications')}</p>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-50 bg-gray-50/50 text-center">
                  <button className="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1 mx-auto">
                    {t('notifications.viewAll')}
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const Clock: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export default NotificationBell;
