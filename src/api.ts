const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('nais_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('nais_auth_token', token);
  } else {
    localStorage.removeItem('nais_auth_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `Server error (${response.status})` };
    }
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string; role?: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  googleLogin: (payload?: { email?: string; name?: string }) =>
    request<{ token: string; user: any }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  pinLogin: (credentials: { userId: string; pin: string }) =>
    request<{ token: string; user: any }>('/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getStaffUsers: () => request<any[]>('/auth/staff-users'),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request<{ user: any }>('/auth/me'),
  switchBranch: (branchId: string) =>
    request<{ success: boolean; branchId: string; branchName: string }>('/auth/switch-branch', {
      method: 'POST',
      body: JSON.stringify({ branchId }),
    }),

  // Branches
  getBranches: () => request<any[]>('/branches'),
  createBranch: (data: any) =>
    request<any>('/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id: string, data: any) =>
    request<any>(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Users
  getUsers: () => request<any[]>('/users'),
  createUser: (data: any) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) =>
    request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Products & Catalog
  getProducts: (params?: {
    school?: string;
    category?: string;
    sector?: string;
    institutionType?: string;
    professionalDomain?: string;
    gender?: string;
    search?: string;
    activeOnly?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.school) query.append('school', params.school);
    if (params?.category) query.append('category', params.category);
    if (params?.sector) query.append('sector', params.sector);
    if (params?.institutionType) query.append('institutionType', params.institutionType);
    if (params?.professionalDomain) query.append('professionalDomain', params.professionalDomain);
    if (params?.gender) query.append('gender', params.gender);
    if (params?.search) query.append('search', params.search);
    if (params?.activeOnly) query.append('activeOnly', 'true');
    return request<any[]>(`/products?${query.toString()}`);
  },
  getSchools: () => request<string[]>('/products/schools'),
  createProduct: (data: any) =>
    request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) =>
    request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateSkuImage: (skuOrVariantId: { sku?: string; variantId?: string; imageUrl: string; imageCategory?: string }) =>
    request<{ success: boolean; sku: string; variantId: string; imageUrl?: string; imageCategory?: string; productName: string }>('/products/sku-image', {
      method: 'POST',
      body: JSON.stringify(skuOrVariantId),
    }),
  bulkUpdateSkuImages: (items: Array<{ sku?: string; filename?: string; imageUrl: string; imageCategory?: string }>, defaultCategory?: string) =>
    request<{ success: boolean; matchedCount: number; updatedSkus: string[]; unmatched: string[] }>('/products/bulk-sku-images', {
      method: 'POST',
      body: JSON.stringify({ items, defaultCategory }),
    }),
  applyCategorySkuImages: (data: { school?: string; category?: string; garmentType?: string; sector?: string; imageUrl: string; imageCategory?: string }) =>
    request<{ success: boolean; count: number; updatedSkus: string[] }>('/products/category-sku-images', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  applyPriceSet: (data: {
    school?: string;
    category?: string;
    sector?: string;
    institutionType?: string;
    professionalDomain?: string;
    garmentType?: string;
    adjustmentType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'SET_BASE';
    percentage?: number;
    fixedAmount?: number;
    targetPrice?: number;
    roundTo?: number;
  }) =>
    request<{ success: boolean; updatedCount: number; variantsUpdated: number }>('/products/price-set', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  setProductPrices: (id: string, data: {
    variants?: any[];
    uniformPrice?: number;
    adjustmentType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
    percentage?: number;
    fixedAmount?: number;
    roundTo?: number;
  }) =>
    request<{ success: boolean; product: any; variantsUpdated: number }>(`/products/${id}/price-set`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Inventory
  getInventory: (params?: { branchId?: string; lowStockOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.lowStockOnly) query.append('lowStockOnly', 'true');
    return request<any[]>(`/inventory?${query.toString()}`);
  },
  adjustInventory: (data: { productId: string; variantId: string; branchId: string; newStock: number; reason: string; notes?: string }) =>
    request<any>('/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),
  getInventoryAlerts: () => request<any[]>('/inventory/alerts'),
  getInventoryMovements: (params?: { branchId?: string; productId?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.productId) query.append('productId', params.productId);
    if (params?.type) query.append('type', params.type);
    return request<any[]>(`/inventory/movements?${query.toString()}`);
  },
  getStockTransfers: (branchId?: string) =>
    request<any[]>(`/inventory/transfers${branchId ? `?branchId=${branchId}` : ''}`),
  createStockTransfer: (data: any) =>
    request<any>('/inventory/transfers', { method: 'POST', body: JSON.stringify(data) }),
  updateTransferStatus: (id: string, status: string) =>
    request<any>(`/inventory/transfers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // POS / Sales
  createSale: (data: any) =>
    request<{ sale: any; receipt: any; qrCodeDataUrl: string }>('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSales: (params?: { branchId?: string; cashierId?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.cashierId) query.append('cashierId', params.cashierId);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    return request<any[]>(`/sales?${query.toString()}`);
  },
  getSale: (id: string) => request<any>(`/sales/${id}`),
  refundSale: (id: string, reason: string) =>
    request<{ success: boolean; sale: any }>(`/sales/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Quotations
  getQuotations: (params?: { branchId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.status) query.append('status', params.status);
    return request<any[]>(`/quotations?${query.toString()}`);
  },
  createQuotation: (data: any) =>
    request<any>('/quotations', { method: 'POST', body: JSON.stringify(data) }),
  convertToInvoice: (id: string) =>
    request<{ success: boolean; invoice: any; quotation: any }>(`/quotations/${id}/convert-to-invoice`, {
      method: 'POST',
    }),
  emailQuotation: (id: string, email?: string) =>
    request<{ success: boolean; sentTo: string }>(`/quotations/${id}/email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Invoices
  getInvoices: (params?: { branchId?: string; status?: string; customerId?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.status) query.append('status', params.status);
    if (params?.customerId) query.append('customerId', params.customerId);
    return request<any[]>(`/invoices?${query.toString()}`);
  },
  createInvoice: (data: any) =>
    request<any>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  recordInvoicePayment: (id: string, data: any) =>
    request<{ success: boolean; invoice: any; receipt: any }>(`/invoices/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  voidInvoice: (id: string, voidReason: string) =>
    request<{ success: boolean; invoice: any }>(`/invoices/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({ voidReason }),
    }),
  emailInvoice: (id: string, email?: string) =>
    request<{ success: boolean; sentTo: string }>(`/invoices/${id}/email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Receipts
  getReceipts: (params?: { branchId?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.search) query.append('search', params.search);
    return request<any[]>(`/receipts?${query.toString()}`);
  },
  emailReceipt: (id: string, email?: string) =>
    request<{ success: boolean }>(`/receipts/${id}/email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Customers
  getCustomers: () => request<any[]>('/customers'),
  createCustomer: (data: any) =>
    request<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) =>
    request<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Suppliers & Purchasing
  getSuppliers: () => request<any[]>('/suppliers'),
  createSupplier: (data: any) =>
    request<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  getPurchases: (params?: { branchId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.status) query.append('status', params.status);
    return request<any[]>(`/purchases?${query.toString()}`);
  },
  createPurchase: (data: any) =>
    request<any>('/purchases', { method: 'POST', body: JSON.stringify(data) }),
  receivePurchase: (id: string) =>
    request<{ success: boolean; po: any }>(`/purchases/${id}/receive`, { method: 'POST' }),

  // Expenses
  getExpenses: (params?: { branchId?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.category) query.append('category', params.category);
    return request<any[]>(`/expenses?${query.toString()}`);
  },
  createExpense: (data: any) =>
    request<any>('/expenses', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getDashboardMetrics: (branchId?: string) =>
    request<any>(`/reports/dashboard${branchId ? `?branchId=${branchId}` : ''}`),
  getProfitLoss: (params?: { branchId?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    return request<any>(`/reports/profit-loss?${query.toString()}`);
  },
  getVatReturn: () => request<any>('/reports/vat-return'),

  // KRA eTIMS
  getKraStatus: () => request<any>('/kra/status'),
  retryQueuedKra: () => request<{ success: boolean; processed: any[]; remainingInQueue: number }>('/kra/retry-queued', { method: 'POST' }),

  // Settings & Audit
  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) =>
    request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getAuditLogs: (params?: { action?: string; entityType?: string }) => {
    const query = new URLSearchParams();
    if (params?.action) query.append('action', params.action);
    if (params?.entityType) query.append('entityType', params.entityType);
    return request<any[]>(`/audit-logs?${query.toString()}`);
  },
  getEmails: () => request<any[]>('/emails'),
  testEmail: (to?: string) =>
    request<any>('/emails/test', { method: 'POST', body: JSON.stringify({ to }) }),
};
