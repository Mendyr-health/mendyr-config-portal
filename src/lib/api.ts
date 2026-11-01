import { tokenStore } from "./tokenStore";
import type {
  AdminActivity,
  AdminBookingDetail,
  AdminBookingListItem,
  AdminPage,
  AdminProfessionalDetail,
  AdminProfessionalListItem,
  AdminUserListItem,
  CategoryAdmin,
  CategoryWriteInput,
  ConfigCreateInput,
  ConfigEntry,
  ConfigUpdateInput,
  DashboardFilters,
  DashboardOverview,
  QueryInfoCreateInput,
  QueryInfoEntry,
  QueryInfoUpdateInput,
  QueryResultPage,
  Me,
  RegistryEntry,
  ReviewDecisionInput,
  ServiceAdmin,
  ServiceWriteInput,
  TokenPair,
  VerificationStats,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const API_V1 = `${API_BASE}/api/v1`;

/** Fired when the refresh token is rejected, so AuthProvider can send the user to /login. */
export const SESSION_EXPIRED_EVENT = "portal:session-expired";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function throwApiError(res: Response): Promise<never> {
  let message = res.statusText || `Request failed with status ${res.status}`;
  let code: string | undefined;
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    message = body?.error?.message ?? message;
    code = body?.error?.code;
  } catch {
    // no JSON body — keep the default message
  }
  throw new ApiError(res.status, message, code);
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta: unknown;
  error: { code: string; message: string } | null;
}

function isEnvelope(body: unknown): body is Envelope<unknown> {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    "data" in body &&
    "error" in body
  );
}

/** The backend wraps every response in {success, data, meta, error} — unwrap to `data` on
 * success. Kept as a standalone helper (not folded into `request<T>` alone) since `login`/
 * `tryRefresh` parse a response from a plain `fetch` call, not `request<T>`. */
async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json()) as unknown;
  return (isEnvelope(body) ? body.data : body) as T;
}

interface RequestOptions extends RequestInit {
  /** Attach the stored access token as a Bearer header. Defaults to true. */
  auth?: boolean;
  /** Internal — set to false on the retry-after-refresh attempt to avoid looping. */
  allowRefresh?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, allowRefresh = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Platform": "web",
    ...(headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = tokenStore.getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_V1}${path}`, { ...rest, headers: finalHeaders });

  if (res.status === 401 && auth && allowRefresh) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, { ...options, allowRefresh: false });
    }
    tokenStore.clear();
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  if (!res.ok) {
    await throwApiError(res);
  }

  if (res.status === 204) return undefined as T;
  return unwrap<T>(res);
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${API_V1}/auth/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Platform": "web" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return false;

  tokenStore.setTokens(await unwrap<TokenPair>(res));
  return true;
}

export async function login(email: string, password: string): Promise<TokenPair> {
  const res = await fetch(`${API_V1}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Platform": "web" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) await throwApiError(res);
  return unwrap<TokenPair>(res);
}

export const configsApi = {
  list: (): Promise<ConfigEntry[]> => request<ConfigEntry[]>("/configs"),

  create: (input: ConfigCreateInput): Promise<ConfigEntry> =>
    request<ConfigEntry>("/configs", { method: "POST", body: JSON.stringify(input) }),

  update: (id: string, input: ConfigUpdateInput): Promise<ConfigEntry> =>
    request<ConfigEntry>(`/configs/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  remove: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/configs/${id}`, { method: "DELETE" }),
};

export const dashboardApi = {
  getOverview: (filters: DashboardFilters = {}): Promise<DashboardOverview> => {
    const params = new URLSearchParams();
    if (filters.city) params.set("city", filters.city);
    if (filters.state) params.set("state", filters.state);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    const qs = params.toString();
    return request<DashboardOverview>(`/admin/dashboard${qs ? `?${qs}` : ""}`);
  },
};

