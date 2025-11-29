const express = require('express');
const {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  downloadBook,
  getBookCover
} = require('../controllers/book.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/role.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');

const router = express.Router();

// Public routes
router.get('/', getAllBooks);
router.get('/:id', getBookById);
router.get('/:id/download', downloadBook);
router.get('/:id/cover', getBookCover);

// Protected routes (Admin only)
router.use(authMiddleware);
router.use(adminOnly);

router.post('/', uploadMiddleware.bookFiles(), createBook);
router.patch('/:id', uploadMiddleware.bookFiles(), updateBook);
router.delete('/:id', deleteBook);

module.exports = router;