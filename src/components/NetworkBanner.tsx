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

  return (
    <div className="bg-white border-b border-slate-200 text-slate-800 font-bold py-2 px-4 sm:px-6 flex items-center justify-between fixed top-0 w-full z-50 shadow-sm leading-none h-14">
      <div className="flex items-center space-x-2">
        <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>
        </div>
        <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">AgriPulse Logistics</span>
      </div>
      
      {isOnline ? (
        <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-bold py-1.5 px-3 rounded-full border border-emerald-100">
          <Wifi size={14} />
          <span className="hidden sm:inline">ONLINE / SYNCED</span>
          <span className="sm:hidden">ONLINE</span>
        </div>
      ) : (
        <div className="flex items-center space-x-1.5 bg-amber-50 text-amber-700 text-[10px] sm:text-xs font-bold py-1.5 px-3 rounded-full border border-amber-200">
          <WifiOff size={14} />
          <span className="hidden sm:inline">OFFLINE MODE</span>
          <span className="sm:hidden">OFFLINE</span>
        </div>
      )}
    </div>
  );
}
