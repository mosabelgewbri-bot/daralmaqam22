import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Scan, Loader2, RefreshCw, Upload, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractPassportData } from '../services/geminiService';
import { resizeImage } from '../utils/imageUtils';
import { api } from '../services/api';

interface PassportScannerProps {
  onScan: (data: any, image: string) => void;
  onClose: () => void;
}

export default function PassportScanner({ onScan, onClose }: PassportScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const [customKey, setCustomKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  const capture = useCallback(async () => {
    console.log("PassportScanner: Capture triggered");
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      console.log("PassportScanner: Image captured successfully");
      setCapturedImage(imageSrc);
      setLoading(true);
      setError(null);
      try {
        console.log("PassportScanner: Resizing image...");
        const resizedImage = await resizeImage(imageSrc);
        
        console.log("PassportScanner: Calling extractPassportData...");
        const data = await extractPassportData(resizedImage);
        console.log("PassportScanner: OCR result:", data ? "Success" : "Failed");
        
        if (data) {
          onScan(data, resizedImage);
          onClose();
        } else {
          setError('لم نتمكن من استخراج البيانات. يرجى المحاولة مرة أخرى أو التأكد من وضوح الصورة والإضاءة.');
          setCapturedImage(null);
        }
      } catch (err: any) {
        console.error('PassportScanner: Scan error:', err);
        const msg = err.message || '';
        const lowerMsg = msg.toLowerCase();
        if (msg.includes("API key") || msg.includes("مفتاح API") || msg.includes("غير مكوّن") || msg.includes("invalid key") || msg.includes("INVALID_ARGUMENT")) {
          setShowKeyInput(true);
          setError(
            <div className="space-y-3">
              <p className="font-bold text-red-400">مشكلة في مفتاح API</p>
              <p className="text-xs text-white/70">يبدو أن مفتاح Gemini API غير مكوّن بشكل صحيح أو غير متاح في المتصفح حالياً.</p>
              <div className="pt-2 border-t border-white/10 text-white/40">
                <p className="text-[10px]">يرجى التأكد من إضافة GEMINI_API_KEY في إعدادات النظام.</p>
                {msg && <p className="text-[9px] font-mono select-all pt-1 bg-black/20 p-1.5 rounded text-red-400/80 break-all">{msg.substring(0, 100)}</p>}
              </div>
            </div>
          );
        } else if (lowerMsg.includes("quota") || lowerMsg.includes("limit") || lowerMsg.includes("429") || lowerMsg.includes("exhausted") || msg.includes("تجاوز حصة")) {
          setShowKeyInput(true);
          setError(`تم تجاوز حصة الاستخدام المجانية أو حد الطلبات المسموح لمفتاح الـ API المشترك للنظام.`);
        } else if (msg.includes("safety") || msg.includes("أمان")) {
          setError(`تم حجب الصورة بواسطة فلاتر الأمان. يرجى التأكد من وضوح الصورة وتجربة لقطة أخرى.`);
        } else {
          setError(`حدث خطأ: ${msg.substring(0, 150) || 'خطأ غير معروف'}`);
        }
        // Don't set captured image to null immediately so they can retry with a new key they enter
      } finally {
        setLoading(false);
      }
    } else {
      console.warn("PassportScanner: Failed to get screenshot from webcam");
      setError("فشل التقاط الصورة من الكاميرا. يرجى التأكد من أن الكاميرا تعمل.");
    }
  }, [webcamRef, onScan, onClose]);

  const handleSaveAndRetry = async () => {
    if (!customKey.trim()) return;
    setSavingKey(true);
    setError(null);
    try {
      // 1. Save to database via API
      await api.saveSettings({
        gemini_api_key: customKey.trim()
      });
      
      // 2. Update local storage cache immediately so local functions read the new key
      const cached = localStorage.getItem('cached_settings');
      let currentCached: Record<string, string> = {};
      if (cached) {
        try {
          currentCached = JSON.parse(cached);
        } catch (e) {}
      }
      currentCached.gemini_api_key = customKey.trim();
      localStorage.setItem('cached_settings', JSON.stringify(currentCached));
      localStorage.setItem('last_settings_fetch', Date.now().toString());

      // Try to dispatch settings_updated event
      window.dispatchEvent(new Event('settings_updated'));

      setError(null);
      setShowKeyInput(false);

      // 3. If there is already a captured/uploaded image, automatically re-run!
      if (capturedImage) {
        setLoading(true);
        try {
          console.log("PassportScanner (auto-retry): Resizing...");
          const resizedImage = await resizeImage(capturedImage);
          console.log("PassportScanner (auto-retry): Scanning again with new key...");
          const data = await extractPassportData(resizedImage);
          if (data) {
            onScan(data, resizedImage);
            onClose();
          } else {
            setError('مفتاح جديد مفعّل، لكن لم نتمكن من استخراج البيانات. يرجى التأكد من وضوح صورة الجواز.');
          }
        } catch (retryError: any) {
          setError(`فشل باستخدام المفتاح الجديد: ${retryError.message || 'خطأ غير معروف'}`);
        } finally {
          setLoading(false);
        }
      }
    } catch (saveError: any) {
      console.error('Failed to save key in scanner:', saveError);
      setError(`فشل حفظ المفتاح الجديد: ${saveError.message || 'خطأ غير معروف'}`);
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl bg-matte-black rounded-3xl border border-gold/30 overflow-hidden shadow-2xl shadow-gold/10">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gold/20 rounded-lg">
              <Scan className="w-5 h-5 text-gold" />
            </div>
            <h3 className="font-bold text-white">ماسح الجوازات الذكي</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
          {!capturedImage ? (
            <>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                onUserMediaError={(err: any) => {
                  console.error("PassportScanner: Camera error:", err);
                  const isPermissionError = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
                  setError(
                    <div className="space-y-3">
                      <p className="font-bold text-red-400">
                        {isPermissionError ? "تم رفض الوصول إلى الكاميرا" : "خطأ في تشغيل الكاميرا"}
                      </p>
                      <p className="text-xs text-white/70">
                        {isPermissionError 
                          ? "يرجى التأكد من السماح للموقع باستخدام الكاميرا من إعدادات المتصفح (أيقونة القفل في شريط العنوان)."
                          : "تأكد من أن الكاميرا غير مستخدمة من قبل تطبيق آخر."}
                      </p>
                      <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
                        <button 
                          onClick={() => window.location.reload()}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold"
                        >
                          إعادة تحميل الصفحة
                        </button>
                        <p className="text-[10px] text-gold/60 font-sans">يمكنك استخدام خيار "رفع صورة الجواز" كبديل سريع.</p>
                      </div>
                    </div>
                  );
                }}
                videoConstraints={{
                  facingMode: "environment",
                  width: { ideal: 1920 },
                  height: { ideal: 1080 }
                }}
                className="w-full h-full object-cover"
              />
              {/* Scanner Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-gold/50 rounded-2xl shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-gold rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-gold rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-gold rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-gold rounded-br-xl" />
                  
                  {/* Scanning Line Animation */}
                  <motion.div 
                    animate={{ top: ['5%', '95%', '5%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_20px_rgba(212,175,55,1)] z-10"
                  />
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-gold/60 text-[10px] uppercase tracking-[0.2em] font-bold font-sans">Passport Area</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
          )}

          {loading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 z-20">
              <Loader2 className="w-12 h-12 text-gold animate-spin" />
              <p className="text-gold font-bold animate-pulse">جاري تحليل بيانات الجواز...</p>
            </div>
          )}
        </div>

        <div className="p-8 space-y-4 bg-white/5 max-h-[250px] overflow-y-auto">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          {showKeyInput && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-gradient-to-br from-amber-500/15 to-transparent border border-amber-500/30 rounded-2xl space-y-3 text-right"
            >
              <div className="flex items-center gap-2 text-amber-400 font-bold justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-400 animate-bounce" />
                  حل سريع: استخدام مفتاح API مجاني وخاص بك 🚀
                </span>
                <span className="text-[9px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-500 font-bold">100% Free</span>
              </div>
              
              <p className="text-xs text-white/80 leading-relaxed font-sans">
                الحصة المشتركة للمفتاح العام انتهت. لتجاوز المشكلة فوراً وبشكل مجاني تماماً، يمكنك إنشاء مفتاح API مستقل وآمن خاص بك (غير مشترك ولن ينقطع):
              </p>

              <div className="text-xs text-white/60 space-y-2 bg-black/40 p-3 rounded-xl border border-white/5 font-sans">
                <p className="flex items-start gap-1">
                  <span className="text-gold font-bold">1.</span>
                  <span>اضغط لفتح: 
                    <a 
                      href="https://aistudio.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gold underline hover:text-amber-400 font-bold inline-block mx-1"
                    >
                       Google AI Studio ↗
                    </a>
                  </span>
                </p>
                <p className="flex items-start gap-1">
                  <span className="text-gold font-bold">2.</span>
                  <span>اضغط على <strong className="text-white font-bold">Get API Key</strong> ثم <strong className="text-white font-bold">Create API Key</strong>.</span>
                </p>
                <p className="flex items-start gap-1">
                  <span className="text-gold font-bold">3.</span>
                  <span>انسخ المفتاح (يبدأ بـ AIzaSy) والصقه هنا:</span>
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-gold uppercase tracking-widest block font-sans">مفتاح الـ API الخاص بك</label>
                <div className="flex gap-2">
                  <input 
                    type="password"
                    placeholder="AIzaSy..."
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-gold transition-all font-mono"
                  />
                  <button
                    onClick={handleSaveAndRetry}
                    disabled={savingKey || !customKey.trim()}
                    className="bg-gold hover:bg-gold/90 text-black font-bold px-4 rounded-xl text-xs flex items-center justify-center shrink-0 disabled:opacity-40 transition-all font-sans"
                  >
                    {savingKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "تفعيل ومتابعة"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col items-center gap-4">
            {!capturedImage ? (
              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  onClick={capture}
                  disabled={loading}
                  className="btn-gold px-12 py-4 rounded-2xl flex items-center gap-3 text-lg shadow-xl shadow-gold/20 active:scale-95 transition-all font-sans"
                >
                  <Camera className="w-6 h-6" />
                  التقاط صورة للمسح
                </button>
                
                <label className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl flex items-center gap-3 transition-all cursor-pointer active:scale-95 font-sans">
                  <Upload className="w-5 h-5 text-gold" />
                  <span>رفع صورة الجواز</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const base64 = event.target?.result as string;
                          setCapturedImage(base64);
                          setLoading(true);
                          setError(null);
                          try {
                            const resizedImage = await resizeImage(base64);
                            const data = await extractPassportData(resizedImage);
                            if (data) {
                              onScan(data, resizedImage);
                              onClose();
                            } else {
                              setError('لم نتمكن من استخراج البيانات. يرجى التأكد من وضوح الصورة.');
                              setCapturedImage(null);
                            }
                          } catch (err: any) {
                            console.error('PassportScanner: Upload scan error:', err);
                            const msg = err.message || '';
                            const lowerMsg = msg.toLowerCase();
                            if (msg.includes("API key") || msg.includes("مفتاح API") || msg.includes("غير مكوّن") || msg.includes("invalid key") || msg.includes("INVALID_ARGUMENT")) {
                              setShowKeyInput(true);
                              setError('مفتاح API غير مكوّن بشكل صحيح أو غير صالح.');
                            } else if (lowerMsg.includes("quota") || lowerMsg.includes("limit") || lowerMsg.includes("429") || lowerMsg.includes("exhausted") || msg.includes("تجاوز حصة")) {
                              setShowKeyInput(true);
                              setError(`تم تجاوز حصة الاستخدام المجانية أو حد الطلبات المسموح لمفتاح الـ API المشترك للنظام.`);
                            } else if (msg.includes("safety") || msg.includes("أمان")) {
                              setError(`تم حجب الصورة بواسطة فلاتر الأمان. يرجى التأكد من وضوح الصورة.`);
                            } else {
                              setError(`خطأ: ${msg.substring(0, 150)}`);
                            }
                          } finally {
                            setLoading(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setCapturedImage(null);
                  setError(null);
                  setShowKeyInput(false);
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl flex items-center gap-3 transition-all font-sans"
              >
                <RefreshCw className="w-5 h-5" />
                إعادة المحاولة
              </button>
            )}
          </div>
          
          <p className="text-center text-white/40 text-[11px] font-sans">
            ضع الجواز داخل الإطار وتأكد من وضوح النص والإضاءة الجيدة
          </p>
        </div>
      </div>
    </motion.div>
  );
}
