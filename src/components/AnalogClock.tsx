import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { api } from '../services/api';

export default function AnalogClock() {
  const [time, setTime] = useState(new Date());
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const defaultLogoUrl = "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10L15 40V90H85V40L50 10Z' fill='%23D4AF37' fill-opacity='0.2' stroke='%23D4AF37' stroke-width='2'/%3E%3Cpath d='M50 30L30 50V80H70V50L50 30Z' fill='%23D4AF37' stroke='%23D4AF37' stroke-width='2'/%3E%3Ccircle cx='50' cy='20' r='5' fill='%23D4AF37'/%3E%3C/svg%3E";

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const settings = await api.getSettings();
        setLogoUrl(settings.app_logo || defaultLogoUrl);
      } catch (error) {
        console.error('Error loading logo for clock:', error);
        setLogoUrl(defaultLogoUrl);
      }
    };
    loadLogo();

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondsDegrees = (seconds / 60) * 360;
  const minutesDegrees = ((minutes + seconds / 60) / 60) * 360;
  const hoursDegrees = (((hours % 12) + minutes / 60) / 12) * 360;

  return (
    <div className="glass-card p-8 flex flex-col items-center justify-center h-full border-white/10 hover:border-gold/40 transition-all group min-h-[400px] relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
      {/* 3D Protrusion Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border-8 border-gold/30 flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.2)] bg-matte-black/60 group-hover:bg-matte-black/80 transition-all duration-500 transform group-hover:scale-105">
        {/* Logo Background */}
        {logoUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-12 opacity-40 group-hover:opacity-70 transition-opacity duration-700">
            <img 
              src={logoUrl} 
              alt="Clock Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Clock Numbers */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-full h-full text-center"
            style={{ transform: `rotate(${(i + 1) * 30}deg)` }}
          >
            <span 
              className="inline-block pt-2 text-sm font-black text-gold/70 group-hover:text-gold transition-all drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
              style={{ transform: `rotate(-${(i + 1) * 30}deg)` }}
            >
              {i + 1}
            </span>
          </div>
        ))}

        {/* Hour Hand */}
        <motion.div
          className="absolute bottom-1/2 left-1/2 w-2 h-12 md:h-16 bg-white rounded-full origin-bottom -translate-x-1/2 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
          animate={{ rotate: hoursDegrees }}
          transition={{ type: 'spring', stiffness: 50 }}
        />

        {/* Minute Hand */}
        <motion.div
          className="absolute bottom-1/2 left-1/2 w-1.5 h-18 md:h-24 bg-gold rounded-full origin-bottom -translate-x-1/2 shadow-[0_0_15px_rgba(212,175,55,0.5)]"
          animate={{ rotate: minutesDegrees }}
          transition={{ type: 'spring', stiffness: 50 }}
        />

        {/* Second Hand */}
        <motion.div
          className="absolute bottom-1/2 left-1/2 w-0.5 h-20 md:h-28 bg-rose-500 rounded-full origin-bottom -translate-x-1/2 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
          animate={{ rotate: secondsDegrees }}
          transition={{ duration: 0.2, ease: "linear" }}
        />

        {/* Center Dot */}
        <div className="absolute w-4 h-4 bg-gold rounded-full border-4 border-gold/20 z-10 shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
      </div>
      
      <div className="mt-8 text-center">
        {/* Dates Section */}
        <div className="flex flex-col gap-1 mb-6">
          <div className="text-3xl font-bold text-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.5)] bg-gold/5 px-6 py-2 rounded-2xl border border-gold/10">
            {(() => {
              try {
                const hijriDate = new Date(time);
                
                const formatter = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                });
                
                return formatter.format(hijriDate) + " هـ";
              } catch (e) {
                return "---";
              }
            })()}
          </div>
          <div className="text-sm text-white/60 font-bold tracking-wider mt-2">
            {time.toLocaleDateString('ar-LY', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>
        </div>

        {/* Digital Time */}
        <div className="text-5xl font-mono font-bold text-white/90 group-hover:text-gold transition-colors tracking-widest mb-2">
          {time.toLocaleTimeString('ar-LY', { hour12: true, hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-base text-white/20 font-bold uppercase tracking-[0.3em]">
          {time.toLocaleDateString('ar-LY', { weekday: 'long' })}
        </div>
      </div>
    </div>
  );
}
