import axios from "axios";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8081";
const FAMILY_URL =
  process.env.NEXT_PUBLIC_FAMILY_URL || "http://localhost:8082";
const CARD_URL = process.env.NEXT_PUBLIC_CARD_URL || "http://localhost:8083";
const PAYMENT_URL =
  process.env.NEXT_PUBLIC_PAYMENT_URL || "http://localhost:8084";
const KYC_URL = process.env.NEXT_PUBLIC_KYC_URL || "http://localhost:8087";
const NOTIFICATION_URL =
  process.env.NEXT_PUBLIC_NOTIFICATION_URL || "http://localhost:8086";
const OPENBANKING_URL =
  process.env.NEXT_PUBLIC_OPENBANKING_URL || "http://localhost:8085";

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

// Client for child-cabinet calls — injects the separate childToken so a child
// session never collides with a parent session in the same browser.
function makeChildClient(baseURL: string) {
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("childToken") : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("childToken");
        window.location.href = "/child-login";
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
export const notificationApi = makeClient(NOTIFICATION_URL);
export const openBankingApi = makeClient(OPENBANKING_URL);
export const childCardApi = makeChildClient(CARD_URL);
export const childPaymentApi = makeChildClient(PAYMENT_URL);
export const childFamilyApi = makeChildClient(FAMILY_URL);
// Bare client for the public child login — no parent token, no refresh
// interceptor (which would otherwise loop on a 401 using the parent's token).
export const childAuthApi = axios.create({ baseURL: AUTH_URL });

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

  // Parent issues/resets a child's login (code + PIN)
  createChildAccess: (childId: string, familyId: string, pin: string, displayName?: string) =>
    authApi.post<ApiResponse<ChildAccessResponse>>("/api/v1/auth/child/access", {
      childId,
      familyId,
      pin,
      displayName,
    }),

  getChildAccess: (childId: string) =>
    authApi.get<ApiResponse<ChildAccessResponse | null>>(
      `/api/v1/auth/child/access/${childId}`
    ),
};

// ── Child auth + cabinet ────────────────────────────────────────────────────────

