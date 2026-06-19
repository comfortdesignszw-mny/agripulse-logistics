import React, { useState, useEffect } from "react";
import { User, TransportRequest, Bid, Advert, LocalMediaCache } from "../types";
import { db, useLiveQuery, dataAccess } from "../db";
import {
  PlusCircle,
  Leaf,
  Scale,
  DollarSign,
  MapPin,
  Camera,
  X,
  Check,
  ArrowRight,
  ShieldCheck,
  Phone,
  Mail,
  User as UserIcon,
  Settings,
  Tag,
  Users,
  AlertCircle,
  Megaphone,
  MessageSquare,
  Truck,
  Store,
  Share2,
  QrCode,
} from "lucide-react";
import { syncManager, SyncLog } from "../syncManager";
import MarketAnalysisChart from "../components/MarketAnalysisChart";
import StaticMapPreview from "../components/StaticMapPreview";
import QRScanner from "../components/QRScanner";

export default function FarmerView({
  user,
  activeTab,
}: {
  user: User;
  activeTab: "dashboard" | "activity" | "profile";
}) {
  // Form states for adding transport requests
  const [crop, setCrop] = useState("Maize");
  const [customCrop, setCustomCrop] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<"kg" | "Tonnes">("Tonnes");
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [price, setPrice] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Advert creation states
  const [advTitle, setAdvTitle] = useState("");
  const [advPrice, setAdvPrice] = useState("");
  const [advUnit, setAdvUnit] = useState("Tonne");
  const [advDesc, setAdvDesc] = useState("");
  const [advImages, setAdvImages] = useState<string[]>([]);
  const [showAdvertForm, setShowAdvertForm] = useState(false);

  // Settings / Profile states
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phoneNumber);
  const [editEmail, setEditEmail] = useState(user.email || "");
  const [editLocation, setEditLocation] = useState(user.farmAddress || "");
  const [editSpecialties, setEditSpecialties] = useState(
    user.cropSpecializations || "",
  );
  const [editAvatar, setEditAvatar] = useState(user.profileImage || "");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync log states
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    return syncManager.subscribe((logs, pending) => {
      setSyncLogs(logs);
      setPendingSyncCount(pending);
    });
  }, []);

  // Sync state variables in case profile prop changes
  useEffect(() => {
    setEditName(user.name);
    setEditPhone(user.phoneNumber);
    setEditEmail(user.email || "");
    setEditLocation(user.farmAddress || "");
    setEditSpecialties(user.cropSpecializations || "");
    setEditAvatar(user.profileImage || "");
  }, [user]);

  // Read real-time databases with Dexie
  const myRequests =
    useLiveQuery(() =>
      db.transportRequests
        .where("farmerId")
        .equals(user.id!)
        .reverse()
        .sortBy("createdAt"),
    ) || [];
  const allUsers = useLiveQuery(() => db.users.toArray()) || [];
  const globalAdverts = useLiveQuery(() => db.adverts.toArray()) || [];
  const allBids = useLiveQuery(() => db.bids.toArray()) || [];

  const handleMediaCapture = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "request" | "advert" | "avatar",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = target === "avatar" ? 200 : 500;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

        if (target === "request") setMediaPreview(dataUrl);
        else if (target === "advert") {
          setAdvImages((prev) => (prev.length < 3 ? [...prev, dataUrl] : prev));
        } else if (target === "avatar") setEditAvatar(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cropName = crop === "Other" ? customCrop : crop;

    await dataAccess.transportRequests.create({
      farmerId: user.id!,
      farmerName: user.name,
      cropName,
      quantity: Number(qty),
      unit,
      origin,
      destination: dest,
      targetPrice: Number(price),
      status: "Open",
      image: mediaPreview || undefined,
    });

    setCrop("Maize");
    setCustomCrop("");
    setQty("");
    setOrigin("");
    setDest("");
    setPrice("");
    setMediaPreview(null);
    syncManager.triggerSync();
  };

  const handleCreateAdvert = async (e: React.FormEvent) => {
    e.preventDefault();

    await db.adverts.add({
      authorId: user.id!,
      authorName: user.name,
      authorRole: "Farmer",
      title: advTitle,
      cropName: crop,
      description: advDesc,
      price: Number(advPrice),
      unitType: advUnit,
      images: advImages.length > 0 ? advImages : undefined,
      timestamp: Date.now(),
      type: "ProduceSale",
    });

    setAdvTitle("");
    setAdvPrice("");
    setAdvUnit("Tonne");
    setAdvDesc("");
    setAdvImages([]);
    setShowAdvertForm(false);
  };

  const handleAcceptBid = async (bid: Bid) => {
    await dataAccess.transportRequests.update(bid.requestId, {
      status: "InProgress",
    });
    await dataAccess.bids.update(bid.id!, { status: "Accepted" });

    // Reject other competing bids
    const peerBids = allBids.filter(
      (b) => b.requestId === bid.requestId && b.id !== bid.id,
    );
    for (const pb of peerBids) {
      await dataAccess.bids.update(pb.id!, { status: "Rejected" });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await dataAccess.profiles.update(user.id!, {
      name: editName,
      phoneNumber: editPhone,
      email: editEmail,
      farmAddress: editLocation,
      cropSpecializations: editSpecialties,
      profileImage: editAvatar,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Subsections: Transport Request Panel */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <header className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                Farmer Logs & Cargo Bids
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Publish harvest sacks and match haulage transport.
              </p>
            </div>
            <button
              onClick={() => setShowQRScanner(true)}
              className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200 p-2 rounded-xl flex items-center justify-center transition-colors"
            >
              <QrCode size={20} />
            </button>
          </header>

          {showQRScanner && (
            <QRScanner
              onClose={() => setShowQRScanner(false)}
              onScanSuccess={(text) => {
                alert(
                  `Manifest scanned successfully!\nDecoded Load ID: ${text}`,
                );
                setShowQRScanner(false);
              }}
            />
          )}

          {/* Add Request Form */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <PlusCircle size={20} className="text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                New Transport Request Form
              </h2>
            </div>

            <form
              id="farmer-request-form"
              onSubmit={handleRequestSubmit}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Crop Variety
                  </label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option>Maize</option>
                    <option>Tobacco</option>
                    <option>Wheat</option>
                    <option>Soya Beans</option>
                    <option>Groundnuts</option>
                    <option>Other</option>
                  </select>
                </div>

                {crop === "Other" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Specify Crop Name
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Sorghum"
                      value={customCrop}
                      onChange={(e) => setCustomCrop(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Harvest Yield Weight
                  </label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="number"
                      placeholder="Amount"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none"
                    />
                    <select
                      value={unit}
                      onChange={(e) =>
                        setUnit(e.target.value as "kg" | "Tonnes")
                      }
                      className="w-24 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none"
                    >
                      <option>Tonnes</option>
                      <option>kg</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Farm Origin Address
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Mazowe Stand 4, Zimbabwe"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Destination Market / Depot
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. GMB Harare Grain Terminal"
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Expected Courier Pricing (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold text-xs">
                      $
                    </span>
                    <input
                      required
                      type="number"
                      placeholder="Target budget, e.g. 150"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Attach Optional Crop Photo Preview
                  </label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 relative cursor-pointer overflow-hidden rounded-xl h-28 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                    {mediaPreview ? (
                      <div className="relative w-full h-full">
                        <img
                          src={mediaPreview}
                          alt="Yield Snap"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setMediaPreview(null)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 text-white hover:bg-slate-950"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Camera size={22} className="mb-1" />
                        <span className="text-[10px] font-semibold text-slate-500">
                          Pick or Snapshot Crop Media
                        </span>
                        <span className="text-[8px] uppercase font-mono tracking-widest text-slate-450 mt-1">
                          Processed offline
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => handleMediaCapture(e, "request")}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-xs uppercase tracking-wider"
              >
                Publish Freight Request
              </button>
            </form>
          </section>

          {/* List of Requests & Active Counter Bids */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Your Open Freight Jobs
            </h2>
            {myRequests.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-4">
                <span>
                  You have not initiated any transport requests yet. Complete
                  the form above to deploy.
                </span>
                <button
                  onClick={() => {
                    const targetEl = document.getElementById(
                      "farmer-request-form",
                    );
                    if (targetEl)
                      targetEl.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-black tracking-wider px-4 py-2 rounded-xl transition-all shadow-3xs cursor-pointer"
                >
                  Create Your First Freight Request
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map((req) => {
                  const reqBids = allBids.filter(
                    (b) => b.requestId === req.id && b.status === "Pending",
                  );
                  return (
                    <div
                      key={req.id}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                    >
                      <div className="p-4 flex flex-col sm:flex-row justify-between gap-4 border-b border-slate-100">
                        <div className="flex gap-3">
                          {req.image && (
                            <img
                              src={req.image}
                              alt="Crop"
                              className="w-14 h-14 rounded-xl object-cover border border-slate-150 flex-shrink-0"
                            />
                          )}
                          <div>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                              🌾 {req.cropName}
                            </span>
                            <h3 className="font-bold text-slate-800 text-sm mt-1">
                              {req.quantity} {req.unit}
                            </h3>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                              <MapPin size={11} /> {req.origin} →{" "}
                              {req.destination}
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex flex-col justify-between">
                          <span
                            className={`text-[9px] w-fit sm:self-end font-bold px-2 py-0.5 rounded shadow-3xs uppercase ${req.status === "Open" ? "bg-amber-100 text-amber-800" : "bg-indigo-150 text-indigo-800"}`}
                          >
                            {req.status === "Open"
                              ? "Awaiting Bids"
                              : req.status === "InProgress"
                                ? "In Transit / Dispatched"
                                : "Completed"}
                          </span>
                          <p className="font-bold text-slate-700 text-xs mt-1">
                            Expected:{" "}
                            <span className="text-emerald-600 font-extrabold">
                              ${req.targetPrice}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 py-3 text-center border-b border-slate-100">
                        <StaticMapPreview
                          originCoords={[17.82, -25.9]}
                          destCoords={[20.5, -30.2]}
                          height={80}
                          width={280}
                        />
                      </div>

                      <div className="px-4 pb-2 border-b border-slate-100">
                        <MarketAnalysisChart
                          bids={allBids.filter((b) => b.requestId === req.id)}
                        />
                      </div>

                      {/* Display Bids Made on This Specific Request */}
                      <div className="p-4 bg-slate-50 space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">
                          Carrier Proposal Bids ({reqBids.length})
                        </span>
                        {reqBids.length === 0 ? (
                          <p className="text-[10px] text-slate-450 italic pl-1">
                            No bids submitted yet by regional carriers...
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {reqBids.map((bid) => (
                              <div
                                key={bid.id}
                                className="bg-white rounded-xl border border-slate-150 p-3 flex flex-col gap-2 shadow-3xs"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                                      {bid.bidderRole === "Transporter"
                                        ? "🚚"
                                        : "🏢"}
                                    </div>
                                    <div>
                                      <p className="font-bold text-xs text-slate-850">
                                        {bid.bidderName ||
                                          `Carrier #${bid.bidderId}`}
                                      </p>
                                      <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">
                                        {bid.bidderRole}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <p className="font-extrabold text-slate-805 text-sm">
                                      ${bid.offerPrice}
                                    </p>
                                    {bid.status === "Pending" ? (
                                      <button
                                        onClick={() => handleAcceptBid(bid)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg shadow-sm tracking-wide"
                                      >
                                        ACCEPT BID
                                      </button>
                                    ) : (
                                      <span
                                        className={`text-[9px] font-bold uppercase ${bid.status === "Accepted" ? "text-emerald-600" : "text-slate-400"}`}
                                      >
                                        {bid.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {bid.status === "Accepted" && (
                                  <div className="mt-2 bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                                    <div className="mb-2">
                                      <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                        <Phone size={12} /> Contact Number to
                                        negotiate directly:
                                      </p>
                                      <p className="text-sm font-mono text-emerald-900 font-extrabold">
                                        {allUsers.find(
                                          (u) => u.id === bid.bidderId,
                                        )?.phoneNumber || "Not found"}
                                      </p>
                                    </div>
                                    <div className="flex gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-[9px] leading-relaxed font-medium">
                                      <AlertCircle
                                        size={14}
                                        className="flex-shrink-0 mt-0.5"
                                      />
                                      <p>
                                        Warning: Verify all counter-parties
                                        before committing to deliveries or
                                        making any payments. The app developers
                                        are not responsible or liable for any
                                        fraudulent activities resulting from
                                        off-platform negotiations.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* List of Your Adverts & Bids on them */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Your Active Classified Ads
            </h2>
            {globalAdverts.filter((a) => a.authorId === user.id).length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                You have not posted any classified ads yet.
              </div>
            ) : (
              <div className="space-y-4">
                {globalAdverts
                  .filter((a) => a.authorId === user.id)
                  .map((adv) => {
                    const advBids = allBids.filter(
                      (b) => b.requestId === adv.id && b.status === "Pending",
                    );
                    return (
                      <div
                        key={adv.id}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                      >
                        <div className="p-4 flex justify-between items-center border-b border-slate-100">
                          <div className="flex gap-3">
                            <h3 className="font-bold text-slate-800 text-sm">
                              {adv.title}
                            </h3>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-slate-700 text-xs mt-1">
                              Price:{" "}
                              <span className="text-emerald-600 font-extrabold">
                                ${adv.price}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Display Bids Made on This Specific Advert */}
                        <div className="p-4 bg-slate-50 space-y-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">
                            Offers/Bids ({advBids.length})
                          </span>
                          {advBids.length === 0 ? (
                            <p className="text-[10px] text-slate-450 italic pl-1">
                              No offers submitted yet...
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {advBids.map((bid) => (
                                <div
                                  key={bid.id}
                                  className="bg-white rounded-xl border border-slate-150 p-3 flex flex-col gap-2 shadow-3xs"
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <p className="font-bold text-xs text-slate-850">
                                          {bid.bidderName ||
                                            `User #${bid.bidderId}`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <p className="font-extrabold text-slate-805 text-sm">
                                        ${bid.offerPrice}
                                      </p>
                                      <button
                                        onClick={() => handleAcceptBid(bid)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg shadow-sm tracking-wide"
                                      >
                                        ACCEPT BID
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 2. Activities: Directory showing Farmers, Transporters, Dealers in mesh */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Mesh Grid Activities
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Dispatched carrier actions, other local farmers, and buy targets.
            </p>
          </header>

          {/* Directory Listings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-150 pb-2">
              <Users size={18} className="text-emerald-600" />
              <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                Active AgriPulse SADC Alliance directory ({allUsers.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {allUsers.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-150 overflow-hidden flex-shrink-0">
                    {item.profileImage ? (
                      <img
                        src={item.profileImage}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-slate-600 text-sm">
                        {item.userRole === "Farmer"
                          ? "🌾"
                          : item.userRole === "Transporter"
                            ? "🚚"
                            : "🏬"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                        {item.name}
                      </h4>
                      <span
                        className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${item.userRole === "Farmer" ? "bg-emerald-50 text-emerald-700" : item.userRole === "Transporter" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {item.userRole}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-450 mt-1 flex items-center gap-1">
                      <MapPin size={11} className="text-slate-400" />{" "}
                      {item.farmAddress ||
                        item.location ||
                        "Coordinating hub location"}
                    </p>

                    {item.userRole === "Farmer" && item.cropSpecializations && (
                      <p className="text-[10px] text-slate-550 mt-1 italic">
                        Speaks: {item.cropSpecializations}
                      </p>
                    )}
                    {item.userRole === "Dealer" && item.cropLookingFor && (
                      <p className="text-[10px] text-slate-550 mt-1 italic">
                        Sourcing: {item.cropLookingFor}
                      </p>
                    )}

                    <div className="flex gap-4 mt-2.5 pt-2.5 border-t border-slate-100 text-[10px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Phone size={10} className="text-slate-400" />{" "}
                        {item.phoneNumber}
                      </span>
                      {item.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={10} className="text-slate-400" />{" "}
                          {item.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Peer-To-Peer Advertisements stream */}
          <section className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-150 pb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs text-slate-550 uppercase tracking-wider">
                <Megaphone size={16} className="text-emerald-600" /> Interactive
                Exchange Feed ({globalAdverts.length})
              </span>
              <button
                onClick={() => setShowAdvertForm(!showAdvertForm)}
                className="bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-[10px] px-3 py-1 rounded-lg uppercase tracking-wider transition-colors"
              >
                {showAdvertForm ? "Hide Form" : "Advertise Produces"}
              </button>
            </div>

            {showAdvertForm && (
              <form
                onSubmit={handleCreateAdvert}
                className="bg-slate-50 rounded-2xl border border-slate-150 p-4 space-y-3"
              >
                <h3 className="font-bold text-xs text-slate-700 uppercase">
                  Publish Direct Smallholder Produce Ad
                </h3>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Ad Title
                  </label>
                  <input
                    required
                    placeholder="e.g. Premium High-quality Grade A Maize"
                    value={advTitle}
                    onChange={(e) => setAdvTitle(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      Crop category
                    </label>
                    <select
                      value={crop}
                      onChange={(e) => setCrop(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                    >
                      <option>Maize</option>
                      <option>Tobacco</option>
                      <option>Wheat</option>
                      <option>Soya Beans</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      Price (USD)
                    </label>
                    <input
                      required
                      type="number"
                      placeholder="USD rate"
                      value={advPrice}
                      onChange={(e) => setAdvPrice(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      Per Unit
                    </label>
                    <select
                      value={advUnit}
                      onChange={(e) => setAdvUnit(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                    >
                      <option>Tonne</option>
                      <option>kg</option>
                      <option>sack</option>
                      <option>bucket</option>
                      <option>cartload</option>
                      <option>gallon</option>
                      <option>litres</option>
                      <option>other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    required
                    placeholder="Yield metrics, baggage condition, bulk bags loaded..."
                    value={advDesc}
                    onChange={(e) => setAdvDesc(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none min-h-[50px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                    Attachment Images (Max 3)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        className="border border-dashed border-slate-300 rounded-lg flex flex-col items-center relative overflow-hidden h-20 bg-white justify-center"
                      >
                        {advImages[idx] ? (
                          <>
                            <img
                              src={advImages[idx]}
                              alt="Preview"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setAdvImages(
                                  advImages.filter((_, i) => i !== idx),
                                )
                              }
                              className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow z-10"
                            >
                              <X size={12} className="text-red-500" />
                            </button>
                          </>
                        ) : advImages.length === idx ? (
                          <>
                            <Camera size={16} className="text-slate-300 mb-1" />
                            <span className="text-[8px] text-slate-400 font-medium">
                              Add Photo
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => handleMediaCapture(e, "advert")}
                            />
                          </>
                        ) : (
                          <span className="text-[8px] text-slate-300 font-medium">
                            Slot {idx + 1}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition-all"
                >
                  Post produce to Global SADC Feed
                </button>
              </form>
            )}

            {globalAdverts.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                Peer Classified Exchange is ready. SADC alliances have not
                posted produce ads today.
              </div>
            ) : (
              <div className="space-y-4">
                {globalAdverts.map((adv) => (
                  <div
                    key={adv.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span
                          className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${adv.type === "ProduceSale" ? "bg-emerald-100 text-emerald-800" : adv.type === "TransportOffer" ? "bg-indigo-150 text-indigo-800" : "bg-amber-100 text-amber-800"}`}
                        >
                          {adv.type === "ProduceSale"
                            ? "Farmer Produce Sale"
                            : adv.type === "TransportOffer"
                              ? "Carrier Run Pack"
                              : "Dealer Procurement Target"}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm mt-1">
                          {adv.title}
                        </h4>
                        <p className="text-[10px] font-bold text-emerald-650 mt-0.5">
                          Price: ${adv.price} per {adv.unitType || "Tonne"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-700">
                          {adv.authorName}
                        </p>
                        <p className="text-[8px] uppercase font-mono text-slate-400 font-bold">
                          {adv.authorRole}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      {adv.description}
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {(adv.images || []).map((imgUrl: string, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-xl overflow-hidden border border-slate-150 h-24"
                        >
                          <img
                            src={imgUrl}
                            alt={`${adv.title}-${idx}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {!adv.images && adv.image && (
                        <div className="rounded-xl overflow-hidden border border-slate-150 h-24 col-span-3">
                          <img
                            src={adv.image}
                            alt={adv.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {adv.authorId === user.id && (
                      <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-150">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                          Bids on this Advert
                        </span>
                        {allBids.filter((b) => b.requestId === adv.id)
                          .length === 0 ? (
                          <p className="text-[10px] text-slate-450 italic">
                            No bids submitted yet...
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {allBids
                              .filter((b) => b.requestId === adv.id)
                              .map((bid) => (
                                <div
                                  key={bid.id}
                                  className="bg-white rounded-lg border border-slate-200 p-2 text-xs flex flex-col gap-2 shadow-3xs"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-bold text-slate-800">
                                        {bid.bidderName}
                                      </p>
                                      <p className="text-[9px] text-slate-500 uppercase">
                                        {bid.bidderRole} • ${bid.offerPrice}
                                      </p>
                                    </div>
                                    {bid.status === "Pending" ? (
                                      <button
                                        onClick={() => handleAcceptBid(bid)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2 py-1 rounded-md uppercase"
                                      >
                                        Accept
                                      </button>
                                    ) : (
                                      <span
                                        className={`text-[9px] font-bold uppercase ${bid.status === "Accepted" ? "text-emerald-600" : "text-slate-400"}`}
                                      >
                                        {bid.status}
                                      </span>
                                    )}
                                  </div>
                                  {bid.status === "Accepted" && (
                                    <div className="mt-1 bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
                                      <div className="mb-2">
                                        <p className="text-[10px] font-bold text-emerald-800 flex items-center gap-1.5">
                                          <Phone size={10} /> Contact Number:
                                        </p>
                                        <p className="text-xs font-mono text-emerald-900 font-extrabold">
                                          {allUsers.find(
                                            (u) => u.id === bid.bidderId,
                                          )?.phoneNumber || "Not found"}
                                        </p>
                                      </div>
                                      <div className="flex gap-1.5 p-1.5 bg-amber-50 border border-amber-100 rounded-md text-amber-800 text-[8px] leading-relaxed font-medium">
                                        <AlertCircle
                                          size={10}
                                          className="flex-shrink-0 mt-0.5"
                                        />
                                        <p>
                                          Warning: Verify all counter-parties
                                          internally before payments. We are not
                                          liable for external off-platform
                                          negotiations.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 3. Editable Farmer Profile with options to adjust all settings */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Farm Coordinates & Settings
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Update smallholder data and offline synchronization diagnostics.
            </p>
          </header>

          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-1.5">
              <Settings size={16} className="text-emerald-600" /> Account
              Settings
            </h2>

            {saveSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold p-3 rounded-xl mb-4 flex items-center gap-2">
                <Check size={16} /> Update Saved Locally! Synchronization
                broadcast launched.
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 relative overflow-hidden flex items-center justify-center flex-shrink-0">
                  {editAvatar ? (
                    <img
                      src={editAvatar}
                      alt="Farm profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon size={24} className="text-slate-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handleMediaCapture(e, "avatar")}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Avatar / Crop Branding
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tap on picture bubble to snapshot smallholder photo.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Farmers Name
                </label>
                <input
                  required
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Contacts Phone
                  </label>
                  <input
                    required
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Contacts Email
                  </label>
                  <input
                    required
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Farm address & Location
                </label>
                <input
                  required
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Crop Specializations
                </label>
                <input
                  required
                  type="text"
                  value={editSpecialties}
                  onChange={(e) => setEditSpecialties(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
              >
                Save Personal & Farm Details
              </button>
            </form>
          </section>

          {/* Sync Diagnostics board */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-3">
              Sync Diagnostic Ledger
            </h2>
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Active queue
                </p>
                <p className="text-lg font-black text-slate-800 mt-1">
                  {pendingSyncCount} items waiting
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Verification Status
                </p>
                <p className="text-lg font-black text-emerald-600 mt-1">
                  {user.verificationStatus}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
              {syncLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="flex justify-between items-center text-[10px] font-mono border border-slate-100 p-2 rounded-lg bg-slate-50"
                >
                  <span className="truncate text-slate-600">
                    {log.description}
                  </span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[8px] tracking-wide ${log.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}`}
                  >
                    {log.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
