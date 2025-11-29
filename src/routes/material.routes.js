// routes/material.routes.js
const express = require('express');
const {
  createLearningMaterial,
  getAllLearningMaterials,
  getLearningMaterialById,
  updateLearningMaterial,
  deleteLearningMaterial,
  downloadLearningMaterial,
  getLearningMaterialThumbnail,
  getLearningMaterialFile,
  getCategories,
  getTags
} = require('../controllers/material.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/role.middleware');
const learningMaterialUpload = require('../middlewares/learningMaterialUpload.middleware'); // Use the new middleware

const router = express.Router();

// Public routes
router.get('/', getAllLearningMaterials);
router.get('/categories', getCategories);
router.get('/tags', getTags);
router.get('/:id', getLearningMaterialById);
router.get('/:id/file', getLearningMaterialFile);
router.get('/:id/download', downloadLearningMaterial);
router.get('/:id/thumbnail', getLearningMaterialThumbnail);

// Protected routes (Admin only)
router.use(authMiddleware);
router.use(adminOnly);

router.post('/', learningMaterialUpload.learningMaterialFiles(), createLearningMaterial);
router.patch('/:id', learningMaterialUpload.learningMaterialFiles(), updateLearningMaterial);
router.delete('/:id', deleteLearningMaterial);

module.exports = router;