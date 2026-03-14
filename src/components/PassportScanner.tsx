import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Scan, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractPassportData } from '../services/geminiService';

interface PassportScannerProps {
  onScan: (data: any, image: string) => void;
  onClose: () => void;
}

export default function PassportScanner({ onScan, onClose }: PassportScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setLoading(true);
      setError(null);
      try {
        // Check if API key is selected if environment key is missing
        const envKey = process.env.GEMINI_API_KEY;
        if (!envKey || envKey === 'undefined' || envKey === '') {
          if (window && (window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            if (!hasKey) {
              setError('يرجى اختيار مفتاح API الخاص بك لتفعيل ميزة المسح الذكي.');
              await (window as any).aistudio.openSelectKey();
              setCapturedImage(null);
              setLoading(false);
              return;
            }
          } else {
            setError('مفتاح API الخاص بـ Gemini غير متوفر. يرجى ضبط GEMINI_API_KEY في إعدادات البيئة.');
            setCapturedImage(null);
            setLoading(false);
            return;
          }
        }

        const data = await extractPassportData(imageSrc);
        if (data) {
          onScan(data, imageSrc);
          onClose();
        } else {
          setError('لم نتمكن من استخراج البيانات. يرجى المحاولة مرة أخرى أو التأكد من وضوح الصورة.');
          setCapturedImage(null);
        }
      } catch (err) {
        console.error('Scan error:', err);
        setError('حدث خطأ أثناء معالجة الصورة. يرجى المحاولة مرة أخرى.');
        setCapturedImage(null);
      } finally {
        setLoading(false);
      }
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
                    console.error("Camera error:", err);
                    setError("فشل الوصول إلى الكاميرا. يرجى التأكد من منح الإذن.");
                  },
                  videoConstraints: {
                    facingMode: "environment",
                    width: 1280,
                    height: 720
                  },
                  className: "w-full h-full object-cover"
                } as any)}
              />
              {/* Scanner Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-12 border-2 border-gold/50 rounded-2xl shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-gold rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-gold rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-gold rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-gold rounded-br-lg" />
                  
                  {/* Scanning Line Animation */}
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-gold shadow-[0_0_15px_rgba(212,175,55,0.8)] z-10"
                  />
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

          <div className="flex justify-center gap-4">
            {!capturedImage ? (
              <button 
                onClick={capture}
                disabled={loading}
                className="btn-gold px-12 py-4 rounded-2xl flex items-center gap-3 text-lg shadow-xl shadow-gold/20 active:scale-95 transition-all"
              >
                <Camera className="w-6 h-6" />
                التقاط صورة للمسح
              </button>
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
