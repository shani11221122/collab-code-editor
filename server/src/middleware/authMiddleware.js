const jwt = require('jsonwebtoken');

function protect(req, res, next) {
  // 1. Token "Authorization: Bearer <token>" header se nikalo
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Token verify karo — agar tamper hua ya expire ho gaya to error throw hoga
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // 3. Aage wale route handlers ke liye userId available karwa do
    next(); // 4. Sab theek — agle function pe jao
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = protect;