/**
 * Simple in-memory rate limiter (no Redis needed)
 */
const requests = new Map();

function rateLimit({ windowMs = 60000, max = 100, message = 'Too many requests' } = {}) {
  return (req, res, next) => {
    const key = req.ip + (req.userId || '');
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const entry = requests.get(key);
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + windowMs;
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ message });
    }

    next();
  };
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requests) {
    if (now > entry.resetTime) requests.delete(key);
  }
}, 300000);

module.exports = { rateLimit };
