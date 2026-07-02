import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  name: { type: String, required: true },
  email: String,
  phone: String,
  location: String,
  avatar: String,
  cropSpecializations: String,
  cropLookingFor: String,
  farmAddress: String,
  agreedContacts: { type: [String], default: [] }
}, { timestamps: true });

const AdvertSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  authorRole: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  cropName: String,
  description: { type: String, required: true },
  price: Number,
  unitType: String,
  image: String,
  images: { type: [String], default: [] },
  status: { type: String, default: 'Open' },
  timestamp: { type: Number, required: true }
}, { timestamps: true });

const BidSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  advertId: { type: String, required: true },
  advertTitle: String,
  bidderId: { type: String, required: true },
  bidderName: { type: String, required: true },
  bidderRole: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  timestamp: { type: Number, required: true }
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: String,
  type: { type: String, required: true },
  status: { type: String, default: 'unread' },
  timestamp: { type: Number, required: true },
  relatedId: String
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
export const Advert = mongoose.model('Advert', AdvertSchema);
export const Bid = mongoose.model('Bid', BidSchema);
export const Notification = mongoose.model('Notification', NotificationSchema);
