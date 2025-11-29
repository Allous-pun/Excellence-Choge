const express = require('express');
const {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUser
} = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/role.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

// User profile routes
router.get('/profile', getProfile);
router.patch('/profile', uploadMiddleware.single('photo'), updateProfile);

// Admin only routes
router.get('/', adminOnly, getAllUsers);
router.get('/:id', adminOnly, getUserById);
router.patch('/:id', adminOnly, updateUserById);
router.delete('/:id', adminOnly, deleteUser);

module.exports = router;