import React, { useState } from 'react';
import { db, useLiveQuery, dataAccess } from '../db';
import { User, TransportRequest, Bid, Advert } from '../types';
import { 
  Search, Truck, Gavel, FileText, BadgeCheck, Phone, Mail, MapPin, 
  Calendar, DollarSign, Megaphone, Check, X, ShieldAlert, ArrowRight,
  Filter, Tag, Eye, Info, UserCheck, RefreshCw, Send, Sparkles, Building
} from 'lucide-react';
import { syncManager } from '../syncManager';
import StarRating from './StarRating';

interface SADCFeedHubProps {
  currentUser: User;
}

export default function SADCFeedHub({ currentUser }: SADCFeedHubProps) {
  const [hubTab, setHubTab] = useState<'all' | 'requests' | 'carriers' | 'bids' | 'classifieds'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'nearest'>('newest');
  
  // Modal state for placing bids
  const [selectedReq, setSelectedReq] = useState<TransportRequest | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [bidSuccess, setBidSuccess] = useState(false);

  // Quick Bid inline states
  const [quickBidPrices, setQuickBidPrices] = useState<Record<number, string>>({});
  const [successBids, setSuccessBids] = useState<Record<number, boolean>>({});

  const handleQuickBidSubmit = async (reqId: number, basePrice: number, isMatch: boolean) => {
    const customValue = quickBidPrices[reqId];
    const finalPrice = isMatch ? basePrice : Number(customValue);

    if (isNaN(finalPrice) || finalPrice <= 0) {
      alert("Please type a valid custom dollar price.");
      return;
    }

    await dataAccess.bids.create({
      requestId: reqId,
      bidderId: currentUser.id!,
      bidderName: currentUser.name,
      bidderRole: currentUser.userRole === 'Dealer' ? 'Dealer' : 'Transporter',
      offerPrice: finalPrice,
      status: 'Pending',
      timestamp: Date.now()
    });

    setSuccessBids(prev => ({ ...prev, [reqId]: true }));
    syncManager.triggerSync();
  };

  // Live queries 
  const transportRequests = useLiveQuery(() => db.transportRequests.reverse().sortBy('createdAt')) || [];
  const bids = useLiveQuery(() => db.bids.reverse().sortBy('timestamp')) || [];
  const users = useLiveQuery(() => db.users.toArray()) || [];
  const adverts = useLiveQuery(() => db.adverts.reverse().sortBy('timestamp')) || [];

  // Derived transporters profiles
  const carrierUsers = users.filter(u => u.userRole === 'Transporter');

  // Unified chronological history for "All Feed Activities"
  // Combine transport requests, bids, adverts, and verified user profiles into a timeline
  const getTimelineItems = () => {
    const items: Array<{
      id: string;
      type: 'request' | 'bid' | 'advert' | 'carrier_signup';
      timestamp: number;
      title: string;
      description: string;
      metaBadge: string;
      badgeColor: string;
      author: string;
      price?: number;
      details?: any;
    }> = [];

    transportRequests.forEach(req => {
      items.push({
        id: `req-${req.id}`,
        type: 'request',
        timestamp: req.createdAt,
        title: `🌾 Cargo Load Published: ${req.cropName}`,
        description: `Farmer requires transport of ${req.quantity} ${req.unit} from ${req.origin} to ${req.destination}.`,
        metaBadge: req.status === 'Open' ? 'Awaiting Bids' : req.status === 'InProgress' ? 'In Transit' : 'Completed',
        badgeColor: req.status === 'Open' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200',
        author: req.farmerName || 'Registered Farmer',
        price: req.targetPrice,
        details: req
      });
    });

    bids.forEach(bid => {
      const associatedReq = transportRequests.find(r => r.id === bid.requestId);
      const cropText = associatedReq ? `for ${associatedReq.cropName}` : '';
      items.push({
        id: `bid-${bid.id}`,
        type: 'bid',
        timestamp: bid.timestamp,
        title: `🚚 Carrier Proposal Submitted`,
        description: `Bidder offered a rate of $${bid.offerPrice} ${cropText}.`,
        metaBadge: `Bid: ${bid.status}`,
        badgeColor: bid.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : bid.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200',
        author: bid.bidderName || `Carrier ID #${bid.bidderId}`,
        price: bid.offerPrice,
        details: bid
      });
    });

    adverts.forEach(adv => {
      let typeLabel = 'Produce Ad';
      if (adv.type === 'TransportOffer') typeLabel = '🚚 Service Run';
      else if (adv.type === 'DealerBuyRequest') typeLabel = '🏬 Buy Tender';

      items.push({
        id: `adv-${adv.id}`,
        type: 'advert',
        timestamp: adv.timestamp,
        title: `📢 SADC Alliance Classified: ${adv.title}`,
        description: adv.description,
        metaBadge: typeLabel,
        badgeColor: adv.type === 'ProduceSale' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : adv.type === 'TransportOffer' ? 'bg-indigo-100 text-indigo-850 border-indigo-200' : 'bg-amber-50 text-amber-850 border-amber-200',
        author: adv.authorName,
        price: adv.price,
        details: adv
      });
    });

    carrierUsers.forEach(carrier => {
      items.push({
        id: `user-${carrier.id}`,
        type: 'carrier_signup',
        timestamp: (carrier as any).createdAt || Date.now() - 3600000 * 2, // approximation fallback
        title: `🚛 Driver Hub Active: ${carrier.name}`,
        description: `Logistics operator available. Depot Base: ${carrier.location || 'SADC Gateway Hub'}.`,
        metaBadge: carrier.verificationStatus === 'Verified' ? '✓ Verified SADC Driver' : 'Pending Docs',
        badgeColor: carrier.verificationStatus === 'Verified' ? 'bg-emerald-600 text-white border-emerald-700 font-extrabold' : 'bg-slate-100 text-slate-500 border-slate-200',
        author: carrier.name,
        details: carrier
      });
    });

    // Sort newest first
    return items.sort((a, b) => b.timestamp - a.timestamp);
  };

  // Helper function to submit bid inside Feed Hub
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    await dataAccess.bids.create({
      requestId: selectedReq.id!,
      bidderId: currentUser.id!,
      bidderName: currentUser.name,
      bidderRole: currentUser.userRole === 'Dealer' ? 'Dealer' : 'Transporter',
      offerPrice: Number(bidPrice),
      status: 'Pending',
      timestamp: Date.now()
    });

    setBidSuccess(true);
    setTimeout(() => {
      setSelectedReq(null);
      setBidPrice('');
      setBidSuccess(false);
    }, 2000);
    syncManager.triggerSync();
  };

  // Filter handlers for Search Field
  const query = searchQuery.toLowerCase().trim();
  
  const matchesSearch = (text: string) => text.toLowerCase().includes(query);

  const getFilteredRequests = () => {
    return transportRequests.filter(req => 
      matchesSearch(req.cropName) || 
      matchesSearch(req.origin) || 
      matchesSearch(req.destination) || 
      matchesSearch(req.farmerName || '')
    );
  };

  const getFilteredCarriers = () => {
    return carrierUsers.filter(c => 
      matchesSearch(c.name) || 
      matchesSearch(c.location || '') || 
      matchesSearch(c.phoneNumber)
    );
  };

  const getFilteredBids = () => {
    return bids.filter(b => {
      const associatedReq = transportRequests.find(r => r.id === b.requestId);
      const reqMatch = associatedReq ? (
        matchesSearch(associatedReq.cropName) ||
        matchesSearch(associatedReq.origin) ||
        matchesSearch(associatedReq.destination)
      ) : false;
      return (
        matchesSearch(b.bidderName || '') || 
        matchesSearch(b.bidderRole) || 
        matchesSearch(b.status) ||
        reqMatch
      );
    });
  };

  const getFilteredClassifieds = () => {
    return adverts.filter(a => {
      const authorUser = users.find(u => u.id === a.authorId);
      const authorLoc = authorUser ? (authorUser.location || authorUser.farmAddress || '') : '';
      return (
        matchesSearch(a.title) || 
        matchesSearch(a.description) || 
        matchesSearch(a.authorName) ||
        (a.cropName && matchesSearch(a.cropName)) ||
        matchesSearch(authorLoc)
      );
    });
  };

  const getFilteredTimeline = () => {
    const items = getTimelineItems();
    if (!query) return items;
    return items.filter(item => 
      matchesSearch(item.title) || 
      matchesSearch(item.description) || 
      matchesSearch(item.author) ||
      matchesSearch(item.metaBadge)
    );
  };

  // Location heuristic for sorting
  const isNearest = (targetText?: string) => {
    if (!targetText) return false;
    const userLoc = (currentUser.location || currentUser.farmAddress || '').toLowerCase().trim();
    if (!userLoc) return false;
    const keywords = userLoc.split(/[\s,]+/);
    return keywords.some(kw => kw.length > 2 && targetText.toLowerCase().includes(kw));
  };

  // Generic block sorter
  const sortCollection = <T extends any>(
    list: T[],
    getPrice: (item: T) => number | undefined,
    getTimestamp: (item: T) => number,
    getLocationText: (item: T) => string
  ): T[] => {
    const listCopy = [...list];
    if (sortBy === 'newest') {
      return listCopy.sort((a, b) => getTimestamp(b) - getTimestamp(a));
    } else if (sortBy === 'price_low') {
      return listCopy.sort((a, b) => {
        const pa = getPrice(a) ?? Infinity;
        const pb = getPrice(b) ?? Infinity;
        return pa - pb;
      });
    } else if (sortBy === 'nearest') {
      return listCopy.sort((a, b) => {
        const nearA = isNearest(getLocationText(a)) ? 1 : 0;
        const nearB = isNearest(getLocationText(b)) ? 1 : 0;
        if (nearA !== nearB) {
          return nearB - nearA; // nearest first
        }
        return getTimestamp(b) - getTimestamp(a);
      });
    }
    return listCopy;
  };

  const getSortedTimeline = () => {
    const filtered = getFilteredTimeline();
    return sortCollection(
      filtered,
      item => item.price,
      item => item.timestamp,
      item => {
        if (item.type === 'request' && item.details) {
          return `${item.details.origin} ${item.details.destination}`;
        }
        if (item.type === 'carrier_signup' && item.details) {
          return item.details.location || '';
        }
        if (item.type === 'advert' && item.details) {
          const auth = users.find(u => u.id === item.details.authorId);
          return auth ? (auth.location || auth.farmAddress || '') : '';
        }
        return '';
      }
    );
  };

  const getSortedRequests = () => {
    const filtered = getFilteredRequests();
    return sortCollection(
      filtered,
      req => req.targetPrice,
      req => req.createdAt,
      req => `${req.origin} ${req.destination}`
    );
  };

  const getSortedCarriers = () => {
    const filtered = getFilteredCarriers();
    return sortCollection(
      filtered,
      () => undefined,
      c => (c as any).createdAt || 0,
      c => c.location || ''
    );
  };

  const getSortedBids = () => {
    const filtered = getFilteredBids();
    return sortCollection(
      filtered,
      b => b.offerPrice,
      b => b.timestamp,
      b => {
        const req = transportRequests.find(r => r.id === b.requestId);
        return req ? `${req.origin} ${req.destination}` : '';
      }
    );
  };

  const getSortedClassifieds = () => {
    const filtered = getFilteredClassifieds();
    return sortCollection(
      filtered,
      a => a.price,
      a => a.timestamp,
      a => {
        const auth = users.find(u => u.id === a.authorId);
        return auth ? (auth.location || auth.farmAddress || '') : '';
      }
    );
  };

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Feed Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-indigo-800 text-white rounded-3xl p-6 shadow-sm border border-emerald-600/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-6 opacity-10">
          <Truck size={240} className="stroke-white" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold border border-emerald-400/20 text-emerald-300">
            <Sparkles size={13} />
            <span>AgriPulse SADC Global Hub</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight font-sans">SADC Logistics & Discovery Feed</h1>
          <p className="text-xs text-emerald-100 max-w-md leading-relaxed">
            Interconnecting local smallholders, regional truckers, and wholesale market agents instantly. Search harvests, negotiate contracts, and inspect driver verification lists.
          </p>
        </div>
      </div>

      {/* Global Interactive Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Lookup crops, driver base stations, cities, carriers, or cargo routes..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium outline-none shadow-sm transition-all text-slate-800 placeholder-slate-400"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 font-mono text-xs font-bold"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Feed Category Nav Controls */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-1.5 rounded-2xl gap-1 overflow-x-auto scrollbar-none z-20">
        <button 
          onClick={() => setHubTab('all')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all whitespace-nowrap uppercase ${hubTab === 'all' ? 'bg-white text-slate-900 shadow-3xs border border-slate-200' : 'text-slate-505 hover:text-slate-800'}`}
        >
          <RefreshCw size={13} className={hubTab === 'all' ? 'text-emerald-600' : ''} />
          Combined Feed
        </button>
        
        <button 
          onClick={() => setHubTab('requests')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all whitespace-nowrap uppercase ${hubTab === 'requests' ? 'bg-white text-slate-900 shadow-3xs border border-slate-200' : 'text-slate-505 hover:text-slate-800'}`}
        >
          <FileText size={13} className={hubTab === 'requests' ? 'text-emerald-600' : ''} />
          🌾 Cargo Requests ({getFilteredRequests().length})
        </button>

        <button 
          onClick={() => setHubTab('carriers')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all whitespace-nowrap uppercase ${hubTab === 'carriers' ? 'bg-white text-slate-900 shadow-3xs border border-slate-200' : 'text-slate-505 hover:text-slate-800'}`}
        >
          <Truck size={13} className={hubTab === 'carriers' ? 'text-indigo-600' : ''} />
          🚚 Carrier Lists ({getFilteredCarriers().length})
        </button>

        <button 
          onClick={() => setHubTab('bids')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all whitespace-nowrap uppercase ${hubTab === 'bids' ? 'bg-white text-slate-900 shadow-3xs border border-slate-200' : 'text-slate-505 hover:text-slate-800'}`}
        >
          <Gavel size={13} className={hubTab === 'bids' ? 'text-amber-600' : ''} />
          💬 Live Bids ({getFilteredBids().length})
        </button>

        <button 
          onClick={() => setHubTab('classifieds')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all whitespace-nowrap uppercase ${hubTab === 'classifieds' ? 'bg-white text-slate-900 shadow-3xs border border-slate-200' : 'text-slate-505 hover:text-slate-800'}`}
        >
          <Megaphone size={13} className={hubTab === 'classifieds' ? 'text-slate-600' : ''} />
          📢 Classified Ads ({getFilteredClassifieds().length})
        </button>
      </div>

      {/* Control bar for Sorting and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
        <div className="text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">ACTIVE SELECTION RESULT</span>
          <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
            {hubTab === 'all' && `Showing ${getSortedTimeline().length} Activity Events`}
            {hubTab === 'requests' && `Showing ${getSortedRequests().length} Open Cargo Sacks`}
            {hubTab === 'carriers' && `Showing ${getSortedCarriers().length} Registered Driver Hubs`}
            {hubTab === 'bids' && `Showing ${getSortedBids().length} Transit Negotiation Bids`}
            {hubTab === 'classifieds' && `Showing ${getSortedClassifieds().length} Verified SADC Ads`}
          </h3>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Filter size={12} className="text-emerald-600" /> Sort Feed:
          </label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'newest' | 'price_low' | 'nearest')}
            className="bg-slate-50 border border-slate-200 text-slate-850 hover:border-slate-350 text-xs rounded-xl px-3 py-2 outline-none font-bold w-full sm:w-44 shadow-3xs cursor-pointer"
          >
            <option value="newest">🕒 Newest First</option>
            <option value="price_low">💰 Lowest Price</option>
            <option value="nearest">📍 Nearest (Local First)</option>
          </select>
        </div>
      </div>

      {/* Main Tab Rendering Block */}
      <div className="space-y-4">
        
        {/* TAB 1: ALL COMBINED FEED TIMELINE */}
        {hubTab === 'all' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chronological Feed Pipeline ({getSortedTimeline().length} events)</span>
            </div>

            {getSortedTimeline().length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-4">
                <ShieldAlert size={28} className="text-slate-300" />
                <span>No active discovery signals matched your search criteria. Try modifying your keyphrase or register a listing.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {getSortedTimeline().map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs hover:border-slate-300 transition-all flex gap-3 text-left">
                    <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center flex-shrink-0 text-lg">
                      {item.type === 'request' && '🌾'}
                      {item.type === 'bid' && '💬'}
                      {item.type === 'advert' && '📢'}
                      {item.type === 'carrier_signup' && '🚚'}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">{item.title}</h4>
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded border ${item.badgeColor}`}>
                          {item.metaBadge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 leading-normal">{item.description}</p>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[9px] font-medium text-slate-450 mt-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-600">Author: {item.author}</span>
                            {(() => {
                              const authorUser = users.find(u => u.name === item.author);
                              if (authorUser) {
                                return <StarRating rating={authorUser.ratingValue ?? 5.0} count={authorUser.ratingCount ?? 2} size={10} />;
                              }
                              return null;
                            })()}
                          </div>
                          <span>•</span>
                          <span>{new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        {item.price !== undefined && (
                          <span className="font-mono text-[10px] font-extrabold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                            ${item.price} USD
                          </span>
                        )}
                      </div>

                      {/* Interactive Bidding Portal option right in Combined Feed for Open Requests */}
                      {item.type === 'request' && item.details?.status === 'Open' && currentUser.userRole !== 'Farmer' && (
                        <div className="pt-2">
                          {successBids[item.details.id] ? (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 text-[10px] font-bold p-2 rounded-xl flex items-center gap-2">
                              <Check size={14} /> Quick bid registered successfully!
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl flex flex-col sm:flex-row items-center gap-2 justify-between">
                              <div className="flex items-center gap-1 w-full sm:w-auto">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Bid Rate ($):</span>
                                <input 
                                  type="number" 
                                  placeholder={item.details.targetPrice.toString()}
                                  value={quickBidPrices[item.details.id] || ''}
                                  onChange={e => setQuickBidPrices(prev => ({ ...prev, [item.details.id]: e.target.value }))}
                                  className="bg-white border border-slate-350 rounded px-1.5 py-0.5 text-xs text-slate-750 font-bold w-16 outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div className="flex gap-1 w-full sm:w-auto justify-end">
                                <button 
                                  onClick={() => handleQuickBidSubmit(item.details.id, item.details.targetPrice, false)}
                                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] px-2 py-1 rounded transition-colors"
                                >
                                  Quick Bid
                                </button>
                                <button 
                                  onClick={() => handleQuickBidSubmit(item.details.id, item.details.targetPrice, true)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2 py-1 rounded transition-colors"
                                >
                                  Match (${item.details.targetPrice})
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRANSPORT REQUESTS (CARGO LOG) */}
        {hubTab === 'requests' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-2.5">
              <Info size={16} className="text-emerald-700 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Below are the active smallholder harvests needing trucking services in SADC. SADC-registered carriers can coordinate directly or offer customized counter-pricing estimates using the bid utility.
              </p>
            </div>

            {getSortedRequests().length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-4">
                <ShieldAlert size={28} className="text-slate-300" />
                <span>Savannah harvest logistics is fully deployed. No open cargo requests right now.</span>
                <button
                  onClick={() => alert("Please proceed to your dashboard or Farmer View to register a new harvest cargo allocation request.")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-colors shrink-0 shadow-3xs cursor-pointer"
                >
                  Post a New Transport Request
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {getSortedRequests().map(req => {
                  const associatedBids = bids.filter(b => b.requestId === req.id);
                  const alreadyBidded = associatedBids.some(b => b.bidderId === currentUser.id);

                  return (
                    <div key={req.id} className="bg-white rounded-2xl p-4 border border-slate-205 shadow-3xs relative overflow-hidden text-left flex flex-col md:flex-row gap-4">
                      {alreadyBidded && (
                        <span className="absolute top-0 right-0 bg-emerald-500 text-white font-black text-[8px] tracking-widest px-3 py-1 uppercase rounded-bl-lg">
                          My Bid Registered
                        </span>
                      )}

                      {/* Harvest snapshot */}
                      {req.image && (
                        <div className="w-full md:w-32 h-24 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                          <img src={req.image} alt={req.cropName} className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                              🌾 Farm Cargo Block
                            </span>
                            <h3 className="font-extrabold text-slate-900 text-sm mt-1">{req.cropName} yield load</h3>
                            <div className="text-[10px] text-slate-450 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>Offered by smallholder: <strong className="text-slate-700 font-bold">{req.farmerName}</strong></span>
                              {(() => {
                                const shipperUser = users.find(u => u.name === req.farmerName || u.id === req.farmerId);
                                if (shipperUser) {
                                  return <StarRating rating={shipperUser.ratingValue ?? 5.0} count={shipperUser.ratingCount ?? 2} size={10} />;
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Proposed Budget</span>
                            <p className="font-mono font-black text-slate-800 text-base">${req.targetPrice}</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl text-[10px] font-semibold text-slate-600 flex items-center gap-1.5 flex-wrap">
                          <MapPin size={11} className="text-slate-400" />
                          <span className="truncate max-w-[120px]">{req.origin}</span>
                          <span className="text-slate-400">→</span>
                          <span className="truncate max-w-[120px]">{req.destination}</span>
                          <span className="text-slate-300">|</span>
                          <span className="bg-slate-150 px-2 py-0.5 rounded text-[8px] uppercase tracking-wide">
                            {req.quantity} {req.unit}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-[9px] text-slate-400 uppercase tracking-tight">Status: <strong className="text-amber-600">{req.status}</strong></span>
                          
                          {req.status === 'Open' && currentUser.userRole !== 'Farmer' ? (
                            <div className="w-full pt-1">
                              {alreadyBidded || successBids[req.id!] ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 py-1.5 px-3 rounded-xl font-bold block text-center w-full">
                                  ✓ Bid Registered (Awaiting Farmer Approval)
                                </span>
                              ) : (
                                <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl flex flex-col sm:flex-row items-center gap-2 justify-between w-full">
                                  <div className="flex items-center gap-1 w-full sm:w-auto">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-sans">Bid Price ($):</span>
                                    <input 
                                      type="number" 
                                      placeholder={req.targetPrice.toString()}
                                      value={quickBidPrices[req.id!] || ''}
                                      onChange={e => setQuickBidPrices(prev => ({ ...prev, [req.id!]: e.target.value }))}
                                      className="bg-white border border-slate-350 rounded px-1.5 py-0.5 text-xs text-slate-750 font-bold w-16 outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="flex gap-1 w-full sm:w-auto justify-end">
                                    <button 
                                      onClick={() => handleQuickBidSubmit(req.id!, req.targetPrice, false)}
                                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] px-2.5 py-1.5 rounded transition-colors whitespace-nowrap uppercase tracking-wider"
                                    >
                                      Quick Bid
                                    </button>
                                    <button 
                                      onClick={() => handleQuickBidSubmit(req.id!, req.targetPrice, true)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2.5 py-1.5 rounded transition-colors whitespace-nowrap uppercase tracking-wider"
                                    >
                                      Match (${req.targetPrice})
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] italic text-slate-400">Managed under farmer workstation</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VERIFIED SADC DRIVERS LIST (REPRESENTS PUBLIC PROFILES FOR DRIVERS) */}
        {hubTab === 'carriers' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-2.5">
              <BadgeCheck size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                These are active shipping operators and fleet carriers within the regional SADC Alliance, complete with location bases and verification compliance logs. Tap to contact or invite to cargo allocations.
              </p>
            </div>

            {getSortedCarriers().length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-4">
                <ShieldAlert size={28} className="text-slate-300" />
                <span>No active transporters or shipping registries found matching your criteria.</span>
                <button
                  onClick={() => alert("Navigate to 'Directory Registry' to find verified cargo drivers and shipping services.")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-colors shrink-0 shadow-3xs cursor-pointer"
                >
                  Browse Global Directory
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {getSortedCarriers().map(carrier => (
                  <div key={carrier.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                        {carrier.profileImage ? (
                          <img src={carrier.profileImage} alt={carrier.name} className="w-full h-full object-cover" />
                        ) : (
                          '🚚'
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">{carrier.name}</h4>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${carrier.verificationStatus === 'Verified' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-100 text-slate-550'}`}>
                            {carrier.verificationStatus === 'Verified' ? '✓ VERIFIED DRIVER' : 'SADC REGISTRY PENDING'}
                          </span>
                        </div>
                        
                        {/* Driver Trust Rating */}
                        <div className="mt-0.5 mb-1 bg-slate-50/50 inline-block px-2 py-0.5 rounded border border-slate-100">
                          <StarRating rating={carrier.ratingValue ?? 4.8} count={carrier.ratingCount ?? 4} size={10} />
                        </div>

                        <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400" /> Carrier Base: {carrier.location || 'Coordinating hub location'}
                        </p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Logistics SADC Alliance Network Partner</p>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex flex-col sm:items-end gap-1 border-t border-slate-100 sm:border-0 pt-2 sm:pt-0">
                      <span className="text-[9px] text-slate-400 uppercase font-black">Interconnect Link Details</span>
                      <div className="flex gap-2">
                        <a 
                          href={`tel:${carrier.phoneNumber}`}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <Phone size={11} /> Dial Driver
                        </a>
                        {carrier.email && (
                          <a 
                            href={`mailto:${carrier.email}`}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1"
                          >
                            <Mail size={11} /> Email
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LIVE BIDS & PRICE BARGAINS */}
        {hubTab === 'bids' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-2.5">
              <Gavel size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Visualizing interactive negotiation boards and tender bids placed on active SADC crops. Rates reflect local shipping price checks.
              </p>
            </div>

            {getSortedBids().length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-4">
                <ShieldAlert size={28} className="text-slate-300" />
                <span>You have not initiated any bids or negotiation boards yet. Browse active cargo orders to place your first bid!</span>
                <button
                  onClick={() => setHubTab('requests')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-colors shrink-0 shadow-3xs cursor-pointer"
                >
                  Browse Cargo Requests
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {getSortedBids().map(bid => {
                  const correlatedReq = transportRequests.find(r => r.id === bid.requestId);

                  return (
                    <div key={bid.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-3xs text-left">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${bid.bidderRole === 'Transporter' ? 'bg-indigo-50 text-indigo-700 border-indigo-150' : 'bg-amber-50 text-amber-700 border-amber-150'}`}>
                            {bid.bidderRole} Carrier Rate
                          </span>
                          <h4 className="font-extrabold text-slate-800 text-sm mt-1">{bid.bidderName || `Carrier ${bid.bidderId}`}</h4>
                          
                          {/* Bidder Trust Score */}
                          <div className="mt-0.5 mb-1.5 block">
                            {(() => {
                              const bidderUser = users.find(u => u.name === bid.bidderName || u.id === bid.bidderId);
                              if (bidderUser) {
                                return <StarRating rating={bidderUser.ratingValue ?? 4.8} count={bidderUser.ratingCount ?? 2} size={10} />;
                              }
                              return null;
                            })()}
                          </div>

                          <p className="text-[10px] text-indigo-700 font-extrabold mt-0.5">Proposed rate allocation: ${bid.offerPrice} USD</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded shadow-3xs uppercase ${bid.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : bid.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                            {bid.status}
                          </span>
                        </div>
                      </div>

                      {correlatedReq ? (
                        <div className="mt-3.5 bg-slate-50 border border-slate-150 p-2.5 rounded-xl flex items-center justify-between text-[11px] font-medium text-slate-600 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-700">Ref Yield: {correlatedReq.cropName}</span>
                            <span>•</span>
                            <span>Volume: {correlatedReq.quantity} {correlatedReq.unit}</span>
                          </div>
                          <div>
                            <span>Route: {correlatedReq.origin} → {correlatedReq.destination}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[9px] text-slate-400 mt-2">Correlated agricultural cargo record has resolved or cleared.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SADC ALLIANCE CLASSIFIEDS */}
        {hubTab === 'classifieds' && (
          <div className="space-y-4">
            {getSortedClassifieds().length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-4">
                <ShieldAlert size={28} className="text-slate-300" />
                <span>Classified Hub is standing by. No community advertisements registered yet today.</span>
                <button
                  onClick={() => alert("Please proceed to your role-specific dashboard (Farmer, Transporter, or Dealer) to register a new Classified Ad!")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-colors shrink-0 shadow-3xs cursor-pointer"
                >
                  Create Your First Classified Ad
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {getSortedClassifieds().map(adv => (
                  <div key={adv.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs text-left">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className={`text-[8px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${adv.type === 'ProduceSale' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : adv.type === 'TransportOffer' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                          {adv.type === 'ProduceSale' ? 'Farmer Harvest Sale' : adv.type === 'TransportOffer' ? 'Carrier Run Spec' : 'Dealer Procurement'}
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-sm mt-1.5">{adv.title}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">Quoted Amount</span>
                        <p className="font-mono font-black text-slate-800 text-sm">${adv.price}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{adv.description}</p>
                    
                    {adv.image && (
                      <div className="mt-3.5 rounded-xl overflow-hidden border border-slate-200 max-h-48">
                        <img src={adv.image} alt={adv.title} className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-450 font-semibold flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <span>Publisher: {adv.authorName} ({adv.authorRole})</span>
                        {(() => {
                          const sellerUser = users.find(u => u.name === adv.authorName || u.id === adv.authorId);
                          if (sellerUser) {
                            return <StarRating rating={sellerUser.ratingValue ?? 5.0} count={sellerUser.ratingCount ?? 2} size={10} />;
                          }
                          return null;
                        })()}
                      </div>
                      <span>Date: {new Date(adv.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Counter offer Bid Modal within Feed Hub */}
      {selectedReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-left border border-slate-100">
              <button 
                onClick={() => setSelectedReq(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-2 mb-1.5">
                <Gavel className="text-emerald-600" size={20} />
                <h3 className="text-base font-extrabold text-slate-850">Submit SADC Cargo Bid</h3>
              </div>
              <p className="text-xs text-slate-500 leading-normal mb-4">
                You are negotiating transit pricing for <strong className="text-slate-700">{selectedReq.quantity} {selectedReq.unit}</strong> of <strong className="text-emerald-700">{selectedReq.cropName}</strong> requested by {selectedReq.farmerName}.
              </p>
              
              {bidSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-2xl flex items-center gap-2.5 animate-pulse">
                  <Check size={16} /> Fast Carrier Bid Registered Locally! Syncing...
                </div>
              ) : (
                <form onSubmit={handlePlaceBid} className="space-y-4">
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Your Proposed Rate (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input 
                          type="number" 
                          required 
                          min="1" 
                          value={bidPrice} 
                          onChange={e => setBidPrice(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-350 rounded-2xl py-3 pl-8 pr-4 text-sm font-black outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-800"
                        />
                      </div>
                   </div>
                   
                   <button 
                     type="submit" 
                     className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-md transition-colors uppercase tracking-wider"
                   >
                     Submit Cargo Negotiation
                   </button>
                </form>
              )}
           </div>
        </div>
      )}

    </div>
  );
}
