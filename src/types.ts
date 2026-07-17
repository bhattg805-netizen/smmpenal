export interface User {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  role: string; // 'user' | 'admin'
  balance: number;
  status: string; // 'active' | 'suspended'
  customRate: number;
  customProviderUrl?: string | null;
  customProviderKey?: string | null;
  apiKey?: string | null;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  status: string;
  sortOrder: number;
  icon?: string | null;
  createdAt: string;
}

export interface Provider {
  id: number;
  name: string;
  apiUrl: string;
  apiKey: string;
  status: string; // 'active' | 'inactive'
  balance: number;
  createdAt: string;
}

export interface Service {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  pricePerThousand: number;
  minAmount: number;
  maxAmount: number;
  status: string;
  categoryName?: string;
  categoryIcon?: string | null;
  providerId: number | null;
  providerServiceId: string | null;
  icon?: string | null;
}

export interface Order {
  id: number;
  link: string;
  quantity: number;
  charge: number;
  status: string; // 'pending' | 'processing' | 'completed' | 'partial' | 'cancelled' | 'refunded'
  startCount: number;
  remains: number;
  refillStatus: string; // 'none' | 'requested' | 'completed' | 'rejected'
  createdAt: string;
  serviceName?: string;
  userEmail?: string;
  userName?: string | null;
  providerOrderId?: string | null;
  providerName?: string;
}

export interface Payment {
  id: number;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: string;
  createdAt: string;
}

export interface Ticket {
  id: number;
  userId?: number;
  subject: string;
  status: string; // 'open' | 'answered' | 'closed'
  createdAt: string;
  userEmail?: string;
  userName?: string | null;
}

export interface TicketMessage {
  id: number;
  message: string;
  createdAt: string;
  senderName: string | null;
  senderRole: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string; // 'info' | 'success' | 'warning' | 'danger'
  status: string;
  createdAt: string;
}

export interface Coupon {
  id: number;
  code: string;
  discountPercent: number;
  maxUsage: number | null;
  usageCount: number;
  status: string;
  createdAt: string;
}

export interface Affiliate {
  id: number;
  userId: number;
  referralCode: string;
  earnings: number;
  visits: number;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  userEmail?: string;
}

export interface SystemSetting {
  key: string;
  value: string;
}

export interface Blog {
  id: number;
  title: string;
  slug: string;
  content: string;
  authorId: number | null;
  status: string; // 'published' | 'draft'
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  authorName?: string | null;
}

