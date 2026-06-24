/**
 * Types for ShaurmYAN Application
 */

export interface MenuItem {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: number;
  image: string;
  category: 'classic' | 'special' | 'combos' | 'drinks' | 'sides';
  spicyLevel: 0 | 1 | 2 | 3;
  popular: boolean;
  sizes: {
    label: string;
    multiplier: number;
    price: number;
  }[];
  customizations: {
    id: string;
    name: string;
    price: number;
    description: string;
  }[];
}

export interface CartItem {
  id: string; // unique cart entry ID
  menuItem: MenuItem;
  selectedSize: string;
  selectedPrice: number;
  addedCustomizations: string[]; // customization IDs
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: 'card_online' | 'cash_on_delivery';
  items: {
    name: string;
    size: string;
    extras: string[];
    price: number;
    quantity: number;
  }[];
  totalPrice: number;
  status: 'new' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
  createdAt: string;
  notes?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
  approved: boolean;
}

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  popularItems: { name: string; count: number }[];
}
