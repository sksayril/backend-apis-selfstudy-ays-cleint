const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const adminAuth = require('../middleware/adminAuth');
const { signToken } = require('../utilities/jwtHelper');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.role !== 'admin') {
      return res.status(400).json({ message: 'Invalid admin email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid admin email or password' });
    }

    const token = signToken(user);
    res.json({
      message: 'Admin login successful',
      token,
      admin: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// First admin only — requires ADMIN_SETUP_SECRET in .env
router.post('/register', async (req, res) => {
  try {
    const { email, password, setupSecret } = req.body;
    if (!email || !password || !setupSecret) {
      return res.status(400).json({
        message: 'email, password, and setupSecret are required',
      });
    }

    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      return res.status(403).json({
        message: 'Admin already exists. Use POST /admin/create with an admin token.',
      });
    }

    if (setupSecret !== process.env.ADMIN_SETUP_SECRET) {
      return res.status(403).json({ message: 'Invalid setup secret' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = new User({
      email: email.toLowerCase().trim(),
      password,
      role: 'admin',
    });
    await user.save();

    const token = signToken(user);
    res.status(201).json({
      message: 'Admin account created successfully',
      token,
      admin: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Logged-in admin creates another admin
router.post('/create', adminAuth, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.role === 'admin') {
        return res.status(400).json({ message: 'Admin with this email already exists' });
      }
      existing.role = 'admin';
      if (password) existing.password = password;
      await existing.save();
      return res.status(200).json({
        message: 'Existing user promoted to admin',
        admin: { id: existing._id, email: existing.email, role: existing.role },
      });
    }

    const user = new User({
      email: normalizedEmail,
      password,
      role: 'admin',
    });
    await user.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/me', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('email role createdAt');
    if (!user) return res.status(404).json({ message: 'Admin not found' });
    res.json({ admin: user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
