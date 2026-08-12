const BASE_URL = ""; // Proxied through Vite → http://localhost:8000

const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    if (!window.location.pathname.endsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error occurred" }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const api = {
  // Auth
  register: async (email, password, fullName) => {
    return apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  },

  login: async (email, password) => {
    // FastAPI expects form-data for OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    localStorage.setItem("token", data.access_token);
    return data;
  },

  logout: () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  },

  getMe: async () => {
    return apiRequest("/api/auth/me");
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },

  // Customers
  getCustomers: async () => {
    return apiRequest("/api/customers");
  },

  getCustomer: async (id) => {
    return apiRequest(`/api/customers/${id}`);
  },

  createCustomer: async (customerData) => {
    return apiRequest("/api/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  },

  updateCustomer: async (id, customerData) => {
    return apiRequest(`/api/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(customerData),
    });
  },

  deleteCustomer: async (id) => {
    return apiRequest(`/api/customers/${id}`, {
      method: "DELETE",
    });
  },

  // Deals
  getDeals: async () => {
    return apiRequest("/api/deals");
  },

  getDeal: async (id) => {
    return apiRequest(`/api/deals/${id}`);
  },

  createDeal: async (dealData) => {
    return apiRequest("/api/deals", {
      method: "POST",
      body: JSON.stringify(dealData),
    });
  },

  updateDeal: async (id, dealData) => {
    return apiRequest(`/api/deals/${id}`, {
      method: "PUT",
      body: JSON.stringify(dealData),
    });
  },

  deleteDeal: async (id) => {
    return apiRequest(`/api/deals/${id}`, {
      method: "DELETE",
    });
  },

  // Conversations
  getConversations: async (dealId) => {
    return apiRequest(`/api/deals/${dealId}/conversations`);
  },

  createConversation: async (dealId, conversationData) => {
    return apiRequest(`/api/deals/${dealId}/conversations`, {
      method: "POST",
      body: JSON.stringify(conversationData),
    });
  },

  // Timeline / Activities
  getTimeline: async (dealId) => {
    return apiRequest(`/api/deals/${dealId}/timeline`);
  },

  // AI & Analytics
  analyzeDeal: async (dealId) => {
    return apiRequest(`/api/deals/${dealId}/analyze`, {
      method: "POST",
    });
  },

  sendChatMessage: async (message, dealId = null, customerId = null) => {
    return apiRequest("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, deal_id: dealId, customer_id: customerId }),
    });
  },

  getInsights: async () => {
    return apiRequest("/api/insights");
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    return apiRequest("/api/dashboard/stats");
  },
};
