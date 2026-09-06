const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 1. Signup
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 2. Password ko hash karo — kabhi bhi plain password DB mein na jaye
    const hashedPassword = await bcrypt.hash(password, 10); // 10 = salt rounds

    const user = await User.create({ username, email, password: hashedPassword });

    // 3. Token banao taake signup ke turant baad login bhi ho jaye
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user._id, username, email } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 4. Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // 5. Hashed password ko compare karo (plain text se direct match nahi ho sakta)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};