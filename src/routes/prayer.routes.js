const express = require('express');
const {
  createPrayer,
  getAllPrayers,
  getPrayerById,
  updatePrayer,
  deletePrayer,
  getPrayersByAuthor
} = require('../controllers/prayer.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminOrClergy } = require('../middlewares/role.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');

const router = express.Router();

// Public routes
router.get('/', getAllPrayers);
router.get('/:id', getPrayerById);
router.get('/author/:authorId', getPrayersByAuthor);

// Protected routes (Admin & Clergy only)
router.use(authMiddleware);
router.use(adminOrClergy);

router.post('/', uploadMiddleware.single('image'), createPrayer);
router.patch('/:id', uploadMiddleware.single('image'), updatePrayer);
router.delete('/:id', deletePrayer);

module.exports = router;