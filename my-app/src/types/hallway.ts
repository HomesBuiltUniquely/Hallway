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
  /** All-Time leaderboard fields (Team records tab) */
  dealsClosed?: number;
  winRate?: number;
  totalRevenueInr?: number;
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
  endAt?: string;
  clientName?: string | null;
  leadId?: string | number | null;
  crmPersonName?: string | null;
  designerName?: string | null;
  meetingType?: string | null;
  attendees?: string[];
}

export interface HallwayTodayEventsResponse {
  dayBasis?: string;
  date?: string;
  /** When true, server already applied My / team / all scope — skip client re-filter. */
  scoped?: boolean;
  /**
   * Count of events in the current scope (my / team / all).
   * Must match `events.length` — never a wider company total while the list is scoped.
   */
  hubTotal?: number;
  /** Unscoped company-wide meeting count (for All Hubs badge when toggles exist). */
  companyTotal?: number;
  events: HallwayTodayEvent[];
}

export interface HallwayActionItem {
  id: string;
  name: string;
  detail?: string;
  done: boolean;
  xpPoints?: number;
  xpPenaltyWarning?: string;
  /** Clock time for personal queues (executives). Prefer dueDateLabel for oversight. */
  dueTime?: string;
  /** Calendar due label for managers/admins, e.g. "05 Nov" / "Today". */
  dueDateLabel?: string;
  /** Assigned sales / presales owner — required for oversight lists. */
  assignee?: string;
  /** Overdue / Due today / No due date — drives the status pill. */
  statusLabel?: 'Overdue' | 'Due today' | 'No due date';
}

export interface HallwayActionGroup {
  id: string;
  title: string;
  count: number;
  urgent?: boolean;
  items: HallwayActionItem[];
  designerXpTier?: string;
  designerTotalXp?: number;
}

export interface HallwayActionsResponse {
  dayBasis?: string;
  scoped?: boolean;
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
  /** Home register card. Absent on any leftover upstream feed row. */
  registerKind?: 'booking' | 'weekly' | 'monthly' | 'milestone';
  /** quote_amount for the rail, already formatted. */
  quoteFormatted?: string;
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
    bookingDoneDate?: string;
    listingType?: string;
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
