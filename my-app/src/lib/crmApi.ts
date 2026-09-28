import type {
  CrmApiErrorBody,
  CrmLoginResponse,
  CrmLoginUser,
  InsightsDashboard,
  InsightsFilterOptions,
  InsightsFilterParams,
} from '../types/crmInsights';
import type {
  HallwayActionsResponse,
  HallwayFeedParams,
  HallwayFeedResponse,
  HallwayLeaderboardParams,
  HallwayLeaderboardResponse,
  HallwayLeadsParams,
  HallwayLeadsResponse,
  HallwayMilestoneCountsResponse,
  HallwayPeopleParams,
  HallwayPeopleResponse,
  HallwayRecordsResponse,
  HallwayTargetsParams,
  HallwayTargetsResponse,
  HallwayTodayEventsResponse,
} from '../types/hallway';

const TOKEN_KEY = 'hallway-crm-token';
const USER_KEY = 'hallway-crm-user';
const CRM_TOKEN_STORAGE_KEY = 'crm_token';
const CRM_ROLE_STORAGE_KEY = 'crm_role';
const CRM_USER_NAME_STORAGE_KEY = 'crm_user_name';
const CRM_LOGIN_USERNAME_KEY = 'crm_login_username';
const CRM_USER_ID_STORAGE_KEY = 'crm_user_id';
const CRM_DESIGNER_NAME_STORAGE_KEY = 'crm_designer_name';
const CRM_DESIGNER_ID_STORAGE_KEY = 'crm_designer_id';
const CRM_ACTIVE_MODULE_KEY = 'crm_active_module';

const CRM_SALES_ROLES = new Set([
  'SALES_EXECUTIVE',
  'SALES_MANAGER',
  'SALES_ADMIN',
  'ADMIN',
  'SUPER_ADMIN',
  'MANAGER',
]);
const CRM_PRESALES_ROLES = new Set(['PRESALES_EXECUTIVE', 'PRESALES_MANAGER']);
const CRM_DESIGN_ROLES = new Set(['DESIGNER', 'DESIGN_MANAGER', 'TERRITORY_DESIGN_MANAGER']);

export class CrmApiError extends Error {
  status: number;
  body: CrmApiErrorBody | null;

  constructor(status: number, message: string, body: CrmApiErrorBody | null = null) {
    super(message);
    this.name = 'CrmApiError';
    this.status = status;
    this.body = body;
  }
}

export function getCrmBaseUrl(): string {
  return '/api/crm';
}

export function getStoredCrmToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(TOKEN_KEY);
  if (stored?.trim()) return stored.trim();
  const fromEnv = process.env.NEXT_PUBLIC_CRM_TOKEN?.trim();
  return fromEnv || null;
}

export function getStoredCrmUser(): CrmLoginResponse['user'] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CrmLoginResponse['user'];
  } catch {
    return null;
  }
}

export function setCrmSession(token: string, user?: CrmLoginResponse['user'] | null) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(CRM_TOKEN_STORAGE_KEY, token);
  if (user) {
    const role = normalizeCrmRole(extractCrmRole(user));
    const displayName = crmDisplayName(user);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.localStorage.setItem(CRM_ROLE_STORAGE_KEY, role);
    window.localStorage.setItem(CRM_USER_NAME_STORAGE_KEY, displayName);
    window.localStorage.setItem(CRM_LOGIN_USERNAME_KEY, user.username || '');
    window.localStorage.setItem(CRM_USER_ID_STORAGE_KEY, String(user.id ?? ''));
    window.localStorage.setItem(
      CRM_ACTIVE_MODULE_KEY,
      CRM_PRESALES_ROLES.has(role) ? 'presales' : 'crm'
    );
    if (user.designerName) {
      window.localStorage.setItem(CRM_DESIGNER_NAME_STORAGE_KEY, user.designerName);
    }
    if (user.designerId != null) {
      window.localStorage.setItem(CRM_DESIGNER_ID_STORAGE_KEY, String(user.designerId));
    }
  }
  window.dispatchEvent(new Event('hallway-crm-session'));
}

