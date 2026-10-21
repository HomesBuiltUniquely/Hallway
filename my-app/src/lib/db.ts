import mysql, { Pool } from 'mysql2/promise';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'database-1.cl002gu0o5ft.ap-south-2.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'Hubinterior2019',
  database: process.env.DB_NAME || 'hallway_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 15000,
  ssl: undefined,
};

// Global pool to avoid exhaustion in Next.js hot reload
declare global {
  // eslint-disable-next-line no-var
  var _hallwayDbPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _hallwayDbHost: string | undefined;
}

export function getPool(): Pool {
  const currentHost = process.env.DB_HOST || 'database-1.cl002gu0o5ft.ap-south-2.rds.amazonaws.com';
  if (!global._hallwayDbPool || global._hallwayDbHost !== currentHost) {
    if (global._hallwayDbPool) {
      global._hallwayDbPool.end().catch(() => {});
    }
    global._hallwayDbHost = currentHost;
    global._hallwayDbPool = mysql.createPool(DB_CONFIG);
  }
  return global._hallwayDbPool;
}

export const CATEGORY_COLORS: Record<string, string> = {
  announcement: 'var(--brand)',
  booking: '#10B981',
  quota: '#8B5CF6',
  performer: '#F59E0B',
  general: '#3B82F6',
};

export const DEFAULT_REACTIONS: Record<string, any> = {
  thumbsUp: 0,
  clap: 0,
  heart: 0,
  joy: 0,
  surprised: 0,
  pray: 0,
  fire: 0,
  party: 0,
  hundred: 0,
  rocket: 0,
  userThumbsUp: false,
  userClap: false,
  userHeart: false,
  userJoy: false,
  userSurprised: false,
  userPray: false,
  userFire: false,
  userParty: false,
  userHundred: false,
  userRocket: false,
  /** Map of viewer key → reaction type (per-user WhatsApp semantics) */
  byUser: {} as Record<string, string>,
};

export function parseReactions(raw: any) {
  let reactions = { ...DEFAULT_REACTIONS };
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (typeof parsed === 'object' && parsed !== null) {
        reactions = { ...reactions, ...parsed };
      }
    } catch {
      // ignore JSON parse error
    }
  }
  return reactions;
}

// ==========================================
// Persistent JSON Storage Fallback / Mirror
// ==========================================

