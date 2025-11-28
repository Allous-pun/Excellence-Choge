const express = require('express');
const {
  register,
  login,
  changePassword,
  getMe
} = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.use(authMiddleware); // All routes below this require authentication
router.post('/change-password', changePassword);
router.get('/me', getMe);

module.exports = router;