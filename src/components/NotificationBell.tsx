import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications, scanForTasks, loading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-emerald-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error': return <X className="w-4 h-4 text-rose-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20';
      case 'error': return 'bg-rose-500/10 border-rose-500/20';
      default: return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-matte-dark border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 transition-all group"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-matte-black animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 mt-3 w-80 bg-matte-dark border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-bottom border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">الإشعارات</h3>
                {loading && <Loader2 className="w-3 h-3 text-gold animate-spin" />}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => scanForTasks()}
                  className="text-[10px] text-gold hover:underline font-bold"
                >
                  تحديث
                </button>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] text-white/40 hover:text-white transition-colors"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-white/10 mx-auto mb-3" />
                  <p className="text-xs text-white/30">لا توجد إشعارات حالياً</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                      className={`p-4 transition-colors cursor-pointer hover:bg-white/[0.03] ${!notification.read ? 'bg-white/[0.01]' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 p-1.5 rounded-lg border ${getBgColor(notification.type)}`}>
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className={`text-xs font-bold truncate ${!notification.read ? 'text-white' : 'text-white/60'}`}>
                              {notification.title}
                            </p>
                            <span className="text-[10px] text-white/20 whitespace-nowrap">
                              {format(new Date(notification.createdAt), 'HH:mm', { locale: ar })}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-relaxed line-clamp-2 ${!notification.read ? 'text-white/70' : 'text-white/30'}`}>
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="mt-2 w-1.5 h-1.5 bg-gold rounded-full shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 bg-white/[0.01] border-top border-white/5 text-center">
                <button 
                  onClick={() => refreshNotifications()}
                  className="text-[10px] text-white/40 hover:text-white transition-colors"
                >
                  عرض جميع الإشعارات
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
