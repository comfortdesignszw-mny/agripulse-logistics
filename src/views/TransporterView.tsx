import React, { useState, useEffect } from 'react';
import { User, TransportRequest, Bid, Advert, KYCDocument } from '../types';
import { db, useLiveQuery, dataAccess } from '../db';
import { 
  Truck, ShieldCheck, MapPin, Scale, DollarSign, Camera, CheckCircle2,
  ChevronRight, Gavel, X, AlertCircle, FileText, Megaphone, Users,
  Settings, Phone, Mail, User as UserIcon, PlusCircle, Check
} from 'lucide-react';
import { syncManager, SyncLog } from '../syncManager';

export default function TransporterView({ user, activeTab }: { user: User; activeTab: 'dashboard' | 'activity' | 'profile' }) {
  const [bidModalReq, setBidModalReq] = useState<TransportRequest | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [compressing, setCompressing] = useState<string | null>(null);

  // Settings / Profile states
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phoneNumber);
  const [editEmail, setEditEmail] = useState(user.email || '');
  const [editLocation, setEditLocation] = useState(user.location || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Advert / Proposed service states
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [srvTitle, setSrvTitle] = useState('');
  const [srvPrice, setSrvPrice] = useState('');
  const [srvDesc, setSrvDesc] = useState('');

  // SADC KYC structures
  const uploadedDocs = useLiveQuery(() => db.kycDocuments.where('userId').equals(user.id!).toArray()) || [];
  const activeRequests = useLiveQuery(() => db.transportRequests.where('status').equals('Open').reverse().sortBy('createdAt')) || [];
  const myBids = useLiveQuery(() => db.bids.where('bidderId').equals(user.id!).toArray()) || [];
  const globalAdverts = useLiveQuery(() => db.adverts.toArray()) || [];
  const allUsers = useLiveQuery(() => db.users.toArray()) || [];

  const requiredDocTypes: Array<'NationalID' | 'DriverLicense' | 'VehicleReg' | 'VehiclePhoto'> = [
    'NationalID', 'DriverLicense', 'VehicleReg', 'VehiclePhoto'
  ];

  useEffect(() => {
    setEditName(user.name);
    setEditPhone(user.phoneNumber);
    setEditEmail(user.email || '');
    setEditLocation(user.location || '');
  }, [user]);

  const getDocDisplayName = (type: string) => {
    switch (type) {
      case 'NationalID': return 'National ID Card';
      case 'DriverLicense': return "Driver's License";
      case 'VehicleReg': return 'Vehicle Registration Book';
      case 'VehiclePhoto': return 'Fleet Vehicle Photo';
      default: return type;
    }
  };

  const handleKYCUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'NationalID' | 'DriverLicense' | 'VehicleReg' | 'VehiclePhoto') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(docType);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 640;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);

        const existing = uploadedDocs.find(d => d.docType === docType);
        if (existing) {
          await db.kycDocuments.update(existing.id!, {
            fileDataUrl: compressedBase64,
            synced: 0
          });
        } else {
          await db.kycDocuments.add({
            userId: user.id!,
            docType,
            fileDataUrl: compressedBase64,
            synced: 0
          });
        }
        
        setCompressing(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFinalizeVerification = async () => {
    await dataAccess.profiles.update(user.id!, { verificationStatus: 'Verified' });
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidModalReq) return;
    
    await dataAccess.bids.create({
      requestId: bidModalReq.id!,
      bidderId: user.id!,
      bidderName: user.name,
      bidderRole: 'Transporter',
      offerPrice: Number(bidPrice),
      status: 'Pending'
    });
    
    setBidModalReq(null);
    setBidPrice('');
  };

  const handlePostServiceOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    await db.adverts.add({
      authorId: user.id!,
      authorName: user.name,
      authorRole: 'Transporter',
      title: srvTitle,
      description: srvDesc,
      price: Number(srvPrice),
      timestamp: Date.now(),
      type: 'TransportOffer'
    });

    setSrvTitle('');
    setSrvPrice('');
    setSrvDesc('');
    setShowServiceForm(false);
    syncManager.triggerSync();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await dataAccess.profiles.update(user.id!, {
      name: editName,
      phoneNumber: editPhone,
      email: editEmail,
      location: editLocation
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const isKYCCompleted = user.verificationStatus === 'Verified';
  const hasAllDocs = requiredDocTypes.every(type => uploadedDocs.some(d => d.docType === type));

  // Render KYC Onboarder if driver block is locked
  if (!isKYCCompleted) {
    return (
      <div className="space-y-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold font-sans text-slate-900 tracking-tight">Transporter Verification Required</h1>
          <p className="text-sm text-slate-500 mt-1">Submit regional KYC identity items to access AgriPulse logistical cargoes.</p>
        </header>

        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
             <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-600"><ShieldCheck size={22}/></div>
             <div>
               <h2 className="text-base font-bold text-slate-800">SADC Interstate Carrier Verification</h2>
               <p className="text-xs text-slate-500 font-mono mt-0.5">Status: Pending Document Vault</p>
             </div>
          </div>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Upload active documentation. Our localized canvas engine auto-compresses assets before replication. Bids are locked until SADC identity check completes.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {requiredDocTypes.map(docType => {
              const savedDoc = uploadedDocs.find(d => d.docType === docType);
              const isUploading = compressing === docType;

              return (
                <div key={docType} className={`border-2 rounded-xl p-4 flex flex-col justify-between h-40 transition-all relative overflow-hidden bg-slate-50 border-slate-200 hover:border-emerald-500 ${savedDoc ? 'border-emerald-100 bg-emerald-50/10' : ''}`}>
                  {savedDoc && (
                    <img 
                      src={savedDoc.fileDataUrl} 
                      alt={docType} 
                      className="absolute inset-x-0 bottom-0 top-1/2 w-full h-1/2 object-cover opacity-20 pointer-events-none"
                    />
                  )}
                  
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-700">{getDocDisplayName(docType)}</span>
                    {savedDoc ? (
                      <span className="text-[9px] font-bold text-emerald-750 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        ✓ SECURED
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-wider">
                        REQUIRED
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    {isUploading ? (
                      <span className="text-xs text-emerald-600 font-semibold font-mono animate-pulse">Compressing local file...</span>
                    ) : savedDoc ? (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-400 font-mono">Size: ~{(savedDoc.fileDataUrl.length / 1024).toFixed(1)} KB</span>
                        <label className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 uppercase cursor-pointer">
                          Replace
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleKYCUpload(e, docType)} />
                        </label>
                      </div>
                    ) : (
                      <label className="w-full flex items-center justify-center gap-1.5 border border-dashed border-slate-350 hover:border-emerald-500 hover:bg-white text-slate-600 font-semibold py-2.5 px-3 rounded-lg text-xs cursor-pointer transition-colors">
                        <Camera size={14} className="text-slate-405" /> Snap Document
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleKYCUpload(e, docType)} />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-500">
              <AlertCircle size={16} className="text-slate-400" />
              <span className="text-xs font-semibold">
                {uploadedDocs.length} of {requiredDocTypes.length} documents uploaded.
              </span>
            </div>
            <button
              onClick={handleFinalizeVerification}
              disabled={!hasAllDocs}
              className={`w-full sm:w-auto font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider shadow transition-all flex items-center justify-center gap-2 ${hasAllDocs ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <CheckCircle2 size={16} /> Unlock Carrier Workspace
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Feed (Logistics listings from Farmers, Dealers, Carriers) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Alliance Logistics Feed</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Active farm listings, dealer requests, and courier classifieds.</p>
          </header>

          {/* Button to post / propose transport service */}
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-800">Propose Transport Services</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Advertise your carriage specs and shipping rates to farmers & dealers.</p>
            </div>
            <button 
              onClick={() => setShowServiceForm(!showServiceForm)}
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-2 rounded-xl uppercase tracking-wider"
            >
              {showServiceForm ? 'Close Form' : 'Advertise Truck'}
            </button>
          </div>

          {showServiceForm && (
            <form onSubmit={handlePostServiceOffer} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
              <h3 className="font-bold text-xs text-slate-700 uppercase">Publish Haulage Service Advertisement</h3>
              
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Service Route Title</label>
                <input required placeholder="e.g. 15-Tonne Flatbed Carriage: Mutare to Harare" value={srvTitle} onChange={e => setSrvTitle(e.target.value)} className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Standard Rate (USD / Tonne or Trip)</label>
                <input required type="number" placeholder="e.g. 250" value={srvPrice} onChange={e => setSrvPrice(e.target.value)} className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Route description / Details</label>
                <textarea required placeholder="Available transit days, volume specifications, truck tare weights, dropoff areas..." value={srvDesc} onChange={e => setSrvDesc(e.target.value)} className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none min-h-[60px]" />
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs py-2 rounded-xl">
                Submit Broadcast Advert
              </button>
            </form>
          )}

          {/* Active Job Solicitations from Farmers */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Truck size={14} className="text-indigo-600" /> Active Farm Cargo Requests ({activeRequests.length})
            </h2>

            {activeRequests.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 shadow-sm text-xs text-slate-400 flex flex-col items-center justify-center space-y-4">
                <span>Savannah harvest logistics is fully deployed. No open cargo offers right now.</span>
                <button
                  onClick={() => setShowServiceForm(true)}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-3xs cursor-pointer"
                >
                  Advertise Your Truck Services Instead
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRequests.map(req => {
                  const alreadyBidded = myBids.some(b => b.requestId === req.id);
                  return (
                    <div key={req.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-3xs text-left relative overflow-hidden">
                      {alreadyBidded && (
                        <span className="absolute top-0 right-0 bg-emerald-500 text-white font-extrabold text-[8px] tracking-widest px-3 py-1 uppercase rounded-bl-lg">
                          Bid Sent
                        </span>
                      )}

                      <div className="flex gap-3 justify-between items-start mb-3">
                        <div className="flex gap-2">
                          {req.image && (
                            <img src={req.image} alt="Crop Yield" className="w-12 h-12 rounded-xl object-cover border border-slate-150 flex-shrink-0" />
                          )}
                          <div>
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[8px] px-1.5 py-0.5 rounded-full uppercase">
                              🌾 Farm Cargo
                            </span>
                            <h3 className="font-extrabold text-slate-800 text-sm mt-1">{req.cropName} yield</h3>
                            <p className="text-[10px] text-slate-450 mt-0.5 font-bold">Shipper: {req.farmerName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider text-slate-400">Target rate</p>
                          <p className="font-extrabold text-slate-800 text-sm">${req.targetPrice}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] font-medium text-slate-600 flex items-center gap-2 mb-3">
                        <MapPin size={12} className="text-slate-400" />
                        <span className="truncate">{req.origin}</span>
                        <ChevronRight size={10} className="text-slate-305 mx-1" />
                        <span className="truncate">{req.destination}</span>
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          Weight: {req.quantity} {req.unit}
                        </span>

                        {!alreadyBidded ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => { setBidModalReq(req); setBidPrice(req.targetPrice.toString()); }}
                              className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl transition-all"
                            >
                              Counter Pricing
                            </button>
                            <button 
                              onClick={async () => {
                                await dataAccess.bids.create({
                                  requestId: req.id!,
                                  bidderId: user.id!,
                                  bidderName: user.name,
                                  bidderRole: 'Transporter',
                                  offerPrice: req.targetPrice,
                                  status: 'Pending'
                                });
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl transition-all"
                            >
                              Match Rate (${req.targetPrice})
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                            ✓ Pending Review offline
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SADC Shared classifieds */}
          <section className="space-y-4 pt-4 border-t border-slate-150">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5All flex-wrap">
              <Megaphone size={14} className="text-indigo-650" /> SADC Alliance community classifieds ({globalAdverts.length})
            </h2>

            {globalAdverts.length === 0 ? (
              <p className="text-xs text-slate-450 italic">No community adverts registered in global index.</p>
            ) : (
              <div className="space-y-4">
                {globalAdverts.map(adv => (
                  <div key={adv.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs text-left">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase ${adv.type === 'ProduceSale' ? 'bg-emerald-100 text-emerald-700' : adv.type === 'TransportOffer' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                          {adv.type === 'ProduceSale' ? 'Smallholder Yield' : adv.type === 'TransportOffer' ? 'Haulage Flatbed' : 'Dealer Procurement'}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm mt-1">{adv.title}</h4>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800 text-xs">${adv.price}</p>
                        <p className="text-[8px] text-slate-400 font-mono mt-0.5">{adv.authorName}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{adv.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 2. Activity / Engagement Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Active Transits & Bids</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Track cargo tenders, contract locks, and negotiations.</p>
          </header>

          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bids Placed Locally ({myBids.length})</h2>
            
            {myBids.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-4">
                <span>You have not placed any bids or counter rates yet. Go to Feed to get started.</span>
                <button
                  onClick={() => alert("Please tap on 'Logistics Dashboard' in your left sidebar to view active cargo feed listings.")}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-3xs cursor-pointer"
                >
                  Browse Cargo Listing Feed
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myBids.map(bid => {
                  const targetReq = activeRequests.find(r => r.id === bid.requestId);
                  const targetAdv = globalAdverts.find(a => a.id === bid.requestId);
                  const clientUser = allUsers.find(u => u.id === targetReq?.farmerId || u.id === targetAdv?.authorId);
                  
                  return (
                    <div key={bid.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs text-left">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[8px] font-extrabold uppercase bg-slate-100 px-2 py-0.5 rounded">
                            Tender Ref: #{bid.requestId}
                          </span>
                          <p className="font-bold text-slate-800 text-xs sm:text-sm mt-1.5">Submitted Counter rate: <span className="text-indigo-600">${bid.offerPrice}</span></p>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Placed Date: {new Date(bid.timestamp).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded shadow-3xs uppercase ${bid.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' : bid.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                          {bid.status}
                        </span>
                      </div>
                      
                      {bid.status === 'Accepted' && (
                         <div className="mt-3 bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                            <div className="mb-2">
                              <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5"><Phone size={12} /> Counter-Party Contact Number:</p>
                              <p className="text-sm font-mono text-emerald-900 font-extrabold">{clientUser?.phoneNumber || 'Not found'}</p>
                            </div>
                            <div className="flex gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-[9px] leading-relaxed font-medium">
                              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                              <p>Warning: Verify the client externally before deploying fleet. The app developers are not responsible or liable for any fraudulent activities occurring off-platform.</p>
                            </div>
                         </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 3. Fleet Profile & settings to adjust details in real-time */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Carrier Settings</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Configure driver settings, view fleet status, and active KYC.</p>
          </header>

          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <Settings size={16} className="text-indigo-600" /> Adjust Profile Settings
            </h2>

            {saveSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold p-3 rounded-xl mb-4 flex items-center gap-1.5">
                <Check size={16} /> Fleet changes saved and broadcasted.
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Transporter Carrier Name</label>
                <input required type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-505 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Phone line</label>
                  <input required type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-505 rounded-xl p-2.5 text-xs outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Email</label>
                  <input required type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-505 rounded-xl p-2.5 text-xs outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Depot Location / Home Base</label>
                <input required type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-505 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <button type="submit" className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs">
                Save Fleet Configuration
              </button>
            </form>
          </section>

          {/* Secure Document Vault logs */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 mb-2">Secure SADC ID Tokens</h2>
            <p className="text-xs text-slate-450 leading-relaxed mb-4">Your four verification certificates are securely encrypted in your browser replica cache.</p>
            
            <div className="grid grid-cols-2 gap-3">
              {requiredDocTypes.map(docType => {
                const doc = uploadedDocs.find(d => d.docType === docType);
                return (
                  <div key={docType} className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl flex items-center justify-between text-left">
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-700 truncate">{getDocDisplayName(docType)}</p>
                      <p className="text-[8px] text-slate-400 font-semibold font-mono uppercase mt-0.5">
                        {doc ? 'Secured ✓' : 'Empty ○'}
                      </p>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${doc ? 'bg-emerald-500' : 'bg-slate-200'}`}></span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Counter offer Bid Modal */}
      {bidModalReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-left">
              <button onClick={() => setBidModalReq(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-750"><X size={18}/></button>
              <h3 className="text-base font-bold flex items-center mb-1"><Gavel size={18} className="mr-2 text-indigo-600"/> Submit Counter rate</h3>
              <p className="text-xs text-slate-500 mb-5">Your offer will pin instantly onto {bidModalReq.farmerName}'s request dashboard.</p>
              
              <form onSubmit={handlePlaceBid}>
                 <div className="mb-4">
                    <label className="text-[10px] font-semibold text-slate-505 uppercase tracking-wider mb-1 block">Offer Rate (USD)</label>
                    <div className="relative">
                      <DollarSign size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input type="number" required min="1" value={bidPrice} onChange={e => setBidPrice(e.target.value)} className="w-full bg-slate-50 border border-slate-350 rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white"/>
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all">
                   Submit Freight Bid
                 </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}
