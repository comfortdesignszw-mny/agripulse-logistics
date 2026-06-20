export interface User {
  id: string;
  name: string;
  role: "Farmer" | "Transporter" | "Dealer";
  location?: string;
  cropSpecializations?: string;
  cropLookingFor?: string;
  farmAddress?: string;
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
  type: string;
  status: string;
}

export interface Bid {
  id: string;
  advertId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  status: "Pending" | "Accepted" | "Rejected";
  timestamp: number;
}
