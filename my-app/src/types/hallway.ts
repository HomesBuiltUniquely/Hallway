export type LeaderboardPeriod = 'today' | 'mtd' | 'qtd' | 'all_time';
export type HallwayTrend = 'up' | 'down' | 'flat' | 'steady';
export type HallwayPeopleRole = 'SALES_MANAGER' | 'SALES_EXECUTIVE';

export interface HallwayPeriodWindow {
  dateRangeKey?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface HallwayMetricDefinitions {
  revenue?: string;
  bookings?: string;
  conversionRate?: string;
  winRate?: string;
  teamName?: string;
}

export interface HallwayLeaderboardIndividual {
  rank: number | null;
  id: string;
  userId?: number;
  name: string;
  role?: string;
  avatar?: string | null;
  department?: string;
  revenue?: number;
  revenueFormatted: string;
  bookings: number;
  conversionRate: number;
  trend?: HallwayTrend;
}

export interface HallwayLeaderboardTeam {
  rank: number | null;
  id: string;
  salesManagerId?: number;
  teamName: string;
  leadName?: string;
  avatar?: string | null;
  department?: string;
  totalRevenue: string;
  totalRevenueInr?: number;
  dealsClosed: number;
  winRate: number;
  trend?: HallwayTrend;
}

export interface HallwayLeaderboardResponse {
  period: LeaderboardPeriod;
  periodWindow?: HallwayPeriodWindow;
  metricDefinitions?: HallwayMetricDefinitions;
  individuals: HallwayLeaderboardIndividual[];
  teams: HallwayLeaderboardTeam[];
}

export interface HallwayPerson {
  id: number | string;
  name: string;
  role: string;
  branchId?: string;
  managerId?: number | null;
  managerName?: string | null;
  email?: string | null;
  active: boolean;
  avatar?: string | null;
  department?: string;
  revenueFormatted: string;
  conversionRate: number;
  statsWindow?: string;
}

export interface HallwayPeopleResponse {
  statsWindow?: string;
  people: HallwayPerson[];
}

export interface HallwayIndividualRecord {
  id: string;
  title: string;
  holderName: string;
  holderRole?: string;
  userId?: number;
  avatar?: string | null;
  value: string;
  subValue?: string;
  department?: string;
  dateAwarded?: string;
  verified?: boolean;
  description?: string;
}

export interface HallwayTeamRecord {
  id?: string;
  teamName: string;
  leadName?: string;
  value: string;
  metricLabel: string;
  department?: string;
  verified?: boolean;
}

export interface HallwayOmittedCategory {
  id: string;
  reason?: string;
}

export interface HallwayRecordsResponse {
  individualRecords: HallwayIndividualRecord[];
  teamRecords: HallwayTeamRecord[];
  omittedCategories?: HallwayOmittedCategory[];
}

export interface HallwayJourneyTrack {
  label: string;
  currentStep: number;
  totalSteps: number;
}

export interface HallwayLead {
  id: string;
  leadType?: string;
  leadId?: number;
  enquiryDate?: string;
  leadName: string;
  leadCode?: string;
  tags?: string[];
  status?: string;
  journeyTrack?: HallwayJourneyTrack;
  owner?: string;
  engagement?: string;
  dueDate?: string | null;
  dueTime?: string | null;
}

export interface HallwayLeadsResponse {
  page: number;
  size: number;
  total: number;
  primaryListEndpoint?: string;
  milestoneCountsEndpoint?: string;
  leads: HallwayLead[];
}

export interface HallwayMilestoneCount {
  name?: string;
  key?: string;
  count: number;
}

export interface HallwayMilestoneCountsResponse {
  totalCrmLeads?: number;
  countsByMilestoneStageCategory?: HallwayMilestoneCount[];
  countsByMilestoneStage?: HallwayMilestoneCount[];
  appliedFilters?: Record<string, unknown>;
}

export interface HallwayTargetCard {
  title: string;
  current: string;
  target: string;
  progress: number;
  currentInr?: number;
  targetInr?: number;
  targetSource?: string;
  yearMonth?: string;
}

export interface HallwayTargetsResponse {
  cards: HallwayTargetCard[];
  periodWindow?: HallwayPeriodWindow;
}

export interface HallwayTodayEvent {
  id: string;
  time: string;
  title: string;
  location?: string;
  isLink?: boolean;
  linkUrl?: string | null;
  category?: string;
  startAt?: string;
}

export interface HallwayTodayEventsResponse {
  dayBasis?: string;
  date?: string;
  events: HallwayTodayEvent[];
}

export interface HallwayActionItem {
  id: string;
  name: string;
  detail?: string;
  done: boolean;
}

export interface HallwayActionGroup {
  id: string;
  title: string;
  count: number;
  urgent?: boolean;
  items: HallwayActionItem[];
}

export interface HallwayActionsResponse {
  dayBasis?: string;
  actions: HallwayActionGroup[];
}

export interface HallwayFeedAuthor {
  name: string;
  avatar?: string | null;
  team?: string;
}

export interface HallwayFeedItem {
  id: string;
  type?: string;
  title: string;
  content: string;
  timestamp: string;
  createdAt?: string;
  author?: HallwayFeedAuthor;
  department?: string;
  rawBooking?: {
    bookingId: string;
    leadId?: string | number;
    quoteAmount?: number;
    amountReceived?: number;
    isFirstBooking?: boolean;
    isRenovation?: boolean;
    isOnTheSpot?: boolean;
    isLargeBooking?: boolean;
    customerName?: string;
    branchName?: string;
    createdAt?: string;
  };
}

export interface HallwayFeedResponse {
  source?: string;
  feed: HallwayFeedItem[];
}

export interface HallwayLeaderboardParams {
  period?: LeaderboardPeriod;
  branchId?: string;
  salesManagerId?: number;
}

export interface HallwayPeopleParams {
  branchId?: string;
  role?: HallwayPeopleRole;
}

export interface HallwayLeadsParams {
  page?: number;
  size?: number;
  branchId?: string;
  salesManagerId?: number;
  salesExecutiveId?: number;
}

export interface HallwayTargetsParams {
  branchId?: string;
  salesManagerId?: number;
  salesExecutiveId?: number;
}

export interface HallwayFeedParams {
  branchId?: string;
  limit?: number;
}
