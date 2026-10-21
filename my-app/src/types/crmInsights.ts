export type DateRangeKey =
  | 'all'
  | 'current_month'
  | '3m'
  | '6m'
  | '1y'
  | 'previous_month'
  | 'custom';

export type TeamPeriod = 'monthly' | 'daily';

export type FunnelMode =
  | 'inventory'
  | 'current'
  | 'passages'
  | 'created_cohort'
  | 'cohort';

export type PathFilter = 'all' | 'won' | 'lost' | 'hold';

export type CrmInsightsRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SALES_ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_EXECUTIVE';

export type PerformanceTone = 'green' | 'yellow' | 'red' | 'neutral';
export type PerformanceTrend = 'up' | 'down' | 'flat';
export type PerformanceStatus = 'hit' | 'on_track' | 'at_risk' | 'behind';

export interface InsightsFilterParams {
  dateRange: DateRangeKey;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  salesManagerId?: number;
  salesExecutiveId?: number;
  teamPeriod: TeamPeriod;
  funnelMode: FunnelMode;
  pathFilter: PathFilter;
}

export interface FiltersApplied {
  dateRange?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  branchId?: string | null;
  salesManagerId?: number | null;
  salesExecutiveId?: number | null;
  teamPeriod?: string | null;
  funnelMode?: string;
  funnelModeContract?: string;
  pathFilter?: string;
  timezone?: string;
  assigneeRule?: string;
  branchField?: string;
  inventoryRule?: string;
  passagesRule?: string;
  cohortRule?: string;
  pathRule?: string;
}

export interface KpiPercentTile {
  value: number;
  changePercent?: number;
  changeAbsolute?: number;
  progressRatio: number;
}

export interface KpiAbsoluteTile {
  value: number;
  changePercent?: number;
  changeAbsolute?: number;
  progressRatio: number;
}

export type KpiTile = KpiPercentTile | KpiAbsoluteTile;

export interface InsightsKpis {
  totalLeads: KpiTile;
  conversionPercent: KpiTile;
  tokenValue: KpiTile;
  bookingValue: KpiTile;
  grossBooking: KpiTile;
  pipelineValue?: KpiTile;
  closedWon?: KpiTile;
}

export interface BookingValueCard {
  cardKey: 'bookingValue';
  title: string;
  valueInr: number;
  valueLabel: string;
  targetInr: number;
  targetLabel: string;
  completionPercent: number;
  progressRatio: number;
  status: PerformanceStatus;
  tone: PerformanceTone;
}

export interface WeightedPipelineCard {
  cardKey: 'weightedPipeline';
  title: string;
  valueInr: number;
  valueLabel: string;
  unweightedValueInr: number;
  remainingTargetInr: number;
  remainingTargetLabel: string;
  coverageX: number;
  coverageLabel: string;
  status: PerformanceStatus;
  tone: PerformanceTone;
}

export interface ConversionCard {
  cardKey: 'leadToMeeting' | 'meetingToBooking';
  title: string;
  valuePercent: number;
  targetPercent: number;
  variancePercent: number;
  varianceLabel: string;
  trend: PerformanceTrend;
  status: PerformanceStatus;
  tone: PerformanceTone;
  leadCount?: number;
  meetingCount?: number;
  bookingCount?: number;
}

export interface PerformanceCards {
  targets: {
    bookingValueInr: number;
    leadToMeetingPercent: number;
    meetingToBookingPercent: number;
  };
  counts: { leads: number; meetings: number; bookings: number };
  cards: {
    bookingValue: BookingValueCard;
    weightedPipeline: WeightedPipelineCard;
    leadToMeeting: ConversionCard;
    meetingToBooking: ConversionCard;
  };
}

export interface FunnelPathBreakdown {
  won: number;
  lost: number;
  hold: number;
}

export interface FunnelStage {
  stageKey: string;
  stageLabel: string;
  count: number;
  countLabel?: string;
  sharePercent: number;
  conversionPercent?: number;
  value?: number | null;
  investmentInr?: number | null;
  pathBreakdown?: FunnelPathBreakdown;
  newCount?: number;
  oldCount?: number;
  newSharePercent?: number;
  oldSharePercent?: number;
  dropPercent?: number;
}

