import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface LogoProps {
  textSize?: string;
  showSubtitle?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ textSize = 'text-2xl', showSubtitle = true, className = '' }) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`font-bold text-primary ${textSize}`}>
        {isArabic ? 'دار المقام' : 'Dar Al-Maqam'}
      </div>
      {showSubtitle && (
        <div className="text-xs text-gray-500 mt-1">
          {isArabic ? 'لخدمات الحج والعمرة' : 'Hajj & Umrah Services'}
        </div>
      )}
    </div>
  );
};

export default Logo;
