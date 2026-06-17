import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return (
      <div className="bg-emerald-600 text-white text-[10px] sm:text-xs font-bold py-1.5 px-3 flex items-center justify-center space-x-2 fixed top-0 w-full z-50 tracking-wider">
        <Wifi size={14} />
        <span>[● ONLINE / SYNCED]</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-500 text-black text-[10px] sm:text-xs font-bold py-1.5 px-3 flex items-center justify-center space-x-2 fixed top-0 w-full z-50 tracking-wider">
      <WifiOff size={14} />
      <span>[○ OFFLINE MODE / LOCAL REPLICAS RUNNING]</span>
    </div>
  );
}
