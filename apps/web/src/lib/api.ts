import apiClient from '@/services/apiClient';

/**
 * Base API functions for FINBOOKS.
 * Centralizing fetches as per AI Guidelines.
 */

export const dashboardApi = {
  getMetrics: async () => {
    const response = await apiClient.get('/dashboard/metrics');
    return response.data;
  },
  getAccount: async () => {
    const response = await apiClient.get('/v1/admin/account');
    return response.data;
  },
  updatePassword: async (data: any) => {
    const response = await apiClient.put('/v1/admin/account/password', data);
    return response.data;
  }
};

export const billingApi = {
  createBill: async (data: any) => {
    const response = await apiClient.post('/billing', data);
    return response.data;
  },
  getAccount: async () => {
    const response = await apiClient.get('/v1/admin/account');
    return response.data;
  },
  updatePassword: async (data: any) => {
    const response = await apiClient.put('/v1/admin/account/password', data);
    return response.data;
  }
};

export const inventoryApi = {
  getItems: async () => {
    const response = await apiClient.get('/items');
    return response.data;
  },
  getAccount: async () => {
    const response = await apiClient.get('/v1/admin/account');
    return response.data;
  },
  updatePassword: async (data: any) => {
    const response = await apiClient.put('/v1/admin/account/password', data);
    return response.data;
  }
};

export const tableApi = {
  getTables: async () => {
    const response = await apiClient.get('/tables');
    return response.data;
  },
  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/tables/${id}/status`, { status });
    return response.data;
  },
  getAccount: async () => {
    const response = await apiClient.get('/v1/admin/account');
    return response.data;
  },
  updatePassword: async (data: any) => {
    const response = await apiClient.put('/v1/admin/account/password', data);
    return response.data;
  }
};

export const superAdminApi = {
  getMetrics: async () => {
    const response = await apiClient.get('/v1/admin/dashboard/metrics');
    return response.data;
  },
  getFullMetrics: async () => {
    const response = await apiClient.get('/v1/admin/metrics');
    return response.data;
  },
  getRecentHotels: async () => {
    const response = await apiClient.get('/v1/admin/hotels/recent');
    return response.data;
  },
  getHotels: async (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/v1/admin/hotels${query ? `?${query}` : ''}`);
    return response.data;
  },
  createHotel: async (data: {
    name: string;
    address?: string;
    phone?: string;
    owner_name: string;
    owner_email: string;
    owner_password?: string;
    subscription_plan: string;
    subscription_expires_at: string;
  }) => {
    const response = await apiClient.post('/v1/admin/hotels', data);
    return response.data;
  },
  updateHotelStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/v1/admin/hotels/${id}`, { status });
    return response.data;
  },
  getAuditLogs: async (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/v1/admin/audit-logs${query ? `?${query}` : ''}`);
    return response.data;
  },
  getExportAuditLogsUrl: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';
    return `${apiUrl}/v1/admin/audit-logs/export${query ? `?${query}` : ''}`;
  },

  // CONFIGURATION
  getPaymentMethods: async () => {
    const response = await apiClient.get('/v1/admin/config/payment-methods');
    return response.data;
  },
  addPaymentMethod: async (name: string) => {
    const response = await apiClient.post('/v1/admin/config/payment-methods', { name });
    return response.data;
  },
  removePaymentMethod: async (id: number) => {
    const response = await apiClient.delete(`/v1/admin/config/payment-methods/${id}`);
    return response.data;
  },
  getDefaultUnits: async () => {
    const response = await apiClient.get('/v1/admin/config/default-units');
    return response.data;
  },
  addDefaultUnit: async (data: { name: string; symbol: string; type: string }) => {
    const response = await apiClient.post('/v1/admin/config/default-units', data);
    return response.data;
  },
  removeDefaultUnit: async (id: number) => {
    const response = await apiClient.delete(`/v1/admin/config/default-units/${id}`);
    return response.data;
  },
  getEmailConfig: async () => {
    const response = await apiClient.get('/v1/admin/config/email');
    return response.data;
  },
  updateEmailConfig: async (data: { from_name: string; from_email: string; reply_to: string }) => {
    const response = await apiClient.patch('/v1/admin/config/email', data);
    return response.data;
  },
  getAccount: async () => {
    const response = await apiClient.get('/v1/admin/account');
    return response.data;
  },
  updatePassword: async (data: any) => {
    const response = await apiClient.put('/v1/admin/account/password', data);
    return response.data;
  }
};
