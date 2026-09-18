const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all notifications for the logged in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      take: 50 // Limit to last 50 notifications
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { 
        user_id: req.user.id,
        is_read: false 
      },
      data: { is_read: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark single notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if notification belongs to user
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id },
      data: { is_read: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
