import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Scan, Loader2, RefreshCw, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractPassportData } from '../services/geminiService';
import { resizeImage } from '../utils/imageUtils';

interface PassportScannerProps {
  onScan: (data: any, image: string) => void;
  onClose: () => void;
}

export default function PassportScanner({ onScan, onClose }: PassportScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

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
        if (msg.includes("API key") || msg.includes("مفتاح API") || msg.includes("غير مكوّن")) {
          setError(
            <div className="space-y-3">
              <p className="font-bold text-red-400">مشكلة في مفتاح API</p>
              <p className="text-xs text-white/70">يبدو أن مفتاح Gemini API غير مكوّن بشكل صحيح أو غير صالح.</p>
              <div className="pt-2 border-t border-white/10">
                <a 
                  href="/api/ocr/debug" 
                  target="_blank" 
                  className="block w-full py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg text-gold text-center text-xs font-bold transition-all"
                >
                  فحص حالة المفتاح (Debug)
                </a>
              </div>
            </div>
          );
        } else if (msg.includes("Quota exceeded") || msg.includes("تجاوز حصة")) {
          setError("تم تجاوز حصة الاستخدام المجانية لمفتاح API. يرجى المحاولة لاحقاً.");
        } else if (msg.includes("safety") || msg.includes("أمان")) {
          setError("تم حجب الصورة بواسطة فلاتر الأمان. يرجى التأكد من وضوح الصورة.");
        } else {
          setError(`حدث خطأ: ${msg || 'خطأ غير معروف'}`);
        }
        setCapturedImage(null);
      } finally {
        setLoading(false);
      }
    } else {
      console.warn("PassportScanner: Failed to get screenshot from webcam");
      setError("فشل التقاط الصورة من الكاميرا. يرجى التأكد من أن الكاميرا تعمل.");
    }
  }, [webcamRef, onScan, onClose]);

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
                {...({
                  audio: false,
                  ref: webcamRef,
                  screenshotFormat: "image/jpeg",
                  onUserMediaError: (err: any) => {
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
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-[10px] text-gold/60 mb-2">يمكنك استخدام خيار "رفع صورة الجواز" أدناه كبديل سريع.</p>
                        </div>
                      </div>
                    );
                  },
                  videoConstraints: {
                    facingMode: "environment",
                    width: 1920,
                    height: 1080
                  },
                  className: "w-full h-full object-cover"
                } as any)}
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
                    <p className="text-gold/60 text-[10px] uppercase tracking-[0.2em] font-bold">Passport Area</p>
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

        <div className="p-8 space-y-4 bg-white/5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          <div className="flex flex-col items-center gap-4">
            {!capturedImage ? (
              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  onClick={capture}
                  disabled={loading}
                  className="btn-gold px-12 py-4 rounded-2xl flex items-center gap-3 text-lg shadow-xl shadow-gold/20 active:scale-95 transition-all"
                >
                  <Camera className="w-6 h-6" />
                  التقاط صورة للمسح
                </button>
                
                <label className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl flex items-center gap-3 transition-all cursor-pointer active:scale-95">
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
                            if (msg.includes("API key") || msg.includes("مفتاح API") || msg.includes("غير مكوّن")) {
                              setError('مفتاح API غير مكوّن بشكل صحيح أو غير صالح. يرجى التأكد من إعداد GEMINI_API_KEY.');
                            } else if (msg.includes("Quota exceeded") || msg.includes("تجاوز حصة")) {
                              setError("تم تجاوز حصة الاستخدام المجانية لمفتاح API. يرجى المحاولة لاحقاً.");
                            } else if (msg.includes("safety") || msg.includes("أمان")) {
                              setError("تم حجب الصورة بواسطة فلاتر الأمان. يرجى التأكد من وضوح الصورة.");
                            } else {
                              setError(`خطأ: ${msg}`);
                            }
                            setCapturedImage(null);
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
                onClick={() => setCapturedImage(null)}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl flex items-center gap-3 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                إعادة المحاولة
              </button>
            )}
          </div>
          
          <p className="text-center text-white/40 text-xs">
            ضع الجواز داخل الإطار وتأكد من وضوح النص والإضاءة الجيدة
          </p>
        </div>
      </div>
    </motion.div>
  );
}
