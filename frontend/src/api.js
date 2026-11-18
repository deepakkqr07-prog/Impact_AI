const API_BASE_URL = '/api';

export const getAuthToken = () => {
  return localStorage.getItem('ipwatch_token');
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('ipwatch_token', token);
  } else {
    localStorage.removeItem('ipwatch_token');
  }
};

export const getStoredUser = () => {
  const user = localStorage.getItem('ipwatch_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem('ipwatch_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('ipwatch_user');
  }
};

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, clear token if it wasn't a login attempt
    if (!endpoint.includes('/auth/login')) {
      setAuthToken(null);
      setStoredUser(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  // Handle binary / blob responses (e.g. CSV download)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    const blob = await response.blob();
    return blob;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || (typeof data === 'string' ? data : 'API Request Failed');
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => apiRequest('/auth/me'),
  getDepartments: () => apiRequest('/auth/departments'),
  getRoles: () => apiRequest('/auth/roles'),

  // Projects
  getProjects: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/projects${query ? `?${query}` : ''}`);
  },
  getProject: (id) => apiRequest(`/projects/${id}`),
  createProject: (data) => apiRequest('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => apiRequest(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => apiRequest(`/projects/${id}`, { method: 'DELETE' }),

  // Sub-resources
  addMilestone: (projectId, data) => apiRequest(`/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
  addExpenditure: (projectId, data) => apiRequest(`/projects/${projectId}/expenditures`, { method: 'POST', body: JSON.stringify(data) }),
  addProgressUpdate: (projectId, data) => apiRequest(`/projects/${projectId}/progress`, { method: 'POST', body: JSON.stringify(data) }),

  // Predictions & Risk
  getModelInfo: () => apiRequest('/predictions/model-info'),
  getCostPredictions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/predictions/cost${query ? `?${query}` : ''}`);
  },
  getDelayPredictions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/predictions/delay${query ? `?${query}` : ''}`);
  },
  recalculatePredictions: (projectId) => apiRequest(`/predictions/recalculate/${projectId}`, { method: 'POST' }),

  getRiskAssessments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/risk/assessments${query ? `?${query}` : ''}`);
  },
  getRiskSummary: () => apiRequest('/risk/summary'),
  getRiskThresholds: () => apiRequest('/risk/thresholds'),
  updateRiskThresholds: (data) => apiRequest('/risk/thresholds', { method: 'PUT', body: JSON.stringify(data) }),

  // Alerts
  getAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/alerts${query ? `?${query}` : ''}`);
  },
  updateAlertStatus: (id, data) => apiRequest(`/alerts/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // Analytics & Reports
  getDashboardSummary: () => apiRequest('/analytics/dashboard-summary'),
  getDashboardCharts: () => apiRequest('/analytics/charts'),
  getReportsData: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/analytics/reports${query ? `?${query}` : ''}`);
  },
  exportCsv: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/analytics/export/csv${query ? `?${query}` : ''}`);
  },

  // Assistant
  askAssistant: (data) => apiRequest('/assistant/query', { method: 'POST', body: JSON.stringify(data) }),

  // Import
  downloadImportTemplate: () => apiRequest('/import/template'),
  previewImport: (formData) => apiRequest('/import/preview', { method: 'POST', body: formData }),
  confirmImport: (data) => apiRequest('/import/confirm', { method: 'POST', body: JSON.stringify(data) }),

  // Users & Audits
  getUsers: () => apiRequest('/users'),
  updateUserRole: (id, data) => apiRequest(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify(data) }),
  updateProfile: (data) => apiRequest('/users/profile/update', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => apiRequest('/users/profile/change-password', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: (limit = 50) => apiRequest(`/users/audit-logs?limit=${limit}`),
};
