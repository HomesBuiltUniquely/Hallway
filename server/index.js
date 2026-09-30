require('dotenv').config({ quiet: true }); // local .env for PORT / MySQL

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5001;
const DATA_FILE = path.join(__dirname, 'data', 'announcements.json');

let useMySql = false;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// JSON File Helpers (Fallback if MySQL is offline)
function getJsonAnnouncements() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error reading announcements file:', err);
    return [];
  }
}

function saveJsonAnnouncements(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing announcements file:', err);
    return false;
  }
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    database: useMySql ? 'MySQL (hallway_db)' : 'JSON File Storage',
    service: 'HUB Hallway Express API',
    timestamp: new Date().toISOString()
  });
});

// GET /api/announcements - list all announcements
app.get('/api/announcements', async (req, res) => {
  try {
    if (useMySql) {
      const announcements = await db.getAnnouncements();
      return res.json(announcements);
    }
  } catch (err) {
    console.error('MySQL query error, falling back to JSON:', err.message);
  }
  res.json(getJsonAnnouncements());
});

// GET /api/announcements/:id - get single announcement
app.get('/api/announcements/:id', async (req, res) => {
  try {
    if (useMySql) {
      const found = await db.getAnnouncementById(req.params.id);
      if (found) return res.json(found);
    }
  } catch (err) {
    console.error('MySQL query error:', err.message);
  }

  const list = getJsonAnnouncements();
  const item = list.find((a) => a.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Announcement not found' });
  res.json(item);
});

// POST /api/announcements - create new announcement
app.post('/api/announcements', async (req, res) => {
  const { title, content, type, department, author } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    if (useMySql) {
      const created = await db.createAnnouncement({ title, content, type, department, author });
      return res.status(201).json(created);
    }
  } catch (err) {
    console.error('MySQL create error, fallback:', err.message);
  }

  // Fallback to JSON
  const colors = {
    booking: '#10B981',
    quota: '#8B5CF6',
    performer: '#F59E0B',
    announcement: '#EF4444',
    general: '#3B82F6'
  };

  const list = getJsonAnnouncements();
  const newPost = {
    id: 'post-' + Date.now(),
    type: type || 'announcement',
    categoryColor: colors[type] || '#3B82F6',
    title: title.trim(),
    timestamp: 'Just Now',
    author: author || {
      name: 'Ranjith',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      team: (department || 'Sales') + ' Hub'
    },
    content: content.trim(),
    reactions: { thumbsUp: 1, clap: 1, heart: 1, userThumbsUp: true, userClap: false, userHeart: false },
    commentsCount: 0,
    department: department || 'Sales',
    comments: []
  };

  list.unshift(newPost);
  saveJsonAnnouncements(list);
  res.status(201).json(newPost);
});

// POST /api/announcements/:id/comments - add comment (Instagram style with Ranjith profile)
app.post('/api/announcements/:id/comments', async (req, res) => {
  const { content, authorName, authorHandle, authorAvatar, authorRole } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be empty' });
  }

  try {
    if (useMySql) {
      const result = await db.addComment(req.params.id, {
        content,
        authorName,
        authorHandle,
        authorAvatar,
        authorRole
      });
      return res.status(201).json({
        success: true,
        comment: result.comment,
        announcement: result.announcement
      });
    }
  } catch (err) {
    console.error('MySQL addComment error, falling back to JSON:', err.message);
  }

  // Fallback to JSON
  const list = getJsonAnnouncements();
  const idx = list.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Announcement not found' });

  const name = authorName || 'Ranjith';
  const handle = authorHandle || name.toLowerCase().replace(/\s+/g, '.');

  const newComment = {
    id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    authorName: name,
    authorHandle: handle,
    authorAvatar: authorAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorRole: authorRole || 'CRM Lead',
    content: content.trim(),
    timestamp: 'Just now',
    createdAt: new Date().toISOString(),
    likes: 0,
    userLiked: false
  };

  list[idx].comments = list[idx].comments || [];
  list[idx].comments.unshift(newComment);
  list[idx].commentsCount = list[idx].comments.length;
  saveJsonAnnouncements(list);

  res.status(201).json({
    success: true,
    comment: newComment,
    announcement: list[idx]
  });
});

// POST /api/announcements/:id/reactions - toggle reaction on announcement
app.post('/api/announcements/:id/reactions', async (req, res) => {
  const { reactionType } = req.body;
  if (!['thumbsUp', 'clap', 'heart'].includes(reactionType)) {
    return res.status(400).json({ error: 'Invalid reaction type' });
  }

  try {
    if (useMySql) {
      const reactions = await db.toggleReaction(req.params.id, reactionType);
      if (reactions) {
        return res.json({ success: true, reactions });
      }
    }
  } catch (err) {
    console.error('MySQL reaction error, falling back:', err.message);
  }

  const list = getJsonAnnouncements();
  const idx = list.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Announcement not found' });

  const userKey = 'user' + reactionType.charAt(0).toUpperCase() + reactionType.slice(1);
  const currentVal = list[idx].reactions[reactionType] || 0;
  const alreadyReacted = list[idx].reactions[userKey];

  list[idx].reactions[reactionType] = Math.max(0, currentVal + (alreadyReacted ? -1 : 1));
  list[idx].reactions[userKey] = !alreadyReacted;
  saveJsonAnnouncements(list);

  res.json({ success: true, reactions: list[idx].reactions });
});

// POST /api/announcements/:id/comments/:commentId/like - like a specific comment
app.post('/api/announcements/:id/comments/:commentId/like', async (req, res) => {
  try {
    if (useMySql) {
      const comment = await db.toggleCommentLike(req.params.id, req.params.commentId);
      if (comment) return res.json({ success: true, comment });
    }
  } catch (err) {
    console.error('MySQL comment like error, falling back:', err.message);
  }

  const list = getJsonAnnouncements();
  const announcement = list.find((a) => a.id === req.params.id);
  if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

  const comment = (announcement.comments || []).find((c) => c.id === req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  comment.userLiked = !comment.userLiked;
  comment.likes = Math.max(0, (comment.likes || 0) + (comment.userLiked ? 1 : -1));
  saveJsonAnnouncements(list);

  res.json({ success: true, comment });
});

async function startServer() {
  try {
    await db.initDb();
    useMySql = true;
  } catch (err) {
    useMySql = false;
  }

  app.listen(PORT, () => {
    console.log(`Hallway announcements API on http://localhost:${PORT} (${useMySql ? 'MySQL' : 'JSON file'})`);
  });
}

startServer();
