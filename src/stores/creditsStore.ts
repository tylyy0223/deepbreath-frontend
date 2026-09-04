import { create } from 'zustand';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

export interface CreditTx {
  id: number;
  amount: number;
  type: string;
  ref: string;
  note: string;
  balance_after: number;
  created_at: string | null;
}

export interface PricingItem { key: string; label: string; cost: number; unit: string }
export interface Package { id: string; name: string; amount_fen: number; credits: number }

export interface CorporateAccount {
  company: string;
  bank: string;
  account_no: string;
  note: string;
}

export interface CreditOrder {
  order_no: string;
  amount_fen: number;
  credits: number;
  channel: string;
  status: string;
  proof?: boolean;
  corporate_account?: CorporateAccount;
  created_at?: string;
}

interface CreditsState {
  balance: number | null;
  pricing: PricingItem[];
  packages: Package[];
  channels: Record<string, boolean>;
  transactions: CreditTx[];
  txTotal: number;
  orders: CreditOrder[];
  loading: boolean;

  fetchBalance: () => Promise<void>;
  fetchPricing: () => Promise<void>;
  fetchTransactions: (page?: number) => Promise<void>;
  fetchOrders: () => Promise<void>;
  createOrder: (packageId: string | null, amountFen: number | null, channel: string) => Promise<CreditOrder>;
  submitProof: (orderNo: string, proof: string) => Promise<void>;
  redeem: (code: string) => Promise<string>;
}

export const useCreditsStore = create<CreditsState>()((set, get) => ({
  balance: null,
  pricing: [],
  packages: [],
  channels: {},
  transactions: [],
  txTotal: 0,
  orders: [],
  loading: false,

  fetchBalance: async () => {
    try {
      const res = await api.get(ENDPOINTS.CREDITS_BALANCE);
      set({ balance: res.data.data?.balance ?? null });
    } catch { /* silent — 未登录等 */ }
  },

  fetchPricing: async () => {
    try {
      const res = await api.get(ENDPOINTS.CREDITS_PRICING);
      const d = res.data.data || {};
      set({ pricing: d.pricing || [], packages: d.packages || [], channels: d.channels || {} });
    } catch { /* silent */ }
  },

  fetchTransactions: async (page = 1) => {
    set({ loading: true });
    try {
      const res = await api.get(ENDPOINTS.CREDITS_TRANSACTIONS, { params: { page, page_size: 20 } });
      set({ transactions: res.data.data || [], txTotal: res.data.total || 0 });
    } catch {
      set({ transactions: [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchOrders: async () => {
    try {
      const res = await api.get(ENDPOINTS.CREDITS_ORDERS);
      set({ orders: res.data.data || [] });
    } catch { /* silent */ }
  },

  createOrder: async (packageId, amountFen, channel) => {
    const body: Record<string, unknown> = { channel };
    if (packageId) body.package_id = packageId;
    if (amountFen) body.amount_fen = amountFen;
    const res = await api.post(ENDPOINTS.CREDITS_ORDERS, body);
    get().fetchOrders();
    return res.data.data;
  },

  submitProof: async (orderNo, proof) => {
    await api.post(ENDPOINTS.CREDITS_ORDER_PROOF(orderNo), { proof });
    get().fetchOrders();
  },

  redeem: async (code) => {
    const res = await api.post(ENDPOINTS.CREDITS_REDEEM, { code });
    get().fetchBalance();
    get().fetchTransactions();
    return res.data.message || '兑换成功';
  },
}));
