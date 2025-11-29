// routes/assignment.routes.js
const express = require('express');
const {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  downloadAssignmentFile,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  getMySubmissions,
  gradeSubmission,
  downloadSubmissionFile
} = require('../controllers/assignment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminOnly, studentOnly } = require('../middlewares/role.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');

const router = express.Router();

// Public routes (authenticated users)
router.get('/', authMiddleware, getAllAssignments);
router.get('/:id', authMiddleware, getAssignmentById);
router.get('/:id/download', authMiddleware, downloadAssignmentFile);

// Student routes
router.post('/:id/submit', authMiddleware, studentOnly, uploadMiddleware.single('fileUrl'), submitAssignment);
router.get('/submissions/my', authMiddleware, studentOnly, getMySubmissions);

// Admin routes
router.post('/', authMiddleware, adminOnly, uploadMiddleware.single('fileUrl'), createAssignment);
router.patch('/:id', authMiddleware, adminOnly, uploadMiddleware.single('fileUrl'), updateAssignment);
router.delete('/:id', authMiddleware, adminOnly, deleteAssignment);
router.get('/:id/submissions', authMiddleware, adminOnly, getAssignmentSubmissions);

// Submission routes
router.patch('/submissions/:id/grade', authMiddleware, adminOnly, gradeSubmission);
router.get('/submissions/:id/download', authMiddleware, downloadSubmissionFile);

module.exports = router;