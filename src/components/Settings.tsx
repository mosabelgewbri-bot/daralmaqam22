import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { motion } from 'motion/react';
import { Upload, Trash2, Save, CheckCircle, AlertCircle, Image as ImageIcon, Lock, Database as DbIcon, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import Logo from './Logo';
import { clsx } from 'clsx';

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
    theme: 'gold'
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
          theme: settings.pref_theme || 'gold'
        });
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
        alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 5 ميجابايت.');
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
        pref_theme: preferences.theme
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      // Force a reload of logo components
      window.dispatchEvent(new Event('settings_updated'));
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('حدث خطأ أثناء الحفظ.');
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
    setShowRestoreConfirm(true);
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
      const { extractPassportData } = await import('../services/geminiService');
      // Test with a tiny transparent pixel or a simple prompt
      // Actually, let's just test the connection
      const { GoogleGenAI } = await import('@google/genai');
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        setDiagResult({ status: 'error', message: 'GEMINI_API_KEY غير مكوّن في البيئة.' });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Say 'Connection Successful'",
      });

      setDiagResult({ 
        status: 'success', 
        message: 'تم الاتصال بخوادم Google بنجاح.',
        response: response.text,
        keyPrefix: apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4)
      });
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
            <div className="glass-card p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <DbIcon className="text-gold w-6 h-6" />
                  <h3 className="text-xl font-bold">إدارة قاعدة البيانات</h3>
                </div>
                <button 
                  onClick={loadDbStats}
                  disabled={dbLoading}
                  className="p-2 hover:bg-white/10 rounded-full text-gold transition-all"
                >
                  <RefreshCw className={clsx("w-5 h-5", dbLoading && "animate-spin")} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">الرحلات</p>
                  <p className="text-2xl font-bold text-white">{dbStats?.trips || 0}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">الحجوزات</p>
                  <p className="text-2xl font-bold text-white">{dbStats?.bookings || 0}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">المعتمرين</p>
                  <p className="text-2xl font-bold text-white">{dbStats?.pilgrims || 0}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">السجلات</p>
                  <p className="text-2xl font-bold text-white">{dbStats?.logs || 0}</p>
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/40">حجم ملف قاعدة البيانات:</span>
                  <span className="text-white font-mono">
                    {dbStats?.dbSize ? (dbStats.dbSize / 1024).toFixed(2) + ' KB' : '---'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/40">آخر تحديث للبيانات:</span>
                  <span className="text-white">
                    {dbStats?.lastBackup ? new Date(dbStats.lastBackup).toLocaleString('ar-LY') : '---'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/40">حالة الاتصال:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{dbStats?.dbType || 'نشط (Supabase)'}</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </div>
                </div>
                {dbStats?.dbType === 'SQLite (Local)' && (
                  <>
                    <div className="pt-4">
                      <a 
                        href="/api/db-download" 
                        download 
                        className="btn-gold w-full py-3 flex items-center justify-center gap-2 text-sm"
                      >
                        <Save className="w-4 h-4" />
                        تحميل نسخة احتياطية من قاعدة البيانات
                      </a>
                    </div>
                    <div className="pt-2 space-y-3">
                      {showRestoreConfirm ? (
                        <div className="bg-gold/10 border border-gold/30 p-4 rounded-xl space-y-4">
                          <p className="text-sm text-white/90 text-center">
                            هل أنت متأكد من استعادة قاعدة البيانات؟ سيتم استبدال جميع البيانات الحالية.
                          </p>
                          <div className="flex gap-2">
                            <button 
                              onClick={confirmRestore}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold transition-all"
                            >
                              تأكيد الاستعادة
                            </button>
                            <button 
                              onClick={cancelRestore}
                              className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-sm transition-all"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <label 
                            htmlFor="db-restore-input"
                            className={clsx(
                              "bg-white/5 text-white border border-white/10 hover:bg-white/10 w-full py-3 flex items-center justify-center gap-2 text-sm rounded-xl cursor-pointer transition-all",
                              restoring && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Upload className="w-4 h-4" />
                            {restoring ? 'جاري الاستعادة...' : 'استعادة نسخة احتياطية (رفع ملف .sqlite أو .db)'}
                          </label>
                          <input 
                            id="db-restore-input"
                            type="file" 
                            className="hidden" 
                            accept=".sqlite,.db,.sqlite3" 
                            onChange={handleFileSelect}
                            disabled={restoring}
                          />
                        </>
                      )}

                      {restoreStatus.type === 'error' && (
                        <div className="flex items-center gap-2 text-red-500 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                          <AlertCircle className="w-4 h-4" />
                          {restoreStatus.message}
                        </div>
                      )}

                      {restoreStatus.type === 'success' && (
                        <div className="flex items-center gap-2 text-emerald-500 text-xs bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                          <CheckCircle className="w-4 h-4" />
                          {restoreStatus.message}
                        </div>
                      )}
                    </div>
                  </>
                )}
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
    </motion.div>
  );
}
