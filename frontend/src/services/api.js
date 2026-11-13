const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getAuthToken() {
  return localStorage.getItem('kalawa_token');
}

export async function apiRequest(endpoint, options = {}) {
  const token = options.customToken || getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    body: options.body && typeof options.body === 'object' ? JSON.stringify(options.body) : options.body,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_e) {
    payload = { message: response.statusText };
  }

  if (!response.ok) {
    const err = new Error(payload?.message || `HTTP Error ${response.status}`);
    err.status = response.status;
    err.code = payload?.code || 'HTTP_ERROR';
    err.details = payload?.details || null;
    err.payload = payload;
    throw err;
  }

  return {
    status: response.status,
    ...payload,
  };
}

export const api = {
  // Auth
  login: (username, password) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: { username, password },
    }),

  getMe: async () => {
    const response = await apiRequest("/auth/me");

    // Backend mengembalikan { success: true, data: req.user }
    return {
      ...response,
      data: response.data,
    };
  },

  getDemoUsers: () => apiRequest("/auth/demo-users"),

  // Overview
  getOverview: () => apiRequest("/overview"),

  // Registry CRUD
  getLookups: () => apiRequest("/registry/lookups"),
  getCustomers: (tipe = "") =>
    apiRequest(
      `/registry/customers${tipe ? `?tipe=${encodeURIComponent(tipe)}` : ""}`
    ),
  createCustomer: (body) =>
    apiRequest("/registry/customers", { method: "POST", body }),
  updateCustomer: (id, body) =>
    apiRequest(`/registry/customers/${id}`, { method: "PUT", body }),
  deleteCustomer: (id) =>
    apiRequest(`/registry/customers/${id}`, { method: "DELETE" }),

  getVehicles: () => apiRequest("/registry/vehicles"),
  createVehicle: (body) =>
    apiRequest("/registry/vehicles", { method: "POST", body }),
  updateVehicle: (id, body) =>
    apiRequest(`/registry/vehicles/${id}`, { method: "PUT", body }),
  deleteVehicle: (id) =>
    apiRequest(`/registry/vehicles/${id}`, { method: "DELETE" }),

  getServices: () => apiRequest("/registry/services"),
  createService: (body) =>
    apiRequest("/registry/services", { method: "POST", body }),
  updateService: (id, body) =>
    apiRequest(`/registry/services/${id}`, { method: "PUT", body }),
  deleteService: (id) =>
    apiRequest(`/registry/services/${id}`, { method: "DELETE" }),

  getSpareparts: (cabangKode = null) => {
    const query = cabangKode
      ? `?cabang_kode=${encodeURIComponent(cabangKode)}`
      : "";

    return apiRequest(`/registry/spareparts${query}`);
  },

  createSparepart: (body) =>
    apiRequest("/registry/spareparts", { method: "POST", body }),
  updateSparepart: (id, body) =>
    apiRequest(`/registry/spareparts/${id}`, { method: "PUT", body }),
  deleteSparepart: (id) =>
    apiRequest(`/registry/spareparts/${id}`, { method: "DELETE" }),

  getSuppliers: () => apiRequest("/registry/suppliers"),
  createSupplier: (body) =>
    apiRequest("/registry/suppliers", { method: "POST", body }),
  updateSupplier: (id, body) =>
    apiRequest(`/registry/suppliers/${id}`, { method: "PUT", body }),
  deleteSupplier: (id) =>
    apiRequest(`/registry/suppliers/${id}`, { method: "DELETE" }),

  // Operations (Work Orders & Payments)
  getWorkOrders: (status = "") =>
    apiRequest(
      `/operations/work-orders${
        status ? `?status=${encodeURIComponent(status)}` : ""
      }`
    ),
  getWorkOrderDetail: (woId) => apiRequest(`/operations/work-orders/${woId}`),
  createWorkOrder: (body) =>
    apiRequest("/operations/work-orders", { method: "POST", body }),
  updateWorkOrder: (woId, body) =>
    apiRequest(`/operations/work-orders/${woId}`, { method: "PATCH", body }),
  addServiceToWo: (woId, body) =>
    apiRequest(`/operations/work-orders/${woId}/services`, {
      method: "POST",
      body,
    }),
  removeServiceFromWo: (woId, itemId) =>
    apiRequest(`/operations/work-orders/${woId}/services/${itemId}`, {
      method: "DELETE",
    }),
  addSparepartToWo: (woId, body) =>
    apiRequest(`/operations/work-orders/${woId}/spareparts`, {
      method: "POST",
      body,
    }),
  removeSparepartFromWo: (woId, itemId) =>
    apiRequest(`/operations/work-orders/${woId}/spareparts/${itemId}`, {
      method: "DELETE",
    }),

  getPayments: () => apiRequest("/operations/payments"),
  createPayment: (body, customToken = null) =>
    apiRequest("/operations/payments", { method: "POST", body, customToken }),

  // Corporate B2B
  getCorporateContracts: () => apiRequest("/corporate/contracts"),
  createCorporateContract: (body) =>
    apiRequest("/corporate/contracts", { method: "POST", body }),
  updateCorporateCreditLimit: (pelangganId, body) =>
    apiRequest(`/corporate/credit-limit/${pelangganId}`, {
      method: "PATCH",
      body,
    }),
  getCollectiveBillings: () => apiRequest("/corporate/collective-billing"),
  createCollectiveInvoice: (body) =>
    apiRequest("/corporate/collective-billing", { method: "POST", body }),
  settleCollectiveInvoice: (id, body) =>
    apiRequest(`/corporate/collective-billing/${id}/settle`, {
      method: "POST",
      body,
    }),

  // Analytics JOIN Reports
  getVehicleHistoryReport: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    ).toString();
    return apiRequest(`/analytics/vehicle-history${qs ? `?${qs}` : ""}`);
  },
  getBranchRevenueReport: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    ).toString();
    return apiRequest(`/analytics/branch-revenue${qs ? `?${qs}` : ""}`);
  },
  getSparepartUsageReport: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    ).toString();
    return apiRequest(`/analytics/sparepart-usage${qs ? `?${qs}` : ""}`);
  },
  getLowStockReport: () => apiRequest("/analytics/low-stock"),

  // Diagnostics
  getDiagnosticsStatus: () => apiRequest("/diagnostics/status"),
  getAuditLogs: (limit = 50) =>
    apiRequest(`/diagnostics/audit-logs?limit=${limit}`),
  resetDatabase: () => apiRequest("/diagnostics/reset-db", { method: "POST" }),
  getRoleTestToken: (role) => apiRequest(`/diagnostics/role-token/${role}`),
};

