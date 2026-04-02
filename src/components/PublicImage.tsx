import React from 'react';
import { motion } from 'motion/react';
import { Download, Share2, ZoomIn, X } from 'lucide-react';

interface PublicImageProps {
  src: string;
  alt?: string;
  onClose?: () => void;
}

const PublicImage: React.FC<PublicImageProps> = ({ src, alt = 'Public Image', onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center"
      >
        <div className="absolute top-4 right-4 flex gap-4 z-10">
          <button className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all">
            <Download className="w-6 h-6" />
          </button>
          <button className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all">
            <Share2 className="w-6 h-6" />
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="relative group w-full h-full flex items-center justify-center overflow-hidden rounded-2xl">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <ZoomIn className="w-12 h-12 text-white/50" />
          </div>
        </div>

        <div className="mt-8 text-center text-white/70">
          <p className="text-lg font-medium">{alt}</p>
          <p className="text-xs mt-1">دار المقام لخدمات الحج والعمرة</p>
        </div>
      </motion.div>
    </div>
  );
};

export default PublicImage;
