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
  avatar: '',
  email: 'admin@hows.internal',
  department: 'Sales',
  isOnline: true,
};

export const alternateUserMock: User = {
  id: 'u2',
  name: 'Ranjith',
  role: 'ADMIN',
  initials: 'RJ',
  avatar: '',
  email: 'ranjith@hows.internal',
  department: 'Sales',
  isOnline: true,
};

export const designerUserMock: User = {
  id: 'u3',
  name: 'Maya Lin',
  role: 'DESIGN_LEAD',
  initials: 'ML',
  avatar: '',
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
