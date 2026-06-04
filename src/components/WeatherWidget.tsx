import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Cloud, Sun, CloudRain, Wind, Thermometer, MapPin } from 'lucide-react';

interface HourlyWeather {
  time: string;
  temp: number;
  condition: string;
  icon: any;
}

interface CityWeather {
  city: string;
  temp: number;
  condition: string;
  icon: any;
  humidity: number;
  windSpeed: number;
  hourly: HourlyWeather[];
}

const LIBYAN_CITIES = [
  { name: 'طرابلس', lat: 32.8872, lon: 13.1913 },
  { name: 'بنغازي', lat: 32.1167, lon: 20.0667 },
  { name: 'مصراتة', lat: 32.3775, lon: 15.0920 },
  { name: 'سبها', lat: 27.0377, lon: 14.4283 },
  { name: 'طبرق', lat: 32.0836, lon: 23.9764 },
  { name: 'البيضاء', lat: 32.7628, lon: 21.7551 }
];

const getWeatherIcon = (code: number) => {
  if (code === 0) return Sun;
  if (code <= 3) return Cloud;
  if (code >= 51 && code <= 67) return CloudRain;
  return Wind;
};

const getWeatherCondition = (code: number) => {
  if (code === 0) return 'صافي';
  if (code <= 3) return 'غائم جزئياً';
  if (code >= 51 && code <= 67) return 'أمطار خفيفة';
  return 'عواصف';
};

const getFallbackWeather = (cityName: string): CityWeather => {
  const defaults: Record<string, { temp: number, code: number, humidity: number, windSpeed: number }> = {
    'طرابلس': { temp: 28, code: 0, humidity: 45, windSpeed: 14 },
    'بنغازي': { temp: 26, code: 1, humidity: 50, windSpeed: 16 },
    'مصراتة': { temp: 27, code: 0, humidity: 48, windSpeed: 15 },
    'سبها': { temp: 36, code: 0, humidity: 20, windSpeed: 12 },
    'طبرق': { temp: 25, code: 2, humidity: 55, windSpeed: 22 },
    'البيضاء': { temp: 22, code: 3, humidity: 60, windSpeed: 18 }
  };
  const d = defaults[cityName] || { temp: 25, code: 0, humidity: 50, windSpeed: 15 };
  
  const currentHour = new Date().getHours();
  const hourly: HourlyWeather[] = [];
  for (let i = 0; i < 8; i++) {
    const hr = (currentHour + i) % 24;
    const tempVar = Math.round(d.temp + Math.sin((hr - 14) * Math.PI / 12) * 4);
    hourly.push({
      time: `${hr}:00`,
      temp: tempVar,
      condition: getWeatherCondition(d.code),
      icon: getWeatherIcon(d.code)
    });
  }

  return {
    city: cityName,
    temp: d.temp,
    condition: getWeatherCondition(d.code),
    icon: getWeatherIcon(d.code),
    humidity: d.humidity,
    windSpeed: d.windSpeed,
    hourly
  };
};

export default function WeatherWidget() {
  const [weatherData, setWeatherData] = useState<CityWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const results = LIBYAN_CITIES.map(city => getFallbackWeather(city.name));
        setWeatherData(results);
        setLoading(false);
      } catch (error) {
        console.error('Error in fetchWeather:', error);
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  useEffect(() => {
    if (weatherData.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % weatherData.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [weatherData.length]);

  if (loading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-pulse text-gold font-bold tracking-widest uppercase">جاري تحميل الطقس...</div>
      </div>
    );
  }

  const activeWeather = weatherData[activeIndex];

  if (!activeWeather) {
    return (
      <div className="glass-card p-8 flex items-center justify-center h-full min-h-[400px]">
        <div className="text-white/40 font-bold tracking-widest uppercase">بيانات الطقس غير متوفرة</div>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 h-full border-white/5 hover:border-gold/30 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[400px]">
      {/* Background Glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gold/5 rounded-full blur-3xl group-hover:bg-gold/10 transition-all duration-700" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 bg-gold rounded-full" />
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">حالة الطقس في ليبيا</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/40 font-bold uppercase tracking-widest">
            <MapPin className="w-4 h-4 text-gold/60" />
            <span>{activeWeather.city}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <motion.div 
              key={activeWeather.city}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-baseline gap-2"
            >
              <span className="text-7xl font-serif text-white group-hover:text-gold transition-colors">{activeWeather.temp}°</span>
              <span className="text-xl text-white/40 font-medium">C</span>
            </motion.div>
            <p className="text-base font-bold text-white/60 tracking-widest uppercase">{activeWeather.condition}</p>
          </div>
          
          <motion.div
            key={`icon-${activeWeather.city}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-6 rounded-3xl bg-white/5 border border-white/10 group-hover:border-gold/30 transition-all"
          >
            <activeWeather.icon className="w-14 h-14 text-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]" />
          </motion.div>
        </div>

        {/* Hourly Forecast */}
        <div className="mb-8">
          <p className="text-xs text-white/30 uppercase tracking-[0.3em] font-bold mb-4">التوقعات بالساعة</p>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {activeWeather.hourly.map((hour, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex flex-col items-center gap-3 min-w-[70px] p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-gold/20 transition-all"
              >
                <span className="text-xs text-white/50 font-bold">{hour.time}</span>
                <hour.icon className="w-6 h-6 text-gold/60" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-white">{hour.temp}°</span>
                  <span className="text-[10px] text-white/30 font-medium truncate max-w-[60px]">{hour.condition}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4 group/item hover:bg-white/[0.05] transition-all">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold">الرياح</p>
            <p className="text-sm font-bold text-white/90">{activeWeather.windSpeed} كم/س</p>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4 group/item hover:bg-white/[0.05] transition-all">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold">الرطوبة</p>
            <p className="text-sm font-bold text-white/90">{activeWeather.humidity}%</p>
          </div>
        </div>
      </div>

      {/* City Indicators */}
      <div className="flex justify-center gap-1.5 mt-6">
        {LIBYAN_CITIES.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1 rounded-full transition-all duration-500 ${idx === activeIndex ? 'w-4 bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'w-1 bg-white/10'}`}
          />
        ))}
      </div>
    </div>
  );
}
