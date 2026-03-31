import React, { useState } from 'react';
import { Camera } from 'lucide-react';

interface PassportScannerProps {
  onScan: (data: any) => void;
}

const PassportScanner: React.FC<PassportScannerProps> = ({ onScan }) => {
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    // Mock scan
    setTimeout(() => {
      onScan({
        name: 'John Doe',
        passportNumber: 'A1234567',
        nationality: 'Libyan',
      });
      setScanning(false);
    }, 2000);
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 flex flex-col items-center">
      <Camera className={`w-12 h-12 mb-2 ${scanning ? 'text-indigo-600 animate-pulse' : 'text-gray-400'}`} />
      <button
        onClick={handleScan}
        disabled={scanning}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
      >
        {scanning ? 'Scanning...' : 'Scan Passport'}
      </button>
    </div>
  );
};

export default PassportScanner;