function getStoragePath(): string {
  const custom = process.env.ANNOUNCEMENTS_FILE;
  if (custom) return custom;
  const candidates = [
    path.join(process.cwd(), 'src', 'data', 'announcements.json'),
    path.join(process.cwd(), 'my-app', 'src', 'data', 'announcements.json'),
    path.join(__dirname, '..', 'data', 'announcements.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}

function getSeedPath(): string {
  const candidates = [
    path.join(process.cwd(), 'src', 'data', 'announcementsSeed.json'),
    path.join(process.cwd(), 'my-app', 'src', 'data', 'announcementsSeed.json'),
    path.join(__dirname, '..', 'data', 'announcementsSeed.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}

function getJsonAnnouncements(): any[] {
  try {
    const storagePath = getStoragePath();
    if (existsSync(storagePath)) {
      const content = readFileSync(storagePath, 'utf-8');
      return JSON.parse(content);
    }
    const seedPath = getSeedPath();
    if (existsSync(seedPath)) {
      const content = readFileSync(seedPath, 'utf-8');
      const list = JSON.parse(content);
      saveJsonAnnouncements(list);
      return list;
    }
    return [];
  } catch (err) {
    console.error('Error reading JSON announcements:', err);
    return [];
  }
}

function saveJsonAnnouncements(data: any[]): boolean {
  try {
    const storagePath = getStoragePath();
    const dir = path.dirname(storagePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving JSON announcements:', err);
    return false;
  }
}

// ==========================================
// Schema bootstrap (hallway_db)
// ==========================================

let _schemaReady: Promise<void> | null = null;

/** Ensure announcements + comments tables exist before any write/read. */
export async function ensureHallwaySchema(): Promise<void> {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(191) PRIMARY KEY,
        type VARCHAR(64) NOT NULL DEFAULT 'announcement',
        category_color VARCHAR(64) NULL,
        title TEXT NOT NULL,
        timestamp_text VARCHAR(128) NULL,
        author_name VARCHAR(255) NULL,
        author_avatar TEXT NULL,
        author_team VARCHAR(255) NULL,
        content MEDIUMTEXT NULL,
        quota_progress JSON NULL,
        reactions JSON NULL,
        comments_count INT NOT NULL DEFAULT 0,
        department VARCHAR(128) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_announcements_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(191) PRIMARY KEY,
        announcement_id VARCHAR(191) NOT NULL,
        author_name VARCHAR(255) NULL,
        author_handle VARCHAR(255) NULL,
        author_avatar TEXT NULL,
        author_role VARCHAR(255) NULL,
        content MEDIUMTEXT NOT NULL,
        timestamp_text VARCHAR(128) NULL,
        likes INT NOT NULL DEFAULT 0,
        user_liked TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_comments_announcement (announcement_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS active_campaign (
        id VARCHAR(191) PRIMARY KEY,
        title VARCHAR(512) NOT NULL,
        branch_name VARCHAR(255) NULL,
        description MEDIUMTEXT NULL,
        voucher_code VARCHAR(128) NULL,
        discount_percent VARCHAR(64) NULL,
        target_date DATETIME NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  })().catch((err) => {
    _schemaReady = null;
    throw err;
  });
  return _schemaReady;
}

// ==========================================
// Database / Persistent CRUD Operations
// ==========================================

export async function getAnnouncements() {
  try {
    const pool = getPool();
    await ensureHallwaySchema();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM announcements ORDER BY created_at DESC, id DESC'
    );

    // If MySQL has 0 rows, auto-seed from JSON storage into MySQL
    if (rows.length === 0) {
      const jsonList = getJsonAnnouncements();
      for (const item of jsonList) {
        try {
          await ensureAnnouncementExists(pool, item.id, item);
        } catch {
          // ignore seed errors
        }
      }
      const [seededRows] = await pool.query<any[]>(
        'SELECT * FROM announcements ORDER BY created_at DESC, id DESC'
      );
      rows.push(...seededRows);
    }

    const announcements = [];
    for (const row of rows) {
      const [comments] = await pool.query<any[]>(
        'SELECT * FROM comments WHERE announcement_id = ? ORDER BY created_at DESC',
        [row.id]
      );

      let quotaProgress = null;
      if (row.quota_progress) {
        quotaProgress = typeof row.quota_progress === 'string' ? JSON.parse(row.quota_progress) : row.quota_progress;
      }

      const reactions = parseReactions(row.reactions);

      announcements.push({
        id: row.id,
        type: row.type || 'announcement',
        categoryColor: row.category_color || CATEGORY_COLORS[row.type] || '#3B82F6',
        title: row.title,
        timestamp: row.timestamp_text || 'Just Now',
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        author: {
          name: row.author_name || 'Leadership',
          avatar: row.author_avatar || '',
          team: row.author_team || `${row.department || 'Sales'} Hub`,
        },
        content: row.content,
        quotaProgress,
        reactions,
        commentsCount: comments.length,
        department: row.department || 'Sales',
        comments: comments.map((c) => ({
          id: c.id,
          authorName: c.author_name,
          authorHandle: c.author_handle,
          authorAvatar: c.author_avatar || '',
          authorRole: c.author_role || 'Team Member',
          content: c.content,
          timestamp: c.timestamp_text || 'Just now',
          createdAt: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
          likes: c.likes || 0,
          userLiked: Boolean(c.user_liked),
        })),
      });
    }

    return announcements;
  } catch (err: any) {
    console.warn('MySQL read error, using persistent JSON storage fallback:', err?.message || err);
  }

  // Fallback: Read from persistent JSON storage
  const list = getJsonAnnouncements();
  return list.sort((a, b) => {
    const getTime = (p: any) => {
      if (p.createdAt) {
        const t = new Date(p.createdAt).getTime();
        if (!isNaN(t)) return t;
      }
      if (p.id && String(p.id).startsWith('post-')) {
        const num = Number(String(p.id).replace('post-', ''));
        if (!isNaN(num)) return num;
      }
      return 0;
    };
    return getTime(b) - getTime(a);
  });
}

export async function getAnnouncementById(id: string) {
  try {
    const pool = getPool();
    await ensureHallwaySchema();
    const [rows] = await pool.query<any[]>('SELECT * FROM announcements WHERE id = ?', [id]);
    if (rows.length > 0) {
      const row = rows[0];
      const [comments] = await pool.query<any[]>(
        'SELECT * FROM comments WHERE announcement_id = ? ORDER BY created_at DESC',
        [row.id]
      );

      let quotaProgress = null;
      if (row.quota_progress) {
        quotaProgress = typeof row.quota_progress === 'string' ? JSON.parse(row.quota_progress) : row.quota_progress;
      }

      const reactions = parseReactions(row.reactions);

      return {
        id: row.id,
        type: row.type || 'announcement',
        categoryColor: row.category_color || CATEGORY_COLORS[row.type] || '#3B82F6',
        title: row.title,
        timestamp: row.timestamp_text || 'Just Now',
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        author: {
          name: row.author_name || 'Leadership',
          avatar: row.author_avatar || '',
          team: row.author_team || `${row.department || 'Sales'} Hub`,
        },
        content: row.content,
        quotaProgress,
        reactions,
        commentsCount: comments.length,
        department: row.department || 'Sales',
        comments: comments.map((c) => ({
          id: c.id,
          authorName: c.author_name,
          authorHandle: c.author_handle,
          authorAvatar: c.author_avatar || '',
          authorRole: c.author_role || 'Team Member',
          content: c.content,
          timestamp: c.timestamp_text || 'Just now',
          createdAt: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
          likes: c.likes || 0,
          userLiked: Boolean(c.user_liked),
        })),
      };
    }
  } catch (err: any) {
    console.warn('MySQL getById error, using JSON fallback:', err?.message || err);
  }

  // Fallback: Read from JSON
  const list = getJsonAnnouncements();
  return list.find((a) => a.id === id) || null;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  type?: 'booking' | 'quota' | 'performer' | 'announcement' | 'general';
  categoryColor?: string;
  department?: string;
  author?: {
    name?: string;
    avatar?: string;
    team?: string;
  };
  quotaProgress?: {
    current: number;
    target: number;
    label: string;
    percentage: number;
  } | null;
}

export async function createAnnouncement(data: CreateAnnouncementInput) {
  const id = 'post-' + Date.now();
  const type = data.type || 'announcement';
  const categoryColor = data.categoryColor || CATEGORY_COLORS[type] || '#3B82F6';
  const authorName = data.author?.name || 'Leadership';
  const authorAvatar = data.author?.avatar || '';
  const authorTeam = data.author?.team || `${data.department || 'HQ'} Hub`;
  const department = data.department || 'Sales';
  const reactions = { ...DEFAULT_REACTIONS };
  const quotaProgressJson = data.quotaProgress ? JSON.stringify(data.quotaProgress) : null;
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    const pool = getPool();
    await ensureHallwaySchema();
    await pool.query(
      `INSERT INTO announcements (
        id, type, category_color, title, timestamp_text,
        author_name, author_avatar, author_team,
        content, quota_progress, reactions, comments_count, department, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        type,
        categoryColor,
        data.title.trim(),
        'Just Now',
        authorName,
        authorAvatar,
        authorTeam,
        data.content.trim(),
        quotaProgressJson,
        JSON.stringify(reactions),
        0,
        department,
        now,
      ]
    );

    const created = await getAnnouncementById(id);
    if (created) {
      // Also mirror to JSON
      try {
        const list = getJsonAnnouncements();
        list.unshift(created);
        saveJsonAnnouncements(list);
      } catch {
        // ignore
      }
      return created;
    }
  } catch (err: any) {
    console.warn('MySQL create error, falling back to JSON:', err?.message || err);
  }

  // Fallback: Save to JSON
  const newPost = {
    id,
    type,
    categoryColor,
    title: data.title.trim(),
    timestamp: 'Just now',
    createdAt: nowIso,
    author: {
      name: authorName,
      avatar: authorAvatar,
      team: authorTeam,
    },
    content: data.content.trim(),
    quotaProgress: data.quotaProgress || null,
    reactions,
    commentsCount: 0,
    department,
    comments: [],
  };

  const list = getJsonAnnouncements();
  list.unshift(newPost);
  saveJsonAnnouncements(list);
  return newPost;
}

export async function ensureAnnouncementExists(
  pool: Pool,
  id: string,
  defaults?: {
    title?: string;
    type?: string;
    authorName?: string;
    authorTeam?: string;
    authorAvatar?: string;
    categoryColor?: string;
    content?: string;
    department?: string;
    quotaProgress?: any;
    author?: { name?: string; avatar?: string; team?: string };
  }
) {
  await ensureHallwaySchema();
  const [rows] = await pool.query<any[]>('SELECT id, title, content FROM announcements WHERE id = ?', [id]);
  if (rows.length === 0) {
    const type = defaults?.type || 'booking';
    const title = defaults?.title || 'CRM Live Update';
    const categoryColor = defaults?.categoryColor || CATEGORY_COLORS[type] || '#10B981';
    const authorName = defaults?.author?.name || defaults?.authorName || 'Sales Executive';
    const authorAvatar =
      defaults?.author?.avatar ||
      defaults?.authorAvatar ||
      '';
    const authorTeam = defaults?.author?.team || defaults?.authorTeam || 'Sales Hub';
    const content = defaults?.content || 'Live event synced from CRM.';
    const department = defaults?.department || 'Sales';
    const quotaProgressJson = defaults?.quotaProgress ? JSON.stringify(defaults.quotaProgress) : null;
    const now = new Date();

    await pool.query(
      `INSERT INTO announcements (
        id, type, category_color, title, timestamp_text,
        author_name, author_avatar, author_team,
        content, quota_progress, reactions, comments_count, department, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        type,
        categoryColor,
        title,
        'Live',
        authorName,
        authorAvatar,
        authorTeam,
        content,
        quotaProgressJson,
        JSON.stringify(DEFAULT_REACTIONS),
        0,
        department,
        now,
      ]
    );
  } else if (defaults?.title && (rows[0].title === 'CRM Live Update' || rows[0].content === 'Live event synced from CRM.')) {
    // If it was inserted previously with fallback placeholder text, update it with the authentic metadata
    const quotaProgressJson = defaults?.quotaProgress ? JSON.stringify(defaults.quotaProgress) : null;
    await pool.query(
      `UPDATE announcements SET title = ?, content = ?, type = ?, category_color = ?, author_name = ?, author_team = ?, department = ?, quota_progress = COALESCE(?, quota_progress) WHERE id = ?`,
      [
        defaults.title,
        defaults.content || rows[0].content,
        defaults.type || 'booking',
        defaults.categoryColor || '#10B981',
        defaults.author?.name || defaults.authorName || 'Sales Executive',
        defaults.author?.team || defaults.authorTeam || 'Sales Hub',
        defaults.department || 'Sales',
        quotaProgressJson,
        id,
      ]
    );
  }
}

export function ensureJsonAnnouncement(
  id: string,
  defaults?: {
    title?: string;
    type?: string;
    authorName?: string;
    authorTeam?: string;
    authorAvatar?: string;
    categoryColor?: string;
    content?: string;
    department?: string;
    quotaProgress?: any;
    author?: { name?: string; avatar?: string; team?: string };
  }
) {
  const list = getJsonAnnouncements();
  let post = list.find((a) => a.id === id);
  if (!post) {
    const nowIso = new Date().toISOString();
    const type = defaults?.type || 'booking';
    const authorName = defaults?.author?.name || defaults?.authorName || 'Sales Executive';
    const authorAvatar =
      defaults?.author?.avatar ||
      defaults?.authorAvatar ||
      '';
    const authorTeam = defaults?.author?.team || defaults?.authorTeam || 'Sales Hub';

    post = {
      id,
      type,
      categoryColor: defaults?.categoryColor || CATEGORY_COLORS[type] || '#10B981',
      title: defaults?.title || 'CRM Live Update',
      timestamp: 'Live',
      createdAt: nowIso,
      author: {
        name: authorName,
        avatar: authorAvatar,
        team: authorTeam,
      },
      content: defaults?.content || 'Live event synced from CRM.',
      quotaProgress: defaults?.quotaProgress || null,
      reactions: { ...DEFAULT_REACTIONS },
      commentsCount: 0,
      department: defaults?.department || 'Sales',
      comments: [],
    };
    list.unshift(post);
    saveJsonAnnouncements(list);
  } else if (defaults?.title && (post.title === 'CRM Live Update' || post.content === 'Live event synced from CRM.')) {
    post.title = defaults.title;
    if (defaults.content) post.content = defaults.content;
    if (defaults.type) post.type = defaults.type;
    if (defaults.categoryColor) post.categoryColor = defaults.categoryColor;
    if (defaults.quotaProgress) post.quotaProgress = defaults.quotaProgress;
    saveJsonAnnouncements(list);
  }
  return post;
}

export async function addComment(
  announcementId: string,
  commentData: {
    content: string;
    authorName?: string;
    authorHandle?: string;
    authorAvatar?: string;
    authorRole?: string;
  },
  postMetadata?: any
) {
  const commentId = 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const name = commentData.authorName || 'Ranjith';
  const handle = commentData.authorHandle || name.toLowerCase().replace(/\s+/g, '.');
  const now = new Date();
  const nowIso = now.toISOString();

  let createdComment: any = null;
  let announcementResult: any = null;

  const pool = getPool();
  await ensureAnnouncementExists(pool, announcementId, postMetadata);

  await pool.query(
    `INSERT INTO comments (
      id, announcement_id, author_name, author_handle, author_avatar,
      author_role, content, timestamp_text, likes, user_liked, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      commentId,
      announcementId,
      name,
      handle,
      commentData.authorAvatar || '',
      commentData.authorRole || 'CRM Lead',
      commentData.content.trim(),
      'Just now',
      0,
      0,
      now,
    ]
  );

  await pool.query(
    'UPDATE announcements SET comments_count = (SELECT COUNT(*) FROM comments WHERE announcement_id = ?) WHERE id = ?',
    [announcementId, announcementId]
  );

  announcementResult = await getAnnouncementById(announcementId);
  createdComment = announcementResult?.comments?.find((c: any) => c.id === commentId);

  // Mirror to JSON after MySQL success (not a substitute for hallway_db)
  try {
    const list = getJsonAnnouncements();
    let post = list.find((a) => a.id === announcementId);
    if (!post) {
      post = ensureJsonAnnouncement(announcementId, postMetadata);
    }
    if (!Array.isArray(post.comments)) post.comments = [];

    const jsonComment = createdComment || {
      id: commentId,
      authorName: name,
      authorHandle: handle,
      authorAvatar: commentData.authorAvatar || '',
      authorRole: commentData.authorRole || 'CRM Lead',
      content: commentData.content.trim(),
      timestamp: 'Just now',
      createdAt: nowIso,
      likes: 0,
      userLiked: false,
    };

    if (!post.comments.some((c: any) => c.id === commentId)) {
      post.comments.unshift(jsonComment);
      post.commentsCount = post.comments.length;
      saveJsonAnnouncements(list);
    }
  } catch (err) {
    console.error('JSON sync error in addComment:', err);
  }

  return { comment: createdComment, announcement: announcementResult };
}

const REACTION_COUNT_KEYS = [
  'thumbsUp',
  'clap',
  'heart',
  'joy',
  'surprised',
  'pray',
  'fire',
  'party',
  'hundred',
  'rocket',
] as const;

function userReactionKey(reactionType: string) {
  return 'user' + reactionType.charAt(0).toUpperCase() + reactionType.slice(1);
}

/** Project global user* flags for a specific viewer from byUser map. */
export function withViewerReactionFlags(raw: any, userKey?: string | null) {
  const reactions = parseReactions(raw);
  const byUser =
    reactions.byUser && typeof reactions.byUser === 'object' ? reactions.byUser : {};
  reactions.byUser = byUser;
  const key = (userKey || '').toLowerCase().trim();
  const mine = key && byUser[key] ? String(byUser[key]) : null;
  for (const k of REACTION_COUNT_KEYS) {
    reactions[userReactionKey(k)] = mine === k;
  }
  return reactions;
}

/**
 * WhatsApp-style: one reaction per user — toggle off or replace.
 * Counts + byUser map are shared; user* flags are set for this viewer.
 */
export function applyWhatsAppReaction(raw: any, reactionType: string, userKey?: string | null) {
  const reactions = parseReactions(raw);
  const byUser: Record<string, string> = {
    ...(reactions.byUser && typeof reactions.byUser === 'object' ? reactions.byUser : {}),
  };
  const key = (userKey || 'anonymous').toLowerCase().trim() || 'anonymous';
  const current = byUser[key] || null;

  // Legacy migration: if no byUser entry but a global user* flag is set, treat as this user
  let legacy: string | null = current;
  if (!legacy) {
    for (const k of REACTION_COUNT_KEYS) {
      if (reactions[userReactionKey(k)]) {
        legacy = k;
        break;
      }
    }
  }

  if (legacy === reactionType) {
    reactions[reactionType] = Math.max(0, (Number(reactions[reactionType]) || 0) - 1);
    delete byUser[key];
  } else {
    if (legacy) {
      reactions[legacy] = Math.max(0, (Number(reactions[legacy]) || 0) - 1);
    }
    reactions[reactionType] = (Number(reactions[reactionType]) || 0) + 1;
    byUser[key] = reactionType;
  }

  reactions.byUser = byUser;
  return withViewerReactionFlags(reactions, key);
}

export async function toggleReaction(
  announcementId: string,
  reactionType: string,
  postMetadata?: any,
  userKey?: string | null
) {
  const pool = getPool();
  await ensureAnnouncementExists(pool, announcementId, postMetadata);

  const [rows] = await pool.query<any[]>('SELECT reactions FROM announcements WHERE id = ?', [
    announcementId,
  ]);
  if (rows.length === 0) {
    throw new Error('Announcement not found in hallway_db');
  }

  const updatedReactions = applyWhatsAppReaction(rows[0].reactions, reactionType, userKey);
  await pool.query('UPDATE announcements SET reactions = ? WHERE id = ?', [
    JSON.stringify(updatedReactions),
    announcementId,
  ]);

  // Mirror to JSON after MySQL success
  try {
    const list = getJsonAnnouncements();
    let post = list.find((a) => a.id === announcementId);
    if (!post) {
      post = ensureJsonAnnouncement(announcementId, postMetadata);
    }
    post.reactions = updatedReactions;
    saveJsonAnnouncements(list);
  } catch (err) {
    console.error('JSON sync error in toggleReaction:', err);
  }

  return updatedReactions;
}

export async function toggleCommentLike(announcementId: string, commentId: string) {
  try {
    const pool = getPool();
    const [rows] = await pool.query<any[]>('SELECT likes, user_liked FROM comments WHERE id = ?', [commentId]);
    if (rows.length > 0) {
      const userLiked = !rows[0].user_liked;
      const likes = Math.max(0, (rows[0].likes || 0) + (userLiked ? 1 : -1));

      await pool.query('UPDATE comments SET likes = ?, user_liked = ? WHERE id = ?', [
        likes,
        userLiked ? 1 : 0,
        commentId,
      ]);

      const [updated] = await pool.query<any[]>('SELECT * FROM comments WHERE id = ?', [commentId]);
      const c = updated[0];

      return {
        id: c.id,
        authorName: c.author_name,
        authorHandle: c.author_handle,
        authorAvatar: c.author_avatar,
        authorRole: c.author_role,
        content: c.content,
        timestamp: c.timestamp_text,
        likes: c.likes,
        userLiked: Boolean(c.user_liked),
      };
    }
  } catch (err: any) {
    console.error('MySQL error in toggleCommentLike:', err?.message || err);
  }

  // Fallback: Toggle in JSON
  const list = getJsonAnnouncements();
  const post = list.find((a) => a.id === announcementId);
  if (!post || !Array.isArray(post.comments)) return null;
  const comm = post.comments.find((c: any) => c.id === commentId);
  if (!comm) return null;

  const userLiked = !comm.userLiked;
  comm.likes = Math.max(0, (comm.likes || 0) + (userLiked ? 1 : -1));
  comm.userLiked = userLiked;

  saveJsonAnnouncements(list);
  return comm;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  let deletedFromMysql = false;
  try {
    const pool = getPool();
    await pool.query('DELETE FROM comments WHERE announcement_id = ?', [id]);
    const [res] = await pool.query<any>('DELETE FROM announcements WHERE id = ?', [id]);
    deletedFromMysql = res?.affectedRows > 0;
  } catch (err: any) {
    console.error('MySQL error in deleteAnnouncement:', err?.message || err);
  }

  // Also remove from persistent JSON storage
  try {
    const list = getJsonAnnouncements();
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length !== list.length) {
      saveJsonAnnouncements(filtered);
      return true;
    }
  } catch (err) {
    console.error('JSON sync error in deleteAnnouncement:', err);
  }

  return deletedFromMysql;
}

export async function deleteComment(announcementId: string, commentId: string): Promise<boolean> {
  let deletedFromMysql = false;
  try {
    const pool = getPool();
    const [res] = await pool.query<any>('DELETE FROM comments WHERE id = ? AND announcement_id = ?', [
      commentId,
      announcementId,
    ]);
    deletedFromMysql = res?.affectedRows > 0;
    if (deletedFromMysql) {
      await pool.query(
        'UPDATE announcements SET comments_count = (SELECT COUNT(*) FROM comments WHERE announcement_id = ?) WHERE id = ?',
        [announcementId, announcementId]
      );
    }
  } catch (err: any) {
    console.error('MySQL error in deleteComment:', err?.message || err);
  }

  // Also remove from persistent JSON storage
  try {
    const list = getJsonAnnouncements();
    const post = list.find((a) => a.id === announcementId);
    if (post && Array.isArray(post.comments)) {
      const initialLen = post.comments.length;
      post.comments = post.comments.filter((c: any) => c.id !== commentId);
      post.commentsCount = post.comments.length;
      if (post.comments.length !== initialLen) {
        saveJsonAnnouncements(list);
        return true;
      }
    }
  } catch (err) {
    console.error('JSON sync error in deleteComment:', err);
  }

  return deletedFromMysql;
}

// ==========================================
// Company-wide Active Campaign (shared for all members)
// ==========================================

export type HallwayActiveCampaign = {
  id: string;
  title: string;
  branchName: string;
  description: string;
  voucherCode: string;
  discountPercent: string;
  targetDate: string;
  isActive: boolean;
};

/** One company-wide campaign. Admins publish it; nothing is seeded. */
const COMPANY_CAMPAIGN_ID = 'camp-company-active';

/** The old starter row. Drop it so a real admin publish is the only campaign. */
function isLegacySeedCampaign(row: {
  title?: string;
  voucher_code?: string;
  description?: string;
}): boolean {
  const title = String(row.title || '').trim();
  const voucher = String(row.voucher_code || '').trim();
  const description = String(row.description || '');
  return (
    title === 'Indiranagar Launch Boost' &&
    voucher === 'INDIRA10' &&
    description.includes('new Indiranagar branch before Sunday night')
  );
}

function rowToCampaign(row: any): HallwayActiveCampaign {
  return {
    id: row.id,
    title: row.title || '',
    branchName: row.branch_name || '',
    description: row.description || '',
    voucherCode: row.voucher_code || '',
    discountPercent: row.discount_percent || '',
    targetDate: row.target_date ? new Date(row.target_date).toISOString() : '',
    isActive: Boolean(row.is_active),
  };
}

/** The published company campaign, or null when an admin has not set one. */
export async function getActiveCampaign(): Promise<HallwayActiveCampaign | null> {
  const pool = getPool();
  await ensureHallwaySchema();
  const [existing] = await pool.query<any[]>('SELECT * FROM active_campaign');
  for (const row of existing) {
    if (isLegacySeedCampaign(row)) {
      await pool.query('DELETE FROM active_campaign WHERE id = ?', [row.id]);
    }
  }

  const [rows] = await pool.query<any[]>(
    `SELECT * FROM active_campaign
     WHERE is_active = 1
     ORDER BY (id = ?) DESC, updated_at DESC
     LIMIT 1`,
    [COMPANY_CAMPAIGN_ID]
  );
  if (rows.length === 0) return null;
  return rowToCampaign(rows[0]);
}

/** Publish the one company campaign. Admin saves replace this row and turn it on. */
export async function upsertActiveCampaign(
  data: Partial<HallwayActiveCampaign> & { title?: string }
): Promise<HallwayActiveCampaign> {
  const pool = getPool();
  await ensureHallwaySchema();
  const title = String(data.title || '').trim();
  if (!title) {
    throw new Error('Campaign title is required');
  }

  const [rows] = await pool.query<any[]>(
    'SELECT * FROM active_campaign WHERE id = ? LIMIT 1',
    [COMPANY_CAMPAIGN_ID]
  );
  const current = rows[0] ? rowToCampaign(rows[0]) : null;
  const next: HallwayActiveCampaign = {
    id: COMPANY_CAMPAIGN_ID,
    title,
    branchName: (data.branchName ?? current?.branchName ?? '').trim(),
    description: (data.description ?? current?.description ?? '').trim(),
    voucherCode: (data.voucherCode ?? current?.voucherCode ?? '').trim(),
    discountPercent: (data.discountPercent ?? current?.discountPercent ?? '').trim(),
    targetDate: data.targetDate || current?.targetDate || '',
    isActive: data.isActive !== false,
  };

  await pool.query(
    `INSERT INTO active_campaign (
      id, title, branch_name, description, voucher_code, discount_percent, target_date, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      branch_name = VALUES(branch_name),
      description = VALUES(description),
      voucher_code = VALUES(voucher_code),
      discount_percent = VALUES(discount_percent),
      target_date = VALUES(target_date),
      is_active = VALUES(is_active)`,
    [
      next.id,
      next.title,
      next.branchName,
      next.description,
      next.voucherCode,
      next.discountPercent,
      next.targetDate ? new Date(next.targetDate) : null,
      next.isActive ? 1 : 0,
    ]
  );
  await pool.query('DELETE FROM active_campaign WHERE id <> ?', [COMPANY_CAMPAIGN_ID]);

  return next;
}

