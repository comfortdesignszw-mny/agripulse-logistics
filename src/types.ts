export type Role = 'Farmer' | 'Transporter' | 'Dealer';

export interface User {
  id?: any;
  phoneNumber: string;
  pin: string; // 6-digit PIN
  name: string;
  userRole: Role;
  verificationStatus: 'Pending' | 'Verified' | 'Rejected';
  synced: number; // 0 for false, 1 for true
  email?: string;
  farmAddress?: string;
  location?: string;
  cropSpecializations?: string;
  cropLookingFor?: string;
  profileImage?: string;
  ratingValue?: number;
  ratingCount?: number;
}

export interface KYCDocument {
  id?: any;
  userId: any;
  docType: 'NationalID' | 'DriverLicense' | 'VehicleReg' | 'VehiclePhoto';
  fileDataUrl: string; // Base64 document payload
  synced: number;
}

export interface TransportRequest {
  id?: any;
  farmerId: any;
  farmerName?: string;
  cropName: string;
  quantity: number;
  unit: 'kg' | 'Tonnes';
  origin: string;
  destination: string;
  targetPrice: number;
  status: 'Open' | 'InProgress' | 'Completed';
  synced: number;
  createdAt: number;
  image?: string; // Optional image data representing crop yields
}

export interface Bid {
  id?: any;
  requestId: any;
  bidderId: any;
  bidderName?: string;
  bidderRole: 'Transporter' | 'Dealer';
  offerPrice: number;
  status: 'Pending' | 'Accepted' | 'Rejected';
  timestamp: number;
  expiryTimestamp?: number; // Time-locked expiration
  synced: number;
}

export interface Advert {
  id?: any;
  authorId: any;
  authorName: string;
  authorRole: Role;
  title: string;
  cropName?: string;
  description: string;
  price?: number;
  image?: string; // Base64 crop or service illustration
  timestamp: number;
  type: 'ProduceSale' | 'TransportOffer' | 'DealerBuyRequest';
}

export interface LocalMediaCache {
  id?: any;
  referenceId: any;
  tableContext: string;
  blobType: string;
  dataUrl: string;
  synced: number;
}
