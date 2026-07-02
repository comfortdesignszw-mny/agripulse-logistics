import React, { useEffect, useState } from 'react';
import { User, Advert, Bid, AppNotification } from './types';
import { initDB } from './db';
import { io } from 'socket.io-client';
import CreateAdModal from './components/CreateAdModal';
import ActivityNotifications from './components/ActivityNotifications';
import AllianceMembers from './components/AllianceMembers';
import LandingPage from './components/LandingPage';
import { 
  Truck, Store, Wheat, Plus, LogOut, Settings, 
  User as UserIcon, Shield, Mail, Phone, MapPin, 
  HelpCircle, CheckCircle, Bell, ArrowRight, ThumbsUp, Eye, Search, Filter
} from 'lucide-react';
import SADCInsights from './components/SADCInsights';
import { compressImage } from './lib/imageUtils';

const AVATARS = ['🌾', '🚚', '🏪', '🚜', '🌽', '🚛', '🥬', '🐄', '🥯', '🍞'];

const API_ROOT = '/api/feed';

// Connect to socket.io (will automatically point to server)
const socket = io();

export default function App() {
  const [db, setDb] = useState<any>(null);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sadc_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<'hub' | 'members' | 'settings'>('hub');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; title: string } | null>(null);
  const [avatarUpload, setAvatarUpload] = useState<string | null>(null);

  // Quick bidding state for ads (keep track of which ad is active for bids)
  const [biddingAdId, setBiddingAdId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState('');

  // Login/Register Screen displays
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');

  // Register Fields
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<'Farmer' | 'Transporter' | 'Dealer'>('Farmer');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regAvatar, setRegAvatar] = useState('🌾');
  const [regCropSpec, setRegCropSpec] = useState('');
  const [regCropLooking, setRegCropLooking] = useState('');
  const [regFarmAddr, setRegFarmAddr] = useState('');

  // Toast dispatch
  const triggerToast = (title: string, message: string) => {
    setToast({ title, message });
    setTimeout(() => {
      setToast(null);
    }, 5500);
  };

  // On App Mount: Initialize database and setup syncing
  useEffect(() => {
    let adSub: any, userSub: any, bidSub: any, notifSub: any;

    initDB().then(async (database) => {
      setDb(database);

      // 1. Fetch live SADC database sync payload from the backend container
      try {
        const response = await fetch(`${API_ROOT}/all-data`);
        const result = await response.json();
        if (result.success) {
          // Bulk upsert pulled database metrics into our RxDB local persistent storage
          for (const u of result.users) {
            await database.users.upsert(u);
          }
          for (const ad of result.adverts) {
            await database.adverts.upsert(ad);
          }
          for (const b of result.bids) {
            await database.bids.upsert(b);
          }
          for (const n of result.notifications) {
            await database.notifications.upsert(n);
          }
        }
      } catch (err) {
        console.warn("Express server offline or Postgres uninitialized, relying on local Dexie state.", err);
      }

      // Background utility: auto-archive ads older than 30 days
      try {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const allAds = await database.adverts.toArray();
        for (const ad of allAds) {
          if (ad.timestamp < thirtyDaysAgo && ad.status !== 'Closed') {
            await database.adverts.put({ ...ad, status: 'Closed' });
          }
        }
      } catch (err) {
        console.error("Failed to archive old ads:", err);
      }

      // 2. Reactively subscribe to RxDB collections
       adSub = database.adverts.find().$.subscribe((data: any) => {
        setAdverts(data.map((d: any) => d.toJSON()));
      });

      userSub = database.users.find().$.subscribe((data: any) => {
        const mappedUsers = data.map((d: any) => d.toJSON());
        setMembers(mappedUsers);
        // Refresh currentUser in state if it's updated in IndexedDB (for contacts, role details syncing)
        if (currentUser) {
          const matchingSelf = mappedUsers.find((u: any) => u.id === currentUser.id);
          if (matchingSelf) {
            setCurrentUser(matchingSelf);
            localStorage.setItem('sadc_profile', JSON.stringify(matchingSelf));
          }
        }
      });

      bidSub = database.bids.find().$.subscribe((data: any) => {
        setBids(data.map((d: any) => d.toJSON()));
      });

      notifSub = database.notifications.find().$.subscribe((data: any) => {
        setNotifications(data.map((d: any) => d.toJSON()));
      });

      setLoading(false);
    }).catch((err) => {
      console.error("RxDB init error: ", err);
      setLoading(false);
    });

    // 3. Setup WebSocket connection listeners
    socket.on('db_user_update', async (updatedUser: User) => {
      if (db) await db.users.upsert(updatedUser);
    });

    socket.on('db_advert_update', async (updatedAd: Advert) => {
      if (db) {
        await db.adverts.upsert(updatedAd);
        // Show local top banner alert for new classified ads posted
        if (currentUser && updatedAd.authorId !== currentUser.id) {
          triggerToast("📢 SADC Trade Bulletin", `New classified ad published: ${updatedAd.title}`);
        }
      }
    });

    socket.on('db_bid_update', async (updatedBid: Bid) => {
      if (db) {
        await db.bids.upsert(updatedBid);
        // Trigger live toast notifications for relevant recipient parties
        if (currentUser) {
          const adDoc = await db.adverts.findOne(updatedBid.advertId).exec();
          if (adDoc) {
            const matchingAd = adDoc.toJSON();
            if (updatedBid.bidderId !== currentUser.id && matchingAd.authorId === currentUser.id) {
              triggerToast("💰 Fresh Classified Bid", `${updatedBid.bidderName} placed a bid of $${updatedBid.amount} on "${matchingAd.title}"`);
            }
          }
        }
      }
    });

    socket.on('db_notification_update', async (notif: AppNotification) => {
      if (db) {
        await db.notifications.upsert(notif);
        if (currentUser && notif.userId === currentUser.id && notif.status === 'unread') {
          triggerToast("🔔 Alert Received", notif.message);
        }
      }
    });

    return () => {
      if (adSub) adSub.unsubscribe();
      if (userSub) userSub.unsubscribe();
      if (bidSub) bidSub.unsubscribe();
      if (notifSub) notifSub.unsubscribe();
      socket.off('db_user_update');
      socket.off('db_advert_update');
      socket.off('db_bid_update');
      socket.off('db_notification_update');
    };
  }, [db, currentUser]);

  // Handle Register (Create Account)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim()) {
      alert("Name, Email, and Phone Number are required to join SADC Sourcing Directory.");
      return;
    }

    const newUserId = `user-${crypto.randomUUID().slice(0, 8)}`;
    const freshUser: User = {
      id: newUserId,
      name: regName.trim(),
      role: regRole,
      email: regEmail.trim(),
      phone: regPhone.trim(),
      location: regLocation.trim() || 'SADC Region',
      avatar: regAvatar,
      cropSpecializations: regRole === 'Farmer' ? regCropSpec.trim() : undefined,
      cropLookingFor: regRole === 'Dealer' ? regCropLooking.trim() : undefined,
      farmAddress: regRole === 'Farmer' ? regFarmAddr.trim() : undefined,
      agreedContacts: []
    };

    // Save locally
    localStorage.setItem('sadc_profile', JSON.stringify(freshUser));
    setCurrentUser(freshUser);

    // Write to RxDB & Sync Server Postgres in background
    if (db) {
      await db.users.upsert(freshUser);
    }

    try {
      await fetch(`${API_ROOT}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(freshUser)
      });
    } catch (err) {
      console.error(err);
    }

    // Trigger welcoming system notification
    const systemNotif: AppNotification = {
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      userId: newUserId,
      title: 'Welcome SADC Alliance Member!',
      message: 'Your cryptographic identity is initialized. Search classified ads, connect with transporters, and submit logistics bids securely.',
      type: 'chat_agreed',
      status: 'unread',
      timestamp: Date.now()
    };
    if (db) await db.notifications.upsert(systemNotif);

    // Reset fields
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegLocation('');
    setRegCropSpec('');
    setRegCropLooking('');
    setRegFarmAddr('');

    triggerToast("✨ Account Created Successfully", "Welcome back to SADC Logistics Feed!");
    
    // Redirect immediately to feed hub dashboard
    setActiveTab('hub');
    setAuthView('landing');
  };

  // Perform quick onboarding logins for test agents (One click logins)
  const handleQuickOnboardLogin = async (role: 'Farmer' | 'Transporter' | 'Dealer') => {
    let mockProfile: User;
    if (role === 'Farmer') {
      mockProfile = {
        id: "user-seed-1",
        name: "Tinashe Moyo",
        role: "Farmer",
        email: "tinashe.moyo@sadc-agri.org",
        phone: "+263 77 123 4567",
        location: "Harare, Zimbabwe",
        avatar: "🌾",
        cropSpecializations: "Maize, Soybeans, Tobacco",
        farmAddress: "Plot 12, Enterprise Road, Harare Corridor",
        agreedContacts: []
      };
    } else if (role === 'Transporter') {
      mockProfile = {
        id: "user-seed-2",
        name: "Lindiwe Ndlovu",
        role: "Transporter",
        email: "lindiwe.logistics@sadc-agri.org",
        phone: "+27 82 987 6543",
        location: "Musina, South Africa",
        avatar: "🚚",
        agreedContacts: []
      };
    } else {
      mockProfile = {
        id: "user-seed-3",
        name: "Chipo Mwansa",
        role: "Dealer",
        email: "chipo.mwansa@sadc-agri.org",
        phone: "+260 96 555 1212",
        location: "Lusaka, Zambia",
        avatar: "🏪",
        cropLookingFor: "White Maize, Sugar Beans",
        agreedContacts: []
      };
    }

    localStorage.setItem('sadc_profile', JSON.stringify(mockProfile));
    setCurrentUser(mockProfile);

    // Sync state into local IndexedDB
    if (db) {
      await db.users.upsert(mockProfile);
    }
    try {
      await fetch(`${API_ROOT}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockProfile)
      });
    } catch (err) {
      console.error(err);
    }

    triggerToast("⚡ Verified Pilot Connected", `Logged in securely as ${mockProfile.name} (${mockProfile.role})`);
    setActiveTab('hub');
    setAuthView('landing');
  };

  // Sign out user profile
  const handleSignOut = () => {
    localStorage.removeItem('sadc_profile');
    setCurrentUser(null);
    setAuthView('landing');
    triggerToast("🔒 Session Concluded", "Your credentials have been securely logged out.");
  };

  // Submit classified advertisement
  const handleCreateAdSubmit = async (data: any) => {
    if (!currentUser) return;

    const newAd: Advert = {
      id: `ad-${crypto.randomUUID().slice(0, 8)}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      title: data.title,
      cropName: data.cropName,
      description: data.description,
      price: data.price,
      unitType: data.unitType,
      images: [],
      timestamp: Date.now(),
      type: data.type,
      status: data.status || 'Open'
    };

    // Insert locally in RxDB
    if (db) await db.adverts.insert(newAd);

    // Sync backend container DB
    try {
      await fetch(`${API_ROOT}/adverts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAd)
      });
    } catch (err) {
      console.error(err);
    }

    triggerToast("📢 Classifed Listing Published", `Classified ad "${newAd.title}" is now active.`);
  };

  // Place a classified bid on an ad
  const submitPlaceBid = async (ad: Advert) => {
    if (!currentUser) return;
    const bidValue = parseFloat(bidAmount);
    if (isNaN(bidValue) || bidValue <= 0) {
      alert("Please enter a valid USD bid amount.");
      return;
    }

    const newBidId = `bid-${crypto.randomUUID().slice(0, 8)}`;
    const newBid: Bid = {
      id: newBidId,
      advertId: ad.id,
      advertTitle: ad.title,
      bidderId: currentUser.id,
      bidderName: currentUser.name,
      bidderRole: currentUser.role,
      amount: bidValue,
      status: 'Pending',
      timestamp: Date.now()
    };

    // 1. Save locally
    if (db) await db.bids.insert(newBid);

    // 2. Sync Server
    try {
      await fetch(`${API_ROOT}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBid)
      });
    } catch (err) {
      console.error(err);
    }

    // 3. Create active alert notification for ad author
    const bidNotif: AppNotification = {
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      userId: ad.authorId,
      title: 'New Bid Placed!',
      message: `${currentUser.name} (${currentUser.role}) placed an offer bid of $${bidValue} on your ad "${ad.title}".`,
      type: 'bid_received',
      status: 'unread',
      timestamp: Date.now(),
      relatedId: newBidId
    };

    if (db) await db.notifications.insert(bidNotif);
    try {
      await fetch(`${API_ROOT}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bidNotif)
      });
    } catch (err) {
      console.error(err);
    }

    // Toggle status locally
    setBiddingAdId(null);
    setBidAmount('');
    triggerToast("💰 Bid Lodged", `Your offer bid of $${bidValue} was posted securely.`);
  };

  // Accept a classification bid
  const handleAcceptBid = async (bidId: string) => {
    if (!currentUser) return;
    const bidDoc = bids.find(b => b.id === bidId);
    if (!bidDoc) return;

    // Update Bid status to Accepted
    const updatedBid = { ...bidDoc, status: 'Accepted' as const };
    if (db) {
      const doc = await db.bids.findOne(bidId).exec();
      if (doc) await doc.patch({ status: 'Accepted' });
    }
    try {
      await fetch(`${API_ROOT}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBid)
      });
    } catch (err) {
      console.error(err);
    }

    // Update classified ad status to 'Negotiating' or 'Closed'
    const matchingAd = adverts.find(a => a.id === bidDoc.advertId);
    if (matchingAd) {
      const updatedAd = { ...matchingAd, status: 'Negotiating' };
      if (db) {
        const adDoc = await db.adverts.findOne(matchingAd.id).exec();
        if (adDoc) await adDoc.patch({ status: 'Negotiating' });
      }
      try {
        await fetch(`${API_ROOT}/adverts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedAd)
        });
      } catch (err) {
        console.error(err);
      }
    }

    // Share Contact links mutually! (Add mutually to agreedContacts lists)
    const bidAuthorId = bidDoc.bidderId;
    const currentAgreed = [...(currentUser.agreedContacts || [])];
    if (!currentAgreed.includes(bidAuthorId)) {
      currentAgreed.push(bidAuthorId);
    }

    const updatedMeUserObj = { ...currentUser, agreedContacts: currentAgreed };
    setCurrentUser(updatedMeUserObj);
    localStorage.setItem('sadc_profile', JSON.stringify(updatedMeUserObj));

    if (db) {
      const meDoc = await db.users.findOne(currentUser.id).exec();
      if (meDoc) await meDoc.patch({ agreedContacts: currentAgreed });
    }
    try {
      await fetch(`${API_ROOT}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMeUserObj)
      });
    } catch (err) {
      console.error(err);
    }

    // Pull other user profile doc, modify agreedContacts to add my ID, and sync
    const otherUserObj = members.find(m => m.id === bidAuthorId);
    if (otherUserObj) {
      const otherAgreed = [...(otherUserObj.agreedContacts || [])];
      if (!otherAgreed.includes(currentUser.id)) {
        otherAgreed.push(currentUser.id);
      }
      const updatedOtherUserObj = { ...otherUserObj, agreedContacts: otherAgreed };
      if (db) {
        const otherDoc = await db.users.findOne(bidAuthorId).exec();
        if (otherDoc) await otherDoc.patch({ agreedContacts: otherAgreed });
      }
      try {
        await fetch(`${API_ROOT}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedOtherUserObj)
        });
      } catch (err) {
        console.error(err);
      }
    }

    // Notify bidder
    const acceptNotif: AppNotification = {
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      userId: bidDoc.bidderId,
      title: 'Your SADC Bid Accepted!',
      message: `${currentUser.name} accepted your price offer bid of $${bidDoc.amount} on "${bidDoc.advertTitle}". Contacts have been revealed in Directory under security protocols.`,
      type: 'bid_accepted',
      status: 'unread',
      timestamp: Date.now(),
      relatedId: bidId
    };

    if (db) await db.notifications.upsert(acceptNotif);
    try {
      await fetch(`${API_ROOT}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acceptNotif)
      });
    } catch (err) {
      console.error(err);
    }

    triggerToast("🏆 Trade SADC Linked", "Bid Accepted. Sensitive contact coordinates are now shared with bidder.");
  };

  // Decline bid listing
  const handleRejectBid = async (bidId: string) => {
    const bidDoc = bids.find(b => b.id === bidId);
    if (!bidDoc) return;

    if (db) {
      const doc = await db.bids.findOne(bidId).exec();
      if (doc) await doc.patch({ status: 'Rejected' });
    }
    const updatedBid = { ...bidDoc, status: 'Rejected' as const };
    try {
      await fetch(`${API_ROOT}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBid)
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Direct Connection Request in Directory
  const handleSendContactRequest = async (targetUserId: string) => {
    if (!currentUser) return;
    const targetUser = members.find(m => m.id === targetUserId);
    if (!targetUser) return;

    const requestNotif: AppNotification = {
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      userId: targetUserId,
      title: 'Contact Share Request',
      message: `${currentUser.name} (${currentUser.role}) is requesting to share secure phone, email, and farm coordinates with you to initiate SADC transit coordination.`,
      type: 'chat_requested',
      status: 'unread',
      timestamp: Date.now(),
      relatedId: currentUser.id // track sender ID as relatedId to accept
    };

    if (db) await db.notifications.upsert(requestNotif);
    try {
      await fetch(`${API_ROOT}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestNotif)
      });
    } catch (err) {
      console.error(err);
    }

    triggerToast("🤝 Contact Link Requested", `Security request dispatched to ${targetUser.name}.`);
  };

  // Accept a contact sharing request
  const handleAcceptContactShare = async (otherUserId: string, notifId: string) => {
    if (!currentUser) return;

    // 1. Mark notification as read
    if (db) {
      const nDoc = await db.notifications.findOne(notifId).exec();
      if (nDoc) await nDoc.patch({ status: 'read' });
    }

    // 2. Mutual share additions
    const currentAgreed = [...(currentUser.agreedContacts || [])];
    if (!currentAgreed.includes(otherUserId)) {
      currentAgreed.push(otherUserId);
    }
    const updatedMeUserObj = { ...currentUser, agreedContacts: currentAgreed };
    setCurrentUser(updatedMeUserObj);
    localStorage.setItem('sadc_profile', JSON.stringify(updatedMeUserObj));

    if (db) {
      const meDoc = await db.users.findOne(currentUser.id).exec();
      if (meDoc) await meDoc.patch({ agreedContacts: currentAgreed });
    }
    try {
      await fetch(`${API_ROOT}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMeUserObj)
      });
    } catch (err) {
      console.error(err);
    }

    // update target
    const targetUser = members.find(m => m.id === otherUserId);
    if (targetUser) {
      const otherAgreed = [...(targetUser.agreedContacts || [])];
      if (!otherAgreed.includes(currentUser.id)) {
        otherAgreed.push(currentUser.id);
      }
      const updatedOtherUserObj = { ...targetUser, agreedContacts: otherAgreed };
      if (db) {
        const otherDoc = await db.users.findOne(otherUserId).exec();
        if (otherDoc) await otherDoc.patch({ agreedContacts: otherAgreed });
      }
      try {
        await fetch(`${API_ROOT}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedOtherUserObj)
        });
      } catch (err) {
        console.error(err);
      }
    }

    // Create confirmation alert for recipient
    const successNotif: AppNotification = {
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      userId: otherUserId,
      title: 'Contact Sharing Agreed!',
      message: `${currentUser.name} accepted your invitation! Phone and email details are now revealed inside their secure SADC Member panel.`,
      type: 'chat_agreed',
      status: 'unread',
      timestamp: Date.now()
    };
    if (db) await db.notifications.upsert(successNotif);

    triggerToast("🤝 Contact Link Activated", "Profile coordinates are now linked.");
  };

  const handleRateUser = async (targetUserId: string, newRating: number) => {
    if (!currentUser || !db) return;
    const targetUser = members.find(m => m.id === targetUserId);
    if (!targetUser) return;
    
    // Simple mock average calculation
    const currentRating = targetUser.rating || 0;
    const count = targetUser.ratingsCount || 0;
    const updatedRating = count === 0 ? newRating : ((currentRating * count) + newRating) / (count + 1);
    
    const updatedUser = {
      ...targetUser,
      rating: parseFloat(updatedRating.toFixed(1)),
      ratingsCount: count + 1
    };

    try {
      const doc = await db.users.findOne(targetUserId).exec();
      if (doc) await doc.patch({ rating: updatedUser.rating, ratingsCount: updatedUser.ratingsCount });
      await fetch(`${API_ROOT}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
      triggerToast("⭐ Rating Submitted", `You rated ${targetUser.name} ${newRating} stars.`);
    } catch (err) {
      console.error("Failed to rate user", err);
    }
  };

  // Toggle Classified Ad Status strictly ('Open' | 'Closed')
  const handleToggleAdStatus = async (adId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
    
    if (db) {
      const doc = await db.adverts.findOne(adId).exec();
      if (doc) await doc.patch({ status: nextStatus });
    }

    // Find full advert record & sync server Postgres
    const adDoc = adverts.find(ad => ad.id === adId);
    if (adDoc) {
      const updatedAd = { ...adDoc, status: nextStatus };
      try {
        await fetch(`${API_ROOT}/adverts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedAd)
        });
      } catch (err) {
        console.error(err);
      }
    }

    triggerToast("📝 Classified Updated", `Status is now set to ${nextStatus}.`);
  };

  // Clear currentUser notifications list
  const handleClearNotifications = async () => {
    if (!currentUser || !db) return;
    const unread = notifications.filter(n => n.userId === currentUser.id);
    for (const n of unread) {
      const doc = await db.notifications.findOne(n.id).exec();
      if (doc) await doc.patch({ status: 'read' });
    }
  };

  // Mark single notification read
  const handleMarkNotificationRead = async (id: string) => {
    if (db) {
      const doc = await db.notifications.findOne(id).exec();
      if (doc) await doc.patch({ status: 'read' });
    }
  };

  // Update Settings Profile details (Email, Phone, Location etc)
  const handleSaveSettings = async (updatedFields: any) => {
    if (!currentUser) return;
    const finalizedProfile = { ...currentUser, ...updatedFields };
    if (avatarUpload) {
      finalizedProfile.avatarImage = avatarUpload;
    }
    setCurrentUser(finalizedProfile);
    localStorage.setItem('sadc_profile', JSON.stringify(finalizedProfile));

    if (db) {
      await db.users.upsert(finalizedProfile);
    }
    try {
      await fetch(`${API_ROOT}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalizedProfile)
      });
    } catch (err) {
      console.error(err);
    }

    triggerToast("⚙️ Profile Updates Saved", "Your SADC coordinate settings have been saved and synced back safely.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-emerald-500 border-r-transparent border-b-emerald-500 border-l-transparent" />
        <div className="text-sm font-extrabold font-mono tracking-widest text-emerald-400">CONNECTING SADC REAL-TIME LEDGER...</div>
      </div>
    );
  }

  // GUEST LANDING INDEX
  if (!currentUser) {
    if (authView === 'landing') {
      return (
        <LandingPage
          adverts={adverts}
          onLoginClick={() => setAuthView('login')}
          onRegisterClick={() => setAuthView('register')}
          onQuickLogin={handleQuickOnboardLogin}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        {/* Floating background grids */}
        <div className="absolute inset-0 bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden relative z-10 transition-all p-8 flex flex-col gap-6">
          <div className="text-center">
            <span className="inline-flex w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl shadow-sm border border-emerald-100 items-center justify-center text-3xl mb-4 font-bold select-none">
              🌾
            </span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">SADC AgriPulse Sourcing</h1>
            <p className="text-slate-500 text-xs mt-1">Southern Africa Logistics & Transit Cooperation</p>
          </div>

          {/* VIEW: REGISTER/SIGNUP FORM */}
          {authView === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Profile Avatar Emoji
                </label>
                <div className="flex gap-2 justify-between flex-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {AVATARS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setRegAvatar(emoji)}
                      className={`text-xl p-1.5 rounded-lg border-2 transition-transform active:scale-95 ${regAvatar === emoji ? 'border-emerald-600 bg-emerald-50 scale-105' : 'border-transparent bg-white shadow-sm'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name / Transport Business
                </label>
                <input
                  id="reg-name-field"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g., Tinashe Moyo"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Contact Email Address
                  </label>
                  <input
                    id="reg-email-field"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="tinashe@sadc-agri.org"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Mobile Phone Channel
                  </label>
                  <input
                    id="reg-phone-field"
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g., +263 77 123 4567"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Corridor Location
                </label>
                <input
                  id="reg-loc-field"
                  type="text"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  placeholder="e.g., Harare, Zimbabwe"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-slate-810 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Primary Alliance Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'Farmer', label: '🌾 Farmer' },
                    { val: 'Transporter', label: '🚚 Haulier' },
                    { val: 'Dealer', label: '🏪 Dealer' }
                  ].map(spec => (
                    <button
                      key={spec.val}
                      type="button"
                      onClick={() => setRegRole(spec.val as any)}
                      className={`py-2 text-xs font-bold border-2 rounded-xl transition-all ${regRole === spec.val ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}
                    >
                      {spec.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Farmer Conditional */}
              {regRole === 'Farmer' && (
                <div className="flex flex-col gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-150 animate-fade-in">
                  <div>
                    <label className="block text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                      Crop Specializations
                    </label>
                    <input
                      id="reg-spec-field"
                      type="text"
                      value={regCropSpec}
                      onChange={(e) => setRegCropSpec(e.target.value)}
                      placeholder="e.g., White Maize, Soybeans, Seedlings"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                      SADC Farm Coordinates / Address
                    </label>
                    <input
                      id="reg-farm-field"
                      type="text"
                      value={regFarmAddr}
                      onChange={(e) => setRegFarmAddr(e.target.value)}
                      placeholder="e.g., Plot 15, Mazowe North Valley"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Dealer Conditional */}
              {regRole === 'Dealer' && (
                <div className="flex flex-col gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-150 animate-fade-in">
                  <div>
                    <label className="block text-[9px] font-extrabold text-purple-800 uppercase tracking-wider mb-1">
                      Crops Currently Looking For
                    </label>
                    <input
                      id="reg-look-field"
                      type="text"
                      value={regCropLooking}
                      onChange={(e) => setRegCropLooking(e.target.value)}
                      placeholder="e.g., Sorghum, Dry Beans, Grade-A Maize"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                id="create-profile-submit-btn"
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm transition-colors mt-2"
              >
                Join SADC Sourcing Ledger
              </button>
            </form>
          ) : (
            /* VIEW: LOGIN SCREEN */
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-center">
                  Select Pre-seeded Interactive Pilot:
                </label>
                <div className="flex flex-col gap-2">
                  <button
                    id="login-quick-farmer"
                    onClick={() => handleQuickOnboardLogin('Farmer')}
                    className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left flex items-start justify-between text-xs font-bold transition-all text-slate-700 hover:text-emerald-900 shadow-sm"
                  >
                    <div className="flex gap-2.5 items-center">
                      <span className="text-xl">🌾</span>
                      <div>
                        <div>Tinashe Moyo</div>
                        <div className="text-[10px] text-slate-400 font-normal">Farmer • Zimbabwe</div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="mt-2 text-slate-400" />
                  </button>
                  <button
                    id="login-quick-transporter"
                    onClick={() => handleQuickOnboardLogin('Transporter')}
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left flex items-start justify-between text-xs font-bold transition-all text-slate-700 hover:text-blue-900 shadow-sm"
                  >
                    <div className="flex gap-2.5 items-center">
                      <span className="text-xl">🚚</span>
                      <div>
                        <div>Lindiwe Ndlovu</div>
                        <div className="text-[10px] text-slate-400 font-normal">Transporter • South Africa</div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="mt-2 text-slate-400" />
                  </button>
                  <button
                    id="login-quick-dealer"
                    onClick={() => handleQuickOnboardLogin('Dealer')}
                    className="p-3 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-left flex items-start justify-between text-xs font-bold transition-all text-slate-700 hover:text-purple-900 shadow-sm"
                  >
                    <div className="flex gap-2.5 items-center">
                      <span className="text-xl">🏪</span>
                      <div>
                        <div>Chipo Mwansa</div>
                        <div className="text-[10px] text-slate-400 font-normal">Dealer • Zambia</div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="mt-2 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="text-center font-bold text-xs text-slate-400 tracking-wide uppercase">
                - OR -
              </div>

              <div className="flex flex-col gap-2.5">
                <p className="text-xs text-slate-500 text-center">Don't have a local profile registered yet?</p>
                <button
                  id="go-to-reg-btn"
                  onClick={() => setAuthView('register')}
                  className="w-full py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold border border-emerald-200/50 rounded-xl text-xs transition-colors text-center"
                >
                  Create New Alliance Account
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              id="back-to-landing-btn"
              onClick={() => setAuthView('landing')}
              className="text-slate-400 hover:text-slate-700 font-semibold"
            >
              ← Back to Portal
            </button>
            <span className="text-slate-300">|</span>
            <div className="text-slate-400 flex items-center gap-1 font-semibold">
              <Shield size={12} className="text-emerald-500" /> Shield Lock Active
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 relative select-none">
      {/* Dynamic Toast micro-banner alert */}
      {toast && (
        <div 
          id="system-in-app-toast"
          className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900 text-white border border-slate-750 p-4.5 rounded-2xl shadow-2xl flex gap-3.5 items-start animate-slide-up"
        >
          <span className="text-2xl mt-0.5 shrink-0 select-none">💡</span>
          <div>
            <h4 className="font-extrabold text-sm text-emerald-400">{toast.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Global Brand Header */}
      <header className="bg-emerald-800 text-white px-6 py-4 shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => setAuthView('landing')}>
            <span className="p-2 bg-emerald-900 rounded-xl border border-emerald-700 shadow-sm text-lg font-bold">🌾</span>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none flex items-center gap-1.5">
                AgriPulse Hub
              </h1>
              <span className="text-[10px] text-emerald-300/90 font-bold tracking-widest uppercase">SADC Alliance Network</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Profile Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-emerald-900/60 border border-emerald-700 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white">
              <span className="text-sm">{currentUser.avatar || '👤'}</span>
              <div>
                <p className="font-bold leading-none">{currentUser.name}</p>
                <p className="text-[9px] text-emerald-300 font-extrabold tracking-wider uppercase mt-0.5">{currentUser.role}</p>
              </div>
            </div>

            <button
              id="header-signout-btn"
              onClick={handleSignOut}
              className="p-2 border border-emerald-700 hover:border-emerald-600 bg-emerald-900 hover:bg-emerald-800 text-emerald-250 hover:text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
            >
              <LogOut size={16} /> <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Primary Panels Layout Grid */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Main interactive cockpit (Main Content) */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Navigation Tab selection and classification submission CTA */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                id="tab-hub-btn"
                onClick={() => setActiveTab('hub')}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${activeTab === 'hub' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                📢 SADC Feed Hub
              </button>
              <button
                id="tab-members-btn"
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${activeTab === 'members' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                👥 Alliance Members
              </button>
              <button
                id="tab-settings-btn"
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ⚙️ Settings
              </button>
            </div>

            {/* Post Classified Ad modal trigger */}
            <button
              id="dashboard-open-ad-modal-btn"
              onClick={() => setIsAdModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4.5 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
            >
              <Plus size={16} /> Create Classified Ad
            </button>
          </div>

          {/* TAB: SADC FEED CLASSIFIEDS HUB */}
          {activeTab === 'hub' && (
            <div id="tab-content-hub" className="flex flex-col gap-6">
              
              {/* Visualization Panel */}
              <SADCInsights adverts={adverts} />

              {/* Filter headers inside hub */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800">SADC Feed Hub classifieds</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Active classifieds, logistics requests, and cargo availabilities.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search crops, locations..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-64 shadow-sm"
                    />
                  </div>
                  <div className="relative">
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none shadow-sm"
                    >
                      <option value="All">All Categories</option>
                      <option value="Produce">Produce</option>
                      <option value="Transport Request">Transport Request</option>
                      <option value="TransportOffer">Transport Offer</option>
                      <option value="General Ad">General Ads</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4.5">
                {adverts
                  .filter(ad => {
                    if (filterCategory !== 'All' && ad.type !== filterCategory) return false;
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      return ad.title.toLowerCase().includes(q) || ad.description.toLowerCase().includes(q) || ad.cropName?.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .length === 0 ? (
                  <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-3xl text-slate-400">
                    <Wheat size={40} className="mx-auto text-slate-300 mb-2 stroke-[1.2]" />
                    <p className="font-bold text-sm">No classified listings exist currently.</p>
                    <p className="text-xs mt-1">Adjust filters or create a new ad.</p>
                  </div>
                ) : (
                  adverts
                  .filter(ad => {
                    if (filterCategory !== 'All' && ad.type !== filterCategory) return false;
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      return ad.title.toLowerCase().includes(q) || ad.description.toLowerCase().includes(q) || ad.cropName?.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .sort((a,b) => b.timestamp - a.timestamp).map(ad => {
                    const isOwnAd = ad.authorId === currentUser.id;
                    const isProduce = ad.type === 'Produce';
                    const isTransport = ad.type === 'Transport Request' || ad.type === 'TransportOffer';
                    const bidsCount = bids.filter(b => b.advertId === ad.id).length;

                    return (
                      <div 
                        key={ad.id} 
                        id={`feed-ad-card-${ad.id}`}
                        className="bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border text-lg select-none ${
                              isProduce ? 'bg-emerald-50 border-emerald-150 text-emerald-800' :
                              isTransport ? 'bg-blue-50 border-blue-150 text-blue-800' :
                              'bg-purple-50 border-purple-150 text-purple-800'
                            }`}>
                              {isProduce ? '🌾' : isTransport ? '🚚' : '📦'}
                            </span>
                            <div>
                              <span className="text-[10px] tracking-wider font-extrabold uppercase text-slate-400">
                                {ad.type}
                              </span>
                              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                                {ad.authorName} • <span className="font-mono">{ad.authorRole}</span>
                              </div>
                            </div>
                          </div>

                          {/* Dynamic colored pill badge design based on current status */}
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm select-none border ${
                              ad.status === 'Open' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              ad.status === 'Negotiating' ? 'bg-amber-50 text-amber-805 border-amber-200' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {ad.status}
                            </span>
                            {isOwnAd && (
                              <button
                                id={`toggle-status-ad-${ad.id}`}
                                onClick={() => handleToggleAdStatus(ad.id, ad.status)}
                                className="px-2.5 py-1 text-[11px] border border-slate-350 bg-white hover:bg-slate-50 font-bold rounded-lg transition-colors text-slate-700"
                              >
                                Toggle Status
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Classified details container */}
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-base leading-tight">
                            {ad.title}
                          </h3>
                          {ad.cropName && (
                            <span className="inline-block mt-1 bg-emerald-50 border border-emerald-200/50 text-emerald-850 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              Crop: {ad.cropName}
                            </span>
                          )}
                          <p className="text-sm text-slate-500 mt-2.5 leading-relaxed whitespace-pre-wrap">
                            {ad.description}
                          </p>
                          {ad.images && ad.images.length > 0 && (
                            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                              {ad.images.map((img, idx) => (
                                <img key={idx} src={img} alt={`ad-image-${idx}`} className="h-24 w-24 object-cover rounded-lg border border-slate-200 shrink-0" />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Cargo bidding stats and user role classification checks */}
                        <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/50 -mx-5 -mb-5 px-5 py-3 rounded-b-2xl">
                          <div>
                            {ad.price ? (
                              <div className="font-extrabold text-slate-900 text-sm">
                                ${ad.price.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">/ {ad.unitType || 'unit'}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Open Pricing Bid</span>
                            )}
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Published: {new Date(ad.timestamp).toLocaleString()}
                            </div>
                          </div>

                          {/* Trigger classified bids */}
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-slate-400 font-medium">
                              {bidsCount} Bid{bidsCount !== 1 ? 's' : ''} Posted
                            </span>
                            {!isOwnAd && ad.status !== 'Closed' && (
                              <button
                                id={`open-bid-panel-${ad.id}`}
                                onClick={() => setBiddingAdId(biddingAdId === ad.id ? null : ad.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg transition-all"
                              >
                                Place Bid Offer
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Bid Offer input form block */}
                        {biddingAdId === ad.id && (
                          <div className="border-t border-slate-150 pt-4 mt-2 bg-slate-50 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-end animate-fade-in">
                            <div className="flex-1 w-full">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                                SADC Cargo Price Offer (USD $)
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                                <input
                                  id={`bid-amount-input-${ad.id}`}
                                  type="number"
                                  min="1"
                                  value={bidAmount}
                                  onChange={(e) => setBidAmount(e.target.value)}
                                  placeholder="e.g., 340 (USD)"
                                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>
                            <button
                              id={`send-bid-btn-${ad.id}`}
                              onClick={() => submitPlaceBid(ad)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4.5 py-2.5 rounded-lg transition-all shadow-sm w-full sm:w-auto text-center"
                            >
                              Dispatch Bid
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: MEMBERS */}
          {activeTab === 'members' && (
            <div id="tab-content-members" className="animate-fade-in">
              <AllianceMembers
                members={members}
                bids={bids}
                currentUser={currentUser}
                onSendContactRequest={handleSendContactRequest}
                onRateUser={handleRateUser}
              />
            </div>
          )}

          {/* TAB: SETTINGS & INDIVIDUAL USER ACCOUNTS DETAIL */}
          {activeTab === 'settings' && (
            <div id="tab-content-settings" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Settings size={22} className="text-slate-500" /> Account Security & Profile Coordinates
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Revise your mobile numbers, farm addresses, emails, and specialized cargo.
                </p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  handleSaveSettings({
                    name: fd.get('name') as string,
                    email: fd.get('email') as string,
                    phone: fd.get('phone') as string,
                    location: fd.get('location') as string,
                    cropSpecializations: fd.get('cropSpecializations') as string,
                    cropLookingFor: fd.get('cropLookingFor') as string,
                    farmAddress: fd.get('farmAddress') as string
                  });
                }}
                className="mt-6 flex flex-col gap-5 pt-4 border-t border-slate-100"
              >
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                    Profile Avatar / Corporate Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center text-3xl">
                      {avatarUpload ? (
                        <img src={avatarUpload} alt="preview" className="w-full h-full object-cover" />
                      ) : currentUser.avatarImage ? (
                        <img src={currentUser.avatarImage} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        currentUser.avatar || '👤'
                      )}
                    </div>
                    <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors border border-slate-200">
                      Upload New Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            try {
                              const base64 = await compressImage(e.target.files[0], 400, 400, 0.7);
                              setAvatarUpload(base64);
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }} 
                      />
                    </label>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Registered Name / Corporate Name
                    </label>
                    <input
                      id="set-name-input"
                      name="name"
                      type="text"
                      required
                      defaultValue={currentUser.name}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Account Role (Fixed)
                    </label>
                    <input
                      name="role"
                      type="text"
                      disabled
                      defaultValue={currentUser.role}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm cursor-not-allowed uppercase font-extrabold tracking-wider"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Contact Email Address <span className="text-emerald-600 font-extrabold text-[9px]">(Only Owner View)</span>
                    </label>
                    <input
                      id="set-email-input"
                      name="email"
                      type="email"
                      required
                      defaultValue={currentUser.email}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Mobile Telephone <span className="text-emerald-600 font-extrabold text-[9px]">(Only Owner View)</span>
                    </label>
                    <input
                      id="set-phone-input"
                      name="phone"
                      type="tel"
                      required
                      defaultValue={currentUser.phone}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Geographic Location / Transit Corridor
                  </label>
                  <input
                    id="set-location-input"
                    name="location"
                    type="text"
                    defaultValue={currentUser.location}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none"
                  />
                </div>

                {currentUser.role === 'Farmer' && (
                  <div className="flex flex-col gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-150 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                        Crops Specialize (Produce)
                      </label>
                      <input
                        id="set-spec-input"
                        name="cropSpecializations"
                        type="text"
                        defaultValue={currentUser.cropSpecializations}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                        Physical Farm Coordinates / Addresses <span className="text-emerald-600 font-extrabold text-[9px]">(Only Owner View)</span>
                      </label>
                      <input
                        id="set-addr-input"
                        name="farmAddress"
                        type="text"
                        defaultValue={currentUser.farmAddress}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {currentUser.role === 'Dealer' && (
                  <div className="flex flex-col gap-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-150 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-extrabold text-purple-800 uppercase tracking-wider mb-1">
                        Crops Currently Looking For
                      </label>
                      <input
                        id="set-look-input"
                        name="cropLookingFor"
                        type="text"
                        defaultValue={currentUser.cropLookingFor}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    id="save-settings-submit-btn"
                    type="submit"
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* SIDEBAR OR SECONDARY ACTIONS (Activity Notifications & Direct Pilots) */}
        <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-6">
          <ActivityNotifications
            notifications={notifications}
            bids={bids}
            currentUser={currentUser}
            onAcceptBid={handleAcceptBid}
            onRejectBid={handleRejectBid}
            onClearNotifications={handleClearNotifications}
            onMarkNotificationRead={handleMarkNotificationRead}
            onAcceptContactShare={handleAcceptContactShare}
          />

          {/* SADC system credentials panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
              🛡️ Alliance Security Info
            </h4>
            <div className="text-xs text-slate-500 leading-relaxed flex flex-col gap-2">
              <p>
                To provide SADC food security, AgriPulse masks all personal emails, mobile phone channels, and addresses in the directory.
              </p>
              <p className="font-extrabold text-slate-700">
                Connection channels reveal automatically for both parties once you Accept a bid or mutual Connection shares request.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* REUSABLE CLASSIFIED AD MODAL */}
      <CreateAdModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        onSubmit={handleCreateAdSubmit}
        userRole={currentUser.role}
      />
    </div>
  );
}
