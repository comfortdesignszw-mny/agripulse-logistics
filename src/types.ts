export interface User {
  id: string;
  name: string;
  role: 'Farmer' | 'Transporter' | 'Dealer';
  email?: string;
  phone?: string;
  location?: string;
  avatar?: string;
  avatarImage?: string;
  cropSpecializations?: string;
  cropLookingFor?: string;
  farmAddress?: string;
  agreedContacts?: string[]; // list of user IDs we have mutually shared contacts with
  rating?: number;
  ratingsCount?: number;
}

export interface Advert {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  title: string;
  cropName?: string;
  description: string;
  price?: number;
  unitType?: string;
  image?: string;
  images?: string[];
  timestamp: number;
  type: string; // 'Produce' | 'Transport Request' | 'General Ad'
  status: string; // 'Open' | 'Negotiating' | 'Closed'
}

export interface Bid {
  id: string;
  advertId: string;
  advertTitle: string;
  bidderId: string;
  bidderName: string;
  bidderRole: string;
  amount: number;
  status: 'Pending' | 'Accepted' | 'Rejected';
  timestamp: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'bid_received' | 'bid_accepted' | 'chat_requested' | 'chat_agreed' | 'ad_posted';
  status: 'unread' | 'read';
  timestamp: number;
  relatedId?: string;
}
