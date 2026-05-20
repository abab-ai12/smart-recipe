const pool = require('../config/db');

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
}

async function writeUsageLog(req, details) {
  try {
    const {
      action,
      targetType = '',
      targetId = '',
      message,
      metadata = {}
    } = details;

    if (!action || !message) {
      return;
    }

    await pool.query(
      `INSERT INTO usage_logs
        (actor_user_id, actor_username, actor_role, action, target_type, target_id, message, metadata, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user?.id || null,
        req.user?.username || null,
        req.user?.role || null,
        action,
        targetType || null,
        targetId ? String(targetId) : null,
        String(message).slice(0, 500),
        JSON.stringify(metadata || {}),
        getClientIp(req).slice(0, 80),
        String(req.headers['user-agent'] || '').slice(0, 255)
      ]
    );
  } catch (error) {
    console.error('Failed to write usage log:', error.message);
  }
}

module.exports = {
  writeUsageLog
};
