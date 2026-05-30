import axios from "axios";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8081";
const FAMILY_URL =
  process.env.NEXT_PUBLIC_FAMILY_URL || "http://localhost:8082";
const CARD_URL = process.env.NEXT_PUBLIC_CARD_URL || "http://localhost:8083";

function makeClient(baseURL: string) {
  const client = axios.create({ baseURL });

  client.interceptors.request.use((config) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      if (error.response?.status === 401) {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          try {
            const { data } = await axios.post(
              `${AUTH_URL}/api/v1/auth/refresh`,
              { refreshToken }
            );
            const newToken = data.data.accessToken;
            localStorage.setItem("accessToken", newToken);
            localStorage.setItem("refreshToken", data.data.refreshToken);
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return client.request(error.config);
          } catch {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.location.href = "/login";
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const authApi = makeClient(AUTH_URL);
export const familyApi = makeClient(FAMILY_URL);
export const cardApi = makeClient(CARD_URL);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authService = {
  register: (phone: string) =>
    authApi.post("/api/v1/auth/register", { phone }),

  verifyRegistration: (phone: string, otp: string) =>
    authApi.post<ApiResponse<TokenResponse>>("/api/v1/auth/register/verify", {
      phone,
      otp,
    }),

  login: (phone: string) => authApi.post("/api/v1/auth/login", { phone }),

  verifyLogin: (phone: string, otp: string, deviceId?: string) =>
    authApi.post<ApiResponse<TokenResponse>>("/api/v1/auth/login/verify", {
      phone,
      otp,
      deviceId,
    }),

  me: () => authApi.get<ApiResponse<UserResponse>>("/api/v1/auth/me"),

  logout: (refreshToken: string) =>
    authApi.post("/api/v1/auth/logout", { refreshToken }),
};

// ── Family ────────────────────────────────────────────────────────────────────

export const familyService = {
  create: (familyName: string, fullName: string) =>
    familyApi.post<ApiResponse<FamilyResponse>>("/api/v1/families", {
      familyName,
      fullName,
    }),

  getMyFamily: () =>
    familyApi.get<ApiResponse<FamilyResponse>>("/api/v1/families/my"),

  addChild: (familyId: string, data: AddChildPayload) =>
    familyApi.post<ApiResponse<ChildResponse>>(
      `/api/v1/families/${familyId}/children`,
      data
    ),

  getChildren: (familyId: string) =>
    familyApi.get<ApiResponse<ChildResponse[]>>(
      `/api/v1/families/${familyId}/children`
    ),
};

// ── Cards ─────────────────────────────────────────────────────────────────────

export const cardService = {
  issue: (familyId: string, childId: string, cardType: string, network: string) =>
    cardApi.post<ApiResponse<CardResponse>>(`/api/v1/families/${familyId}/cards`, {
      childId,
      cardType,
      network,
    }),

  getByFamily: (familyId: string) =>
    cardApi.get<ApiResponse<CardResponse[]>>(
      `/api/v1/families/${familyId}/cards`
    ),

  freeze: (familyId: string, cardId: string) =>
    cardApi.post<ApiResponse<CardResponse>>(
      `/api/v1/families/${familyId}/cards/${cardId}/freeze`
    ),

  unfreeze: (familyId: string, cardId: string) =>
    cardApi.post<ApiResponse<CardResponse>>(
      `/api/v1/families/${familyId}/cards/${cardId}/unfreeze`
    ),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
  requestId: string;
  timestamp: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserResponse {
  id: string;
  phone: string;
  roles: string[];
  phoneVerified: boolean;
  createdAt: string;
}

export interface FamilyResponse {
  id: string;
  name: string;
  status: string;
  parents: ParentResponse[];
  createdAt: string;
}

export interface ParentResponse {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  role: string;
  kycStatus: string;
}

export interface ChildResponse {
  id: string;
  familyId: string;
  fullName: string;
  dateOfBirth: string;
  ageGroup: string;
  avatarUrl: string | null;
  status: string;
}

export interface AddChildPayload {
  fullName: string;
  dateOfBirth: string;
  avatarUrl?: string;
}

export interface CardResponse {
  id: string;
  childId: string;
  familyId: string;
  cardType: string;
  maskedPan: string;
  expiryMonth: number;
  expiryYear: number;
  network: string;
  status: string;
  balanceUzs: number;
  issuedAt: string | null;
  frozenAt: string | null;
}
