// middlewares/learningMaterialUpload.middleware.js
const multer = require('multer');

// Use memory storage for Render compatibility
const storage = multer.memoryStorage();

// File filter specifically for learning materials
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'fileUrl') {
    // Allow PDFs, videos, images for main file
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') || 
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, text, image, and video files are allowed!'), false);
    }
  } else if (file.fieldname === 'thumbnailUrl') {
    // Only allow images for thumbnails
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails!'), false);
    }
  } else {
    cb(new Error('Unexpected file field!'), false);
  }
};

// Create multer instance with memory storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for learning materials
  }
});

// Export specific upload methods for learning materials
const learningMaterialUpload = {
  // For learning materials (file + optional thumbnail)
  learningMaterialFiles: () => upload.fields([
    { name: 'fileUrl', maxCount: 1 },
    { name: 'thumbnailUrl', maxCount: 1 }
  ]),
  
  // For single file uploads in learning materials
  single: (fieldName) => upload.single(fieldName),
  
  // For multiple files in learning materials
  array: (fieldName, maxCount) => upload.array(fieldName, maxCount),
  
  // For no file uploads
  none: () => upload.none()
};

module.exports = learningMaterialUpload;