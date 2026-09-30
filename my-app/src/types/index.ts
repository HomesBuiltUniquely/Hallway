export interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
  initials: string;
  email: string;
  department: 'Sales' | 'Design' | 'Operations' | 'HR' | 'Finance';
  isOnline?: boolean;
}

export interface Comment {
  id: string;
  authorName: string;
  authorHandle?: string;
  authorAvatar: string;
  authorRole: string;
  content: string;
  timestamp: string;
  createdAt?: string;
  likes?: number;
  userLiked?: boolean;
}

export interface FeedPost {
  id: string;
  type: 'booking' | 'quota' | 'performer' | 'announcement' | 'general';
  categoryColor: string;
  title: string;
  timestamp: string;
  createdAt?: string;
  author?: {
    name: string;
    avatar: string;
    team: string;
  };
  content: string;
  quotaProgress?: {
    current: number;
    target: number;
    label: string;
    percentage: number;
    currentFormatted?: string;
    targetFormatted?: string;
  };
  reactions: {
    thumbsUp?: number;
    clap?: number;
    heart?: number;
    joy?: number;
    surprised?: number;
    sad?: number;
    pray?: number;
    userThumbsUp?: boolean;
    userClap?: boolean;
    userHeart?: boolean;
    userJoy?: boolean;
    userSurprised?: boolean;
    userSad?: boolean;
    userPray?: boolean;
    [key: string]: any;
  };
  commentsCount: number;
  comments: Comment[];
  badgeText?: string;
  department?: 'Sales' | 'Design' | 'Operations' | 'HR' | 'Finance';
  iconEmoji?: string;
}

export interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  location: string;
  isLink?: boolean;
  linkUrl?: string;
  category: 'meeting' | 'review' | 'townhall';
}

export interface ActionItem {
  id: string;
  title: string;
  count: number;
  badgeColor: string;
  urgent?: boolean;
  items: { id: string; name: string; detail: string; done: boolean }[];
}

export interface LeaderboardMember {
  rank: number;
  id: string;
  name: string;
  role: string;
  avatar: string;
  department: 'Sales' | 'Design' | 'Operations' | 'HR' | 'Finance';
  revenue: number;
  revenueFormatted: string;
  bookings: number;
  conversionRate: number;
  isCurrentUser?: boolean;
  trend?: 'up' | 'down' | 'steady';
}

export interface LeaderboardTeam {
  rank: number;
  id: string;
  teamName: string;
  leadName: string;
  avatar: string;
  department: 'Sales' | 'Design' | 'Operations' | 'HR' | 'Finance';
  totalRevenue: string;
  dealsClosed: number;
  winRate: number;
}

export interface IndividualRecord {
  id: string;
  title: string;
  holderName: string;
  holderRole: string;
  avatar: string;
  value: string;
  subValue: string;
  department: 'Sales' | 'Design' | 'Operations' | 'HR' | 'Finance';
  dateAwarded: string;
  verified: boolean;
  description?: string;
}

export interface TeamRecord {
  id: string;
  teamName: string;
  leadName: string;
  value: string;
  metricLabel: string;
  department: 'Sales' | 'Design' | 'Operations' | 'HR' | 'Finance';
  verified: boolean;
  iconName?: string;
}

export interface CrmLeadItem {
  id: string;
  enquiryDate: string;
  leadName: string;
  leadCode: string;
  tags: { label: string; bg: string; text: string }[];
  status: string;
  journeyTrack: { label: string; currentStep: number; totalSteps: number };
  owner: string;
  engagement: string;
  dueDate: string;
  dueTime: string;
}

export interface DesignProject {
  id: string;
  projectName: string;
  clientName: string;
  stage: 'Concept Drafting' | '3D Staging' | 'Material Selection' | 'Client Sign-off' | 'Approved';
  designer: string;
  renderThumbnail: string;
  progress: number;
  deadline: string;
}
