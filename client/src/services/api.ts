const getApiBase = (): string => {
  const envUrl =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_API_URL as string | undefined);
  if (!envUrl) return '/api';
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.startsWith('http') && !clean.endsWith('/api') ? `${clean}/api` : clean;
};

const API_BASE = getApiBase();

export class ApiError extends Error {
  status: number;
  errors?: any[];
  constructor(message: string, status: number, errors?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (netErr: any) {
    console.error(`Network error reaching ${url}:`, netErr);
    throw new ApiError(
      `Cannot connect to backend server. Make sure the backend on Render is active.`,
      0
    );
  }

  // Handle CSV / binary download
  if (response.headers.get('content-type')?.includes('text/csv')) {
    const text = await response.text();
    return text as unknown as T;
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = { success: false, message: 'Invalid response from server' };
  }

  if (!response.ok) {
    const errorMessage =
      data.message || (data.errors ? data.errors.map((e: any) => e.message).join(', ') : 'Request failed');
    throw new ApiError(errorMessage, response.status, data.errors);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: any) =>
    request<{ success: boolean; token: string; user: any; flat: any; membership: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { username: string; pin: string; flatCode?: string }) =>
    request<{ success: boolean; token: string; user: any; flat: any; membership: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyPin: (pin: string) =>
    request<{ success: boolean; message: string }>('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  changePin: (currentPin: string, newPin: string) =>
    request<{ success: boolean; message: string }>('/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin }),
    }),

  getMe: () =>
    request<{ success: boolean; user: any; flat: any; membership: any }>('/auth/me'),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  // Dashboard & Balances
  getDashboard: () =>
    request<{ success: boolean; summaryCards: any; memberBalances: any[]; settlementSuggestions: any[]; pendingSettlements: any[]; recentTransactions: any[]; chartData: any[] }>(
      '/balances/dashboard'
    ),

  getFlatBalances: () =>
    request<{ success: boolean; report: any }>('/balances/flat'),

  // Expenses
  getExpenses: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; expenses: any[]; pagination: any }>(
      `/expenses${query ? `?${query}` : ''}`
    );
  },

  createExpense: (payload: any) =>
    request<{ success: boolean; message: string; expense: any }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getExpense: (id: string) =>
    request<{ success: boolean; expense: any }>(`/expenses/${id}`),

  reverseExpense: (id: string, reason: string, pin: string) =>
    request<{ success: boolean; message: string }>(`/expenses/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason, pin }),
    }),

  // Bills
  getBills: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; bills: any[] }>(`/bills${query ? `?${query}` : ''}`);
  },

  createBill: (payload: any) =>
    request<{ success: boolean; message: string; bill: any }>('/bills', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  recordBillPayment: (id: string, payerMembershipId: string, pin: string) =>
    request<{ success: boolean; message: string; bill: any }>(`/bills/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ payerMembershipId, pin }),
    }),

  // Payments / Settlements
  getPayments: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; payments: any[] }>(`/payments${query ? `?${query}` : ''}`);
  },

  createPayment: (payload: any) =>
    request<{ success: boolean; message: string; payment: any }>('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePaymentStatus: (id: string, status: 'Confirmed' | 'Rejected' | 'Cancelled', notes?: string) =>
    request<{ success: boolean; message: string; payment: any }>(`/payments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  // Members
  getMembers: () =>
    request<{ success: boolean; members: any[]; settlementSuggestions: any[] }>('/members'),

  addMember: (payload: any) =>
    request<{ success: boolean; message: string; member: any }>('/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMember: (membershipId: string, payload: any) =>
    request<{ success: boolean; message: string; membership: any }>(`/members/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  resetMemberPin: (membershipId: string, newPin: string) =>
    request<{ success: boolean; message: string }>(`/members/${membershipId}/reset-pin`, {
      method: 'POST',
      body: JSON.stringify({ newPin }),
    }),

  // Reports & Ledger
  getLedger: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; count: number; ledger: any[] }>(
      `/reports/ledger${query ? `?${query}` : ''}`
    );
  },

  downloadLedgerCSV: async (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    const csvData = await request<string>(`/reports/ledger/csv${query ? `?${query}` : ''}`);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Alpha_C42_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  getAuditLogs: () =>
    request<{ success: boolean; logs: any[] }>('/reports/audit'),
};
