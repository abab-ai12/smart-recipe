const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { jwt: jwtConfig } = require('../config/env');
const { authenticateToken } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { writeUsageLog } = require('../services/usageLogService');

const router = express.Router();
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many authentication attempts, please try again later'
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [String(username).trim(), passwordHash, 'user']
    );
    await writeUsageLog(req, {
      action: 'user.register',
      targetType: 'user',
      targetId: result.insertId,
      message: `用户注册了账号：${String(username).trim()}`,
      metadata: {
        userId: result.insertId,
        username: String(username).trim()
      }
    });

    return res.status(201).json({ message: 'success' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'username already exists' });
    }

    return next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1',
      [String(username).trim()]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(String(password), user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
    req.user = { id: user.id, username: user.username, role: user.role };
    await writeUsageLog(req, {
      action: 'user.login',
      targetType: 'user',
      targetId: user.id,
      message: `用户登录：${user.username}`,
      metadata: {
        userId: user.id,
        username: user.username,
        role: user.role
      }
    });

    return res.json({
      token,
      userId: user.id,
      role: user.role
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/password', authenticateToken, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body || {};

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'oldPassword and newPassword are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'newPassword must be at least 6 characters' });
    }

    const [rows] = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const validPassword = await bcrypt.compare(String(oldPassword), user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid old password' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 12);
    await pool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, req.user.id]
    );
    await writeUsageLog(req, {
      action: 'user.password_update',
      targetType: 'user',
      targetId: req.user.id,
      message: `用户修改了密码：${req.user.username}`,
      metadata: {
        userId: req.user.id
      }
    });

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