export function clearCrmSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(CRM_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(CRM_ROLE_STORAGE_KEY);
  window.localStorage.removeItem(CRM_USER_NAME_STORAGE_KEY);
  window.localStorage.removeItem(CRM_LOGIN_USERNAME_KEY);
  window.localStorage.removeItem(CRM_USER_ID_STORAGE_KEY);
  window.localStorage.removeItem(CRM_DESIGNER_NAME_STORAGE_KEY);
  window.localStorage.removeItem(CRM_DESIGNER_ID_STORAGE_KEY);
  window.localStorage.removeItem(CRM_ACTIVE_MODULE_KEY);
  window.dispatchEvent(new Event('hallway-crm-session'));
}

export function getAuthHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`;
  return headers;
}

export function normalizeCrmRole(role?: string | null): string {
  const raw = (role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (raw === 'MANAGER') return 'SALES_MANAGER';
  return raw;
}

export function extractCrmRole(user?: CrmLoginUser | null, extra?: Record<string, unknown>): string {
  const fromRoles = Array.isArray(user?.roles) ? user?.roles[0] : undefined;
  const value =
    user?.role ||
    user?.userRole ||
    fromRoles ||
    (typeof extra?.role === 'string' ? extra.role : undefined) ||
    (typeof extra?.userRole === 'string' ? extra.userRole : undefined);
  return normalizeCrmRole(value);
}

export function getStoredCrmRole(): string {
  if (typeof window === 'undefined') return '';
  return normalizeCrmRole(window.localStorage.getItem(CRM_ROLE_STORAGE_KEY));
}

export function landingPathByRole(role?: string | null): string {
  const normalized = normalizeCrmRole(role);
  if (CRM_PRESALES_ROLES.has(normalized)) return '/presales-leads';
  return '/Leads';
}

export function crmDisplayName(user?: CrmLoginUser | null): string {
  return (user?.name || user?.fullName || user?.username || '').trim();
}

export function getCrmSessionSnapshot() {
  if (typeof window === 'undefined') return null;
  const token =
    window.localStorage.getItem(CRM_TOKEN_STORAGE_KEY)?.trim() || getStoredCrmToken();
  if (!token) return null;
  return {
    crm_token: token,
    crm_role: window.localStorage.getItem(CRM_ROLE_STORAGE_KEY) || '',
    crm_user_name: window.localStorage.getItem(CRM_USER_NAME_STORAGE_KEY) || '',
    crm_login_username: window.localStorage.getItem(CRM_LOGIN_USERNAME_KEY) || '',
    crm_user_id: window.localStorage.getItem(CRM_USER_ID_STORAGE_KEY) || '',
    crm_active_module: window.localStorage.getItem(CRM_ACTIVE_MODULE_KEY) || 'crm',
  };
}

function isCrmSalesFamily(role: string) {
  return CRM_SALES_ROLES.has(role) || CRM_PRESALES_ROLES.has(role);
}

function isCrmDesignFamily(role: string) {
  return CRM_DESIGN_ROLES.has(role) || role.includes('DESIGN');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractLoginToken(payload: Record<string, unknown>): string | null {
  const nested = asRecord(payload.data);
  const token =
    (typeof payload.token === 'string' && payload.token) ||
    (typeof payload.accessToken === 'string' && payload.accessToken) ||
    (typeof nested?.token === 'string' && nested.token) ||
    (typeof nested?.accessToken === 'string' && nested.accessToken) ||
    '';
  return token.trim() || null;
}

function looksLikeUser(raw: Record<string, unknown> | null): raw is Record<string, unknown> {
  if (!raw) return false;
  return (
    raw.id != null ||
    raw.userId != null ||
    typeof raw.username === 'string' ||
    (typeof raw.email === 'string' && !('token' in raw))
  );
}

function extractLoginUser(payload: Record<string, unknown>): CrmLoginUser | null {
  const nested = asRecord(payload.data);
  const raw =
    asRecord(payload.user) ||
    asRecord(nested?.user) ||
    (looksLikeUser(nested) ? nested : null);
  if (!raw || !looksLikeUser(raw)) return null;
  const id = Number(raw.id ?? raw.userId);
  const username = String(raw.username || raw.email || '').trim();
  if (!Number.isFinite(id) && !username) return null;
  return {
    id: Number.isFinite(id) ? id : 0,
    username,
    email: typeof raw.email === 'string' ? raw.email : undefined,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    fullName: typeof raw.fullName === 'string' ? raw.fullName : undefined,
    role: String(raw.role || raw.userRole || ''),
    userRole: typeof raw.userRole === 'string' ? raw.userRole : undefined,
    roles: Array.isArray(raw.roles) ? raw.roles.map((item) => String(item)) : undefined,
    managerId: raw.managerId == null ? null : Number(raw.managerId),
    branch: typeof raw.branch === 'string' ? raw.branch : undefined,
    designerName: typeof raw.designerName === 'string' ? raw.designerName : undefined,
    designerId: raw.designerId == null ? undefined : Number(raw.designerId),
  };
}

function sharedQuery(params: InsightsFilterParams, extras?: Record<string, string>): string {
  const search = new URLSearchParams();
  search.set('dateRange', params.dateRange);
  if (params.dateRange === 'custom') {
    if (params.dateFrom) search.set('dateFrom', params.dateFrom);
    if (params.dateTo) search.set('dateTo', params.dateTo);
  }
  if (params.branchId && params.branchId !== 'all') {
    const rawBranch = params.branchId.trim().toUpperCase();
    const normalizedBranch = rawBranch === 'SARJAPURA' ? 'SARJAPUR' : params.branchId;
    search.set('branchId', normalizedBranch);
  }
  if (params.salesManagerId != null) {
    search.set('salesManagerId', String(params.salesManagerId));
  }
  if (params.salesExecutiveId != null) {
    search.set('salesExecutiveId', String(params.salesExecutiveId));
  }
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      search.set(key, value);
    }
  }
  return search.toString();
}

function toQuery(params: InsightsFilterParams): string {
  return sharedQuery(params, {
    teamPeriod: params.teamPeriod,
    funnelMode: params.funnelMode,
    pathFilter: params.pathFilter,
  });
}

function errorMessage(body: CrmApiErrorBody | null, fallback: string): string {
  return body?.error || body?.message || fallback;
}

async function parseBody(res: Response): Promise<CrmApiErrorBody | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as CrmApiErrorBody;
  } catch {
    return { error: text };
  }
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

async function crmFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null
): Promise<T> {
  const url = `${getCrmBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...getAuthHeaders(token),
        ...(init.headers || {}),
      },
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new CrmApiError(
      503,
      'Hub CRM is unreachable. Confirm https://hows.hubinterior.com is available.',
      null
    );
  }

  const body = await parseBody(res);

  if (res.status === 401) {
    throw new CrmApiError(401, errorMessage(body, 'CRM authorization failed'), body);
  }
  if (res.status === 403) {
    throw new CrmApiError(403, errorMessage(body, 'Forbidden'), body);
  }
  if (res.status === 501) {
    throw new CrmApiError(501, errorMessage(body, 'Passages funnel is unavailable'), body);
  }
  if (res.status === 400) {
    throw new CrmApiError(400, errorMessage(body, 'Bad request'), body);
  }
  if (res.status >= 500) {
    throw new CrmApiError(
      503,
      errorMessage(
        body,
        'Hub CRM failed this request. Confirm https://hows.hubinterior.com is available and retry.'
      ),
      body
    );
  }
  if (!res.ok) {
    throw new CrmApiError(res.status, errorMessage(body, `CRM request failed (${res.status})`), body);
  }

  return (body ?? {}) as T;
}

