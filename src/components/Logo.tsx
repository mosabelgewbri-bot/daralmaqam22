import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
        <span className="text-white font-bold text-lg">U</span>
      </div>
      <span className="text-xl font-bold text-gray-900">Umrah App</span>
    </div>
  );
};

export default Logo;
