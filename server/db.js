require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root@root',
  database: process.env.DB_NAME || 'hallway_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 3000
};

let pool = null;

async function initDb() {
  try {
    // 1. Connect without database to ensure database exists
    const adminConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      connectTimeout: 3000
    });

    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`;`);
    await adminConn.end();

    // 2. Create pool on the target database
    pool = mysql.createPool(DB_CONFIG);

    // 3. Create tables if not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(64) PRIMARY KEY,
        type VARCHAR(32) NOT NULL DEFAULT 'announcement',
        category_color VARCHAR(16) DEFAULT '#3B82F6',
        title VARCHAR(255) NOT NULL,
        timestamp_text VARCHAR(64) DEFAULT 'Just Now',
        author_name VARCHAR(128) DEFAULT 'Leadership',
        author_avatar VARCHAR(255),
        author_team VARCHAR(128) DEFAULT 'HQ',
        content TEXT NOT NULL,
        quota_progress JSON NULL,
        reactions JSON,
        comments_count INT DEFAULT 0,
        department VARCHAR(64) DEFAULT 'Sales',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(64) PRIMARY KEY,
        announcement_id VARCHAR(64) NOT NULL,
        author_name VARCHAR(128) NOT NULL,
        author_handle VARCHAR(128),
        author_avatar VARCHAR(255),
        author_role VARCHAR(128) DEFAULT 'Team Member',
        content TEXT NOT NULL,
        timestamp_text VARCHAR(64) DEFAULT 'Just now',
        likes INT DEFAULT 0,
        user_liked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (announcement_id),
        CONSTRAINT fk_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
      );
    `);

    // 4. Seed from JSON if empty
    const [existing] = await pool.query('SELECT COUNT(*) as count FROM announcements');
    if (existing[0].count === 0) {
      const jsonPath = path.join(__dirname, 'data', 'announcements.json');
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const list = JSON.parse(raw);
        for (const item of list) {
          await pool.query(
            `INSERT INTO announcements (
              id, type, category_color, title, timestamp_text,
              author_name, author_avatar, author_team,
              content, quota_progress, reactions, comments_count, department
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              item.type,
              item.categoryColor,
              item.title,
              item.timestamp,
              item.author?.name || 'Leadership',
              item.author?.avatar || '',
              item.author?.team || 'HQ',
              item.content,
              item.quotaProgress ? JSON.stringify(item.quotaProgress) : null,
              JSON.stringify(item.reactions || { thumbsUp: 0, clap: 0, heart: 0 }),
              item.commentsCount || (item.comments ? item.comments.length : 0),
              item.department || 'Sales'
            ]
          );

          if (Array.isArray(item.comments)) {
            for (const c of item.comments) {
              await pool.query(
                `INSERT INTO comments (
                  id, announcement_id, author_name, author_handle, author_avatar,
                  author_role, content, timestamp_text, likes, user_liked
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  c.id,
                  item.id,
                  c.authorName,
                  c.authorHandle || c.authorName.toLowerCase().replace(/\s+/g, '.'),
                  c.authorAvatar || '',
                  c.authorRole || 'Team Member',
                  c.content,
                  c.timestamp || 'Just now',
                  c.likes || 0,
                  c.userLiked ? 1 : 0
                ]
              );
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ MySQL initialization error:', err.message);
    throw err;
  }
}

async function getAnnouncements() {
  const [rows] = await pool.query(
    'SELECT * FROM announcements ORDER BY created_at DESC, id DESC'
  );

  const announcements = [];
  for (const row of rows) {
    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE announcement_id = ? ORDER BY created_at DESC',
      [row.id]
    );

    announcements.push({
      id: row.id,
      type: row.type,
      categoryColor: row.category_color,
      title: row.title,
      timestamp: row.timestamp_text,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      author: {
        name: row.author_name,
        avatar: row.author_avatar,
        team: row.author_team
      },
      content: row.content,
      quotaProgress: typeof row.quota_progress === 'string' ? JSON.parse(row.quota_progress) : row.quota_progress,
      reactions: typeof row.reactions === 'string' ? JSON.parse(row.reactions) : (row.reactions || { thumbsUp: 0, clap: 0, heart: 0 }),
      commentsCount: comments.length,
      department: row.department,
      comments: comments.map((c) => ({
        id: c.id,
        authorName: c.author_name,
        authorHandle: c.author_handle,
        authorAvatar: c.author_avatar,
        authorRole: c.author_role,
        content: c.content,
        timestamp: c.timestamp_text,
        createdAt: c.created_at,
        likes: c.likes || 0,
        userLiked: Boolean(c.user_liked)
      }))
    });
  }

  return announcements;
}

async function getAnnouncementById(id) {
  const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [id]);
  if (rows.length === 0) return null;

  const row = rows[0];
  const [comments] = await pool.query(
    'SELECT * FROM comments WHERE announcement_id = ? ORDER BY created_at DESC',
    [row.id]
  );

  return {
    id: row.id,
    type: row.type,
    categoryColor: row.category_color,
    title: row.title,
    timestamp: row.timestamp_text,
    author: {
      name: row.author_name,
      avatar: row.author_avatar,
      team: row.author_team
    },
    content: row.content,
    quotaProgress: typeof row.quota_progress === 'string' ? JSON.parse(row.quota_progress) : row.quota_progress,
    reactions: typeof row.reactions === 'string' ? JSON.parse(row.reactions) : (row.reactions || {}),
    commentsCount: comments.length,
    department: row.department,
    comments: comments.map((c) => ({
      id: c.id,
      authorName: c.author_name,
      authorHandle: c.author_handle,
      authorAvatar: c.author_avatar,
      authorRole: c.author_role,
      content: c.content,
      timestamp: c.timestamp_text,
      createdAt: c.created_at,
      likes: c.likes || 0,
      userLiked: Boolean(c.user_liked)
    }))
  };
}

async function createAnnouncement(data) {
  const colors = {
    booking: '#10B981',
    quota: '#8B5CF6',
    performer: '#F59E0B',
    announcement: '#EF4444',
    general: '#3B82F6'
  };

  const id = 'post-' + Date.now();
  const reactions = { thumbsUp: 1, clap: 1, heart: 1, userThumbsUp: true, userClap: false, userHeart: false };
  const quotaProgressJson = data.quotaProgress ? JSON.stringify(data.quotaProgress) : null;
  const type = data.type || 'announcement';

  await pool.query(
    `INSERT INTO announcements (
      id, type, category_color, title, timestamp_text,
      author_name, author_avatar, author_team,
      content, quota_progress, reactions, comments_count, department
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      type,
      data.categoryColor || colors[type] || '#3B82F6',
      data.title.trim(),
      'Just Now',
      data.author?.name || 'Leadership',
      data.author?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      data.author?.team || (data.department || 'HQ') + ' Hub',
      data.content.trim(),
      quotaProgressJson,
      JSON.stringify(reactions),
      0,
      data.department || 'Sales'
    ]
  );

  return getAnnouncementById(id);
}

async function addComment(announcementId, commentData) {
  const commentId = 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const name = commentData.authorName || 'Ranjith';
  const handle = commentData.authorHandle || name.toLowerCase().replace(/\s+/g, '.');

  await pool.query(
    `INSERT INTO comments (
      id, announcement_id, author_name, author_handle, author_avatar,
      author_role, content, timestamp_text, likes, user_liked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      commentId,
      announcementId,
      name,
      handle,
      commentData.authorAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      commentData.authorRole || 'CRM Lead',
      commentData.content.trim(),
      'Just now',
      0,
      0
    ]
  );

  // Update comments count
  await pool.query(
    'UPDATE announcements SET comments_count = (SELECT COUNT(*) FROM comments WHERE announcement_id = ?) WHERE id = ?',
    [announcementId, announcementId]
  );

  const announcement = await getAnnouncementById(announcementId);
  const newComment = announcement.comments.find((c) => c.id === commentId);

  return { comment: newComment, announcement };
}

async function toggleReaction(announcementId, reactionType) {
  const [rows] = await pool.query('SELECT reactions FROM announcements WHERE id = ?', [announcementId]);
  if (rows.length === 0) return null;

  const reactions = typeof rows[0].reactions === 'string'
    ? JSON.parse(rows[0].reactions)
    : (rows[0].reactions || { thumbsUp: 0, clap: 0, heart: 0 });

  const userKey = 'user' + reactionType.charAt(0).toUpperCase() + reactionType.slice(1);
  const currentVal = reactions[reactionType] || 0;
  const alreadyReacted = reactions[userKey];

  reactions[reactionType] = Math.max(0, currentVal + (alreadyReacted ? -1 : 1));
  reactions[userKey] = !alreadyReacted;

  await pool.query('UPDATE announcements SET reactions = ? WHERE id = ?', [
    JSON.stringify(reactions),
    announcementId
  ]);

  return reactions;
}

async function toggleCommentLike(announcementId, commentId) {
  const [rows] = await pool.query('SELECT likes, user_liked FROM comments WHERE id = ?', [commentId]);
  if (rows.length === 0) return null;

  const userLiked = !rows[0].user_liked;
  const likes = Math.max(0, (rows[0].likes || 0) + (userLiked ? 1 : -1));

  await pool.query('UPDATE comments SET likes = ?, user_liked = ? WHERE id = ?', [
    likes,
    userLiked ? 1 : 0,
    commentId
  ]);

  const [updated] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
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
    userLiked: Boolean(c.user_liked)
  };
}

module.exports = {
  initDb,
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  addComment,
  toggleReaction,
  toggleCommentLike
};
