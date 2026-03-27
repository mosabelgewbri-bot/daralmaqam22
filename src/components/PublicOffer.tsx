import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { UmrahOffer } from '../types';
import { 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Download, 
  Share2,
  MapPin,
  Hotel,
  Utensils
} from 'lucide-react';
import html2canvas from 'html2canvas';

export default function PublicOffer() {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<UmrahOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOffer(id);
    }
  }, [id]);

  const fetchOffer = async (offerId: string) => {
    setIsLoading(true);
    try {
      const data = await api.getUmrahOfferById(offerId);
      setOffer(data);
    } catch (error) {
      console.error('Error fetching offer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('offer-design-preview');
    if (element && offer) {
      try {
        const canvas = await html2canvas(element, { 
          scale: 3, 
          useCORS: true,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById('offer-design-preview');
            if (clonedElement) {
              const allTextElements = clonedElement.querySelectorAll('*');
              allTextElements.forEach((el) => {
                if (el instanceof HTMLElement) {
                  el.style.letterSpacing = '0';
                  el.style.wordSpacing = '0';
                  el.style.textTransform = 'none';
                }
              });
            }
          }
        });
        const link = document.createElement('a');
        link.download = `عرض_عمرة_${offer.name}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (e) {
        console.error('Error generating image:', e);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
        <p className="text-white/40 font-bold">جاري تحميل العرض...</p>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Share2 className="w-10 h-10 text-white/20" />
        </div>
        <h1 className="text-2xl font-bold text-white">العرض غير موجود</h1>
        <p className="text-white/40 max-w-xs">عذراً، يبدو أن الرابط الذي تتبعه غير صحيح أو أن العرض قد تم حذفه.</p>
        <a href="/" className="mt-6 px-8 py-3 bg-gold text-black font-bold rounded-xl">العودة للرئيسية</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 p-6 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
              <Share2 className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">عرض عمرة احترافي</h2>
              <p className="text-[10px] text-white/40 font-bold">شركة دار المقام</p>
            </div>
          </div>
          <button 
            onClick={handleDownloadImage}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg text-xs font-bold"
          >
            <Download className="w-4 h-4" />
            تحميل كصورة
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
        {offer.imageUrl && (
          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <img 
              src={offer.imageUrl} 
              alt={offer.name} 
              className="w-full h-auto object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div id="offer-design-preview" className="bg-white p-6 md:p-12 rounded-3xl text-slate-900 font-serif relative overflow-hidden border-8 border-double border-gold/30 shadow-2xl">
          {/* Islamic Pattern Background */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          
          <div className="relative z-10 space-y-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <h2 className="text-xl md:text-2xl font-bold text-gold">{offer.documentTitle || 'شركة دار المقام'}</h2>
              <div className="h-1 w-40 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">{offer.name}</h1>
              <p className="text-sm md:text-lg text-slate-500 font-bold">{offer.category} - رحلات 1447 هـ</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {offer.rows.map((row, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col gap-4 text-right shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3 text-gold font-bold">
                      <MapPin className="w-5 h-5" />
                      <span className="text-lg">{row.makkah} / {row.madinah}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-gold/10 text-gold text-[10px] font-bold">{offer.category}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 justify-end">
                      <p className="text-xl md:text-2xl font-bold text-slate-800">{row.offer}</p>
                      <Hotel className="w-6 h-6 text-gold mt-1" />
                    </div>
                    <div className="flex items-center justify-end gap-2 text-slate-500 font-medium">
                      <span>{row.meals}</span>
                      <Utensils className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-white border border-slate-100 rounded-xl p-3 text-center shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold mb-1">ثنائي</p>
                      <p className="text-lg font-black text-gold">{row.double}</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl p-3 text-center shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold mb-1">ثلاثي</p>
                      <p className="text-lg font-black text-gold">{row.triple}</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl p-3 text-center shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold mb-1">رباعي</p>
                      <p className="text-lg font-black text-gold">{row.quad}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {offer.fixedText && (
              <div className="pt-8 border-t border-slate-100">
                <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap italic">{offer.fixedText}</p>
              </div>
            )}

            <div className="pt-10 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 border-t border-slate-100 mt-8">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-gold" />
                </div>
                <span className="text-sm font-bold">0948470011</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-gold" />
                </div>
                <span className="text-sm font-bold">0947470010</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gold rounded-3xl p-8 text-center space-y-4 shadow-xl shadow-gold/10">
          <h3 className="text-xl font-black text-black">هل أعجبك العرض؟</h3>
          <p className="text-black/60 text-sm font-bold">تواصل معنا الآن للحجز أو الاستفسار عن التفاصيل</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a 
              href="https://wa.me/218948470011" 
              className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg"
            >
              <Phone className="w-5 h-5" />
              تواصل عبر واتساب
            </a>
            <button 
              onClick={() => {
                navigator.share({
                  title: `عرض عمرة من دار المقام: ${offer.name}`,
                  url: window.location.href
                }).catch(() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('تم نسخ رابط العرض!');
                });
              }}
              className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg"
            >
              <Share2 className="w-5 h-5" />
              مشاركة العرض
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