export async function fetchCrmMe(token: string): Promise<CrmLoginUser | null> {
  const data = await crmFetch<Record<string, unknown>>('/api/auth/me', {}, token);
  return extractLoginUser(data);
}

export async function loginToCrm(username: string, password: string): Promise<CrmLoginResponse> {
  const payload = await crmFetch<Record<string, unknown>>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const token = extractLoginToken(payload);
  if (!token) {
    throw new CrmApiError(400, String(payload.message || payload.error || 'Login failed'), {
      message: String(payload.message || payload.error || 'Login failed'),
    });
  }

  let user = extractLoginUser(payload);
  if (!user) {
    try {
      user = await fetchCrmMe(token);
    } catch {
      user = null;
    }
  }

  const role = extractCrmRole(user, payload);
  if (isCrmDesignFamily(role)) {
    throw new CrmApiError(403, 'This account is a Design role. Use Designers login.', {
      message: 'This account is a Design role. Use Designers login.',
    });
  }
  if (role && !isCrmSalesFamily(role)) {
    throw new CrmApiError(403, 'This account cannot use CRM Sales login.', {
      message: 'This account cannot use CRM Sales login.',
    });
  }

  if (user && !user.role) user.role = role;
  setCrmSession(token, user);
  return {
    success: true,
    token,
    user: user ?? undefined,
    message: typeof payload.message === 'string' ? payload.message : undefined,
  };
}

