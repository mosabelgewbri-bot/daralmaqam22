import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Moon, Sun, Sunrise, Sunset, CloudMoon, Clock } from 'lucide-react';

interface PrayerTimesData {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export default function PrayerTimes() {
  const [times, setTimes] = useState<PrayerTimesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null);

  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        // Times from the provided image for Tripoli (21 Shawwal 1447 / April 9, 2026)
        const imageTimings = {
          Fajr: '05:17',
          Sunrise: '06:44',
          Dhuhr: '13:12',
          Asr: '16:44',
          Maghrib: '19:36',
          Isha: '20:58',
        };

        // We set the image timings as the primary source as requested
        setTimes(imageTimings);
        calculateNextPrayer(imageTimings);

        // Optionally still try to fetch to keep it dynamic, but the user requested "according to the image"
        // so we prioritize those. If we wanted to keep it dynamic we'd do:
        /*
        const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Tripoli&country=Libya&method=3');
        const data = await response.json();
        if (data.code === 200) {
          const timings = data.data.timings;
          setTimes({
            Fajr: timings.Fajr,
            Sunrise: timings.Sunrise,
            Dhuhr: timings.Dhuhr,
            Asr: timings.Asr,
            Maghrib: timings.Maghrib,
            Isha: timings.Isha,
          });
          calculateNextPrayer(timings);
        }
        */
      } catch (error) {
        console.error('Error fetching prayer times:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrayerTimes();
  }, []);

  const calculateNextPrayer = (timings: any) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const prayers = [
      { name: 'الفجر', time: timings.Fajr },
      { name: 'الظهر', time: timings.Dhuhr },
      { name: 'العصر', time: timings.Asr },
      { name: 'المغرب', time: timings.Maghrib },
      { name: 'العشاء', time: timings.Isha },
    ];

    for (const prayer of prayers) {
      const [hours, minutes] = prayer.time.split(':').map(Number);
      const prayerMinutes = hours * 60 + minutes;
      if (prayerMinutes > currentTime) {
        setNextPrayer(prayer);
        return;
      }
    }
    // If all prayers passed, next is Fajr tomorrow
    setNextPrayer(prayers[0]);
  };

  const prayerIcons: { [key: string]: any } = {
    'الفجر': Moon,
    'الشروق': Sunrise,
    'الظهر': Sun,
    'العصر': Sun,
    'المغرب': Sunset,
    'العشاء': CloudMoon,
  };

  if (loading) {
    return (
      <div className="glass-card p-6 flex items-center justify-center h-full border-white/5">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const prayerList = [
    { id: 'Fajr', label: 'الفجر', time: times?.Fajr },
    { id: 'Dhuhr', label: 'الظهر', time: times?.Dhuhr },
    { id: 'Asr', label: 'العصر', time: times?.Asr },
    { id: 'Maghrib', label: 'المغرب', time: times?.Maghrib },
    { id: 'Isha', label: 'العشاء', time: times?.Isha },
  ];

  return (
    <div className="glass-card p-8 flex flex-col h-full border-white/5 hover:border-gold/30 transition-all group overflow-hidden min-h-[400px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gold/10 text-gold">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">مواقيت الصلاة - طرابلس</h3>
        </div>
        {nextPrayer && (
          <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold">
            التالية: {nextPrayer.name}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 flex-1">
        {prayerList.map((prayer) => {
          const Icon = prayerIcons[prayer.label] || Sun;
          const isNext = nextPrayer?.name === prayer.label;
          
          return (
            <div 
              key={prayer.id}
              className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                isNext ? 'bg-gold/10 border border-gold/20' : 'bg-white/5 border border-transparent hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${isNext ? 'bg-gold text-matte-black' : 'bg-white/5 text-white/40'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-base font-bold ${isNext ? 'text-gold' : 'text-white/60'}`}>{prayer.label}</span>
              </div>
              <span className={`text-xl font-mono font-bold ${isNext ? 'text-gold' : 'text-white/80'}`}>
                {prayer.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
