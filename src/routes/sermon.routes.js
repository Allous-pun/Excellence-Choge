const express = require('express');
const {
  createSermon,
  getAllSermons,
  getSermonById,
  updateSermon,
  deleteSermon,
  getSermonsByAuthor
} = require('../controllers/sermon.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminOrClergy } = require('../middlewares/role.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');

const router = express.Router();

// Public routes
router.get('/', getAllSermons);
router.get('/:id', getSermonById);
router.get('/author/:authorId', getSermonsByAuthor);

// Protected routes (Admin & Clergy only)
router.use(authMiddleware);
router.use(adminOrClergy);

router.post(
  '/',
  uploadMiddleware.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ]),
  createSermon
);

router.patch(
  '/:id',
  uploadMiddleware.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ]),
  updateSermon
);

router.delete('/:id', deleteSermon);

module.exports = router;