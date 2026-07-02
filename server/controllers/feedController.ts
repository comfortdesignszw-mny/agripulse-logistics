import { Response } from 'express';
import { User, Advert, Bid, Notification } from '../models/index';

// Distributed in-memory fallback store
let memoryUsers: any[] = [
  // Setup nice initial seed member users so they are already listed
  {
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
  },
  {
    id: "user-seed-2",
    name: "Lindiwe Ndlovu",
    role: "Transporter",
    email: "lindiwe.logistics@sadc-agri.org",
    phone: "+27 82 987 6543",
    location: "Musina, South Africa",
    avatar: "🚚",
    agreedContacts: []
  },
  {
    id: "user-seed-3",
    name: "Chipo Mwansa",
    role: "Dealer",
    email: "chipo.mwansa@sadc-agri.org",
    phone: "+260 96 555 1212",
    location: "Lusaka, Zambia",
    avatar: "🏪",
    cropLookingFor: "White Maize, Sugar Beans",
    agreedContacts: []
  }
];

let memoryAdverts: any[] = [
  {
    id: "ad-seed-1",
    authorId: "user-seed-1",
    authorName: "Tinashe Moyo",
    authorRole: "Farmer",
    title: "Premium Grade-A White Maize Available",
    cropName: "White Maize",
    description: "Harvested 50 Tonnes of premium white maize. Ready for bulk purchase and clearance. Currently stored in dry silos, Harare.",
    price: 380,
    unitType: "Tonne",
    type: "Produce",
    status: "Open",
    timestamp: Date.now() - 36000000 // 10 hrs ago
  },
  {
    id: "ad-seed-2",
    authorId: "user-seed-2",
    authorName: "Lindiwe Ndlovu",
    authorRole: "Transporter",
    title: "Refrigerated SADC Transit Truck Route",
    description: "Accepting consignments of up to 34 Tonnes from Beitbridge Border Post to Lusaka via Harare. Experience running fresh grain and perishables.",
    type: "Transport Request",
    status: "Open",
    timestamp: Date.now() - 18000000 // 5 hrs ago
  }
];

let memoryBids: any[] = [];
let memoryNotifications: any[] = [];

const isMongoConnected = () => {
  return process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mongodb');
}

// Get all SADC Hub data
export const getAllData = async (req: any, res: Response) => {
  if (!isMongoConnected()) {
    return res.status(200).json({
      success: true,
      users: memoryUsers,
      adverts: memoryAdverts,
      bids: memoryBids,
      notifications: memoryNotifications
    });
  }

  try {
    const users = await User.find({}).lean();
    const adverts = await Advert.find({}).lean();
    const bids = await Bid.find({}).lean();
    const notifications = await Notification.find({}).lean();

    // Map _id to id if necessary, but we store custom id
    const mapDoc = (doc: any) => {
      const { _id, __v, createdAt, updatedAt, ...rest } = doc;
      return rest;
    };

    res.status(200).json({ 
      success: true, 
      users: users.map(mapDoc), 
      adverts: adverts.map(mapDoc), 
      bids: bids.map(mapDoc), 
      notifications: notifications.map(mapDoc) 
    });
  } catch (error) {
    console.error("Error fetching all SADC data from MongoDB:", error);
    res.status(500).json({ success: false, message: "Database Error" });
  }
};

// Sync User Account (Insert/Update)
export const syncUser = async (req: any, res: Response) => {
  const { id, role, name, email, phone, location, avatar, cropSpecializations, cropLookingFor, farmAddress, agreedContacts } = req.body;

  if (!isMongoConnected()) {
    memoryUsers = memoryUsers.filter(u => u.id !== id);
    const updatedUser = { id, role, name, email, phone, location, avatar, cropSpecializations, cropLookingFor, farmAddress, agreedContacts: agreedContacts || [] };
    memoryUsers.push(updatedUser);
    req.io.emit('db_user_update', updatedUser);
    return res.status(201).json({ success: true, data: updatedUser });
  }

  try {
    const updatedUserObj = { id, role, name, email, phone, location, avatar, cropSpecializations, cropLookingFor, farmAddress, agreedContacts: agreedContacts || [] };
    await User.findOneAndUpdate({ id }, updatedUserObj, { upsert: true, new: true });
    req.io.emit('db_user_update', updatedUserObj);
    res.status(200).json({ success: true, data: updatedUserObj });
  } catch (error) {
    console.error("Error UPSERTing user:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Sync Classified Advert (Insert/Update)
export const syncAdvert = async (req: any, res: Response) => {
  const ad = req.body; // complete advert structure

  if (!isMongoConnected()) {
    memoryAdverts = memoryAdverts.filter(x => x.id !== ad.id);
    memoryAdverts.push(ad);
    req.io.emit('db_advert_update', ad);
    return res.status(201).json({ success: true, data: ad });
  }

  try {
    await Advert.findOneAndUpdate({ id: ad.id }, ad, { upsert: true, new: true });
    req.io.emit('db_advert_update', ad);
    res.status(200).json({ success: true, data: ad });
  } catch (error) {
    console.error("Error UPSERTing advert:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Sync Bid (Insert/Update)
export const syncBid = async (req: any, res: Response) => {
  const b = req.body;

  if (!isMongoConnected()) {
    memoryBids = memoryBids.filter(x => x.id !== b.id);
    memoryBids.push(b);
    req.io.emit('db_bid_update', b);
    return res.status(201).json({ success: true, data: b });
  }

  try {
    await Bid.findOneAndUpdate({ id: b.id }, b, { upsert: true, new: true });
    req.io.emit('db_bid_update', b);
    res.status(200).json({ success: true, data: b });
  } catch (error) {
    console.error("Error UPSERTing bid:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Sync Notification (Insert/Update)
export const syncNotification = async (req: any, res: Response) => {
  const n = req.body;

  if (!isMongoConnected()) {
    memoryNotifications = memoryNotifications.filter(x => x.id !== n.id);
    memoryNotifications.push(n);
    req.io.emit('db_notification_update', n);
    return res.status(201).json({ success: true, data: n });
  }

  try {
    await Notification.findOneAndUpdate({ id: n.id }, n, { upsert: true, new: true });
    req.io.emit('db_notification_update', n);
    res.status(200).json({ success: true, data: n });
  } catch (error) {
    console.error("Error UPSERTing notification:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