export async function fetchInsightsFilterOptions(
  branchId?: string,
  token?: string | null,
  signal?: AbortSignal
): Promise<InsightsFilterOptions> {
  const normalizedBranch =
    branchId && branchId.trim().toUpperCase() === 'SARJAPURA' ? 'SARJAPUR' : branchId;
  const qs =
    normalizedBranch && normalizedBranch !== 'all'
      ? `?branchId=${encodeURIComponent(normalizedBranch)}`
      : '';
  const data = await crmFetch<InsightsFilterOptions>(
    `/v1/crm/insights/filter-options${qs}`,
    { signal },
    token
  );
  if (data?.branches && Array.isArray(data.branches)) {
    data.branches = data.branches.map((b) => {
      const u = b.id?.trim().toUpperCase();
      if (u === 'SARJAPUR' || u === 'SARJAPURA') {
        return { id: 'SARJAPUR', name: 'Sarjapura' };
      }
      if (u === 'JP_NAGAR') {
        return { id: 'JP_NAGAR', name: 'JP Nagar' };
      }
      if (u === 'HBR') {
        return { id: 'HBR', name: 'HBR Layout' };
      }
      return b;
    });
  }
  return data;
}

export async function fetchInsightsDashboard(
  params: InsightsFilterParams,
  token?: string | null
): Promise<InsightsDashboard> {
  return crmFetch<InsightsDashboard>(`/v1/crm/insights/dashboard?${toQuery(params)}`, {}, token);
}

export async function fetchPerformanceCards(
  params: InsightsFilterParams,
  token?: string | null
): Promise<Pick<InsightsDashboard, 'filtersApplied' | 'performanceCards'>> {
  return crmFetch(`/v1/crm/insights/performance-cards?${sharedQuery(params)}`, {}, token);
}

export async function fetchSalesFunnel(
  params: InsightsFilterParams,
  token?: string | null
): Promise<Pick<InsightsDashboard, 'filtersApplied' | 'salesFunnel' | 'funnelMeta'>> {
  return crmFetch(
    `/v1/crm/insights/sales-funnel?${sharedQuery(params, {
      funnelMode: params.funnelMode,
      pathFilter: params.pathFilter,
    })}`,
    {},
    token
  );
}

export async function fetchQuotesSentMonth(
  params: InsightsFilterParams,
  token?: string | null
) {
  return crmFetch<Record<string, unknown>>(
    `/v1/crm/insights/quotes-sent-month?${sharedQuery(params)}`,
    {},
    token
  );
}

export async function fetchPassagesTrend(
  params: InsightsFilterParams,
  granularity: 'month' | 'week' = 'month',
  token?: string | null
) {
  return crmFetch<Record<string, unknown>>(
    `/v1/crm/insights/passages-trend?${sharedQuery(params, { granularity })}`,
    {},
    token
  );
}