export interface FunnelMeta {
  mode?: string;
  funnelMode?: string;
  pathFilter?: string;
  baseCount?: number;
  definition?: string;
  passagesAvailable?: boolean;
}

export interface FunnelBlock {
  total: number;
  stages: FunnelStage[];
}

export interface HoldSubstage {
  subStageKey: string;
  title: string;
  count: number;
}

export interface HoldPathStage {
  holdTotal: number;
  substages: HoldSubstage[];
}

export interface DropReasonItem {
  reason: string;
  count: number;
  percent: number;
}

export interface DropReasons {
  total: number;
  items: DropReasonItem[];
}

export interface RevenuePhase {
  phaseKey: string;
  phaseLabel: string;
  value: number;
  percent: number;
}

export interface RevenueDistribution {
  phases: RevenuePhase[];
  observation?: string;
}

export interface StageVelocityItem {
  fromStage: string;
  toStage: string;
  avgDays: number;
  trendDays: number;
}

export interface TeamPerformanceRow {
  userId: number;
  name: string;
  role: string;
  active: boolean;
  leads: number;
  meetings: number;
  proposals: number;
  closed: number;
  closedValue?: number;
  conversionPercent: number;
}

export interface TimeSeriesPoint {
  label: string;
  count?: number;
  conversionPercent?: number;
}

export interface LeadsOverTime {
  changePercent: number;
  points: TimeSeriesPoint[];
}

export interface ConversionTrend {
  changePercent: number;
  bucketField?: string;
  numeratorRule?: string;
  denominatorRule?: string;
  points: TimeSeriesPoint[];
}

export interface RevenueForecast {
  actual: number;
  projected: number;
  target: number;
  targetSource?: string;
  actualScope?: string;
  actualRule?: string;
  projectedRule?: string;
  targetYearMonth?: string;
}

export interface InsightsDashboard {
  filtersApplied: FiltersApplied;
  filtersAppliedSummary?: Partial<FiltersApplied>;
  performanceCards: PerformanceCards;
  kpis: InsightsKpis;
  salesFunnel: FunnelStage[];
  funnelMeta?: FunnelMeta;
  funnelMode?: string;
  pathFilter?: string;
  passagesAvailable?: boolean;
  total?: { count: number; sharePercent: number };
  stages?: FunnelStage[];
  definitions?: Record<string, string>;
  lostFunnel: FunnelBlock;
  holdFunnel: FunnelBlock;
  holdPathByStage: Record<string, HoldPathStage>;
  dropReasons: DropReasons;
  revenueDistribution: RevenueDistribution;
  stageVelocity: StageVelocityItem[];
  teamPerformance: TeamPerformanceRow[];
  leadsOverTime: LeadsOverTime;
  conversionTrend: ConversionTrend;
  revenueForecast: RevenueForecast;
}

export interface FilterPerson {
  id: number;
  name: string;
  role?: string;
  active?: boolean;
  branchId?: string;
  managerId?: number;
  executives?: FilterPerson[];
}

export interface FilterBranch {
  id: string;
  name: string;
}

export interface DatePreset {
  id: string;
  label: string;
}

export interface InsightsFilterOptions {
  datePresets?: DatePreset[];
  branches: FilterBranch[];
  salesManagers: FilterPerson[];
  salesExecutives: FilterPerson[];
}

export interface CrmLoginUser {
  id: number;
  username: string;
  email?: string;
  name?: string;
  fullName?: string;
  role: string;
  userRole?: string;
  roles?: string[];
  managerId?: number | null;
  branch?: string;
  designerName?: string;
  designerId?: number | null;
}

export interface CrmLoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: CrmLoginUser;
}

export interface CrmApiErrorBody {
  error?: string;
  message?: string;
  passagesAvailable?: boolean;
  funnelMode?: string;
  allowed?: string[];
}
