export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  country?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  experienceLevel?: string;
  teamSize?: string;
  avatar: string;
  role: 'member' | 'guest' | 'admin' | 'enterprise' | 'elite';
  isElite?: boolean;
  eliteSubscription?: {
    status: 'active' | 'expired' | 'canceled';
    amount: number;
    currency: string;
    subscribedAt: string;
    expiresAt: string;
    paymentId?: string;
    orderId?: string;
  };
  authProvider?: 'google' | 'email' | 'demo';
  googleId?: string;
  picture?: string;
  joinedAt: string;
  preferredTheme?: 'liquid-rose' | 'midnight' | 'glitter' | 'bold' | 'edge';
  preferredAccessory?: 'bunny-ears' | 'cyber-headphones' | 'star-clip' | 'hologram-visor' | 'none';
  aiTone?: 'friendly' | 'concise' | 'technical' | 'creative';
  workingHours?: string;
  bio?: string;
  primaryGoal?: string;
  useCase?: string;
  savedPassword?: string;
  documentsCount?: number;
  promptsCount?: number;
}

export interface RegisteredAccount {
  id: string;
  profile: UserProfile;
  lastActive: string;
}

export interface PlatformMetrics {
  totalUsers: number;
  activeToday: number;
  eliteUsers: number;
  totalRevenueINR: number;
  totalDocuments: number;
  totalAiQueries: number;
  serverUptime: string;
  uptimePercentage: number;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  paymentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: 'captured' | 'failed' | 'refunded';
  plan: string;
  createdAt: string;
}
