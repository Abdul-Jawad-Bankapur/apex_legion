export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  usn: string;
  meritScore: number;
  skills: string[];
  role: 'student' | 'admin' | 'bidder';
  isVerified: boolean;
  academicData?: any;
}

export interface Item {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  imageUrl: string;
  status: 'available' | 'sold';
  carbonSaved: number;
  createdAt: string;
}

export interface LostFound {
  id: string;
  reporterId: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  type: 'lost' | 'found';
  status: 'active' | 'matched' | 'resolved';
  createdAt: string;
}

export interface Bid {
  id: string;
  studentId: string;
  bidderId: string;
  amount: number;
  equityPercentage: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
