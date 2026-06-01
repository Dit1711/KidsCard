import axios from "axios";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8081";
const FAMILY_URL =
  process.env.NEXT_PUBLIC_FAMILY_URL || "http://localhost:8082";
const CARD_URL = process.env.NEXT_PUBLIC_CARD_URL || "http://localhost:8083";
const PAYMENT_URL =
  process.env.NEXT_PUBLIC_PAYMENT_URL || "http://localhost:8084";
const KYC_URL = process.env.NEXT_PUBLIC_KYC_URL || "http://localhost:8087";

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
export const paymentApi = makeClient(PAYMENT_URL);
export const kycApi = makeClient(KYC_URL);

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

// ── Limits ────────────────────────────────────────────────────────────────────

export const limitService = {
  set: (
    familyId: string,
    childId: string,
    payload: { limitType: string; category?: string; amountUzs: number }
  ) =>
    familyApi.post<ApiResponse<LimitResponse>>(
      `/api/v1/families/${familyId}/children/${childId}/limits`,
      payload
    ),

  list: (familyId: string, childId: string) =>
    familyApi.get<ApiResponse<LimitResponse[]>>(
      `/api/v1/families/${familyId}/children/${childId}/limits`
    ),

  remove: (familyId: string, childId: string, limitId: string) =>
    familyApi.delete(
      `/api/v1/families/${familyId}/children/${childId}/limits/${limitId}`
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

// ── Allowance (карманные деньги) ───────────────────────────────────────────────

export const allowanceService = {
  set: (
    familyId: string,
    cardId: string,
    payload: {
      amountUzs: number;
      frequency: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
    }
  ) =>
    cardApi.post<ApiResponse<AllowanceResponse>>(
      `/api/v1/families/${familyId}/cards/${cardId}/allowance`,
      payload
    ),

  getActive: (familyId: string, cardId: string) =>
    cardApi.get<ApiResponse<AllowanceResponse | null>>(
      `/api/v1/families/${familyId}/cards/${cardId}/allowance`
    ),
};

// ── Payment ───────────────────────────────────────────────────────────────────

export const paymentService = {
  topUp: (payload: {
    cardId: string;
    childId: string;
    familyId: string;
    amountUzs: number;
    description?: string;
    idempotencyKey: string;
  }) => paymentApi.post<ApiResponse<TransactionResponse>>("/api/v1/transactions/top-up", payload),

  purchase: (payload: {
    cardId: string;
    childId: string;
    familyId: string;
    amountUzs: number;
    merchantName?: string;
    description?: string;
    idempotencyKey: string;
  }) => paymentApi.post<ApiResponse<TransactionResponse>>("/api/v1/transactions/purchase", payload),

  getBalance: (cardId: string) =>
    paymentApi.get<ApiResponse<BalanceResponse>>(`/api/v1/wallets/cards/${cardId}/balance`),

  getCardTransactions: (cardId: string, page = 0, size = 20) =>
    paymentApi.get<ApiResponse<PageResponse<TransactionResponse>>>(
      `/api/v1/transactions/card/${cardId}?page=${page}&size=${size}`
    ),
};

// ── KYC ───────────────────────────────────────────────────────────────────────

export const kycService = {
  getStatus: () =>
    kycApi.get<ApiResponse<KycSessionResponse | null>>("/api/v1/kyc/status"),

  start: (type = "PARENT") =>
    kycApi.post<ApiResponse<KycSessionResponse>>("/api/v1/kyc/sessions", { type }),

  uploadDocument: (sessionId: string, docType: string) =>
    kycApi.post<ApiResponse<KycSessionResponse>>(
      `/api/v1/kyc/sessions/${sessionId}/documents`,
      { docType }
    ),

  liveness: (sessionId: string) =>
    kycApi.post<ApiResponse<KycSessionResponse>>(
      `/api/v1/kyc/sessions/${sessionId}/liveness`,
      {}
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

export interface TransactionResponse {
  id: string;
  idempotencyKey: string;
  cardId: string;
  childId: string;
  familyId: string;
  type: string;
  status: string;
  amountUzs: number;
  currency: string;
  direction: string;
  merchantName: string | null;
  description: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface BalanceResponse {
  cardId: string;
  balanceUzs: number;
  currency: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface LimitResponse {
  id: string;
  childId: string;
  limitType: string; // DAILY, WEEKLY, MONTHLY, CATEGORY
  category: string | null;
  amountUzs: number;
  currency: string;
  active: boolean;
}

export interface AllowanceResponse {
  id: string;
  cardId: string;
  amountUzs: number;
  frequency: string; // WEEKLY, MONTHLY
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  active: boolean;
  nextRunAt: string | null;
}

export interface KycSessionResponse {
  id: string;
  userId: string;
  type: string;
  status: string; // INITIATED, DOCUMENTS_UPLOADED, LIVENESS_DONE, APPROVED, REJECTED, EXPIRED
  provider: string;
  rejectionReason: string | null;
  expiresAt: string;
  approvedAt: string | null;
  createdAt: string;
}
