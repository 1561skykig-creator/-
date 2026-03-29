export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: 'admin' | 'user';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  imageUrl: string;
  isAvailable: boolean;
  category: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'cancelled';
  createdAt: any; // Firestore Timestamp
  uid?: string;
}

export interface Review {
  id?: string;
  uid: string;
  authorName: string;
  authorPhoto: string | null;
  content: string;
  rating: number;
  createdAt: any; // Firestore Timestamp
}
