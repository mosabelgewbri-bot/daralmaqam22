import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Download, 
  Share2,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

export default function PublicImage() {
  const { id } = useParams<{ id: string }>();
  const [image, setImage] = useState<{ data: string, name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (id) {
      fetchImage(id);
    }
  }, [id]);

  const fetchImage = async (imageId: string) => {
    setIsLoading(true);
    try {
      const data = await api.getHostedImage(imageId);
      setImage(data);
    } catch (error) {
      console.error('Error fetching image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
        <p className="text-white/40 font-bold">جاري تحميل الصورة...</p>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-white/20" />
        </div>
        <h1 className="text-2xl font-bold text-white">الصورة غير موجودة</h1>
        <p className="text-white/40 max-w-xs">عذراً، يبدو أن الرابط الذي تتبعه غير صحيح أو أن الصورة قد تم حذفها.</p>
        <a href="/" className="mt-6 px-8 py-3 bg-gold text-black font-bold rounded-xl">العودة للرئيسية</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 p-6 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
              <ImageIcon className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{image.name}</h2>
              <p className="text-[10px] text-white/40 font-bold">شركة دار المقام</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const link = document.createElement('a');
                link.download = image.name;
                link.href = image.data;
                link.click();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg text-xs font-bold"
            >
              <Download className="w-4 h-4" />
              تحميل
            </button>
            <button 
              onClick={() => {
                navigator.share({
                  title: `صورة من دار المقام: ${image.name}`,
                  url: window.location.href
                }).catch(() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('تم نسخ رابط الصورة!', 'success');
                });
              }}
              className="p-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-12">
        <div className="max-w-4xl w-full bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group">
          <img 
            src={image.data} 
            alt={image.name} 
            className="w-full h-auto object-contain max-h-[80vh]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <p className="text-white font-bold text-lg">عرض الصورة</p>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={clsx(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md",
              toast.type === 'success' ? "bg-emerald-500/90 border-emerald-500/20 text-white" :
              "bg-red-500/90 border-red-500/20 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