export async function fetchSalesTargetsDefault(token?: string | null) {
  return crmFetch<Record<string, unknown>>('/v1/crm/incentives/sales-targets/default', {}, token);
}

export async function fetchSalesTargets(
  yearMonth: string,
  branchId?: string,
  token?: string | null
) {
  const qs = new URLSearchParams({ yearMonth });
  if (branchId) qs.set('branchId', branchId);
  return crmFetch<Record<string, unknown>>(
    `/v1/crm/incentives/sales-targets?${qs.toString()}`,
    {},
    token
  );
}

function hallwayQuery(
  params?: Record<string, string | number | undefined | null>
): string {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value == null || value === '') continue;
      let val = String(value);
      if (key === 'branchId' && val.trim().toUpperCase() === 'SARJAPURA') {
        val = 'SARJAPUR';
      }
      search.set(key, val);
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchLeaderboard(
  token: string,
  params: HallwayLeaderboardParams = {},
  signal?: AbortSignal
): Promise<HallwayLeaderboardResponse> {
  return crmFetch(
    `/v1/hallway/leaderboard${hallwayQuery({
      period: params.period ?? 'mtd',
      branchId: params.branchId,
      salesManagerId: params.salesManagerId,
    })}`,
    { signal },
    token
  );
}

export async function fetchPeople(
  token: string,
  params: HallwayPeopleParams = {},
  signal?: AbortSignal
): Promise<HallwayPeopleResponse> {
  return crmFetch(
    `/v1/hallway/people${hallwayQuery({
      branchId: params.branchId,
      role: params.role,
    })}`,
    { signal },
    token
  );
}

export async function fetchRecords(
  token: string,
  branchId?: string,
  signal?: AbortSignal
): Promise<HallwayRecordsResponse> {
  return crmFetch(`/v1/hallway/records${hallwayQuery({ branchId })}`, { signal }, token);
}

export async function fetchHallwayLeads(
  token: string,
  params: HallwayLeadsParams = {},
  signal?: AbortSignal
): Promise<HallwayLeadsResponse> {
  return crmFetch(
    `/v1/hallway/leads${hallwayQuery({
      page: params.page ?? 0,
      size: params.size ?? 20,
      branchId: params.branchId,
      salesManagerId: params.salesManagerId,
      salesExecutiveId: params.salesExecutiveId,
    })}`,
    { signal },
    token
  );
}

export async function fetchMilestoneCounts(
  token: string,
  params: Record<string, string> = {},
  signal?: AbortSignal
): Promise<HallwayMilestoneCountsResponse> {
  return crmFetch(
    `/v1/Leads/crm-milestone-counts-filtered${hallwayQuery(params)}`,
    { signal },
    token
  );
}

export async function fetchTargets(
  token: string,
  params: HallwayTargetsParams = {},
  signal?: AbortSignal
): Promise<HallwayTargetsResponse> {
  return crmFetch(
    `/v1/hallway/targets${hallwayQuery({
      branchId: params.branchId,
      salesManagerId: params.salesManagerId,
      salesExecutiveId: params.salesExecutiveId,
    })}`,
    { signal },
    token
  );
}

export async function fetchTodayEvents(
  token: string,
  signal?: AbortSignal
): Promise<HallwayTodayEventsResponse> {
  return crmFetch('/v1/hallway/today-events', { signal }, token);
}

export async function fetchActions(
  token: string,
  branchId?: string,
  signal?: AbortSignal
): Promise<HallwayActionsResponse> {
  return crmFetch(`/v1/hallway/actions${hallwayQuery({ branchId })}`, { signal }, token);
}

export async function fetchFeed(
  token: string,
  params: HallwayFeedParams = {},
  signal?: AbortSignal
): Promise<HallwayFeedResponse> {
  return crmFetch(
    `/v1/hallway/feed${hallwayQuery({
      branchId: params.branchId,
      limit: params.limit ?? 20,
    })}`,
    { signal },
    token
  );
}

export { toQuery as insightsQueryString };