export const childAuthService = {
  // Public: child logs in with code + PIN (no parent token / no refresh loop)
  login: (loginCode: string, pin: string) =>
    childAuthApi.post<ApiResponse<ChildTokenResponse>>("/api/v1/auth/child/login", {
      loginCode,
      pin,
    }),

  myCards: () =>
    childCardApi.get<ApiResponse<CardResponse[]>>("/api/v1/child/cards"),

  balance: (cardId: string) =>
    childPaymentApi.get<ApiResponse<BalanceResponse>>(
      `/api/v1/child/balance?cardId=${cardId}`
    ),

  transactions: (cardId: string, size = 20) =>
    childPaymentApi.get<ApiResponse<PageResponse<TransactionResponse>>>(
      `/api/v1/child/transactions?cardId=${cardId}&size=${size}`
    ),

  spend: (cardId: string, amountUzs: number, merchantName: string, merchantMcc?: string) =>
    childPaymentApi.post<ApiResponse<TransactionResponse>>("/api/v1/child/spend", {
      cardId,
      amountUzs,
      merchantName,
      merchantMcc,
    }),

  myChores: () =>
    childFamilyApi.get<ApiResponse<ChoreResponse[]>>("/api/v1/child/chores"),

  completeChore: (choreId: string) =>
    childFamilyApi.post<ApiResponse<ChoreResponse>>(
      `/api/v1/child/chores/${choreId}/complete`
    ),

  myGoals: () =>
    childFamilyApi.get<ApiResponse<SavingsGoalResponse[]>>(
      "/api/v1/child/savings-goals"
    ),

  createGoal: (title: string, targetAmount: number) =>
    childFamilyApi.post<ApiResponse<SavingsGoalResponse>>(
      "/api/v1/child/savings-goals",
      { title, targetAmount }
    ),

  depositGoal: (goalId: string, cardId: string, amountUzs: number) =>
    childFamilyApi.post<ApiResponse<SavingsGoalResponse>>(
      `/api/v1/child/savings-goals/${goalId}/deposit`,
      { cardId, amountUzs }
    ),

  withdrawGoal: (goalId: string, cardId: string, amountUzs: number) =>
    childFamilyApi.post<ApiResponse<SavingsGoalResponse>>(
      `/api/v1/child/savings-goals/${goalId}/withdraw`,
      { cardId, amountUzs }
    ),
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

// ── Chores (gamification) ──────────────────────────────────────────────────────

export const choreService = {
  create: (
    familyId: string,
    payload: { title: string; description?: string; childId: string; rewardAmount: number; dueDate?: string }
  ) =>
    familyApi.post<ApiResponse<ChoreResponse>>(
      `/api/v1/families/${familyId}/chores`,
      payload
    ),

  list: (familyId: string) =>
    familyApi.get<ApiResponse<ChoreResponse[]>>(
      `/api/v1/families/${familyId}/chores`
    ),

  approve: (familyId: string, choreId: string) =>
    familyApi.post<ApiResponse<ChoreResponse>>(
      `/api/v1/families/${familyId}/chores/${choreId}/approve`
    ),
};

// ── Savings goals (parent view + gifting) ──────────────────────────────────────

export const parentSavingsService = {
  list: (familyId: string) =>
    familyApi.get<ApiResponse<SavingsGoalResponse[]>>(
      `/api/v1/families/${familyId}/savings-goals`
    ),

  contribute: (familyId: string, goalId: string, amountUzs: number) =>
    familyApi.post<ApiResponse<SavingsGoalResponse>>(
      `/api/v1/families/${familyId}/savings-goals/${goalId}/contribute`,
      { amountUzs }
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

  getWallet: (familyId: string) =>
    paymentApi.get<ApiResponse<WalletResponse>>(`/api/v1/wallet/${familyId}`),

  fundWallet: (familyId: string, amountUzs: number) =>
    paymentApi.post<ApiResponse<WalletResponse>>("/api/v1/wallet/fund", {
      familyId,
      amountUzs,
    }),

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

// ── Notifications ─────────────────────────────────────────────────────────────

export const notificationService = {
  list: (familyId: string, size = 30) =>
    notificationApi.get<ApiResponse<NotificationResponse[]>>(
      `/api/v1/notifications?familyId=${familyId}&size=${size}`
    ),

  unreadCount: (familyId: string) =>
    notificationApi.get<ApiResponse<{ unread: number }>>(
      `/api/v1/notifications/unread-count?familyId=${familyId}`
    ),

  markAllRead: (familyId: string) =>
    notificationApi.post(`/api/v1/notifications/read-all?familyId=${familyId}`),
};

// ── Open Banking ──────────────────────────────────────────────────────────────

export const openBankingService = {
  banks: () =>
    openBankingApi.get<ApiResponse<BankDef[]>>("/api/v1/open-banking/banks"),

  link: (bankCode: string) =>
    openBankingApi.post<ApiResponse<LinkedAccountResponse[]>>(
      "/api/v1/open-banking/link",
      { bankCode }
    ),

  accounts: () =>
    openBankingApi.get<ApiResponse<LinkedAccountResponse[]>>(
      "/api/v1/open-banking/accounts"
    ),

  fundCard: (payload: {
    accountId: string;
    cardId: string;
    childId: string;
    familyId: string;
    amountUzs: number;
    description?: string;
    idempotencyKey: string;
  }) =>
    openBankingApi.post<ApiResponse<FundResultResponse>>(
      "/api/v1/open-banking/fund-card",
      payload
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

export interface WalletResponse {
  familyId: string;
  balanceUzs: number;
  heldUzs: number;
  availableUzs: number;
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

export interface NotificationResponse {
  id: string;
  category: string; // PAYMENT, ALLOWANCE, LIMIT, KYC, FAMILY, CARD
  title: string;
  message: string;
  icon: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface BankDef {
  code: string;
  name: string;
}

export interface LinkedAccountResponse {
  id: string;
  bankCode: string;
  accountType: string;
  maskedNumber: string | null;
  holderName: string | null;
  currency: string;
  balanceUzs: number | null;
  status: string;
}

export interface FundResultResponse {
  paymentRequestId: string;
  status: string;
  amountUzs: number;
  externalRef: string | null;
}

export interface ChildAccessResponse {
  childId: string;
  loginCode: string;
  displayName: string | null;
}

export interface ChildTokenResponse {
  accessToken: string;
  childId: string;
  familyId: string;
  displayName: string | null;
  expiresIn: number;
  tokenType: string;
}

export interface ChoreResponse {
  id: string;
  familyId: string;
  childId: string;
  title: string;
  rewardAmount: number;
  status: string; // PENDING, DONE, APPROVED, REJECTED
  dueDate: string | null;
  completedAt: string | null;
  approvedAt: string | null;
}

export interface SavingsGoalResponse {
  id: string;
  childId: string;
  title: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string | null;
  status: string; // ACTIVE, COMPLETED, CANCELLED
  imageUrl: string | null;
}
