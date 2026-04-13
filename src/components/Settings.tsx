import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { motion } from 'motion/react';
import { Upload, Trash2, Save, CheckCircle, AlertCircle, Image as ImageIcon, Lock, Database as DbIcon, RefreshCw, Settings as SettingsIcon, Info, CheckCircle as CheckCircleIcon, XCircle, X } from 'lucide-react';
import Logo from './Logo';
import { clsx } from 'clsx';
import { AnimatePresence } from 'framer-motion';

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info' | 'warning', onClose: () => void }) => {
  const icons = {
    success: <CheckCircleIcon className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />
  };

  const colors = {
    success: 'border-emerald-500/50 bg-emerald-500/10',
    error: 'border-red-500/50 bg-red-500/10',
    warning: 'border-amber-500/50 bg-amber-500/10',
    info: 'border-blue-500/50 bg-blue-500/10'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={clsx(
        "fixed bottom-8 left-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl min-w-[320px]",
        colors[type]
      )}
    >
      {icons[type]}
      <p className="text-white font-medium flex-1">{message}</p>
      <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// Confirmation Modal Component
const ConfirmModal = ({ 
  show, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  type = 'danger' 
}: { 
  show: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  type?: 'danger' | 'warning' | 'info'
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-matte-black border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <div className={clsx(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
          type === 'danger' ? "bg-red-500/20 text-red-500" : 
          type === 'warning' ? "bg-amber-500/20 text-amber-500" : "bg-blue-500/20 text-blue-500"
        )}>
          {type === 'danger' ? <Trash2 className="w-8 h-8" /> : 
           type === 'warning' ? <AlertCircle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/60 mb-8 leading-relaxed text-right">{message}</p>
        
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={clsx(
              "flex-1 px-6 py-3 rounded-xl text-white font-bold transition-all shadow-lg",
              type === 'danger' ? "bg-red-600 hover:bg-red-500 shadow-red-500/20" : 
              type === 'warning' ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
            )}
          >
            تأكيد
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function Settings({ user }: { user: User }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    website: ''
  });
  const [preferences, setPreferences] = useState({
    currency: 'LYD',
    dateFormat: 'DD/MM/YYYY',
    language: 'ar',
    theme: 'gold',
    backupFrequency: 'daily'
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info' }>({ 
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadDbStats = async () => {
    setDbLoading(true);
    try {
      const stats = await api.getDbStats();
      setDbStats(stats);
    } catch (error) {
      console.error('Error loading DB stats:', error);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await api.getSettings();
        if (settings.app_logo) {
          setLogo(settings.app_logo);
        }
        setCompanyInfo({
          name: settings.company_name || '',
          phone: settings.company_phone || '',
          address: settings.company_address || '',
          email: settings.company_email || '',
          website: settings.company_website || ''
        });
        setPreferences({
          currency: settings.pref_currency || 'LYD',
          dateFormat: settings.pref_date_format || 'DD/MM/YYYY',
          language: settings.pref_language || 'ar',
          theme: settings.pref_theme || 'gold',
          backupFrequency: settings.backup_frequency || 'daily'
        } as any);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
    loadDbStats();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);

    if (passwords.new !== passwords.confirm) {
      setPassError('كلمات المرور الجديدة غير متطابقة');
      return;
    }

    if (passwords.new.length < 6) {
      setPassError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setPassLoading(true);
    try {
      await api.changePassword(user.id, passwords.current, passwords.new);
      setPassSuccess(true);
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (err: any) {
      setPassError(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setPassLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 5 ميجابايت.', 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogo(base64);
        setSuccess(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveSettings({ 
        app_logo: logo || '',
        company_name: companyInfo.name,
        company_phone: companyInfo.phone,
        company_address: companyInfo.address,
        company_email: companyInfo.email,
        company_website: companyInfo.website,
        pref_currency: preferences.currency,
        pref_date_format: preferences.dateFormat,
        pref_language: preferences.language,
        pref_theme: preferences.theme,
        backup_frequency: (preferences as any).backupFrequency || 'daily'
      });

      // Audit Log
      await api.logAction(
        user.id,
        user.name,
        'تحديث الإعدادات',
        'تم تحديث إعدادات النظام ومعلومات الشركة'
      );

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      // Force a reload of logo components
      window.dispatchEvent(new Event('settings_updated'));
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('حدث خطأ أثناء الحفظ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setSuccess(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setConfirmModal({
      show: true,
      title: 'استعادة قاعدة البيانات',
      message: 'هل أنت متأكد من استعادة قاعدة البيانات من هذا الملف؟ سيتم استبدال جميع البيانات الحالية ولا يمكن التراجع عن هذا الإجراء.',
      type: 'warning',
      onConfirm: confirmRestore
    });
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const confirmRestore = async () => {
    if (!pendingFile) return;
    
    setShowRestoreConfirm(false);
    setRestoring(true);
    setRestoreStatus({ type: null, message: '' });

    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      
      const response = await fetch('/api/db-upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل استعادة قاعدة البيانات');
      }

      setRestoreStatus({ type: 'success', message: 'تم استعادة قاعدة البيانات بنجاح. سيتم إعادة تحميل الصفحة...' });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Error restoring DB:', error);
      setRestoreStatus({ type: 'error', message: error.message || 'حدث خطأ أثناء استعادة قاعدة البيانات' });
    } finally {
      setRestoring(false);
      setPendingFile(null);
    }
  };

  const cancelRestore = () => {
    setShowRestoreConfirm(false);
    setPendingFile(null);
  };

  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  const runDiagnostic = async () => {
    setDiagLoading(true);
    setDiagResult(null);
    try {
      const response = await fetch('/api/diag/gemini');
      const data = await response.json();
      
      if (!response.ok) {
        setDiagResult({ 
          status: 'error', 
          message: data.message || 'فشل الاتصال بخوادم Google.' 
        });
        return;
      }

      setDiagResult(data);
    } catch (error: any) {
      console.error('Diagnostic error:', error);
      setDiagResult({ status: 'error', message: error.message || 'فشل الاتصال بخوادم Google.' });
    } finally {
      setDiagLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen bg-matte-black p-8 space-y-8"
    >
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <Logo iconSize={40} textSize="text-4xl" className="hidden md:flex" />
          <div className="h-12 w-px bg-white/10 hidden md:block" />
          <div>
            <h2 className="text-4xl font-bold gold-text-gradient mb-2">إعدادات النظام</h2>
            <p className="text-white/60">تخصيص مظهر النظام وإدارة البيانات الأساسية</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {(user.role === 'admin' || user.role === 'manager') && (
            <>
              <div className="glass-card p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <ImageIcon className="text-gold w-6 h-6" />
                  <h3 className="text-xl font-bold">ملف الشركة</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest">اسم الشركة</label>
                    <input 
                      type="text"
                      className="input-field w-full"
                      value={companyInfo.name}
                      onChange={e => setCompanyInfo({...companyInfo, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest">رقم الهاتف</label>
                    <input 
                      type="text"
                      className="input-field w-full"
                      value={companyInfo.phone}
                      onChange={e => setCompanyInfo({...companyInfo, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest">البريد الإلكتروني</label>
                    <input 
                      type="email"
                      className="input-field w-full"
                      value={companyInfo.email}
                      onChange={e => setCompanyInfo({...companyInfo, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest">الموقع الإلكتروني</label>
                    <input 
                      type="text"
                      className="input-field w-full"
                      value={companyInfo.website}
                      onChange={e => setCompanyInfo({...companyInfo, website: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest">العنوان</label>
                    <textarea 
                      className="input-field w-full h-24 resize-none"
                      value={companyInfo.address}
                      onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <SettingsIcon className="text-gold w-6 h-6" />
                  <h3 className="text-xl font-bold">تفضيلات النظام</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest">العملة الافتراضية</label>
                    <select 
                      className="input-field w-full"
                      value={preferences.currency}
                      onChange={e => setPreferences({...preferences, currency: e.target.value})}
                    >
                      <option value="LYD">دينار ليبي (LYD)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest">تنسيق التاريخ</label>
                    <select 
                      className="input-field w-full"
                      value={preferences.dateFormat}
                      onChange={e => setPreferences({...preferences, dateFormat: e.target.value})}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest">لغة النظام</label>
                    <select 
                      className="input-field w-full"
                      value={preferences.language}
                      onChange={e => setPreferences({...preferences, language: e.target.value})}
                    >
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest">سمة النظام (Theme)</label>
                    <select 
                      className="input-field w-full"
                      value={preferences.theme}
                      onChange={e => setPreferences({...preferences, theme: e.target.value})}
                    >
                      <option value="gold">الذهبي الملكي (Default)</option>
                      <option value="emerald">الأخضر الزمردي</option>
                      <option value="blue">الأزرق السماوي</option>
                      <option value="purple">الأرجواني الفاخر</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <ImageIcon className="text-gold w-6 h-6" />
                  <h3 className="text-xl font-bold">تخصيص الشعار (Logo)</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  <div className="space-y-4 text-center md:text-right flex-1">
                    <p className="text-white/80 leading-relaxed">
                      يمكنك هنا تحميل شعار شركتك الخاص ليظهر في جميع أنحاء النظام، بما في ذلك القائمة الجانبية، شاشة الدخول، والتقارير المطبوعة.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <label className="btn-gold cursor-pointer flex items-center gap-2 py-2 px-6">
                        <Upload className="w-4 h-4" />
                        تحميل شعار جديد
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {logo && (
                        <button 
                          onClick={handleRemoveLogo}
                          className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 px-6 py-2 rounded-xl transition-all flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف الشعار
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40">
                      * يفضل استخدام صور بصيغة PNG بخلفية شفافة. الحد الأقصى للحجم 2 ميجابايت.
                    </p>
                  </div>

                  <div className="w-48 h-48 glass-card flex flex-col items-center justify-center p-4 border-dashed border-2 border-white/10 relative group">
                    {logo ? (
                      <img 
                        src={logo} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-white/20">
                        <ImageIcon className="w-12 h-12" />
                        <span className="text-xs">لا يوجد شعار مخصص</span>
                      </div>
                    )}
                    <div className="absolute -top-3 -right-3 bg-gold text-matte-black text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                      معاينة
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={clsx(
                      "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all",
                      success ? "bg-emerald-500 text-white" : "btn-gold"
                    )}
                  >
                    {saving ? (
                      "جاري الحفظ..."
                    ) : success ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        تم الحفظ بنجاح
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        حفظ التغييرات
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="glass-card p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Lock className="text-gold w-6 h-6" />
              <h3 className="text-xl font-bold">تغيير كلمة المرور</h3>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <label className="text-xs text-white/40 uppercase tracking-widest">كلمة المرور الحالية</label>
                <input 
                  required
                  type="password"
                  className="input-field w-full"
                  value={passwords.current}
                  onChange={e => setPasswords({...passwords, current: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-widest">كلمة المرور الجديدة</label>
                  <input 
                    required
                    type="password"
                    className="input-field w-full"
                    value={passwords.new}
                    onChange={e => setPasswords({...passwords, new: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-widest">تأكيد كلمة المرور</label>
                  <input 
                    required
                    type="password"
                    className="input-field w-full"
                    value={passwords.confirm}
                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                  />
                </div>
              </div>

              {passError && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-4 h-4" />
                  {passError}
                </div>
              )}

              {passSuccess && (
                <div className="flex items-center gap-2 text-emerald-500 text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                  <CheckCircle className="w-4 h-4" />
                  تم تغيير كلمة المرور بنجاح
                </div>
              )}

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={passLoading}
                  className="btn-gold w-full py-3 flex items-center justify-center gap-2"
                >
                  {passLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                </button>
              </div>
            </form>
          </div>

          {(user.role === 'admin' || user.role === 'manager') && (
            <div className="glass-card p-8 space-y-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <DbIcon className="text-gold w-6 h-6" />
                  <h3 className="text-xl font-bold">حالة قاعدة البيانات والنظام</h3>
                </div>
                <button 
                  onClick={loadDbStats}
                  disabled={dbLoading}
                  className="p-2 hover:bg-white/10 rounded-full text-gold transition-all"
                >
                  <RefreshCw className={clsx("w-5 h-5", dbLoading && "animate-spin")} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-2">
                  <p className="text-xs text-white/40 uppercase tracking-widest">حالة الاتصال</p>
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "w-3 h-3 rounded-full",
                      dbLoading ? "bg-gold animate-pulse" : (dbStats?.health === 'Excellent' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]")
                    )} />
                    <span className="text-xl font-bold text-white">
                      {dbLoading ? 'جاري الاتصال...' : (dbStats?.health === 'Excellent' ? 'متصل (ممتازة)' : 'خطأ في الاتصال')}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/30">وقت التشغيل: {dbStats?.uptime || '---'}</p>
                </div>

                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-2">
                  <p className="text-xs text-white/40 uppercase tracking-widest">المساحة المستخدمة</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-gold">
                      {dbStats?.dbSize ? (dbStats.dbSize / 1024).toFixed(2) : '0'}
                    </span>
                    <span className="text-xs text-white/40 mb-1">KB</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gold transition-all duration-1000" 
                      style={{ width: `${Math.min((dbStats?.dbSize || 0) / (1024 * 1024) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/30">من إجمالي 1GB (خطة Firebase المجانية)</p>
                </div>

                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-2">
                  <p className="text-xs text-white/40 uppercase tracking-widest">إجمالي السجلات</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-white">{dbStats?.totalDocs || 0}</span>
                    <span className="text-xs text-white/40 mb-1">وثيقة</span>
                  </div>
                  <p className="text-[10px] text-white/30">عبر جميع المجموعات</p>
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <RefreshCw className="text-gold w-5 h-5" />
                  <h4 className="font-bold">خطة النسخ الاحتياطي (Backup Plan)</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs text-white/40 uppercase tracking-widest">تكرار النسخ الاحتياطي التلقائي</label>
                      <select 
                        className="input-field w-full"
                        value={preferences.backupFrequency || 'daily'}
                        onChange={e => setPreferences({...preferences, backupFrequency: e.target.value} as any)}
                      >
                        <option value="daily">يومي (Daily)</option>
                        <option value="weekly">أسبوعي (Weekly)</option>
                        <option value="monthly">شهري (Monthly)</option>
                        <option value="manual">يدوي فقط (Manual Only)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gold/5 border border-gold/10 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-gold shrink-0" />
                      <p className="text-[10px] text-white/60 leading-relaxed">
                        يتم تخزين النسخ الاحتياطية التلقائية في سحابة Firebase بشكل آمن. يمكنك دائماً تصدير نسخة يدوية لجهازك الخاص.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs text-white/40 uppercase tracking-widest">إجراءات يدوية</label>
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => api.exportDatabase()}
                        className="btn-gold py-3 flex items-center justify-center gap-3 text-sm"
                      >
                        <Save className="w-4 h-4" />
                        تصدير قاعدة البيانات بالكامل (JSON)
                      </button>
                      <button 
                        onClick={async () => {
                          setDbLoading(true);
                          try {
                            await api.syncAllTripsSeats();
                            showToast('تمت مزامنة جميع المقاعد بنجاح', 'success');
                            await loadDbStats();
                          } catch (e) {
                            showToast('فشل مزامنة المقاعد', 'error');
                          } finally {
                            setDbLoading(false);
                          }
                        }}
                        disabled={dbLoading}
                        className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl flex items-center justify-center gap-3 text-sm transition-all shadow-lg shadow-blue-500/20"
                      >
                        <RefreshCw className={clsx("w-4 h-4", dbLoading && "animate-spin")} />
                        مزامنة وتصحيح عدد المقاعد المتاحة
                      </button>
                      <p className="text-[10px] text-white/30 text-center">
                        * سيتم إعادة حساب المقاعد المتاحة لكل رحلة بناءً على الحجوزات الفعلية.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card p-8 space-y-6 opacity-50 pointer-events-none">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <AlertCircle className="text-gold w-6 h-6" />
              <h3 className="text-xl font-bold">إعدادات متقدمة (قريباً)</h3>
            </div>
            <p className="text-sm text-white/60">
              سيتم إضافة المزيد من خيارات التخصيص هنا قريباً، مثل تغيير الألوان الأساسية للنظام، وإدارة النسخ الاحتياطي للبيانات.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-gold/5 border-gold/20">
            <h4 className="font-bold text-gold mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> نصيحة
            </h4>
            <p className="text-xs text-white/70 leading-relaxed">
              عند تحميل شعار جديد، سيظهر فوراً في جميع التقارير التي تقوم بتصديرها بصيغة PDF. تأكد من أن الشعار واضح وذو جودة عالية لضمان أفضل مظهر للتقارير.
            </p>
          </div>
          
          <div className="glass-card p-6">
            <h4 className="font-bold text-white mb-4">أدوات التشخيص</h4>
            <div className="space-y-4">
              <p className="text-[10px] text-white/60 leading-relaxed">
                إذا كنت تواجه مشاكل في مسح الجوازات، يمكنك استخدام أداة التشخيص للتحقق من صحة مفتاح الـ API والاتصال بخوادم جوجل.
              </p>
              <button 
                onClick={runDiagnostic}
                disabled={diagLoading}
                className="btn-gold w-full py-2 flex items-center justify-center gap-2 text-xs"
              >
                <RefreshCw className={clsx("w-3 h-3", diagLoading && "animate-spin")} />
                {diagLoading ? 'جاري الفحص...' : 'تشغيل فحص الـ API'}
              </button>

              {diagResult && (
                <div className={clsx(
                  "p-3 rounded-lg border text-[10px] space-y-2",
                  diagResult.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                )}>
                  <div className="flex items-center gap-2 font-bold">
                    {diagResult.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {diagResult.message}
                  </div>
                  {diagResult.keyPrefix && (
                    <div className="opacity-60">المفتاح: {diagResult.keyPrefix}</div>
                  )}
                  {diagResult.response && (
                    <div className="opacity-60 italic">الاستجابة: {diagResult.response}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <h4 className="font-bold text-white mb-4">معلومات النظام</h4>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">الإصدار</span>
                <span className="text-white/80">1.2.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">آخر تحديث</span>
                <span className="text-white/80">مارس 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">بيئة التشغيل</span>
                <span className="text-white/80">Production</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
      />
    </motion.div>
  );
}
