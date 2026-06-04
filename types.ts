

// Enums
export enum ItemStatus {
  PENDING = 'Menunggu',
  IN_PROGRESS = 'Proses',
  COMPLETED = 'Selesai',
  CANCELLED = 'Batal'
}

// Deprecated enum for static values, kept for initial seeding
export enum ProductCategory {
  ATASAN = 'Atasan',
  BAWAHAN = 'Bawahan',
  OUTER = 'Outer',
  AKSESORIS = 'Aksesoris',
  LAINNYA = 'Lainnya'
}

// Interfaces
export interface User {
  id?: string;
  username: string;
  email?: string;
  role?: string; // 'admin' | 'staff' | 'owner'
  password: string; // Kept for form state only
}

export interface Product {
  id: string;
  name: string;
  category: string; // Changed to string to support dynamic categories
  cmtPrice: number;
}

export interface SPKMutation {
  id: string;
  spkId: string;
  itemId: string;
  productName: string;
  date: string; // ISO String
  qty: number;
  notes: string;
}

export interface SPKDetail {
  id: string;
  spkId: string;
  productId: string;
  productName: string; // Denormalized for ease of display if product deleted
  cmtPrice: number; // Snapshot of price at time of order
  qty: number;
  completedQty: number; // Track finished goods
  total: number;
  status: ItemStatus;
}

export interface SPK {
  id: string;
  spkNumber: string;
  date: string; // ISO String
  notes: string;
  items: SPKDetail[];
  mutations: SPKMutation[]; // History of production results
  totalAmount: number; // Calculated sum of items
  totalQty: number;
}

// Finance Types
export type TransactionType = 'IN' | 'OUT';
export type TransactionCategory = 'PRODUKSI' | 'OPERASIONAL' | 'BAHAN_BAKU' | 'GAJI' | 'LAINNYA';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: TransactionCategory | string;
  amount: number;
  description: string;
  refId?: string; // Optional: Link to SPK Mutation ID for automated entries
}

// Activity Log Type
export interface ActivityLog {
  id: string;
  username: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'AUTH';
  entity: 'PRODUCT' | 'CATEGORY' | 'SPK' | 'FINANCE' | 'SYSTEM';
  description: string;
  created_at: string;
}

// Notification Types
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

// Navigation Types
export type ViewState = 'DASHBOARD' | 'SPK_LIST' | 'SPK_FORM' | 'SPK_DETAIL' | 'PRODUCTS' | 'FINANCE' | 'REPORTS' | 'ACTIVITY_LOG';

export interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  user: User;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  updateAccount: (u: string, p: string) => void;

  // Products
  products: Product[];
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;

  // Categories
  categories: string[];
  addCategory: (name: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  deleteCategory: (name: string) => void;
  
  // SPK
  spks: SPK[];
  addSPK: (spk: SPK) => void;
  updateSPK: (spk: SPK) => void;
  deleteSPK: (id: string) => void;
  
  updateSPKItemStatus: (spkId: string, itemId: string, status: ItemStatus) => void;
  addMutation: (spkId: string, mutation: Omit<SPKMutation, 'id' | 'spkId'>) => void;
  updateMutation: (spkId: string, mutation: SPKMutation) => void;
  deleteMutation: (spkId: string, mutationId: string) => void;
  
  // Finance Actions
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  
  // Finance Categories
  financeCategories: string[];
  addFinanceCategory: (name: string) => void;
  updateFinanceCategory: (oldName: string, newName: string) => void;
  deleteFinanceCategory: (name: string) => void;

  // Activity Logs
  activityLogs: ActivityLog[];
  fetchActivityLogs: () => Promise<void>;

  currentView: ViewState;
  navigate: (view: ViewState, params?: any) => void;
  viewParams: any;

  // Notification System
  showNotification: (message: string, type: NotificationType) => void;
}