const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, is_active: true, is_verified: true, organization_id: true, profile_image: true }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}.`
    });
  }
  next();
};

const requireEventAccess = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });

    if (req.user.role === 'SYSTEM_ADMIN') return next();

    const eventId = req.params.id || req.params.eventId || req.body?.eventId;
    if (!eventId) return res.status(400).json({ success: false, message: 'Event ID required.' });

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    if (req.user.role === 'ORG_ADMIN') {
      if (event.organization_id !== req.user.organization_id) {
        return res.status(403).json({ success: false, message: 'Event does not belong to your organization.' });
      }
      return next();
    }

    const access = await prisma.eventAccess.findUnique({
      where: { user_id_event_id: { user_id: req.user.id, event_id: eventId } }
    });

    if (!access) {
      return res.status(403).json({ success: false, message: 'You do not have access to this event.' });
    }

    next();
  } catch (err) {
    console.error('requireEventAccess error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { verifyToken, requireRole, requireEventAccess };