export const queryInfoApi = {
  list: (): Promise<QueryInfoEntry[]> => request<QueryInfoEntry[]>("/analytics"),

  create: (input: QueryInfoCreateInput): Promise<QueryInfoEntry> =>
    request<QueryInfoEntry>("/analytics", { method: "POST", body: JSON.stringify(input) }),

  update: (id: string, input: QueryInfoUpdateInput): Promise<QueryInfoEntry> =>
    request<QueryInfoEntry>(`/analytics/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  remove: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/analytics/${id}`, { method: "DELETE" }),

  run: (name: string, page = 1): Promise<QueryResultPage> =>
    request<QueryResultPage>(`/analytics/${encodeURIComponent(name)}/data${qs({ page })}`),
};

/** `?a=1&b=x` from an object, skipping empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const out = sp.toString();
  return out ? `?${out}` : "";
}

const json = (body: unknown) => JSON.stringify(body);

export const authApi = {
  me: (): Promise<Me> => request<Me>("/auth/me"),
};

export const registryApi = {
  list: (): Promise<RegistryEntry[]> => request<RegistryEntry[]>("/configs/registry"),
  save: (key: string, value: unknown): Promise<ConfigEntry> =>
    request<ConfigEntry>(`/configs/by-key/${encodeURIComponent(key)}`, { method: "PUT", body: json({ value }) }),
  reset: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/configs/${id}`, { method: "DELETE" }),
};

export interface ProfessionalFilters {
  status?: string;
  professional_type?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface UserFilters {
  role?: string;
  status?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface BookingFilters {
  status?: string;
  q?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export const adminApi = {
  professionals: (f: ProfessionalFilters): Promise<AdminPage<AdminProfessionalListItem>> =>
    request(`/admin/professionals${qs({ ...f })}`),
  professionalStats: (): Promise<VerificationStats> => request("/admin/professionals/stats"),
  professional: (id: string): Promise<AdminProfessionalDetail> => request(`/admin/professionals/${id}`),
  review: (id: string, input: ReviewDecisionInput): Promise<AdminProfessionalDetail> =>
    request(`/admin/professionals/${id}/review`, { method: "POST", body: json(input) }),

  users: (f: UserFilters): Promise<AdminPage<AdminUserListItem>> => request(`/admin/users${qs({ ...f })}`),
  setUserStatus: (id: string, status: "active" | "suspended", reason?: string): Promise<{ message: string }> =>
    request(`/admin/users/${id}/status`, { method: "PATCH", body: json({ status, reason: reason || null }) }),

  bookings: (f: BookingFilters): Promise<AdminPage<AdminBookingListItem>> => request(`/admin/bookings${qs({ ...f })}`),
  booking: (id: string): Promise<AdminBookingDetail> => request(`/admin/bookings/${id}`),
  cancelBooking: (id: string, reason: string): Promise<AdminBookingDetail> =>
    request(`/admin/bookings/${id}/cancel`, { method: "POST", body: json({ reason }) }),
  reopenBooking: (id: string): Promise<AdminBookingDetail> =>
    request(`/admin/bookings/${id}/reopen`, { method: "POST" }),

  categories: (): Promise<CategoryAdmin[]> => request("/admin/catalog/categories"),
  createCategory: (input: CategoryWriteInput): Promise<CategoryAdmin> =>
    request("/admin/catalog/categories", { method: "POST", body: json(input) }),
  updateCategory: (id: string, input: CategoryWriteInput): Promise<CategoryAdmin> =>
    request(`/admin/catalog/categories/${id}`, { method: "PUT", body: json(input) }),
  services: (): Promise<ServiceAdmin[]> => request("/admin/catalog/services"),
  createService: (input: ServiceWriteInput): Promise<ServiceAdmin> =>
    request("/admin/catalog/services", { method: "POST", body: json(input) }),
  updateService: (id: string, input: ServiceWriteInput): Promise<ServiceAdmin> =>
    request(`/admin/catalog/services/${id}`, { method: "PUT", body: json(input) }),

  activity: (f: { entity_type?: string; entity_id?: string; limit?: number; offset?: number }): Promise<AdminActivity[]> =>
    request(`/admin/activity${qs({ ...f })}`),
};

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return "Couldn't reach the server. Check your connection and try again.";
  return fallback;
}
