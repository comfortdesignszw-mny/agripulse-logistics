import React, { useState, useEffect } from 'react';
import NetworkBanner from './components/NetworkBanner';
import FarmerView from './views/FarmerView';
import TransporterView from './views/TransporterView';
import DealerView from './views/DealerView';
import SADCFeedHub from './components/SADCFeedHub';
import SADCMembers from './components/SADCMembers';
import { db, setSessionPin, decrypt, encrypt, setupBackgroundReplication } from './db';
import { User, Role } from './types';
import { 
  UserCircle, Truck, Store, Map, FileStack, Shield, Sprout, ArrowRight, 
  MapPin, Phone, Mail, FileText, CheckCircle, Image as ImageIcon, Camera, Globe,
  Menu, X, Layers, Users, Settings, LogOut, Check, Lock, LogIn, UserPlus
} from 'lucide-react';

// No preseeded mock data - SADC database starts clean
async function seedInitialData() {
  // Clean empty start
}

export default function App() {
  const [viewState, setViewState] = useState<'landing' | 'choose_role' | 'onboard_farmer' | 'onboard_transporter' | 'onboard_dealer' | 'app'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'members' | 'profile'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tickerItems, setTickerItems] = useState<string[]>([]);

  // Authenticated Auth Tab Selection - registration and login
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Universal 6-Digit PIN setting during onboarding registration
  const [onboardingPin, setOnboardingPin] = useState('');

  // Form states for Farmer onboarding
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [farmerEmail, setFarmerEmail] = useState('');
  const [farmAddress, setFarmAddress] = useState('');
  const [cropSpecializations, setCropSpecializations] = useState('Maize, Wheat');
  const [farmerImage, setFarmerImage] = useState('');

  // Form states for Transporter onboarding
  const [transporterName, setTransporterName] = useState('');
  const [transporterPhone, setTransporterPhone] = useState('');
  const [transporterEmail, setTransporterEmail] = useState('');
  const [transporterLocation, setTransporterLocation] = useState('');

  // Form states for Dealer onboarding
  const [dealerName, setDealerName] = useState('');
  const [dealerPhone, setDealerPhone] = useState('');
  const [dealerEmail, setDealerEmail] = useState('');
  const [dealerLocation, setDealerLocation] = useState('');
  const [cropsLookingFor, setCropsLookingFor] = useState('Maize');

  useEffect(() => {
    async function initApp() {
      // Start background replication plugin
      setupBackgroundReplication();

      await seedInitialData();

      // Check for an active persisted secure RxDB session
      try {
        const sessionDoc = await db.sessions.get('current_session');
        if (sessionDoc) {
          const decryptedPin = decrypt(sessionDoc.pin, 'SADC_DEVICE_LOCK_XOR_KEY_2026');
          setSessionPin(decryptedPin);

          const storedUser = await db.users.get(sessionDoc.userId);
          if (storedUser) {
            setCurrentUser(storedUser);
            setViewState('app');
            setActiveTab('dashboard');
          }
        }
      } catch (err) {
        console.error("Failed to restore secure RxDB session:", err);
      }

      const allUsers = await db.users.toArray();
      setUsers(allUsers);
    }
    initApp();
  }, []);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const reqs = await db.transportRequests.toArray();
        const bidsList = await db.bids.toArray();
        const ads = await db.adverts.toArray();

        const items: string[] = [];
        reqs.forEach(r => items.push(`🌾 Cargo Offer: ${r.quantity} ${r.unit} of ${r.cropName} from ${r.origin} to ${r.destination} proposed budget $${r.targetPrice}`));
        bidsList.forEach(b => items.push(`🚚 Carrier bid proposed: Rate of $${b.offerPrice} submitted by user ${b.bidderName}`));
        ads.forEach(a => items.push(`📢 SADC agri Bulletin: ${a.title} posted by ${a.authorName} - Market rate $${a.price}`));

        // Default fallbacks for a full, vibrant appearance
        if (items.length === 0) {
          items.push("🌾 Cargo Load Request: 15 Tonnes of yellow maize from Mazowe to Harare Seek Carrier");
          items.push("🚚 Active Driver Freight Bid: $420 USD bid placed for Harare Wheat run");
          items.push("📢 SADC Trade Market Call: Grain procurement tender active in Mbare Hub");
          items.push("🏬 Wholesale Buy Tender: Maize 40 Tonnes needed under Harare Agency");
        }
        setTickerItems(items);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTickerData();
  }, [viewState]);

  const handleProfileImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200; // Small circular thumbnail avatar
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setFarmerImage(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const submitFarmerOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onboardingPin.length !== 6 || !/^\d+$/.test(onboardingPin)) {
      alert("PIN must be exactly 6 digits.");
      return;
    }
    // Set active session pin for profile encryption
    setSessionPin(onboardingPin);
    const newUser: User = {
      name: farmerName,
      phoneNumber: farmerPhone,
      pin: onboardingPin,
      email: farmerEmail,
      userRole: 'Farmer',
      farmAddress,
      cropSpecializations,
      profileImage: farmerImage,
      verificationStatus: 'Verified',
      synced: 0
    };
    const id = await db.users.add(newUser);
    newUser.id = id;

    // Persist authenticated user session securely inside RxDB
    await db.sessions.put({
      id: 'current_session',
      userId: id,
      pin: encrypt(onboardingPin, 'SADC_DEVICE_LOCK_XOR_KEY_2026'),
      timestamp: Date.now()
    });

    setCurrentUser(newUser);
    const updated = await db.users.toArray();
    setUsers(updated);
    setViewState('app');
  };

  const submitTransporterOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onboardingPin.length !== 6 || !/^\d+$/.test(onboardingPin)) {
      alert("PIN must be exactly 6 digits.");
      return;
    }
    // Set active session pin for profile encryption
    setSessionPin(onboardingPin);
    const newUser: User = {
      name: transporterName,
      phoneNumber: transporterPhone,
      pin: onboardingPin,
      email: transporterEmail,
      userRole: 'Transporter',
      location: transporterLocation,
      verificationStatus: 'Pending', // Pending KYC document flows
      synced: 0
    };
    const id = await db.users.add(newUser);
    newUser.id = id;

    // Persist authenticated user session securely inside RxDB
    await db.sessions.put({
      id: 'current_session',
      userId: id,
      pin: encrypt(onboardingPin, 'SADC_DEVICE_LOCK_XOR_KEY_2026'),
      timestamp: Date.now()
    });

    setCurrentUser(newUser);
    const updated = await db.users.toArray();
    setUsers(updated);
    setViewState('app');
  };

  const submitDealerOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onboardingPin.length !== 6 || !/^\d+$/.test(onboardingPin)) {
      alert("PIN must be exactly 6 digits.");
      return;
    }
    // Set active session pin for profile encryption
    setSessionPin(onboardingPin);
    const newUser: User = {
      name: dealerName,
      phoneNumber: dealerPhone,
      pin: onboardingPin,
      email: dealerEmail,
      userRole: 'Dealer',
      location: dealerLocation,
      cropLookingFor: cropsLookingFor,
      verificationStatus: 'Verified',
      synced: 0
    };
    const id = await db.users.add(newUser);
    newUser.id = id;

    // Persist authenticated user session securely inside RxDB
    await db.sessions.put({
      id: 'current_session',
      userId: id,
      pin: encrypt(onboardingPin, 'SADC_DEVICE_LOCK_XOR_KEY_2026'),
      timestamp: Date.now()
    });

    setCurrentUser(newUser);
    const updated = await db.users.toArray();
    setUsers(updated);
    setViewState('app');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative pb-20">
      <NetworkBanner />

      {/* Landing Page Context */}
      {viewState === 'landing' && (
        <div className="flex-grow flex flex-col" id="landing-page-component">
          {/* Global Ticker Moving Text from Right to Left */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes marquee {
              0% { transform: translateX(100%); }
              100% { transform: translateX(-100%); }
            }
            .animate-marquee {
              animation: marquee 30s linear infinite;
            }
            .animate-marquee:hover {
              animation-play-state: paused;
            }
          `}} />
          
          <div className="bg-slate-900 border-b border-emerald-500/20 py-2.5 overflow-hidden relative w-full select-none z-30 flex items-center">
            <div className="flex whitespace-nowrap animate-marquee gap-10 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
              {tickerItems.map((item, idx) => (
                <span key={idx} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Top Hero Accent */}
          <div className="bg-slate-900 text-white pt-16 pb-20 px-6 text-center relative overflow-hidden border-b border-emerald-500/20">
            <div className="absolute inset-0 bg-radial-gradient from-emerald-500/10 to-transparent pointer-events-none opacity-60"></div>
            <div className="max-w-4xl mx-auto relative z-10">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider mb-5">
                <Globe size={13} className="animate-spin-slow" /> Regional Agriculture & Logistical Network
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold font-sans leading-tight tracking-tight text-white mb-4">
                Linking SADC Farmers, <br className="hidden sm:inline" />
                <span className="text-emerald-400 bg-emerald-950/40 px-2 rounded-lg">Transporters & Market Dealers</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-8 font-medium">
                AgriPulse Connect is an offline-resilient peer-to-peer directory and logistics exchange enabling transparent pricing, verified cargo manifests, and rapid trade bidding.
              </p>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setViewState('choose_role')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start for Free <ArrowRight size={18} />
                </button>
                {currentUser && (
                  <button 
                    onClick={() => setViewState('app')}
                    className="bg-slate-850 hover:bg-slate-800 text-slate-200 font-semibold px-6 py-3.5 rounded-xl border border-slate-700/50 transition-all"
                  >
                    Enter Workspace
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Three Custom High Contrast Illustrations */}
          <section className="py-12 px-6 max-w-5xl mx-auto w-full -mt-10 z-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card - Farmer Illustration */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden group hover:shadow-xl transition-all flex flex-col">
                <div className="aspect-ratio-4/3 overflow-hidden relative bg-slate-900 flex-shrink-0 h-48">
                  <img 
                    src="/src/assets/images/high_contrast_farmer_1781696713011.jpg" 
                    alt="Farmer representation" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                  <span className="absolute bottom-3 left-3 bg-emerald-500 text-slate-950 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    SADC Farmers
                  </span>
                </div>
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-850 text-base mb-2">Publish Harvests Locally</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Farmers register yield catalogs and submit direct logistical pickup requests while offline. Crops are geo-indexed so nearby cargo haulers discover them instantly.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <span>1. Crop Specialization</span> • <span>Bulk Sacks</span>
                  </div>
                </div>
              </div>

              {/* Card - Truck Illustration */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden group hover:shadow-xl transition-all flex flex-col">
                <div className="aspect-ratio-4/3 overflow-hidden relative bg-slate-900 flex-shrink-0 h-48">
                  <img 
                    src="/src/assets/images/high_contrast_truck_1781696729960.jpg" 
                    alt="Truck carrier" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                  <span className="absolute bottom-3 left-3 bg-blue-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Transporters
                  </span>
                </div>
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-850 text-base mb-2">Bid & Propose Empty Runs</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Carriers review active harvest requests on the SADC feed and pitch transport rates. Secure localized KYC credentials protect both drivers and yield owners.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
                    <span>2. KYC Documents Secure</span> • <span>Cargo Insurance</span>
                  </div>
                </div>
              </div>

              {/* Card - Market Illustration */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden group hover:shadow-xl transition-all flex flex-col">
                <div className="aspect-ratio-4/3 overflow-hidden relative bg-slate-900 flex-shrink-0 h-48">
                  <img 
                    src="/src/assets/images/high_contrast_market_1781696745154.jpg" 
                    alt="Fresh market yields" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                  <span className="absolute bottom-3 left-3 bg-amber-500 text-slate-950 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Market Dealers
                  </span>
                </div>
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-850 text-base mb-2">Buy Direct & List Sourcing</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Wholesale agro-dealers buy whole yields directly, hire transporters, and advertise target crops, ensuring smallholders receive real value.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                    <span>3. Retail Distribution</span> • <span>Stable Sourcing</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Advantages List */}
          <section className="bg-slate-100 py-12 px-6 border-t border-b border-slate-200">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-850 font-sans tracking-tight mb-8 text-center">
                Advantages of Using AgriPulse regional exchange
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-800">100% Offline-Resilient Synchronization</h4>
                    <p className="text-slate-500 mt-1">Peer-to-peer localized browser databases hold your bids. Transactions automatically update when network signals return.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-800">Zero Commission Peer Trading</h4>
                    <p className="text-slate-500 mt-1">Direct negotation between farms and dealers without middleman fees. Farmers can review and pick any bid they trust.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-800">Strict Driver Identification Standards</h4>
                    <p className="text-slate-500 mt-1">Transporters undergo a locally cached four-item KYC verification book, creating complete accountability.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-800">Global SADC Interactive Feed</h4>
                    <p className="text-slate-500 mt-1">Interactive community stream allows sellers, carriers, and wholesale hubs to broadcast classified ads, list capabilities, and publish prices.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Bar Footer */}
          <footer className="text-center py-8 text-xs text-slate-400 font-mono">
            AgriPulse SADC Logistical Alliance Hub • Running locally on client replication engines
          </footer>
        </div>
      )}

      {/* Role Chooser Screen */}
      {viewState === 'choose_role' && (
        <div className="max-w-md mx-auto w-full px-6 py-12 flex-grow flex flex-col justify-center">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agricultural Alliance Hub</h2>
            <p className="text-xs text-slate-500 mt-2">Manage your peer-to-peer SADC trading and logistical account.</p>
          </div>

          {/* Tab Selector */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 mb-6 border border-slate-200">
            <button
              onClick={() => { setAuthTab('register'); setLoginError(''); }}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                authTab === 'register' ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus size={14} />
              Register Profile
            </button>
            <button
              onClick={() => { setAuthTab('login'); setLoginError(''); }}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                authTab === 'login' ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn size={14} />
              Sign In (Phone + PIN)
            </button>
          </div>

          {authTab === 'register' ? (
            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 text-center mb-2">Choose your business model below to start your localized profile.</p>
              
              {/* Farmer Selection Card */}
              <button 
                onClick={() => { setOnboardingPin(''); setViewState('onboard_farmer'); }}
                className="w-full text-left bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] group flex items-start gap-4"
              >
                <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Sprout size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-850 text-base">Start as a Farmer</h3>
                  <p className="text-xs text-slate-500 mt-1">Upload crop specialties, advertise harvest packs, and coordinate freight requests with carriers.</p>
                </div>
              </button>

              {/* Transporter Selection Card */}
              <button 
                onClick={() => { setOnboardingPin(''); setViewState('onboard_transporter'); }}
                className="w-full text-left bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-5 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] group flex items-start gap-4"
              >
                <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-850 text-base">Start as a Transporter</h3>
                  <p className="text-xs text-slate-500 mt-1">Bid on active cargo manifests, register fleet capacity, upload KYC, and secure regional transit contracts.</p>
                </div>
              </button>

              {/* Dealer Selection Card */}
              <button 
                onClick={() => { setOnboardingPin(''); setViewState('onboard_dealer'); }}
                className="w-full text-left bg-white border border-slate-200 hover:border-amber-500 rounded-2xl p-5 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] group flex items-start gap-4"
              >
                <div className="bg-amber-100 text-amber-600 p-3 rounded-xl group-hover:bg-amber-50 group-hover:text-white transition-colors">
                  <Store size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-850 text-base">Start as a Dealer</h3>
                  <p className="text-xs text-slate-500 mt-1">Locate prime smallholder crops, publish buying targets, list market stand adverts, and request direct carriers.</p>
                </div>
              </button>
            </div>
          ) : (
            /* Secure PIN and Phone Login Card */
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoginError('');
              if (!loginPhone || loginPin.length !== 6) {
                setLoginError('SADC Telephone and exact 6-digit PIN are required.');
                return;
              }
              const foundUser = await db.users.where('phoneNumber').equals(loginPhone).first();
              if (foundUser) {
                if (foundUser.pin === loginPin) {
                  // Decrypt and set active profile session
                  setSessionPin(loginPin);

                  // Persist authenticated user session securely inside RxDB
                  await db.sessions.put({
                    id: 'current_session',
                    userId: foundUser.id!,
                    pin: encrypt(loginPin, 'SADC_DEVICE_LOCK_XOR_KEY_2026'),
                    timestamp: Date.now()
                  });

                  setCurrentUser(foundUser);
                  setViewState('app');
                  setActiveTab('dashboard');
                } else {
                  setLoginError('Access Denied: Incorrect PIN. Profile isolation secured.');
                }
              } else {
                setLoginError('No SADC profile found matching this telephone number.');
              }
            }} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Shield size={16} className="text-emerald-600" /> Secure SADC Pin Access
              </h3>
              
              {loginError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-150 text-[11px] leading-relaxed">
                  {loginError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Contact Telephone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                  <input required type="text" placeholder="e.g. +263771234567" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none text-slate-800" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">6-Digit Secure Access PIN</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                  <input required type="password" maxLength={6} placeholder="e.g. 123456" value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none text-slate-800 animate-none" />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2 mt-4 block">
                <Shield size={14} />
                Access Local Workspace
              </button>

              <p className="text-[10px] text-slate-400 leading-normal text-center mt-2">
                All profile details, transport requests, and bid histories are encrypted locally. Authenticate using your PIN to unlock session access keys instantly.
              </p>
            </form>
          )}

          <button 
            onClick={() => setViewState('landing')}
            className="text-xs text-slate-500 underline text-center mt-8 block hover:text-slate-800 cursor-pointer"
          >
            ← Back to Landing Information
          </button>
        </div>
      )}

      {/* Onboarding - Farmer Profile Creation */}
      {viewState === 'onboard_farmer' && (
        <div className="max-w-md mx-auto w-full px-6 py-10 flex-grow flex flex-col justify-center">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-850 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Sprout size={20} className="text-emerald-600" /> Farmers Onboarding
            </h2>
            <p className="text-[11px] text-slate-500 mt-1 mb-5">Create your regional farming profile. Information remains encrypted locally.</p>
            
            <form onSubmit={submitFarmerOnboarding} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Farmers Name</label>
                <input required type="text" placeholder="e.g. Tendai Moyo" value={farmerName} onChange={e => setFarmerName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Contact Telephone</label>
                  <input required type="text" placeholder="e.g. +263771234567" value={farmerPhone} onChange={e => setFarmerPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Email Address</label>
                  <input required type="email" placeholder="e.g. tendai@farm.co" value={farmerEmail} onChange={e => setFarmerEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">6-Digit Secure Profile PIN</label>
                <input required type="password" maxLength={6} placeholder="e.g. 123456" value={onboardingPin} onChange={e => setOnboardingPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Farm Location & Address</label>
                <input required type="text" placeholder="e.g. Bindura Section B, Zimbabwe" value={farmAddress} onChange={e => setFarmAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Crop Specializations</label>
                <input required type="text" placeholder="e.g. Maize, Tobacco, Soya Beans" value={cropSpecializations} onChange={e => setCropSpecializations(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Profile / Farm Image</label>
                <div className="border border-dashed border-slate-350 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-4 flex flex-col items-center relative overflow-hidden h-24 justify-center">
                  {farmerImage ? (
                    <img src={farmerImage} alt="Profile preview viewport" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Camera size={20} className="mx-auto mb-1 text-slate-400" />
                      <span className="text-[10px] font-semibold text-slate-500">Upload profile / farm photo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleProfileImageCapture} />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors mt-6">
                Complete Onboarding & Enter Dashboard
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding - Transporter Profile Creation */}
      {viewState === 'onboard_transporter' && (
        <div className="max-w-md mx-auto w-full px-6 py-10 flex-grow flex flex-col justify-center">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-850 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Truck size={20} className="text-indigo-600" /> Transporters Onboarding
            </h2>
            <p className="text-[11px] text-slate-500 mt-1 mb-5">Set up your local haulage identity. Next, submit mandatory KYC documents to unlock active cargos.</p>
            
            <form onSubmit={submitTransporterOnboarding} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Company / Driver Name</label>
                <input required type="text" placeholder="e.g. Chipo Logistics Ltd" value={transporterName} onChange={e => setTransporterName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Contact Telephone</label>
                  <input required type="text" placeholder="e.g. +263777654321" value={transporterPhone} onChange={e => setTransporterPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Email Address</label>
                  <input required type="email" placeholder="e.g. chipo@cargo.sadc" value={transporterEmail} onChange={e => setTransporterEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">6-Digit Secure Profile PIN</label>
                <input required type="password" maxLength={6} placeholder="e.g. 123456" value={onboardingPin} onChange={e => setOnboardingPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Home Fleet Hub / Depot Location</label>
                <input required type="text" placeholder="e.g. Beitbridge Logistics Park, Zimbabwe" value={transporterLocation} onChange={e => setTransporterLocation(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 flex gap-2 text-[10px] text-amber-800 leading-normal">
                <Shield size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <span>You will enter driver onboarding in <strong>verification pending mode</strong>. Security rules require uploading fleet & license KYC to match high-value Smallholder crops.</span>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors mt-4">
                Step to KYC Verification Panel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding - Dealer Profile Creation */}
      {viewState === 'onboard_dealer' && (
        <div className="max-w-md mx-auto w-full px-6 py-10 flex-grow flex flex-col justify-center">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-850 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Store size={20} className="text-amber-650" /> SADC Trade Dealer Onboarding
            </h2>
            <p className="text-[11px] text-slate-500 mt-1 mb-5">Open buying hub accounts. Match yields from smallholders directly and negotiate prices.</p>
            
            <form onSubmit={submitDealerOnboarding} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Hub / Outlet Register Name</label>
                <input required type="text" placeholder="e.g. SADC Grain Traders" value={dealerName} onChange={e => setDealerName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Store phone line</label>
                  <input required type="text" placeholder="e.g. +263779998888" value={dealerPhone} onChange={e => setDealerPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Trading email</label>
                  <input required type="email" placeholder="e.g. buy@sadctrade.co" value={dealerEmail} onChange={e => setDealerEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">6-Digit Secure Profile PIN</label>
                <input required type="password" maxLength={6} placeholder="e.g. 123456" value={onboardingPin} onChange={e => setOnboardingPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Retail Depot / Base Location</label>
                <input required type="text" placeholder="e.g. Harare Fruit & Crop Market, Zimbabwe" value={dealerLocation} onChange={e => setDealerLocation(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Primary crop varieties looking to procure</label>
                <input required type="text" placeholder="e.g. Maize, Wheat, Cow Peas, Soybeans" value={cropsLookingFor} onChange={e => setCropsLookingFor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors mt-6">
                Activate Dealer Marketplace Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Multi-Workspace dashboard layout */}
      {viewState === 'app' && currentUser && (
        <main className="flex-grow flex flex-col w-full">
          <div className="flex-grow w-full max-w-7xl mx-auto flex flex-col md:flex-row pb-12">
            {/* LEFT SIDEBAR FOR DESKTOP (Always Prominence, Details visible) */}
            <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-205 h-screen sticky top-0 p-5 justify-between flex-shrink-0">
              <div className="space-y-6 text-left">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Globe className="text-emerald-600 animate-spin-slow" size={20} />
                  <span className="font-extrabold text-sm tracking-tight text-slate-800 font-sans">AgriPulse SADC</span>
                </div>

                {/* Prominent Current User Profile card */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500 overflow-hidden bg-white flex items-center justify-center text-lg flex-shrink-0">
                      {currentUser.profileImage ? (
                        <img src={currentUser.profileImage} alt={currentUser.name} className="w-full h-full object-cover" />
                      ) : (
                        currentUser.userRole === 'Farmer' ? '🌾' : currentUser.userRole === 'Transporter' ? '🚚' : '🏬'
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs text-slate-800 leading-none truncate">{currentUser.name}</h4>
                      <span className="inline-block bg-emerald-50 text-emerald-800 font-black text-[8px] px-1.5 py-0.5 rounded uppercase mt-1 tracking-wider">
                        {currentUser.userRole}
                      </span>
                    </div>
                  </div>
                  
                  {/* Contact specifications */}
                  <div className="text-[10px] space-y-1 text-slate-500 font-semibold pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                      <span>{currentUser.location || currentUser.farmAddress || 'Regional Base'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone size={11} className="text-slate-400 flex-shrink-0" />
                      <span>{currentUser.phoneNumber}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <Mail size={11} className="text-slate-400 flex-shrink-0" />
                      <span>{currentUser.email}</span>
                    </div>
                  </div>
                </div>

                {/* Left Navigation Sidebar Options */}
                <div className="space-y-1">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-3xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                  >
                    <Layers size={15} />
                    <span>My Workspace</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('activity')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'activity' ? 'bg-emerald-600 text-white shadow-3xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                  >
                    <Globe size={15} />
                    <span>SADC Feed Hub</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('members')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'members' ? 'bg-emerald-600 text-white shadow-3xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                  >
                    <Users size={15} />
                    <span>Alliance Members</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'profile' ? 'bg-emerald-600 text-white shadow-3xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                  >
                    <Settings size={15} />
                    <span>Profile Settings</span>
                  </button>
                </div>
              </div>

              <div>
                <button 
                  onClick={async () => {
                    await db.sessions.delete('current_session');
                    setSessionPin(null);
                    setCurrentUser(null);
                    setViewState('landing');
                    setActiveTab('dashboard');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-605 hover:bg-rose-50 transition-all text-left text-rose-600"
                >
                  <LogOut size={15} />
                  <span>Log Out / Switch</span>
                </button>
              </div>
            </div>

            {/* Right main area */}
            <div className="flex-grow flex flex-col min-w-0">
              
              {/* MOBILE STICKY TOP HEADER */}
              <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-3xs">
                <div className="flex items-center gap-2">
                  <Globe className="text-emerald-600 animate-spin-slow" size={20} />
                  <span className="font-extrabold text-sm tracking-tight text-slate-800">AgriPulse SADC</span>
                </div>
                
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>

              {/* Mobile drawer: auto drop hamburger menu */}
              {mobileMenuOpen && (
                <div className="md:hidden bg-white border-b border-slate-205 shadow-md p-4 space-y-4 z-40 text-left">
                  
                  {/* User Profile display */}
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden flex items-center justify-center text-lg bg-white flex-shrink-0">
                      {currentUser.profileImage ? (
                        <img src={currentUser.profileImage} alt={currentUser.name} className="w-full h-full object-cover" />
                      ) : (
                        currentUser.userRole === 'Farmer' ? '🌾' : currentUser.userRole === 'Transporter' ? '🚚' : '🏬'
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs text-slate-850 leading-none truncate">{currentUser.name}</h4>
                      <p className="text-[9px] text-slate-450 mt-1 font-medium">{currentUser.phoneNumber} • {currentUser.email}</p>
                      <span className="inline-block bg-emerald-555 text-emerald-800 border border-emerald-200 font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase mt-1 tracking-wide">
                        {currentUser.userRole}
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        setActiveTab('dashboard');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-[10px] font-bold border transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-150'}`}
                    >
                      <Layers size={13} />
                      <span>Workspace</span>
                    </button>

                    <button 
                      onClick={() => {
                        setActiveTab('activity');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-[10px] font-bold border transition-all ${activeTab === 'activity' ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-150'}`}
                    >
                      <Globe size={13} />
                      <span>Feed Hub</span>
                    </button>

                    <button 
                      onClick={() => {
                        setActiveTab('members');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-[10px] font-bold border transition-all ${activeTab === 'members' ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-150'}`}
                    >
                      <Users size={13} />
                      <span>Directory</span>
                    </button>

                    <button 
                      onClick={() => {
                        setActiveTab('profile');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-[10px] font-bold border transition-all ${activeTab === 'profile' ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-150'}`}
                    >
                      <Settings size={13} />
                      <span>Settings</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-between text-[10px]">
                    <button 
                      onClick={async () => {
                        await db.sessions.delete('current_session');
                        setSessionPin(null);
                        setCurrentUser(null);
                        setViewState('landing');
                        setActiveTab('dashboard');
                        setMobileMenuOpen(false);
                      }}
                      className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 text-[10px]"
                    >
                      <LogOut size={12} /> Log Out Base
                    </button>
                    <span className="text-slate-400 font-mono text-[9px] self-center">AgriPulse Grid v1.0</span>
                  </div>
                </div>
              )}

              {/* Main routing area */}
              <div className="p-4 sm:p-6 lg:p-8 flex-grow" id="dashboard-main-render">
                {activeTab === 'activity' && <SADCFeedHub currentUser={currentUser} />}
                {activeTab === 'members' && <SADCMembers currentUser={currentUser} />}
                
                {activeTab === 'dashboard' && (
                  <>
                    {currentUser.userRole === 'Farmer' && <FarmerView user={currentUser} activeTab="dashboard" />}
                    {currentUser.userRole === 'Transporter' && <TransporterView user={currentUser} activeTab="dashboard" />}
                    {currentUser.userRole === 'Dealer' && <DealerView user={currentUser} activeTab="dashboard" />}
                  </>
                )}

                {activeTab === 'profile' && (
                  <>
                    {currentUser.userRole === 'Farmer' && <FarmerView user={currentUser} activeTab="profile" />}
                    {currentUser.userRole === 'Transporter' && <TransporterView user={currentUser} activeTab="profile" />}
                    {currentUser.userRole === 'Dealer' && <DealerView user={currentUser} activeTab="profile" />}
                  </>
                )}
              </div>

            </div>
          </div>
        </main>
      )}



    </div>
  );
}
