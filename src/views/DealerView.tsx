import React, { useState, useEffect } from "react";
import { User, TransportRequest, Bid, Advert } from "../types";
import { db, useLiveQuery, dataAccess } from "../db";
import {
  Store,
  Leaf,
  DollarSign,
  MapPin,
  Search,
  ChevronRight,
  Gavel,
  X,
  Clock,
  Tag,
  PlusCircle,
  Scale,
  Megaphone,
  Truck,
  Check,
  Settings,
  Mail,
  Phone,
  Camera,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
import { syncManager } from "../syncManager";
import MarketAnalysisChart from "../components/MarketAnalysisChart";
import StaticMapPreview from "../components/StaticMapPreview";

export default function DealerView({
  user,
  activeTab,
}: {
  user: User;
  activeTab: "dashboard" | "activity" | "profile";
}) {
  const [search, setSearch] = useState("");
  const [bidModalReq, setBidModalReq] = useState<TransportRequest | null>(null);
  const [bidPrice, setBidPrice] = useState("");

  // SADC Marketplace buy & sell forms
  const [showAdvertForm, setShowAdvertForm] = useState(false);
  const [advTitle, setAdvTitle] = useState("");
  const [advPrice, setAdvPrice] = useState("");
  const [advType, setAdvType] = useState<"ProduceSale" | "DealerBuyRequest">(
    "DealerBuyRequest",
  );
  const [advDesc, setAdvDesc] = useState("");
  const [advImage, setAdvImage] = useState<string | null>(null);

  // Settings / Profile states
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phoneNumber);
  const [editEmail, setEditEmail] = useState(user.email || "");
  const [editLocation, setEditLocation] = useState(user.location || "");
  const [editLookingFor, setEditLookingFor] = useState(
    user.cropLookingFor || "",
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch reactive Dexie datasets
  const activeRequests =
    useLiveQuery(() =>
      db.transportRequests
        .where("status")
        .equals("Open")
        .reverse()
        .sortBy("createdAt"),
    ) || [];
  const myBids =
    useLiveQuery(() => db.bids.where("bidderId").equals(user.id!).toArray()) ||
    [];
  const globalBids = useLiveQuery(() => db.bids.toArray()) || [];
  const globalAdverts = useLiveQuery(() => db.adverts.toArray()) || [];
  const allUsers = useLiveQuery(() => db.users.toArray()) || [];

  useEffect(() => {
    setEditName(user.name);
    setEditPhone(user.phoneNumber);
    setEditEmail(user.email || "");
    setEditLocation(user.location || "");
    setEditLookingFor(user.cropLookingFor || "");
  }, [user]);

  const filteredRequests = activeRequests.filter((req) =>
    req.cropName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAcceptBid = async (bid: Bid) => {
    await dataAccess.bids.update(bid.id!, { status: "Accepted" });
    syncManager.triggerSync();
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidModalReq) return;

    await dataAccess.bids.create({
      requestId: bidModalReq.id!,
      bidderId: user.id!,
      bidderName: user.name,
      bidderRole: "Dealer",
      offerPrice: Number(bidPrice),
      status: "Pending",
    });

    setBidModalReq(null);
    setBidPrice("");
  };

  const handleAdvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await db.adverts.add({
      authorId: user.id!,
      authorName: user.name,
      authorRole: "Dealer",
      title: advTitle,
      description: advDesc,
      price: Number(advPrice),
      image: advImage || undefined,
      timestamp: Date.now(),
      type: advType,
    });

    setAdvTitle("");
    setAdvPrice("");
    setAdvDesc("");
    setAdvImage(null);
    setShowAdvertForm(false);
    syncManager.triggerSync();
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 500;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAdvImage(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await dataAccess.profiles.update(user.id!, {
      name: editName,
      phoneNumber: editPhone,
      email: editEmail,
      location: editLocation,
      cropLookingFor: editLookingFor,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Split adverts for SADC Dealers Tab 1
  const productsWeAreSelling = globalAdverts.filter(
    (adv) => adv.authorRole === "Dealer" && adv.type === "ProduceSale",
  );
  const productsWeAreProcuring = globalAdverts.filter(
    (adv) => adv.type === "DealerBuyRequest",
  );

  return (
    <div className="space-y-6 text-left">
      {/* 1. Market: Dealers double-sided interface */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Dealer Trading Stand
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Procure bulk harvests, hire transit, and showcase stand volumes.
            </p>
          </header>

          {/* SADC Search across active smallholder yields */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search active smallholder grain yields (Maize, Soya...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-205 rounded-xl py-2.5 pl-9 pr-4 text-xs font-semibold outline-none focus:border-amber-500 shadow-3xs"
            />
          </div>

          {/* Sourcing & Advertising Panel */}
          <section className="bg-white p-5 rounded-2xl border border-slate-205 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag size={16} className="text-amber-650" /> Publish
                Buy/Sell Tenders
              </h3>
              <button
                onClick={() => setShowAdvertForm(!showAdvertForm)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-colors"
              >
                {showAdvertForm ? "Close Tender" : "New Ad / Tender"}
              </button>
            </div>

            {showAdvertForm && (
              <form
                onSubmit={handleAdvertSubmit}
                className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3"
              >
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">
                    Tender Class
                  </label>
                  <select
                    value={advType}
                    onChange={(e) =>
                      setAdvType(
                        e.target.value as "ProduceSale" | "DealerBuyRequest",
                      )
                    }
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                  >
                    <option value="DealerBuyRequest">
                      Buy Request (Procuring Target)
                    </option>
                    <option value="ProduceSale">
                      Produce Sale (Selling Crops)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">
                      Tender Title
                    </label>
                    <input
                      required
                      placeholder="e.g. Seeking 50T Red Sorghum"
                      value={advTitle}
                      onChange={(e) => setAdvTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">
                      Pricing Goal (USD)
                    </label>
                    <input
                      required
                      type="number"
                      placeholder="Value per Tonne"
                      value={advPrice}
                      onChange={(e) => setAdvPrice(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">
                    Requirement specs / Details
                  </label>
                  <textarea
                    required
                    placeholder="Water content specs, baggage types, pickup coordinates..."
                    value={advDesc}
                    onChange={(e) => setAdvDesc(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none min-h-[50px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">
                    Attach Sample Photo (Optional)
                  </label>
                  <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center bg-white cursor-pointer relative overflow-hidden h-16 flex items-center justify-center">
                    {advImage ? (
                      <img
                        src={advImage}
                        alt="Crop"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">
                        Snap or share photo
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleImageCapture}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-xl transition-colors"
                >
                  Publish SADC Tenders Broadcast
                </button>
              </form>
            )}

            {/* Display Products We Are Selling & Products We Are Sourcing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
              {/* Stand 1: Products We are Selling */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block">
                  Products We Are Selling ({productsWeAreSelling.length})
                </span>
                {productsWeAreSelling.length === 0 ? (
                  <div className="text-[10px] text-slate-455 italic bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col items-start gap-1">
                    <span>
                      Stand occupies no crop listings. Advertise to load.
                    </span>
                    <button
                      onClick={() => setShowAdvertForm(true)}
                      className="text-amber-700 hover:text-amber-800 text-[9px] font-black uppercase tracking-wider underline cursor-pointer"
                    >
                      Advertise Product Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {productsWeAreSelling.map((p) => {
                      const advBids = globalBids.filter(
                        (b) => b.requestId === p.id && b.status === "Pending",
                      );
                      return (
                      <div
                        key={p.id}
                        className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl"
                      >
                        {p.image && (
                          <img
                            src={p.image}
                            alt={p.title}
                            className="w-full h-20 object-cover rounded-lg mb-1.5"
                          />
                        )}
                        <h4 className="font-extrabold text-slate-800 text-xs">
                          {p.title}
                        </h4>
                        <p className="text-[9px] font-bold text-amber-700 mt-0.5 mb-2">
                          ${p.price} per Tonne
                        </p>
                        
                        {/* Display Bids Made on This Specific Advert */}
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Offers ({advBids.length})
                          </span>
                          {advBids.length === 0 ? (
                            <p className="text-[9px] text-slate-450 italic">
                              No offers yet.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {advBids.map((bid) => (
                                <div
                                  key={bid.id}
                                  className="bg-white rounded border border-slate-200 p-1.5 flex justify-between items-center shadow-3xs"
                                >
                                  <div>
                                    <p className="font-bold text-[10px] text-slate-800">
                                      {bid.bidderName || `User #${bid.bidderId}`}
                                    </p>
                                    <p className="font-extrabold text-slate-800 text-[10px]">
                                      ${bid.offerPrice}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleAcceptBid(bid)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[8px] px-2 py-1 rounded shadow-sm"
                                  >
                                    ACCEPT
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )})}
                  </div>
                )}
              </div>

              {/* Stand 2: Products We are Sourcing / Looking For */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-455 uppercase tracking-widest block font-bold">
                  Products Sourced Column ({productsWeAreProcuring.length})
                </span>
                {productsWeAreProcuring.length === 0 ? (
                  <div className="text-[10px] text-slate-450 italic bg-amber-50/20 border border-amber-100/30 p-3 rounded-xl flex flex-col items-start gap-1">
                    <span>No custom buy targets posted in regional grid.</span>
                    <button
                      onClick={() => setShowAdvertForm(true)}
                      className="text-amber-700 hover:text-amber-800 text-[9px] font-black uppercase tracking-wider underline cursor-pointer"
                    >
                      Post Procurement Target
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {productsWeAreProcuring.map((p) => {
                      const advBids = globalBids.filter(
                        (b) => b.requestId === p.id && b.status === "Pending",
                      );
                      return (
                      <div
                        key={p.id}
                        className="bg-amber-50/40 border border-amber-100/70 p-2.5 rounded-xl"
                      >
                        {p.image && (
                          <img
                            src={p.image}
                            alt={p.title}
                            className="w-full h-20 object-cover rounded-lg mb-1.5"
                          />
                        )}
                        <h4 className="font-bold text-slate-800 text-xs">
                          {p.title}
                        </h4>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {p.description.substring(0, 48)}...
                        </p>
                        <p className="text-[9px] font-extrabold text-slate-800 mt-1 mb-2">
                          Buying Target: ${p.price}
                        </p>

                        {/* Display Bids Made on This Specific Advert */}
                        <div className="pt-2 border-t border-amber-200">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Offers ({advBids.length})
                          </span>
                          {advBids.length === 0 ? (
                            <p className="text-[9px] text-slate-450 italic">
                              No offers yet.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {advBids.map((bid) => (
                                <div
                                  key={bid.id}
                                  className="bg-white rounded border border-amber-200 p-1.5 flex justify-between items-center shadow-3xs"
                                >
                                  <div>
                                    <p className="font-bold text-[10px] text-slate-800">
                                      {bid.bidderName || `User #${bid.bidderId}`}
                                    </p>
                                    <p className="font-extrabold text-slate-800 text-[10px]">
                                      ${bid.offerPrice}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleAcceptBid(bid)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[8px] px-2 py-1 rounded shadow-sm"
                                  >
                                    ACCEPT
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Active harvests to buy directly */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Leaf size={14} className="text-amber-600" /> Procurement
              Smallholder yields ({filteredRequests.length})
            </h2>

            {filteredRequests.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-4 w-full">
                <span>
                  No active smallholder harvest yield matches found matching
                  your current filters.
                </span>
                <button
                  onClick={() => setSearch("")}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-3xs cursor-pointer"
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req) => {
                  const activeBid = myBids.find((b) => b.requestId === req.id);
                  return (
                    <div
                      key={req.id}
                      className="bg-white rounded-2xl p-4 border border-slate-205 shadow-3xs text-left relative overflow-hidden"
                    >
                      {activeBid && (
                        <span className="absolute top-0 right-0 bg-amber-600 text-slate-950 font-extrabold text-[8px] tracking-widest px-3 py-1 uppercase rounded-bl-lg">
                          Buying Tender Sent
                        </span>
                      )}

                      <div className="flex gap-3 justify-between items-start mb-3">
                        <div className="flex gap-2">
                          {req.image && (
                            <img
                              src={req.image}
                              alt="Crop"
                              className="w-12 h-12 rounded-xl object-cover border border-slate-150 flex-shrink-0"
                            />
                          )}
                          <div>
                            <span className="bg-amber-55 text-slate-950 border border-amber-200 font-bold text-[8px] px-1.5 py-0.5 rounded-full uppercase">
                              🌾 Farm Bulk
                            </span>
                            <h3 className="font-extrabold text-slate-800 text-sm mt-1">
                              {req.cropName} yield
                            </h3>
                            <p className="text-[10px] text-slate-450 font-semibold mt-0.5">
                              Seller: {req.farmerName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider text-slate-400">
                            Target Budget
                          </p>
                          <p className="font-extrabold text-slate-800 text-sm">
                            ${req.targetPrice}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2 px-3 rounded-xl text-[11px] font-medium text-slate-600 flex items-center gap-2 mb-3">
                        <MapPin size={12} className="text-slate-400" />
                        <span className="truncate">
                          {req.origin} → {req.destination}
                        </span>
                      </div>

                      <div className="mb-4 text-center">
                        <StaticMapPreview
                          originCoords={[17.82, -25.9]}
                          destCoords={[20.5, -30.2]}
                          height={80}
                          width={280}
                        />
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-105 px-2 py-1 rounded-md">
                          Weight: {req.quantity} {req.unit}
                        </span>

                        {!activeBid ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setBidModalReq(req);
                                setBidPrice(req.targetPrice.toString());
                              }}
                              className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl transition-all"
                            >
                              Negotiate Buy Rate
                            </button>
                            <button
                              onClick={() => {
                                dataAccess.bids.create({
                                  requestId: req.id!,
                                  bidderId: user.id!,
                                  bidderName: user.name,
                                  bidderRole: "Dealer",
                                  offerPrice: req.targetPrice,
                                  status: "Pending",
                                });
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl transition-all animate-pulse"
                            >
                              Direct Buy (${req.targetPrice})
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
                            ✓ Negotiation rate of ${activeBid.offerPrice}{" "}
                            submitted offline
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <MarketAnalysisChart
                          bids={globalBids.filter(
                            (b) => b.requestId === req.id,
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 2. Activities: Where interaction with Farmers and Transporters are located */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Dealer Activities
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Procurement contracts, bids accepted, and shipper coordination.
            </p>
          </header>

          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              Your Bids & Purchases ({myBids.length})
            </h2>

            {myBids.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-205 shadow-sm text-xs text-slate-400 text-center">
                No purchases or negotiation bids initiated today.
              </div>
            ) : (
              <div className="space-y-3">
                {myBids.map((bid) => {
                  const targetReq = activeRequests.find(
                    (r) => r.id === bid.requestId,
                  );
                  const targetAdv = globalAdverts.find(
                    (a) => a.id === bid.requestId,
                  );
                  const clientUser = allUsers.find(
                    (u) =>
                      u.id === targetReq?.farmerId ||
                      u.id === targetAdv?.authorId,
                  );

                  return (
                    <div
                      key={bid.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-center text-left">
                        <div>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-mono font-bold">
                            Job No: #{bid.requestId}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm mt-1.5">
                            Procurement valuation:{" "}
                            <span className="text-amber-600">
                              ${bid.offerPrice}
                            </span>
                          </h4>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-bold">
                            Offer date:{" "}
                            {new Date(bid.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2.5 py-1 rounded shadow-3xs uppercase ${bid.status === "Accepted" ? "bg-emerald-100 text-emerald-800" : bid.status === "Rejected" ? "bg-rose-105 text-rose-800" : "bg-amber-100 text-amber-800"}`}
                        >
                          {bid.status}
                        </span>
                      </div>

                      {bid.status === "Accepted" && (
                        <div className="mt-2 bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                          <div className="mb-2">
                            <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                              <Phone size={12} /> Counter-Party Contact Number:
                            </p>
                            <p className="text-sm font-mono text-emerald-900 font-extrabold">
                              {clientUser?.phoneNumber || "Not found"}
                            </p>
                          </div>
                          <div className="flex gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-[9px] leading-relaxed font-medium">
                            <AlertCircle
                              size={14}
                              className="flex-shrink-0 mt-0.5"
                            />
                            <p>
                              Warning: Verify the client externally before
                              transferring funds. The app developers are not
                              responsible or liable for any fraudulent
                              activities occurring off-platform.
                            </p>
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

      {/* 3. Profile: Contains personal and Market details with settings */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Wholesale Center Settings
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Configure storefront details and buyer parameters.
            </p>
          </header>

          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-left">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <Settings size={16} className="text-amber-600" /> Adjust Market
              Profile
            </h2>

            {saveSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold p-3 rounded-xl mb-4 flex items-center gap-1.5">
                <Check size={16} /> Market settings saved and indexed.
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Hub / Store Outlet Name
                </label>
                <input
                  required
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Outlet phone
                  </label>
                  <input
                    required
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    outlet email
                  </label>
                  <input
                    required
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Trading Depot Location
                </label>
                <input
                  required
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Crops Currently Looking To Procure
                </label>
                <input
                  required
                  type="text"
                  value={editLookingFor}
                  onChange={(e) => setEditLookingFor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
              >
                Save Retail & Sourcing Settings
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Bid Modal */}
      {bidModalReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setBidModalReq(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold flex items-center mb-1">
              <Gavel size={18} className="mr-2 text-amber-600" /> Submit
              Purchasing Bid
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Commit an offer for {bidModalReq.quantity} {bidModalReq.unit} of{" "}
              {bidModalReq.cropName}.
            </p>

            <form onSubmit={handlePlaceBid}>
              <div className="mb-4">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Offer Price (USD)
                </label>
                <div className="relative">
                  <DollarSign
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="number"
                    required
                    min="1"
                    value={bidPrice}
                    onChange={(e) => setBidPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-colors active:scale-[0.98]"
              >
                Send Purchasing Offer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
