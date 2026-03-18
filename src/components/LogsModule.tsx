import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  History, 
  Search, 
  Filter,
  User,
  Activity,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface LogsModuleProps {
  onBack: () => void;
}

export default function LogsModule({ onBack }: LogsModuleProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const data = await api.getLogs();
    setLogs(data);
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action.includes(filterAction);
    
    return matchesSearch && matchesAction;
  });

  const actions = Array.from(new Set(logs.map(l => l.action.split(' ')[0])));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <History className="w-6 h-6 text-emerald-400" />
              سجل العمليات (Audit Logs)
            </h2>
            <p className="text-emerald-400/60 text-sm">تتبع جميع تحركات المستخدمين في النظام</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث في السجلات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pr-10 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>

        <div className="relative">
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pr-10 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none"
          >
            <option value="all">جميع العمليات</option>
            {actions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 text-white/60 text-sm">
          <Activity className="w-4 h-4" />
          إجمالي العمليات: {filteredLogs.length}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-emerald-400 font-semibold">المستخدم</th>
                <th className="px-6 py-4 text-emerald-400 font-semibold">العملية</th>
                <th className="px-6 py-4 text-emerald-400 font-semibold">التفاصيل</th>
                <th className="px-6 py-4 text-emerald-400 font-semibold">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/60">
                    جاري تحميل السجلات...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/60">
                    لا توجد سجلات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-white">
                        <User className="w-4 h-4 text-emerald-400/60" />
                        {log.userName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        log.action.includes('حذف') ? 'bg-red-500/20 text-red-400' :
                        log.action.includes('إضافة') ? 'bg-emerald-500/20 text-emerald-400' :
                        log.action.includes('تحديث') ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/10 text-white/60'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/80 text-sm max-w-xs truncate">
                      {log.details || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-white/60 text-xs">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(log.timestamp), 'yyyy/MM/dd HH:mm', { locale: ar })}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
