import React from 'react';
import { Building2 } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../services/api';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  showSubtitle?: boolean;
}

export default function Logo({ 
  className, 
  iconSize = 64, 
  textSize = "text-xl", 
  showSubtitle = true 
}: LogoProps) {
  const [imgError, setImgError] = React.useState(false);
  const [customLogo, setCustomLogo] = React.useState<string | null>(null);
  const [companyName, setCompanyName] = React.useState('دار المقام');
  const defaultLogoUrl = "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10L15 40V90H85V40L50 10Z' fill='%23D4AF37' fill-opacity='0.2' stroke='%23D4AF37' stroke-width='2'/%3E%3Cpath d='M50 30L30 50V80H70V50L50 30Z' fill='%23D4AF37' stroke='%23D4AF37' stroke-width='2'/%3E%3Ccircle cx='50' cy='20' r='5' fill='%23D4AF37'/%3E%3C/svg%3E";

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      if (settings.app_logo) {
        setCustomLogo(settings.app_logo);
      } else {
        setCustomLogo(null);
      }
      if (settings.company_name) {
        setCompanyName(settings.company_name);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  React.useEffect(() => {
    loadSettings();

    const handleUpdate = () => {
      loadSettings();
    };

    window.addEventListener('settings_updated', handleUpdate);
    return () => window.removeEventListener('settings_updated', handleUpdate);
  }, []);

  const logoUrl = customLogo || defaultLogoUrl;

  const DefaultLogo = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 10L15 40V90H85V40L50 10Z" fill="#D4AF37" fillOpacity="0.2" stroke="#D4AF37" strokeWidth="2"/>
      <path d="M50 30L30 50V80H70V50L50 30Z" fill="#D4AF37" stroke="#D4AF37" strokeWidth="2"/>
      <circle cx="50" cy="20" r="5" fill="#D4AF37"/>
    </svg>
  );

  return (
    <div className={clsx("flex items-center gap-4", className)}>
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-gold/50 to-gold/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div 
          className="relative p-2 rounded-2xl bg-matte-dark border-2 border-gold/40 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.2)] overflow-hidden"
          style={{ width: iconSize, height: iconSize }}
        >
          {!imgError ? (
            <img 
              key={logoUrl}
              src={logoUrl} 
              alt="Dara Al-Maqam Logo" 
              className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500 brightness-110 contrast-110"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <DefaultLogo size={iconSize * 0.8} />
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <h1 className={clsx("font-serif font-bold gold-text-gradient leading-none tracking-tight", textSize)}>
          {companyName}
        </h1>
        {showSubtitle && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="h-px w-4 bg-gold/30" />
            <p className="text-[9px] text-white/50 uppercase tracking-[0.3em] font-bold">
              لإدارة العمرة
            </p>
            <div className="h-px w-4 bg-gold/30" />
          </div>
        )}
      </div>
    </div>
  );
}
