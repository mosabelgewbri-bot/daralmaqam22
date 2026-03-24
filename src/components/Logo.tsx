import React from 'react';
import { Building2 } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../services/api';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  showSubtitle?: boolean;
  dark?: boolean;
  transparent?: boolean;
  hideText?: boolean;
}

export default function Logo({ 
  className, 
  iconSize = 64, 
  textSize = "text-xl", 
  showSubtitle = true,
  dark = false,
  transparent = false,
  hideText = false
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
      <rect width="100" height="100" rx="20" fill="#1a1a1a"/>
      <path d="M50 20L80 50L50 80L20 50L50 20Z" stroke="#D4AF37" strokeWidth="2" fill="none"/>
      <path d="M50 30L70 50L50 70L30 50L50 30Z" stroke="#D4AF37" strokeWidth="1" fill="rgba(212, 175, 55, 0.1)"/>
      <circle cx="50" cy="50" r="5" fill="#D4AF37"/>
      <path d="M20 20L40 40M80 20L60 40M20 80L40 60M80 80L60 60" stroke="#D4AF37" strokeWidth="1" strokeOpacity="0.5"/>
    </svg>
  );

  return (
    <div className={clsx("flex items-center gap-4", className)}>
      <div className="relative group">
        {!transparent && <div className="absolute -inset-1 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" style={{ background: 'linear-gradient(to right, rgba(212, 175, 55, 0.5), rgba(212, 175, 55, 0.2))' }}></div>}
        <div 
          className={clsx(
            "relative p-2 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-500",
            transparent ? "border-none shadow-none" : "border-2"
          )}
          style={{ 
            width: iconSize, 
            height: iconSize,
            borderColor: transparent ? 'transparent' : (dark ? 'rgba(212, 175, 55, 0.6)' : 'rgba(212, 175, 55, 0.2)'),
            backgroundColor: transparent ? 'transparent' : (dark ? '#ffffff' : 'rgba(26, 26, 26, 0.4)'),
            boxShadow: transparent ? 'none' : (dark ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : '0 0 20px rgba(212, 175, 55, 0.2)')
          }}
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
      {!hideText && (
        <div className="flex flex-col">
          <h1 className={clsx(
            "font-serif font-bold leading-none", 
            textSize,
            dark ? "text-[#1a1a1a]" : "gold-text-gradient"
          )}>
            {companyName}
          </h1>
          {showSubtitle && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="h-px w-4" style={{ backgroundColor: dark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(212, 175, 55, 0.3)' }} />
              <p className="text-[9px] uppercase font-bold" style={{ color: dark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.5)' }}>
                لإدارة العمرة
              </p>
              <div className="h-px w-4" style={{ backgroundColor: dark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(212, 175, 55, 0.3)' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
