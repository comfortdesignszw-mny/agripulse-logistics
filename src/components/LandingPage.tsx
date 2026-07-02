import React from 'react';
import { Advert } from '../types';
import { Truck, Store, Wheat, Search, ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react';

interface LandingPageProps {
  adverts: Advert[];
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onQuickLogin: (role: 'Farmer' | 'Transporter' | 'Dealer') => void;
}

export default function LandingPage({
  adverts,
  onLoginClick,
  onRegisterClick,
  onQuickLogin
}: LandingPageProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState('All');

  const filteredAdverts = adverts.filter(ad => {
    const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ad.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ad.cropName && ad.cropName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'All' ? true :
      filterType === 'Produce' ? ad.type === 'Produce' :
      filterType === 'Transport Request' ? ad.type === 'Transport Request' || ad.type === 'TransportOffer' :
      ad.type === 'General Ad';

    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Header */}
      <header className="bg-emerald-800 text-white relative overflow-hidden">
        {/* Abstract background vector accent */}
        <div className="absolute right-0 top-0 w-1/3 h-full bg-emerald-700/30 transform skew-x-12 shrink-0 select-none pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-emerald-900/50 border border-emerald-600 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-300 mb-6">
              <Globe size={12} className="text-emerald-400" /> SADC Logistics Alliance
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              SADC AgriPulse Logistics & Transit Hub
            </h1>
            <p className="text-emerald-100 text-lg mt-4 max-w-xl">
              Connect regional Farmers, Transport Hauliers, and Grain Dealers on a unified collaborative ledger. Coordinate produce storage, dispatch cargo capacities, and submit secure bids on real classified trade.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
              <button
                id="hero-register-btn"
                onClick={onRegisterClick}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                Become Alliance Member <ArrowRight size={16} />
              </button>
              <button
                id="hero-login-btn"
                onClick={onLoginClick}
                className="w-full sm:w-auto px-6 py-3.5 bg-transparent border-2 border-emerald-500 hover:bg-emerald-700/40 text-white font-bold rounded-xl transition-all"
              >
                Sign In to Accounts
              </button>
            </div>
          </div>

          {/* Quick Demo Login Cards */}
          <div className="bg-emerald-950/80 p-6 rounded-2xl border border-emerald-700/50 w-full max-w-sm flex flex-col gap-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-emerald-300 text-center">
              ⚡ Sandbox Direct Access
            </h3>
            <p className="text-emerald-200 text-xs text-center mb-1">
              Test full multi-agent flows inside the Hub using the pre-seeded simulation buttons:
            </p>
            <div className="flex flex-col gap-2">
              <button
                id="quick-farmer"
                onClick={() => onQuickLogin('Farmer')}
                className="bg-emerald-900/80 hover:bg-emerald-900 text-white p-3 rounded-xl text-left border border-emerald-700/50 flex items-center justify-between text-xs font-bold transition-all"
              >
                <span>🌾 Login as Tinashe Moyo (Farmer)</span>
                <span className="bg-emerald-500 text-[10px] text-white px-2 py-0.5 rounded">Zimbabwe</span>
              </button>
              <button
                id="quick-transporter"
                onClick={() => onQuickLogin('Transporter')}
                className="bg-emerald-900/80 hover:bg-emerald-900 text-white p-3 rounded-xl text-left border border-emerald-700/50 flex items-center justify-between text-xs font-bold transition-all"
              >
                <span>🚚 Login as Lindiwe Ndlovu (Transporter)</span>
                <span className="bg-blue-500 text-[10px] text-white px-2 py-0.5 rounded">South Africa</span>
              </button>
              <button
                id="quick-dealer"
                onClick={() => onQuickLogin('Dealer')}
                className="bg-emerald-900/80 hover:bg-emerald-900 text-white p-3 rounded-xl text-left border border-emerald-700/50 flex items-center justify-between text-xs font-bold transition-all"
              >
                <span>🏪 Login as Chipo Mwansa (Dealer)</span>
                <span className="bg-purple-500 text-[10px] text-white px-2 py-0.5 rounded">Zambia</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Real Data Ads Section */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Live Classified Exchange</h2>
          <p className="text-sm text-slate-500 mt-1">
            Real trade listings posted securely from our active SADC database. Log in to place a legal bid or share contact channels.
          </p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              id="landing-ad-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search produce metrics, grain routes, or haulage requests..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            {['All', 'Produce', 'Transport Request', 'General Ad'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === t
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'All' ? 'All Ads' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Exchange Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAdverts.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl text-slate-400">
              <Wheat size={40} className="mx-auto text-slate-300 stroke-[1.2] mb-3" />
              <p className="font-bold">No active listings fit your filters.</p>
              <p className="text-xs text-slate-400 mt-1">Become the first member to declare a cargo post!</p>
            </div>
          ) : (
            filteredAdverts.sort((a,b) => b.timestamp - a.timestamp).map(ad => {
              // Get custom visual styling based on classification type
              const isProduce = ad.type === 'Produce';
              const isTransport = ad.type === 'Transport Request' || ad.type === 'TransportOffer';

              return (
                <div 
                  key={ad.id}
                  id={`guest-ad-card-${ad.id}`}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
                >
                  <div className={`p-4 ${isProduce ? 'bg-emerald-50/50' : isTransport ? 'bg-blue-50/50' : 'bg-purple-50/50'} border-b border-slate-150 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-white shadow-sm border border-slate-150">
                        {isProduce ? <Wheat className="text-emerald-700" size={16} /> : 
                         isTransport ? <Truck className="text-blue-700" size={16} /> : 
                         <Store className="text-purple-700" size={16} />}
                      </span>
                      <span className="text-[10px] tracking-wider uppercase font-extrabold text-slate-500">
                        {ad.type}
                      </span>
                    </div>

                    {/* Color-coded Pill Badges based on ad.status */}
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      ad.status === 'Open' ? 'bg-emerald-100 text-emerald-800' :
                      ad.status === 'Negotiating' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-150 text-slate-650'
                    }`}>
                      {ad.status}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-800 leading-snug">{ad.title}</h3>
                      <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                        {ad.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        {ad.price ? (
                          <div className="text-sm font-extrabold text-slate-900">
                            ${ad.price.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">/ {ad.unitType || 'unit'}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic">Negotiable Bid</div>
                        )}
                        <div className="text-[9px] text-slate-400 mt-0.5">Sourced from {ad.authorName} ({ad.authorRole})</div>
                      </div>

                      <button
                        onClick={onLoginClick}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 hover:underline active:underline"
                      >
                        Log In to Bid
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Trust and security badges */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex gap-3 items-start">
            <ShieldCheck className="text-emerald-600 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Strict Security Shield</h4>
              <p className="text-xs text-slate-500 mt-1">Emails and phone numbers are completely masked and hidden. Shared strictly when bids are mutual agreed.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Zap className="text-emerald-600 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Real-time Ledgers</h4>
              <p className="text-xs text-slate-500 mt-1">Driven by RxDB local databases synchronized instantly with the secure Express cloud container.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Globe className="text-emerald-600 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-slate-800 text-sm">SADC Unified Alliance</h4>
              <p className="text-xs text-slate-500 mt-1">Serving farmers, logistic truckers, and grain trading companies across Southern Africa Corridors.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
