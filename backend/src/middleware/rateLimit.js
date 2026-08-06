const rateLimit = require('express-rate-limit');

/** Brute-force protection for login/register endpoints */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased for local development
  message: { success: false, message: 'Too many attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

/** General API rate limiter */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

/** Email sending rate limiter (resend verification, broadcast) */
const emailLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50,
  message: { success: false, message: 'Too many email requests. Please wait 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authLimiter, apiLimiter, emailLimiter };
