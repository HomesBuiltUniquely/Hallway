import {
  User,
  FeedPost,
  CalendarEvent,
  ActionItem,
  LeaderboardMember,
  LeaderboardTeam,
  IndividualRecord,
  TeamRecord,
  CrmLeadItem,
  DesignProject
} from '../types';
import announcementsSeed from './announcementsSeed.json';

export const currentUserMock: User = {
  id: 'u1',
  name: 'Super Admin',
  role: 'SUPER_ADMIN',
  initials: 'SA',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  email: 'admin@hows.internal',
  department: 'Sales',
  isOnline: true,
};

export const alternateUserMock: User = {
  id: 'u2',
  name: 'Ranjith',
  role: 'ADMIN',
  initials: 'RJ',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  email: 'ranjith@hows.internal',
  department: 'Sales',
  isOnline: true,
};

export const designerUserMock: User = {
  id: 'u3',
  name: 'Maya Lin',
  role: 'DESIGN_LEAD',
  initials: 'ML',
  avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
  email: 'maya.lin@hows.internal',
  department: 'Design',
  isOnline: true,
};

export const crmLeadsMock: CrmLeadItem[] = [];
export const initialFeedPosts: FeedPost[] = announcementsSeed as FeedPost[];
export const calendarEventsMock: CalendarEvent[] = [];
export const actionItemsMock: ActionItem[] = [];
export const leaderboardMembersMock: LeaderboardMember[] = [];
export const leaderboardTeamsMock: LeaderboardTeam[] = [];
export const individualRecordsMock: IndividualRecord[] = [];
export const teamRecordsMock: TeamRecord[] = [];
export const designProjectsMock: DesignProject[] = [];
